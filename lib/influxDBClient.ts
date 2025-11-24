import { InfluxDB, HttpError } from '@influxdata/influxdb-client';
import { Agent as HttpsAgent } from 'https';

class RobustInfluxDBClient {
    private url: string;
    private token: string;
    private agent: HttpsAgent | null = null;
    private client: InfluxDB | null = null;
    private consecutiveFailures = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(url: string, token: string) {
        this.url = url;
        this.token = token;
        this.initializeClient();
    }

    private initializeClient() {
        // Destroy old agent if exists
        if (this.agent) {
            this.agent.destroy();
        }

        // Create new agent with aggressive connection management
        this.agent = new HttpsAgent({
            keepAlive: true,
            keepAliveMsecs: 10000,
            maxSockets: 25,
            maxFreeSockets: 5,
            timeout: 30000,
            scheduling: 'lifo',
        });

        // Monitor agent for socket errors
        this.agent.on('error', (err) => {
            console.error('[InfluxDB] Agent error detected:', err);
            this.scheduleReconnect();
        });

        // Create client
        console.log('[InfluxDB] Creating new client instance');
        this.client = new InfluxDB({
            url: this.url,
            token: this.token,
            transportOptions: {
                agent: this.agent,
                timeout: 8000,
            },
        });
    }

    getClient(): InfluxDB {
        if (!this.client) {
            this.initializeClient();
        }
        return this.client!;
    }

    private scheduleReconnect() {
        // Don't reconnect too aggressively
        if (this.reconnectTimer) return;

        this.consecutiveFailures++;
        const delay = Math.min(1000 * Math.pow(2, this.consecutiveFailures), 30000);

        console.log(`[InfluxDB] Scheduling reconnect in ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnect();
        }, delay);
    }

    private reconnect() {
        console.log('[InfluxDB] Reconnecting client...');

        // Clear timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Reinitialize client with fresh agent
        this.initializeClient();
        console.log('[InfluxDB] Client reconnected');
    }

    async executeQuery<T = any>(org: string, query: string): Promise<T[]> {
        let attempt = 0;
        const maxAttempts = 2;

        while (attempt < maxAttempts) {
            try {
                const client = this.getClient();
                const queryApi = client.getQueryApi(org);
                const result = await queryApi.collectRows<T>(query);
                
                // Reset failure count on success
                this.consecutiveFailures = 0;
                return result;
            } catch (e: any) {
                const isConnectionError = 
                    e?.code === 'ECONNRESET' ||
                    e?.code === 'EPIPE' ||
                    e?.code === 'ETIMEDOUT' ||
                    e?.statusCode === 401 ||
                    e?.code === 'unauthorized';

                if (isConnectionError && attempt < maxAttempts - 1) {
                    console.log(`[InfluxDB] Connection error detected (${e?.code || e?.statusCode}), reconnecting...`);
                    this.reconnect();
                    attempt++;
                    continue;
                }

                // Re-throw if not connection error or out of retries
                throw e;
            }
        }

        throw new Error('InfluxDB query failed after retries');
    }

    destroy() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.agent) {
            this.agent.destroy();
        }
    }
}

// Singleton instance
let robustClient: RobustInfluxDBClient | null = null;

export function getInfluxDBClient(): InfluxDB {
    if (!robustClient) {
        if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN) {
            throw new Error('InfluxDB environment variables are not set');
        }
        robustClient = new RobustInfluxDBClient(
            process.env.INFLUXDB_URL,
            process.env.INFLUXDB_TOKEN
        );
    }
    return robustClient.getClient();
}

export async function executeInfluxQuery<T = any>(
    org: string,
    query: string
): Promise<T[]> {
    if (!robustClient) {
        if (!process.env.INFLUXDB_URL || !process.env.INFLUXDB_TOKEN) {
            throw new Error('InfluxDB environment variables are not set');
        }
        robustClient = new RobustInfluxDBClient(
            process.env.INFLUXDB_URL,
            process.env.INFLUXDB_TOKEN
        );
    }
    return robustClient.executeQuery<T>(org, query);
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
    process.on('SIGINT', () => {
        if (robustClient) {
            robustClient.destroy();
        }
    });
    process.on('SIGTERM', () => {
        if (robustClient) {
            robustClient.destroy();
        }
    });
}