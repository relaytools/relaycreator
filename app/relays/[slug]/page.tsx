import prisma from '../../../lib/prisma'
import Posts from '../../posts/page'
import { headers } from 'next/headers'
import { getInfluxDBClient } from '../../../lib/influxDBClient'
import { InfluxDB } from '@influxdata/influxdb-client'

export default async function Relays({
    params,
    searchParams
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | undefined }
}) {
    const { slug } = params;
    const { successpayment } = searchParams;

    const headersList = headers()
    const rewritten = headersList.get('middleware-rewritten')

// this will be user fav relays eventually
    const publicRelays = await prisma.relay.findMany({
        where: {
            status: "running",
            listed_in_directory: true,
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

    const relay = await prisma.relay.findFirst({
        where: {
            OR: [
                {
                    status: "running",
                },
                {
                    status: "provision",
                },
            ],
            //listed_in_directory: true,
            name: slug,
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

    if (relay == null) {
        return (
            <div>relay not found</div>
        )
    }

    var result
    if(process.env.INFLUXDB_URL && process.env.INFLUXDB_TOKEN && process.env.INFLUXDB_ORG && process.env.INFLUXDB_BUCKET) {

        try {
        // Set up InfluxDB client
        const influxDB = getInfluxDBClient();

        const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG)
        const fluxQuery = `
            from(bucket: "${process.env.INFLUXDB_BUCKET}")
            |> range(start: -24h)
            |> filter(fn: (r) => r["_measurement"] == "events1")
            |> filter(fn: (r) => r["_field"] == "allowed")
            |> group(columns: ["_measurement", "_field", "relay", "kind"])
            |> filter(fn: (r) => r["relay"] == "${relay.id}")
            |> group(columns: ["kind"])
            |> sum() 
            |> yield(name: "sum")
            `

        result = await queryApi.collectRows(fluxQuery)
        } catch (e) {
            console.log("error occured during influxdb query")
            console.log(e)
        }
        
    }

    return (
            <div className="flex flex-wrap">
                <div className="">
                <Posts relay={relay} publicRelays={publicRelays} stats={result}/>
            </div>
        </div>

    )
}