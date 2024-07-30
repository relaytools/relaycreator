import prisma from './prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"

export async function checkSessionForSuperAdmin(req: any, res: any) {
    const session = await getServerSession(req, res, authOptions)

    if(session == null || session.user == null || session.user.name == null) {
        return false
    }

    const superAdmins = await prisma.user.findMany({
        where: {
            pubkey: session.user.name,
            admin: true,
        }
    })

    if(superAdmins.length > 0) {
        for (let i = 0; i < superAdmins.length; i++) {
            if(superAdmins[i].pubkey == session.user.name) {
                console.log("ALLOWING FOR SUPERADMIN")
                return true
            }
        }
    }

    return false
}