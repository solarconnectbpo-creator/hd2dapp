# Roof knowledge base (training figures)

This document pairs the **five ordered reference images** with the rules encoded in the app: trace overlays (`MATERIAL_THEMES` / `patched-roof-layer`), material takeoff waste (`roofLogicEngine`), and **roof system analysis** (`analyzeRoofMaterialSystem` + `roofMaterialKnowledgeBase`).

Place image files in **`assets/roof-knowledge/`** using the filenames below (see `assets/roof-knowledge/README.md`).

---

## Figure 1 — Gable roof blueprint (standard construction)

**Concept:** Baseline **gable** geometry: two planes meeting at a **ridge**, lower horizontal **eaves**, sloping **rakes** on the ends.

**App behavior:**

- Traced perimeter follows the roof outline; material map tint follows the selected **MATERIAL_THEMES** color.
- **Shingle / metal waste:** simple gable-style framing uses a **lower base waste** (~**10%**) vs hip/valley layouts.

---

## Figure 2 — Hip roof transition (complex geometry)

**Concept:** **Hips** and **valleys** add cut-up; waste increases vs a simple gable.

**App behavior:**

- When roof form implies **hip**, **valley**, or **complex** geometry, **shingle** waste moves toward **~15%** (see `classifyRoofAndMaterials`).
- Reports reference this figure in **geometry waste** notes and **knowledge base** alerts.

---

## Figure 3 — Heavyweight shingle vs tile (weight alert)

**Concept:** **Asphalt shingle** dead load (~**240 lbs/sq**, 1-layer planning) vs **clay/concrete tile** (~**1000 lbs/sq**).

**App behavior:**

- `structuralLoadLbsPerSq` in **roof system analysis** uses planning values from `roofMaterialKnowledgeBase`.
- **Tile** selections surface a **weight alert** in reports.

---

## Figure 4 — Natural slate (specialty & high waste)

**Concept:** Steep pitches, **20–25%** waste planning, **~1000 lbs/sq**, specialty fasteners and underlayment.

**App behavior:**

- Slate waste factor **1.25** (25%); reports include **specialty install** alerts and figure references.

---

## Figure 5 — TPO low-slope (membrane logic)

**Concept:** **~50 lbs/sq** membrane planning, **~5%** waste vs bundles; **rolls**, **seams** (heat-weld / adhered), **adhesive / ISO** assembly — not shingle counts.

**App behavior:**

- TPO waste **1.05** (5%); **membrane system** alerts in analysis; map theme uses reflective white fill.

---

## File checklist

| Order | Filename | Topic |
|------:|----------|--------|
| 1 | `01-gable-blueprint.png` | Gable ridge / eave / rake |
| 2 | `02-hip-transition.png` | Hip/valley complexity & waste |
| 3 | `03-shingle-vs-tile-weight.png` | Dead load comparison |
| 4 | `04-slate-specialty.png` | Slate specialty & waste |
| 5 | `05-tpo-membrane.png` | TPO membrane & seams |

These are **training / documentation** assets; the running app does not require them at build time.
