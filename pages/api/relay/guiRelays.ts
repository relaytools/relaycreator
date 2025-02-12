import prisma from "../../../lib/prisma";

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

  return res.status(200).json({ publicRelays })
}
