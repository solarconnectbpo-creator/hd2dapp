#!/usr/bin/env python3
"""Build the Naperville HOA damage discovery proposal v2 with annotated photo exhibits."""
import html as htmllib
import json

LOGO = open("/tmp/cox_logo_datauri.txt").read().strip()

# Each exhibit: letter, title, meta, notes (list), marks (list of dicts x,y,rx,ry,label)
# x/y/rx/ry are percentages of the photo frame. aspect = width/height hint for the slot.
EXHIBITS = [
    dict(letter="A", group="Aerial survey", title="Nadir drone view — Building 1 (crew on site)",
         meta="Drone ortho · inspection crew + ladder staged at street",
         aspect="4/3",
         notes=[
             "Twelve-plus soft-metal box vents across ridges — primary hail test surfaces (circled clusters).",
             "Multi-tonal granule discoloration scattered across south- and west-facing slopes — flag tonal breaks along ridge and rake lines for wind-lift (broken seal) verification on the roof walk.",
             "Establishes formal inspection: ladder and crew visible at the drive.",
         ],
         marks=[dict(x=36, y=38, rx=14, ry=8, label="1"),
                dict(x=63, y=42, rx=13, ry=8, label="2"),
                dict(x=71, y=17, rx=8, ry=6, label="3")]),
    dict(letter="B", group="Aerial survey", title="Nadir drone view — Building 2",
         meta="Drone ortho · H-plan roof, paired ridge vent rows",
         aspect="4/3",
         notes=[
             "Box vents along both ridge lines (circled) — each lid and flange to be checked for strikes.",
             "Field granule displacement visible at drone altitude on the center slope.",
         ],
         marks=[dict(x=33, y=32, rx=11, ry=8, label="1"),
                dict(x=62, y=50, rx=12, ry=8, label="2")]),
    dict(letter="C", group="Aerial survey", title="Nadir drone view — Building 3 (complex geometry)",
         meta="Drone ortho · multi-hip/valley roof, highest penetration count",
         aspect="4/3",
         notes=[
             "Valley convergence zones (circled) concentrate runoff over impacted shingle field.",
             "Twenty-plus penetrations; every flange is a leak path if sealant was impacted.",
         ],
         marks=[dict(x=52, y=36, rx=12, ry=10, label="1"),
                dict(x=30, y=52, rx=11, ry=8, label="2"),
                dict(x=72, y=60, rx=10, ry=8, label="3")]),
    dict(letter="D", group="Aerial survey", title="Nadir drone view — Building 4 (entry canopy)",
         meta="Drone ortho · vents plus soft-metal entry canopy",
         aspect="4/3",
         notes=[
             "Vent field circled; entry canopy between drives is an additional soft-metal witness surface.",
             "Same shingle blend and exposure as Buildings 1–3 — common-element scope.",
         ],
         marks=[dict(x=42, y=38, rx=13, ry=9, label="1"),
                dict(x=49, y=66, rx=9, ry=6, label="2")]),
    dict(letter="E", group="Roof detail", title="Valley with heat cables and debris",
         meta="Roof-level · de-icing cable array at valley/eave",
         aspect="4/3",
         notes=[
             "Crossed heat cables with dozens of clip penetrations through shingle field (circle 1).",
             "Debris mats trapped on cables — drainage dam and moisture trap (circle 2).",
             "Documented as separate corrective scope so restored roof does not inherit the leak pattern.",
         ],
         marks=[dict(x=38, y=42, rx=18, ry=13, label="1"),
                dict(x=63, y=38, rx=10, ry=10, label="2")]),
    dict(letter="F", group="Roof detail", title="Attic box vent — close-up",
         meta="Roof-level · galvanized vent lid and flange",
         aspect="4/3",
         notes=[
             "Circular indentations on the soft-metal lid top face (circle 1) — classic hail witness marks.",
             "Mastic-smeared flange fasteners (circle 2) show prior service; granule scour at flange edge.",
         ],
         marks=[dict(x=50, y=22, rx=13, ry=9, label="1"),
                dict(x=50, y=52, rx=12, ry=6, label="2")]),
    dict(letter="G", group="Roof detail", title="Paired box vents at ridge",
         meta="Roof-level · two vents, drone shadow in frame",
         aspect="4/3",
         notes=[
             "Both vent lids circled for adjuster dent verification — soft metal deforms at hail sizes that bruise shingles.",
             "Scattered granule-loss points in the field between the vents.",
         ],
         marks=[dict(x=17, y=25, rx=11, ry=9, label="1"),
                dict(x=82, y=22, rx=11, ry=9, label="2"),
                dict(x=50, y=60, rx=13, ry=9, label="3")]),
    dict(letter="H", group="Shingle field", title="Shingle close-up — wind crease + bruising",
         meta="Test-square candidate · laminate field",
         aspect="4/3",
         notes=[
             "WIND: diagonal crease line across the laminate tab right of center (circle 1) — the signature of a wind-lifted shingle that folded back and re-set; the seal strip is broken even though the tab lies flat.",
             "Circular granule displacement exposing black asphalt mat (circles 2–3) — the industry definition of hail bruising.",
             "Impact points sit mid-tab, not at edges — storm pattern rather than foot scuffing.",
         ],
         marks=[dict(x=58, y=38, rx=10, ry=9, label="1"),
                dict(x=64, y=26, rx=6, ry=5, label="2"),
                dict(x=30, y=64, rx=6, ry=5, label="3")]),
    dict(letter="I", group="Shingle field", title="Shingle field — angled frame 1",
         meta="Test-square candidate · random-pattern granule loss",
         aspect="4/3",
         notes=[
             "Random-distribution dark spots across tabs (circles) — consistent with hail, not mechanical wear paths.",
             "Density supports slope-level functional damage evaluation.",
         ],
         marks=[dict(x=40, y=34, rx=7, ry=6, label="1"),
                dict(x=66, y=56, rx=7, ry=6, label="2")]),
    dict(letter="J", group="Shingle field", title="Shingle field — angled frame 2 (density backup)",
         meta="Backup frame for bruise-density count",
         aspect="4/3",
         notes=[
             "Second frame of the same slope for impact-density counting during the adjuster test square.",
             "Bright fracture points (circled) indicate recent granule loss — substrate not yet UV-darkened.",
         ],
         marks=[dict(x=52, y=40, rx=7, ry=6, label="1"),
                dict(x=28, y=62, rx=7, ry=6, label="2")]),
    dict(letter="K", group="Shingle field", title="Shingle field at vent flange",
         meta="Roof-level · penetration corner in frame",
         aspect="4/3",
         notes=[
             "Fresh bright granule-loss points adjacent to the penetration (circle 1).",
             "Vent flange corner (circle 2) — impacts at flanges compromise the seal line.",
         ],
         marks=[dict(x=74, y=42, rx=8, ry=7, label="1"),
                dict(x=7, y=8, rx=7, ry=7, label="2")]),
    dict(letter="L", group="Shingle field", title="Distinct impact strike — close-up",
         meta="Roof-level · drone shadow in frame",
         aspect="4/3",
         notes=[
             "Single distinct dark strike with mat bruise at center frame (circle) — flagship bruise photo for the claim file.",
         ],
         marks=[dict(x=44, y=48, rx=8, ry=7, label="1")]),
    dict(letter="M", group="Elevations — wind-blown shingles", title="Front elevation — unit 456",
         meta="GPS 41.7392° N, 88.1183° W · 8/14/2026 2:42 PM",
         aspect="4/3",
         notes=[
             "WIND: gable roofline above the second story (circle 1) — wind-blown/lifted shingle tabs and broken seal lines sighted from grade along the rake and ridge; flag for ladder verification during the adjuster walk.",
             "Establishes subject unit 456 Timber Trail Ct (job #5467, insurance type).",
             "Metal pent roof over garage (circle 2) and neighbor gable roofline (circle 3) are matching witness surfaces across units.",
         ],
         marks=[dict(x=44, y=11, rx=15, ry=7, label="1"),
                dict(x=48, y=52, rx=17, ry=6, label="2"),
                dict(x=82, y=16, rx=11, ry=6, label="3")]),
    dict(letter="N", group="Elevations — wind-blown shingles", title="Side elevation — unit 463",
         meta="GPS 41.7391° N, 88.1183° W · 8/14/2026 2:46 PM",
         aspect="3/4",
         notes=[
             "WIND: rake edge and gable roofline (circle 1) — wind-exposure edge where blown/lifted shingles start; the side elevations take the direct wind fetch between buildings.",
             "Full-height white downspout run (circle 2) — leads directly to the impact damage in Exhibits O and Q.",
             "Gutter and fascia line at the gable to be sighted for dings during the adjuster walk.",
         ],
         marks=[dict(x=55, y=14, rx=16, ry=6, label="1"),
                dict(x=60, y=40, rx=7, ry=20, label="2")]),
    dict(letter="O", group="Soft-metal collateral", title="Downspout impact damage — brick corner",
         meta="GPS 41.7391° N, 88.1182° W · 8/14/2026 2:46 PM",
         aspect="3/4",
         notes=[
             "Key exhibit. Mid-span dents with finish scuffed to bare metal (circle 1) — impact energy on a vertical surface indicates wind-driven hail vector.",
             "Secondary crimp deformation at lower elbow (circle 2).",
             "Bright exposed substrate = recent damage, not aged oxidation.",
         ],
         marks=[dict(x=46, y=42, rx=11, ry=12, label="1"),
                dict(x=42, y=70, rx=10, ry=7, label="2")]),
    dict(letter="P", group="Soft-metal collateral", title="Rear corner elevation — condenser and leader",
         meta="GPS 41.7391° N, 88.1180° W · 8/14/2026 2:46 PM",
         aspect="3/4",
         notes=[
             "Lennox condenser fin packs (circle 1) — verify crush patches; hail flattens fins in discrete zones.",
             "Upper downspout section (circle 2) continues the collateral chain from ground to eave.",
         ],
         marks=[dict(x=24, y=86, rx=13, ry=8, label="1"),
                dict(x=64, y=30, rx=6, ry=16, label="2")]),
    dict(letter="Q", group="Soft-metal collateral", title="Downspout dent cluster — close-up",
         meta="GPS 41.7391° N, 88.1180° W · 8/14/2026 2:46 PM",
         aspect="3/4",
         notes=[
             "Key exhibit. Elongated dent cluster with coating removed to bright metal (circle) — fresh, high-energy impacts.",
             "Pair with Exhibit O in the adjuster walk to anchor storm energy before roof close-ups.",
         ],
         marks=[dict(x=49, y=46, rx=12, ry=14, label="1")]),
    dict(letter="R", group="Elevations — wind-blown shingles", title="Front elevation — unit 463 building",
         meta="GPS 41.7390° N, 88.1183° W · 8/14/2026 2:48 PM",
         aspect="4/3",
         notes=[
             "WIND: left gable roofline (circle 1) and right gable roofline (circle 2) — wind-blown/lifted shingles along both rakes visible from the elevation; the paired gables channel gusts across the field tabs.",
             "Metal pent roofs over both garages (circles 3–4) — repeat soft-metal surfaces across units confirm association-wide exposure.",
         ],
         marks=[dict(x=26, y=12, rx=14, ry=7, label="1"),
                dict(x=79, y=15, rx=12, ry=7, label="2"),
                dict(x=22, y=50, rx=16, ry=6, label="3"),
                dict(x=88, y=52, rx=10, ry=5, label="4")]),
    dict(letter="S", group="Openings", title="Window screen — puncture line",
         meta="GPS 41.7393° N, 88.1187° W · 8/14/2026 2:50 PM",
         aspect="3/4",
         notes=[
             "Three clustered mesh tears in a horizontal line (circle) — high-velocity debris/hail perforation, not vandalism.",
             "Same-afternoon timestamp ties opening damage to the roof and soft-metal findings.",
         ],
         marks=[dict(x=52, y=57, rx=17, ry=6, label="1")]),
    dict(letter="T", group="Openings", title="Window screen — abrasion zone",
         meta="GPS 41.7393° N, 88.1187° W · 8/14/2026 2:50 PM",
         aspect="3/4",
         notes=[
             "Abraded mesh zone with pin punctures and splatter pattern upper-right (circle) — impact residue on the opening face.",
         ],
         marks=[dict(x=66, y=34, rx=16, ry=16, label="1")]),
]


def esc(s):
    return htmllib.escape(s, quote=True)


def marks_svg(marks):
    out = []
    for m in marks:
        out.append(
            f'<g class="mark" data-x="{m["x"]}" data-y="{m["y"]}">'
            f'<ellipse cx="{m["x"]}" cy="{m["y"]}" rx="{m["rx"]}" ry="{m["ry"]}" />'
            f'<text x="{min(m["x"] + m["rx"] + 2, 96)}" y="{max(m["y"] - m["ry"] - 2, 5)}">{m["label"]}</text>'
            f"</g>"
        )
    return "".join(out)


def exhibit_html(e):
    notes = "".join(f"<li>{n}</li>" for n in e["notes"])
    return f"""
      <section class="exhibit" id="exhibit-{e['letter']}">
        <div class="ex-head">
          <p class="tag">Exhibit {e['letter']} · {esc(e['group'])}</p>
          <h4>{esc(e['title'])}</h4>
          <p class="ex-meta">{esc(e['meta'])}</p>
        </div>
        <div class="photo-slot" data-aspect="{e['aspect']}" style="aspect-ratio:{e['aspect']}">
          <img alt="Exhibit {e['letter']} photo" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">{marks_svg(e['marks'])}</svg>
          <label class="drop">
            <input type="file" accept="image/*" />
            <span><strong>Tap to add Exhibit {e['letter']} photo</strong><br />circles &amp; notes overlay automatically</span>
          </label>
        </div>
        <ul class="ex-notes">{notes}</ul>
      </section>"""


exhibits_markup = "".join(exhibit_html(e) for e in EXHIBITS)

HTML = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HOA Damage Discovery Proposal — 456 Timber Trail Ct, Naperville, IL 60565</title>
  <style>
    :root {{
      --ink: #12171f; --muted: #5b6573; --line: #d5dbe3; --paper: #f7f5f1;
      --card: #ffffff; --accent: #8b1e1e; --accent-soft: #f3e6e4; --slate: #243447;
      --circle: #e11d1d;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; color: var(--ink);
      background:
        radial-gradient(1200px 500px at 10% -10%, #e8eef5 0%, transparent 55%),
        radial-gradient(900px 400px at 100% 0%, #f0e6df 0%, transparent 45%),
        var(--paper);
      font-family: "Source Serif 4", "Iowan Old Style", Palatino, Georgia, serif;
      line-height: 1.55;
    }}
    .page {{ max-width: 900px; margin: 0 auto; padding: 28px 20px 64px; }}
    .toolbar {{
      position: sticky; top: 0; z-index: 20; display: flex; gap: 10px; flex-wrap: wrap;
      align-items: center; justify-content: space-between; padding: 10px 12px; margin: 0 0 18px;
      background: rgba(247,245,241,0.94); backdrop-filter: blur(8px);
      border: 1px solid var(--line); border-radius: 10px;
    }}
    .toolbar p {{ margin: 0; font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.78rem; color: var(--muted); max-width: 46ch; }}
    .toolbar .actions {{ display: flex; gap: 8px; flex-wrap: wrap; }}
    button, .btn {{
      font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.82rem; font-weight: 650;
      border: 1px solid var(--ink); background: var(--ink); color: #fff; border-radius: 8px;
      padding: 8px 12px; cursor: pointer; text-decoration: none;
    }}
    .btn.secondary, button.secondary {{ background: transparent; color: var(--ink); }}
    .sheet {{
      background: var(--card); border: 1px solid var(--line);
      box-shadow: 0 18px 40px rgba(18,23,31,0.08); border-radius: 4px; overflow: hidden;
    }}
    .cover {{
      padding: 42px 42px 34px; color: #f8fafc;
      background: linear-gradient(135deg, rgba(36,52,71,0.96), rgba(18,23,31,0.92)),
        repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.02) 8px, rgba(255,255,255,0.02) 16px);
    }}
    .brandline {{ display: flex; align-items: center; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }}
    .brandline img {{ width: 118px; height: auto; border-radius: 10px; background: #fff; padding: 6px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }}
    .brandline div {{ font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    .brandline strong {{ display: block; font-size: 0.98rem; letter-spacing: 0.02em; }}
    .brandline span {{ display: block; font-size: 0.72rem; color: #c9d4e1; letter-spacing: 0.14em; text-transform: uppercase; }}
    .brandline .contact {{ font-size: 0.74rem; color: #9fb0c3; letter-spacing: 0.02em; text-transform: none; margin-top: 3px; }}
    .cover .eyebrow {{ margin: 0 0 12px; font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: #c9d4e1; }}
    .cover h1 {{ margin: 0; font-size: clamp(1.8rem, 4vw, 2.55rem); line-height: 1.12; letter-spacing: -0.03em; max-width: 16ch; }}
    .cover .lede {{ margin: 16px 0 0; max-width: 50ch; font-size: 1.05rem; color: #d7e0ea; }}
    .meta-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin-top: 28px; font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    .meta-grid div {{ border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; padding: 10px 12px; background: rgba(255,255,255,0.04); }}
    .meta-grid span {{ display: block; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: #9fb0c3; margin-bottom: 4px; }}
    .meta-grid strong {{ font-size: 0.92rem; font-weight: 650; color: #fff; }}
    .body {{ padding: 34px 42px 46px; }}
    h2 {{ margin: 34px 0 12px; font-size: 1.35rem; letter-spacing: -0.02em; color: var(--slate); }}
    h2:first-child {{ margin-top: 0; }}
    h3 {{ margin: 22px 0 8px; font-size: 1.02rem; font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    p {{ margin: 0 0 12px; }}
    .muted {{ color: var(--muted); }}
    .sans {{ font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    .ask {{ border-left: 5px solid var(--accent); background: var(--accent-soft); padding: 16px 18px; margin: 8px 0 22px; }}
    .ask strong {{ display: block; font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }}
    .stats {{ display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 18px 0 8px; font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    .stat {{ border: 1px solid var(--line); border-radius: 10px; padding: 14px 12px; background: #fbfbfa; }}
    .stat .n {{ display: block; font-size: 1.45rem; font-weight: 700; letter-spacing: -0.03em; color: var(--slate); line-height: 1.1; }}
    .stat .l {{ display: block; margin-top: 4px; font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }}
    .pill-row {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 18px; }}
    .pill {{ font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.75rem; font-weight: 650; border-radius: 999px; padding: 6px 10px; border: 1px solid #c9b2ae; background: #fff; color: var(--accent); }}
    table {{ width: 100%; border-collapse: collapse; margin: 10px 0 18px; font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.86rem; }}
    th, td {{ border-bottom: 1px solid var(--line); text-align: left; padding: 10px 8px; vertical-align: top; }}
    th {{ font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 650; }}
    .sev {{ display: inline-block; min-width: 2.2rem; text-align: center; font-weight: 700; border-radius: 6px; padding: 2px 6px; background: #f1e0de; color: var(--accent); }}
    .motion {{ border: 2px solid var(--slate); border-radius: 12px; padding: 18px 18px 14px; background: linear-gradient(180deg,#f8fafc,#fff); margin: 14px 0 8px; }}
    .motion .label {{ font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--slate); font-weight: 700; margin: 0 0 8px; }}
    .checklist {{ list-style: none; padding: 0; margin: 10px 0 0; font-family: "IBM Plex Sans","Segoe UI",sans-serif; }}
    .checklist li {{ display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 0.92rem; }}
    .checklist li::before {{ content: ""; width: 18px; height: 18px; margin-top: 2px; border: 2px solid var(--slate); border-radius: 4px; background: #fff; }}
    .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 12px 0; }}
    .card {{ border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: #fbfbfa; }}
    .card h3 {{ margin-top: 0; }}
    .footnote {{ margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--line); font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.76rem; color: var(--muted); }}

    /* ---------- Exhibit slots ---------- */
    .exhibits {{ display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 14px; }}
    .exhibit {{ border: 1px solid var(--line); border-radius: 12px; padding: 16px 16px 14px; background: #fff; break-inside: avoid; }}
    .exhibit .tag {{ font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); margin: 0 0 4px; }}
    .exhibit h4 {{ margin: 0 0 2px; font-size: 1.02rem; letter-spacing: -0.015em; }}
    .ex-meta {{ margin: 0 0 10px; font-family: "IBM Plex Sans","Segoe UI",sans-serif; font-size: 0.76rem; color: var(--muted); }}
    .ex-notes {{ margin: 10px 0 0; padding-left: 1.15rem; font-size: 0.92rem; }}
    .ex-notes li {{ margin: 0 0 4px; }}
    .photo-slot {{
      position: relative; width: 100%; border-radius: 10px; overflow: hidden;
      background: #f2f0ec; border: 1.5px dashed #b9c0ca;
    }}
    .photo-slot img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: none; }}
    .photo-slot svg {{ position: absolute; inset: 0; width: 100%; height: 100%; display: none; pointer-events: none; }}
    .photo-slot svg ellipse {{ fill: none; stroke: var(--circle); stroke-width: 1.1; vector-effect: non-scaling-stroke; stroke-width: 3px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.55)); }}
    .photo-slot svg text {{ fill: #fff; font: 700 6px "IBM Plex Sans","Segoe UI",sans-serif; paint-order: stroke; stroke: var(--circle); stroke-width: 2px; }}
    .photo-slot .drop {{
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      text-align: center; cursor: pointer; font-family: "IBM Plex Sans","Segoe UI",sans-serif;
      font-size: 0.82rem; color: var(--muted); padding: 12px;
    }}
    .photo-slot .drop input {{ display: none; }}
    .photo-slot.has-photo {{ border-style: solid; border-color: var(--line); }}
    .photo-slot.has-photo img, .photo-slot.has-photo svg {{ display: block; }}
    .photo-slot.has-photo .drop {{ opacity: 0; }}
    .photo-slot.has-photo .drop:active {{ opacity: 0.6; background: rgba(255,255,255,0.5); }}

    @media (max-width: 720px) {{
      .cover, .body {{ padding: 24px 18px; }}
      .stats, .meta-grid, .two-col {{ grid-template-columns: 1fr 1fr; }}
    }}
    @media print {{
      body {{ background: #fff; }}
      .toolbar {{ display: none; }}
      .page {{ padding: 0; max-width: none; }}
      .sheet {{ box-shadow: none; border: none; }}
      .cover, .ask, .stat, .pill, .motion, .card, .exhibit {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
      h2, .exhibit, .motion {{ break-inside: avoid; }}
      /* Slots without a photo collapse to the notation card */
      .photo-slot:not(.has-photo) {{ aspect-ratio: auto !important; border: none; background: none; height: 0; }}
      .photo-slot:not(.has-photo) .drop {{ display: none; }}
      .photo-slot.has-photo svg ellipse {{ stroke-width: 3px; }}
    }}
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <p><strong>Add the 20 survey photos</strong> (in exhibit order A–T), then Print → Save as PDF. Red circles &amp; numbered notes overlay each photo automatically. Tap a loaded photo to replace it.</p>
      <div class="actions">
        <label class="btn" style="display:inline-block">
          Add all photos
          <input id="bulk" type="file" accept="image/*" multiple style="display:none" />
        </label>
        <button type="button" onclick="window.print()">Print / Save PDF</button>
      </div>
    </div>

    <article class="sheet">
      <header class="cover">
        <div class="brandline">
          <img src="{LOGO}" alt="Cox Roofing — Your Roof, Our Legacy" />
          <div>
            <strong>Cox Roofing &amp; Restoration LLC</strong>
            <span>Storm damage discovery · claim support</span>
            <span class="contact">700 Commerce Dr, Suite 500, Oak Brook, IL 60523 · (877) 816-4245 · COXROOF.COM</span>
          </div>
        </div>
        <p class="eyebrow">Confidential · Board of Directors packet · Rev. 2 with annotated photo exhibits</p>
        <h1>Storm Damage Discovery Proposal</h1>
        <p class="lede">
          Twenty annotated photo exhibits documenting hail and wind impact across roofing, soft metal,
          HVAC, and exterior openings — with a clear recommendation to authorize an insurance claim.
        </p>
        <div class="meta-grid">
          <div><span>Property</span><strong>456 Timber Trail Ct, Naperville, IL 60565</strong></div>
          <div><span>Job reference</span><strong>#5467 · Insurance · Owner contact: Michale Forsberg</strong></div>
          <div><span>Inspection date</span><strong>August 14, 2026 · 2:42–2:50 PM (GPS-stamped)</strong></div>
          <div><span>Field GPS</span><strong>41.739° N, 88.118° W · DuPage County</strong></div>
        </div>
      </header>

      <div class="body">
        <div class="ask">
          <strong>Board ask — one sentence</strong>
          Authorize the Association to file a property insurance claim for sudden storm damage documented in
          Exhibits A–T and retain claim-support advocacy so reserves are not spent on a covered loss.
        </div>

        <div class="stats">
          <div class="stat"><span class="n">20</span><span class="l">Annotated exhibits</span></div>
          <div class="stat"><span class="n">4</span><span class="l">Damage systems</span></div>
          <div class="stat"><span class="n">5/5</span><span class="l">Peak severity</span></div>
          <div class="stat"><span class="n">8/14</span><span class="l">GPS-stamped survey</span></div>
        </div>

        <div class="pill-row">
          <span class="pill">Wind-blown / creased shingles</span>
          <span class="pill">Hail bruising / granule loss</span>
          <span class="pill">Downspout impact dents</span>
          <span class="pill">Vent lid strikes</span>
          <span class="pill">Window screen punctures</span>
          <span class="pill">HVAC fin check</span>
          <span class="pill">Heat-cable penetrations</span>
        </div>

        <h2>1. Why this matters to the Board</h2>
        <p>
          This association's roofs are a shared capital asset. The survey shows
          <em>sudden, accidental, weather-related impact</em> — not ordinary aging alone. Soft-metal
          "collateral" evidence (vent lids, downspouts, garage pent roofs, screens) is the same class of
          proof insurance adjusters use to corroborate hail energy on the shingle field. Every circled
          finding in Exhibits A–T maps to a numbered notation for the adjuster walk.
        </p>
        <div class="two-col sans">
          <div class="card">
            <h3>If the Board files promptly</h3>
            <p class="muted" style="margin:0">Carrier evaluation proceeds while evidence is fresh, unit owners see fiduciary action, and covered restoration protects reserves.</p>
          </div>
          <div class="card">
            <h3>If the Board waits</h3>
            <p class="muted" style="margin:0">Bruised shingles lose UV protection at impact points; leaks and interior claims rise; late-notice arguments get easier for a carrier.</p>
          </div>
        </div>

        <h2>2. Executive findings</h2>
        <table>
          <thead><tr><th>System</th><th>Observed condition (exhibits)</th><th>Claim relevance</th><th>Sev.</th></tr></thead>
          <tbody>
            <tr><td>Architectural shingles — wind</td><td>Diagonal wind crease in laminate tab (H); wind-blown/lifted shingles along gable rooflines sighted from elevations (M, N, R)</td><td>Broken seal strips = functional wind damage even where tabs lie flat</td><td><span class="sev">5</span></td></tr>
            <tr><td>Architectural shingles — hail</td><td>Circular granule loss exposing asphalt mat across multiple frames (H–L)</td><td>Functional damage / accelerated failure</td><td><span class="sev">5</span></td></tr>
            <tr><td>Attic box vents</td><td>Lid indentations, flange scour (F, G); 40+ vents across four buildings (A–D)</td><td>Classic soft-metal collateral</td><td><span class="sev">5</span></td></tr>
            <tr><td>Downspouts / gutters</td><td>Dent clusters with coating scuffed to bright metal (O, Q); runs flagged (N, P)</td><td>Vertical-surface impact = wind-driven hail vector</td><td><span class="sev">4</span></td></tr>
            <tr><td>Garage pent roofs</td><td>Soft-metal awnings over garages, both buildings (M, R)</td><td>Persuasive corroboration surfaces</td><td><span class="sev">4</span></td></tr>
            <tr><td>Window screens</td><td>Puncture line + abrasion zone with pinholes (S, T)</td><td>High-velocity debris/hail on openings</td><td><span class="sev">3</span></td></tr>
            <tr><td>Valleys / heat cables</td><td>Crossed cables, clip penetrations, debris dams (E)</td><td>Separate corrective scope — do not let carrier reframe loss as wear</td><td><span class="sev">3</span></td></tr>
          </tbody>
        </table>

        <h2>3. Recommended claim strategy</h2>
        <ol class="sans">
          <li><strong>File now</strong> — notice of loss for hail/wind on common-element roofs and related exterior components.</li>
          <li><strong>Preserve evidence</strong> — keep this packet and original GPS-stamped photos; no non-emergency repairs before carrier acknowledgment.</li>
          <li><strong>Walk soft metal first</strong> — Exhibits O and Q anchor storm energy; then test squares on slopes from Exhibits H–L.</li>
          <li><strong>Scope for RCV</strong> — slope / building-level replacement where bruise density warrants; match materials across elevations.</li>
          <li><strong>Coordinate unit owners</strong> — screens, HVAC, and unit-maintained items per the declaration; Board leads the common-element claim.</li>
        </ol>

        <h2 id="board-motion">4. Suggested Board motion</h2>
        <div class="motion">
          <p class="label">Draft motion for minutes</p>
          <p style="margin:0">
            <strong>Motion:</strong> That the Board of Directors authorize the filing of a property insurance claim
            for storm-related damage documented on August 14, 2026 at the Timber Trail Ct buildings surveyed
            (including units 456 and 463); direct management to notify the carrier; and engage Cox Roofing &amp; Restoration LLC
            to present damage discovery Exhibits A–T, attend the adjuster inspection, and report back with carrier
            findings and recommended restoration scope — with the intent that covered storm damage not be paid
            solely from Association reserves.
          </p>
        </div>
        <ul class="checklist">
          <li>Approve motion &amp; record vote</li>
          <li>Management files notice of loss within carrier timelines</li>
          <li>Deliver this packet with Exhibits A–T to the carrier</li>
          <li>Schedule joint inspection; owners notified of access needs</li>
          <li>Board receives written update after adjuster visit</li>
        </ul>

        <h2>5. Photo exhibits A–T — circled &amp; notated</h2>
        <p class="muted sans">
          Red circles mark wind/hail evidence; numbered notes below each frame explain what is circled and why it
          matters to the claim. Wind-blown shingle callouts are flagged <strong>WIND</strong> on the elevation
          exhibits (M, N, R) and the creased-tab close-up (H). GPS/time stamps are burned into the ground-survey photos.
        </p>
        <div class="exhibits">{exhibits_markup}
        </div>

        <h2>6. Closing recommendation</h2>
        <p>
          The Association has matched proof: bruised shingles <em>plus</em> soft-metal, opening, and mechanical
          collateral — GPS-stamped on the same afternoon. Filing positions the Board as protecting the asset and
          the reserves. Declining to file converts a potentially covered storm event into a self-funded capital project.
        </p>
        <p><strong>Recommended next step today:</strong> adopt the motion in §4, transmit this packet, and calendar the adjuster inspection.</p>

        <p class="footnote">
          Damage discovery packet prepared by Cox Roofing &amp; Restoration LLC · 700 Commerce Dr, Suite 500, Oak Brook, IL 60523 ·
          (877) 816-4245 · COXROOF.COM — a field documentation and board decision aid.
          It does not constitute a public adjusting engagement, legal opinion, engineering certification, or guarantee
          of coverage. Coverage depends on the Association's policy, deductibles, endorsements, and carrier determination.
          Job #5467 · 456 Timber Trail Ct, Naperville, DuPage County, Illinois 60565 · Survey August 14, 2026.
        </p>
      </div>
    </article>
  </div>

  <script>
    (function () {{
      var slots = Array.prototype.slice.call(document.querySelectorAll(".photo-slot"));

      function loadInto(slot, file) {{
        if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
        var reader = new FileReader();
        reader.onload = function (e) {{
          slot.querySelector("img").src = e.target.result;
          slot.classList.add("has-photo");
        }};
        reader.readAsDataURL(file);
      }}

      slots.forEach(function (slot) {{
        slot.querySelector("input[type=file]").addEventListener("change", function () {{
          loadInto(slot, this.files[0]);
        }});
      }});

      document.getElementById("bulk").addEventListener("change", function () {{
        var files = Array.prototype.slice.call(this.files);
        var empty = slots.filter(function (s) {{ return !s.classList.contains("has-photo"); }});
        var targets = empty.length >= files.length ? empty : slots;
        files.forEach(function (f, i) {{ if (targets[i]) loadInto(targets[i], f); }});
      }});
    }})();
  </script>
</body>
</html>
"""

path = "/workspace/deliverables/HOA-Damage-Discovery-Proposal-With-Photos.html"
open(path, "w").write(HTML)
print("wrote", path, len(HTML), "bytes,", len(EXHIBITS), "exhibits")
