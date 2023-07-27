import prisma from '../../../lib/prisma'

// GET /api/auth/logintoken
// generates a unique logintoken for client to sign
export default async function handle(req: any, res: any) {

    // generate random string 10 chars long
    function generateRandomString(length: number): string {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    const randomString = generateRandomString(20);

    const loginToken = await prisma.loginToken.create({
        data: {
            token: randomString,
            created_at: new Date(),
        }
    })

    res.status(200).json(loginToken)
}