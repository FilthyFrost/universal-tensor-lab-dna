Original prompt: 现在你继续去做我刚刚提到的需求：需求：不要普通，不要保守，不要小清新参数变体。你要的是疯狂的、非同质化的、每个身体部位都像不同生物突变路线的生成器。

## 2026-05-01 v30 Work Log

- Goal: replace conservative morphology variants with a more extreme, non-homogeneous mutation generator.
- Constraints to preserve: single continuous main manifold, around 3000 faces max, no floating sticker meshes for ears/wings/body identity.
- Planned implementation: amplify head/side/dorsal primitive fields with stronger silhouette ownership and update QA atlas afterward.
- Implemented `applyBodyBlueprint` so chassis DNA now changes actual body silhouette, not just sx/sy/sz scaling.
- Amplified head, side, and dorsal primitive fields for stronger, less homogeneous silhouettes.
- Updated app/docs/package to v30.0.
- QA atlas verification: generated 144 screenshots in `qa-atlas/latest-v30`, browser errors `[]`, face ranges head 2440-2756, side 2440-2532, dorsal 2440-2532, no cases over 3000 faces.
- Visual note: v30 is much more extreme than v29. Mouse-ear AA was adjusted once after inspection because the first pass read too much like a horizontal spike wing.
