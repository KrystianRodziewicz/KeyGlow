export const SIDE_MODES = ['wave', 'mix', 'new', 'breath', 'static'];
export const SIDE_LEDS = 45;
export const SIDE_CUSTOM = 8;

export const SIDE_COLOURS = [
  [255, 0, 0], [255, 32, 0], [128, 64, 0], [0, 128, 0], [0, 128, 128], [0, 0, 128], [255, 0, 160], [255, 160, 160],
];
const SIDE_COLOURS_DIM = [
  [112, 0, 0], [112, 32, 0], [96, 48, 0], [0, 112, 0], [0, 112, 112], [0, 0, 112], [112, 0, 112], [64, 112, 96],
];

export const DUAL_COLOURS = [
  [[0, 255, 255], [0, 0, 255]],
  [[0, 0, 255], [255, 0, 160]],
  [[0, 255, 255], [255, 64, 64]],
];

const SPEED_MS = { wave: [10, 20, 25, 30, 45], mix: [25, 30, 40, 50, 60], new: [30, 50, 60, 70, 100], breath: [25, 30, 40, 50, 60], static: [10, 20, 25, 30, 45] };
const LIGHT_LEVELS = [0, 64, 128, 192, 255];

const BREATHE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 42, 45, 49, 53, 57, 61, 65, 69, 73,
  77, 81, 85, 89, 94, 99, 104, 109, 114, 119, 124, 129, 134, 140, 146, 152, 158, 164, 170, 176, 182, 188, 194, 200, 206, 213, 220, 227, 234, 241, 248, 255];
const BREATHE_TAB = [...BREATHE, ...[...BREATHE].reverse()];
const WAVE_UP = [22, 23, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 71, 73, 75,
  77, 81, 85, 89, 94, 99, 104, 109, 114, 119, 124, 129, 134, 140, 146, 152, 158, 164, 170, 176, 182, 188, 194, 200, 206, 213, 220, 227, 234, 241, 248, 255];
const WAVE_DOWN = [255, 248, 241, 234, 227, 220, 213, 206, 200, 194, 188, 182, 176, 170, 164, 158, 152, 146, 140, 134, 129, 124, 119, 114,
  109, 104, 99, 94, 89, 85, 81, 77, 73, 69, 65, 61, 57, 53, 49, 45, 42, 39, 36, 33, 30, 27, 24, 22];
const WAVE_TAB = [...WAVE_UP, ...WAVE_DOWN];

const RAMP_UP = [8, 8, 8, 8, 10, 14, 18, 22, 26, 32, 38, 44, 50, 57, 65, 73, 81, 89, 99, 109, 119, 129, 140, 152, 164, 176, 188, 200, 213, 227, 241, 255];
const RAMP_DOWN = [248, 234, 220, 206, 194, 182, 170, 158, 146, 134, 124, 114, 104, 94, 85, 77, 69, 61, 53, 47, 41, 35, 29, 24, 20, 16, 12, 8, 8, 8, 8, 8];
const FLOW = [
  ...RAMP_UP.map(v => [255, v, 8]), ...RAMP_DOWN.map(v => [v, 255, 8]), ...RAMP_UP.map(v => [8, 255, v]),
  ...RAMP_DOWN.map(v => [8, v, 255]), ...RAMP_UP.map(v => [v, 8, 255]), ...RAMP_DOWN.map(v => [255, 8, v]),
];

const scale = (c, l) => ((l * c + c) >> 8);
const light = ([r, g, b], l) => [scale(r, l), scale(g, l), scale(b, l)];
const times = ([r, g, b], k) => [r * k | 0, g * k | 0, b * k | 0];

const isShortSide = i => (i >= 18 && i <= 22) || i >= 40;

export class SideLight {
  constructor() {
    this.out = Array.from({ length: SIDE_LEDS }, () => [0, 0, 0]);
    this.point = 0;
    this.cnt = 0;
    this.breathColour = 0;
    this.last = null;
    this.mode = null;
  }

  render(settings, now) {
    const { mode, colour, speed } = settings;
    if (settings.segments === 0) {
      this.out.fill([0, 0, 0]);
      return this.out;
    }
    if (mode !== this.mode) { this.mode = mode; this.point = 0; }
    const level = LIGHT_LEVELS[settings.light];
    const rainbow = colour === 'rainbow';
    const c = rainbow ? 0 : colour;
    const custom = settings.custom ?? [255, 255, 255];
    const colourOf = i => (i === SIDE_CUSTOM ? custom : SIDE_COLOURS[i]);
    const dimOf = i => (i === SIDE_CUSTOM ? custom.map(v => v * 0.44 | 0) : SIDE_COLOURS_DIM[i]);

    this.cnt += this.last == null ? 0 : Math.min(500, now - this.last);
    this.last = now;
    const period = SPEED_MS[mode][speed];
    let steps = 0;
    while (this.cnt > period && steps < 40) { this.cnt -= period; steps++; }

    const out = this.out;
    switch (mode) {
      case 'wave': {
        const len = rainbow ? FLOW.length : WAVE_TAB.length;
        this.point = (this.point - steps + len * 40) % len;
        for (let i = 0; i < SIDE_LEDS; i++) {
          const idx = (this.point + 5 * (i + 1)) % len;
          let col = rainbow ? FLOW[idx] : light(colourOf(c), WAVE_TAB[idx]);
          if (i >= 40) col = times(col, 0.4);
          out[i] = light(col, level);
        }
        break;
      }
      case 'mix': {
        this.point = (this.point + steps) % FLOW.length;
        const col = light(FLOW[this.point], level);
        for (let i = 0; i < SIDE_LEDS; i++) out[i] = i >= 40 ? times(col, 0.3) : col;
        break;
      }
      case 'new': {
        const len = 40;
        this.point = (this.point - steps + len * 40) % len;
        const [a, b] = DUAL_COLOURS[Math.min(c, DUAL_COLOURS.length - 1)];
        for (let i = 0; i < SIDE_LEDS; i++) {
          const idx = (this.point + i) % len;
          const col = light(idx < len / 2 ? a : b, level);
          out[i] = i >= 40 ? times(col, 0.3) : col;
        }
        break;
      }
      case 'breath': {
        const before = this.point;
        this.point = (this.point - steps + BREATHE_TAB.length * 40) % BREATHE_TAB.length;
        if (rainbow && steps && this.point > before) this.breathColour = (this.breathColour + 1) % SIDE_COLOURS.length;
        const base = colourOf(rainbow ? this.breathColour : c);
        const col = light(light(base, BREATHE_TAB[this.point]), level);
        for (let i = 0; i < SIDE_LEDS; i++) out[i] = i >= 40 ? times(col, 0.3) : col;
        break;
      }
      default: {
        for (let i = 0; i < SIDE_LEDS; i++) {
          out[i] = light(isShortSide(i) ? times(dimOf(c), 0.7) : colourOf(c), level);
        }
      }
    }
    return out;
  }
}

export function sideLedPositions() {
  const pos = [];
  const edge = (n, from, to) => {
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      pos.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    }
  };
  edge(18, [0.04, 0], [0.96, 0]);
  edge(5, [1, 0.12], [1, 0.88]);
  edge(17, [0.96, 1], [0.04, 1]);
  edge(5, [0, 0.88], [0, 0.12]);
  return pos;
}
