set -euo pipefail

ROOT="$(pwd)"
FORMATS_DIR="$ROOT/formats"

formats=(general negotiation presentation logical1on1 brainStorming jobInterview lecture flexible)
locales=(ar da de en es-ES es-MX fr id ja ko ms nl no pt-BR pt-PT sv tr zh-CN zh-TW)

mkdir -p "$FORMATS_DIR"

# registry.json
cat > "$FORMATS_DIR/registry.json" <<'JSON'
{
  "version": 1,
  "defaultLocale": "en",
  "defaultFormatId": "general",
  "locales": ["ar","da","de","en","es-ES","es-MX","fr","id","ja","ko","ms","nl","no","pt-BR","pt-PT","sv","tr","zh-CN","zh-TW"],
  "formats": [
    { "id": "general",        "titleKey": "formats.general",        "schema": "general-json@1",        "deprecated": false },
    { "id": "negotiation",    "titleKey": "formats.negotiation",    "schema": "negotiation-json@1",    "deprecated": false },
    { "id": "presentation",   "titleKey": "formats.presentation",   "schema": "presentation-json@1",   "deprecated": false },
    { "id": "logical1on1",    "titleKey": "formats.logical1on1",    "schema": "oneonone-json@1",       "deprecated": false },
    { "id": "brainStorming",  "titleKey": "formats.brainstorming",  "schema": "brainstorming-json@1",  "deprecated": false },
    { "id": "jobInterview",   "titleKey": "formats.jobInterview",   "schema": "interview-json@1",      "deprecated": false },
    { "id": "lecture",        "titleKey": "formats.lecture",        "schema": "lecture-json@1",        "deprecated": false },
    { "id": "flexible",       "titleKey": "formats.flexible",       "schema": "flexible-json@1",       "deprecated": false }
  ]
}
JSON

# 各フォーマット×各言語のプレースホルダ
for f in "${formats[@]}"; do
  dir="$FORMATS_DIR/$f"
  mkdir -p "$dir"

  case "$f" in
    general)       schema="general-json@1" ;;
    negotiation)   schema="negotiation-json@1" ;;
    presentation)  schema="presentation-json@1" ;;
    logical1on1)   schema="oneonone-json@1" ;;
    brainStorming) schema="brainstorming-json@1" ;;
    jobInterview)  schema="interview-json@1" ;;
    lecture)       schema="lecture-json@1" ;;
    flexible)      schema="flexible-json@1" ;;
    *)             schema="flexible-json@1" ;;
  esac

  for lang in "${locales[@]}"; do
    file="$dir/$lang.json"
    cat > "$file" <<JSON
{
  "formatId": "$f",
  "locale": "$lang",
  "schemaId": "$schema",
  "title": "",
  "prompt": "",
  "notes": ""
}
JSON
  done
done

echo "✅ Done. Created: $FORMATS_DIR/{${formats[*]}}/<locale>.json and registry.json"
