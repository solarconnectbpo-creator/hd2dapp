#!/usr/bin/env Rscript
# Reads JSON from stdin: { "ring": [[x,y], ...] } (closed or open ring).
# Writes SVG (straight skeleton via raybevel) to stdout. Errors → stderr, exit 1.

suppressPackageStartupMessages({
  ok_json <- requireNamespace("jsonlite", quietly = TRUE)
  ok_rb <- requireNamespace("raybevel", quietly = TRUE)
})
if (!ok_json) {
  cat("Missing jsonlite. In R: install.packages('jsonlite')\n", file = stderr())
  quit(status = 1)
}
if (!ok_rb) {
  cat("Missing raybevel. See roof-diagram-raybevel/README.md\n", file = stderr())
  quit(status = 1)
}

raw <- paste(readLines(file("stdin"), warn = FALSE), collapse = "\n")
if (!nzchar(trimws(raw))) {
  cat("Empty stdin; expected JSON with a 'ring' array\n", file = stderr())
  quit(status = 1)
}

j <- jsonlite::fromJSON(raw, simplifyVector = FALSE)
ring <- j$ring
if (is.null(ring)) {
  cat("JSON must contain 'ring': [[x,y], ...]\n", file = stderr())
  quit(status = 1)
}

m <- tryCatch(
  matrix(as.numeric(unlist(ring)), ncol = 2, byrow = TRUE),
  error = function(e) {
    cat("Invalid ring: ", conditionMessage(e), "\n", sep = "", file = stderr())
    quit(status = 1)
  }
)

if (anyNA(m)) {
  cat("Ring contains non-numeric values\n", file = stderr())
  quit(status = 1)
}
if (nrow(m) < 3L) {
  cat("Ring needs at least 3 vertices\n", file = stderr())
  quit(status = 1)
}

# Close ring if needed
if (m[1, 1] != m[nrow(m), 1] || m[1, 2] != m[nrow(m), 2]) {
  m <- rbind(m, m[1, , drop = FALSE])
}

sk <- tryCatch(
  raybevel::skeletonize(m),
  error = function(e) {
    cat("skeletonize failed: ", conditionMessage(e), "\n", sep = "", file = stderr())
    quit(status = 1)
  }
)

tmp <- tempfile(fileext = ".svg")
grDevices::svg(tmp, width = 6.8, height = 3.9, pointsize = 11)
graphics::par(mai = rep(0.08, 4))
tryCatch(
  {
    raybevel::plot_skeleton(sk, arrow_color = "gray35", polygon_color = "gray55")
    graphics::title(
      main = "Straight skeleton (raybevel) — roof footprint",
      cex.main = 0.85,
      line = -1.2,
      col.main = "gray25"
    )
  },
  finally = grDevices::dev.off()
)

out <- readChar(tmp, nchars = file.info(tmp)$size)
unlink(tmp)
cat(out)
