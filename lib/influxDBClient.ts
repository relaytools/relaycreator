import { InfluxDB, QueryApi } from '@influxdata/influxdb-client';

let influxDB: InfluxDB | null = null;

function createClient() {
    if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN) {
        throw new Error('InfluxDB environment variables are not set');
    }
    
    console.log('[InfluxDB] Creating new client instance');
    return new InfluxDB({ 
        url: process.env.INFLUXDB_URL, 
        token: process.env.INFLUXDB_TOKEN, 
        timeout: 8000 
    });
}

export function getInfluxDBClient(forceNew: boolean = false) {
    if (forceNew || !influxDB) {
        influxDB = createClient();
    }
    return influxDB;
}

// Wrapper that automatically retries on auth errors
export async function executeInfluxQuery<T = any>(
    org: string,
    query: string
): Promise<T[]> {
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
        try {
            const client = getInfluxDBClient(attempt > 0); // Force new client on retry
            const queryApi = client.getQueryApi(org);
            const result = await queryApi.collectRows<T>(query);
            return result;
        } catch (e: any) {
            const isAuthError = e?.statusCode === 401 || e?.code === 'unauthorized';
            
            if (isAuthError && attempt < maxAttempts - 1) {
                console.log('[InfluxDB] Auth error detected, resetting client and retrying...');
                influxDB = null; // Reset for retry
                attempt++;
                continue;
            }
            
            // Re-throw if not auth error or out of retries
            throw e;
        }
    }
    
    throw new Error('InfluxDB query failed after retries');
}