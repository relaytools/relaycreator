import { InfluxDB } from '@influxdata/influxdb-client';

let influxDB: InfluxDB | null = null;

export function getInfluxDBClient(forceNew: boolean = false) {
    // Recreate client if forced or doesn't exist
    if (forceNew || !influxDB) {
        if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN) {
            throw new Error('InfluxDB environment variables are not set');
        }
        
        console.log('[InfluxDB] Creating new client instance');
        influxDB = new InfluxDB({ 
            url: process.env.INFLUXDB_URL, 
            token: process.env.INFLUXDB_TOKEN, 
            timeout: 8000 
        });
    }
    
    return influxDB;
}

// Helper to reset client on auth errors
export function resetInfluxDBClient() {
    console.log('[InfluxDB] Resetting client due to auth error');
    influxDB = null;
}