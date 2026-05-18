let dots = [];
let numDots = 40;
let connectionChance = 0.6;

function setup() {
  createCanvas(600, 600);
  noLoop();
  colorMode(HSL);

  let btn = createButton("save");
  btn.mousePressed(() => saveCanvas("outputSave", "png"));
}

function draw() {
  dots = [];
  for (let i = 0; i < numDots; i++) {
    dots.push({
      x: random(10, 580),
      y: random(10, 580)
    });
  }
  
  blendMode(BLEND);
  background("#F5F2EA");
  drawDots();
  drawConnections();
  
}

function drawDots() {
  noStroke();
  fill("black");
  for (let dot of dots) {
    circle(dot.x, dot.y, 20);
  }
}

// function drawConnections() {
//   let candidates = dots.filter(() => random() < connectionChance);
//   if (candidates.length % 2 !== 0) candidates.pop();
//   candidates = shuffle(candidates);
  
//   let chainChance = 0.4;
//   let usedEndpoints = [];
  
//   // blendMode(MULTIPLY);
//   strokeCap(ROUND);
//   strokeWeight(18);
//   noFill();
//   let highlighterColors = ['#FC43B8'];
  
//   for (let i = 0; i < candidates.length; i += 2) {
//     let startPt, endPt;
    
//     endPt = candidates[i + 1];
//     if (usedEndpoints.length > 0 && random() < chainChance) {
//       let idx = floor(random(usedEndpoints.length));
//       startPt = usedEndpoints[idx];
//       usedEndpoints.splice(idx, 1);
      
//     } else {
//       startPt = candidates[i];
//     }
    
//     drawHighlighterLine(
//       startPt.x, startPt.y,
//       endPt.x, endPt.y,
//       color(random(highlighterColors))
//     );
    
//     usedEndpoints.push(endPt);
    
//     // drawHighlighterLine(
//     //   candidates[i].x, candidates[i].y,
//     //   candidates[i+1].x, candidates[i+1].y,
//     //   color(random(highlighterColors))
//     // );
//   }
  
  // blendMode(BLEND);
// }

function drawConnections() {
  let candidates = dots.filter(() => random() < connectionChance);
  let pairs = pairByProximity(candidates);

  let chainChance = 0.4;
  let usedEndpoints = [];
  let highlighterColors = ['#FC43B8'];

  for (let [a, b] of pairs) {
    if (dist(a.x, a.y, b.x, b.y) > 150) continue;

    let startPt, endPt;
    endPt = b;

    if (usedEndpoints.length > 0 && random() < chainChance) {
      let idx = floor(random(usedEndpoints.length));
      startPt = usedEndpoints.splice(idx, 1)[0];
    } else {
      startPt = a;
    }

    let dotRadius = 10;
    let dx = endPt.x - startPt.x;
    let dy = endPt.y - startPt.y;
    let lineLen = sqrt(dx * dx + dy * dy);
    let ux = dx / lineLen;
    let uy = dy / lineLen;

    let x1 = startPt.x + ux * random(-dotRadius * 0.5, dotRadius * 1.5)
    let y1 = startPt.y + uy * random(-dotRadius, dotRadius);
    let x2 = endPt.x - ux * random(-dotRadius, dotRadius);
    let y2 = endPt.y - uy * random(-dotRadius, dotRadius);

    drawHighlighterLine(x1, y1, x2, y2, color(random(highlighterColors)));
    usedEndpoints.push(endPt);
  }
}

function drawHighlighterLine(x1, y1, x2, y2, col) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let len = sqrt(dx * dx + dy * dy);
  let ux = dx / len;
  let uy = dy / len;
  let perpX = -dy / len;
  let perpY =  dx / len;
  
  // One arc control point — gentle curve that scales with line length
  let arcAmt = random(-len * 0.08, len * 0.08);
  let cpx = (x1 + x2) / 2 + perpX * arcAmt;
  let cpy = (y1 + y2) / 2 + perpY * arcAmt;

  let noiseOff = random(1000);
  let steps = 25;
  let weight = 20;

  stroke(col);
  noFill();
  strokeCap(ROUND);
  blendMode(MULTIPLY);

  // Center strands always run full length, wispy ones start/end randomly
  let strands = [
    { offset: 0,              weight: weight * 0.6,  tStart: 0,              tEnd: 1              },
    { offset: -weight * 0.3,  weight: weight * 0.25, tStart: 0,              tEnd: 1              },
    { offset:  weight * 0.3,  weight: weight * 0.25, tStart: 0,              tEnd: 1              },
    { offset: -weight * 0.48, weight: weight * 0.08, tStart: random(0, 0.25), tEnd: random(0.75, 1) },
    { offset:  weight * 0.48, weight: weight * 0.08, tStart: random(0, 0.25), tEnd: random(0.75, 1) },
    { offset: -weight * 0.52, weight: weight * 0.06, tStart: random(0, 0.5),  tEnd: random(0.5, 1) },
    { offset:  weight * 0.52, weight: weight * 0.06, tStart: random(0, 0.5),  tEnd: random(0.5, 1) },
    { offset: -weight * 0.38, weight: weight * 0.09, tStart: random(0, 0.4),  tEnd: 1              },
    { offset:  weight * 0.38, weight: weight * 0.09, tStart: 0,              tEnd: random(0.6, 1)  },
  ];

  for (let strand of strands) {
    let strandNoise = random(1000);
    strokeWeight(strand.weight);

    let sx = qbp(x1, cpx, x2, strand.tStart);
  let sy = qbp(y1, cpy, y2, strand.tStart);
  let ex = qbp(x1, cpx, x2, strand.tEnd);
  let ey = qbp(y1, cpy, y2, strand.tEnd);
    let strandSteps = max(2, ceil(steps * (strand.tEnd - strand.tStart)));

    beginShape();
    curveVertex(sx + perpX * strand.offset, sy + perpY * strand.offset);
    for (let i = 0; i <= strandSteps; i++) {
      let t = lerp(strand.tStart, strand.tEnd, i / strandSteps);
      let bx = qbp(x1, cpx, x2, t);
      let by = qbp(y1, cpy, y2, t);
      let pathWobble = (noise(noiseOff + t * 2) - 0.5) * 2;
      let edgeWobble = (noise(strandNoise + t * 5) - 0.5) * 2;
      curveVertex(
        bx + perpX * (strand.offset + pathWobble + edgeWobble),
        by + perpY * (strand.offset + pathWobble + edgeWobble)
      );
    }
    curveVertex(ex + perpX * strand.offset, ey + perpY * strand.offset);
    endShape();
  }

  // Tapered tips
//   noStroke();
//   fill(col);
//   let tipSteps = 6;
//   let tipReach = weight * 0.7;

//   for (let i = 1; i <= tipSteps; i++) {
//     let t = i / tipSteps;
//     let size = weight * (1 - t) * random(0.85, 1.05);
//     let d = t * tipReach;
//     ellipse(x1 - ux * d, y1 - uy * d, size, size);
//     ellipse(x2 + ux * d, y2 + uy * d, size, size);
//   }
  drawBristleTip(x1, y1, -ux, -uy, perpX, perpY, col, weight);
  drawBristleTip(x2, y2,  ux,  uy, perpX, perpY, col, weight);
}

function drawBristleTip(x, y, dirX, dirY, perpX, perpY, col, weight) {
  stroke(col);
  noFill();
  strokeCap(ROUND);

  let numBristles = floor(random(3, 6));
  let baseAngle = atan2(dirY, dirX);
  let spreadAngle = 0.15; // much tighter fan

  for (let b = 0; b < numBristles; b++) {
    strokeWeight(random(0.3, 1.2));

    let startSpread = random(-weight * 0.3, weight * 0.3);
    let sx = x + perpX * startSpread;
    let sy = y + perpY * startSpread;

    let angle = baseAngle + random(-spreadAngle, spreadAngle);
    let length = random(2, weight * 0.5); // much shorter — max ~10px
    let ex = sx + cos(angle) * length;
    let ey = sy + sin(angle) * length;

    let midCurve = random(-1.5, 1.5); // subtler curve
    let mx = (sx + ex) / 2 + perpX * midCurve;
    let my = (sy + ey) / 2 + perpY * midCurve;

    beginShape();
    curveVertex(sx, sy);
    curveVertex(sx, sy);
    curveVertex(mx, my);
    curveVertex(ex, ey);
    curveVertex(ex, ey);
    endShape();
  }
}



function mousePressed() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    redraw();
  }
}

function qbp(a, b, c, t) {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}

function pairByProximity(candidates) {
  let pairs = [];
  let remaining = [...candidates];
  while (remaining.length >= 2) {
    let a = remaining.shift();
    let minDistance = Infinity, minIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      let d = dist(a.x, a.y, remaining[j].x, remaining[j].y);
      if (d < minDistance) {
        minDistance = d;
        minIdx = j;
      }
    }
    
    pairs.push([a, remaining.splice(minIdx, 1)[0]]);
  }
  return pairs;
}
