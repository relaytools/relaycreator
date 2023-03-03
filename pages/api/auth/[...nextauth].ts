import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import {
    validateEvent,
    verifySignature,
    signEvent,
    getEventHash,
    getPublicKey,
    EventTemplate,
    Event,
} from 'nostr-tools'


export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Nostr",
            credentials: {
                created_at: { label: "created_at", type: "text" },
                content: { label: "content", type: "text" },
                pubkey: { label: "pubkey", type: "text" },
                sig: { label: "sig", type: "text" },
                id: { label: "id", type: "text" },
            },

            async authorize(credentials) {
                //try {

                /*
                if process.env.NEXTAUTH_URL {
                    useMe = process.env.NEXTAUTH_URL
                }
                */
                const nextAuthUrl = new URL("http://localhost:3000")

                if (!credentials?.sig) {
                    return null
                }

                var verifyThis: Event = {
                    kind: 20069,
                    created_at: parseInt(credentials.created_at),
                    tags: [],
                    content: credentials.content,
                    pubkey: credentials.pubkey,
                    id: credentials.id,
                    sig: credentials.sig,
                }

                let veryOk = await verifySignature(verifyThis)
                console.log(veryOk)

                if (!veryOk) {
                    return null
                }

                if (true) {
                    return {
                        id: credentials.pubkey,
                    }
                }
                return null
            },
        }),
    ],

    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token }: { session: any; token: any }) {
            session.address = token.sub
            session.user.name = token.sub
            session.user.image = ""
            return session
        },
    },
}


// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
/*
export default async function auth(req: any, res: any) {

    return await NextAuth(req, res, {
        authOptions,
    })
}
*/

export default NextAuth(authOptions)