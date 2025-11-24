import { InfluxDB } from '@influxdata/influxdb-client';

let influxDB: InfluxDB | null = null;

export function getInfluxDBClient() {
    if (!influxDB) {
        if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN) {
            throw new Error('InfluxDB environment variables are not set');
        }
        // Reduced timeout to 8s
        influxDB = new InfluxDB({ url: process.env.INFLUXDB_URL, token: process.env.INFLUXDB_TOKEN, timeout: 8000 });
    }
    return influxDB;
}