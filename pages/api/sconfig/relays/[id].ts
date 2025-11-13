import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";

// GET /api/sconfig/relays/:id
// spamblaster queries this for the relay settings
export default async function handle(req: any, res: any) {
    const session = await getServerSession(req, res, authOptions)
    if (session) {
        // Signed in
        //console.log("Session", JSON.stringify(session, null, 2))
    } else {
        // Not Signed in
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    if (session == null || session.user?.name == null) {
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    const me = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
    });

    const relay = await prisma.relay.findFirst({
        where: { id: req.query.id },
        select: {
            id: true,
            name: true,
            status: true,
            default_message_policy: true,
            allow_giftwrap: true,
            allow_tagged: true,
            allow_keyword_pubkey: true,
            allow_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
            block_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
            owner: {
                select: {
                    pubkey: true,
                },
            },
            moderators: {
                select: {
                    user: { select: { pubkey: true } },
                },
            },
            acl_sources: true,
        },
    });

    const globalBlocks = await prisma.globalBlockList.findFirst({
       select: {
        list_pubkeys: true, 
       } 
    })

    

    if (!relay) {
        res.status(404).json({ error: "relay not found" });
        return;
    }

    // Check authorization: user must match DEPLOY_PUBKEY OR be admin/owner/moderator
    const isDeployPubkey = process.env.DEPLOY_PUBKEY && (session as any).user.name === process.env.DEPLOY_PUBKEY;
    
    let isAuthorized = isDeployPubkey;
    
    // If not DEPLOY_PUBKEY, check if they're admin/owner/moderator
    if (!isAuthorized && me) {
        const isAdmin = me.admin === true;
        const isOwner = relay.owner.pubkey === me.pubkey;
        const isModerator = relay.moderators.some(mod => mod.user.pubkey === me.pubkey);
        
        isAuthorized = isAdmin || isOwner || isModerator;
    }

    if (!isAuthorized) {
        res.status(403).json({ error: "unauthorized - must be DEPLOY_PUBKEY, admin, owner, or moderator" });
        return;
    }

    // Combine global block list pubkeys with relay's block list pubkeys
    const combinedRelay = {
        ...relay,
        block_list: relay.block_list ? {
            ...relay.block_list,
            list_pubkeys: [
                ...(relay.block_list.list_pubkeys || []),
                ...(globalBlocks?.list_pubkeys || [])
            ]
        } : {
            list_keywords: [],
            list_pubkeys: globalBlocks?.list_pubkeys || [],
            list_kinds: []
        }
    };

    res.status(200).json(combinedRelay);
}
