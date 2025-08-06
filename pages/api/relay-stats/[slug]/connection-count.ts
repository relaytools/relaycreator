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
        |> range(start: -1h)
        |> filter(fn: (r) => r["_measurement"] == "haproxy")
        |> filter(fn: (r) => r["_field"] == "h1_open_streams")
        |> filter(fn: (r) => r["proxy"] == "${slug}")
        |> last()
        |> yield(name: "last")
    `;


        const result = await queryApi.collectRows(fluxQuery);
        // Return just the latest measurement or null if no results
        return res.status(200).json({ 
          stats: result.length > 0 ? result[0] : null 
        });
    } catch (e) {
        return res.status(200).json({ stats: [] });
    }
}
