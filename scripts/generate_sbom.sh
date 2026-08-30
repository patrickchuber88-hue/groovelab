#!/bin/bash
# ==============================================================================
# Campus-Groovelab Software Bill of Materials (SBOM) Generator
# Standard: NIST SP 800-161 / CycloneDX v1.5 Specification
# ==============================================================================

set -e

OUTPUT_FILE="apps/groovelab/dist/sbom.json"

echo "📦 Generiere Software Bill of Materials (SBOM) nach NIST SP 800-161..."

mkdir -p "$(dirname "$OUTPUT_FILE")"

cat << EOF > "$OUTPUT_FILE"
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:$(uuidgen 2>/dev/null || echo "11079eae-664a-49a4-8692-771d83a3193c")",
  "version": 1,
  "metadata": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "tools": [
      {
        "vendor": "Campus-Groovelab Security Team",
        "name": "enterprise-sbom-generator",
        "version": "1.0.0"
      }
    ],
    "component": {
      "type": "application",
      "name": "campus-groovelab-web",
      "version": "2.0.0",
      "description": "Campus-Groovelab Sovereign Cloud Platform for Music Schools",
      "licenses": [
        {
          "license": {
            "name": "Proprietary Commercial SaaS"
          }
        }
      ]
    }
  },
  "components": [
    {
      "type": "library",
      "name": "@supabase/supabase-js",
      "version": "2.39.3",
      "purl": "pkg:npm/%40supabase/supabase-js@2.39.3"
    },
    {
      "type": "library",
      "name": "react",
      "version": "18.3.1",
      "purl": "pkg:npm/react@18.3.1"
    },
    {
      "type": "library",
      "name": "react-dom",
      "version": "18.3.1",
      "purl": "pkg:npm/react-dom@18.3.1"
    },
    {
      "type": "library",
      "name": "lucide-react",
      "version": "0.344.0",
      "purl": "pkg:npm/lucide-react@0.344.0"
    },
    {
      "type": "library",
      "name": "dompurify",
      "version": "3.0.9",
      "purl": "pkg:npm/dompurify@3.0.9"
    },
    {
      "type": "library",
      "name": "vite",
      "version": "5.4.21",
      "purl": "pkg:npm/vite@5.4.21"
    }
  ]
}
EOF

echo "  ✓ SBOM erfolgreich erstellt unter: $OUTPUT_FILE"
