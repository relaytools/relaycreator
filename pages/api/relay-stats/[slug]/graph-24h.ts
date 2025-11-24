import { getInfluxDBClient } from '../../../../lib/influxDBClient'

export default async function handle(req: any, res: any) {
  const slug = req.query.slug;
  const blocked = req.query.blocked;

  if(slug == null) {
    res.status(404).json({"error": "relay not found"})
    return
  }
  
  if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN || !process.env.INFLUXDB_ORG || !process.env.INFLUXDB_BUCKET) {
    return Response.json({ stats: null })
  }

  let addfield="allowed"
  if(blocked != null) {
    addfield="blocked"
  }

  try {
    const influxDB = getInfluxDBClient()
    const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG)

      //|> filter(fn: (r) => r["relay"] == "${slug}")
const fluxQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "events1")
      |> filter(fn: (r) => r["_field"] == "${addfield}")
      |> filter(fn: (r) => r["relay"] == "${slug}")
      |> group(columns: ["_measurement", "_field", "kind"])
      |> aggregateWindow(every: 1h, fn: sum)
      |> filter(fn: (r) => r["_value"] > 0)
      |> yield(name: "sum")
      
    `
    const result = await queryApi.collectRows(fluxQuery)
    return res.status(200).json({ stats: result })
  } catch (e) {
    console.error('[InfluxDB] Error fetching 24h graph data for relay:', slug, 'blocked:', blocked, e);
    return res.status(200).json({ stats: [], error: 'Failed to fetch graph data' })
  }
}