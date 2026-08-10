// Optional signup-sunset / migration flags. All default OFF: with no env vars
// set, this module reports signups enabled and no migration target, and the
// app behaves exactly as before.
//
// NEXT_PUBLIC_ vars must be accessed as literal properties so Next.js can
// inline them into client bundles at build time (rebuild required to flip).

export const signupsDisabled =
    process.env.NEXT_PUBLIC_SIGNUPS_DISABLED === "true";

export const migrationUrl = process.env.NEXT_PUBLIC_MIGRATION_URL || "";

function hostnameOf(url: string) {
    try {
        return new URL(url).hostname;
    } catch {
        return "";
    }
}

export const migrationName =
    process.env.NEXT_PUBLIC_MIGRATION_NAME ||
    hostnameOf(migrationUrl) ||
    "our new platform";
