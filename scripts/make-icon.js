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
  const images = await win.webContents.executeJavaScript(`(${render})(${JSON.stringify(ICONS)}, ${JSON.stringify(logo)})`);
  ICONS.forEach(([file], i) => {
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(images[i].split(',')[1], 'base64'));
  });
  console.log(`${ICONS.length} ikon gotowych`);
  app.quit();
});
