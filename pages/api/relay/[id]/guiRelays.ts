import prisma from "../../../../lib/prisma";

export default async function handle(req: any, res: any) {

  const publicRelays = await prisma.relay.findMany({
    where: {
      status: "running",
      listed_in_directory: true,
    },
    select: {
        name: true,
        domain: true,
        is_external: true,
        details:true,
        id: true,
        banner_image: true,
    }
  })

  const relay = await prisma.relay.findFirst({
    where: {
      name: req.query.id,
      OR: [
        { status: "running" },
        { status: "provision" },
      ],
    },
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

  if (!relay) {
    return res.status(400).json({"error": "relay not found"})
  }

  return res.status(200).json({ relay, publicRelays })
}
