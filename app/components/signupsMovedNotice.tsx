import { migrationName, migrationUrl } from "../../lib/migration";

export default function SignupsMovedNotice() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 p-4">
            <div className="container mx-auto max-w-3xl">
                <div className="card bg-base-200 shadow-xl mt-8">
                    <div className="card-body items-center text-center">
                        <h2 className="card-title text-2xl text-primary">
                            New relay signups have moved
                        </h2>
                        <div className="alert alert-info mt-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>
                                This service is no longer accepting new relay
                                signups. Existing relays continue to operate
                                normally and can be managed and topped up as
                                usual.
                            </span>
                        </div>
                        {migrationUrl && (
                            <div className="card-actions mt-6">
                                <a
                                    href={migrationUrl}
                                    className="btn btn-primary btn-lg uppercase"
                                >
                                    Continue to {migrationName}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
