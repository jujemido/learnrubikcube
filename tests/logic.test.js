/* Comprueba el contenido de los cursos sin abrir el navegador:
 *  - todos los movimientos son válidos,
 *  - cada ejercicio «resolver» parte de un cubo que NO cumple el objetivo y la solución lo cumple,
 *  - las preguntas de elegir tienen su respuesta entre las opciones,
 *  - los mini-exámenes tienen 10 ejercicios.
 */
const fs = require('fs');
const { INDEX } = require('./lib');

const html = fs.readFileSync(INDEX, 'utf8');
const a = html.indexOf('/*LOGIC-START*/');
const b = html.indexOf('/*DATA-END*/');
if (a < 0 || b < 0) { console.error('No encuentro las marcas LOGIC-START / DATA-END en index.html'); process.exit(1); }

const result = new Function(html.slice(a, b) + `
  var bad=[],total=0,lessons=0,solve=0,exams=[];
  function chk(name,L,n){
    setN(n);
    L.forEach(function(l){
      lessons++;
      (l.demo||[]).concat(l.pre||[]).forEach(function(m){try{parseMove(m)}catch(e){bad.push('movimiento inválido '+name+' '+l.id+' '+m)}});
      if(l.exam&&l.exercises.length!==10)exams.push(name+' '+l.id+' tiene '+l.exercises.length+' ejercicios');
      (l.pages||[]).forEach(function(pg,pi){
        var tp=name+' '+l.id+' página '+(pi+1);
        if(!pg.t)bad.push(tp+': sin texto');
        (pg.pre||[]).concat(pg.demo||[]).forEach(function(m){try{parseMove(m)}catch(e){bad.push('movimiento inválido '+tp+' '+m)}});
        try{seqState(pg.pre||[])}catch(e){bad.push(tp+': el estado de la página no se puede calcular')}
      });
      if(!l.exam&&!l.pages&&/^(2|3|4|5)\./.test(l.id)===false&&l.block>=3&&['3x3'].indexOf(name)<0&&l.id!=='F1')bad.push(name+' '+l.id+': la lección no tiene páginas');
      l.exercises.forEach(function(e,i){
        var tag=name+' '+l.id+' ex'+(i+1);
        if(e.t==='solve'&&!e.noHl&&(!e.hl||String(e.hl).indexOf('g:')!==0))bad.push(tag+': el ejercicio de resolver no resalta lo que falta (hl g:objetivo)');
        (e.seq||e.anim||[]).forEach(function(m){try{parseMove(m)}catch(x){bad.push('movimiento inválido '+tag+' '+m)}});
        if(e.t==='solve'){
          solve++;
          (e.sol||[]).forEach(function(m){try{parseMove(m)}catch(x){bad.push('solución inválida '+tag+' '+m)}});
          var s0=seqState((e.pre||[]).concat(e.setup||[]));
          var g0=goalFn(e.goal)(s0),g1=goalFn(e.goal)(seqState(e.sol,s0));
          if(g0)bad.push(tag+': el cubo de partida ya cumple el objetivo');
          if(!g1)bad.push(tag+': la solución no cumple el objetivo');
          if(e.prereq&&!goalFn(e.prereq)(s0))bad.push(tag+': no cumple el requisito previo '+e.prereq);
        }
        if(e.t==='choice'&&!e.options.some(function(o){return String(o.v)===String(e.answer)}))bad.push(tag+': la respuesta no está entre las opciones');
      });
    });
  }
  setN(3);
  (function(){var e=LESSONS3.filter(function(x){return x.id==='2.5'})[0].exercises[0];
    var s0=seqState((e.pre||[]).concat(e.setup||[]));
    ['M2','x2','y2'].forEach(function(alt){if(goalFn(e.goal)(seqState(alt.split(' '),s0)))bad.push('2.5 ex1: «'+alt+'» no debería valer como solución');});
    var f=LESSONS3.filter(function(x){return x.id==='2.3'})[0].exercises[1];
    var f0=seqState((f.pre||[]).concat(f.setup||[]));
    ['M','E','S','x','y','z','M2'].forEach(function(alt){if(goalFn(f.goal)(seqState([alt],f0)))bad.push('2.3 ex2: «'+alt+'» no debería valer como solución');});})();
  (function(){
    function F(arr,id){return arr.filter(function(x){return x.id===id})[0];}
    ['3.1','3.2','3.3','3.4','4.1','4.2','4.3'].forEach(function(id){F(LESSONS3,id).exercises.forEach(function(e,i){
      if((e.sol||[]).some(function(m){return /^y/.test(m);}))bad.push('3x3 '+id+' ex'+(i+1)+': pide girar el cubo con y antes de que se enseñe (3.5 / 4.4)');});});
    F(LESSONSA,'V3').exercises.forEach(function(e,i){if((e.sol||[]).some(function(m){return /^y/.test(m);}))bad.push('adv V3 ex'+(i+1)+': pide y antes de V4');});
    (function(){var e3=F(LESSONS3,'e3'),e4=F(LESSONS3,'e4');
      e3.exercises.forEach(function(e,i){if((e.sol||[]).some(function(m){return /^y/.test(m);}))bad.push('3x3 e3 (tras 3.3) ej'+(i+1)+': pide y, que se enseña en 3.5');});
      e4.exercises.forEach(function(e,i){if(e.goal!=='ycross')bad.push('3x3 e4 (tras 5.3) ej'+(i+1)+': pide '+e.goal+', y solo se ha enseñado la cruz amarilla');});})();
    ['R3','R4'].forEach(function(id){var r=F(LESSONS3,id);if(!r||!r.optional)bad.push(id+': falta el repaso o no es opcional');});
  })();
  chk('2x2',LESSONS2,2);chk('adv',LESSONSA,3);chk('3x3',LESSONS3,3);chk('4x4',LESSONS4,4);
  var tut=[LESSONS3[0],LESSONS2[0],LESSONS4[0],LESSONSA[0]].map(function(l){return {id:l.id,optional:!!l.optional,exs:l.exercises.length,text:(l.pages||[]).map(function(p){return p.t}).join(' ').replace(/<[^>]+>/g,' ')+' '+l.exercises.map(function(e){return e.q}).join(' ')};});
  return {bad:bad,lessons:lessons,solve:solve,exams:exams,tut:tut};
`)();

console.log('\nContenido de los cursos');
console.log('  ' + result.lessons + ' lecciones, ' + result.solve + ' ejercicios de resolver comprobados');
let failed = 0;
result.bad.forEach(m => { failed++; console.log('  ✗ ' + m); });
result.exams.forEach(m => { failed++; console.log('  ✗ ' + m); });
if (result.lessons < 100 || result.solve < 300) { failed++; console.log('  ✗ hay muchas menos lecciones o ejercicios de los esperados'); }

/* Tutorial del visor: la primera lección de cada curso, opcional, y explica TODOS los controles del visor.
   Si añades o cambias un botón del visor, actualiza el tutorial (y esta tabla). */
const CONTROLS = { hlt: /ojo/i, helpBtn: /\?/, undoBtn: /Deshacer/, redoBtn: /Rehacer/, rstBtn: /Reiniciar/, hintBtn: /bombilla/i, fullBtn: /pantalla completa/i, rstNo: null, rstYes: null, tlPlay: /Reproducir/, tlStop: /cuadrado/i, tlSpeed: /velocidad/i };
const sa = html.indexOf('<div class="stage" id="stage">'), sb = html.indexOf('id="panel"');
const stageIds = [...html.slice(sa, sb).matchAll(/<(?:button|select|input)[^>]*?id="(\w+)"/g)].map(m => m[1]);
console.log('\nTutorial del visor');
result.tut.forEach(t => {
  if (!t.optional) { failed++; console.log('  ✗ ' + t.id + ': el tutorial debe ser opcional (no bloquea el progreso)'); }
  if (t.exs < 3) { failed++; console.log('  ✗ ' + t.id + ': el tutorial necesita preguntas de repaso'); }
  Object.keys(CONTROLS).forEach(id => { if (CONTROLS[id] && !CONTROLS[id].test(t.text)) { failed++; console.log('  ✗ ' + t.id + ': el tutorial no explica el control «' + id + '»'); } });
  if (!/Atajos/.test(t.text) || !/Ajustes/.test(t.text) || !/Pista|pista/.test(t.text)) { failed++; console.log('  ✗ ' + t.id + ': faltan atajos, ajustes o pistas'); }
});
stageIds.forEach(id => { if (!(id in CONTROLS)) { failed++; console.log('  ✗ hay un control nuevo en el visor («' + id + '») que el tutorial no explica: añádelo al tutorial y a CONTROLS'); } });
if (!failed) console.log('  ✓ todo correcto');
process.exit(failed ? 1 : 0);
