"use client";

import { useState } from "react";
import {
  getImageSizes,
  getImageSrcSet,
  isOptimizableImageSrc,
} from "@/lib/image-loader";

export function OptimizedImage({
  src,
  alt,
  className,
  widths = [640, 1024, 1600],
  sizes,
  quality,
  format,
}: {
  src: string;
  alt: string;
  className?: string;
  widths?: number[];
  sizes?: string;
  quality?: number;
  format?: "webp" | "avif";
}) {
  const [failed, setFailed] = useState(false);
  const canOptimize = !failed && isOptimizableImageSrc(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      srcSet={canOptimize ? getImageSrcSet(src, widths, { quality, format }) : undefined}
      sizes={canOptimize ? getImageSizes(sizes) : undefined}
      onError={() => setFailed(true)}
    />
  );
}
