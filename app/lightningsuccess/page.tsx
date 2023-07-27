"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import lightningBolt from './bolt-icon-720.png';
import greenCheck from './green-check.png';
import './LightningScreen.css';

export default function ZapAnimation() {
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Simulate payment success after 3 seconds
        const timeoutId = setTimeout(() => {
            setSuccess(true);
            router.push(`/`)
        }, 3000);
        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="payment-success">
            <img src="/bolt-icon-720.png" alt="Lightning Bolt" className="bolt" />
            <img src="/bolt-icon-720.png" alt="Lightning Bolt2" className="checkmark" />
        </div>
    );
}