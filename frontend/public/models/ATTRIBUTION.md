# Model attribution

**Realistic Human Heart** by **neshallads**, originally published on
[Sketchfab](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089),
under the [Creative Commons Attribution 4.0 International licence
(CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

The GLB copy was acquired from
[DrMarioNascimento/fisiologia-interativa](https://github.com/DrMarioNascimento/fisiologia-interativa/blob/85810feaaf6f4128ef1efee37a0540d572c790ca/ra/assets/coracao.glb),
which attributes the external-view scan to neshallads. That project's
attribution notes describe scale and material adjustments for its simulator;
those upstream changes are present in the copy distributed here. This project
renamed the file to `heart.glb` and optimised it with glTF-Transform
(`optimize --compress meshopt --texture-compress webp --texture-size 1024`),
which compresses the geometry and textures (3.26 MB to 0.36 MB) without
changing the artwork. No endorsement by the original artist is implied.

The separately rendered left main, LAD, LCX, and RCA paths are schematic
geometry authored for this project, placed on the model's surface along the
typical anatomical grooves. Their fixed test probabilities are illustrative,
not live predictions, and the paths are not patient-specific lesion maps.
