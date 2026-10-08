# Heart asset candidates

Research performed on 2026-10-08. The research timebox was capped at 45
minutes. No candidate with verified, independently addressable LAD, LCX, and
RCA meshes was both usable and within the redistribution, size, and tooling
constraints; the approved generic-heart-plus-schematic-vessels fallback is
used.

| Candidate | Source URL | Author | Exact licence | Format and published size | LAD/LCX/RCA independently addressable? | Outcome |
|---|---|---|---|---|---|---|
| BodyParts3D, Release 4.0 | [DBCLS archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) | Kousaku Okubo and DBCLS contributors | The 2013 OBJ headers and Z-Anatomy attribution identify CC BY-SA 2.1 Japan; the current archive page is reported to state CC BY 4.0. This licence discrepancy needs source-level confirmation. | OBJ part archive; no GLB export verified. | Not verified for the three required coronary branches in the source package. | Not selected: licence wording needs reconciliation and the existing environment has no Blender. |
| Z-Anatomy atlas | [Models-of-human-anatomy repository](https://github.com/Z-Anatomy/Models-of-human-anatomy) | Gauthier Kervyn, Marcin Zielinski, and listed contributors; anatomy derives in part from BodyParts3D | CC BY-SA 4.0 for Z-Anatomy content. Its repository also attributes third-party content under other licences, so an individual mesh needs provenance review. | Blender template ZIP, 86,734,957 bytes; Blender scene, not a ready GLB. | Named anatomy parts are represented in the Blender atlas; LAD/LCX/RCA node identities in a distributable GLB were not verified. | Not selected: no Blender installation and no verified target-node GLB within this spike. |
| NIH 3D | [NIH 3D collection](https://3d.nih.gov/) | No specific heart-model author found | No model-specific licence surfaced; the current collection page describes molecular allergy models and their underlying PDB/EMDB/AlphaFold/PubChem sources. | No applicable whole-heart file or size found. | No applicable model found. | No usable whole-heart candidate surfaced on this resource. |
| Cardiac Anatomy: Coronary arteries of the heart | [Sketchfab model metadata](https://api.sketchfab.com/v3/models/00b5f4ec0b984325b453f8df07cd0cb5) | Hannah Newey | CC BY-NC-SA 4.0 | GLB, 97,901,136 bytes; 2,747,730 faces (Sketchfab metadata). | Not verified; the mesh is not usable regardless. | Rejected: non-commercial restriction and over-size/triangle budgets. |
| Coronary Arteries: Blood Supply to Ventricles | [Sketchfab model metadata](https://api.sketchfab.com/v3/models/60e1da3fbef542c6bcf61cdac312ce4f) | eLearning UMCG | CC BY-NC-SA 4.0 | GLB, 5,196,696 bytes; 128,299 faces (Sketchfab metadata). | Not verified from public metadata. | Not selected: no separate LAD/LCX/RCA nodes were verified, and the non-commercial-only terms were not assumed suitable for this release. |
| heart coronary arteries - DACS | [Sketchfab model metadata](https://api.sketchfab.com/v3/models/9320b664c67440fe8c50e32ff66bd42a) | jaimebusquet3 | CC BY 4.0 | GLB, 5,343,588 bytes; 56,506 faces (Sketchfab metadata). | Not verified. The description says it contains a heart with two coronary-artery cross-sections, not three independently addressable vessels. | Not selected: the public Download API returned HTTP 401, so the node structure could not be inspected or acquired in this environment. |
| Realistic Human Heart | [Sketchfab model](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089) | neshallads | CC BY 4.0; Sketchfab metadata states commercial use is allowed. | GLB archive, 7,555,476 bytes and 22,562 faces per Sketchfab metadata. The distributed mirror copy is 3,255,284 bytes and was inspected locally. | No. Inspection found one heart mesh and no separate coronary-artery nodes. | Selected as the licensed generic heart for the approved fallback; the three vessels are project-authored schematic tubes. |

Sketchfab licence labels, archive sizes, and face counts were checked using the
public Sketchfab model API. The Sketchfab Download API returned HTTP 401
without authentication. The selected GLB was obtained from a public,
attributed mirror, and its embedded GLB metadata and SHA-256 were checked
against that source's attribution record. No download permission was inferred
from a "free download" description.
