/* Utilidades comunes de las pruebas.
 *
 * Las pruebas de interfaz abren una COPIA temporal de index.html con un pequeño gancho
 * (window.__T) que da acceso al estado interno. index.html no se modifica nunca.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = process.env.RUBIK_HTML ? path.resolve(process.env.RUBIK_HTML) : path.join(ROOT, 'index.html');

function playwright() {
  try { return require('playwright'); } catch (e) {
    console.error('Falta Playwright: ejecuta «npm install» dentro de tests/ (o instálalo globalmente).');
    process.exit(2);
  }
}

/* Gancho: se inserta justo antes de arrancar la app. Vive en el mismo ámbito que el código de la app. */
const HOOK = `window.__T={
  ids:function(c){return courseLessons(c).map(function(l){return l.id;});},
  kind:function(){return lesson?curKind():null;},
  kinds:function(){return stepKinds().join(',');},
  step:function(){return step+'/'+maxStep;},
  go:function(k){goStep(typeof k==='number'?k:stepKinds().indexOf(k));},
  map:function(){showMap();},
  res:function(){return JSON.stringify(prog.res||{});},
  seq:function(){var e=curExercise();return e&&e.seq||null;},
  ans:function(){var e=curExercise();return e&&e.answer;},
  quick:function(){return ex.quick.opts.indexOf(ex.quick.answer);},
  play:function(sq){sq.forEach(function(m){pushGroup(1);ex.queued++;move(m,{user:true,speed:1.7});});},
  hist:function(){return ex?ex.moves.join(' '):null;},
  redo:function(){return ex?ex.redo.length:null;},
  status:function(){return ex?ex.status:null;},
  az:function(){return az;},zoom:function(){return zoom;},
  live:function(){return turnLive?{theta:turnLive.theta,a:turnLive.a,all:!!turnLive.all}:null;},
  view:function(a,e){az=a;el=e;setCam();},
  k:function(m){return mvSpec(parseMove(m)).k;},
  cue:function(){return viewEl.classList.contains('holdcue');},
  holdView:function(v){settings.holdView=v;},
  speed:function(){return tl.speed;},
  disp:function(c,b){return courseLessons(c).filter(function(l){return l.block===b&&!l.exam;}).map(function(l){return l.disp||l.id;});},
  page:function(){return ex?(ex.page||0):0;},
  pages:function(){return lesson&&lesson.pages?lesson.pages.length:0;},
  quickIdx:function(){return ex&&ex.quick?ex.quick.opts.indexOf(ex.quick.answer):-1;},
  tapAny:function(e){
    for(var ci=0;ci<state.length;ci++){var c=state[ci];for(var si=0;si<c.s.length;si++){
      var p={ci:ci,n:c.s[si].n,color:c.s[si].c,type:c.s.length,cols:c.s.map(function(x){return x.c;})};
      if(!e||e.test(p)){handleTap(p);return true;}}}
    return false;},
  solveStep:function(){
    var k=curKind(),e=curExercise();
    if(k==='try'){
      if(lesson.tryKind==='moves'){pushGroup(1);ex.queued++;move(lesson.pad[0],{user:true});}
      else{window.__T.tapAny(null);}
      return 'try';}
    if(!e)return 'nav';
    if(e.t==='do'){e.seq.forEach(function(m){pushGroup(1);ex.queued++;move(m,{user:true});});}
    else if(e.t==='solve'){e.sol.forEach(function(m){pushGroup(1);ex.queued++;move(m,{user:true});});}
    else if(e.t==='tap'){if(!window.__T.tapAny(e))return 'notap';}
    return e.t;},
  screenOf:function(x,y,z){var v=new THREE.Vector3(x,y,z).project(camera);var r=renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};}
};
`;

function hookedPath() {
  let s = fs.readFileSync(INDEX, 'utf8');
  const anchor = 'loadProg();\napplySettings();';
  if (s.split(anchor).length !== 2) throw new Error('No encuentro el punto de arranque de la app en index.html (¿ha cambiado?).');
  s = s.replace(anchor, HOOK + anchor);
  const f = path.join(os.tmpdir(), 'rubik-test-' + process.pid + '.html');
  fs.writeFileSync(f, s);
  return f;
}

/* Pequeño ejecutor de pruebas */
function suite(name) {
  const cases = [];
  return {
    test(title, fn) { cases.push([title, fn]); },
    async run(setup) {
      let failed = 0;
      console.log('\n' + name);
      for (const [title, fn] of cases) {
        const ctx = setup ? await setup() : {};
        const t0 = Date.now();
        try {
          await fn(ctx);
          const errs = ctx.errors ? await ctx.errors() : [];
          if (errs.length) throw new Error('errores de JavaScript en la página: ' + errs.join(' | '));
          console.log('  ✓ ' + title + ' (' + (Date.now() - t0) + ' ms)');
        } catch (e) { failed++; console.log('  ✗ ' + title + '\n      ' + String(e && e.message || e).split('\n').join('\n      ')); }
        if (ctx.close) await ctx.close();
      }
      return failed;
    }
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'aserción falsa'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'esperaba ' + JSON.stringify(b) + ' y salió ' + JSON.stringify(a)); }

/* Abre la app (copia con gancho) con el progreso y los ajustes indicados. */
async function openApp(browser, file, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1100, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(500);
  await page.evaluate(([done, settings]) => {
    localStorage.clear();
    localStorage.setItem('rubik-paso-a-paso-v1', JSON.stringify({ done: done }));
    if (settings) localStorage.setItem('rubik-ajustes', JSON.stringify(settings));
  }, [opts.done || {}, opts.settings || null]);
  await page.reload();
  await page.waitForTimeout(500);
  page.errors = errors;
  return page;
}

/* Marca como hechas todas las lecciones anteriores a `id` del curso y abre `id`. */
async function openLesson(browser, file, course, id, opts) {
  opts = opts || {};
  let page = await browser.newPage();
  await page.goto('file://' + file);
  await page.waitForTimeout(400);
  const ids = await page.evaluate(c => window.__T.ids(c), course);
  await page.close();
  const idx = ids.indexOf(id);
  if (idx < 0) throw new Error('No existe la lección ' + id + ' en ' + course);
  const done = {};
  ids.slice(0, idx).forEach(x => { done[x] = { errors: 0, tries: 1 }; });
  /* para abrir 4×4 y avanzado hay que tener hecho el 3×3 */
  if (course === 'adv' || course === '4x4') {
    const p3 = await browser.newPage(); await p3.goto('file://' + file); await p3.waitForTimeout(300);
    (await p3.evaluate(() => window.__T.ids('3x3'))).forEach(x => { done[x] = { errors: 0, tries: 1 }; });
    await p3.close();
  }
  page = await openApp(browser, file, { done: Object.assign({}, opts.done || {}, done), settings: opts.settings });
  await page.click('.tab[data-course="' + course + '"]');
  await page.click('.lrow[data-lesson="' + idx + '"]');
  await page.waitForTimeout(350);
  return page;
}

/* Responde la pregunta relámpago (si la hay) y avanza hasta el paso `kind`. */
async function goTo(page, kind) {
  await page.evaluate(k => window.__T.go(k), kind);
  await page.waitForTimeout(300);
}

/* Arrastra con el ratón desde la proyección de una pieza. dy<0 = hacia arriba. */
async function drag(page, point, dx, dy, steps) {
  const p = await page.evaluate(([x, y, z]) => window.__T.screenOf(x, y, z), point);
  steps = steps || 12;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(p.x + dx * i / steps, p.y + dy * i / steps); await page.waitForTimeout(12); }
  await page.mouse.up();
  await page.waitForTimeout(700);
}

module.exports = { ROOT, INDEX, playwright, hookedPath, suite, assert, eq, openApp, openLesson, goTo, drag };
