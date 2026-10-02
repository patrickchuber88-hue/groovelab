import React, { useMemo } from 'react';
import { AudioTrackCarousel, AudioTrackItem } from '../../../AudioTrackCarousel';
import { WochenFahrplanAudioTrack } from './wochenfahrplanTypes';

export interface WochenFahrplanAudioPlayerProps {
  tracks?: WochenFahrplanAudioTrack[];
  audioUrl?: string | null;
  audioTitle?: string;
  audioDuration?: number;
  bpm?: number;
  readOnly?: boolean;
  onDelete?: (index: number, url?: string) => void;
  topicName?: string;
  style?: React.CSSProperties;
}

export const WochenFahrplanAudioPlayer: React.FC<WochenFahrplanAudioPlayerProps> = ({
  tracks,
  audioUrl,
  audioTitle,
  audioDuration,
  bpm,
  readOnly = false,
  onDelete,
  topicName = 'Unterricht',
  style
}) => {
  const harmonizedTracks: AudioTrackItem[] = useMemo(() => {
    if (tracks && tracks.length > 0) {
      return tracks.map((t, idx) => ({
        url: t.url,
        label: t.bpm ? `${t.label || `Aufnahme #${idx + 1}`} (${t.bpm} BPM)` : (t.label || `Aufnahme #${idx + 1}`),
        duration: t.duration || 0,
        idx,
        originalIdx: idx,
        isTeacher: true
      }));
    }

    if (audioUrl) {
      const label = bpm 
        ? `${audioTitle || 'Unterrichtsaufnahme'} (${bpm} BPM)`
        : (audioTitle || 'Unterrichtsaufnahme');

      return [{
        url: audioUrl,
        label,
        duration: audioDuration || 0,
        idx: 0,
        originalIdx: 0,
        isTeacher: true
      }];
    }

    return [];
  }, [tracks, audioUrl, audioTitle, audioDuration, bpm]);

  if (harmonizedTracks.length === 0) return null;

  return (
    <div style={{ width: '100%', ...style }}>
      <AudioTrackCarousel
        tracks={harmonizedTracks}
        onDelete={onDelete}
        readOnly={readOnly}
        isTeacher={true}
        layoutMode="vertical-list"
        hideCarriedOverBadge={true}
        defaultExpanded={true}
        activeTopicContext={topicName}
      />
    </div>
  );
};
