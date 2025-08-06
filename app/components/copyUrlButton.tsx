"use client";

import { useState } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';

interface CopyUrlButtonProps {
  url: string;
  className?: string;
}

export default function CopyUrlButton({ url, className = "btn btn-primary btn-sm" }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={copyToClipboard}
      className={className}
      title={copied ? "Copied!" : "Copy URL to clipboard"}
    >
      <div className="flex items-center gap-2">
        {copied ? <FaCheck className="text-success" /> : <FaCopy />}
        <span>{copied ? "Copied!" : "Copy URL"}</span>
      </div>
    </button>
  );
}
