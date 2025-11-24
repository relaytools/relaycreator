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
import { FaCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Define types for our data structures
interface ConnectionDataPoint {
    time: number;
    value: number;
}

interface ConnectionsApiResponse {
    stats: Array<{
        _time: string;
        _value: number;
        [key: string]: any;
    }>;
}

interface ConnectionCountApiResponse {
    stats: {
        _time: string;
        _value: number;
        [key: string]: any;
    } | null;
}

export default function ConnectionStats({ relayName }: { relayName: string }) {
    const [connStats, setConnStats] = useState<ConnectionsApiResponse['stats']>([]);
    const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingGraph, setIsLoadingGraph] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    
    useEffect(() => {
        // Reset states when relay name changes
        setIsLoading(true);
        setError(null);
        setActiveUserCount(null);
        
        // Use an async function inside useEffect to handle the fetch
        const fetchCurrentCount = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/relay-stats/${relayName}/connection-count`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data: ConnectionCountApiResponse = await response.json();
                setActiveUserCount(data.stats?._value ? Math.round(data.stats._value) : 0);
            } catch (error) {
                console.error('Error fetching connection count:', error);
                setError('Failed to load connection data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchCurrentCount();
    }, [relayName]);
    
    // Only fetch the graph data when expanded
    const fetchGraphData = async () => {
        if (expanded && connStats.length === 0) {
            setIsLoadingGraph(true);
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/relay-stats/${relayName}/connections`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data: ConnectionsApiResponse = await response.json();
                setConnStats(data.stats || []);
            } catch (error) {
                console.error('Error fetching connection stats:', error);
                setError('Failed to load graph data');
            } finally {
                setIsLoadingGraph(false);
            }
        }
    };
    
    useEffect(() => {
        fetchGraphData();
    }, [expanded, relayName]);
    
    // Transform connection stats for the chart
    const transformConnStats = (stats: ConnectionsApiResponse['stats']): ConnectionDataPoint[] => {
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
    
    if (isLoading) {
        return <div className="text-sm text-center py-4 bg-base-200 rounded-md">Loading connection data...</div>;
    }
    
    if (error && !activeUserCount) {
        return <div className="text-sm text-center py-4 bg-base-200 rounded-md text-error">{error}</div>;
    }
    
    return (
        <div className="w-full">
            {/* Current Active Count with toggle */}
            <div 
                className="flex items-center justify-between bg-base-100 rounded-full px-4 py-2 shadow-sm border border-base-300 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <FaCircle className="text-green-500 animate-pulse" size={8} />
                    <span className="text-sm font-medium">Online</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{activeUserCount !== null ? activeUserCount : '—'}</span>
                    {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                </div>
            </div>
            
            {/* Connection Chart (only shown when expanded) */}
            {expanded && (
                <div className="bg-base-200 p-2 rounded-md mt-4 transition-all">
                    {isLoadingGraph ? (
                        <div className="text-sm text-center py-4">Loading graph data...</div>
                    ) : chartData.length === 0 ? (
                        <div className="text-sm text-center py-4">No historical data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={chartData}>
                                <XAxis
                                    dataKey="time"
                                    type="number"
                                    domain={["dataMin", "dataMax"]}
                                    tickFormatter={(time) => {
                                        const d = new Date(time);
                                        const hours = String(d.getUTCHours()).padStart(2, '0');
                                        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                                        return `${hours}:${minutes}`;
                                    }}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(time) => {
                                        const d = new Date(time);
                                        const year = d.getUTCFullYear();
                                        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                                        const day = String(d.getUTCDate()).padStart(2, '0');
                                        const hours = String(d.getUTCHours()).padStart(2, '0');
                                        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                                        return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
                                    }}
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
                    )}
                </div>
            )}
        </div>
    );
}
