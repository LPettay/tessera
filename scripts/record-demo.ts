/**
 * Record an animated GIF of a Tessera demo by scripting cursor movement
 * through a live dev server, capturing PNG frames with Puppeteer, and
 * encoding them into a GIF with ffmpeg.
 *
 * Usage:
 *   bun run scripts/record-demo.ts [url] [output]
 *
 * Defaults:
 *   url    = http://localhost:3007
 *   output = docs/media/windows-cursor-field-demo.gif
 *
 * Requires:
 *   - Dev server running at url (bun run dev:windows)
 *   - ffmpeg in PATH
 */

import puppeteer from "puppeteer";
import { execSync } from "child_process";
import { mkdirSync, readdirSync, rmSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");

const URL = process.argv[2] ?? "http://localhost:3007";
const OUT = resolve(ROOT, process.argv[3] ?? "docs/media/windows-cursor-field-demo.gif");

const VIEWPORT = { width: 960, height: 540 };
const FPS = 20;
const FRAME_MS = 1000 / FPS;
const FRAMES_DIR = join(ROOT, ".tmp-frames");

// ---- cursor path --------------------------------------------------------- //
// A sweep that shows off the cursor field: start centre-left, arc across
// the windows, sweep down through the taskbar, pause, retract.

type Point = { x: number; y: number };

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
    });
  }
  return pts;
}

const W = VIEWPORT.width;
const H = VIEWPORT.height;

// Build a sequence of bezier segments that sweeps dramatically across the scene.
const segments: Point[][] = [
  // Pause at start (off to the side), then sweep right across icons + notepad.
  cubicBezier({ x: -80, y: H * 0.4 }, { x: W * 0.1, y: H * 0.3 }, { x: W * 0.35, y: H * 0.25 }, { x: W * 0.5, y: H * 0.35 }, 40),
  // Arc down through the overlapping windows.
  cubicBezier({ x: W * 0.5, y: H * 0.35 }, { x: W * 0.65, y: H * 0.45 }, { x: W * 0.55, y: H * 0.6 }, { x: W * 0.45, y: H * 0.65 }, 40),
  // Sweep left across taskbar.
  cubicBezier({ x: W * 0.45, y: H * 0.65 }, { x: W * 0.3, y: H * 0.85 }, { x: W * 0.15, y: H * 0.9 }, { x: W * 0.05, y: H * 0.87 }, 35),
  // Hold near START button.
  ...Array.from({ length: 20 }, () => [{ x: W * 0.05, y: H * 0.87 }]),
  // Sweep right to clock.
  cubicBezier({ x: W * 0.05, y: H * 0.87 }, { x: W * 0.3, y: H * 0.88 }, { x: W * 0.7, y: H * 0.88 }, { x: W * 0.95, y: H * 0.87 }, 40),
  // Retract off-screen bottom-right.
  cubicBezier({ x: W * 0.95, y: H * 0.87 }, { x: W * 1.1, y: H * 0.9 }, { x: W * 1.2, y: H * 0.6 }, { x: W * 1.3, y: H * 0.3 }, 30),
  // Hold off-screen so voxels settle.
  ...Array.from({ length: 25 }, () => [{ x: W * 1.3, y: H * 0.3 }]),
];

const cursorPath: Point[] = segments.flat();

// ---- record -------------------------------------------------------------- //

console.log(`record-demo: launching Chrome → ${URL}`);
console.log(`record-demo: ${cursorPath.length} frames at ${FPS}fps = ${(cursorPath.length / FPS).toFixed(1)}s`);

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: [
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ],
});

const page = await browser.newPage();
await page.setViewport(VIEWPORT);

console.log("record-demo: navigating…");
await page.goto(URL, { waitUntil: "networkidle0", timeout: 30_000 });

// Let the animation loop warm up.
await new Promise((r) => setTimeout(r, 800));

console.log("record-demo: capturing frames…");
let frameIndex = 0;

for (const pt of cursorPath) {
  // Move mouse (even off-screen moves register on the SVG cursor listener).
  await page.mouse.move(pt.x, pt.y);

  // Wait one frame so the onFrame callback fires and SVG re-renders.
  await new Promise((r) => setTimeout(r, FRAME_MS));

  const pad = String(frameIndex).padStart(5, "0");
  await page.screenshot({ path: join(FRAMES_DIR, `frame-${pad}.png`) });
  frameIndex++;
}

await browser.close();

// ---- encode with ffmpeg -------------------------------------------------- //

const frameCount = readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png")).length;
console.log(`record-demo: encoding ${frameCount} frames → ${OUT}`);

mkdirSync(dirname(OUT), { recursive: true });

// Two-pass: PNGs → palette → GIF (much better quality/size than single-pass).
const palette = join(FRAMES_DIR, "palette.png");
execSync(
  `/home/lance/miniconda3/bin/ffmpeg -y -framerate ${FPS} -i "${join(FRAMES_DIR, "frame-%05d.png")}" ` +
  `-vf "fps=${FPS},scale=960:-1:flags=lanczos,palettegen=max_colors=128" "${palette}"`,
  { stdio: "inherit" },
);
execSync(
  `/home/lance/miniconda3/bin/ffmpeg -y -framerate ${FPS} -i "${join(FRAMES_DIR, "frame-%05d.png")}" ` +
  `-i "${palette}" -lavfi "fps=${FPS},scale=960:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer" ` +
  `"${OUT}"`,
  { stdio: "inherit" },
);

// Cleanup frames.
rmSync(FRAMES_DIR, { recursive: true });

console.log(`record-demo: done → ${OUT}`);
