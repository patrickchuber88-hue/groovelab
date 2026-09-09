import React, { useEffect } from 'react';
import { X, Star, Target, Sparkles, Lightbulb, Award, CheckCircle2 } from 'lucide-react';
import { SKILL_TAGS } from '../meisterwerk.types';

export interface SkillDetailSheetModalProps {
  skillKey: string;
  currentLevel: number;
  isWeeklyFocus?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
  teacherName?: string;
  onClose: () => void;
  onStartPractice?: () => void;
}

interface PillarDidactics {
  junior: { title: string; explanation: string; tip: string; quote: string };
  teen: { title: string; explanation: string; tip: string; quote: string };
  pro: { title: string; explanation: string; tip: string; quote: string };
}

const PILLAR_DIDACTICS: Record<string, PillarDidactics> = {
  rhythmus: {
    junior: {
      title: 'Dein innerer Rhythmus-Puls 🥁',
      explanation: 'Rhythmus ist der Herzschlag der Musik! Wenn du sicher im Takt bleibst, groovt dein ganzes Instrument.',
      tip: 'Klatsche den Rhythmus zuerst mit den Händen oder tippe mit dem Fuß, bevor du die Töne spielst!',
      quote: '„Der Rhythmus trägt die Melodie wie ein starker Freund.“'
    },
    teen: {
      title: 'Timing, Puls & Metronom-Präzision 🥁',
      explanation: 'Souveränes Timekeeping ist das Fundament für Band-Tightness und rhythmische Stabilität bei jedem Gig.',
      tip: 'Übe schwierige Takte auf halbem Tempo (BPM) mit dem Metronom und steigere dich erst, wenn 3 Durchgänge fehlerfrei sitzen.',
      quote: '„Groove entsteht nicht durch Eile, sondern durch absolute Gelassenheit auf dem Beat.“'
    },
    pro: {
      title: 'Metronom-Präzision & Micro-Timing 🥁',
      explanation: 'Exakte rhythmische Platzierung (On-the-beat, Laid-back, Driving) und polyrhythmische Flexibilität.',
      tip: 'Nutze synkopische Klick-Übungen (Klick nur auf 2 und 4 oder Offbeats) zur Schulung des inneren Metronoms.',
      quote: '„Präzision im Mikrobereich unterscheidet gute Musiker von wahren Meistern.“'
    }
  },
  technik: {
    junior: {
      title: 'Geschmeidige Zauber-Finger ⚡',
      explanation: 'Gute Technik bedeutet: Deine Hände, Finger und Arme bleiben locker und leicht wie Federn.',
      tip: 'Schüttle deine Arme vor dem Spielen kurz locker aus. Je entspannter deine Schultern sind, desto schneller flitzen deine Finger!',
      quote: '„Lockerheit ist das Geheimnis wahrer Fingerfertigkeit.“'
    },
    teen: {
      title: 'Fingerfertigkeit & Haltung ⚡',
      explanation: 'Effiziente Bewegungsmuster und ergonomische Haltung verhindern Ermüdung und bringen müheloses Tempo.',
      tip: 'Achte auf minimale Fingerwege und halte unbenutzte Finger nah an den Tasten oder Saiten.',
      quote: '„Geschwindigkeit ist das Nebenprodukt vollkommener Entspannung.“'
    },
    pro: {
      title: 'Motorische Ökonomie & Virtuosität ⚡',
      explanation: 'Physiologisch optimierter Krafteinsatz, Geläufigkeit und absolute Anschlagspräzision auf Konzertniveau.',
      tip: 'Zerlege Passagen in rhythmische Varianten (punktiert, invertiert-punktiert) zur Stabilisierung feiner Muskelreflexe.',
      quote: '„Ökonomie der Bewegung schafft Freiheit für den künstlerischen Ausdruck.“'
    }
  },
  klang: {
    junior: {
      title: 'Schöner Klang & Ton-Zauber 🎵',
      explanation: 'Jeder Ton, den du spielst, kann strahlen wie die Sonne oder leise flüstern wie der Wind im Baum.',
      tip: 'Schließe für einen Moment die Augen und lausche dem Ton ganz bewusst nach, bis er im Raum verklungen ist!',
      quote: '„Ein einzelner wunderschöner Ton kann ein ganzes Zimmer verzaubern.“'
    },
    teen: {
      title: 'Sound-Design, Tonkultur & Intonation 🎵',
      explanation: 'Saubere Intonation, voller Tonansatz und bewusste Tonformung machen deinen unverwechselbaren Sound aus.',
      tip: 'Nimm dich selbst mit dem Audio-Tresor auf und beurteile den Anfang und das Ausklingen jedes Tons objektiv.',
      quote: '„Dein Sound ist deine musikalische Stimme und Visitenkarte.“'
    },
    pro: {
      title: 'Klangästhetik, Obertöne & Intonation 🎵',
      explanation: 'Klangfarben-Differenzierung, Tragfähigkeit im Konzertsaal und harmonische Obertonreinheit.',
      tip: 'Arbeite mit Resonanz- und Naturtonreihen zur Kalibrierung der feinsten Frequenz- und Intonationskorrekturen.',
      quote: '„Klangkultur ist die Kunst, dem Instrument seine tiefste Resonanz zu entlocken.“'
    }
  },
  ausdruck: {
    junior: {
      title: 'Gefühl & Musik-Geschichten 🎭',
      explanation: 'Musik erzählt spannende Geschichten ohne Worte! Du kannst dein Lied lustig, geheimnisvoll oder mutig klingen lassen.',
      tip: 'Überlege dir eine kleine Geschichte zu deinem Stück: Spielst du wie eine schleichende Katze oder wie ein tapferer Ritter?',
      quote: '„Wenn du mit dem Herzen spielst, verstehen dich alle Menschen.“'
    },
    teen: {
      title: 'Dynamik, Phrasierung & Ausstrahlung 🎭',
      explanation: 'Nuanciertes Spiel zwischen Pianissimo und Fortissimo zieht dein Publikum emotional in den Bann.',
      tip: 'Finde in jeder Phrase den musikalischen Höhepunkt (Zielton) und baue die dynamische Spannung gezielt darauf auf.',
      quote: '„Dynamik ist das Licht und der Schatten eines Musikstücks.“'
    },
    pro: {
      title: 'Interpretatorische Reife & Dramaturgie 🎭',
      explanation: 'Stilistische Authentizität, agogische Flexibilität und persönliche künstlerische Aussagekraft.',
      tip: 'Analysiere historische Aufnahmen und entwickle deine eigene, fundierte dramaturgische Lesart des Werks.',
      quote: '„Große Musik entsteht im Mut zur persönlichen Interpretation.“'
    }
  },
  repertoire: {
    junior: {
      title: 'Deine Lied-Schatzkiste 🌟',
      explanation: 'Jedes Lied, das du kannst, ist wie ein funkelnder Edelstein in deiner persönlichen Musik-Schatztruhe!',
      tip: 'Spiele dein Lieblingslied einmal deinen Eltern, Geschwistern oder Freunden als kleines Hauskonzert vor!',
      quote: '„Jedes gemeisterte Lied bleibt für immer dein treuer Begleiter.“'
    },
    teen: {
      title: 'Song-Mastery & Repertoire-Fitness 🌟',
      explanation: 'Songs auswendig und souverän auf Abruf spielen zu können, macht dich bühnen- und bandtauglich.',
      tip: 'Spiele Songs in Gedanken durch (mentales Üben), ohne das Instrument in der Hand zu halten.',
      quote: '„Ein reiches Repertoire gibt dir die Freiheit, überall und jederzeit Musik zu machen.“'
    },
    pro: {
      title: 'Konzertreife & Werkanalyse 🌟',
      explanation: 'Beherrschung eines stilistisch breit gefächerten Konzert-Repertoires unter Live- und Studiobedingungen.',
      tip: 'Simuliere Auftrittssituationen unter mentaler Belastung (z. B. One-Take-Aufnahmen ohne Korrekturstopp).',
      quote: '„Konzertreife bedeutet, die Musik so zu beherrschen, dass auf der Bühne reine Magie entsteht.“'
    }
  }
};

export const SkillDetailSheetModal: React.FC<SkillDetailSheetModalProps> = ({
  skillKey,
  currentLevel,
  isWeeklyFocus = false,
  uiLevel = 'teen',
  teacherName,
  onClose,
  onStartPractice
}) => {
  const isJunior = uiLevel === 'junior';
  const isPro = uiLevel === 'pro';

  const skillMeta = SKILL_TAGS.find(t => t.key === skillKey || (t.legacyKey && t.legacyKey === skillKey)) || SKILL_TAGS[0];
  const normalizedKey = skillMeta.key === 'intonation' ? 'klang' : skillMeta.key;
  const didactic = PILLAR_DIDACTICS[normalizedKey]?.[uiLevel] || PILLAR_DIDACTICS.rhythmus[uiLevel];

  // Keyboard accessibility (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getRankBadge = () => {
    if (isJunior) {
      if (currentLevel >= 5) return { label: '👑 Meister-Zauberer (Stufe 5)', color: '#854d0e', bg: '#fef9c3', border: '#fef08a' };
      if (currentLevel === 4) return { label: '🌟 Stern-Champion (Stufe 4)', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
      if (currentLevel === 3) return { label: '✨ Musik-Könner (Stufe 3)', color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe' };
      if (currentLevel === 2) return { label: '🚀 Entdecker-Aufbau (Stufe 2)', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff' };
      return { label: '🌱 Entdecker-Fundament (Stufe 1)', color: '#334155', bg: '#f1f5f9', border: '#e2e8f0' };
    }
    if (isPro) {
      if (currentLevel >= 5) return { label: 'Künstlerische Exzellenz (Stufe 5)', color: '#0f172a', bg: '#f8fafc', border: '#cbd5e1' };
      if (currentLevel === 4) return { label: 'Stilsichere Beherrschung (Stufe 4)', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' };
      if (currentLevel === 3) return { label: 'Fortgeschrittene Reife (Stufe 3)', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
      if (currentLevel === 2) return { label: 'Fundierte Basis (Stufe 2)', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
      return { label: 'Grundlagen-Aufbau (Stufe 1)', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
    }
    // Teen
    if (currentLevel >= 5) return { label: 'Band-Meister 🌟 (Stufe 5)', color: '#854d0e', bg: '#fef9c3', border: '#fef08a' };
    if (currentLevel === 4) return { label: 'Stage-Ready 🚀 (Stufe 4)', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
    if (currentLevel === 3) return { label: 'Solist ✨ (Stufe 3)', color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe' };
    if (currentLevel === 2) return { label: 'Aufbau ⚡ (Stufe 2)', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff' };
    return { label: 'Fundament 🌱 (Stufe 1)', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
  };

  const rank = getRankBadge();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#ffffff',
          borderRadius: isJunior ? '32px' : '28px',
          padding: isJunior ? '32px' : '28px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          animation: 'modalSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: isJunior ? '60px' : '52px',
                height: isJunior ? '60px' : '52px',
                borderRadius: isJunior ? '20px' : '16px',
                background: skillMeta.bg || '#f1f5f9',
                border: `1.5px solid ${skillMeta.border || '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isJunior ? '2rem' : '1.7rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              {skillMeta.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: skillMeta.color || '#475569' }}>
                {isJunior ? '✨ Musikalische Superkraft' : 'Musikalische Säule'}
              </div>
              <h3
                id="skill-detail-title"
                style={{
                  margin: '3px 0 0 0',
                  fontSize: isJunior ? '1.35rem' : '1.25rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                {didactic.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            className="hover-scale"
          >
            <X size={18} />
          </button>
        </div>

        {/* Level Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: rank.bg,
              color: rank.color,
              border: `1px solid ${rank.border}`,
              padding: '5px 14px',
              borderRadius: '100px',
              fontSize: '0.82rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {rank.label}
          </span>

          {isWeeklyFocus && (
            <span
              style={{
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '5px 14px',
                borderRadius: '100px',
                fontSize: '0.82rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🎯</span> {isJunior ? 'Deine aktive Wochen-Quest!' : 'Aktiver Wochenschwerpunkt'}
            </span>
          )}
        </div>

        {/* Weekly Focus Banner (if active) */}
        {isWeeklyFocus && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fcd34d',
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#f59e0b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Target size={20} />
            </div>
            <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.45 }}>
              <strong style={{ color: '#78350f' }}>
                {isJunior ? '🌟 Wochen-Ziel deiner Lehrkraft:' : '🎯 Didaktischer Wochen-Impuls:'}
              </strong>{' '}
              {teacherName ? `${teacherName} hat` : 'Deine Lehrkraft hat'} diesen Bereich als besonderen Schwerpunkt für diese Woche gewählt.
            </div>
          </div>
        )}

        {/* Child / Student Friendly Explanation */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '16px 18px',
            fontSize: '0.88rem',
            color: '#334155',
            lineHeight: 1.5
          }}
        >
          {didactic.explanation}
        </div>

        {/* Practice Tip Card */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '20px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#22c55e',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}
          >
            <Lightbulb size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.04em' }}>
              {isJunior ? '💡 Meister-Tipp zum Üben' : '💡 Praktischer Übe-Impuls'}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#166534', marginTop: '3px', lineHeight: 1.45 }}>
              {didactic.tip}
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '0 10px' }}>
          {didactic.quote}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onStartPractice) onStartPractice();
          }}
          style={{
            width: '100%',
            background: isJunior ? 'linear-gradient(135deg, #f59e0b 0%, #d946ef 100%)' : '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '18px',
            padding: '14px 20px',
            fontSize: '0.94rem',
            fontWeight: 950,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isJunior ? '0 8px 24px rgba(245, 158, 11, 0.35)' : '0 6px 18px rgba(15, 23, 42, 0.20)',
            transition: 'all 0.18s ease'
          }}
          className="hover-scale"
        >
          <Sparkles size={17} />
          <span>{isJunior ? 'Super, verstanden!' : 'Schließen & Weiterüben'}</span>
        </button>
      </div>
    </div>
  );
};
