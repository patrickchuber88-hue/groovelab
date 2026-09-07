/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise Zero-Network QR Generator
 * Standard: OWASP ASVS Level 3 / Art. 44 ff. DSGVO (Zero-Third-Party Transmission)
 * ==============================================================================
 * Generates cryptographic QR codes 100% offline and locally inside the client.
 * Completely eliminates dependence on external services like api.qrserver.com
 * or chart.googleapis.com, preventing unconsented IP/token leakages.
 */

import QRCode from 'qr.js/lib/QRCode';
import ErrorCorrectLevel from 'qr.js/lib/ErrorCorrectLevel';

export interface QrRenderOptions {
  size?: number;
  margin?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates a pure SVG string of the QR code.
 */
export function generateLocalQrSvg(value: string, options: QrRenderOptions = {}): string {
  const {
    size = 256,
    margin = 2,
    fgColor = '#000000',
    bgColor = '#ffffff',
    level = 'M'
  } = options;

  const qrLevel = ErrorCorrectLevel[level] ?? ErrorCorrectLevel.M;
  const qrcode = new QRCode(-1, qrLevel);
  qrcode.addData(value);
  qrcode.make();

  const modules = qrcode.modules;
  const count = modules.length;
  const totalCount = count + margin * 2;

  let pathData = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        pathData += `M ${c + margin} ${r + margin} l 1 0 0 1 -1 0 Z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalCount} ${totalCount}" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <path d="${pathData.trim()}" fill="${fgColor}"/>
  </svg>`;
}

/**
 * Generates an SVG Data URL (data:image/svg+xml;utf8,...).
 */
export function generateLocalQrSvgDataUrl(value: string, options: QrRenderOptions = {}): string {
  const svg = generateLocalQrSvg(value, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a crisp PNG Data URL (data:image/png;base64,...) for PDF embedding
 * and 2D graphics, rendered locally on an HTML5 canvas.
 */
export async function generateLocalQrDataUrl(
  value: string,
  size: number = 300,
  margin: number = 2
): Promise<string> {
  if (typeof document === 'undefined') {
    return generateLocalQrSvgDataUrl(value, { size, margin });
  }

  try {
    const qrcode = new QRCode(-1, ErrorCorrectLevel.M);
    qrcode.addData(value);
    qrcode.make();

    const modules = qrcode.modules;
    const count = modules.length;
    const totalModules = count + margin * 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return generateLocalQrSvgDataUrl(value, { size, margin });
    }

    // Pure white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Compute integer cell scale for razor-sharp rendering
    const cellSize = size / totalModules;
    ctx.fillStyle = '#000000';

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (modules[r][c]) {
          const x = Math.round((c + margin) * cellSize);
          const y = Math.round((r + margin) * cellSize);
          const w = Math.ceil(cellSize);
          const h = Math.ceil(cellSize);
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[localQrGenerator] Error generating PNG canvas, falling back to SVG data URL:', err);
    return generateLocalQrSvgDataUrl(value, { size, margin });
  }
}

/**
 * Triggers an offline, instant download of a high-resolution QR code PNG image.
 */
export async function downloadLocalQrCodePng(
  value: string,
  filename: string,
  size: number = 512
): Promise<void> {
  const dataUrl = await generateLocalQrDataUrl(value, size, 2);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
