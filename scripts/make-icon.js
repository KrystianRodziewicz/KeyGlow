const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'src', 'assets', 'logo.svg'), 'utf8');
const BG = '#131f24';

const ICONS = [
  ['build/icon.png', 512, 512, 0],
  ['src/assets/icon.png', 512, 512, 0],
  ['src/assets/icon-192.png', 192, 192, 0],
  ['src/assets/icon-maskable.png', 512, 512, 0.2, BG],
  ['build/appx/StoreLogo.png', 50, 50, 0],
  ['build/appx/Square44x44Logo.png', 44, 44, 0],
  ['build/appx/Square150x150Logo.png', 150, 150, 0.18],
  ['build/appx/Wide310x150Logo.png', 310, 150, 0.18],
  ['build/appx/SmallTile.png', 71, 71, 0.14],
  ['build/appx/LargeTile.png', 310, 310, 0.22],
  ...[16, 24, 32, 48, 256].map(n => [`build/appx/Square44x44Logo.targetsize-${n}_altform-unplated.png`, n, n, 0]),
];
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, at);
    head.writeUInt8(size >= 256 ? 0 : size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map(x => x.png)]);
}

function render(icons, logo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => resolve(icons.map(([, w, h, pad, bg]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      if (bg) {
        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);
      }
      const s = Math.round(Math.min(w, h) * (1 - 2 * pad));
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, Math.round((w - s) / 2), Math.round((h - s) / 2), s, s);
      return canvas.toDataURL('image/png');
    }));
    img.src = logo;
  });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const all = [...ICONS, ...ICO_SIZES.map(n => ['', n, n, 0])];
  const images = await win.webContents.executeJavaScript(`(${render})(${JSON.stringify(all)}, ${JSON.stringify(logo)})`);
  ICONS.forEach(([file], i) => {
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(images[i].split(',')[1], 'base64'));
  });
  const icoImages = ICO_SIZES.map((size, i) => ({ size, png: Buffer.from(images[ICONS.length + i].split(',')[1], 'base64') }));
  fs.writeFileSync(path.join(root, 'build', 'icon.ico'), ico(icoImages));
  console.log(`${ICONS.length + 1} ikon gotowych`);
  app.quit();
});
