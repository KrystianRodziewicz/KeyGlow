export function hsvToRgb(h, s, v) {
  const hh = ((h % 256) + 256) % 256 / 256 * 6;
  const ss = s / 255;
  const vv = v / 255;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - ss * f);
  const t = vv * (1 - ss * (1 - f));
  const [r, g, b] = [[vv, t, p], [q, vv, p], [p, vv, t], [p, q, vv], [t, p, vv], [vv, p, q]][i % 6];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const cssHsv = (h, s, v = 255) => `rgb(${hsvToRgb(h, s, v).join(',')})`;
