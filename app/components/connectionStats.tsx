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
import { FaCircle } from 'react-icons/fa';

// Define types for our data structures
interface ConnectionDataPoint {
    time: number;
    value: number;
}

interface ApiResponse {
    stats: Array<{
        _time: string;
        _value: number;
        [key: string]: any;
    }>;
}

export default function ConnectionStats({ relayName }: { relayName: string }) {
    const [connStats, setConnStats] = useState<ApiResponse['stats']>([]);
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
                
                const data: ApiResponse = await response.json();
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
    const transformConnStats = (stats: ApiResponse['stats']): ConnectionDataPoint[] => {
        if (!stats || stats.length === 0) return [];
        
        // Group by timestamp
        const groupedByTime = stats.reduce((acc: Record<number, ConnectionDataPoint>, stat) => {
            const time = new Date(stat._time).getTime();
            if (!acc[time]) {
                acc[time] = { time, value: 0 };
            }
            acc[time].value += stat._value;
            return acc;
        }, {});
        
        // Convert to array and sort by time
        return Object.values(groupedByTime).sort(
            (a, b) => a.time - b.time
        );
    };
    
    const chartData = transformConnStats(connStats);
    
    // Get the most recent active users count
    const getActiveUsersCount = (): number => {
        if (chartData.length === 0) return 0;
        // Sort by time descending and get the most recent value
        const sortedData = [...chartData].sort((a, b) => b.time - a.time);
        return Math.round(sortedData[0]?.value || 0);
    };
    
    const activeUsers = getActiveUsersCount();
    
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
        <div className="w-full">
            {/* Current Active Count */}
            <div className="flex items-center justify-between mb-4 bg-base-100 rounded-full px-4 py-2 shadow-sm border border-base-300">
                <div className="flex items-center gap-2">
                    <FaCircle className="text-green-500 animate-pulse" size={8} />
                    <span className="text-sm font-medium">Current Active</span>
                </div>
                <div className="flex items-center">
                    <span className="text-2xl font-bold text-primary">{activeUsers}</span>
                </div>
            </div>
            
            {/* Connection Chart */}
            <div className="bg-base-200 p-2 rounded-md">
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
        </div>
    );
}
