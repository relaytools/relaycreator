import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {

    // serve .well-known/nostr.json

    const domain = req.query.id;
    const name = req.query.name;
    console.log(name, domain)

    let result = {
        names: {} as { [key: string]: string },
        relays: {},
    }
    
    if(name != null) {
        //fetch one
        const nip05 = await prisma.nip05.findFirst({ where: { domain: domain, name: name }})
        if(nip05 == null) {
            res.status(404).json({"error": "not found"})
            return
        }
        result.names[nip05.name] = nip05.pubkey
        console.log(result)
    } else {
        // fetch all
        const nip05s = await prisma.nip05.findMany({ where: { domain: domain }})
        nip05s.forEach(nip05 => {
            result.names[nip05.name] = nip05.pubkey
        })
    
    }

    //result format nip05:
    /*
    {
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [ "wss://relay.example.com", "wss://relay2.example.com" ]
  }
}*/


// Populate the names and relays
/*
nip05.forEach(user => {
    result.names[user.name] = user.id;

    user.relays.forEach(relay => {
        if (!result.relays[user.id]) {
            result.relays[user.id] = [];
        }
        result.relays[user.id].push(relay.url);
    });
});
*/


    res.status(200).json(result)
}