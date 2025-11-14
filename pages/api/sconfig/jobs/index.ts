import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'

// GET /api/sconfig/jobs?ip=<hostIP>
// Returns all jobs for relays with the specified IP address
export default async function handle(req: any, res: any) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Authentication required
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
        return res.status(401).json({ error: 'Not signed in' })
    }

    if (!session.user?.name) {
        return res.status(401).json({ error: 'Not signed in - no pubkey' })
    }

    // Authorization check - must be deploy pubkey
    if (!process.env.DEPLOY_PUBKEY) {
        console.log("ERROR: no DEPLOY_PUBKEY environment, unauthorized")
        return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if pubkey matches DEPLOY_PUBKEY
    if (session.user.name !== process.env.DEPLOY_PUBKEY) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    // User doesn't need to exist in DB, just needs to have the correct pubkey
    console.log("Authorized deploy pubkey:", session.user.name)

    // Get IP from query string
    const { ip } = req.query
    if (!ip) {
        return res.status(400).json({ error: 'IP parameter required' })
    }

    console.log("Getting jobs for relays with IP:", ip)

    try {
        // Find all jobs where the relay has the specified IP
        const jobs = await prisma.job.findMany({
            where: {
                relay: {
                    ip: ip
                }
            },
            include: {
                relay: {
                    select: {
                        id: true,
                        name: true,
                        ip: true,
                        domain: true,
                        status: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        console.log(`Found ${jobs.length} jobs for IP ${ip}`)
        return res.status(200).json(jobs)

    } catch (error) {
        console.error('Error fetching jobs by IP:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
