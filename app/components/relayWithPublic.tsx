import { Prisma } from "@prisma/client";

export const relayWithPublic = Prisma.validator<Prisma.RelayArgs>()({
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
        allow_list: {
            include: {
                list_keywords: true,
                list_pubkeys: true,
                list_kinds: true,
            },
        },
        acl_sources: true,
    },
});

export type RelayWithPublic = Prisma.RelayGetPayload<
    typeof relayWithPublic
>;