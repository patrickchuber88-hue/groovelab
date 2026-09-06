#!/bin/bash
# ==============================================================================
# Campus-Groovelab Software Bill of Materials (SBOM) Generator
# Standard: NIST SP 800-161 / CycloneDX v1.5 Specification
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/generate_cyclonedx_sbom.mjs"
