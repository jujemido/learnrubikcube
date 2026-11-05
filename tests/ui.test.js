/* Pruebas de interfaz con Playwright (Chromium).
 * Cada caso abre la app desde cero, con el progreso justo que necesita.
 * Cubren lo que más se ha roto o ajustado: gestos, deshacer/rehacer, retomar, ajustes y pantallas de lección.
 */
const { playwright, hookedPath, suite, assert, eq, openApp, openLesson, goTo, drag } = require('./lib');

const { chromium } = playwright();
const S = suite('Interfaz');
const T = (pg, fn, ...args) => pg.evaluate(([f, a]) => window.__T[f](...a), [fn, args]);

/* ---------- gestos sobre el cubo ---------- */
S.test('un arrastre rápido sobre una pieza gira la capa (R) y no mueve la vista', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const az0 = await T(pg, 'az');
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  eq(await T(pg, 'hist'), 'R', 'historial');
  eq(await T(pg, 'az'), az0, 'la vista no debe moverse');
});

S.test('arrastrar más allá de 90° y soltar en 180° da media vuelta (R2)', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  await drag(pg, [1, 0, 1.5], 0, -300, 50);
  eq(await T(pg, 'hist'), 'R2');
});

S.test('mantener pulsado y arrastrar mueve la vista sin girar capas', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const az0 = await T(pg, 'az');
  const p = await pg.evaluate(() => window.__T.screenOf(1, 0, 1.5));
  await pg.mouse.move(p.x, p.y); await pg.mouse.down(); await pg.waitForTimeout(350);
  assert(await T(pg, 'cue'), 'debería verse el destello al mantener pulsado');
  for (let i = 1; i <= 12; i++) { await pg.mouse.move(p.x + i * 10, p.y); await pg.waitForTimeout(12); }
  await pg.mouse.up(); await pg.waitForTimeout(400);
  assert((await T(pg, 'az')) !== az0, 'la vista debería haberse movido');
  eq(await T(pg, 'hist'), '', 'no debe haber movimientos');
});

S.test('con el ajuste «mantener pulsado» apagado, mantener y arrastrar gira la capa', async c => {
  const pg = await c.lesson('3x3', '1.1', { settings: { holdView: false } }); await goTo(pg, 'try');
  const p = await pg.evaluate(() => window.__T.screenOf(1, 0, 1.5));
  await pg.mouse.move(p.x, p.y); await pg.mouse.down(); await pg.waitForTimeout(350);
  for (let i = 1; i <= 12; i++) { await pg.mouse.move(p.x, p.y - i * 13); await pg.waitForTimeout(12); }
  await pg.mouse.up(); await pg.waitForTimeout(700);
  assert((await T(pg, 'hist')).length > 0, 'debería haber girado una capa');
});

S.test('dos dedos mueven la vista; un temblor pequeño no', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const box = await pg.$eval('#view canvas', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pe = (type, id, x, y) => pg.evaluate(([type, id, x, y]) => {
    document.querySelector('#view canvas').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: id === 1, pointerType: 'touch', bubbles: true }));
  }, [type, id, x, y]);
  const az0 = await T(pg, 'az');
  await pe('pointerdown', 1, box.x - 40, box.y); await pe('pointerdown', 2, box.x + 40, box.y);
  for (let i = 1; i <= 3; i++) { await pe('pointermove', 1, box.x - 40 + i * 2, box.y); await pe('pointermove', 2, box.x + 40 + i * 2, box.y); }
  eq(await T(pg, 'az'), az0, 'un temblor pequeño no debe mover la vista');
  for (let i = 1; i <= 10; i++) { await pe('pointermove', 1, box.x - 40 + i * 12, box.y); await pe('pointermove', 2, box.x + 40 + i * 12, box.y); }
  assert((await T(pg, 'az')) !== az0, 'dos dedos deberían mover la vista');
  await pe('pointerup', 1, 0, 0); await pe('pointerup', 2, 0, 0);
});

S.test('el zoom con dos dedos respeta los límites 70 %–130 %', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const box = await pg.$eval('#view canvas', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pe = (type, id, x, y) => pg.evaluate(([type, id, x, y]) => {
    document.querySelector('#view canvas').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: id === 1, pointerType: 'touch', bubbles: true }));
  }, [type, id, x, y]);
  await pe('pointerdown', 1, box.x - 40, box.y); await pe('pointerdown', 2, box.x + 40, box.y);
  for (let i = 1; i <= 14; i++) { await pe('pointermove', 1, box.x - 40 - i * 15, box.y); await pe('pointermove', 2, box.x + 40 + i * 15, box.y); }
  assert((await T(pg, 'zoom')) <= 1.3001, 'zoom por encima de 1,3');
  await pe('pointerup', 1, 0, 0); await pe('pointerup', 2, 0, 0);
  await pe('pointerdown', 1, box.x - 200, box.y); await pe('pointerdown', 2, box.x + 200, box.y);
  for (let i = 1; i <= 20; i++) { await pe('pointermove', 1, box.x - 200 + i * 9, box.y); await pe('pointermove', 2, box.x + 200 - i * 9, box.y); }
  assert((await T(pg, 'zoom')) >= 0.6999, 'zoom por debajo de 0,7');
});

/* ---------- deshacer y rehacer ---------- */
S.test('deshacer, rehacer, y un movimiento nuevo borra lo rehecho', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  await drag(pg, [0, 0, 1.5], 0, -150, 12);
  const two = await T(pg, 'hist');
  eq(two.split(' ').length, 2, 'deberían ser dos movimientos');
  await pg.click('#undoBtn'); await pg.waitForTimeout(700);
  eq(await T(pg, 'hist').then(h => h.split(' ').filter(Boolean).length), 1, 'tras deshacer queda 1');
  assert(!(await pg.$eval('#redoBtn', e => e.disabled)), 'rehacer debería estar disponible');
  await pg.click('#redoBtn'); await pg.waitForTimeout(700);
  eq(await T(pg, 'hist'), two, 'rehacer devuelve lo mismo');
  await pg.click('#undoBtn'); await pg.waitForTimeout(600); await pg.click('#undoBtn'); await pg.waitForTimeout(600);
  eq(await T(pg, 'redo'), 2, 'dos movimientos para rehacer');
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  eq(await T(pg, 'redo'), 0, 'un movimiento nuevo vacía la pila de rehacer');
});

S.test('deshacer y rehacer van dentro del cubo (no en una barra aparte)', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  assert(await pg.$('#view #undoBtn') && await pg.$('#view #redoBtn'), 'los botones deben estar dentro de #view');
});

/* ---------- secuencia y ejercicios con medios giros ---------- */
S.test('la secuencia fusiona giros seguidos: R, R2, R\', y se anula', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const out = [];
  for (let i = 0; i < 4; i++) { await drag(pg, [1, 0, 1.5], 0, -150, 12); out.push((await pg.$eval('#hist', e => e.textContent)).replace('Tu secuencia: ', '').trim()); }
  eq(out.join(' | '), "R | R2 | R' | (se ha anulado)");
});

S.test('en «F2 L» no se da por mal el ejercicio tras F, F (se cuentan cuartos de vuelta)', async c => {
  const pg = await c.lesson('3x3', '1.10'); await goTo(pg, 'ex2');
  eq((await pg.textContent('.q')).trim().includes("L D' B2"), true, 'no es el ejercicio esperado');
  await T(pg, 'play', ['L']); await pg.waitForTimeout(450);
  await T(pg, 'play', ["D'"]); await pg.waitForTimeout(450);
  await T(pg, 'play', ['B']); await pg.waitForTimeout(450);
  eq(await T(pg, 'status'), 'pending', 'tras L D\' B aún no se ha evaluado');
  await T(pg, 'play', ['B']); await pg.waitForTimeout(600);
  eq(await T(pg, 'status'), 'ok', 'tras L D\' B B debe darse por bueno');
});

S.test('sin botonera cuando el ejercicio se puede hacer arrastrando; sí con giros del cubo entero', async c => {
  const pg = await c.lesson('3x3', '1.10'); await goTo(pg, 'ex2');
  eq((await pg.$$('.mvbtn')).length, 0, 'ejercicio con medios giros: sin botonera');
  assert(await pg.$('.gesturehint'), 'debería haber ayuda de gestos');
  const pg2 = await c.lesson('3x3', '2.2'); await goTo(pg2, 'ex0');
  eq((await pg2.textContent('.q')).includes('x2'), true, 'no es el ejercicio de x2');
  assert((await pg2.$$('.mvbtn')).length > 0, 'con un giro del cubo entero (x2) la botonera debe quedarse');
});

S.test('la ayuda «¿Cómo mover el cubo?» sale cerrada y se recuerda si la abres', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  eq(await pg.$eval('.gesturehint', e => e.open), false, 'debe salir cerrada');
  await pg.click('.gesturehint summary'); await pg.waitForTimeout(150);
  eq(await pg.$eval('.gesturehint', e => e.open), true);
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  eq(await pg.$eval('.gesturehint', e => e.open), true, 'tras redibujar el panel sigue abierta');
});

/* ---------- retomar, pasos, pantallas ---------- */
S.test('retomar una lección a mitad: temario, recarga y reapertura', async c => {
  const pg = await c.lesson('3x3', '1.10'); await goTo(pg, 'learn');
  const before = await T(pg, 'step');
  await T(pg, 'map'); await pg.waitForTimeout(300);
  const idx = (await pg.evaluate(() => window.__T.ids('3x3'))).indexOf('1.10');
  eq(await pg.$eval('.lrow[data-lesson="' + idx + '"] .meta', e => e.textContent), 'En curso');
  assert((await pg.$eval('.hero .btn.primary', e => e.textContent)).startsWith('Retomar'), 'el botón grande debe decir Retomar');
  await pg.reload(); await pg.waitForTimeout(500);
  await pg.click('.tab[data-course="3x3"]'); await pg.click('.lrow[data-lesson="' + idx + '"]'); await pg.waitForTimeout(400);
  eq(await T(pg, 'step'), before, 'vuelve al mismo paso');
});

S.test('retomar también funciona en un mini-examen', async c => {
  const pg = await c.lesson('3x3', 'e1'); await goTo(pg, 'ex3');
  const before = await T(pg, 'step');
  await T(pg, 'map'); await pg.waitForTimeout(300);
  const idx = (await pg.evaluate(() => window.__T.ids('3x3'))).indexOf('e1');
  await pg.click('.lrow[data-lesson="' + idx + '"]'); await pg.waitForTimeout(400);
  eq(await T(pg, 'step'), before);
  eq(await T(pg, 'kind'), 'ex3');
});

S.test('«atrás» del navegador/móvil dentro de una lección vuelve al temario, sin cerrar la app', async c => {
  const pg = await c.lesson('3x3', '1.3');
  assert(await pg.isVisible('#lessonView'), 'debería estar en la lección');
  await pg.goBack(); await pg.waitForTimeout(400);
  assert(await pg.isVisible('#mapView'), 'tras «atrás» debe verse el temario');
  assert(!(await pg.isVisible('#lessonView')), 'la lección debe cerrarse');
  assert(pg.url().includes('rubik-test'), 'la app no debe haberse cerrado ni cambiado de página');
});

S.test('«atrás» tras pasar a la siguiente lección también lleva al temario (no a la anterior)', async c => {
  const pg = await c.lesson('3x3', '1.3'); await goTo(pg, 'done');
  await pg.click('[data-act=nextLesson]'); await pg.waitForTimeout(400);
  await pg.goBack(); await pg.waitForTimeout(400);
  assert(await pg.isVisible('#mapView'), 'tras «atrás» debe verse el temario');
  assert(pg.url().includes('rubik-test'), 'la app no debe haberse cerrado');
});

S.test('el botón «Volver al temario» también vuelve al temario', async c => {
  const pg = await c.lesson('3x3', '1.3');
  await pg.click('#backBtn'); await pg.waitForTimeout(400);
  assert(await pg.isVisible('#mapView'), 'debe verse el temario');
  assert(pg.url().includes('rubik-test'), 'la app no debe haberse cerrado');
});

S.test('al terminar la lección se borra lo guardado para retomar', async c => {
  const pg = await c.lesson('3x3', '1.3'); await goTo(pg, 'ex1');
  assert(/"1\.3"/.test(await T(pg, 'res')), 'debería haber algo guardado');
  await goTo(pg, 'done');
  assert(!/"1\.3"/.test(await T(pg, 'res')), 'al terminar ya no debe quedar guardado');
});

S.test('rayitas: los pasos alcanzados hacia delante salen en contorno (reach)', async c => {
  const pg = await c.lesson('3x3', '1.3'); await goTo(pg, 'ex1');
  await goTo(pg, 'intro');
  const cls = await pg.$$eval('.steps li', l => l.map(x => x.className));
  const kinds = (await T(pg, 'kinds')).split(',');
  const reach = cls.filter(x => x === 'reach').length;
  eq(cls[0], 'now');
  eq(reach, kinds.indexOf('ex1'), 'todos los pasos hasta el más lejano alcanzado deben ser «reach»');
  assert(cls[cls.length - 2] === '', 'los no alcanzados quedan vacíos');
});

S.test('la pregunta relámpago no se puede saltar', async c => {
  const pg = await c.lesson('3x3', '1.3'); await goTo(pg, 'quick');
  eq((await pg.$$('text=Saltar')).length, 0, 'no debe haber botón Saltar');
  eq(await pg.$eval('[data-act=next]', e => e.disabled), true, 'Continuar empieza desactivado');
  await pg.click('[data-act=quick][data-v="' + (await T(pg, 'quick')) + '"]'); await pg.waitForTimeout(200);
  eq(await pg.$eval('[data-act=next]', e => e.disabled), false, 'tras acertar, Continuar se activa');
});

S.test('pantalla de lección completada: icono de repetir a la izquierda de «Siguiente lección»', async c => {
  const pg = await c.lesson('3x3', '1.3'); await goTo(pg, 'done');
  const labels = await pg.$$eval('#panel .row.actions button', b => b.map(x => x.getAttribute('aria-label') || x.textContent.trim()));
  eq(labels.join(' | '), 'Repetir lección | Siguiente lección →');
});

/* ---------- ajustes ---------- */
S.test('ajustes: sin «girar capas arrastrando» y con todos los checks del mismo tamaño', async c => {
  const pg = await c.lesson('3x3', '1.1', { viewport: { width: 390, height: 800 } });
  await pg.click('.js-settings >> nth=1'); await pg.waitForTimeout(250);
  eq(await pg.$('#setDrag'), null, 'no debe existir la opción');
  const sizes = await pg.$$eval('#settingsPanel .toggle input', l => l.map(i => { const r = i.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  eq(new Set(sizes).size, 1, 'tamaños distintos: ' + sizes.join(' '));
});

S.test('ajustes: la velocidad (1,5 s por defecto) se guarda, se exporta y se importa', async c => {
  const pg = await c.lesson('3x3', '1.10'); await goTo(pg, 'learn'); await pg.waitForTimeout(800);
  const sel = () => pg.$eval('#tlSpeed', e => e.options[e.selectedIndex].textContent);
  eq(await sel(), '1,5 s', 'por defecto');
  await pg.selectOption('#tlSpeed', '3'); await pg.waitForTimeout(150);
  eq(await pg.evaluate(() => JSON.parse(localStorage.getItem('rubik-ajustes')).speed), 3, 'guardada');
  await pg.click('.js-settings >> nth=1'); await pg.click('#progShow'); await pg.waitForTimeout(150);
  const exp = JSON.parse(await pg.$eval('#progBox', e => e.value));
  eq(exp.settings.speed, 3, 'exportada');
  exp.settings.speed = 0.5; await pg.fill('#progBox', JSON.stringify(exp)); await pg.click('#progLoad'); await pg.waitForTimeout(150);
  eq(await pg.evaluate(() => JSON.parse(localStorage.getItem('rubik-ajustes')).speed), 0.5, 'importada');
  exp.settings.speed = 7; await pg.fill('#progBox', JSON.stringify(exp)); await pg.click('#progLoad'); await pg.waitForTimeout(150);
  eq(await pg.evaluate(() => JSON.parse(localStorage.getItem('rubik-ajustes')).speed), 0.5, 'un valor inválido se ignora');
});

S.test('ajustes: exportar e importar progreso y ajustes (y el formato antiguo)', async c => {
  const pg = await c.lesson('3x3', '1.1');
  await pg.click('.js-settings >> nth=1'); await pg.click('#progShow'); await pg.waitForTimeout(150);
  const exp = JSON.parse(await pg.$eval('#progBox', e => e.value));
  assert(exp.v === 2 && exp.progress && exp.settings, 'formato {v:2, progress, settings}');
  exp.settings.sound = false; exp.settings.hidePad = true;
  await pg.fill('#progBox', JSON.stringify(exp)); await pg.click('#progLoad'); await pg.waitForTimeout(200);
  eq(await pg.$eval('#setSound', e => e.checked), false); eq(await pg.$eval('#setHidePad', e => e.checked), true);
  await pg.fill('#progBox', JSON.stringify({ done: {} })); await pg.click('#progLoad'); await pg.waitForTimeout(200);
  eq(await pg.textContent('#progMsg'), 'Progreso importado.', 'el formato antiguo sigue valiendo');
});

S.test('sonido: con el ajuste apagado no suena nada', async c => {
  const pg = await c.lesson('3x3', '1.1', { settings: { sound: false } }); await goTo(pg, 'try');
  await pg.evaluate(() => { window.__beeps = 0; const o = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function () { window.__beeps++; return o.apply(this, arguments); }; });
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  eq(await pg.evaluate(() => window.__beeps), 0);
});

S.test('sonido: con el ajuste encendido, un movimiento suena', async c => {
  const pg = await c.lesson('3x3', '1.1', { settings: { sound: true } }); await goTo(pg, 'try');
  await pg.evaluate(() => { window.__beeps = 0; const o = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function () { window.__beeps++; return o.apply(this, arguments); }; });
  await drag(pg, [1, 0, 1.5], 0, -150, 12);
  assert((await pg.evaluate(() => window.__beeps)) >= 1, 'debería sonar al menos un tono');
});

/* ---------- ejecución ---------- */
(async () => {
  const file = hookedPath();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const failed = await S.run(async () => {
    const pages = [];
    const ctx = {
      async lesson(course, id, opts) {
        const pg = await openLesson(browser, file, course, id, opts);
        pages.push(pg);
        return pg;
      },
      async errors() { const errs = []; pages.forEach(p => (p.errors || []).forEach(e => errs.push(e))); return errs; },
      async close() { for (const p of pages) await p.close().catch(() => {}); }
    };
    return ctx;
  });
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
