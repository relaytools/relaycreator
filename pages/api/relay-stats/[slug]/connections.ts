import { getInfluxDBClient } from "../../../../lib/influxDBClient";

export default async function handle(req: any, res: any) {
    const slug = req.query.slug;

    if (slug == null) {
        res.status(404).json({ error: "relay not found" });
        return;
    }

    if (
        !process.env.INFLUXDB_URL ||
        !process.env.INFLUXDB_TOKEN ||
        !process.env.INFLUXDB_ORG ||
        !process.env.INFLUXDB_BUCKET
    ) {
        return Response.json({ stats: null });
    }

    try {
        const influxDB = getInfluxDBClient();
        const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);

        const fluxQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "haproxy")
        |> filter(fn: (r) => r["_field"] == "h1_open_streams")
        |> filter(fn: (r) => r["proxy"] == "${slug}")
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    // |> filter(fn: (r) => r["proxy"] == "${slug}")
        const result = await queryApi.collectRows(fluxQuery);
        return res.status(200).json({ stats: result });
    } catch (e) {
        console.error('[InfluxDB] Error fetching connections for relay:', slug, e);
        return res.status(200).json({ 
            stats: [], 
            error: e instanceof Error ? e.message : 'Failed to fetch connection data'
        });
    }
}
