"use client"
import { useEffect, useState } from 'react';

const TextString: React.FC = () => {
    const items = ['Spooling up computer workers...', 'Wireframing NIP-420...', 'Forming Essential Gigabytes...', 'Summoning Curation Daemon... ', 'Force Deleting Twitter...', 'Emailing Grandma...', 'Writing Cringe Loading Screen Text...'];
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