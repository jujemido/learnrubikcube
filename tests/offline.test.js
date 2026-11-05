/* Comprueba la versión instalable: manifiesto, service worker y que la app abre SIN conexión.
 * Sirve la carpeta del repositorio por HTTP en localhost (los service workers no funcionan con file://). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT, playwright, suite, assert, eq } = require('./lib');

const { chromium } = playwright();
const S = suite('Versión sin conexión');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  const srv = http.createServer((req, res) => {
    let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => srv.listen(0, () => ok(srv)));
}

S.test('el manifiesto es válido y los iconos existen', async () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  eq(m.display, 'standalone');
  assert(m.start_url && m.name && m.short_name, 'faltan campos básicos');
  m.icons.forEach(i => assert(fs.existsSync(path.join(ROOT, i.src)), 'falta el icono ' + i.src));
  eq(m.theme_color, '#e9edf2', 'el color de tema debe ser el del fondo claro');
  eq(m.background_color, '#e9edf2');
});

S.test('la barra de estado sigue el fondo de la app en claro y oscuro', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(/name="theme-color" content="#e9edf2" media="\(prefers-color-scheme: light\)"/.test(html), 'theme-color claro');
  assert(/name="theme-color" content="#0d1015" media="\(prefers-color-scheme: dark\)"/.test(html), 'theme-color oscuro');
});

S.test('con el service worker instalado, la app abre sin conexión y sin red externa', async () => {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort()); /* nada de red externa */
    const url = 'http://localhost:' + srv.address().port + '/';
    await page.goto(url); await page.waitForTimeout(1500);
    assert(await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active), 'el service worker debería estar activo');
    assert((await page.evaluate(() => document.fonts.load('700 16px Rubik').then(f => f.length))) > 0, 'las fuentes van incluidas (sin pedirlas a Google)');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForTimeout(1200);
    assert((await page.textContent('.hero h2')).length > 0, 'sin conexión debería verse el temario');
    assert(await page.$('.tab[data-course]'), 'deberían verse las pestañas de curso');
    eq(errs.length, 0, 'errores: ' + errs.join(' | '));
    /* el botón de instalar existe y está oculto/visible según el navegador, pero no debe romper nada */
    assert(await page.$('#instSec'), 'falta la sección «Instalar la app»');
  } finally { await browser.close(); srv.close(); }
});

S.test('el service worker pide la página a la red primero (para recibir versiones nuevas)', async () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert(/isPage/.test(sw) && /fetch\(e\.request\)\.then/.test(sw), 'la página debe ir red-primero');
  assert(/const CACHE = 'rubik-paso-a-paso-v\d+'/.test(sw), 'el nombre de la caché lleva versión');
});

(async () => { const failed = await S.run(); process.exit(failed ? 1 : 0); })();
