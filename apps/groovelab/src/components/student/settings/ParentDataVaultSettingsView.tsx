import React from 'react';
import { Download, RotateCcw, CheckCircle, ShieldCheck, FileSpreadsheet, Lock } from 'lucide-react';

export interface ParentDataVaultSettingsViewProps {
  downloadingSection: string | null;
  downloadProgressMsg: string;
  downloadFeedback: string | null;
  handleDownloadFullArchive: () => Promise<void>;
  handleDownloadAudioOnly: () => Promise<void>;
  handleDownloadBiographyOnly: () => Promise<void>;
  handleDownloadChronicleAndStickers: () => Promise<void>;
  handleExportGdprReport?: () => Promise<void>;
  handleExportFullDataArchive?: () => Promise<void>;
}

export const ParentDataVaultSettingsView: React.FC<ParentDataVaultSettingsViewProps> = ({
  downloadingSection,
  downloadProgressMsg,
  downloadFeedback,
  handleDownloadFullArchive,
  handleDownloadAudioOnly,
  handleDownloadBiographyOnly,
  handleDownloadChronicleAndStickers,
  handleExportGdprReport,
  handleExportFullDataArchive,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '24px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.04)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0
            }}>
              <Download size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Downloads &amp; Didaktik-Datentresor
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 550, lineHeight: 1.4, marginTop: '2px' }}>
                Volle Datensouveränität nach Art. 20 DSGVO. Sichere alle Übedaten, Audioaufnahmen und Sammel-Sticker auf deinem lokalen Computer.
              </div>
            </div>
          </div>
          <span style={{
            background: '#ecfdf5',
            color: '#15803d',
            padding: '5px 14px',
            borderRadius: '100px',
            fontSize: '0.74rem',
            fontWeight: 800,
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={15} />
            <span>DSGVO Art. 20 konform</span>
          </span>
        </div>

        {downloadProgressMsg && (
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#1e40af',
            fontSize: '0.82rem',
            fontWeight: 750,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <RotateCcw size={18} className="spin-slow" />
            <span>{downloadProgressMsg}</span>
          </div>
        )}

        {downloadFeedback && (
          <div style={{
            background: downloadFeedback.includes('Fehler') ? '#fef2f2' : '#f0fdf4',
            border: `1.5px solid ${downloadFeedback.includes('Fehler') ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '14px',
            padding: '12px 16px',
            color: downloadFeedback.includes('Fehler') ? '#dc2626' : '#15803d',
            fontSize: '0.82rem',
            fontWeight: 850,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={18} />
            <span>{downloadFeedback}</span>
          </div>
        )}
      </div>

      {/* 4 Modular Download Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* 1. Vollständiges Meisterwerk-Archiv (.ZIP) */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b45309',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              📦
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                Vollständiges Meisterwerk-Archiv (.ZIP)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 550, marginTop: '2px', lineHeight: 1.45 }}>
                Enthält alle eigenen Tonaufnahmen aus dem Audio-Tresor, die Audio-Biografie, das <strong>komplette Sammel-Sticker-Album</strong> und die didaktische Chronik.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadFullArchive}
            disabled={downloadingSection !== null}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 18px',
              fontSize: '0.84rem',
              fontWeight: 850,
              cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              opacity: downloadingSection !== null ? 0.6 : 1
            }}
            className="hover-scale"
          >
            <Download size={15} />
            <span>{downloadingSection === 'full' ? 'Exportiert...' : 'Komplett-ZIP herunterladen'}</span>
          </button>
        </div>

        {/* 2. Nur Audio-Tresor & Übeaufnahmen (.ZIP) */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              🎙️
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                Audio-Tresor &amp; Übeaufnahmen (.ZIP)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 550, marginTop: '2px', lineHeight: 1.45 }}>
                Alle selbst eingespielten Übe-Takes, Loopstation-Sessions und Hausaufgaben-Mitschnitte als sauber benannte Audiodateien.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadAudioOnly}
            disabled={downloadingSection !== null}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 18px',
              fontSize: '0.84rem',
              fontWeight: 850,
              cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.2)',
              opacity: downloadingSection !== null ? 0.6 : 1
            }}
            className="hover-scale"
          >
            <Download size={15} />
            <span>{downloadingSection === 'audio' ? 'Lade Audios...' : 'Audio-Paket herunterladen'}</span>
          </button>
        </div>

        {/* 3. Nur Audio-Biografie & Meilensteine (.ZIP) */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#fdf4ff',
              border: '1px solid #f5d0fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c026d3',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              🌟
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                Audio-Biografie &amp; Meilensteine (.ZIP)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 550, marginTop: '2px', lineHeight: 1.45 }}>
                Die kuratierten Highlight-Aufnahmen deiner musikalischen Meilensteine (Erster Song, Bühnenerfolge, Lieblingsstücke).
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadBiographyOnly}
            disabled={downloadingSection !== null}
            style={{
              background: '#a21caf',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 18px',
              fontSize: '0.84rem',
              fontWeight: 850,
              cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(162, 28, 175, 0.2)',
              opacity: downloadingSection !== null ? 0.6 : 1
            }}
            className="hover-scale"
          >
            <Download size={15} />
            <span>{downloadingSection === 'biography' ? 'Lade Meilensteine...' : 'Biografie-ZIP herunterladen'}</span>
          </button>
        </div>

        {/* 4. Didaktik-Chronik, Urkunden & Sammel-Sticker (.JSON / .PDF) */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              📜
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                Didaktik-Chronik, Urkunden &amp; Sammel-Sticker (.JSON / .PDF)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 550, marginTop: '2px', lineHeight: 1.45 }}>
                Das <strong>komplette Sammel-Sticker-Album</strong> mit allen freigeschalteten Badges, Emojis, Erwerbsdaten und didaktischen Lehrkraft-Begründungen sowie die offizielle DSGVO-Chronik.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadChronicleAndStickers}
            disabled={downloadingSection !== null}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 18px',
              fontSize: '0.84rem',
              fontWeight: 850,
              cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(22, 163, 74, 0.2)',
              opacity: downloadingSection !== null ? 0.6 : 1
            }}
            className="hover-scale"
          >
            <Download size={15} />
            <span>{downloadingSection === 'chronicle' ? 'Exportiere...' : 'Sticker & Chronik exportieren'}</span>
          </button>
        </div>

      </div>

      {/* Additional GDPR Export Buttons if available */}
      {(handleExportGdprReport || handleExportFullDataArchive) && (
        <div style={{
          background: '#f8fafc',
          borderRadius: '20px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          textAlign: 'left'
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
              DSGVO-Selbstauskunft &amp; Gesamtexport
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
              Offizielles Datenblatt nach Art. 15 DSGVO oder vollständiges Datenpaket.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {handleExportGdprReport && (
              <button
                type="button"
                onClick={handleExportGdprReport}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <FileSpreadsheet size={15} />
                <span>Art. 15 PDF/JSON</span>
              </button>
            )}
            {handleExportFullDataArchive && (
              <button
                type="button"
                onClick={handleExportFullDataArchive}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <Lock size={15} />
                <span>Art. 20 Gesamtdaten</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Protection Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 18px',
        borderRadius: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '0.74rem',
        lineHeight: 1.45,
        textAlign: 'left'
      }}>
        <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
        <span><strong>Schutz der Privatsphäre:</strong> Der Export enthält ausschließlich Daten des Schülers. Interne Vermerke und persönliche Lehrkraft-Notizen bleiben zum Schutz der Lehrkräfte strikt unzugänglich.</span>
      </div>
    </div>
  );
};
