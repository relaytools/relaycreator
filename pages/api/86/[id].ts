import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyEvent, Event } from 'nostr-tools';

// Define the request and response types
interface Nip86Request {
  method: string;
  params: any[];
}

interface Nip86Response {
  result?: any;
  error?: string;
}

// List of supported methods
const SUPPORTED_METHODS = [
  'supportedmethods',
  'banpubkey',
  'listbannedpubkeys',
  'allowpubkey',
  'deleteallowedpubkey',
  'listallowedpubkeys',
  'banevent',
  'changerelaydescription',
  'changerelayicon',
  'allowkind',
  'disallowkind',
  'listallowedkinds',
];

// NIP-98 verification function
async function verifyNip98Event(authHeader: string, requestUrl: string): Promise<{ valid: boolean; pubkey?: string; error?: string }> {
  try {
    // Extract the event from the Authorization header
    // Format: Nostr <base64-encoded-event>
    if (!authHeader.startsWith('Nostr ')) {
      return { valid: false, error: 'Invalid Authorization header format' };
    }

    const base64Event = authHeader.substring(6); // Remove 'Nostr ' prefix
    const eventJson = Buffer.from(base64Event, 'base64').toString('utf-8');
    const event: Event = JSON.parse(eventJson);

    // Verify the event signature
    if (!verifyEvent(event)) {
      return { valid: false, error: 'Invalid event signature' };
    }

    // Check event kind (NIP-98 uses kind 27235)
    if (event.kind !== 27235) {
      return { valid: false, error: 'Invalid event kind, expected 27235' };
    }

    // Check if the event is recent (within 60 seconds)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > 60) {
      return { valid: false, error: 'Event is too old or from the future' };
    }

    // Check for required tags
    const methodTag = event.tags.find(tag => tag[0] === 'method');
    const uTag = event.tags.find(tag => tag[0] === 'u');
    const payloadTag = event.tags.find(tag => tag[0] === 'payload');

    if (!methodTag) {
      return { valid: false, error: 'Missing method tag' };
    }

    if (!uTag) {
      return { valid: false, error: 'Missing u tag' };
    }

    if (!payloadTag) {
      return { valid: false, error: 'Missing payload tag (required for NIP-86)' };
    }

    // Verify the method is POST for NIP-86
    if (methodTag[1] !== 'POST') {
      return { valid: false, error: 'Invalid method, expected POST' };
    }

    // Extract the relay URL from the request URL
    const relayUrl = new URL(requestUrl, 'https://example.com').pathname;
    
    // Verify the URL in the u tag matches the request URL
    // Note: This is a simplified check, in a real implementation you might want to do a more robust URL comparison
    if (!uTag[1].includes(relayUrl)) {
      return { valid: false, error: 'URL mismatch' };
    }

    return { valid: true, pubkey: event.pubkey };
  } catch (error) {
    console.error('Error verifying NIP-98 event:', error);
    return { valid: false, error: 'Error verifying authorization' };
  }
}

// Helper function to extract relay ID from the request
function getRelayIdFromRequest(req: NextApiRequest): string | null {
  // Extract from query parameters if available
  if (req.query.id) {
    return req.query.id as string;
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check content type
  // Haproxy does this for us
  //const contentType = req.headers['content-type'];
  //if (contentType !== 'application/nostr+json+rpc') {
  //  return res.status(415).json({ error: 'Unsupported media type. Expected application/nostr+json+rpc' });
  //}

  // If req.body is a string, try to parse it
  // workaround for nextjs not doing this automatically for application/nostr+json+rpc
  let parsedBody = req.body;
  if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body);
      //console.log('Parsed body:', parsedBody);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
  }

  // Verify NIP-98 authorization
  const authHeader = req.headers.authorization as string;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    // Extract relay ID from the request
    const relayId = getRelayIdFromRequest(req);
    if (!relayId) {
      return res.status(400).json({ error: 'Relay ID not found in request' });
    }

    // construct url from relay's domain name
    const relayCheck = await prisma.relay.findFirst({
      where: {
        id: relayId 
      }
    })

    if (!relayCheck) {
       return res.status(404).json({ error: 'Relay not found' });
    }

    const relayUrl = `https://${relayCheck.name}.${relayCheck.domain}`
    
    // Verify the NIP-98 event
    const verificationResult = await verifyNip98Event(authHeader, relayUrl || '');
    if (!verificationResult.valid) {
      return res.status(401).json({ error: verificationResult.error || 'Invalid authorization' });
    }

    // Get the authorized pubkey from the verification result
    const authorizedPubkey = verificationResult.pubkey;
    if (!authorizedPubkey) {
      return res.status(401).json({ error: 'Unable to extract pubkey from authorization' });
    }

    // Check if the user has permission to manage this relay
    const relay = await prisma.relay.findFirst({
      where: {
        id: relayId,
        owner: {
          pubkey: authorizedPubkey
        }
      }
    });

    if (!relay) {
      // Check if the user is a moderator for this relay
      const moderator = await prisma.moderator.findFirst({
        where: {
          relayId: relayId,
          user: {
            pubkey: authorizedPubkey
          }
        },
        include: {
          user: true
        }
      });

      if (!moderator) {
        return res.status(403).json({ error: 'Not authorized to manage this relay' });
      }
    }

    // Parse the request body
    const { method, params } = parsedBody as Nip86Request;
    if (!method) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Handle the method
    let response: Nip86Response = {};
    
    switch (method) {
      case 'supportedmethods':
        response.result = SUPPORTED_METHODS;
        break;
        
      case 'banpubkey':
        // Do we assume this is the equiv of RT block and delete pubkey?
        // so, todo: remove from allow list, figure out how to queue the deletes of the events?

        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];
          const reason = params[1] || '';
          
          // Get the BlockList for this relay, create if it doesn't exist
          let blockList = await prisma.blockList.findUnique({
            where: { relayId: relayId }
          });
          
          if (!blockList) {
            blockList = await prisma.blockList.create({
              data: {
                relayId: relayId
              }
            });
          }
          
          // Add the pubkey to the block list
          await prisma.listEntryPubkey.create({
            data: {
              BlockListId: blockList.id,
              pubkey: pubkey,
              reason: reason
            }
          });

          // Remove from allow list if exists
          const allowList = await prisma.allowList.findUnique({
            where: { relayId: relayId },
            include: {
              list_pubkeys: true
            }
          });
          
          if (allowList) {
            await prisma.listEntryPubkey.deleteMany({
              where: {
                AllowListId: allowList.id,
                pubkey: pubkey
              }
            });
          }
          
          response.result = true;
        }
        break;
        
      case 'listbannedpubkeys':
        // Get the BlockList for this relay
        const blockList = await prisma.blockList.findUnique({
          where: { relayId: relayId },
          include: {
            list_pubkeys: true
          }
        });
        
        if (!blockList) {
          response.result = [];
        } else {
          response.result = blockList.list_pubkeys.map(item => ({
            pubkey: item.pubkey,
            reason: item.reason || ''
          }));
        }
        break;

    case 'deleteallowedpubkey':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];

          // todo, support deleteing by reason?
          const reason = params[1] || '';
          
          // Get the AllowList for this relay, create if it doesn't exist
          let allowList = await prisma.allowList.findUnique({
            where: { relayId: relayId }
          });
          
          if (!allowList) {
            allowList = await prisma.allowList.create({
              data: {
                relayId: relayId
              }
            });
          }
          
          // Delete from the allowed list
          await prisma.listEntryPubkey.deleteMany({
            where: {
              AllowListId: allowList.id,
              pubkey: pubkey
            }
          });
          
          response.result = true;
        }
        break;
        
      case 'allowpubkey':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];
          const reason = params[1] || '';
          
          // Remove from block list if exists
          const blockList = await prisma.blockList.findUnique({
            where: { relayId: relayId },
            include: {
              list_pubkeys: true
            }
          });
          
          if (blockList) {
            const bannedEntry = blockList.list_pubkeys.find(item => item.pubkey === pubkey);
            if (bannedEntry) {
              await prisma.listEntryPubkey.delete({
                where: { id: bannedEntry.id }
              });
            }
          }
          
          // Get the AllowList for this relay, create if it doesn't exist
          let allowList = await prisma.allowList.findUnique({
            where: { relayId: relayId }
          });
          
          if (!allowList) {
            allowList = await prisma.allowList.create({
              data: {
                relayId: relayId
              }
            });
          }
          
          // Add to allowed list
          await prisma.listEntryPubkey.create({
            data: {
              AllowListId: allowList.id,
              pubkey: pubkey,
              reason: reason
            }
          });
          
          response.result = true;
        }
        break;
        
      case 'listallowedpubkeys':
        // Get the AllowList for this relay
        const allowList = await prisma.allowList.findUnique({
          where: { relayId: relayId },
          include: {
            list_pubkeys: true
          }
        });
        
        if (!allowList) {
          response.result = [];
        } else {
          response.result = allowList.list_pubkeys.map(item => ({
            pubkey: item.pubkey,
            reason: item.reason || ''
          }));
        }
        break;
        
      case 'allowkind':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const kindNumber = params[0];
          
          // Get the AllowList for this relay, create if it doesn't exist
          let allowList = await prisma.allowList.findUnique({
            where: { relayId: relayId }
          });
          
          if (!allowList) {
            allowList = await prisma.allowList.create({
              data: {
                relayId: relayId
              }
            });
          }
          
          // Add the kind to the allow list
          await prisma.listEntryKind.create({
            data: {
              AllowListId: allowList.id,
              kind: kindNumber
            }
          });
          
          response.result = true;
        }
        break;
        
      case 'disallowkind':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const kindNumber = params[0];
          
          // Get the AllowList for this relay
          const allowList = await prisma.allowList.findUnique({
            where: { relayId: relayId },
            include: {
              list_kinds: true
            }
          });
          
          if (allowList) {
            const kindEntry = allowList.list_kinds.find(item => item.kind === kindNumber);
            if (kindEntry) {
              await prisma.listEntryKind.delete({
                where: { id: kindEntry.id }
              });
            }
          }
          
          response.result = true;
        }
        break;
        
      case 'listallowedkinds':
        // Get the AllowList for this relay
        const allowListForKinds = await prisma.allowList.findUnique({
          where: { relayId: relayId },
          include: {
            list_kinds: true
          }
        });
        
        if (!allowListForKinds) {
          response.result = [];
        } else {
          response.result = allowListForKinds.list_kinds.map(item => item.kind);
        }
        break;
        
      case 'changerelaydescription':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const newDescription = params[0];
          
          await prisma.relay.update({
            where: { id: relayId },
            data: { details: newDescription }
          });
          
          response.result = true;
        }
        break;
        
      case 'changerelayicon':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const newIconUrl = params[0];
          
          await prisma.relay.update({
            where: { id: relayId },
            data: { banner_image: newIconUrl }
          });
          
          response.result = true;
        }
        break;
        
      // The following methods are not fully implemented because the database schema doesn't have the required tables
      // These would need additional database schema changes to fully implement
        
      case 'banevent':
        // TODO: we want this one..
        response.error = `Method '${method}' not yet implemented`;
        break;
        
      default:
        response.error = `Method '${method}' not supported`;
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error processing NIP-86 request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}