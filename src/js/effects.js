const u8 = v => ((Math.floor(v) % 256) + 256) % 256;
const clamp8 = v => (v < 0 ? 0 : v > 255 ? 255 : v);
const scale8 = (i, s) => (u8(i) * (u8(s) + 1)) >> 8;
const scale16by8 = (i, s) => Math.floor((i * (s + 1)) / 256) & 0xffff;
const qadd8 = (a, b) => Math.min(255, a + b);
const qsub8 = (a, b) => Math.max(0, a - b);
const abs8 = v => { v = u8(v); return v > 127 ? 256 - v : v; };
const sin8 = x => Math.round(128 + 127 * Math.sin((u8(x) / 256) * Math.PI * 2));
const cos8 = x => sin8(x + 64);
const atan2_8 = (dy, dx) => u8(Math.round((Math.atan2(dy, dx) / (Math.PI * 2)) * 256));
const random8 = () => (Math.random() * 256) | 0;

const HITS_TO_REMEMBER = 8;

const timeDiv = (st, shift) => u8(scale16by8(st.t, st.speed >> shift));
const timeCycle = st => u8(scale16by8(st.t, qadd8(st.speed >> 2, 1)));

const put = (out, i, h, s, v) => { out.h[i] = u8(h); out.s[i] = clamp8(s); out.v[i] = clamp8(v); };

const perLed = fn => (st, out) => {
  for (const k of st.leds) {
    const [h, s, v] = fn(k, st);
    put(out, k.i, h, s, v);
  }
};

const onlyLeds = list => (st, out) => {
  for (const k of st.leds) put(out, k.i, st.h, st.s, list.includes(k.i) ? st.v : 0);
};

function raindropsRunner(pick) {
  return (st, out) => {
    const d = st.data;
    if (!d.colors) d.colors = st.leds.map(() => pick(st));
    const units = scale16by8(st.t, qadd8(st.speed, 16));
    const drops = Math.min(24, Math.floor(units / 10) - Math.floor((d.lastUnits ?? units) / 10));
    d.lastUnits = units;
    for (let n = 0; n < drops; n++) {
      const i = (Math.random() * st.ledCount) | 0;
      if (i < st.leds.length) d.colors[i] = pick(st);
    }
    for (const k of st.leds) {
      const [h, s] = d.colors[k.i];
      put(out, k.i, h, s, st.v);
    }
  };
}

function raindropColor(st) {
  let deltaH = Math.trunc((((st.h + 180) % 360) - st.h) / 4);
  if (deltaH > 127) deltaH -= 256;
  else if (deltaH < -127) deltaH += 256;
  return [st.h + deltaH * (random8() & 0x03), st.s];
}

const jellybeanColor = () => [random8(), 127 + ((Math.random() * 129) | 0)];

function typingHeatmap(st, out) {
  const d = st.data;
  if (!d.heat) { d.heat = new Float32Array(st.leds.length); d.decayAt = st.t; }

  const steps = Math.floor((st.t - d.decayAt) / 25);
  if (steps > 0) {
    d.decayAt += steps * 25;
    for (let i = 0; i < d.heat.length; i++) d.heat[i] = Math.max(0, d.heat[i] - steps);
  }
  for (const k of st.leds) {
    const val = d.heat[k.i] | 0;
    put(out, k.i, 170 - qsub8(val, 85), st.s, scale8((qadd8(170, val) - 170) * 3, st.v));
  }
}

typingHeatmap.onHit = (st, idx) => {
  const d = st.data;
  if (!d.heat) return;
  const a = st.leds[idx];
  for (const k of st.leds) {
    if (k.i === idx) { d.heat[k.i] = qadd8(d.heat[k.i], 32); continue; }
    const dist = Math.sqrt((k.lx - a.lx) ** 2 + (k.ly - a.ly) ** 2) | 0;
    if (dist <= 40) d.heat[k.i] = qadd8(d.heat[k.i], Math.min(16, qsub8(40, dist)));
  }
};

function digitalRain(st, out) {
  const d = st.data;
  const { rows, cols } = st.matrix;
  const max = st.v || 1;
  if (!d.grid) { d.grid = Array.from({ length: rows }, () => new Array(cols).fill(0)); d.frame = Math.floor(st.t / 32); d.drop = 0; d.decay = 0; }
  const decayTicks = Math.floor(255 / max);
  const frame = Math.floor(st.t / 32);
  for (let f = Math.min(frame - d.frame, 8); f > 0; f--) {
    d.decay++;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const g = d.grid[row];
        if (row === 0 && d.drop === 0 && Math.random() < 1 / 24) g[col] = max;
        else if (g[col] > 0 && g[col] < max && d.decay === decayTicks) g[col]--;
      }
    }
    if (d.decay >= decayTicks) d.decay = 0;
    if (++d.drop > 28) {
      d.drop = 0;
      for (let row = rows - 1; row > 0; row--) {
        for (let col = 0; col < cols; col++) {
          if (row === rows - 1 && d.grid[row][col] === max) d.grid[row][col]--;
          if (d.grid[row - 1][col] >= max) { d.grid[row - 1][col] = max - 1; d.grid[row][col] = max; }
        }
      }
    }
  }
  d.frame = frame;
  const pure = (max * 3) >> 2;
  for (const k of st.leds) {
    const val = d.grid[k.row][k.col];
    if (val > pure) {
      const boost = Math.floor((((max * 3) >> 2) * (val - pure)) / Math.max(1, max - pure));
      put(out, k.i, 85, 255 - (boost / max) * 255, max);
    } else {
      put(out, k.i, 85, 255, Math.floor((max * val) / Math.max(1, pure)));
    }
  }
}

const hitTick = (st, hit) => Math.min(0xffff, st.t - hit.t);

function reactive(math) {
  return (st, out) => {
    const maxTick = Math.floor(65535 / qadd8(st.speed, 1));
    for (const k of st.leds) {
      let tick = maxTick;
      for (let j = st.hits.length - 1; j >= 0; j--) {
        if (st.hits[j].i === k.i) { tick = Math.min(maxTick, hitTick(st, st.hits[j])); break; }
      }
      const offset = Math.min(255, scale16by8(tick, qadd8(st.speed, 1)));
      const [h, s, v] = math(st, offset);
      put(out, k.i, h, s, v);
    }
  };
}

function splash(math, multi) {
  return (st, out) => {
    const start = multi ? 0 : Math.max(0, st.hits.length - 1);
    for (const k of st.leds) {
      let hsv = [st.h, st.s, 0];
      for (let j = start; j < st.hits.length; j++) {
        const hit = st.hits[j];
        const dx = k.lx - hit.x;
        const dy = k.ly - hit.y;
        const dist = Math.sqrt(dx * dx + dy * dy) | 0;
        const tick = scale16by8(hitTick(st, hit), qadd8(st.speed, 1));
        hsv = math(st, hsv, dx, dy, dist, tick);
      }
      put(out, k.i, hsv[0], hsv[1], scale8(hsv[2], st.v));
    }
  };
}

const wideMath = (st, [h, s, v], dx, dy, dist, tick) => {
  const effect = Math.min(255, tick + dist * 5);
  return [h, s, qadd8(v, 255 - effect)];
};

const crossMath = (st, [h, s, v], dx, dy, dist, tick) => {
  let effect = tick + dist;
  const ax = Math.min(255, Math.abs(dx) * 16);
  const ay = Math.min(255, Math.abs(dy) * 16);
  effect = Math.min(255, effect + Math.min(ax, ay));
  return [h, s, qadd8(v, 255 - effect)];
};

const nexusMath = (st, [, s, v], dx, dy, dist, tick) => {
  let effect = tick < dist ? 255 : Math.min(255, tick - dist);
  if (dist > 72) effect = 255;
  if ((dx > 8 || dx < -8) && (dy > 8 || dy < -8)) effect = 255;
  return [st.h + Math.trunc(dy / 4), s, qadd8(v, 255 - effect)];
};

const splashMath = (st, [h, s, v], dx, dy, dist, tick) => {
  const effect = tick < dist ? 255 : Math.min(255, tick - dist);
  return [h + effect, s, qadd8(v, 255 - effect)];
};

const solidSplashMath = (st, [h, s, v], dx, dy, dist, tick) => {
  const effect = tick < dist ? 255 : Math.min(255, tick - dist);
  return [h, s, qadd8(v, 255 - effect)];
};

export const CATEGORIES = ['static', 'animated', 'rainbow', 'reactive', 'other'];

export const FEATURED = [
  'none', 'solid_color', 'breathing', 'hue_wave', 'raindrops', 'digital_rain',
  'cycle_all', 'cycle_left_right', 'cycle_spiral', 'typing_heatmap', 'game_mode',
];

export const EFFECTS = {
  none: {
    cat: 'static', color: false, speed: false, pl: 'Wyłączone', en: 'Off',
    render: perLed(() => [0, 0, 0]),
  },
  solid_color: {
    cat: 'static', color: true, speed: false, pl: 'Jednolity kolor', en: 'Solid colour',
    render: perLed((k, st) => [st.h, st.s, st.v]),
  },
  gradient_up_down: {
    cat: 'animated', color: true, speed: true, pl: 'Gradient pionowy', en: 'Vertical gradient',
    render: perLed((k, st) => [st.h + scale8(64, st.speed) * (k.ly >> 4), st.s, st.v]),
  },
  gradient_left_right: {
    cat: 'animated', color: true, speed: true, pl: 'Gradient poziomy', en: 'Horizontal gradient',
    render: perLed((k, st) => [st.h + ((scale8(64, st.speed) * k.lx) >> 5), st.s, st.v]),
  },
  breathing: {
    cat: 'animated', color: true, speed: true, pl: 'Oddychanie', en: 'Breathing',
    render: perLed((k, st) => [st.h, st.s, scale8(clamp8(abs8(sin8(timeDiv(st, 3)) - 128) * 2), st.v)]),
  },
  band_sat: {
    cat: 'animated', color: true, speed: true, pl: 'Pas nasycenia', en: 'Saturation band',
    render: perLed((k, st) => {
      const s = st.s - Math.abs(scale8(k.lx, 228) + 28 - timeDiv(st, 2)) * 8;
      return [st.h, scale8(Math.max(0, s), st.s), st.v];
    }),
  },
  band_val: {
    cat: 'animated', color: true, speed: true, pl: 'Pas jasności', en: 'Brightness band',
    render: perLed((k, st) => {
      const v = st.v - Math.abs(scale8(k.lx, 228) + 28 - timeDiv(st, 2)) * 8;
      return [st.h, st.s, scale8(Math.max(0, v), st.v)];
    }),
  },
  band_pinwheel_sat: {
    cat: 'animated', color: true, speed: true, pl: 'Wiatraczek nasycenia', en: 'Saturation pinwheel',
    render: perLed((k, st) => [st.h, scale8(st.s - timeDiv(st, 2) - atan2_8(k.dy, k.dx) * 3, st.s), st.v]),
  },
  band_pinwheel_val: {
    cat: 'animated', color: true, speed: true, pl: 'Wiatraczek jasności', en: 'Brightness pinwheel',
    render: perLed((k, st) => [st.h, st.s, scale8(st.v - timeDiv(st, 2) - atan2_8(k.dy, k.dx) * 3, st.v)]),
  },
  band_spiral_sat: {
    cat: 'animated', color: true, speed: true, pl: 'Spirala nasycenia', en: 'Saturation spiral',
    render: perLed((k, st) => [st.h, scale8(st.s + k.dist - timeDiv(st, 2) - atan2_8(k.dy, k.dx), st.s), st.v]),
  },
  band_spiral_val: {
    cat: 'animated', color: true, speed: true, pl: 'Spirala jasności', en: 'Brightness spiral',
    render: perLed((k, st) => [st.h, st.s, scale8(st.v + k.dist - timeDiv(st, 2) - atan2_8(k.dy, k.dx), st.v)]),
  },
  cycle_all: {
    cat: 'rainbow', color: false, speed: true, pl: 'Cykl kolorów', en: 'Colour cycle',
    render: perLed((k, st) => [timeCycle(st), st.s, st.v]),
  },
  cycle_left_right: {
    cat: 'rainbow', color: false, speed: true, pl: 'Tęcza pozioma', en: 'Horizontal rainbow',
    render: perLed((k, st) => [k.lx - timeCycle(st), st.s, st.v]),
  },
  cycle_up_down: {
    cat: 'rainbow', color: false, speed: true, pl: 'Tęcza pionowa', en: 'Vertical rainbow',
    render: perLed((k, st) => [k.ly - timeCycle(st), st.s, st.v]),
  },
  rainbow_moving_chevron: {
    cat: 'rainbow', color: true, speed: true, pl: 'Szewron', en: 'Chevron',
    render: perLed((k, st) => [st.h + abs8(k.ly - st.center.y) + (k.lx - timeDiv(st, 2)), st.s, st.v]),
  },
  cycle_out_in: {
    cat: 'rainbow', color: false, speed: true, pl: 'Tęcza od środka', en: 'Rainbow from centre',
    render: perLed((k, st) => [(3 * k.dist) / 2 + timeCycle(st), st.s, st.v]),
  },
  cycle_out_in_dual: {
    cat: 'rainbow', color: false, speed: true, pl: 'Podwójna tęcza', en: 'Dual rainbow',
    render: perLed((k, st) => {
      const dx = (st.center.x >> 1) - abs8(k.dx);
      const dist = Math.sqrt(dx * dx + k.dy * k.dy) | 0;
      return [3 * dist + timeCycle(st), st.s, st.v];
    }),
  },
  cycle_pinwheel: {
    cat: 'rainbow', color: false, speed: true, pl: 'Tęczowy wiatraczek', en: 'Rainbow pinwheel',
    render: perLed((k, st) => [atan2_8(k.dy, k.dx) + timeCycle(st), st.s, st.v]),
  },
  cycle_spiral: {
    cat: 'rainbow', color: false, speed: true, pl: 'Tęczowa spirala', en: 'Rainbow spiral',
    render: perLed((k, st) => [k.dist - timeCycle(st) - atan2_8(k.dy, k.dx), st.s, st.v]),
  },
  dual_beacon: {
    cat: 'rainbow', color: true, speed: true, pl: 'Podwójna latarnia', en: 'Dual beacon',
    render: perLed((k, st) => {
      const t = timeDiv(st, 2);
      return [st.h + Math.trunc((k.dy * (cos8(t) - 128) + k.dx * (sin8(t) - 128)) / 128), st.s, st.v];
    }),
  },
  rainbow_beacon: {
    cat: 'rainbow', color: true, speed: true, pl: 'Latarnia', en: 'Beacon',
    render: perLed((k, st) => {
      const t = timeDiv(st, 2);
      return [st.h + Math.trunc((k.dy * 2 * (cos8(t) - 128) + k.dx * 2 * (sin8(t) - 128)) / 128), st.s, st.v];
    }),
  },
  rainbow_pinwheels: {
    cat: 'rainbow', color: true, speed: true, pl: 'Wiatraczki', en: 'Pinwheels',
    render: perLed((k, st) => {
      const t = timeDiv(st, 2);
      return [st.h + Math.trunc((k.dy * 3 * (cos8(t) - 128) + (56 - abs8(k.dx)) * 3 * (sin8(t) - 128)) / 128), st.s, st.v];
    }),
  },
  raindrops: {
    cat: 'animated', color: true, speed: true, pl: 'Krople', en: 'Raindrops',
    render: raindropsRunner(raindropColor),
  },
  jellybean_raindrops: {
    cat: 'animated', color: false, speed: true, pl: 'Kolorowe krople', en: 'Jellybean drops',
    render: raindropsRunner(jellybeanColor),
  },
  hue_breathing: {
    cat: 'animated', color: true, speed: true, pl: 'Oddech odcienia', en: 'Hue breathing',
    render: perLed((k, st) => [st.h + scale8(clamp8(abs8(sin8(timeDiv(st, 3)) - 128) * 2), 12), st.s, st.v]),
  },
  hue_pendulum: {
    cat: 'animated', color: true, speed: true, pl: 'Wahadło', en: 'Pendulum',
    render: perLed((k, st) => [st.h + scale8(clamp8(abs8(sin8(timeDiv(st, 2)) + k.lx - 128) * 2), 12), st.s, st.v]),
  },
  hue_wave: {
    cat: 'animated', color: true, speed: true, pl: 'Fala', en: 'Wave',
    render: perLed((k, st) => [st.h + scale8(abs8(k.lx - timeDiv(st, 2)), 24), st.s, st.v]),
  },
  typing_heatmap: {
    cat: 'reactive', color: false, speed: false, keys: true, pl: 'Mapa ciepła', en: 'Heatmap',
    render: typingHeatmap,
  },
  digital_rain: {
    cat: 'animated', color: false, speed: false, pl: 'Cyfrowy deszcz', en: 'Digital rain',
    render: digitalRain,
  },
  solid_reactive_simple: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Rozbłysk', en: 'Flash',
    render: reactive((st, offset) => [st.h, st.s, scale8(255 - offset, st.v)]),
  },
  solid_reactive: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Zmiana koloru', en: 'Colour shift',
    render: reactive((st, offset) => [st.h + qsub8(130, offset), st.s, st.v]),
  },
  solid_reactive_wide: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Fala od klawisza', en: 'Key wave',
    render: splash(wideMath, false),
  },
  solid_reactive_multiwide: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Fale od klawiszy', en: 'Key waves',
    render: splash(wideMath, true),
  },
  solid_reactive_cross: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Krzyż', en: 'Cross',
    render: splash(crossMath, false),
  },
  solid_reactive_multicross: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Krzyże', en: 'Crosses',
    render: splash(crossMath, true),
  },
  solid_reactive_nexus: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Nexus', en: 'Nexus',
    render: splash(nexusMath, false),
  },
  solid_reactive_multinexus: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Nexus wielokrotny', en: 'Multi nexus',
    render: splash(nexusMath, true),
  },
  splash: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Plusk', en: 'Splash',
    render: splash(splashMath, false),
  },
  multisplash: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Plusk wielokrotny', en: 'Multi splash',
    render: splash(splashMath, true),
  },
  solid_splash: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Jednolity plusk', en: 'Solid splash',
    render: splash(solidSplashMath, false),
  },
  solid_multisplash: {
    cat: 'reactive', color: true, speed: true, keys: true, pl: 'Jednolity plusk wielokrotny', en: 'Solid multi splash',
    render: splash(solidSplashMath, true),
  },
  game_mode: {
    cat: 'static', color: true, speed: false, pl: 'Tryb gry', en: 'Game mode',
    render: onlyLeds([0, 33, 47, 48, 49, 72, 80, 81, 82]),
  },
  position_mode: {
    cat: 'static', color: true, speed: false, pl: 'Tryb pozycyjny', en: 'Position mode',
    render: onlyLeds([50, 53, 72]),
  },
  signalrgb: {
    cat: 'other', color: false, speed: false, pl: 'SignalRGB (z komputera)', en: 'SignalRGB (from PC)',
    render: perLed(() => [0, 0, 0]),
  },
  unknown: {
    cat: 'other', color: true, speed: true, pl: 'Dodatkowy', en: 'Extra',
    render: perLed((k, st) => [st.h, st.s, st.v]),
  },
};

export const effectName = (fx, lang) => {
  const meta = EFFECTS[fx.key] ?? EFFECTS.unknown;
  return fx.key === 'unknown' ? `${meta[lang]} ${fx.n}` : meta[lang];
};

export class EffectEngine {
  constructor(def) {
    this.def = def;
    this.leds = def.keys.map(k => {
      const lx = Math.round(k.lx);
      const ly = Math.round(k.ly);
      const dx = lx - def.center.x;
      const dy = ly - def.center.y;
      return { i: k.i, lx, ly, dx, dy, dist: Math.sqrt(dx * dx + dy * dy) | 0, row: k.row, col: k.col };
    });
    const n = this.leds.length;
    this.out = { h: new Uint8Array(n), s: new Uint8Array(n), v: new Uint8Array(n) };
    this.hits = [];
    this.data = {};
    this.key = null;
  }

  setEffect(key) {
    if (key !== this.key) { this.key = key; this.data = {}; }
  }

  hit(i, now) {
    const k = this.leds[i];
    if (!k) return;
    this.hits.push({ i, x: k.lx, y: k.ly, t: now });
    if (this.hits.length > HITS_TO_REMEMBER) this.hits.shift();
    if (this.lighting) EFFECTS[this.key]?.render.onHit?.(this.state(now), i);
  }

  state(now) {
    const l = this.lighting;
    return {
      t: now, h: l.hue, s: l.sat, v: l.brightness, speed: l.speed,
      leds: this.leds, hits: this.hits, data: this.data,
      center: this.def.center, ledCount: this.def.ledCount, matrix: this.def.matrix,
    };
  }

  render(lighting, now) {
    this.lighting = lighting;
    (EFFECTS[this.key] ?? EFFECTS.unknown).render(this.state(now), this.out);
    return this.out;
  }
}
