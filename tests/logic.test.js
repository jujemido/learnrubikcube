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
      l.exercises.forEach(function(e,i){
        var tag=name+' '+l.id+' ex'+(i+1);
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
  chk('2x2',LESSONS2,2);chk('adv',LESSONSA,3);chk('3x3',LESSONS3,3);chk('4x4',LESSONS4,4);
  return {bad:bad,lessons:lessons,solve:solve,exams:exams};
`)();

console.log('\nContenido de los cursos');
console.log('  ' + result.lessons + ' lecciones, ' + result.solve + ' ejercicios de resolver comprobados');
let failed = 0;
result.bad.forEach(m => { failed++; console.log('  ✗ ' + m); });
result.exams.forEach(m => { failed++; console.log('  ✗ ' + m); });
if (result.lessons < 100 || result.solve < 300) { failed++; console.log('  ✗ hay muchas menos lecciones o ejercicios de los esperados'); }
if (!failed) console.log('  ✓ todo correcto');
process.exit(failed ? 1 : 0);
