import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Landmark } from '../types';

// Wikimedia serves standard thumbnail widths; cards only need the 500px one (~5x lighter than 960px)
const sizedUrl = (url: string, size: 'card' | 'large') =>
  size === 'card' ? url.replace(/\/960px-/, '/500px-') : url;

/**
 * A landmark's photo, or a quiet placeholder when it has none (or it fails to load).
 * Never substitutes another place's photo.
 */
export const LandmarkPhoto: React.FC<{
  landmark: Landmark;
  alt?: string;
  className?: string;
  lazy?: boolean;
  size?: 'card' | 'large';
}> = ({ landmark, alt = '', className = '', lazy = false, size = 'large' }) => {
  const [failed, setFailed] = useState(false);

  // A reused component may switch landmarks; give the new photo a fresh chance
  useEffect(() => setFailed(false), [landmark.imageUrl]);

  if (!landmark.imageUrl || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-canvas-soft text-body ${className}`}>
        <Camera className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-sm">No photo yet</span>
      </div>
    );
  }

  return (
    <img
      src={sizedUrl(landmark.imageUrl, size)}
      alt={alt}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};

/** "Photo: Jane Doe · CC BY-SA 4.0" linking to the Wikimedia Commons file page (licence attribution). */
export const PhotoCredit: React.FC<{ landmark: Landmark; className?: string }> = ({ landmark, className = '' }) => {
  const credit = landmark.imageCredit;
  if (!credit || !landmark.imageUrl) return null;
  const author = credit.author.length > 48 ? `${credit.author.slice(0, 47)}…` : credit.author;
  return (
    <p className={`text-xs text-body truncate ${className}`}>
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-ink hover:underline"
        title={`Photo: ${credit.author} · ${credit.license} · Wikimedia Commons`}
      >
        Photo: {author} · {credit.license}
      </a>
    </p>
  );
};
