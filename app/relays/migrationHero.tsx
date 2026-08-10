import { migrationName, migrationUrl } from "../../lib/migration";

export default function MigrationHero() {
    return (
        <div className="font-condensed">
            <h1 className="mt-2 text-2xl leading-tight lg:leading-normal lg:text-5xl text-secondary text-center">
                Relay creation has a new home.
            </h1>
            <p className="mt-6 font-roboto text-lg text-center">
                New relay signups have moved to {migrationName}. Existing
                relays hosted here continue to run as usual — owners can still
                sign in to manage, top up, and renew them.
            </p>
            {migrationUrl && (
                <div className="mt-8 flex justify-center">
                    <a
                        href={migrationUrl}
                        className="btn btn-primary btn-lg uppercase"
                    >
                        Continue to {migrationName}
                    </a>
                </div>
            )}
        </div>
    );
}
