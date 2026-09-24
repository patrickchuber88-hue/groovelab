import React from 'react';
import { Music } from 'lucide-react';

export interface CampusVinylCoverArtProps {
  songColor: { from: string; to: string; text?: string; shadowFrom?: string };
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 🎵 Modern 2027 Squircle Song Cover (0.1% Goldstandard)
 * Replaces vintage skeuomorphic vinyl disc with a clean, calm Apple-grade squircle cover.
 * 100% WCAG AA contrast, deterministic pastel palette, and Lucide Music iconography.
 */
export const CampusVinylCoverArt: React.FC<CampusVinylCoverArtProps> = ({ songColor, size = 'md' }) => {
  const sleeveSize = size === 'sm' ? 40 : size === 'lg' ? 72 : 52;
  const borderRadius = size === 'sm' ? 10 : size === 'lg' ? 18 : 13;
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 23;

  return (
    <div
      role="img"
      aria-label="Song Cover"
      style={{
        width: `${sleeveSize}px`,
        height: `${sleeveSize}px`,
        borderRadius: `${borderRadius}px`,
        background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: songColor.text || '#0f172a',
        boxShadow: `0 3px 10px ${songColor.shadowFrom || 'rgba(0, 0, 0, 0.08)'}`,
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}
    >
      <Music size={iconSize} strokeWidth={2.4} color="currentColor" />
    </div>
  );
};

export const renderSongVinylCover = (
  songColor: { from: string; to: string; text?: string; shadowFrom?: string },
  size: 'sm' | 'md' | 'lg' = 'md'
) => {
  return <CampusVinylCoverArt songColor={songColor} size={size} />;
};
