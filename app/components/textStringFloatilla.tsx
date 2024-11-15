"use client"
import { useEffect, useState } from 'react';

const TextString: React.FC = () => {
    const items = ['Welcome Floatilla Explorers!', 'Spin up a relay in minutes..', 'Create your community..'];
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

export default TextString;