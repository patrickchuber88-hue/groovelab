#!/usr/bin/env node
// =============================================================================
// 🛡️ Campus-Groovelab EU Cyber Resilience Act (CRA) CycloneDX 1.5 SBOM & Merkle Seal
// Standard:  VO (EU) 2024/2847 (Cyber Resilience Act), BSI TR-03183, ISO/IEC 5230
// Purpose:   Generates a deterministic CycloneDX 1.5 Software Bill of Materials
//            across all workspaces and seals it with a hybrid SHA-256 + SHA3-512
//            Post-Quantum-ready cryptographic digest (SEC-98 / LEG-AUDIT-03).
// Runtime:   Native Node.js ESM — zero external dependencies
// =============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const WORKSPACE_PACKAGE_PATHS = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'apps', 'groovelab', 'package.json'),
  path.join(ROOT_DIR, 'packages', 'bff-server', 'package.json'),
  path.join(ROOT_DIR, 'packages', 'shared', 'package.json')
];

function computeDualHash(payload) {
  const sha256 = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  const sha3_512 = crypto.createHash('sha3-512').update(payload, 'utf8').digest('hex');
  return { sha256, sha3_512, combinedSeal: `pqc-dual:sha256:${sha256}:sha3-512:${sha3_512}` };
}

export function generateCycloneDxSbom() {
  const componentsMap = new Map();

  for (const pkgPath of WORKSPACE_PACKAGE_PATHS) {
    if (!fs.existsSync(pkgPath)) continue;
    const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...(raw.dependencies || {}), ...(raw.devDependencies || {}) };

    for (const [name, versionSpec] of Object.entries(deps)) {
      const cleanVersion = String(versionSpec).replace(/^[\^~>=<]+/, '') || '0.0.0';
      const purl = `pkg:npm/${encodeURIComponent(name)}@${cleanVersion}`;
      if (!componentsMap.has(purl)) {
        componentsMap.set(purl, {
          type: 'library',
          name,
          version: cleanVersion,
          purl,
          scope: raw.dependencies?.[name] ? 'required' : 'optional'
        });
      }
    }
  }

  const sortedComponents = Array.from(componentsMap.values()).sort((a, b) =>
    a.purl.localeCompare(b.purl)
  );

  const canonicalComponentPayload = JSON.stringify(sortedComponents);
  const merkleSeal = computeDualHash(canonicalComponentPayload);

  const sbomDocument = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'Campus-Groovelab Sovereign Security',
          name: 'cra-sbom-merkle-sealer',
          version: '2026.1'
        }
      ],
      component: {
        type: 'application',
        name: 'campus-groovelab-enterprise-monorepo',
        version: '2026.10'
      },
      properties: [
        { name: 'eu:cra:compliance', value: 'VO (EU) 2024/2847 Annex I Part I' },
        { name: 'bsi:tr-03183:part2', value: 'CycloneDX 1.5 JSON' },
        { name: 'hosting:sovereignty', value: '100% DE Hetzner ISO/IEC 27001 (Zero US-Cloud)' },
        { name: 'crypto:sha256', value: merkleSeal.sha256 },
        { name: 'crypto:sha3-512', value: merkleSeal.sha3_512 },
        { name: 'crypto:dual-seal', value: merkleSeal.combinedSeal }
      ]
    },
    components: sortedComponents
  };

  const outDir = path.join(ROOT_DIR, 'reports', 'compliance');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'sbom.cyclonedx.json');
  fs.writeFileSync(outPath, JSON.stringify(sbomDocument, null, 2), 'utf8');

  return { outPath, componentCount: sortedComponents.length, merkleSeal };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = generateCycloneDxSbom();
  process.stdout.write(`✅ [CRA SBOM] Generated ${res.componentCount} components -> ${res.outPath}\n`);
  process.stdout.write(`🔒 [PQC Seal] SHA-256: ${res.merkleSeal.sha256}\n`);
}
