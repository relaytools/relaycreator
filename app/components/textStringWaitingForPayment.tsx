"use client"
import { useEffect, useState } from 'react';

const TextStringWaitingForPayment: React.FC = () => {
    const items = ['This relay name has been reserved!', 'Invoice will expire in 24 hours.', 'Waiting for payment..'];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [items.length]);

    return <div>{items[currentIndex]}</div>;
};

export default TextStringWaitingForPayment;