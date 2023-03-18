import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import React from 'react';

export async function alby(lnurl) {
    // const lnurl = (provided by your application backend)
    try {
        await webln.enable();
        const result = await webln.sendPayment(lnurl); // promise resolves once the LNURL process is finished 
    } catch (error) {
        console.log("something went wrong with webln: " + error)
    }
}

export default function Bolt11Invoice(
    props: React.PropsWithChildren<{
        payment_request: string;
    }>
) {
    const [bolt, setBolt] = useState<string>(props.payment_request);
    const qrCodeRef = useRef<HTMLCanvasElement>(null);

    alby(bolt);

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

    function copyToClipboard() {
        navigator.clipboard.writeText(bolt).then(() => {
            console.log('Copied to clipboard!');
        });
    }

    return (
        <div>
            <canvas ref={qrCodeRef} />
            <button onClick={copyToClipboard}>Copy to clipboard</button>
        </div>
    );
}