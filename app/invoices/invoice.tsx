"use client"
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import React from 'react';

export default function Bolt11Invoice(
    props: React.PropsWithChildren<{
        payment_request: string;
    }>) {
    console.log(props.payment_request)

    const qrCodeRef = useRef(null);

    const bolt = props.payment_request

    useEffect(() => {
        if (bolt && qrCodeRef.current) {
            QRCode.toCanvas(qrCodeRef.current, bolt, { width: 256 }, function (error) {
                if (error) console.error(error);
            });
        }
    }, [bolt]);

    return (
        <div>
            {bolt ? (
                <canvas ref={qrCodeRef} />
            ) : (
                <p>Loading invoice...</p>
            )}
        </div>
    );
}