import prisma from "../../../lib/prisma";
import { checkSessionForSuperAdmin } from "../../../lib/checkSessionForSuperAdmin";

// API for managing jobs
// GET - Fetch all jobs
// DELETE - Delete jobs (individual or bulk)
export default async function handle(req: any, res: any) {
    // Super admin authorization check
    const isSuperAdmin = await checkSessionForSuperAdmin(req, res);
    if (!isSuperAdmin) {
        return res.status(403).json({ error: "Unauthorized - super admin only" });
    }

    if (req.method === "GET") {
        try {
            const jobs = await prisma.job.findMany({
                select: {
                    id: true,
                    kind: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    error_msg: true,
                    output: true,
                    pubkey: true,
                    eventId: true,
                    syncHost: true,
                    syncDirection: true,
                    relay: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                            port: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
                take: 500,
            });
            return res.status(200).json({ success: true, jobs });
        } catch (error: any) {
            console.error("Error fetching jobs:", error);
            return res.status(500).json({ error: "Failed to fetch jobs" });
        }
    }

    if (req.method === "DELETE") {
        const { jobId, jobIds } = req.body;

        // Support both single job deletion and bulk deletion
        const idsToDelete = jobIds && Array.isArray(jobIds) ? jobIds : (jobId ? [jobId] : []);

        if (idsToDelete.length === 0) {
            return res.status(400).json({ error: "Job ID(s) required" });
        }

        try {
            const result = await prisma.job.deleteMany({
                where: {
                    id: {
                        in: idsToDelete
                    }
                }
            });

            console.log(`Deleted ${result.count} jobs`);

            return res.status(200).json({
                success: true,
                message: `Deleted ${result.count} job(s)`,
                deletedCount: result.count
            });
        } catch (error: any) {
            console.error("Error deleting jobs:", error);
            return res.status(500).json({ error: "Failed to delete jobs" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
