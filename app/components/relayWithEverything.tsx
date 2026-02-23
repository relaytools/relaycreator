import { Prisma } from "@prisma/client";

export const relayWithEverything = Prisma.validator<Prisma.RelayArgs>()({
    include: {
        owner: true,
        streams: {
            select: {
                id: true,
                url: true,
                direction: true,
                internal: true,
                sync: true,
                status: true,
            },
        },
        moderators: {
            include: { user: true },
        },
        block_list: {
            include: {
                list_keywords: true,
                list_pubkeys: true,
                list_kinds: true,
            },
        },
        allow_list: {
            include: {
                list_keywords: true,
                list_pubkeys: true,
                list_kinds: true,
            },
        },
        acl_sources: true,
        RelayPlanChange: {
            orderBy: { started_at: 'desc' },
            take: 1,
        },
    },
});

export type RelayWithEverything = Prisma.RelayGetPayload<
    typeof relayWithEverything
>;

export const modWithRelays = Prisma.validator<Prisma.ModeratorArgs>()({
    include: {
        relay: {
            include: {
                owner: true,
                streams: {
                    select: {
                        id: true,
                        url: true,
                        direction: true,
                        internal: true,
                        sync: true,
                        status: true,
                    },
                },
                moderators: {
                    include: { user: true },
                },
                block_list: {
                    include: {
                        list_keywords: true,
                        list_pubkeys: true,
                        list_kinds: true,
                    },
                },
                allow_list: {
                    include: {
                        list_keywords: true,
                        list_pubkeys: true,
                        list_kinds: true,
                    },
                },
                acl_sources: true,
                RelayPlanChange: {
                    orderBy: { started_at: 'desc' },
                    take: 1,
                },
            },
        },
    },
});

export type ModWithRelays = Prisma.ModeratorGetPayload<typeof modWithRelays>;


