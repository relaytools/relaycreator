import prisma from '../../../../lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

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

    const myUser = await prisma.user.findFirst({ where: { pubkey: session.user.name } })

    if (!myUser) {
        res.status(404).json({ "error": "server not found" })
        res.end()
        return
    }

    if (!req.query.id) {
        res.status(500).json({ "error": "no relay id" })
        return
    }

    const thisRelay = await prisma.relay.findFirst({
        where: {
            id: req.query.id,
        },
        select: {
            id: true,
            owner: true,
            port: true,
            domain: true,
            name: true,
            details: true,
        }
    })

    if (thisRelay == null) {
        res.status(500).json({ "error": "relay not found" })
        return
    }

    if (req.method == "GET") {
        const strfry_cfg = `
##
## Default strfry config
##

# Directory that contains the strfry LMDB database (restart required)
db = "./strfry-db/"

dbParams {
    # Maximum number of threads/processes that can simultaneously have LMDB transactions open (restart required)
    maxreaders = 256

    # Size of mmap() to use when loading LMDB (default is 10TB, does *not* correspond to disk-space used) (restart required)
    mapsize = 10995116277760
}

relay {
    # Interface to listen on. Use 0.0.0.0 to listen on all interfaces (restart required)
    #bind = "0.0.0.0"
    bind = "127.0.0.1"

    # Port to open for the nostr websocket protocol (restart required)
    port = ${thisRelay.port}

    # Set OS-limit on maximum number of open files/sockets (if 0, don't attempt to set) (restart required)
    #nofiles = 1000000

    # HTTP header that contains the client's real IP, before reverse proxying (ie x-real-ip) (MUST be all lower-case)
    realIpHeader = "x-real-ip"

    info {
        # NIP-11: Name of this server. Short/descriptive (< 30 characters)
        name = "${thisRelay.name}"

        # NIP-11: Detailed information about relay, free-form
        description = "managed by relay.tools"

        # NIP-11: Administrative nostr pubkey, for contact purposes
        pubkey = "${thisRelay.owner.pubkey}"

        # NIP-11: Alternative administrative contact (email, website, etc)
        contact = ""
    }

    # Maximum accepted incoming websocket frame size (should be larger than max event and yesstr msg) (restart required)
    maxWebsocketPayloadSize = 262200

    # Websocket-level PING message frequency (should be less than any reverse proxy idle timeouts) (restart required)
    autoPingSeconds = 55

    # If TCP keep-alive should be enabled (detect dropped connections to upstream reverse proxy)
    enableTcpKeepalive = true

    # How much uninterrupted CPU time a REQ query should get during its DB scan
    queryTimesliceBudgetMicroseconds = 10000

    # Maximum records that can be returned per filter
    maxFilterLimit = 10000

    # Maximum number of subscriptions (concurrent REQs) a connection can have open at any time
    maxSubsPerConnection = 80

    writePolicy {
        # If non-empty, path to an executable script that implements the writePolicy plugin logic
        plugin = "/usr/local/bin/spamblaster"

        # Number of seconds to search backwards for lookback events when starting the writePolicy plugin (0 for no lookback)
        lookbackSeconds = 0
    }

    compression {
        # Use permessage-deflate compression if supported by client. Reduces bandwidth, but slight increase in CPU (restart required)
        enabled = true

        # Maintain a sliding window buffer for each connection. Improves compression, but uses more memory (restart required)
        slidingWindow = true
    }

    logging {
        # Dump all incoming messages
        dumpInAll = false

        # Dump all incoming EVENT messages
        dumpInEvents = false

        # Dump all incoming REQ/CLOSE messages
        dumpInReqs = false

        # Log performance metrics for initial REQ database scans
        dbScanPerf = false
    }

    numThreads {
        # Ingester threads: route incoming requests, validate events/sigs (restart required)
        ingester = 3

        # reqWorker threads: Handle initial DB scan for events (restart required)
        reqWorker = 3

        # reqMonitor threads: Handle filtering of new events (restart required)
        reqMonitor = 3

        # negentropy threads: Handle negentropy protocol messages (restart required)
        negentropy = 2
    }
}

events {
    # Maximum size of normalised JSON, in bytes
    maxEventSize = 262140

    # Events newer than this will be rejected
    rejectEventsNewerThanSeconds = 900

    # Events older than this will be rejected
    rejectEventsOlderThanSeconds = 94608000

    # Ephemeral events older than this will be rejected
    rejectEphemeralEventsOlderThanSeconds = 60

    # Ephemeral events will be deleted from the DB when older than this
    ephemeralEventsLifetimeSeconds = 300

    # Maximum number of tags allowed
    maxNumTags = 10000

    # Maximum size for tag values, in bytes
    maxTagValSize = 4096
}
`

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-disposition', 'filename="strfry.conf"');
        res.end(strfry_cfg);
        return

    } else if (req.method == "PUT") {
        const success = req.query.success
        const failed = req.query.failed
        const id = req.query.id
        if (success == null && failed == null) {
            res.status(500).json({ "error": "unknown status in query" })
            return
        }

        if (success != null) {
            await prisma.relay.update({
                where: {
                    id: id,
                },
                data: {
                    status: "success",
                }
            })
            res.status(200).json({})
            return
        } else if (failed != null) {
            await prisma.relay.update({
                where: {
                    id: id,
                },
                data: {
                    status: "failed",
                }
            })
            res.status(200).json({})
            return
        }
    }
    res.status(404).json({ "error": "not found" })
}