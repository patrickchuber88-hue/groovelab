import fs from 'fs';
import path from 'path';
import { generateB2BContractPackagePDF } from '../apps/groovelab/src/utils/b2bContractPdfGenerator';

async function run() {
  console.log('Generating official sample B2B Contract Package PDF...');
  
  const buffer = await generateB2BContractPackagePDF({
    schoolName: 'Städtische Musikschule Rheinfelden',
    schoolId: 'MS-79618-01',
    adminName: 'Schulleitung / Kulturamt',
    address: 'Mauritiusgasse 1',
    postalCode: '79618',
    city: 'Rheinfelden (Baden)',
    country: 'DE',
    selectedModule: 'kombi',
    teacherCount: 24,
    studentDirectBilling: true,
    isMunicipalCarrier: true,
    returnBuffer: true
  });

  if (buffer) {
    const outDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const targetFile = path.join(outDir, 'Campus-Groovelab_B2B_Vertragsurkunde_Muster.pdf');
    fs.writeFileSync(targetFile, Buffer.from(buffer));
    console.log(`✅ PDF successfully generated at: ${targetFile}`);
  } else {
    console.error('Failed to generate PDF buffer.');
  }
}

run().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
