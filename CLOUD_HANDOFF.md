# Cloud Handoff

This repository is the cloud checkpoint for Universal Tensor Lab.

## Open This Repo

- Repository: https://github.com/FilthyFrost/universal-tensor-lab-dna
- Branch: `main`
- App entry: `index.html`
- Current checkpoint: `v29.0`

## Important Context

`v29.0` is a checkpoint, not the final visual direction. The latest user feedback is that the generator became too ordinary and too conservative. The next iteration should push back toward extreme, weird, high-contrast mutations.

Primary product goal:

- Every metadata option should read as a completely different body part.
- The generated creatures should feel like cute vinyl toys, but the mutations can be strange, exaggerated, and funny.
- Extreme combinations are allowed to look weird. The game fantasy is mutation breeding.

Hard technical constraints:

- Keep the main creature as a single continuous manifold.
- Do not use large mesh splicing for ears, wings, horns, trunks, or dorsal parts.
- Small mesh additions are acceptable only for eyes, nostrils, teeth, and truly necessary markers.
- Keep the generated model around 3000 faces or lower.
- Avoid floating stickers for ear or wing identity.

## Current Implementation Notes

- `index.html` contains the Three.js generator.
- `HEAD_PRIMITIVES`, `SIDE_PRIMITIVES`, and `DORSAL_PRIMITIVES` map DNA metadata to visual primitive families.
- `HEAD_CONTRACTS` describes first-read silhouette goals.
- `tools/qa-atlas.mjs` generates the fixed screenshot atlas.
- Generated atlas output is ignored by git under `qa-atlas/`.

## Local Run

```bash
python3 -m http.server 5173
```

Open:

```text
http://localhost:5173/
```

## QA Atlas

```bash
npm install
npm run serve
npm run qa:atlas
```

Atlas output:

```text
qa-atlas/latest/index.html
```

## Recommended Next Task

Implement `v30 Wild Mutation Silhouette Engine`.

Do not make the generator more normalized. Instead:

- amplify each metadata option into a distinct silhouette class
- give head, side, and dorsal mutations stronger spatial ownership
- make side and dorsal mutations visibly different even in front, side, and top views
- preserve the single-manifold constraint by pushing vertices through masks and primitive fields
- keep pattern color away from identity-critical organ tips
- use the QA atlas after every substantial formula change

The user specifically wants: "completely different, non-homogeneous, special, mutant, interesting, crazy".
