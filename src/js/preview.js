import { EffectEngine } from './effects.js';
import { SideLight, sideLedPositions } from './sidelight.js';
import { hsvToRgb } from './color.js';

const GLOW_PX = 8;
const CASE = 0.76;
const MAX_UNIT = 76;
const MIN_UNIT = 12;
const LEGEND_MIN_UNIT = 26;
const HALO_MARGIN = 0.9;
const HALO_SCALE = 0.25;
const DRAG_PX = 5;

const el = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

const isModifier = label => label.length > 2 && !/^F\d+$/.test(label);

const ARROWS = { '↑': 0, '→': 90, '↓': 180, '←': 270 };
const arrowSvg = deg => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${deg} 8 8)"/></svg>`;

const inkFor = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b > 165 ? '19,31,36' : '255,255,255');

function fillLegend(legend, label) {
  if (label in ARROWS) legend.innerHTML = arrowSvg(ARROWS[label]);
  else legend.textContent = label;
}

export class KeyboardPreview {
  constructor(root) {
    this.root = root;
    this.lighting = null;
    this.mode = 'lighting';
    this.selection = new Set();
    this.marks = new Set();
    this.keyColors = null;
    this.baseColor = [0, 0, 0];
    this.onSelect = null;
    this.frame = this.frame.bind(this);
    new ResizeObserver(() => this.layout()).observe(root);
  }

  setDevice(def) {
    this.def = def;
    this.engine = new EffectEngine(def);

    const wrap = el('div', 'kb-wrap');
    const kb = el('div', 'kb');
    const glow = el('canvas', 'kb-glow');
    glow.width = def.size.w * GLOW_PX;
    glow.height = def.size.h * GLOW_PX;
    const keys = el('div', 'kb-keys');
    this.keyEls = def.keys.map(k => {
      const key = el('button', 'kb-key');
      key.type = 'button';
      key.tabIndex = -1;
      key.dataset.i = k.i;
      key.setAttribute('aria-hidden', 'true');
      key.style.setProperty('--x', k.x);
      key.style.setProperty('--y', k.y);
      key.style.setProperty('--w', k.w);
      if (isModifier(k.label)) key.classList.add('kb-key--mod');
      const legend = el('span', 'kb-legend');
      fillLegend(legend, k.label);
      key.append(legend);
      keys.append(key);
      return { el: key, legend, label: k.label, last: '' };
    });
    this.marquee = el('div', 'kb-marquee');
    keys.append(this.marquee);
    kb.append(glow, keys);
    wrap.append(kb);

    this.side = null;
    if (def.sideLight) {
      const halo = el('canvas', 'kb-halo');
      const strip = el('canvas', 'kb-strip');
      wrap.prepend(halo);
      kb.append(strip);
      this.side = { engine: new SideLight(), pos: sideLedPositions(), halo, strip };
    }
    this.root.replaceChildren(wrap);

    this.kb = kb;
    this.keysEl = keys;
    this.glowCanvas = glow;
    this.glow = glow.getContext('2d');
    this.bindPointer(keys);
    this.layout();
    this.applyMode();
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  bindPointer(keys) {
    let drag = null;
    const keyAt = target => target.closest?.('.kb-key');
    keys.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const key = keyAt(e.target);
      if (this.mode === 'lighting') {
        if (key) this.press(Number(key.dataset.i));
        return;
      }
      e.preventDefault();
      keys.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, key, additive: e.shiftKey || e.ctrlKey || e.metaKey, moved: false };
    });
    keys.addEventListener('pointermove', e => {
      if (!drag || this.mode !== 'perkey') return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_PX) return;
      drag.moved = true;
      const box = keys.getBoundingClientRect();
      const left = Math.min(drag.x, e.clientX), top = Math.min(drag.y, e.clientY);
      const right = Math.max(drag.x, e.clientX), bottom = Math.max(drag.y, e.clientY);
      Object.assign(this.marquee.style, {
        display: 'block', left: `${left - box.left}px`, top: `${top - box.top}px`, width: `${right - left}px`, height: `${bottom - top}px`,
      });
      drag.hits = this.keyEls.filter(k => {
        const r = k.el.getBoundingClientRect();
        return r.right > left && r.left < right && r.bottom > top && r.top < bottom;
      }).map(k => Number(k.el.dataset.i));
      for (const k of this.keyEls) k.el.classList.toggle('is-marking', drag.hits.includes(Number(k.el.dataset.i)));
    });
    const end = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      this.marquee.style.display = 'none';
      for (const k of this.keyEls) k.el.classList.remove('is-marking');
      if (d.moved) this.onSelect?.({ type: 'box', indices: d.hits ?? [], additive: d.additive });
      else if (d.key) this.onSelect?.({ type: 'click', index: Number(d.key.dataset.i), additive: d.additive });
      else this.onSelect?.({ type: 'clear' });
    };
    keys.addEventListener('pointerup', end);
    keys.addEventListener('pointercancel', end);
  }

  layout() {
    if (!this.def) return;
    const { w, h } = this.def.size;
    const byWidth = (this.root.clientWidth - 4) / (w + CASE);
    const byHeight = (this.root.clientHeight - 16) / (h + CASE + 0.2);
    const u = Math.max(MIN_UNIT, Math.min(MAX_UNIT, byWidth, byHeight));
    this.root.style.setProperty('--u', `${u}px`);
    this.kb?.classList.toggle('kb--tiny', u < LEGEND_MIN_UNIT);
    this.root.style.setProperty('--cols', w);
    this.root.style.setProperty('--rows', h);
    this.u = u;

    if (this.side) {
      const dpr = window.devicePixelRatio || 1;
      const cw = u * (w + CASE), ch = u * (h + CASE);
      this.side.size = { cw, ch, m: u * HALO_MARGIN };
      this.side.halo.width = Math.ceil((cw + 2 * u * HALO_MARGIN) * HALO_SCALE);
      this.side.halo.height = Math.ceil((ch + 2 * u * HALO_MARGIN) * HALO_SCALE);
      this.side.strip.width = Math.ceil(cw * dpr);
      this.side.strip.height = Math.ceil(ch * dpr);
      this.side.dpr = dpr;
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.applyMode();
  }

  applyMode() {
    if (!this.kb) return;
    this.kb.classList.toggle('kb--paint', this.mode === 'perkey');
    this.kb.classList.toggle('kb--keymap', this.mode === 'keymap');
    this.applySelection();
    for (const k of this.keyEls) k.last = '';
  }

  setSelection(selection) {
    this.selection = selection;
    this.applySelection();
  }

  setMarks(marks) {
    this.marks = marks;
    this.applySelection();
  }

  applySelection() {
    if (!this.keyEls) return;
    const editing = this.mode !== 'lighting';
    this.keyEls.forEach((k, i) => {
      k.el.classList.toggle('is-selected', editing && this.selection.has(i));
      k.el.classList.toggle('is-changed', this.mode === 'keymap' && this.marks.has(i));
    });
  }

  setLegends(labels) {
    if (!this.keyEls) return;
    this.keyEls.forEach((k, i) => fillLegend(k.legend, labels?.[i] ?? k.label));
  }

  setKeyColors(colors, base) {
    this.keyColors = colors;
    this.baseColor = base ?? [0, 0, 0];
  }

  setLighting(lighting, effectKey) {
    this.lighting = lighting;
    this.engine.setEffect(effectKey);
  }

  setSide(settings) {
    this.sideSettings = settings;
  }

  drawSide(now) {
    const s = this.side;
    if (!s?.size || !this.sideSettings) return;
    const leds = s.engine.render(this.sideSettings, now);
    const { cw, ch, m } = s.size;
    const u = this.u;

    const hc = s.halo.getContext('2d');
    hc.clearRect(0, 0, s.halo.width, s.halo.height);
    hc.save();
    hc.scale(HALO_SCALE, HALO_SCALE);
    leds.forEach(([r, g, b], i) => {
      const [px, py] = s.pos[i];
      hc.fillStyle = `rgb(${r},${g},${b})`;
      hc.beginPath();
      hc.arc(m + px * cw, m + py * ch, u * 0.55, 0, Math.PI * 2);
      hc.fill();
    });
    hc.restore();

    const sc = s.strip.getContext('2d');
    const k = s.dpr;
    sc.setTransform(k, 0, 0, k, 0, 0);
    sc.clearRect(0, 0, cw, ch);
    const inset = u * 0.07;
    const thick = Math.max(1.5, u * 0.06);
    leds.forEach(([r, g, b], i) => {
      if (!(r | g | b)) return;
      const [px, py] = s.pos[i];
      const horizontal = py === 0 || py === 1;
      const x = Math.min(cw - inset, Math.max(inset, px * cw));
      const y = Math.min(ch - inset, Math.max(inset, py * ch));
      const len = horizontal ? (cw * 0.92) / (i < 18 ? 18 : 17) : (ch * 0.76) / 5;
      sc.fillStyle = `rgb(${r},${g},${b})`;
      sc.shadowColor = `rgb(${r},${g},${b})`;
      sc.shadowBlur = u * 0.25;
      if (horizontal) sc.fillRect(x - len / 2, y - thick / 2, len * 0.98, thick);
      else sc.fillRect(x - thick / 2, y - len / 2, thick, len * 0.98);
    });
  }

  press(i) {
    this.engine.hit(i, performance.now());
    const k = this.keyEls[i];
    if (!k) return;
    k.el.classList.add('is-pressed');
    clearTimeout(k.timer);
    k.timer = setTimeout(() => k.el.classList.remove('is-pressed'), 110);
  }

  pressCode(code) {
    const key = this.def?.keys.find(k => k.code === code);
    if (key && this.mode === 'lighting') this.press(key.i);
    return Boolean(key);
  }

  keyRgb(i, out) {
    if (this.mode === 'keymap') return [0, 0, 0];
    if (this.mode === 'perkey') return this.keyColors?.[i] ?? this.baseColor;
    return hsvToRgb(out.h[i], out.s[i], out.v[i]);
  }

  frame(now) {
    this.raf = requestAnimationFrame(this.frame);
    if (!this.lighting || document.hidden) return;
    this.drawSide(now);
    const out = this.mode === 'lighting' ? this.engine.render(this.lighting, now) : null;
    const ctx = this.glow;
    ctx.clearRect(0, 0, this.glowCanvas.width, this.glowCanvas.height);
    for (const k of this.def.keys) {
      const [r, g, b] = this.keyRgb(k.i, out);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(k.x * GLOW_PX, k.y * GLOW_PX, k.w * GLOW_PX, GLOW_PX);

      const state = `${r},${g},${b}`;
      const key = this.keyEls[k.i];
      if (key.last !== state) {
        key.last = state;
        const max = Math.max(r, g, b);
        const full = max ? [r, g, b].map(c => Math.round((c / max) * 255)) : [0, 0, 0];
        key.el.style.setProperty('--led', full.join(','));
        key.el.style.setProperty('--a', (max / 255).toFixed(2));
        key.el.style.setProperty('--ink', inkFor(...full));
      }
    }
  }
}
