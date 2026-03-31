# Roof diagrams with [raybevel](https://github.com/tylermorganwall/raybevel)

[raybevel](https://github.com/tylermorganwall/raybevel) is an R package that builds **straight skeletons** from 2D polygons—useful for roof-style topology and offset geometry. It is **not** JavaScript; it runs via **R** on your machine (or a server you control).

## Install R + raybevel

1. Install [R](https://www.r-project.org/) so `Rscript` is on your `PATH` (Windows: install R and ensure `Rscript.exe` is discoverable).
2. In R:

```r
install.packages("remotes")
install.packages("jsonlite")
remotes::install_github("tylermorganwall/raybevel")
```

## Dev server integration

With `npm run dev`, the Vite dev server exposes:

`POST /api/raybevel-diagram`

**Body (JSON):**

```json
{
  "ring": [[-93.5, 44.8], [-93.49, 44.8], [-93.49, 44.81], [-93.5, 44.81], [-93.5, 44.8]]
}
```

- `ring`: closed or open ring of `[x, y]` coordinates (typically **longitude, latitude** for small footprints—the skeleton is for **diagram topology**, not survey-grade geodesy).

**Response:** `image/svg+xml` (base R graphics → SVG) or plain-text error if R/raybevel is missing.

Override the R executable with env **`RSCRIPT_PATH`** (e.g. `C:\Program Files\R\R-4.4.0\bin\Rscript.exe`).

## CLI (no Vite)

```bash
echo {"ring":[[0,0],[100,0],[100,60],[0,60],[0,0]]} | Rscript --vanilla generate_diagram.R > diagram.svg
```

## Production

There is **no** R runtime in the static Vite build. For production you would host the same `generate_diagram.R` behind an HTTP service (Plumber, FastAPI that shells to R, etc.) and point the app at that URL (future env hook).

## Credits

Straight skeleton / roof geometry: [tylermorganwall/raybevel](https://github.com/tylermorganwall/raybevel) — see that repository for license and citation.
