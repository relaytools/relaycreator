import { Prisma } from "@prisma/client"

export const userWithNip05s = Prisma.validator<Prisma.UserDefaultArgs>()({
    include: {
        nip05Orders: {
            include: {
                nip05: true,
            }
        }
    }
})

export type UserWithNip05s = Prisma.UserGetPayload<typeof userWithNip05s>