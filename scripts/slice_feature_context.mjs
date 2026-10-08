#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab Exocortex Slicer Engine [0,1% Goldstandard]
// Standards: OWASP ASVS L3 / DSGVO Art. 5 (Data Minimization) / Zero-Truncation
// Purpose:   Extracts surgical, XML-wrapped feature context slices (< 15 KB)
//            from docs/SYSTEM_FEATURE_MATRIX.md to prevent LLM tool truncation.
// Runtime:   Native Node.js ESM — zero external dependencies
// =============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// STRICT SOURCE-OF-TRUTH BINDING — ZERO PATH TRAVERSAL ALLOWED
const MATRIX_PATH = path.join(ROOT_DIR, 'docs', 'SYSTEM_FEATURE_MATRIX.md');
const MAX_SLICE_BYTES = 15 * 1024; // 15 KB strict ceiling

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function computeChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function cleanMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '')
    .trim();
}

function parseRules(rulesCell) {
  if (!rulesCell) return [];
  const normalized = rulesCell.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalized.split('\n');
  const rules = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Clean bullet markers
    const cleaned = trimmed.replace(/^[•\-\*\d\.]+\s*/, '').replace(/\*\*/g, '').trim();
    if (cleaned.length > 0) {
      rules.push(cleaned);
    }
  }

  return rules.length > 0 ? rules : [cleanMarkdownText(rulesCell)];
}

function parseMatrixFile() {
  if (!fs.existsSync(MATRIX_PATH)) {
    throw new Error(`SYSTEM_FEATURE_MATRIX.md not found at anchored path: ${MATRIX_PATH}`);
  }

  const content = fs.readFileSync(MATRIX_PATH, 'utf8');
  const lines = content.split('\n');
  const features = [];

  let currentHeadingFeature = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Pattern 1: Table row `| **CAM-01** | ...`
    const tableMatch = trimmed.match(/^\|\s*\*\*([A-Z]{3,4}-\d+)\*\*\s*\|/i);
    if (tableMatch) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length >= 6) {
        const id = tableMatch[1].toUpperCase();
        const title = cleanMarkdownText(cells[1]);
        const targetRole = cleanMarkdownText(cells[2]);
        const entryPoint = cleanMarkdownText(cells[3]);
        const backendSsot = cleanMarkdownText(cells[4]);
        const rawRules = cells[5];
        const rules = parseRules(rawRules);

        const prefix = id.split('-')[0];
        const contextMap = {
          CAM: 'campus',
          GRV: 'groovelab',
          ADM: 'admin',
          SEC: 'security'
        };

        const rawSlice = `${id}|${title}|${targetRole}|${entryPoint}|${backendSsot}|${rawRules}`;
        features.push({
          id,
          title,
          context: contextMap[prefix] || prefix.toLowerCase(),
          target_role: targetRole,
          entry_point: entryPoint,
          backend_ssot: backendSsot,
          rules,
          raw_text: rawSlice,
          checksum: `SHA256:${computeChecksum(rawSlice)}`
        });
        continue;
      }
    }

    // Pattern 2: Heading block `### CAM-01 ...` or `## CAM-01 ...`
    const headingMatch = trimmed.match(/^(?:###|##)\s+([A-Z]{3,4}-\d+)(?:\s*[:\-–]\s*(.+))?$/i);
    if (headingMatch) {
      if (currentHeadingFeature) {
        features.push(currentHeadingFeature);
      }
      const id = headingMatch[1].toUpperCase();
      const title = headingMatch[2] ? headingMatch[2].trim() : id;
      const prefix = id.split('-')[0];
      const contextMap = {
        CAM: 'campus',
        GRV: 'groovelab',
        ADM: 'admin',
        SEC: 'security'
      };

      currentHeadingFeature = {
        id,
        title,
        context: contextMap[prefix] || prefix.toLowerCase(),
        target_role: '',
        entry_point: '',
        backend_ssot: '',
        rules: [],
        raw_text: trimmed,
        checksum: ''
      };
      continue;
    }

    if (currentHeadingFeature) {
      if (trimmed.startsWith('#')) {
        // Next section started
        currentHeadingFeature.checksum = `SHA256:${computeChecksum(currentHeadingFeature.raw_text)}`;
        features.push(currentHeadingFeature);
        currentHeadingFeature = null;
      } else {
        currentHeadingFeature.raw_text += '\n' + trimmed;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          currentHeadingFeature.rules.push(trimmed.replace(/^[-*•]\s*/, ''));
        }
      }
    }
  }

  if (currentHeadingFeature) {
    currentHeadingFeature.checksum = `SHA256:${computeChecksum(currentHeadingFeature.raw_text)}`;
    features.push(currentHeadingFeature);
  }

  return features;
}

function formatXmlSlice(f) {
  function buildXml(rules, isTruncated = false) {
    const lines = [
      `<feature_context id="${escapeXml(f.id)}" version="2026.1" checksum="${escapeXml(f.checksum)}">`,
      `  <metadata>`,
      `    <title>${escapeXml(f.title)}</title>`,
      `    <context>${escapeXml(f.context)}</context>`,
      `    <role>${escapeXml(f.target_role)}</role>`,
      `    <entry_point>${escapeXml(f.entry_point)}</entry_point>`,
      `    <backend_ssot>${escapeXml(f.backend_ssot)}</backend_ssot>`,
      `  </metadata>`,
      `  <rules>`
    ];

    for (const rule of rules) {
      lines.push(`    <rule>${escapeXml(rule)}</rule>`);
    }

    if (isTruncated) {
      lines.push('    <rule>[TRUNCATED: Exceeded 15 KB limit]</rule>');
    }

    lines.push('  </rules>');
    lines.push('</feature_context>');
    return lines.join('\n');
  }

  let rules = [...f.rules];
  let xml = buildXml(rules);
  if (Buffer.byteLength(xml, 'utf8') <= MAX_SLICE_BYTES) {
    return xml;
  }

  // Iteratively reduce rules until within MAX_SLICE_BYTES
  while (rules.length > 0 && Buffer.byteLength(buildXml(rules, true), 'utf8') > MAX_SLICE_BYTES) {
    rules.pop();
  }

  xml = buildXml(rules, true);

  // If even with 0 rules metadata exceeds limit, trim metadata safely
  if (Buffer.byteLength(xml, 'utf8') > MAX_SLICE_BYTES) {
    const trimmedTitle = f.title.slice(0, 100);
    const trimmedSsot = f.backend_ssot.slice(0, 200);
    const lines = [
      `<feature_context id="${escapeXml(f.id)}" version="2026.1" checksum="${escapeXml(f.checksum)}">`,
      `  <metadata>`,
      `    <title>${escapeXml(trimmedTitle)}</title>`,
      `    <context>${escapeXml(f.context)}</context>`,
      `    <role>${escapeXml(f.target_role)}</role>`,
      `    <entry_point>${escapeXml(f.entry_point.slice(0, 200))}</entry_point>`,
      `    <backend_ssot>${escapeXml(trimmedSsot)}</backend_ssot>`,
      `  </metadata>`,
      `  <rules>`,
      `    <rule>[TRUNCATED: Metadata exceeded 15 KB limit]</rule>`,
      `  </rules>`,
      `</feature_context>`
    ];
    xml = lines.join('\n');
  }

  return xml;
}

function printHelp() {
  console.log(`
Campus-Groovelab Exocortex Slicer Engine [0,1% Goldstandard]
Usage:
  node scripts/slice_feature_context.mjs [options]

Options:
  --feature <ID>       Extract single feature by ID (e.g. CAM-107, GRV-03, ADM-05, SEC-02)
  --context <module>   Filter features by context (campus, groovelab, admin, security)
  --search <query>     Full-text search in titles, rules, entry points and backend RPCs
  --limit <number>     Limit number of matched features (default: 5)
  --json               Output formatted JSON instead of XML
  --help               Display this help text

Examples:
  node scripts/slice_feature_context.mjs --feature CAM-107
  node scripts/slice_feature_context.mjs --context campus --limit 3
  node scripts/slice_feature_context.mjs --search "ParentCampusActivation"
  node scripts/slice_feature_context.mjs --feature CAM-01 --json
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  let featureArg = null;
  let contextArg = null;
  let searchArg = null;
  let limitArg = 5;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--feature' && args[i + 1]) {
      featureArg = args[++i].toUpperCase();
    } else if (args[i] === '--context' && args[i + 1]) {
      contextArg = args[++i].toLowerCase();
    } else if (args[i] === '--search' && args[i + 1]) {
      searchArg = args[++i].toLowerCase();
    } else if (args[i] === '--limit' && args[i + 1]) {
      limitArg = parseInt(args[++i], 10) || 5;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  if (!featureArg && !contextArg && !searchArg) {
    console.error('Error: At least one filter must be provided (--feature, --context, or --search). Use --help for usage.');
    process.exit(1);
  }

  const allFeatures = parseMatrixFile();
  let matched = allFeatures;

  if (featureArg) {
    matched = matched.filter(f => f.id === featureArg || f.id === `CAM-${featureArg}` || f.id === `GRV-${featureArg}` || f.id === `ADM-${featureArg}` || f.id === `SEC-${featureArg}`);
  }

  if (contextArg) {
    const aliasMap = {
      campus: 'campus',
      cam: 'campus',
      groovelab: 'groovelab',
      grv: 'groovelab',
      admin: 'admin',
      adm: 'admin',
      sec: 'security',
      security: 'security'
    };
    const targetContext = aliasMap[contextArg] || contextArg;
    matched = matched.filter(f => f.context === targetContext);
  }

  if (searchArg) {
    matched = matched.filter(f => {
      const haystack = `${f.id} ${f.title} ${f.target_role} ${f.entry_point} ${f.backend_ssot} ${f.rules.join(' ')}`.toLowerCase();
      return haystack.includes(searchArg);
    });
  }

  if (matched.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ total: 0, features: [] }, null, 2));
    } else {
      console.error(`No features found matching the given criteria.`);
    }
    process.exit(1);
  }

  const results = matched.slice(0, featureArg ? 1 : limitArg);

  if (jsonOutput) {
    console.log(JSON.stringify({
      total_matches: matched.length,
      returned: results.length,
      features: results.map(f => ({
        id: f.id,
        title: f.title,
        context: f.context,
        target_role: f.target_role,
        entry_point: f.entry_point,
        backend_ssot: f.backend_ssot,
        rules: f.rules,
        checksum: f.checksum
      }))
    }, null, 2));
  } else {
    for (const f of results) {
      console.log(formatXmlSlice(f));
    }
  }

  process.exit(0);
}

main();
