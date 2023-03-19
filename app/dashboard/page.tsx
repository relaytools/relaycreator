"use client"
import React, { useState, useEffect } from 'react';
import lightningBolt from './bolt-icon-720.png';
import greenCheck from './green-check.png';
import './LightningScreen.css';

export default function PaymentSuccess() {
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Simulate payment success after 3 seconds
        const timeoutId = setTimeout(() => {
            setSuccess(true);
        }, 3000);
        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="payment-success">
            <img src="/bolt-icon-720.png" alt="Lightning Bolt" className="bolt" />
            {success && (
                <img src="/green-check.png" alt="Green Checkmark" className="checkmark" />
            )}
        </div>
    );
}
/*"use client"
import React, { useEffect, useState } from 'react';
import './LightningScreen.css';

export default function LightningScreen() {
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setClearing(true);
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className={`lightning-screen ${clearing ? 'clearing active' : ''}`}>
            {Array.from({ length: 1000 }, (_, i) => (
                <span className="bolt" key={i} role="img" aria-label="lightning bolt">
                    ⚡️
                </span>
            ))}
            <div className="center">
                <h1>Welcome aboard!</h1>
            </div>
        </div>
    );
}
*/
/*
"use client"
import React, { useState, useEffect } from 'react';
import './LightningScreen.css';

const LightningScreen = () => {
    const [boltCount, setBoltCount] = useState(0);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setBoltCount((prevCount) => prevCount + 1);
        }, 20);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (boltCount >= 5000) {
            setClearing(true);
            setTimeout(() => {
                setBoltCount(0);
                setClearing(false);
            }, 1000);
        }
    }, [boltCount]);

    const boltEmojis = Array.from({ length: boltCount }, (_, i) => (
        <span key={i} className="bolt">
            ⚡
        </span>
    ));

    return (
        <div className="lightning-screen">
            <div className={`clearing ${clearing ? 'active' : ''}`} />
            <div className="center">
                <h1>Welcome aboard</h1>
            </div>
            {boltEmojis}
        </div>
    );
};

export default LightningScreen;
*/