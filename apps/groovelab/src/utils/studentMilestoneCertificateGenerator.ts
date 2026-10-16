/**
 * 🏆 VdM-Jahresurkunden- & Stufen-Meilenstein-Generator (FUNC-AUDIT-04 / CAM-154)
 *
 * Erzeugt eine kind-, jugend- und elterngerechte, druckfertige DIN-A4-Meilenstein-Urkunde
 * für den pädagogischen Jahresabschluss (gemeisterte Buchseiten aus `progress_matrix`,
 * gelernte Songs aus `user_song_skills`, erspielte WorldTour-Stempel und Übeserie).
 *
 * 🛡️ KUG § 22 & DSGVO Art. 8 Zero-Photo-Doktrin:
 * Nutzt ausschließlich Vektor-Embleme ohne reale Kinderfotos und arbeitet zu 100 % lokal im Browser.
 */

export interface StudentMilestoneCertificateInput {
  studentDisplayName: string;
  instrumentName: string;
  schoolName: string;
  teacherDisplayName?: string;
  masteredBookPagesCount: number;
  masteredSongsCount: number;
  worldTourStampsCount: number;
  streakDays: number;
  vdmStageLabel?: string;
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateStudentMilestoneCertificateHtml(
  input: StudentMilestoneCertificateInput
): string {
  const issueDateDe = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const stageLabel = input.vdmStageLabel || 'VdM-Aufbaustufe · Aktiver Musik-Entdecker';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Musikschul-Jahresurkunde – ${escapeHtml(input.studentDisplayName)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
    }
    .frame {
      border: 3px solid #0f172a;
      border-radius: 24px;
      padding: 28px 36px;
      box-sizing: border-box;
      text-align: center;
      background: #ffffff;
    }
    .pill {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      font-size: 30px;
      font-weight: 900;
      margin: 14px 0 6px 0;
      letter-spacing: -0.02em;
    }
    .student-name {
      font-size: 26px;
      font-weight: 900;
      color: #15803d;
      margin: 10px 0 4px 0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin: 24px 0;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      padding: 14px 10px;
    }
    .kpi-val {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
    }
    .kpi-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-top: 4px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="frame">
    <span class="pill">${escapeHtml(input.schoolName)} · ${escapeHtml(stageLabel)}</span>
    <h1>Meilenstein- &amp; Jahresurkunde</h1>
    <p style="margin:0;color:#475569;font-size:14px;font-weight:600;">
      Verliehen für musikalisches Engagement, Ausdauer und Spielfreude im Fach <strong>${escapeHtml(input.instrumentName)}</strong> an
    </p>
    <div class="student-name">${escapeHtml(input.studentDisplayName)}</div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val">${Math.max(0, Number(input.masteredBookPagesCount) || 0)}</div>
        <div class="kpi-lbl">Gemeisterte Lehrwerks-Seiten</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${Math.max(0, Number(input.masteredSongsCount) || 0)}</div>
        <div class="kpi-lbl">Erarbeitete Musikstücke</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${Math.max(0, Number(input.worldTourStampsCount) || 0)}</div>
        <div class="kpi-lbl">WorldTour-Reisestempel</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${Math.max(0, Number(input.streakDays) || 0)} Tage</div>
        <div class="kpi-lbl">Beste Übeserie</div>
      </div>
    </div>

    <div class="footer">
      <div style="text-align:left;">
        <strong>Ausgestellt am:</strong> ${issueDateDe}<br/>
        <span>${escapeHtml(input.schoolName)}</span>
      </div>
      <div style="text-align:right;">
        <strong>Lehrkraft:</strong> ${escapeHtml(input.teacherDisplayName || 'Musikpädagogische Fachleitung')}<br/>
        <span>Digitale Campus-Groovelab Auszeichnung</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printStudentMilestoneCertificate(
  input: StudentMilestoneCertificateInput
): void {
  if (typeof window === 'undefined') return;
  const html = generateStudentMilestoneCertificateHtml(input);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {}
  }, 250);
}
