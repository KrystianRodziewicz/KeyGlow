import { KEYCODE_GROUPS, keycodeLabel, keycodeName, isLayerKey } from './keycodes.js';
import * as store from './store.js';

const LAYERS = [
  { id: 'win', layer: 2 },
  { id: 'winfn', layer: 3 },
  { id: 'mac', layer: 0 },
  { id: 'macfn', layer: 1 },
];
const READ_LAYERS = 4;
const TRANSPARENT = 0x0001;

const $ = id => document.getElementById(id);

export class KeymapEditor {
  constructor(ctx) {
    this.ctx = ctx;
    this.layers = null;
    this.original = null;
    this.pending = new Map();
    this.layer = ctx.platform === 'darwin' ? 0 : 2;
    this.selected = null;
    this.group = 'letters';
  }

  get def() { return this.ctx.def(); }
  get storageKey() { return `keymap.original.${this.def.id}`; }
  get hasPending() { return this.pending.size > 0; }

  index(i) {
    const k = this.def.keys[i];
    return k.row * this.def.matrix.cols + k.col;
  }

  async load(kb) {
    const count = await kb.layerCount();
    this.layers = await kb.readKeymap(Math.min(count, READ_LAYERS), this.def.matrix.rows, this.def.matrix.cols);
    this.original = store.get(this.storageKey);
    if (!Array.isArray(this.original) || this.original.length !== this.layers.length) {
      this.original = this.layers.map(l => [...l]);
      store.set(this.storageKey, this.original);
    }
    this.pending.clear();
    this.sideLayer = count > 4 ? (await kb.readKeymap(1, this.def.matrix.rows, this.def.matrix.cols, 4))[0] : null;
  }

  unload() {
    this.layers = null;
    this.sideLayer = null;
    this.pending.clear();
    this.selected = null;
  }

  code(layer, i) {
    const key = `${layer}:${i}`;
    return this.pending.has(key) ? this.pending.get(key) : this.layers?.[layer]?.[this.index(i)];
  }

  labels() {
    if (!this.layers) return null;
    return this.def.keys.map(k => {
      const code = this.code(this.layer, k.i);
      return code === TRANSPARENT ? '' : keycodeLabel(code);
    });
  }

  marks() {
    const marks = new Set();
    if (!this.layers) return marks;
    for (const k of this.def.keys) {
      if (this.code(this.layer, k.i) !== this.original[this.layer][this.index(k.i)]) marks.add(k.i);
    }
    return marks;
  }

  sync() {
    const preview = this.ctx.preview;
    preview.setLegends(this.labels());
    preview.setMarks(this.marks());
    preview.setSelection(this.selected == null ? new Set() : new Set([this.selected]));
    this.render();
  }

  select(event) {
    if (event.type !== 'click') return;
    if (!this.layers) {
      this.ctx.toast(this.ctx.t('keymap.offline'));
      return;
    }
    if (isLayerKey(this.code(this.layer, event.index))) {
      this.ctx.toast(this.ctx.t('keymap.locked'));
      return;
    }
    this.selected = event.index;
    this.sync();
  }

  assign(code) {
    if (this.selected == null) {
      this.ctx.toast(this.ctx.t('keymap.pickFirst'));
      return;
    }
    const key = `${this.layer}:${this.selected}`;
    if (code === this.layers[this.layer][this.index(this.selected)]) this.pending.delete(key);
    else this.pending.set(key, code);
    this.ctx.markDirty();
    this.sync();
  }

  restoreKey() {
    if (this.selected == null) return;
    this.assign(this.original[this.layer][this.index(this.selected)]);
  }

  restoreAll() {
    if (!this.layers || !confirm(this.ctx.t('keymap.restoreConfirm'))) return;
    this.layers.forEach((layer, l) => {
      for (const k of this.def.keys) {
        const idx = this.index(k.i);
        const key = `${l}:${k.i}`;
        if (layer[idx] !== this.original[l][idx]) this.pending.set(key, this.original[l][idx]);
        else this.pending.delete(key);
      }
    });
    this.ctx.markDirty();
    this.sync();
  }

  async save(kb) {
    for (const [key, code] of this.pending) {
      const [layer, i] = key.split(':').map(Number);
      const k = this.def.keys[i];
      await kb.setKeycode(layer, k.row, k.col, code);
      this.layers[layer][this.index(i)] = code;
    }
    this.pending.clear();
  }

  render() {
    const { t, lang } = this.ctx;
    $('kmLayers').replaceChildren(...LAYERS.map(({ id, layer }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (layer === this.layer ? ' is-active' : '');
      b.textContent = t(`keymap.layer.${id}`);
      b.addEventListener('click', () => {
        this.layer = layer;
        this.sync();
      });
      return b;
    }));

    const box = $('kmSelected');
    if (!this.layers || this.selected == null) {
      box.innerHTML = '<div class="km-key km-key--empty"><span class="km-cap km-cap--ghost">?</span><span class="km-arrow">→</span><span class="km-cap km-cap--ghost">?</span></div><p class="card-hint"></p>';
      box.querySelector('.card-hint').textContent = t(this.layers ? 'keymap.pick' : 'keymap.offline');
    } else {
      const key = this.def.keys[this.selected];
      const now = this.code(this.layer, this.selected);
      const before = this.original[this.layer][this.index(this.selected)];
      box.innerHTML = '<div class="km-key"><span class="km-cap"></span><span class="km-arrow">→</span><span class="km-cap km-cap--new"></span></div><p class="card-hint"></p>';
      box.querySelector('.km-cap').textContent = key.label || t('keymap.space');
      box.querySelector('.km-cap--new').textContent = now === TRANSPARENT ? '▽' : keycodeLabel(now);
      box.querySelector('.card-hint').textContent = now === before ? t('keymap.unchanged') : t('keymap.now', { name: keycodeName(now, lang) });
    }
    $('kmRestore').disabled = this.selected == null;
    $('kmRestoreAll').disabled = !this.layers;

    $('kmGroups').replaceChildren(...KEYCODE_GROUPS.map(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (g.id === this.group ? ' is-active' : '');
      b.textContent = t(`keys.${g.id}`);
      b.addEventListener('click', () => {
        this.group = g.id;
        this.render();
      });
      return b;
    }));
    const current = this.selected == null ? null : this.code(this.layer, this.selected);
    const group = KEYCODE_GROUPS.find(g => g.id === this.group);
    $('kmCodes').replaceChildren(...group.items.map(([code]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip chip--key' + (code === current ? ' is-active' : '');
      const cap = code === TRANSPARENT ? '▽' : keycodeLabel(code);
      const name = keycodeName(code, lang);
      const capOnly = name.toLowerCase() === cap.toLowerCase();
      b.innerHTML = capOnly ? '<span class="chip-cap"></span>' : '<span class="chip-cap"></span><span class="chip-name"></span>';
      b.querySelector('.chip-cap').textContent = cap;
      if (capOnly) b.classList.add('chip--cap-only');
      else b.querySelector('.chip-name').textContent = name;
      b.title = name;
      b.disabled = this.selected == null;
      b.addEventListener('click', () => this.assign(code));
      return b;
    }));
  }

  bind() {
    $('kmRestore').addEventListener('click', () => this.restoreKey());
    $('kmRestoreAll').addEventListener('click', () => this.restoreAll());
  }
}
