"use client";

import Image from "next/image";
import { memo, useState } from "react";

interface BookCoverImageProps {
  bookId: string;
  alt: string;
  className?: string;
  onError?: () => void;
  priority?: boolean;
}

export const BookCoverImage = memo(function BookCoverImage({
  bookId,
  alt,
  className,
  onError,
  priority = false,
}: BookCoverImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return null;
  }

  return (
    <Image
      src={`/api/books/${bookId}/cover`}
      alt={alt}
      fill
      sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
      className={className}
      onError={handleError}
      priority={priority}
      quality={85}
      unoptimized
    />
  );
});
