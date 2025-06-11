import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PublicRelays from "./publicRelays";
import MyRelays from "./myRelays";
import CreateRelay from "./createRelay";
import HelpfulInfo from "./helpfulInfo";
import ClientPaymentPage from "../clientinvoices/page";
import Nip05Page from "../nip05/page"

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

    return (
        <div className="">
            <div className="collapse collapse-arrow bg-base-200 mt-4">
                <input type="checkbox" /> 
                <div className="collapse-title text-lg font-medium text-center">
                    Relay Subscriptions
                </div>
                <div className="collapse-content">
                    <ClientPaymentPage/>
                </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200 mt-4 mb-4">
                <input type="checkbox" /> 
                <div className="collapse-title text-lg font-medium text-center">
                    NIP-05 Subscriptions
                </div>
                <div className="collapse-content">
                    <Nip05Page/>
                </div>
            </div>
            <MyRelays />
        </div>
    );
}
