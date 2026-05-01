# Universal Tensor Lab DNA

Single-file Three.js procedural creature generator for low-poly vinyl-toy style monster experiments.

## Current Snapshot

- Version: Universal Tensor Lab v30.0
- Main file: `index.html`
- Runtime: static HTML served over HTTP
- Asset export: GLB zipped in-browser with JSZip and Three.js `GLTFExporter`

## v30 Direction

The generator has moved from conservative parameter variants toward a wild mutation silhouette workflow:

- each metadata state declares a first-read silhouette goal
- each head, side, and dorsal metadata state maps to an explicit morphology primitive
- each chassis code now owns a body silhouette primitive, not just scale values
- head, side, and dorsal primitives use stronger, less homogeneous displacement fields
- head traits own protected front silhouette zones
- side and dorsal traits are clipped behind protected head zones
- procedural patterns are masked away from high-displacement organ tips
- floating ear stickers are avoided; small meshes are reserved for eyes, nostrils, and other necessary markers
- QA atlas pages show the active primitive for each metadata case

## Run Locally

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

## QA Atlas

The QA atlas captures fixed DNA cases for head, side, and dorsal metadata across front, side, and top camera views. It is intended to catch weak silhouettes before hand-tuning formulas.

```bash
npm install
npm run serve
npm run qa:atlas
```

The default output is ignored by git:

```text
qa-atlas/latest/index.html
```

## Backup Scope

This repository intentionally tracks the source snapshot only. Generated smoke-test screenshots, local exported ZIP files, and temporary files are ignored so the project stays easy to diff and roll back.
