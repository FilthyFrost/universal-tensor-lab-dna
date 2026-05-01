# Universal Tensor Lab DNA

Single-file Three.js procedural creature generator for low-poly vinyl-toy style monster experiments.

## Current Snapshot

- Version: Universal Tensor Lab v27.0
- Main file: `index.html`
- Runtime: static HTML served over HTTP
- Asset export: GLB zipped in-browser with JSZip and Three.js `GLTFExporter`

## Run Locally

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

## Backup Scope

This repository intentionally tracks the source snapshot only. Generated smoke-test screenshots, local exported ZIP files, and temporary files are ignored so the project stays easy to diff and roll back.
