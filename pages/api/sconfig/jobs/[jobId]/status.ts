import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get authenticated session
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!session.user?.name) {
      return res.status(401).json({ error: 'Unauthorized - no pubkey' });
    }

    // 2. Check if user is DEPLOY_PUBKEY (job processor) or relay owner
    const isDeployPubkey = process.env.DEPLOY_PUBKEY && session.user.name === process.env.DEPLOY_PUBKEY;
    
    // 3. Extract parameters
    const { jobId } = req.query;
    const statusParam = req.query.status;
    const { error_msg, output } = req.body;

    // 4. Validate inputs - ensure status is a string
    const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;
    
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    if (status && typeof status !== 'string') {
      return res.status(400).json({ error: 'Status must be a string' });
    }

    // 5. Fetch job with relay relation for authorization
    const job = await prisma.job.findUnique({
      where: { id: jobId as string },
      include: { relay: true }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // 6. Check authorization - must be DEPLOY_PUBKEY or relay owner
    if (!isDeployPubkey) {
      // If not deploy pubkey, check if user owns the relay
      const me = await prisma.user.findFirst({
        where: { pubkey: session.user.name },
      });

      if (!me || job.relay.ownerId !== me.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    console.log(output)

    // 7. Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId as string },
      data: {
        status,
        ...(error_msg && { error_msg }),
        ...(output && { output }),
        updated_at: new Date()  // Explicitly set even though @updatedAt should handle it
      }
    });

    // 8. Return success response
    return res.status(200).json(updatedJob);

  } catch (error) {
    console.error('Error updating job status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
