"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import './LightningScreen.css';

export default function ZapAnimation(
    props: React.PropsWithChildren<{
        redirect_to: string;
    }>) {

    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Simulate payment success after 3 seconds
        const timeoutId = setTimeout(() => {
            setSuccess(true);
            //router.push(`/curator?relay_id=${props.relay_id}`)
            router.push(props.redirect_to)
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