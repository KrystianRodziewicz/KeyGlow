import { hsvToRgb } from './color.js';
import * as store from './store.js';

const PALETTE = [
  ['red', 0, 255], ['orange', 16, 255], ['yellow', 40, 255], ['green', 85, 255], ['teal', 120, 255],
  ['blue', 165, 255], ['purple', 192, 255], ['pink', 225, 255], ['white', 0, 0],
];

const GROUPS = {
  all: () => true,
  wasd: k => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k.code),
  arrows: k => k.code.startsWith('Arrow'),
  letters: k => /^Key[A-Z]$/.test(k.code),
  digits: k => /^Digit\d$/.test(k.code),
  frow: k => /^F\d+$/.test(k.code) || k.code === 'Escape',
  mods: k => /Shift|Control|Alt|Meta|CapsLock|Tab|Enter|Backspace/.test(k.code) || k.label === 'Fn',
};

const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const OFF = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12L12 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const $ = id => document.getElementById(id);

export class PerKeyEditor {
  constructor(ctx) {
    this.ctx = ctx;
    this.selection = new Set();
    this.custom = false;
    this.hue = 0;
    this.direct = false;
    this.pushTimer = null;
    this.load();
  }

  get keys() { return this.ctx.def().keys; }
  get storageKey() { return `perkey.${this.ctx.def().id}`; }

  load() {
    const saved = store.get(this.storageKey);
    this.colors = saved?.colors?.length === this.keys.length ? saved.colors : this.keys.map(() => null);
    this.base = saved?.base ?? [0, 0, 0];
  }

  persist() {
    store.set(this.storageKey, { colors: this.colors, base: this.base });
  }

  ledColors() {
    return this.keys.map(k => this.colors[k.i] ?? this.base);
  }

  async activate() {
    const kb = this.ctx.kb();
    if (!kb) return;
    try {
      await kb.directOn();
      this.direct = true;
      await kb.directColors(this.ledColors());
    } catch (err) {
      this.ctx.onError(err);
    }
  }

  async deactivate() {
    const kb = this.ctx.kb();
    const was = this.direct;
    this.direct = false;
    clearTimeout(this.pushTimer);
    if (kb && was) {
      try { await kb.directOff(); } catch (err) { this.ctx.onError(err); }
    }
  }

  push() {
    this.ctx.preview.setKeyColors(this.colors, this.base);
    if (!this.direct) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      const kb = this.ctx.kb();
      if (kb && this.direct) kb.directColors(this.ledColors()).catch(err => this.ctx.onError(err));
    }, 40);
  }

  select(event) {
    if (event.type === 'clear') {
      if (!event.additive) this.selection.clear();
    } else if (event.type === 'click') {
      if (this.selection.has(event.index)) this.selection.delete(event.index);
      else this.selection.add(event.index);
    } else if (event.type === 'box') {
      if (!event.additive) this.selection.clear();
      for (const i of event.indices) this.selection.add(i);
    }
    this.syncSelection();
  }

  selectGroup(name) {
    this.selection = name === 'none' ? new Set() : new Set(this.keys.filter(GROUPS[name]).map(k => k.i));
    this.syncSelection();
  }

  syncSelection() {
    this.ctx.preview.setSelection(this.selection);
    this.render();
  }

  paint(rgb) {
    if (!this.selection.size) {
      this.ctx.toast(this.ctx.t('perkey.selectFirst'));
      return;
    }
    for (const i of this.selection) this.colors[i] = rgb;
    this.changed();
  }

  clearSelected() {
    for (const i of this.selection) this.colors[i] = null;
    this.changed();
  }

  setBase(rgb) {
    this.base = rgb;
    this.changed();
  }

  changed() {
    this.push();
    this.ctx.markDirty();
    this.render();
  }

  selectedColor() {
    const picked = [...this.selection].map(i => this.colors[i] ?? null);
    if (!picked.length || !picked.every(c => same(c, picked[0]) || (!c && !picked[0]))) return undefined;
    return picked[0];
  }

  bubble(rgb, label, onClick, active, extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `bubble${extra}${active ? ' is-active' : ''}`;
    b.style.setProperty('--c', rgb ? `rgb(${rgb.join(',')})` : 'var(--well)');
    b.style.color = rgb && rgb[0] + rgb[1] + rgb[2] > 600 ? '#131f24' : '#fff';
    b.innerHTML = rgb ? CHECK : OFF;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  }

  render() {
    const t = this.ctx.t;
    $('pkGroups').replaceChildren(...['all', 'wasd', 'arrows', 'letters', 'digits', 'frow', 'mods', 'none'].map(name => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.textContent = t(`perkey.g.${name}`);
      b.addEventListener('click', () => this.selectGroup(name));
      return b;
    }));
    const n = this.selection.size;
    $('pkCount').textContent = n ? t('perkey.count', { n }) : t('perkey.none');

    const current = this.selectedColor();
    const palette = PALETTE.map(([name, h, s]) => {
      const rgb = hsvToRgb(h, s, 255);
      return this.bubble(rgb, t(`color.${name}`), () => { this.custom = false; this.paint(rgb); }, !this.custom && same(current, rgb));
    });
    const custom = document.createElement('button');
    custom.type = 'button';
    custom.className = `bubble bubble--custom${this.custom ? ' is-active' : ''}`;
    custom.innerHTML = CHECK;
    custom.style.color = '#fff';
    custom.title = t('color.custom');
    custom.addEventListener('click', () => {
      this.custom = true;
      this.paint(hsvToRgb(this.hue, 255, 255));
    });
    const off = this.bubble(null, t('perkey.off'), () => { this.custom = false; this.paint([0, 0, 0]); }, same(current, [0, 0, 0]), ' bubble--off');
    $('pkBubbles').replaceChildren(...palette, custom, off);
    $('pkHueRow').hidden = !this.custom;
    $('pkHue').value = this.hue;
    $('pkClear').disabled = !n;

    $('pkBase').replaceChildren(
      this.bubble(null, t('perkey.off'), () => this.setBase([0, 0, 0]), same(this.base, [0, 0, 0]), ' bubble--off'),
      ...PALETTE.map(([name, h, s]) => {
        const rgb = hsvToRgb(h, s, s ? 150 : 110);
        return this.bubble(rgb, t(`color.${name}`), () => this.setBase(rgb), same(this.base, rgb));
      }),
    );
  }

  bind() {
    $('pkHue').addEventListener('input', e => {
      this.hue = Number(e.target.value);
      this.paint(hsvToRgb(this.hue, 255, 255));
    });
    $('pkClear').addEventListener('click', () => this.clearSelected());
  }
}

