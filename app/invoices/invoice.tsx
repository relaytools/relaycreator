import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import React from 'react';

export default function Bolt11Invoice(
    props: React.PropsWithChildren<{
        payment_request: string;
    }>
) {
    const [bolt, setBolt] = useState<string>(props.payment_request);
    const qrCodeRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (bolt && qrCodeRef.current) {
            QRCode.toCanvas(
                qrCodeRef.current,
                bolt,
                { width: 256 },
                function (error) {
                    if (error) console.error(error);
                }
            );
        }
    }, [bolt]);

    return (
        <div>
            <canvas ref={qrCodeRef} />
        </div>
    );
}