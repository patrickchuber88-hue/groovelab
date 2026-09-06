#!/usr/bin/env node
// ==============================================================================
// 📦 Campus-Groovelab Dynamic Software Bill of Materials (SBOM) Generator
// Standard: NIST SP 800-161 / CycloneDX v1.5 Specification
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_PKG = path.join(ROOT_DIR, 'apps', 'groovelab', 'package.json');
const ROOT_LOCK = path.join(ROOT_DIR, 'package-lock.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'apps', 'groovelab', 'dist', 'sbom.json');

console.log('📦 Generiere dynamisches Software Bill of Materials (SBOM) nach NIST SP 800-161 & CycloneDX v1.5...');

const appPkg = JSON.parse(fs.readFileSync(APP_PKG, 'utf-8'));
let lockData = null;
if (fs.existsSync(ROOT_LOCK)) {
  try {
    lockData = JSON.parse(fs.readFileSync(ROOT_LOCK, 'utf-8'));
  } catch (e) {
    console.warn('⚠️ Konnte package-lock.json nicht parsen, nutze package.json');
  }
}

const components = [];
const allDeps = {
  ...(appPkg.dependencies || {}),
  ...(appPkg.devDependencies || {})
};

for (const [name, rawVersion] of Object.entries(allDeps)) {
  let resolvedVersion = rawVersion.replace(/^[\^~>=<]/, '');
  let integrity = undefined;

  // Try to find resolved version and sha512 integrity from lockfile
  if (lockData && lockData.packages) {
    const lockKey = `apps/groovelab/node_modules/${name}` in lockData.packages
      ? `apps/groovelab/node_modules/${name}`
      : `node_modules/${name}`;
    const entry = lockData.packages[lockKey];
    if (entry) {
      if (entry.version) resolvedVersion = entry.version;
      if (entry.integrity) integrity = entry.integrity;
    }
  }

  const purl = `pkg:npm/${name.startsWith('@') ? encodeURIComponent(name).replace('%2F', '/') : encodeURIComponent(name)}@${resolvedVersion}`;

  const hashes = [];
  if (integrity && integrity.startsWith('sha512-')) {
    hashes.push({
      alg: 'SHA-512',
      content: Buffer.from(integrity.replace('sha512-', ''), 'base64').toString('hex')
    });
  }

  components.push({
    type: 'library',
    name,
    version: resolvedVersion,
    scope: appPkg.dependencies && appPkg.dependencies[name] ? 'required' : 'optional',
    purl,
    ...(hashes.length > 0 ? { hashes } : {})
  });
}

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [
      {
        vendor: 'Campus-Groovelab SecOps',
        name: 'dynamic-cyclonedx-generator',
        version: '2.0.0'
      }
    ],
    component: {
      type: 'application',
      name: 'campus-groovelab-web',
      version: appPkg.version || '1.0.0',
      description: 'Campus-Groovelab Sovereign Cloud Platform for Music Schools',
      licenses: [
        {
          license: {
            name: 'Proprietary Commercial SaaS'
          }
        }
      ]
    }
  },
  components
};

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sbom, null, 2), 'utf-8');
console.log(`✅ Dynamisches CycloneDX SBOM erfolgreich erstellt (${components.length} Komponenten) unter: ${OUTPUT_FILE}`);
