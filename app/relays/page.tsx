import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import PublicRelays from "./publicRelays";
import MyRelays from "./myRelays";
import CreateRelay from "./createRelay";
import HelpfulInfo from "./helpfulInfo";

export default async function Relays() {
    const session = await getServerSession(authOptions);

    let showSignup = false;

    if (!session || !(session as any).user.name) {
        return (
            <div>
                {showSignup && <CreateRelay />}
                {!showSignup && <HelpfulInfo />}

                <PublicRelays />
            </div>
        );
    }

    /*
    if (myRelays.length == 0 && moderatedRelays.length == 0) {
        showSignup = false;
    }
    */

    return (
        <div className="">
            <MyRelays />
        </div>
    );
}
