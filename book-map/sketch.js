// ============================================================
//  THE SHAPE OF MY TASTE
//  A topographic emotional map of reading history.
//
//  Two-layer visualization:
//    AMBIENT  ~800 faint streamlines following the Perlin flow field —
//             creates the topographic texture and makes attractor
//             vortices visible as scenery.
//    BOOKS    One streamline per book, seeded at (year × genre) position,
//             following the same field with data-driven visual properties.
//
//  Data → visual mapping (book layer):
//    year               → x-position  (left = oldest, right = most recent)
//    genre              → y-band + distinct colour
//    rating             → brightness + head glow
//    emotionalIntensity → per-step angle jitter (smooth → choppy)
//    pages              → trail length
//    finished: false    → dashed trail, no head glow
//
//  S = save PNG
// ============================================================

const CFG = {
  noiseScale:    0.0022,
  fieldRes:      14,
  numAmbient:    600,   // faint background streamlines for texture
  ambientSteps:  90,    // steps per ambient line
  ambientAlpha:  9,     // very low opacity — ambient layer is just scenery
  bookStepsMin:  110,   // shortest book line (~80-page books)
  bookStepsMax:  420,   // longest book line (~900-page books)
  bundleLinesMin: 8,    // lines per bundle for short books
  bundleLinesMax: 22,   // lines per bundle for long books
  bundleSpreadMin: 3,   // perpendicular ribbon width (px) for short books
  bundleSpreadMax: 14,  // perpendicular ribbon width (px) for long books
  baseSpeed:     2.1,
  attractRadius: 200,
  turbRadius:    155,
  bookWeight:    1.4,   // slightly thinner — many lines per bundle
};

const BG = { h: 232, s: 70, b: 6 };

// Genres excluded from the visualization (filtered before rendering)
const HIDDEN_GENRES = [];

// ── Genre colours ─────────────────────────────────────────────

const GENRE_COLORS = {
  "Romance":              { h: 330, s: 65, b: 96 },
  "Fantasy Romance":      { h: 315, s: 62, b: 96 },
  "Dark Romance":         { h: 300, s: 68, b: 92 },
  "Paranormal Romance":   { h: 322, s: 64, b: 95 },
  "Contemporary Romance": { h: 342, s: 58, b: 96 },
  "Sci-Fi Romance":       { h: 225, s: 58, b: 95 },

  "Fantasy":              { h: 268, s: 65, b: 95 },
  "Dark Fantasy":         { h: 258, s: 70, b: 90 },
  "Urban Fantasy":        { h: 265, s: 62, b: 93 },
  "Epic Fantasy":         { h: 278, s: 60, b: 94 },
  "High Fantasy":         { h: 268, s: 65, b: 95 },

  "Sci-Fi":               { h: 202, s: 72, b: 96 },
  "Science Fiction":      { h: 202, s: 72, b: 96 },
  "Hard Sci-Fi":          { h: 196, s: 70, b: 95 },
  "Sci-Fi Thriller":      { h: 208, s: 68, b: 93 },
  "Sci-Fi Dystopian":     { h: 214, s: 65, b: 92 },

  "Dark Academia":        { h: 38,  s: 65, b: 82 },

  "Horror":               { h: 245, s: 72, b: 88 },
  "Mystery":              { h: 220, s: 68, b: 90 },
  "Thriller":             { h: 215, s: 70, b: 88 },
  "Literary Fiction":     { h: 195, s: 45, b: 95 },
  "Fiction":              { h: 200, s: 42, b: 94 },
  "Non-Fiction":          { h: 185, s: 55, b: 90 },
  "Biography":            { h: 180, s: 50, b: 90 },
  "History":              { h: 175, s: 52, b: 88 },
  "Philosophy":           { h: 248, s: 55, b: 90 },
  "Poetry":               { h: 285, s: 52, b: 92 },
  "Graphic Novel":        { h: 162, s: 60, b: 86 },
  "default":              { h: 232, s: 48, b: 90 },
};

function getGenreColor(genre) {
  if (!genre) return GENRE_COLORS["default"];
  if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  const g = genre.toLowerCase();
  if (g.includes("sci-fi romance") || g.includes("scifi romance")) return GENRE_COLORS["Sci-Fi Romance"];
  if (g.includes("dark romance"))    return GENRE_COLORS["Dark Romance"];
  if (g.includes("fantasy") && g.includes("romance")) return GENRE_COLORS["Fantasy Romance"];
  if (g.includes("paranormal"))      return GENRE_COLORS["Paranormal Romance"];
  if (g.includes("contemporary") && g.includes("romance")) return GENRE_COLORS["Contemporary Romance"];
  if (g.includes("romance"))         return GENRE_COLORS["Romance"];
  if (g.includes("dark fantasy"))    return GENRE_COLORS["Dark Fantasy"];
  if (g.includes("urban fantasy"))   return GENRE_COLORS["Urban Fantasy"];
  if (g.includes("epic fantasy") || g.includes("high fantasy")) return GENRE_COLORS["Epic Fantasy"];
  if (g.includes("fantasy"))         return GENRE_COLORS["Fantasy"];
  if (g.includes("hard sci-fi"))     return GENRE_COLORS["Hard Sci-Fi"];
  if (g.includes("sci-fi thriller")) return GENRE_COLORS["Sci-Fi Thriller"];
  if (g.includes("dystopian"))       return GENRE_COLORS["Sci-Fi Dystopian"];
  if (g.includes("sci-fi") || g.includes("scifi") || g.includes("science fiction")) return GENRE_COLORS["Sci-Fi"];
  if (g.includes("dark academia"))    return GENRE_COLORS["Dark Academia"];
  if (g.includes("horror"))          return GENRE_COLORS["Horror"];
  if (g.includes("thriller"))        return GENRE_COLORS["Thriller"];
  if (g.includes("mystery"))         return GENRE_COLORS["Mystery"];
  if (g.includes("fiction"))         return GENRE_COLORS["Literary Fiction"];
  return GENRE_COLORS["default"];
}


function getGenreFamily(genre) {
  const g = (genre || "").toLowerCase();
  if (g.includes("romance"))                                     return "Romance";
  if (g.includes("dark fantasy"))                                return "Dark Fantasy";
  if (g.includes("urban fantasy"))                               return "Urban Fantasy";
  if (g.includes("epic fantasy") || g.includes("high fantasy")) return "Epic Fantasy";
  if (g.includes("fantasy"))                                     return "Fantasy";
  if (g.includes("hard sci-fi"))                                 return "Hard Sci-Fi";
  if (g.includes("sci-fi") || g.includes("scifi") || g.includes("science fiction")) return "Sci-Fi";
  if (g.includes("horror"))   return "Horror";
  if (g.includes("thriller")) return "Thriller";
  if (g.includes("mystery"))  return "Mystery";
  if (g.includes("fiction"))  return "Fiction";
  return "Other";
}

// ── Genre vertical bands ──────────────────────────────────────

const GENRE_BANDS = [
  "Poetry",
  "Contemporary Romance",
  "Paranormal Romance",
  "Romance",
  "Fantasy Romance",
  "Dark Romance",
  "Sci-Fi Romance",
  "Literary Fiction",
  "Fiction",
  "Dark Fantasy",
  "Urban Fantasy",
  "Fantasy",
  "Epic Fantasy",
  "High Fantasy",
  "Horror",
  "Mystery",
  "Thriller",
  "Crime",
  "Sci-Fi",
  "Sci-Fi Thriller",
  "Sci-Fi Dystopian",
  "Hard Sci-Fi",
  "Science Fiction",
  "Graphic Novel",
  "Non-Fiction",
  "Biography",
  "History",
  "Historical",
  "Philosophy",
];

function getGenreBandIndex(genre) {
  if (!genre) return Math.floor(GENRE_BANDS.length / 2);
  const exact = GENRE_BANDS.findIndex(b => b.toLowerCase() === genre.toLowerCase());
  if (exact !== -1) return exact;
  const g = genre.toLowerCase();
  let bestIdx = -1, bestLen = 0;
  for (let i = 0; i < GENRE_BANDS.length; i++) {
    const b = GENRE_BANDS[i].toLowerCase();
    if (g.includes(b) && b.length > bestLen) { bestLen = b.length; bestIdx = i; }
  }
  if (bestIdx !== -1) return bestIdx;
  if (g.includes("romance"))  return GENRE_BANDS.indexOf("Romance");
  if (g.includes("fantasy"))  return GENRE_BANDS.indexOf("Fantasy");
  if (g.includes("sci-fi") || g.includes("scifi")) return GENRE_BANDS.indexOf("Sci-Fi");
  if (g.includes("horror"))   return GENRE_BANDS.indexOf("Horror");
  if (g.includes("thriller")) return GENRE_BANDS.indexOf("Thriller");
  if (g.includes("fiction"))  return GENRE_BANDS.indexOf("Fiction");
  return Math.floor(GENRE_BANDS.length / 2);
}

// ── Book processing ───────────────────────────────────────────

let processedBooks = [];

function processBooks() {
  const raw = (typeof MY_BOOKS !== "undefined")
    ? MY_BOOKS.filter(b => !HIDDEN_GENRES.includes(b.genre))
    : [];
  if (!raw.length) {
    console.warn("MY_BOOKS is empty — add your reading data in books.js");
    return;
  }

  const yearMin = Math.min(...raw.map(b => b.year));
  const yearMax = Math.max(...raw.map(b => b.year));

  processedBooks = raw.map(b => {
    // x: year column with small jitter so same-year books naturally overlap neighbours
    const nxBase = (yearMin === yearMax) ? 0.5
                 : map(b.year, yearMin, yearMax, 270 / width, (width - 200) / width);
    const nxJitter = ((djb2(b.title + "x") % 2000) / 2000 - 0.5) * 60 / width;
    const nx = constrain(nxBase + nxJitter, 270 / width, (width - 200) / width);

    // y: deterministic hash-based scatter — organic spread with no data meaning
    const ny = map((djb2(b.title + "y") % 10000), 0, 9999, 100 / height, (height - 50) / height);

    const col   = getGenreColor(b.genre);
    const isDNF = b.finished === false;
    const rating = b.rating || 3;

    return {
      title:           b.title,
      genre:           b.genre,
      year:            b.year,
      nx, ny, col, isDNF,
      rawRating:       b.rating,
      pages:           b.pages || 300,
      attractStrength: isDNF ? 0 : ratingToStrength(rating),
      turbulence:      map(b.emotionalIntensity ?? 3, 1, 5, 0.0, isDNF ? 0.55 : 1.0),
      alpha:           isDNF ? 42 : map(rating, 1, 5, 14, 98),
    };
  });
  updateStatsPanel();
}

function updateStatsPanel() {
  const el = document.getElementById("stats-content");
  if (!el) return;
  const dnfCount = processedBooks.filter(b => b.isDNF).length;
  const ratings  = processedBooks.filter(b => b.rawRating != null && !b.isDNF).map(b => b.rawRating);
  const avg      = ratings.length ? (ratings.reduce((a, n) => a + n, 0) / ratings.length).toFixed(2) : "—";
  const pages    = processedBooks.reduce((s, b) => s + b.pages, 0).toLocaleString();
  el.innerHTML = `
    <div class="stat-row"><span class="stat-n">${processedBooks.length}</span>books read</div>
    <div class="stat-row"><span class="stat-n">${dnfCount}</span>did not finish</div>
    <div class="stat-row"><span class="stat-n">${avg}</span>avg rating</div>
    <div class="stat-row"><span class="stat-n">${pages}</span>pages</div>
  `;
}

function ratingToStrength(r) {
  return ([-0.10, -0.10, 0.06, 0.22, 0.38, 0.62])[r] ?? 0.12;
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

function dataHash() {
  const key = (typeof MY_BOOKS !== "undefined")
    ? MY_BOOKS.map(b => `${b.title}|${b.year}|${b.rating}|${b.finished}`).join(",")
    : "empty";
  return djb2(key);
}

// ── Flow Field ────────────────────────────────────────────────

class FlowField {
  constructor() {
    this.cols   = Math.ceil(width  / CFG.fieldRes) + 1;
    this.rows   = Math.ceil(height / CFG.fieldRes) + 1;
    this.angles = new Float32Array(this.cols * this.rows);
    this.t      = random(200, 8000); // seeded by dataHash() — deterministic
    this._buildCache();
  }

  _buildCache() {
    this._bc = processedBooks.map(b => {
      const aRad = CFG.attractRadius * (0.5 + Math.max(b.attractStrength, 0) * 2.2);
      const tRad = CFG.turbRadius    * (1.0 + b.turbulence * 0.9);
      return {
        bx: b.nx * width,  by: b.ny * height,
        aRad, aRad2: aRad * aRad,
        tRad, tRad2: tRad * tRad,
        aStr: b.attractStrength,
        turb: b.turbulence,
        nx: b.nx, ny: b.ny,
      };
    });
  }

  update() {
    const s = CFG.noiseScale, r = CFG.fieldRes, t = this.t, bc = this._bc;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const px = col * r, py = row * r;
        let angle =
          noise(px * s,             py * s,             t       ) * TWO_PI * 2.6
        + noise(px * s * 2.2 + 400, py * s * 2.2 + 400, t * 1.8) * PI     * 0.5;

        for (const bc_i of bc) {
          const dx = px - bc_i.bx, dy = py - bc_i.by;
          const d2 = dx * dx + dy * dy;
          if (bc_i.aStr > 0 && d2 < bc_i.aRad2 && d2 > 1) {
            const dst = Math.sqrt(d2);
            const falloff = (1 - dst / bc_i.aRad) ** 2;
            angle = lerp(angle, Math.atan2(dy, dx) + HALF_PI, bc_i.aStr * falloff * 0.92);
          }
          if (bc_i.turb > 0.12 && d2 < bc_i.tRad2) {
            const dst = Math.sqrt(d2);
            const falloff = 1 - dst / bc_i.tRad;
            angle += noise(px * s * 4.5 + bc_i.nx * 35, py * s * 4.5 + bc_i.ny * 35, t * 2.8)
                     * bc_i.turb * PI * falloff * falloff * 3.2;
          }
        }
        this.angles[row * this.cols + col] = angle;
      }
    }
  }

  at(x, y) {
    const col = constrain(Math.floor(x / CFG.fieldRes), 0, this.cols - 1);
    const row = constrain(Math.floor(y / CFG.fieldRes), 0, this.rows - 1);
    return this.angles[row * this.cols + col];
  }
}

// ── Ambient layer (background texture) ───────────────────────

const CONTENT_TOP = 80;

function buildAmbientLines(ff) {
  const lines = [];
  for (let i = 0; i < CFG.numAmbient; i++) {
    const sx = random(270, width - 40);
    const sy = random(CONTENT_TOP, height - 20);
    const path = [{ x: sx, y: sy }];
    let cx = sx, cy = sy;
    for (let s = 0; s < CFG.ambientSteps; s++) {
      const angle = ff.at(cx, cy);
      cx += Math.cos(angle) * CFG.baseSpeed;
      cy += Math.sin(angle) * CFG.baseSpeed;
      if (cx < 262 || cx > width - 5 || cy < CONTENT_TOP || cy > height - 5) break;
      path.push({ x: cx, y: cy });
    }
    if (path.length < 3) continue;
    lines.push({ path });
  }
  return lines;
}

function drawAmbientLine({ path }) {
  noFill();
  stroke(BG.h, 30, 52, CFG.ambientAlpha);
  strokeWeight(0.55);
  beginShape();
  curveVertex(path[0].x, path[0].y);
  for (const pt of path) curveVertex(pt.x, pt.y);
  curveVertex(path[path.length - 1].x, path[path.length - 1].y);
  endShape();
}

// Center paths stored for hover detection (one per book)
let bookCenterPaths = [];

// Laplacian path smoothing — averages each point with its neighbours
// so sharp corners from flow-field angle changes become gentle curves.
function smoothPath(pts, iters = 3) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const out = [p[0]];
    for (let i = 1; i < p.length - 1; i++) {
      out.push({
        x: (p[i - 1].x + p[i].x * 2 + p[i + 1].x) / 4,
        y: (p[i - 1].y + p[i].y * 2 + p[i + 1].y) / 4,
      });
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

// ── Book layer — ribbon bundles (data) ───────────────────────
// Each book spawns a tight fan of parallel lines seeded perpendicular
// to the initial flow direction. Pages → ribbon width + line count.
// Center lines are brighter than edges (cross-section shading).

function buildBookBundles(ff) {
  bookCenterPaths = [];
  const allLines  = [];
  const maxPages  = Math.max(...processedBooks.map(b => b.pages));
  for (const b of processedBooks) {
    const sx       = b.nx * width;
    const sy       = b.ny * height;
    const numLines = Math.round(map(b.pages, 80, 900, CFG.bundleLinesMin, CFG.bundleLinesMax, true));
    const spread   = map(b.pages, 80, 900, CFG.bundleSpreadMin, CFG.bundleSpreadMax, true);
    const stepsBase = Math.round(map(b.pages, 80, 900, CFG.bookStepsMin, CFG.bookStepsMax, true));
    const steps    = b.pages >= maxPages ? Math.round(stepsBase * 2.8) : stepsBase;
    const jitterStr = b.turbulence;
    const bookSeed  = djb2(b.title) % 1000;

    // Offset lines perpendicular to the initial flow direction
    const initAngle = ff.at(sx, sy);
    const perpX = Math.cos(initAngle + HALF_PI);
    const perpY = Math.sin(initAngle + HALF_PI);

    for (let li = 0; li < numLines; li++) {
      const tLi    = numLines > 1 ? li / (numLines - 1) : 0.5;
      const offset = map(tLi, 0, 1, -spread / 2, spread / 2);

      // Center lines brighter, edge lines dimmer → ribbon cross-section shading
      const centerDist = Math.abs(tLi - 0.5) * 2; // 0 = center, 1 = edge
      const alphaScale = map(centerDist, 0, 1, 1.0, 0.42);

      // Clamp starting position so perpendicular spread never exits the canvas
      const startX = constrain(sx + perpX * offset, 262, width - 5);
      const startY = constrain(sy + perpY * offset, CONTENT_TOP + 2, height - 5);

      const path = [{ x: startX, y: startY }];
      let cx = startX, cy = startY;
      for (let s = 0; s < steps; s++) {
        let angle = ff.at(cx, cy);
        if (jitterStr > 0) {
          angle += (noise(cx * 0.018 + bookSeed + li * 0.07, cy * 0.018, s * 0.04) - 0.5)
                   * TWO_PI * 0.5 * jitterStr;
        }
        cx += Math.cos(angle) * CFG.baseSpeed;
        cy += Math.sin(angle) * CFG.baseSpeed;
        if (cx < 262 || cx > width - 5 || cy < 5 || cy > height - 5) break;
        path.push({ x: cx, y: cy });
      }
      if (path.length < 2) continue;
      const smoothed = smoothPath(path);

      const isCenter = li === Math.floor(numLines / 2);
      if (isCenter) {
        bookCenterPaths.push({ path: smoothed, title: b.title, col: b.col, isDNF: b.isDNF });
      }

      allLines.push({
        path:     smoothed,
        col:      b.col,
        alpha:    b.alpha * alphaScale * 0.72,
        isDNF:    b.isDNF,
        isCenter,
        rating:   b.rawRating || 3,
      });
    }
  }
  return allLines;
}

function drawBookLine({ path, col, alpha, isDNF }) {
  noFill();
  if (isDNF) {
    drawingContext.setLineDash([8, 8]);
    stroke(col.h, col.s * 0.58, col.b * 0.88, alpha);
    strokeWeight(CFG.bookWeight * 0.8);
    beginShape();
    curveVertex(path[0].x, path[0].y);
    for (const pt of path) curveVertex(pt.x, pt.y);
    curveVertex(path[path.length - 1].x, path[path.length - 1].y);
    endShape();
    drawingContext.setLineDash([]);
    return;
  }
  // Per-segment gradient: origin = bright/saturated, tail = dim/fades out
  strokeWeight(CFG.bookWeight);
  for (let i = 1; i < path.length; i++) {
    const t    = i / (path.length - 1);
    const tRev = 1 - t;
    const a    = tRev * tRev * alpha;
    const sat  = lerp(col.s * 0.5, col.s * 0.92, tRev);
    const bri  = lerp(col.b * 0.22, col.b, tRev);
    stroke(col.h, sat, bri, a);
    line(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
  }
}

// ── Annotation layers ─────────────────────────────────────────

function drawGenreLabels() {
  const groups = new Map();
  for (const b of processedBooks) {
    if (b.isDNF) continue;
    const fam = getGenreFamily(b.genre);
    if (!groups.has(fam)) groups.set(fam, { xs: [], ys: [], col: b.col });
    const g = groups.get(fam);
    g.xs.push(b.nx * width);
    g.ys.push(b.ny * height);
  }

  textAlign(CENTER, BOTTOM);
  textSize(11.5);
  textStyle(BOLD);

  for (const [fam, data] of groups.entries()) {
    if (!data.xs.length) continue;
    const cx = data.xs.reduce((a, v) => a + v, 0) / data.xs.length;
    const cy = data.ys.reduce((a, v) => a + v, 0) / data.ys.length;

    const c    = data.col;
    const cObj = color(c.h, c.s * 0.6, c.b);
    drawingContext.shadowColor = `rgba(${red(cObj)|0},${green(cObj)|0},${blue(cObj)|0},0.55)`;
    drawingContext.shadowBlur  = 14;

    fill(c.h, c.s * 0.22, 100, 82);
    noStroke();
    text(fam.toUpperCase(), cx, cy - 32);
  }

  drawingContext.shadowBlur  = 0;
  drawingContext.shadowColor = "transparent";
  textStyle(NORMAL);
}

function drawYearTimeline() {
  const src = (processedBooks && processedBooks.length)
    ? processedBooks
    : (typeof MY_BOOKS !== "undefined" ? MY_BOOKS : []);
  const allYears = [...new Set(src.map(b => b.year))].sort((a, b) => a - b);
  if (!allYears.length) return;
  const yearMin = allYears[0], yearMax = allYears[allYears.length - 1];

  const ty     = 64;
  const xLeft  = 270;
  const xRight = width - 200;

  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  // Axis line
  ctx.strokeStyle = "rgba(210, 220, 255, 0.7)";
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(xLeft, ty);
  ctx.lineTo(xRight, ty);
  ctx.stroke();

  // Tick marks + year labels centered between consecutive ticks
  ctx.font         = "12px monospace";
  ctx.fillStyle    = "rgba(255, 255, 255, 0.88)";
  ctx.textAlign    = "center";
  ctx.textBaseline = "bottom";

  for (let i = 0; i < allYears.length; i++) {
    const vx = map(allYears[i], yearMin, yearMax, xLeft, xRight);

    // Tick mark
    ctx.strokeStyle = "rgba(210, 220, 255, 0.55)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(vx, ty - 4);
    ctx.lineTo(vx, ty + 4);
    ctx.stroke();

    // Label goes between this tick and the previous one
    if (i > 0) {
      const prevVx = map(allYears[i - 1], yearMin, yearMax, xLeft, xRight);
      ctx.fillText(String(allYears[i]), (prevVx + vx) / 2, ty - 6);
    }
  }

  // "YEAR READ"
//   ctx.font         = "11px monospace";
//   ctx.fillStyle    = "rgba(255, 255, 255, 0.88)";
//   ctx.textAlign    = "left";
//   ctx.textBaseline = "top";
//   ctx.fillText("YEAR READ", xLeft, ty + 6);

  ctx.restore();
  noStroke();
}

// ── Main render ───────────────────────────────────────────────

function render() {
  randomSeed(12345);  // fixed — field shape stays stable when books are added
  noiseSeed(12345);

  background(BG.h, BG.s, BG.b);

  const ff = new FlowField();
  ff.update();

  const ambientLines = buildAmbientLines(ff);
  const bookLines    = buildBookBundles(ff);

  // 1. Ambient background — faint flow field texture
  blendMode(BLEND);
  for (const al of ambientLines) drawAmbientLine(al);

  // 2. Book lines — rating encoded via opacity + stroke weight
  for (const bl of bookLines) drawBookLine(bl);

  // 3. Origin dot — small bright point at each book's starting position
  blendMode(ADD);
  for (const { path, col, isDNF, isCenter } of bookLines) {
    if (!isCenter) continue;
    const h = path[0];
    noFill();
    stroke(col.h, 18, 100, isDNF ? 22 : 40);
    strokeWeight(isDNF ? 4.5 : 6.5);
    point(h.x, h.y);
    stroke(0, 0, 100, isDNF ? 45 : 72);
    strokeWeight(isDNF ? 1.5 : 2.2);
    point(h.x, h.y);
  }

  // 4. Labels
  blendMode(BLEND);
  drawYearTimeline();
}

// ── p5.js lifecycle ───────────────────────────────────────────

function setup() {
  createCanvas(1800, 1200);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
  pixelDensity(min(pixelDensity(), 2));

  processBooks();
  render();
  noLoop();
}


function mouseMoved() {
  const THRESH = 20;
  let nearest = null;
  let nearestDist = THRESH;

  for (const bp of bookCenterPaths) {
    const path = bp.path;
    for (let i = 0; i < path.length - 1; i += 3) {
      const a = path[i], b = path[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let d;
      if (lenSq === 0) {
        d = Math.hypot(mouseX - a.x, mouseY - a.y);
      } else {
        const t = Math.max(0, Math.min(1, ((mouseX - a.x) * dx + (mouseY - a.y) * dy) / lenSq));
        d = Math.hypot(mouseX - (a.x + t * dx), mouseY - (a.y + t * dy));
      }
      if (d < nearestDist) { nearestDist = d; nearest = bp; }
    }
  }

  const tip = document.getElementById("book-tooltip");
  if (nearest) {
    const rect   = document.querySelector("canvas").getBoundingClientRect();
    const scaleX = rect.width  / width;
    const scaleY = rect.height / height;
    const sx     = rect.left + mouseX * scaleX;
    const sy     = rect.top  + mouseY * scaleY;
    const tipX   = sx + 14 + 200 > windowWidth ? sx - 214 : sx + 14;
    tip.style.left = tipX + "px";
    tip.style.top  = (sy - 10) + "px";
    tip.style.display = "block";
    tip.style.borderLeftColor =
      `hsla(${nearest.col.h}, ${Math.round(nearest.col.s * 0.65)}%, ${Math.round(nearest.col.b * 0.72)}%, 0.9)`;
    tip.textContent = nearest.title + (nearest.isDNF ? "  (DNF)" : "");
  } else {
    tip.style.display = "none";
  }
}

function keyPressed() {
  if (key === "r" || key === "R") render();
  if (key === "s" || key === "S") saveCanvas("shape-of-my-taste", "png");
}
