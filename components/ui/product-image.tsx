"use client";

import { useState } from "react";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
};

export function ProductImage({ src, alt, className, imgClassName }: ProductImageProps) {
  const normalized = src?.trim() ?? "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isBroken = normalized !== "" && failedSrc === normalized;

  if (!normalized || isBroken) {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No image</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* User-provided remote URLs are unrestricted, so plain img is intentional here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={normalized}
        alt={alt}
        loading="lazy"
        className={imgClassName ?? "h-full w-full object-cover"}
        onError={() => setFailedSrc(normalized)}
      />
    </div>
  );
}
