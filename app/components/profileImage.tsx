'use client';

import React from 'react';

interface ProfileImageProps {
    imageUrl: string;
    altText: string;
    className?: string;
}

export default function ProfileImage({ imageUrl, altText, className = "" }: ProfileImageProps) {
    return (
        <div className={`relative aspect-square rounded-full overflow-hidden ${className}`}>
            <img 
                src={imageUrl} 
                alt={altText}
                className="w-full h-full object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/green-check.png';
                }}
            />
        </div>
    );
}
