#!/usr/bin/env node
/* Ejecuta todas las pruebas, una tras otra, y resume. Sale con código distinto de 0 si algo falla.
 *   node run.js            todo
 *   node run.js logic      solo el contenido de los cursos (rápido, sin navegador)
 *   node run.js ui         solo la interfaz
 *   node run.js offline    solo la versión sin conexión
 */
const { spawnSync } = require('child_process');
const path = require('path');

const all = { logic: 'logic.test.js', ui: 'ui.test.js', offline: 'offline.test.js' };
const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(all);
let failed = [];
for (const n of names) {
  if (!all[n]) { console.error('Prueba desconocida: ' + n + ' (usa: ' + Object.keys(all).join(', ') + ')'); process.exit(2); }
  const r = spawnSync(process.execPath, [path.join(__dirname, all[n])], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(n);
}
console.log('\n' + (failed.length ? '✗ Fallan: ' + failed.join(', ') : '✓ Todo correcto'));
process.exit(failed.length ? 1 : 0);
