import React from 'react';
import { Square, Volume2, ChevronDown, Share2, Edit2, Trash2 } from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../../student/meisterwerk/microscore/microScore.types';
import { INSTRUMENT_OPTIONS } from '../../../student/meisterwerk/microscore/vdmDrumPresets';
import { VDM_CATEGORIES, isOwnScoreSnippet, VdmFolderCategory } from '../../../../services/vdmScoreSnippetCatalog';
import { getVdmLevelWeight, getVdmLevelColor } from '../../../../services/vdmDidacticSortEngine';

export const mapFilterToInstrument = (filter: string): MicroScoreInstrument => {
  const f = filter.toLowerCase().trim();
  if (f.includes('klavier') || f.includes('piano')) return 'piano';
  if (f.includes('gitarre') || f.includes('guitar')) return 'guitar';
  if (f.includes('bass')) return 'bass';
  if (f.includes('schlagzeug') || f.includes('drums')) return 'drums';
  if (f.includes('blockflöte') || f.includes('recorder')) return 'recorder';
  if (f.includes('querflöte') || f.includes('flöte') || f.includes('flute')) return 'flute';
  if (f.includes('klarinette') || f.includes('clarinet')) return 'clarinet';
  if (f.includes('altsax') || f.includes('sax')) return 'altosax';
  if (f.includes('trompete') || f.includes('trumpet')) return 'trumpet';
  if (f.includes('posaune') || f.includes('trombone')) return 'trombone';
  if (f.includes('streicher') || f.includes('strings') || f.includes('geige')) return 'strings';
  if (f.includes('vokal') || f.includes('gesang') || f.includes('vocal') || f.includes('chor')) return 'vocals';
  return 'universal';
};

export const mapInstrumentToFilter = (raw?: string | null): string => {
  if (!raw) return 'Alle';
  const f = raw.toLowerCase().trim();
  if (f.includes('gitarre') || f.includes('guitar')) return 'Gitarre';
  if (f.includes('bass')) return 'E-Bass';
  if (f.includes('klavier') || f.includes('piano') || f.includes('keyboard') || f.includes('tasten')) return 'Klavier';
  if (f.includes('schlagzeug') || f.includes('drum') || f.includes('percussion')) return 'Schlagzeug';
  if (f.includes('blockflöte') || f.includes('recorder')) return 'Blockflöte';
  if (f.includes('bläser') || f.includes('blaeser') || f.includes('flöte') || f.includes('sax') || f.includes('trompete') || f.includes('posaune') || f.includes('klarinette') || f.includes('horn')) return 'Bläser';
  if (f.includes('streicher') || f.includes('geige') || f.includes('violine') || f.includes('cello') || f.includes('strings')) return 'Streicher';
  if (f.includes('vokal') || f.includes('gesang') || f.includes('vocal') || f.includes('chor') || f.includes('stimme')) return 'Vokal';
  return 'Alle';
};

export const INSTRUMENT_COLOR_MAP: Record<string, { bg: string; text: string; label: string; border: string }> = {
  universal: { bg: '#f1f5f9', text: '#475569', label: 'Universell', border: 'transparent' },
  piano: { bg: '#f1f5f9', text: '#475569', label: 'Klavier', border: 'transparent' },
  guitar: { bg: '#f1f5f9', text: '#475569', label: 'Gitarre', border: 'transparent' },
  bass: { bg: '#f1f5f9', text: '#475569', label: 'E-Bass', border: 'transparent' },
  drums: { bg: '#f1f5f9', text: '#475569', label: 'Schlagzeug', border: 'transparent' },
  recorder: { bg: '#f1f5f9', text: '#475569', label: 'Blockflöte', border: 'transparent' },
  flute: { bg: '#f1f5f9', text: '#475569', label: 'Querflöte', border: 'transparent' },
  clarinet: { bg: '#f1f5f9', text: '#475569', label: 'Klarinette', border: 'transparent' },
  altosax: { bg: '#f1f5f9', text: '#475569', label: 'Altsaxophon', border: 'transparent' },
  trumpet: { bg: '#f1f5f9', text: '#475569', label: 'Trompete', border: 'transparent' },
  trombone: { bg: '#f1f5f9', text: '#475569', label: 'Posaune', border: 'transparent' },
  strings: { bg: '#f1f5f9', text: '#475569', label: 'Streicher', border: 'transparent' },
  vocals: { bg: '#f1f5f9', text: '#475569', label: 'Vokal', border: 'transparent' }
};

export const isSnippetMatchingInstrument = (
  snipOrInstrument: string | Partial<MicroScoreSnippet> = '',
  filter: string = 'Alle',
  tags: string[] = [],
  category?: string,
  clef?: string,
  snippetId?: string
): boolean => {
  const f = (filter || 'alle').trim().toLowerCase();
  if (!f || f === 'alle' || f === 'all' || f === 'allgemein' || f === 'all_instruments') {
    return true;
  }

  let inst = '';
  let t = tags || [];
  let cat = (category || '').toLowerCase();
  let cl = (clef || '').toLowerCase();
  let id = (snippetId || '').toLowerCase();

  if (typeof snipOrInstrument === 'object' && snipOrInstrument !== null) {
    inst = (snipOrInstrument.instrument || '').toLowerCase();
    t = snipOrInstrument.tags || t;
    cat = (snipOrInstrument.category || cat).toLowerCase();
    cl = (snipOrInstrument.clef || cl).toLowerCase();
    id = (snipOrInstrument.id || id).toLowerCase();
  } else {
    inst = (snipOrInstrument || '').toLowerCase();
  }

  const isUniversal = inst === 'universal' || inst === 'all' || inst === 'universell' || inst === 'allgemein';
  const tagStr = (t || []).join(' ').toLowerCase();

  if (f === 'universell' || f === 'universal') {
    return isUniversal;
  }

  const isDrumFilter = f === 'drums' || f === 'schlagzeug' || f === 'percussion';
  if (isDrumFilter) {
    if (inst === 'drums' || inst === 'percussion' || cl === 'percussion') {
      return true;
    }
    if (
      tagStr.includes('drums') ||
      tagStr.includes('schlagzeug') ||
      tagStr.includes('percussion') ||
      tagStr.includes('rudiment') ||
      tagStr.includes('drumset') ||
      tagStr.includes('snare') ||
      tagStr.includes('bodypercussion')
    ) {
      return true;
    }
    if (id.includes('drum') || id.includes('percussion') || id.includes('rudiment')) {
      return true;
    }
    if (cat === 'rhythmus') {
      if (id === 'vdm-rhythm-syncopation' || id === 'vdm-rhythm-dotted-quarter') {
        return false;
      }
      return true;
    }
    return false;
  }

  if (isUniversal) {
    return true;
  }

  const label = (INSTRUMENT_COLOR_MAP[inst]?.label || inst).toLowerCase();

  if (inst === f || label === f || label.includes(f) || inst.includes(f)) {
    return true;
  }

  if (f === 'blockflöte' || f === 'recorder') {
    return inst === 'recorder' || tagStr.includes('blockflöte');
  }
  if (f === 'vokal' || f === 'gesang' || f === 'vocals') {
    return ['vocals', 'vocal', 'voice'].includes(inst) ||
      tagStr.includes('vokal') || tagStr.includes('gesang') || tagStr.includes('chor') || tagStr.includes('solmisation');
  }
  if (f === 'bläser' || f === 'blaeser' || f === 'winds') {
    return ['flute', 'recorder', 'clarinet', 'altosax', 'trumpet', 'trombone'].includes(inst) ||
      tagStr.includes('bläser') || tagStr.includes('flöte') || tagStr.includes('long tones');
  }
  if (f === 'streicher' || f === 'strings') {
    return ['strings', 'violin', 'viola', 'cello'].includes(inst) || tagStr.includes('streicher');
  }
  if (f === 'tasten' || f === 'klavier' || f === 'piano') {
    return ['piano', 'keyboard', 'orgel'].includes(inst) || tagStr.includes('klavier') || tagStr.includes('tasten');
  }
  if (f === 'gitarre' || f === 'guitar') {
    return ['guitar', 'gitarre', 'akustikgitarre', 'e-gitarre'].includes(inst) || tagStr.includes('gitarre');
  }
  if (f === 'bass' || f === 'e-bass') {
    return ['bass', 'e-bass', 'kontrabass'].includes(inst) || tagStr.includes('bass');
  }
  if (f === 'drums' || f === 'schlagzeug' || f === 'percussion') {
    return ['drums', 'schlagzeug', 'percussion'].includes(inst) || tagStr.includes('drums') || tagStr.includes('schlagzeug');
  }

  return false;
};

export const matchesLevelFilter = (snippet: MicroScoreSnippet, levelFilter: string): boolean => {
  if (!levelFilter || levelFilter === 'all') return true;
  const f = levelFilter.toLowerCase();
  const w = getVdmLevelWeight(snippet.vdmLevel);

  if (f === 'elementar') return w === 0;
  if (f === 'leicht' || f === 'grundstufe' || f === 'unterstufe') return w === 1;
  if (f === 'mittel' || f === 'mittelstufe') return w === 2;
  if (f === 'schwer' || f === 'oberstufe') return w === 3;
  return true;
};

export const getSnippetCategoryMeta = (snippet: MicroScoreSnippet): VdmFolderCategory => {
  const isOwn = isOwnScoreSnippet(snippet);
  if (isOwn) {
    const ownCat = VDM_CATEGORIES.find(c => c.id === 'Eigene');
    return ownCat || VDM_CATEGORIES[0];
  }
  const match = VDM_CATEGORIES.find(c => c.id === snippet.category || c.name === snippet.category);
  return match || VDM_CATEGORIES[1];
};

export interface TeacherScoreSnippetListRowProps {
  snippet: MicroScoreSnippet;
  resolvedForCard: MicroScoreSnippet;
  activeCardInst: MicroScoreInstrument;
  isPlaying: boolean;
  catMeta: VdmFolderCategory;
  isOwn: boolean;
  onOpenSnippet: (snippet: MicroScoreSnippet, inst: MicroScoreInstrument) => void;
  onTogglePlay: (snippet: MicroScoreSnippet, inst: MicroScoreInstrument) => void;
  onSelectInstrument: (snippetId: string, inst: MicroScoreInstrument) => void;
  onAssign: (snippet: MicroScoreSnippet, inst: MicroScoreInstrument) => void;
  onDelete: (snippetId: string) => void;
}

export const TeacherScoreSnippetListRow: React.FC<TeacherScoreSnippetListRowProps> = ({
  snippet,
  resolvedForCard,
  activeCardInst,
  isPlaying,
  catMeta,
  isOwn,
  onOpenSnippet,
  onTogglePlay,
  onSelectInstrument,
  onAssign,
  onDelete
}) => {
  const levelMeta = getVdmLevelColor(snippet.vdmLevel);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenSnippet(snippet, activeCardInst)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpenSnippet(snippet, activeCardInst);
        } else if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onTogglePlay(snippet, activeCardInst);
        }
      }}
      style={{
        background: '#ffffff',
        border: isPlaying ? `1.5px solid ${catMeta.color.activeBg}` : '1px solid #e2e8f0',
        borderLeft: `4px solid ${catMeta.color.activeBg}`,
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: isPlaying ? `0 4px 12px ${catMeta.color.activeBg}20` : '0 1px 3px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        if (!isPlaying) {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.borderLeftColor = catMeta.color.activeBg;
          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.04)';
        }
      }}
      onMouseLeave={e => {
        if (!isPlaying) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.borderLeftColor = catMeta.color.activeBg;
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onTogglePlay(snippet, activeCardInst);
          }}
          title={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
          aria-label={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
          style={{
            width: '28px',
            height: '28px',
            background: isPlaying ? catMeta.color.activeBg : '#f8fafc',
            color: isPlaying ? '#ffffff' : '#475569',
            border: isPlaying ? 'none' : '1px solid #e2e8f0',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: isPlaying ? `0 2px 6px ${catMeta.color.activeBg}35` : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {isPlaying ? <Square size={11} fill="#ffffff" /> : <Volume2 size={13} strokeWidth={2.2} />}
        </button>

        <span style={{
          fontSize: '0.66rem',
          fontWeight: 800,
          background: catMeta.color.bg,
          color: catMeta.color.text,
          padding: '2px 7px',
          borderRadius: '5px',
          border: 'none',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          {catMeta.name}
        </span>

        <div
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <select
            value={activeCardInst}
            onChange={e => {
              e.stopPropagation();
              onSelectInstrument(snippet.id, e.target.value as MicroScoreInstrument);
            }}
            aria-label={`Instrument für ${snippet.title} wählen`}
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#475569',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '5px',
              padding: '2px 18px 2px 6px',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none'
            }}
          >
            {INSTRUMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown
            size={10}
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#64748b'
            }}
          />
        </div>

        {!isOwn && (
          <span style={{
            fontSize: '0.64rem',
            fontWeight: 700,
            background: '#f1f5f9',
            color: '#475569',
            padding: '2px 7px',
            borderRadius: '5px',
            border: 'none',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}>
            {levelMeta.shortLabel}
          </span>
        )}

        <span
          style={{
            fontSize: '0.84rem',
            fontWeight: 800,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {resolvedForCard.title || snippet.title}
        </span>

        <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          • {resolvedForCard.barsCount || 2}T • {resolvedForCard.timeSignature || '4/4'} • {resolvedForCard.tempoBpm || 80} BPM
        </span>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onAssign(snippet, activeCardInst);
          }}
          title="Als Hausaufgabe an Schüler zuweisen"
          aria-label="Als Hausaufgabe zuweisen"
          style={{
            height: '28px',
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '7px',
            padding: '0 10px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 5px rgba(79, 70, 229, 0.2)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#4338ca';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#4f46e5';
          }}
        >
          <Share2 size={11} strokeWidth={2.2} />
          <span>Zuweisen</span>
        </button>

        {isOwn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onOpenSnippet(snippet, activeCardInst);
              }}
              title="Noten direkt bearbeiten"
              aria-label="Notenschnipsel bearbeiten"
              style={{
                width: '26px',
                height: '26px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Edit2 size={12} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete(snippet.id);
              }}
              title="Schnipsel löschen"
              aria-label="Notenschnipsel löschen"
              style={{
                width: '26px',
                height: '26px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
