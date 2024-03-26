import { Prisma } from "@prisma/client"

export const relayWithEverything = Prisma.validator<Prisma.RelayArgs>()({
    include: {
        owner: true,
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
    }
})

export type RelayWithEverything = Prisma.RelayGetPayload<typeof relayWithEverything>

export const modWithRelays = Prisma.validator<Prisma.ModeratorArgs>()({
    include: {
        relay: {
            include: {
                owner: true,
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
            }
        }
    }
})

export type ModWithRelays = Prisma.ModeratorGetPayload<typeof modWithRelays>