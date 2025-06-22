"use client";

import { FaDragon } from 'react-icons/fa';
import Link from 'next/link';

export default function DinosaurPosts({ relayName }: { relayName: string }) {
  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center p-8">
        <Link href={`/trex`} passHref>
          <button 
            className="btn btn-lg btn-primary gap-2 animate-pulse"
          >
            <FaDragon className="text-2xl" />
            <span className="text-xl">Release TREX!</span>
            <FaDragon className="text-2xl" />
          </button>
        </Link>
        <p className="mt-4 text-center text-sm opacity-70">The Relay Explorer</p>
      </div>
    </div>
  );
}
