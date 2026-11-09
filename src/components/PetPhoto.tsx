import { useState } from 'react';
import { petPhotos } from '../data/petPhotos';

type PetPhotoProps = {
  src: string | null;
  petId: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
};

export default function PetPhoto({ src, petId, alt, className = '', width, height, loading }: PetPhotoProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const photoUrl = [src, petPhotos[petId]].find(url => url && !failedUrls.includes(url));

  if (!photoUrl) return <div className={`photo-placeholder ${className}`} role="img" aria-label={`Photo unavailable: ${alt}`}>Photo unavailable</div>;

  return <img
    src={photoUrl}
    alt={alt}
    className={className}
    width={width}
    height={height}
    loading={loading}
    onError={() => setFailedUrls(current => [...current, photoUrl])}
  />;
}
