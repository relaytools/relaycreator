'use client';

import React, { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

export default function ConnectionStats({ relayName }: { relayName: string }) {
    const [connStats, setConnStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        // Reset states when relay name changes
        setIsLoading(true);
        setError(null);
        
        // Use an async function inside useEffect to handle the fetch
        const fetchData = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/relay-stats/${relayName}/connections`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();
                setConnStats(data.stats || []);
            } catch (error) {
                console.error('Error fetching connection stats:', error);
                setError('Failed to load connection data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, [relayName]);
    
    // Transform connection stats for the chart
    const transformConnStats = (stats: any) => {
        if (!stats || stats.length === 0) return [];
        
        // Group by timestamp
        const groupedByTime = stats.reduce((acc: any, stat: any) => {
            const time = new Date(stat._time).getTime();
            if (!acc[time]) {
                acc[time] = { time, value: 0 };
            }
            acc[time].value += stat._value;
            return acc;
        }, {});
        
        // Convert to array and sort by time
        return Object.values(groupedByTime).sort(
            (a: any, b: any) => a.time - b.time
        );
    };
    
    const chartData = transformConnStats(connStats);
    
    if (isLoading) {
        return <div className="text-sm text-center py-4 bg-base-200 rounded-md">Loading connection data...</div>;
    }
    
    if (error) {
        return <div className="text-sm text-center py-4 bg-base-200 rounded-md text-error">{error}</div>;
    }
    
    if (chartData.length === 0) {
        return <div className="text-sm text-center py-4 bg-base-200 rounded-md">No connection data available</div>;
    }
    
    return (
        <div className="w-full bg-base-200 p-2 rounded-md">
            <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(time) =>
                            new Date(time).toLocaleTimeString()
                        }
                    />
                    <YAxis />
                    <Tooltip
                        labelFormatter={(time) =>
                            new Date(time).toLocaleString()
                        }
                        formatter={(value) => [
                            `${value} connections`,
                        ]}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        dot={false}
                        name="Active Connections"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
