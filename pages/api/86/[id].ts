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

// Methods available to any authenticated user (self-service)
const SELF_SERVICE_METHODS = [
  'supportedmethods',
  'deletedmsuntil',
  'deletedmsid',
];

// Methods that require owner/moderator access
const ADMIN_METHODS = [
  'banpubkey',
  'listbannedpubkeys',
  'deletebannedpubkey',
  'allowpubkey',
  'deleteallowedpubkey',
  'listallowedpubkeys',
  'banevent',
  'changerelaydescription',
  'changerelayicon',
  'changerelayname',
  'allowkind',
  'disallowkind',
  'listallowedkinds',
];

// All supported methods combined
const SUPPORTED_METHODS = [...SELF_SERVICE_METHODS, ...ADMIN_METHODS];

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

// Helper function to validate pubkey (hex format only per NIP-86 spec)
function validatePubkey(pubkeyInput: string): { valid: boolean; error?: string } {
  // Must be a valid 64-character lowercase hex string
  if (typeof pubkeyInput !== 'string' || !/^[a-f0-9]{64}$/.test(pubkeyInput)) {
    return { valid: false, error: 'Invalid pubkey. Must be a 64-character hexadecimal string' };
  }
  
  return { valid: true };
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

    // Parse the request body early so we can check method before authorization
    const { method, params } = parsedBody as Nip86Request;
    if (!method) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Determine if user is owner or moderator
    let isOwnerOrModerator = false;
    const relay = await prisma.relay.findFirst({
      where: {
        id: relayId,
        owner: {
          pubkey: authorizedPubkey
        }
      }
    });

    if (relay) {
      isOwnerOrModerator = true;
    } else {
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

      if (moderator) {
        isOwnerOrModerator = true;
      }
    }

    // Check if the user has permission for admin methods
    if (!SELF_SERVICE_METHODS.includes(method) && !isOwnerOrModerator) {
      return res.status(403).json({ error: 'Not authorized to manage this relay' });
    }
    
    // Handle the method
    let response: Nip86Response = {};
    
    switch (method) {
      case 'supportedmethods':
        response.result = isOwnerOrModerator ? SUPPORTED_METHODS : SELF_SERVICE_METHODS;
        break;
        
      case 'banpubkey':
        // this blocks and deletes the pubkey
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];
          const reason = params[1] || '';
          
          // Validate pubkey (hex format only per NIP-86 spec)
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error || 'Invalid pubkey' });
          }
          
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

          // now that we have relay jobs, we can queue a job for this relay, to deletePubkey
          await prisma.job.create({
            data: {
              relayId: relayId,
              kind: 'deletePubkey',
              status: 'queue',
              pubkey: pubkey
            }
          });
          
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

    case 'deletebannedpubkey':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];
          
          // Validate pubkey (hex format only per NIP-86 spec)
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error || 'Invalid pubkey' });
          }
          
          // Get the BlockList for this relay
          const blockList = await prisma.blockList.findUnique({
            where: { relayId: relayId },
            include: {
              list_pubkeys: true
            }
          });
          
          if (blockList) {
            await prisma.listEntryPubkey.deleteMany({
              where: {
                BlockListId: blockList.id,
                pubkey: pubkey
              }
            });
          }
          
          response.result = true;
        }
        break;

    case 'deleteallowedpubkey':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const pubkey = params[0];

          // todo, support deleteing by reason?
          const reason = params[1] || '';
          
          // Validate pubkey (hex format only per NIP-86 spec)
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error || 'Invalid pubkey' });
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
          
          // Validate pubkey (hex format only per NIP-86 spec)
          const validation = validatePubkey(pubkey);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error || 'Invalid pubkey' });
          }
          
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
        
      case 'changerelayname':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const newName = params[0];
          
          await prisma.relay.update({
            where: { id: relayId },
            data: { display_name: newName }
          });
          
          response.result = true;
        }
        break;
        
      case 'banevent':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters';
        } else {
          const eventId = params[0];

          // Validate that eventId is a valid Nostr event ID (64-character hex string)
          if (typeof eventId !== 'string' || !/^[a-f0-9]{64}$/.test(eventId)) {
            response.error = 'Invalid event ID. Must be a 64-character hexadecimal string';
            break;
          }

          // Queue a job to delete this specific event
          await prisma.job.create({
            data: {
              relayId: relayId,
              kind: 'deleteEvent',
              status: 'queue',
              eventId: eventId
            }
          });

          response.result = true;
        }
        break;
        
      case 'deletedmsuntil':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters. Expected: [until_timestamp]';
        } else {
          const untilTimestamp = parseInt(params[0], 10);

          // Validate timestamp is a positive integer
          if (isNaN(untilTimestamp) || untilTimestamp <= 0) {
            return res.status(400).json({ error: 'Invalid timestamp. Must be a positive unix timestamp' });
          }

          // Queue a job to run strfry delete for kind 1059 with --until
          await prisma.job.create({
            data: {
              relayId: relayId,
              kind: 'deletedmsuntil',
              status: 'queue',
              pubkey: authorizedPubkey,
              until: untilTimestamp
            }
          });

          response.result = true;
        }
        break;

      case 'deletedmsid':
        if (!params || params.length < 1) {
          response.error = 'Missing required parameters. Expected: [event_id, event_id, ...]';
        } else {
          // Validate all event IDs are valid 64-character hex strings
          for (const eventId of params) {
            if (typeof eventId !== 'string' || !/^[a-f0-9]{64}$/.test(eventId)) {
              return res.status(400).json({ error: `Invalid event ID: ${eventId}. Must be a 64-character hexadecimal string` });
            }
          }

          // Queue a job for each event ID
          for (const eventId of params) {
            await prisma.job.create({
              data: {
                relayId: relayId,
                kind: 'deletedmsid',
                status: 'queue',
                pubkey: authorizedPubkey,
                eventId: eventId
              }
            });
          }

          response.result = true;
        }
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