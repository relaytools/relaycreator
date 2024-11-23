import { getInfluxDBClient } from '../../../../lib/influxDBClient'

export default async function handle(req: any, res: any) {
  const slug = req.query.slug;

  if(slug == null) {
    res.status(404).json({"error": "relay not found"})
    return
  }
  
  if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN || !process.env.INFLUXDB_ORG || !process.env.INFLUXDB_BUCKET) {
    return Response.json({ stats: null })
  }

  try {
    const influxDB = getInfluxDBClient()
    const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG)
    /*
    const fluxQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "events1")
      |> filter(fn: (r) => r["_field"] == "allowed")
      |> group(columns: ["_measurement", "_field", "relay", "kind"])
      |> filter(fn: (r) => r["relay"] == "${slug}")
      |> group(columns: ["kind"])
      |> sum() 
      |> yield(name: "sum")
    `
    */
    const fluxQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "events1")
      |> filter(fn: (r) => r["_field"] == "allowed")
      |> group(columns: ["_measurement", "_field", "relay", "kind"])
      |> filter(fn: (r) => r["relay"] == "${slug}")
      |> group(columns: ["kind"])
      |> sum() 
      |> yield(name: "sum")
    `
    const result = await queryApi.collectRows(fluxQuery)
    return res.status(200).json({ stats: result })
  } catch (e) {
    return res.status(200).json({ stats: [] })
  }
}