import { checkSessionForNip05 } from "../../../lib/checkSession";
import prisma from "../../../lib/prisma";
import { convertOrValidatePubkey } from "../../../lib/pubkeyValidation";

export default async function handle(req: any, res: any) {
    if (req.method == "GET") {
        // serve .well-known/nostr.json

        const domain = req.query.id;
        const name = req.query.name;

        let result = {
            names: {} as { [key: string]: string },
            relays: {} as { [key: string]: string[] },
        };

        if (name != null) {
            //fetch one
            const nip05 = await prisma.nip05.findFirst({
                where: { domain: domain, name: name },
                include: {
                    relayUrls: true,
                },
            });
            if (nip05 == null) {
                res.status(404).json({ error: "not found" });
                return;
            }
            result.names[nip05.name] = nip05.pubkey;

            result.relays[nip05.name] = nip05.relayUrls.map(
                (relay) => relay.url
            );

        } else {
            // fetch all
            const nip05s = await prisma.nip05.findMany({
                where: { domain: domain },
                include: { relayUrls: true },
            });
            nip05s.forEach((nip05) => {
                result.names[nip05.name] = nip05.pubkey;
                result.relays[nip05.name] = nip05.relayUrls.map(
                    (relay) => relay.url
                );
            });
        }

        res.status(200).json(result);
    } else if (req.method == "PUT") {
        const nip05 = await checkSessionForNip05(req, res);
        if (nip05 == null) {
            return;
        } else {
            const { relayUrls, pubkey } = req.body;
            const validatedPubkey = convertOrValidatePubkey(pubkey);
            if (!validatedPubkey) {
                res.status(400).json({ error: "Invalid pubkey format" });
                return;
            }

            // save updated pubkey
            await prisma.nip05.update({
                where: { id: nip05.id },
                data: { pubkey: validatedPubkey },
            });

            if (!Array.isArray(relayUrls)) {
                res.status(400).json({ error: "Invalid relays format" });
                return;
            }

            try {
                const currentRelayUrls = nip05.relayUrls.map(
                    (relay) => relay.url
                );

                // Determine URLs to add, update, or remove
                const urlsToAdd = relayUrls.filter(
                    (url) => !currentRelayUrls.includes(url)
                );
                const urlsToRemove = currentRelayUrls.filter(
                    (url) => !relayUrls.includes(url)
                );

                // Perform database operations
                await prisma.$transaction([
                    ...urlsToAdd.map((url) =>
                        prisma.relayUrl.create({
                            data: { url, nip05Id: nip05.id },
                        })
                    ),
                    ...urlsToRemove.map((url) =>
                        prisma.relayUrl.deleteMany({
                            where: { url, nip05Id: nip05.id },
                        })
                    ),
                ]);

                res.status(200).json({
                    message: "Relays updated successfully",
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to update RelayURLS" });
            }
        }
    } else if (req.method == "DELETE") {
        const nip05 = await checkSessionForNip05(req, res);
        if (nip05 == null) {
            res.status(404).json({ error: "not found" });
            return;
        }

        // delete nip05, all nip05 orders and relayUrls
        await prisma.nip05.delete({ where: { id: nip05.id } });
        res.status(200).json("{}");
        return;
    } else {
        req.status(500).json({ error: "method not supported" });
    }
}
