# Heart asset licence and attribution

## Distributed asset

- **Title:** Realistic Human Heart
- **Author:** neshallads
- **Original source:** [Sketchfab model](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089)
- **Exact licence:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Licence evidence:** Sketchfab's public model metadata identifies "Creative Commons Attribution", links to CC BY 4.0, and states that commercial use is allowed.
- **Distributed path:** `frontend/public/models/heart.glb`
- **Acquisition copy:** `DrMarioNascimento/fisiologia-interativa`, `ra/assets/coracao.glb`, commit `85810feaaf6f4128ef1efee37a0540d572c790ca`. That repository identifies this as the external-view scan by neshallads and publishes SHA-256 `fcb3c1036fe59dfdcc1c30917dbdaa8fbd52c858e6ba3cadaf126b44ccca4b5b`; the downloaded file matches that hash. Its attribution notes document scale/material adjustments for its simulator. The present project does not modify the binary; it renames the file to `heart.glb`.
- **Model structure:** One heart mesh; it does not contain separate LAD, LCX, or RCA nodes.

CC BY 4.0 permits redistribution and adaptation, including commercial use,
provided appropriate credit, the licence link, and any changes are stated.
This project credits the original artist, identifies the mirror used for the
copy, and records the filename change. No endorsement by the artist is
implied.

## Schematic coronary vessels

The LAD, LCX, and RCA overlays are original project-authored
`TubeGeometry`/`CatmullRomCurve3` paths. They are schematic visualization
geometry, not part of the heart asset and not patient-specific lesion maps.
The displayed probabilities are fixed illustrative test values, not live
predictions.

## Required attribution

The same attribution is included beside the distributed GLB in
`frontend/public/models/ATTRIBUTION.md` and linked from the viewer.
