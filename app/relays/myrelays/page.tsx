import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import MyRelays from "../../components/myRelays"

export default async function MyRelaysPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="w-full px-2 sm:px-4 py-8">
                <div className="w-full">
                    <MyRelays />
                </div>
            </div>
        </div>
    );
}
