/**
 * Central Apple Wallet (.pkpass) and Digital Pass Generator
 * Generates standard PKPass JSON payloads for Apple Wallet and web pass downloads.
 */

export interface WalletPassOptions {
  schoolName: string;
  userName: string;
  userRole?: string;
  instrument?: string;
  qrToken: string;
  accessPin?: string;
  isCampus?: boolean;
  themeColor?: string;
}

export const generateAppleWalletPassBlob = (options: WalletPassOptions): Blob => {
  const {
    schoolName,
    userName,
    userRole = 'Schüler',
    instrument = 'Instrument',
    qrToken,
    accessPin,
    isCampus = true,
    themeColor = isCampus ? '#34a853' : '#eab308'
  } = options;

  const passData = {
    formatVersion: 1,
    passTypeIdentifier: "pass.de.campusgroovelab.app",
    serialNumber: `CG-${qrToken.slice(0, 8).toUpperCase()}-${Date.now()}`,
    teamIdentifier: "CAMPUSGROOVELAB",
    organizationName: schoolName || "Campus-Groovelab",
    description: `Digitaler Ausweis • ${schoolName || 'Campus-Groovelab'}`,
    logoText: isCampus ? "Campus-Groovelab" : "GrooveLab Bandroom",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: isCampus ? "rgb(52, 168, 83)" : "rgb(234, 179, 8)",
    labelColor: "rgb(240, 253, 244)",
    eventTicket: {
      primaryFields: [
        {
          key: "member",
          label: "NAME",
          value: userName
        }
      ],
      secondaryFields: [
        {
          key: "school",
          label: "MUSIKSCHULE",
          value: schoolName || "Musikschule"
        },
        {
          key: "instrument",
          label: "FACH / ROLLE",
          value: `${instrument} • ${userRole}`
        }
      ],
      auxiliaryFields: [
        {
          key: "status",
          label: "STATUS",
          value: "Aktiviert"
        }
      ],
      barcode: {
        format: "PKBarcodeFormatQR",
        message: qrToken,
        messageEncoding: "iso-8859-1",
        altText: qrToken.slice(0, 12)
      }
    }
  };

  const passString = JSON.stringify(passData, null, 2);
  return new Blob([passString], { type: 'application/vnd.apple.pkpass' });
};

export const downloadAppleWalletPass = (options: WalletPassOptions, filename?: string): boolean => {
  try {
    const blob = generateAppleWalletPassBlob(options);
    const blobUrl = URL.createObjectURL(blob);
    const cleanName = (options.userName || 'ausweis').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const finalFilename = filename || `campus-ausweis-${cleanName}.pkpass`;

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return true;
  } catch (err) {
    console.error('[WalletPassGenerator] Failed to generate/download Apple Wallet pass:', err);
    return false;
  }
};

/**
 * Generates an actionable Google Wallet / Android Pass payload.
 * For Android users, this formats the digital ID into a Google Wallet Save payload or a standardized pass URI.
 */
export const generateGoogleWalletPassUrl = (options: WalletPassOptions): string => {
  const {
    schoolName,
    userName,
    userRole = 'Schüler',
    instrument = 'Instrument',
    qrToken,
    isCampus = true
  } = options;

  // Build standard Google Wallet Generic Object payload structure
  const genericPass = {
    iss: 'campus-groovelab',
    aud: 'google',
    typ: 'savetowallet',
    origins: [typeof window !== 'undefined' ? window.location.origin : 'https://campus-groovelab.de'],
    payload: {
      genericObjects: [
        {
          id: `campus_groovelab_${qrToken.slice(0, 16)}`,
          classId: 'campus_groovelab_student_id_v1',
          genericType: 'GENERIC_ID',
          hexBackgroundColor: isCampus ? '#34a853' : '#eab308',
          logo: {
            sourceUri: {
              uri: typeof window !== 'undefined' ? `${window.location.origin}/campus_login_hero.png` : 'https://campus-groovelab.de/campus_login_hero.png'
            },
            contentDescription: {
              defaultValue: {
                language: 'de',
                value: 'Campus-Groovelab Logo'
              }
            }
          },
          cardTitle: {
            defaultValue: {
              language: 'de',
              value: isCampus ? 'Campus-Groovelab Ausweis' : 'GrooveLab Pass'
            }
          },
          header: {
            defaultValue: {
              language: 'de',
              value: userName
            }
          },
          subheader: {
            defaultValue: {
              language: 'de',
              value: `${schoolName || 'Musikschule'} • ${instrument}`
            }
          },
          barcode: {
            type: 'QR_CODE',
            value: qrToken,
            alternateText: `${userRole}: ${userName}`
          }
        }
      ]
    }
  };

  // Safe base64url encoding of the payload
  const jsonStr = JSON.stringify(genericPass);
  const base64Payload = btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `https://pay.google.com/gp/v/save/${base64Payload}`;
};
