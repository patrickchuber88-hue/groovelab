/**
 * 🏛️ Campus-Groovelab Parent Sponsor Patronage Card (Right Sidebar / Stiftertafel)
 * 
 * 0.1% Monolith Goldstandard / Autarkic Feature Satellite
 * Bounded Context: Student & Parent Governance (Elternportal)
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / § 8 MStV Compliance
 * 
 * Vibrant Luxury Standard (Der perfekte Mix aus Edel & Bunt):
 * - Monolithische Struktur: 100% kistenfreie Eleganz mit feinen Hairline-Dividers (#f1f5f9)
 * - Farbkodierte, lebendige Tiers:
 *   👑 Hauptförderer: Königliches Bernstein-Gold (#b45309 / #d97706 / #fef3c7)
 *   🛡️ Bildungspartner: Frisches Smaragdgrün (#15803d / #16a34a / #f0fdf4)
 *   🤝 Förderpartner: Warmes Königs-Indigo (#4f46e5 / #6366f1)
 * - Juwelen-Krone an der Oberkante (Gold -> Smaragd -> Indigo)
 * - Lückenlose Lesbarkeit: Name, Branche und Ort sind stets 100% dynamisch und vollständig sichtbar
 * - Dual-Mode: Regionale Bildungsförderung (bei Sponsoren) ⇄ Offizielle Schullizenz (bei 0 Sponsoren)
 * - Zero-Ghost-Slots: Unbesetzte Tiers sind im DOM nicht existent
 * 
 * Zero-outbound links, zero tracking, 100% child-safe according to JMStV.
 */

import React, { useState, useEffect } from 'react';
import { Award, Crown, ShieldCheck, HeartHandshake, Check, GraduationCap } from 'lucide-react';
import type { SchoolSponsorSettings, SchoolSponsorItem } from '../../secretary/sponsors/SecretarySponsorsModal';

export interface ParentSponsorPatronageCardProps {
  schoolId?: string;
}

export const ParentSponsorPatronageCard: React.FC<ParentSponsorPatronageCardProps> = ({ schoolId }) => {
  const [sponsors, setSponsors] = useState<SchoolSponsorItem[]>([]);
  const [schoolName, setSchoolName] = useState<string>('Musikschule');

  useEffect(() => {
    try {
      // 1. Resolve schoolId with multi-level resilient fallback
      let currentSchoolId = schoolId;
      if (!currentSchoolId) {
        try {
          const profile = localStorage.getItem('campus_user_profile');
          if (profile) {
            const parsed = JSON.parse(profile);
            if (parsed?.school_id) currentSchoolId = parsed.school_id;
            if (parsed?.school_name || parsed?.schoolName) {
              setSchoolName(parsed.school_name || parsed.schoolName);
            }
          }
        } catch {}
      }
      if (!currentSchoolId) {
        // Fallback: search for any campus_sponsor_settings_* key in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('campus_sponsor_settings_')) {
            currentSchoolId = k.replace('campus_sponsor_settings_', '');
            break;
          }
        }
      }
      if (!currentSchoolId) return;

      const stored = localStorage.getItem(`campus_sponsor_settings_${currentSchoolId}`);
      if (!stored) return;

      const parsed: SchoolSponsorSettings = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.sponsors)) return;

      const active = parsed.sponsors.filter(
        s => s.isActive && s.id !== 'demo-1'
      );

      setSponsors(active);
    } catch {
      // Graceful fail-closed
    }
  }, [schoolId]);

  // 💎 SZENARIO B: REINER SAMMELZAHLER (0 SPONSOREN) -> OFFIZIELLE CAMPUS-SCHULLIZENZ (VIBRANT LUXURY)
  if (sponsors.length === 0) {
    return (
      <div
        role="region"
        aria-label="Offizielle Campus-Schullizenz"
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          boxShadow: '0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* TOP JEWEL LINE (EMERALD) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
          }}
        />

        {/* HEADER: SCHULLIZENZ */}
        <div style={{
          padding: '22px 20px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d',
              flexShrink: 0,
              boxShadow: 'none'
            }}>
              <GraduationCap size={20} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.63rem',
                fontWeight: 850,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                color: '#15803d',
                marginBottom: '2px'
              }}>
                Schulweite Bildungsförderung
              </div>
              <div style={{
                fontSize: '1.0rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#0f172a',
                lineHeight: 1.25
              }}>
                Campus-Schullizenz 2026/27
              </div>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b'
              }}>
                {schoolName}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            fontWeight: 750,
            color: '#15803d',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '7px 11px',
            borderRadius: '9px'
          }}>
            <div style={{
              width: '17px',
              height: '17px',
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
              flexShrink: 0
            }}>
              <Check size={10} strokeWidth={3.2} />
            </div>
            <span>100 % Gebührenfrei für Ihre Familie durch den Schuletat</span>
          </div>
        </div>

        {/* BODY: TRÄGERSCHAFT (MONOLITHISCH, KEINE KISTEN) */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.64rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#15803d',
              marginBottom: '2px'
            }}>
              <ShieldCheck size={13} color="#16a34a" strokeWidth={2.4} />
              <span>Voll-Stipendium Ihrer Musikschule</span>
            </div>
            <div style={{
              fontSize: '1.10rem',
              fontWeight: 950,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              lineHeight: 1.25,
              wordBreak: 'break-word'
            }}>
              {schoolName}
            </div>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 750,
              color: '#15803d'
            }}>
              Träger der digitalen Lernplattform
            </div>
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '0.72rem',
              color: '#475569',
              lineHeight: 1.45,
              fontWeight: 500
            }}>
              Die Bereitstellungskosten für Campus-Groovelab werden im laufenden Schuljahr vollständig aus dem Schuletat getragen. Für Familien fallen keinerlei Zusatzgebühren an.
            </p>
          </div>
        </div>

        {/* FOOTER: DEDICATION & SIGNATURE */}
        <div style={{
          background: '#fafafc',
          borderTop: '1px solid #f1f5f9',
          padding: '16px 20px 18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textAlign: 'left'
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.72rem',
            color: '#334155',
            lineHeight: 1.45,
            fontStyle: 'italic',
            fontWeight: 500
          }}>
            „Wir freuen uns, allen Familien unserer Musikschule den Zugang zu modernen didaktischen Übewerkzeugen im Rahmen unseres Unterrichtsangebots kostenfrei zu ermöglichen.“
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#0f172a' }}>
              — Die Schulleitung, {schoolName}
            </span>
            <span style={{
              fontSize: '0.63rem',
              fontWeight: 800,
              color: '#16a34a',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '2px 8px',
              borderRadius: '100px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Check size={9} strokeWidth={3} />
              Beglaubigt
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 💎 SZENARIO A: REGIONALE BILDUNGSFÖRDERUNG (VIBRANT LUXURY)
  const hauptSponsors = sponsors.filter(s => s.tier === 'haupt' || s.isMainSponsor);
  const partnerSponsors = sponsors.filter(s => s.tier === 'partner');
  const foerderSponsors = sponsors.filter(s => s.tier === 'foerderer' || (!s.tier && !s.isMainSponsor));

  return (
    <div
      role="region"
      aria-label="Regionale Bildungsförderung"
      style={{
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: '0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* JEWEL TOP ACCENT LINE (GOLD TO EMERALD TO INDIGO) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 50%, #6366f1 100%)'
        }}
      />

      {/* 1. HEADER (WARM & EINLADEND) */}
      <div style={{
        padding: '22px 20px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderBottom: '1px solid #f1f5f9',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b45309',
            flexShrink: 0,
            boxShadow: 'none'
          }}>
            <Award size={20} strokeWidth={2.3} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.63rem',
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: '#b45309',
              marginBottom: '2px'
            }}>
              Regionale Bildungsförderung
            </div>
            <div style={{
              fontSize: '1.0rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              lineHeight: 1.25
            }}>
              Bildungsförderung 2026/27
            </div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#64748b'
            }}>
              {schoolName}
            </div>
          </div>
        </div>

        {/* FRISCHES SMARAGDGRÜNES VERTRAUENS-BANNER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.72rem',
          fontWeight: 750,
          color: '#15803d',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '7px 11px',
          borderRadius: '9px'
        }}>
          <div style={{
            width: '17px',
            height: '17px',
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a',
            flexShrink: 0
          }}>
            <Check size={10} strokeWidth={3.2} />
          </div>
          <span>100 % Gebührenfrei für Ihre Familie</span>
        </div>
      </div>

      {/* 2. STIFTER-KORPUS (FLIESSENDE REIHEN MIT FARBIGER IDENTITY - ZERO BOX-IN-BOX) */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        
        {/* TIER 1: SCHIRMHERRSCHAFT (BERNSTEIN-GOLD) */}
        {hauptSponsors.length > 0 && hauptSponsors.map((haupt, idx) => (
          <div
            key={haupt.id}
            style={{
              padding: '16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderBottom: (idx < hauptSponsors.length - 1 || partnerSponsors.length > 0 || foerderSponsors.length > 0) ? '1px solid #f1f5f9' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.64rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#b45309'
              }}>
                <Crown size={13} color="#d97706" strokeWidth={2.4} />
                <span>Hauptförderer</span>
              </div>
              <span style={{
                fontSize: '0.60rem',
                fontWeight: 800,
                color: '#b45309',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.02em'
              }}>
                Branchenexklusiv
              </span>
            </div>

            <div style={{
              fontSize: '1.10rem',
              fontWeight: 950,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              lineHeight: 1.25,
              wordBreak: 'break-word'
            }}>
              {haupt.companyName}
            </div>

            {(haupt.industrySubline || haupt.city) && (
              <div style={{
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                lineHeight: 1.35,
                flexWrap: 'wrap'
              }}>
                {haupt.industrySubline && (
                  <span style={{ fontWeight: 750, color: '#b45309' }}>
                    {haupt.industrySubline}
                  </span>
                )}
                {haupt.industrySubline && haupt.city && (
                  <span style={{ color: '#cbd5e1' }}>•</span>
                )}
                {haupt.city && (
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    {haupt.city}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* TIER 2: BILDUNGSPARTNER (SMARAGDGRÜN) */}
        {partnerSponsors.length > 0 && partnerSponsors.map((s, idx) => (
          <div
            key={s.id}
            style={{
              padding: '14px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderBottom: (idx < partnerSponsors.length - 1 || foerderSponsors.length > 0) ? '1px solid #f1f5f9' : 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.64rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#15803d',
              marginBottom: '2px'
            }}>
              <ShieldCheck size={13} color="#16a34a" strokeWidth={2.4} />
              <span>Bildungspartner</span>
            </div>

            <div style={{
              fontSize: '0.90rem',
              fontWeight: 850,
              letterSpacing: '-0.015em',
              color: '#0f172a',
              lineHeight: 1.3,
              wordBreak: 'break-word'
            }}>
              {s.companyName}
            </div>

            {(s.industrySubline || s.city) && (
              <div style={{
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                lineHeight: 1.35,
                flexWrap: 'wrap'
              }}>
                {s.industrySubline && (
                  <span style={{ fontWeight: 750, color: '#16a34a' }}>
                    {s.industrySubline}
                  </span>
                )}
                {s.industrySubline && s.city && (
                  <span style={{ color: '#cbd5e1' }}>•</span>
                )}
                {s.city && (
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    {s.city}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* TIER 3: REGIONALE FÖRDERPARTNER (KÖNIGS-INDIGO) */}
        {foerderSponsors.length > 0 && foerderSponsors.map((s, idx) => (
          <div
            key={s.id}
            style={{
              padding: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              borderBottom: (idx < foerderSponsors.length - 1) ? '1px solid #f1f5f9' : 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.64rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#4f46e5',
              marginBottom: '1px'
            }}>
              <HeartHandshake size={13} color="#6366f1" strokeWidth={2.4} />
              <span>Förderpartner</span>
            </div>

            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: '#0f172a',
              lineHeight: 1.3,
              wordBreak: 'break-word'
            }}>
              {s.companyName}
            </div>

            {(s.industrySubline || s.city) && (
              <div style={{
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                lineHeight: 1.3,
                flexWrap: 'wrap'
              }}>
                {s.industrySubline && (
                  <span style={{ fontWeight: 750, color: '#4f46e5' }}>
                    {s.industrySubline}
                  </span>
                )}
                {s.industrySubline && s.city && (
                  <span style={{ color: '#cbd5e1' }}>•</span>
                )}
                {s.city && (
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    {s.city}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* 3. FOOTER: DEDICATION & SIGNATURE */}
      <div style={{
        background: '#fafafc',
        borderTop: '1px solid #f1f5f9',
        padding: '16px 20px 18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        textAlign: 'left'
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.72rem',
          color: '#334155',
          lineHeight: 1.45,
          fontStyle: 'italic',
          fontWeight: 500
        }}>
          „Dank des gesellschaftlichen Engagements unserer Bildungspartner steht Campus-Groovelab allen Familien im laufenden Schuljahr vollkommen gebührenfrei zur Verfügung.“
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#0f172a' }}>
            — Die Schulleitung, {schoolName}
          </span>
          <span style={{
            fontSize: '0.63rem',
            fontWeight: 800,
            color: '#16a34a',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '2px 8px',
            borderRadius: '100px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Check size={9} strokeWidth={3} />
            Beglaubigt
          </span>
        </div>
      </div>
    </div>
  );
};
