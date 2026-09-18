import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Music, Users, Sliders, FileText } from 'lucide-react';
import { CampusEvent, Song } from '../types/campusEvents.types';

interface CampusTeacherSubmissionOverlayProps {
  event: CampusEvent;
  onClose: () => void;
  brandColor: string;
  userId: string;
  schoolId: string;
  supabase: any;
  onSubmitted?: () => void;
}

export function CampusTeacherSubmissionOverlay({
  event,
  onClose,
  brandColor,
  userId,
  schoolId,
  supabase,
  onSubmitted
}: CampusTeacherSubmissionOverlayProps) {
  const [tab, setTab] = useState<'einreichung' | 'technik' | 'summary'>('einreichung');
  const [name, setName] = useState('');
  const [ensemble, setEnsemble] = useState('');
  const [duration, setDuration] = useState('10');
  const [performerCount, setPerformerCount] = useState('1');
  const [chairs, setChairs] = useState('0');
  const [stands, setStands] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Songs
  const [songs, setSongs] = useState<Song[]>([]);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');

  const handleAddSong = () => {
    if (!songTitle.trim()) return;
    setSongs(prev => [...prev, { title: songTitle.trim(), artist: songArtist.trim(), composer: '', arranger: '' }]);
    setSongTitle('');
    setSongArtist('');
  };

  const handleRemoveSong = (idx: number) => {
    setSongs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !ensemble.trim()) {
      alert('Bitte gib einen Namen oder ein Ensemble ein.');
      return;
    }

    setSubmitting(true);
    try {
      const finalSongs = [...songs];
      if (songTitle.trim()) {
        finalSongs.push({ title: songTitle.trim(), artist: songArtist.trim(), composer: '', arranger: '' });
      }

      const { error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: event.id,
          school_id: schoolId,
          teacher_id: userId,
          name: name.trim() || ensemble.trim(),
          ensemble_band: ensemble.trim() || null,
          performer_count: parseInt(performerCount, 10) || 1,
          duration: parseInt(duration, 10) || 10,
          chairs_needed: parseInt(chairs, 10) || 0,
          music_stands_needed: parseInt(stands, 10) || 0,
          remarks: remarks.trim() || null,
          songs: finalSongs,
          status: 'submitted'
        });

      if (error) throw error;
      alert('Beitrag erfolgreich eingereicht!');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Error submitting program point:', err);
      alert('Fehler beim Einreichen: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>
              Programmanmeldung
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              {event.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Titel des Beitrags oder Schülername *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Klavier-Solo Lisa M. oder Saxophon-Duo"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Ensemble / Band (optional)
              </label>
              <input
                type="text"
                value={ensemble}
                onChange={e => setEnsemble(e.target.value)}
                placeholder="z.B. Jugend-Bigband"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Dauer (Minuten) *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={duration}
                onChange={e => setDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Songs Section */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Stücke / Repertoire
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                placeholder="Titel des Stücks"
                style={{
                  flex: 2,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.84rem'
                }}
              />
              <input
                type="text"
                value={songArtist}
                onChange={e => setSongArtist(e.target.value)}
                placeholder="Komponist / Interpret"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.84rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddSong}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {songs.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.title} {s.artist ? `(${s.artist})` : ''}</span>
                <button type="button" onClick={() => handleRemoveSong(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Stühle benötigt
              </label>
              <input
                type="number"
                min="0"
                value={chairs}
                onChange={e => setChairs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Notenständer benötigt
              </label>
              <input
                type="number"
                min="0"
                value={stands}
                onChange={e => setStands(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Bemerkungen / Technikbedarf
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="z.B. 1 Gesangsmikrofon, Klavierbank..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.84rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: brandColor,
                border: 'none',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {submitting ? 'Wird gespeichert...' : 'Beitrag anmelden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
