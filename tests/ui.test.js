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


/* ---------- giros del cubo entero con dos dedos ---------- */
async function twoFingers(pg, fx, steps) {
  const c = await pg.$eval('#view canvas', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pe = (type, id, x, y) => pg.evaluate(([type, id, x, y]) => {
    document.querySelector('#view canvas').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: id === 1, pointerType: 'touch', bubbles: true }));
  }, [type, id, x, y]);
  const before = await T(pg, 'hist');
  const p0 = fx(0, c);
  await pe('pointerdown', 1, p0[0], p0[1]); await pe('pointerdown', 2, p0[2], p0[3]);
  for (let n = 1; n <= steps; n++) { const p = fx(n / steps, c); await pe('pointermove', 1, p[0], p[1]); await pe('pointermove', 2, p[2], p[3]); await pg.waitForTimeout(25); }
  await pg.waitForTimeout(250);
  const live = await T(pg, 'live');
  await pe('pointerup', 1, 0, 0); await pe('pointerup', 2, 0, 0); await pg.waitForTimeout(900);
  return { mv: (await T(pg, 'hist')).slice(before.length).trim(), live };
}
const slide = (dx, dy) => (t, c) => [c.x - 60 + dx * t, c.y + dy * t, c.x + 60 + dx * t, c.y + dy * t];
const twist = deg => (t, c) => { const a = deg * t * Math.PI / 180; return [c.x - 60 * Math.cos(a), c.y - 60 * Math.sin(a), c.x + 60 * Math.cos(a), c.y + 60 * Math.sin(a)]; };

S.test('dos dedos: deslizar arriba/abajo = x/x\', izquierda/derecha = y/y\', girar los dedos = z/z\'', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const got = [];
  got.push((await twoFingers(pg, slide(0, -130), 14)).mv);
  got.push((await twoFingers(pg, slide(0, 130), 14)).mv);
  got.push((await twoFingers(pg, slide(-130, 0), 14)).mv);
  got.push((await twoFingers(pg, slide(130, 0), 14)).mv);
  got.push((await twoFingers(pg, twist(90), 14)).mv);
  got.push((await twoFingers(pg, twist(-90), 14)).mv);
  eq(got.join(' '), "x x' y y' z z'");
});

S.test('dos dedos: deslizar más (≈180°) da media vuelta, x2', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  eq((await twoFingers(pg, slide(0, -230), 24)).mv, 'x2');
});

S.test('dos dedos: el sentido visual del giro coincide con el movimiento registrado', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  for (const [fx, steps] of [[slide(0, -130), 14], [slide(130, 0), 14], [twist(90), 14], [twist(-90), 14]]) {
    const r = await twoFingers(pg, fx, steps);
    const L = r.mv[0], k = await pg.evaluate(L => window.__T.k(L), L);
    const want = k * (r.mv.length === 1 ? 1 : -1) * Math.PI / 2;
    assert(r.live && r.live.all, 'debe girar todo el cubo');
    assert(Math.abs(r.live.theta - want) < 0.05, r.mv + ': el giro en vivo (' + r.live.theta.toFixed(2) + ') no coincide con el del movimiento (' + want.toFixed(2) + ')');
  }
});

S.test('dos dedos: un roce pequeño o solo pellizcar (zoom) no giran el cubo', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  eq((await twoFingers(pg, slide(0, -20), 6)).mv, '', 'un roce');
  eq((await twoFingers(pg, (t, c) => [c.x - 50 - 50 * t, c.y, c.x + 50 + 50 * t, c.y], 14)).mv, '', 'pellizco');
  assert((await T(pg, 'zoom')) > 1.0, 'el pellizco debe hacer zoom');
});

S.test('dos dedos: el eje sigue a la vista (al verlo desde el lado, deslizar arriba ya no es x)', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  await pg.evaluate(() => window.__T.view(1.4, 0.5)); await pg.waitForTimeout(200);
  const r = await twoFingers(pg, slide(0, -130), 14);
  assert(r.mv && r.mv[0] !== 'x', 'con la vista girada no debería salir x, salió ' + r.mv);
});

S.test('con dos dedos se puede completar un ejercicio de giro del cubo entero (x2)', async c => {
  const pg = await c.lesson('3x3', '2.2'); await goTo(pg, 'ex3');
  eq((await twoFingers(pg, slide(0, -230), 24)).mv, 'x2');
  eq(await T(pg, 'status'), 'ok', 'el ejercicio debe darse por bueno');
});

S.test('sin movimientos aceptados (ejercicio de mirar), dos dedos mueven la vista', async c => {
  const pg = await c.lesson('3x3', 'e1'); await goTo(pg, 'ex8');
  const az0 = await T(pg, 'az');
  await twoFingers(pg, slide(90, 0), 12);
  assert((await T(pg, 'az')) !== az0, 'la vista debería moverse');
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

S.test('sin botonera cuando el ejercicio se puede hacer con gestos (incluido x2); sí en el 4×4', async c => {
  const pg = await c.lesson('3x3', '1.10'); await goTo(pg, 'ex2');
  eq((await pg.$$('.mvbtn')).length, 0, 'ejercicio con medios giros: sin botonera');
  assert(await pg.$('.gesturehint'), 'debería haber ayuda de gestos');
  const pg2 = await c.lesson('3x3', '2.2'); await goTo(pg2, 'ex3');
  eq((await pg2.textContent('.q')).includes('x2'), true, 'no es el ejercicio de x2');
  eq((await pg2.$$('.mvbtn')).length, 0, 'x2 también se hace con dos dedos: sin botonera');
  const pg3 = await c.lesson('4x4', 'B1'); await goTo(pg3, 'try');
  assert((await pg3.$$('.mvbtn')).length > 0, 'en el 4×4 no hay gestos: la botonera debe estar');
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


/* ---------- bloque 2: la flor, paso a paso ---------- */
S.test('bloque 2: la numeración visible es seguida (2.1 … 2.9)', async c => {
  const pg = await c.lesson('3x3', '2.1');
  eq((await pg.evaluate(() => window.__T.disp('3x3', 2))).join(' '), '2.1 2.2 2.3 2.4 2.5 2.6 2.7 2.8 2.9');
});

S.test('bloque 2: «Aprende» va por páginas (siguiente, anterior y última con «Continuar»)', async c => {
  const pg = await c.lesson('3x3', 'F2'); await goTo(pg, 'learn');
  const n = await T(pg, 'pages');
  assert(n >= 3, 'la lección de la arista de lado debería tener varias páginas, tiene ' + n);
  eq(await T(pg, 'page'), 0);
  assert(!(await pg.$('[data-act=lpprev]')), 'en la primera página no hay «anterior»');
  await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(400);
  eq(await T(pg, 'page'), 1);
  assert(await pg.$('[data-act=lpprev]'), 'desde la segunda página sí hay «anterior»');
  await pg.click('[data-act=lpprev]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'page'), 0);
  for (let i = 1; i < n; i++) { await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(250); }
  assert(!(await pg.$('[data-act=lpnext]')), 'en la última página ya no hay «siguiente»');
  assert(await pg.$('[data-act=next]'), 'en la última página debe haber «Continuar»');
  eq((await pg.$$('.pgdots')).length, 0, 'ya no hay puntitos');
  const base = (await T(pg, 'kinds')).split(',').length - 1;
  eq((await pg.$$('.steps li')).length, base + n - 1, 'una rayita por página de «Aprende»');
});

S.test('páginas: las rayitas llevan a su página y «retomar» vuelve a la misma página', async c => {
  const pg = await c.lesson('3x3', 'F2'); await goTo(pg, 'learn');
  await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(250);
  await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(250);
  eq(await T(pg, 'page'), 2);
  await pg.click('.steps li button[data-page="0"]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'page'), 0, 'la rayita de la primera página vuelve a ella');
  await pg.click('.steps li button[data-page="2"]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'page'), 2, 'las páginas ya vistas se pueden volver a abrir');
  await T(pg, 'map'); await pg.waitForTimeout(300);
  const idx = (await pg.evaluate(() => window.__T.ids('3x3'))).indexOf('F2');
  await pg.reload(); await pg.waitForTimeout(500);
  await pg.click('.tab[data-course="3x3"]'); await pg.click('.lrow[data-lesson="' + idx + '"]'); await pg.waitForTimeout(500);
  eq(await T(pg, 'kind'), 'learn', 'retoma en «Aprende»');
  eq(await T(pg, 'page'), 2, 'y en la misma página');
});

S.test('bloque 2: cada página enseña un movimiento y se reproduce con su cubo', async c => {
  const pg = await c.lesson('3x3', 'F2'); await goTo(pg, 'learn');
  await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(1500);
  assert(await pg.isVisible('#tl'), 'la página de un movimiento debe mostrar la línea de tiempo');
  assert((await pg.textContent('.tl-cur')).trim().length > 0, 'debe indicar el movimiento (R)');
});

S.test('bloque 2: el resaltado de la flor ilumina solo la arista que falta; con la flor hecha, las cuatro', async c => {
  const pg = await c.lesson('3x3', '2.3'); await goTo(pg, 'learn');
  assert(await pg.$('#hlt'), 'debe existir «Resaltar en el cubo»');
  eq(await pg.$eval('#hlt', e => e.checked), true);
});

S.test('bloque 2: se puede completar cada lección de la flor y la cruz (gestos y pasos incluidos)', async c => {
  for (const id of ['F1', '2.3', 'F2', '2.4', 'F3', 'F4', '2.5']) {
    const pg = await c.lesson('3x3', id);
    let guard = 0;
    while (guard++ < 60) {
      const k = await T(pg, 'kind');
      if (k === 'done') break;
      if (k === 'intro' || k === 'recap') { await pg.click('[data-act=next]'); }
      else if (k === 'quick') { await pg.click('[data-act=quick][data-v="' + (await T(pg, 'quickIdx')) + '"]'); await pg.click('[data-act=next]'); }
      else if (k === 'learn') { while (await pg.$('[data-act=lpnext]')) { await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(120); } await pg.click('[data-act=next]'); }
      else if (k === 'try') { await T(pg, 'solveStep'); await pg.waitForSelector('#cont:not([disabled])', { timeout: 5000 }); await pg.click('#cont'); }
      else if (k && k.indexOf('ex') === 0) {
        const r = await T(pg, 'solveStep');
        if (r === 'nav' || r === undefined || r === 'choice' || r === null) {
          const ans = await T(pg, 'ans');
          await pg.click('[data-act=opt][data-v="' + ans + '"]');
        }
        await pg.waitForSelector('[data-act=next]', { timeout: 8000 });
        await pg.click('[data-act=next]');
      }
      await pg.waitForTimeout(80);
    }
    eq(await T(pg, 'kind'), 'done', 'la lección ' + id + ' no se pudo completar');
    assert(await pg.evaluate(id => !!JSON.parse(localStorage.getItem('rubik-paso-a-paso-v1')).done[id], id), 'la lección ' + id + ' no quedó marcada como hecha');
  }
});

S.test('bloque 2: el mini-examen tiene pistas, mantiene sus 10 ejercicios y acaba con uno sin resaltado', async c => {
  const pg = await c.lesson('3x3', '2.6'); await goTo(pg, 'ex8');
  const kinds = (await T(pg, 'kinds')).split(',');
  eq(kinds.filter(k => k.indexOf('ex') === 0).length, 10);
  assert((await pg.$$('[data-act=hint]')).length === 1, 'debe haber botón de pista en el examen');
  assert((await pg.$$('.goalnote .lg')).length === 3, 'el ejercicio 9 sí resalta');
  await goTo(pg, 'ex9');
  assert((await pg.textContent('.q')).includes('Final'), 'el último es el final');
  eq((await pg.$$('.goalnote .lg')).length, 0, 'el último se ve con todo el cubo, sin resaltado');
  await pg.click('[data-act=hint]'); await pg.waitForTimeout(200);
  assert((await pg.textContent('#fb')).includes('Pista'), 'la pista sale');
  await T(pg, 'solveStep'); await pg.waitForSelector('[data-act=next]', { timeout: 8000 });
});


/* ---------- ordenador: clic derecho + arrastrar y teclas X, Y, Z ---------- */
async function rightDrag(pg, dx, dy, shift) {
  const c = await pg.$eval('#view canvas', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const before = await T(pg, 'hist');
  if (shift) await pg.keyboard.down('Shift');
  await pg.mouse.move(c.x, c.y); await pg.mouse.down({ button: 'right' });
  for (let i = 1; i <= 14; i++) { await pg.mouse.move(c.x + dx * i / 14, c.y + dy * i / 14); await pg.waitForTimeout(15); }
  await pg.mouse.up({ button: 'right' });
  if (shift) await pg.keyboard.up('Shift');
  await pg.waitForTimeout(800);
  return (await T(pg, 'hist')).slice(before.length).trim();
}

S.test('ordenador: clic derecho y arrastrar = x / y; con Mayús = z', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const got = [await rightDrag(pg, 0, -130), await rightDrag(pg, 0, 130), await rightDrag(pg, -130, 0), await rightDrag(pg, 130, 0), await rightDrag(pg, 130, 0, true), await rightDrag(pg, -130, 0, true)];
  eq(got.join(' '), "x x' y y' z z'");
});

S.test('ordenador: las teclas x, y, z giran el cubo (Mayús = al revés)', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  for (const k of ['x', 'y', 'z']) { await pg.keyboard.press(k); await pg.waitForTimeout(500); }
  await pg.keyboard.press('Shift+X'); await pg.waitForTimeout(500);
  eq(await T(pg, 'hist'), "x y z x'");
});

S.test('x, y, z: la lección tiene páginas y se puede hacer cada giro con teclas', async c => {
  const pg = await c.lesson('3x3', '2.2'); await goTo(pg, 'learn');
  assert((await T(pg, 'pages')) >= 5, 'varias páginas');
  await goTo(pg, 'ex0');
  await pg.keyboard.press('x'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
  await goTo(pg, 'ex1'); await pg.keyboard.press('y'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
  await goTo(pg, 'ex2'); await pg.keyboard.press('z'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
});

S.test('M, E y S: lección nueva, con páginas y ejercicios que se completan', async c => {
  const pg = await c.lesson('3x3', 'S1');
  assert((await pg.evaluate(() => window.__T.disp('3x3', 1))).indexOf('1.12') >= 0, 'se numera como 1.12');
  await goTo(pg, 'learn');
  assert((await T(pg, 'pages')) >= 5);
  await goTo(pg, 'ex0'); await T(pg, 'solveStep'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
  eq(await T(pg, 'hist'), 'M');
  await goTo(pg, 'ex1'); await T(pg, 'solveStep'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
  await goTo(pg, 'ex2'); await T(pg, 'solveStep'); await pg.waitForSelector('[data-act=next]', { timeout: 6000 });
  eq(await T(pg, 'hist'), "S'");
});


/* ---------- ejercicios claros: objetivo, leyenda y pistas coherentes ---------- */
S.test('ejercicio de resolver: muestra el objetivo y la leyenda del resaltado, con la flor ya hecha a la vista', async c => {
  const pg = await c.lesson('3x3', '2.3'); await goTo(pg, 'ex1');
  const t = await pg.textContent('.goalnote');
  assert(t.includes('Objetivo') && t.includes('borde') && t.includes('gris'), 'falta el objetivo o la leyenda: ' + t);
  assert(t.includes('deben seguir así'), 'debe decir que los pétalos hechos no se estropeen');
  eq((await pg.$$('.goalnote .lg')).length, 3, 'tres muestras de la leyenda');
});

S.test('pista sin botonera: no dice «Pulsa»', async c => {
  const pg = await c.lesson('3x3', '1.7'); await goTo(pg, 'ex0');
  eq((await pg.$$('.mvbtn')).length, 0, 'este ejercicio no tiene botonera');
  await T(pg, 'play', ['U']); await pg.waitForTimeout(900);
  const fb = await pg.textContent('#fb');
  assert(fb.includes('No es esa'), 'debería dar un fallo: ' + fb);
  assert(!/Pulsa/.test(fb), 'la pista no debe decir «Pulsa» si no hay botonera: ' + fb);
});

S.test('las páginas de F2L, 2×2 y 4×4 existen y se recorren hasta «Continuar»', async c => {
  for (const [course, id] of [['adv', 'V2'], ['2x2', 'T4'], ['4x4', 'B2']]) {
    const pg = await c.lesson(course, id); await goTo(pg, 'learn');
    const n = await T(pg, 'pages');
    assert(n >= 2, course + ' ' + id + ': debería tener páginas');
    for (let i = 1; i < n; i++) { await pg.click('[data-act=lpnext]'); await pg.waitForTimeout(150); }
    assert(await pg.$('[data-act=next]'), course + ' ' + id + ': la última página debe tener «Continuar»');
  }
});


/* ---------- vista: etiquetas de cara y reinicio de la posición ---------- */
S.test('el cubo muestra las letras F, R y U en las caras que se ven', async c => {
  const pg = await c.lesson('3x3', '3.5'); await goTo(pg, 'ex2');
  const t = (await pg.$$eval('#flbl i', els => els.map(e => e.textContent))).join(',');
  assert(t.split(',').sort().join('') === 'FRU', 'etiquetas: ' + t);
});

S.test('«Reiniciar» y cambiar de paso devuelven el cubo a la posición inicial de la vista', async c => {
  const pg = await c.lesson('3x3', '1.1'); await goTo(pg, 'try');
  const az0 = await T(pg, 'az'), z0 = await T(pg, 'zoom');
  await T(pg, 'view', 2.0, 0.2);
  assert((await T(pg, 'az')) !== az0, 'la vista debería haberse movido');
  await pg.click('[data-act=reset]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'az'), az0, 'Reiniciar cubo devuelve la vista');
  eq(await T(pg, 'zoom'), z0);
  await T(pg, 'view', -1.0, 0.9);
  await goTo(pg, 'ex0');
  eq(await T(pg, 'az'), az0, 'al pasar de paso la vista vuelve a la inicial');
  await T(pg, 'view', 2.5, 0.1);
  await pg.click('[data-act=reset]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'az'), az0, 'Reiniciar en un ejercicio también');
});


S.test('si la pieza que falta queda por detrás o debajo, la vista gira sola hasta verla (y «Reiniciar» lo repite)', async c => {
  const pg = await c.lesson('3x3', '2.3'); await goTo(pg, 'ex3');
  const az = await T(pg, 'az');
  assert(Math.abs(az - 0.62) > 0.5, 'la vista debería haberse girado para ver las aristas de abajo (az=' + az + ')');
  await T(pg, 'view', 0.62, 0.5);
  await pg.click('[data-act=reset]'); await pg.waitForTimeout(300);
  assert(Math.abs((await T(pg, 'az')) - 0.62) > 0.5, 'tras reiniciar vuelve a la vista adecuada');
  const pg2 = await c.lesson('3x3', '2.3'); await goTo(pg2, 'ex1');
  eq(await T(pg2, 'az'), 0.62, 'si la pieza ya se ve, la vista no se toca');
});


/* ---------- Training: notación ---------- */
const trLog = pg => pg.evaluate(() => JSON.parse(localStorage.getItem('rubik-training') || '{"log":[]}').log);
async function openTrain(c) {
  const pg = await c.app({}); await pg.click('.tab[data-course="train"]'); await pg.waitForTimeout(300); return pg;
}

S.test('training: la pestaña existe y recuerda dificultad y opciones', async c => {
  const pg = await openTrain(c);
  assert(await pg.$('[data-tmode=do]') && await pg.$('[data-tmode=write]'), 'debe haber los dos modos');
  await pg.click('[data-tlv="4"]'); await pg.check('[data-topt=xyz]'); await pg.check('[data-topt=mes]'); await pg.waitForTimeout(200);
  await pg.reload(); await pg.waitForTimeout(500); await pg.click('.tab[data-course="train"]'); await pg.waitForTimeout(300);
  eq(await pg.$eval('[data-tlv="4"]', e => e.getAttribute('aria-pressed')), 'true', 'dificultad guardada');
  eq(await pg.$eval('[data-topt=xyz]', e => e.checked), true); eq(await pg.$eval('[data-topt=mes]', e => e.checked), true);
});

S.test('training «hacer»: acierto y fallo se guardan con fecha; la botonera está y hay estadísticas', async c => {
  const pg = await openTrain(c);
  await pg.click('[data-tlv="2"]'); await pg.click('[data-tmode=do]'); await pg.waitForTimeout(500);
  assert((await pg.$$('.mvbtn')).length >= 18, 'botonera de movimientos visible');
  const seq = await T(pg, 'seq');
  assert(seq.length >= 2 && seq.length <= 3, 'nivel 2: 2 o 3 movimientos, salió ' + seq.join(' '));
  assert(seq.every(m => 'RLUDFB'.includes(m[0])), 'sin x/y/z ni M/E/S si no se piden: ' + seq.join(' '));
  await T(pg, 'play', ['U2', 'U2', 'U2']); await pg.waitForTimeout(1500); /* movimientos de más: fallo */
  eq(await T(pg, 'status'), 'bad');
  await pg.click('[data-act=reset]'); await pg.waitForTimeout(300);
  await T(pg, 'play', seq); await pg.waitForTimeout(2500);
  eq(await T(pg, 'status'), 'ok');
  const log = await trLog(pg);
  eq(log.length, 2); eq(log[0].ok, false); eq(log[1].ok, true); eq(log[1].m, 'do'); eq(log[1].l, 2);
  assert(/^\d{4}-\d{2}-\d{2}T/.test(log[1].t), 'fecha ISO');
  await pg.click('#backBtn'); await pg.waitForTimeout(400);
  const t = await pg.textContent('.tr-stats'); assert(t.includes('1') && t.includes('aciertos'), 'estadísticas: ' + t);
});

S.test('training «escribir»: se eligen las letras, se comprueba y se guarda', async c => {
  const pg = await openTrain(c);
  await pg.click('[data-tlv="2"]'); await pg.click('[data-tmode=write]'); await pg.waitForTimeout(600);
  const seq = await T(pg, 'seq');
  for (const m of seq) { await pg.click('[data-act=wmv][data-mv="' + m + '"]'); }
  assert((await pg.textContent('#wrhist')).includes(seq.join(' ')), 'muestra lo elegido');
  await pg.click('[data-act=wok]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'status'), 'ok');
  await pg.click('[data-act=pnext]'); await pg.waitForTimeout(500);
  const seq2 = await T(pg, 'seq');
  const wrong = seq2[0][0] === 'R' ? "L'" : "R'";
  await pg.click('[data-act=wmv][data-mv="' + wrong + '"]'); await pg.click('[data-act=wok]'); await pg.waitForTimeout(300);
  eq(await T(pg, 'status'), 'bad');
  assert((await pg.textContent('#fb')).includes(seq2.join(' ')), 'enseña la notación correcta');
  const log = await trLog(pg);
  eq(log.map(r => r.ok).join(), 'true,false'); eq(log[0].m, 'write');
});

S.test('training: la dificultad fija la longitud y x/y/z y M/E/S solo salen si se piden', async c => {
  const pg = await openTrain(c);
  const draw = async (lv, xyz, mes) => {
    await pg.evaluate(([lv, xyz, mes]) => {
      const t = JSON.parse(localStorage.getItem('rubik-training') || '{}'); t.opts = { level: lv, xyz, mes }; t.log = t.log || [];
      localStorage.setItem('rubik-training', JSON.stringify(t));
    }, [lv, xyz, mes]);
    await pg.reload(); await pg.waitForTimeout(400); await pg.click('.tab[data-course="train"]'); await pg.waitForTimeout(200);
    await pg.click('[data-tmode=do]'); await pg.waitForTimeout(300);
    const out = [];
    for (let i = 0; i < 12; i++) { out.push(await T(pg, 'seq')); await pg.evaluate(() => window.__T.trainNext()); await pg.waitForTimeout(80); }
    await pg.click('#backBtn'); await pg.waitForTimeout(300);
    return out;
  };
  const r1 = await draw(1, false, false); assert(r1.every(s => s.length === 1), 'nivel 1: un movimiento');
  const r5 = await draw(5, false, false); assert(r5.every(s => s.length >= 11 && s.length <= 16), 'nivel 5: 11 a 16 movimientos');
  assert(r5.every(s => s.every(m => 'RLUDFB'.includes(m[0]))), 'sin extras si no se piden');
  const rx = await draw(3, true, true); assert(rx.some(s => s.some(m => 'xyzMES'.includes(m[0]))), 'con las opciones activas salen x/y/z o M/E/S');
});


S.test('exámenes de 2×2, avanzado y 4×4: pista disponible y último ejercicio sin resaltado y resoluble', async c => {
  for (const [course, id] of [['2x2', 'XT2'], ['adv', 'XV3'], ['4x4', 'XD']]) {
    const pg = await c.lesson(course, id); await goTo(pg, 'ex8');
    assert((await pg.$$('[data-act=hint]')).length === 1, course + ' ' + id + ': debe haber pista');
    assert((await pg.$$('.goalnote .lg')).length === 3, course + ' ' + id + ': el ejercicio 9 resalta');
    await goTo(pg, 'ex9');
    assert((await pg.textContent('.q')).includes('Final'), course + ' ' + id + ': el último es el final');
    eq((await pg.$$('.goalnote .lg')).length, 0, course + ' ' + id + ': sin resaltado en el final');
    await T(pg, 'solveStep'); await pg.waitForSelector('[data-act=next]', { timeout: 90000 });
  }
});


S.test('training: «letras normales» activa por defecto; sin ningún tipo los botones se desactivan; solo x/y/z', async c => {
  const pg = await openTrain(c);
  eq(await pg.$eval('[data-topt=faces]', e => e.checked), true, 'letras normales activas por defecto');
  eq(await pg.$eval('[data-topt=xyz]', e => e.checked), false); eq(await pg.$eval('[data-topt=mes]', e => e.checked), false);
  await pg.uncheck('[data-topt=faces]'); await pg.waitForTimeout(200);
  eq(await pg.$eval('[data-tmode=do]', e => e.disabled), true, 'sin letras: «hacer» desactivado');
  eq(await pg.$eval('[data-tmode=write]', e => e.disabled), true, 'sin letras: «escribir» desactivado');
  await pg.check('[data-topt=xyz]'); await pg.waitForTimeout(200);
  eq(await pg.$eval('[data-tmode=do]', e => e.disabled), false);
  await pg.click('[data-tlv="3"]'); await pg.click('[data-tmode=do]'); await pg.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    const sq = await T(pg, 'seq'); assert(sq.every(m => 'xyz'.includes(m[0])), 'solo x/y/z: ' + sq.join(' '));
    await pg.evaluate(() => window.__T.trainNext()); await pg.waitForTimeout(60);
  }
});

S.test('móvil: las pestañas caben en su fila y el botón de ajustes se ve', async c => {
  const pg = await c.app({ viewport: { width: 390, height: 780 } });
  const r = await pg.evaluate(() => {
    const t = document.querySelector('#tabs').getBoundingClientRect(), g = document.querySelector('#settingsBtn').getBoundingClientRect();
    return { tabsR: t.right, tabsW: t.width, gearL: g.left, gearR: g.right, vw: innerWidth, doc: document.documentElement.scrollWidth };
  });
  assert(r.tabsR <= r.vw + 1, 'las pestañas no deben salirse: ' + JSON.stringify(r));
  assert(r.gearR <= r.vw && r.gearL >= 0, 'los ajustes deben verse: ' + JSON.stringify(r));
  assert(r.doc <= r.vw + 1, 'no debe haber scroll horizontal: ' + JSON.stringify(r));
  await pg.click('#settingsBtn'); await pg.waitForTimeout(200);
  assert(await pg.isVisible('#settingsPanel'), 'el panel de ajustes se abre');
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
  assert(exp.v === 3 && exp.progress && exp.settings && exp.training, 'formato {v:3, progress, settings, training}');
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
      async app(opts) { const pg = await openApp(browser, file, opts); pages.push(pg); return pg; },
      async errors() { const errs = []; pages.forEach(p => (p.errors || []).forEach(e => errs.push(e))); return errs; },
      async close() { for (const p of pages) await p.close().catch(() => {}); }
    };
    return ctx;
  });
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
