/* Coherencia del temario: NUNCA se pregunta nada que aún no se haya enseñado.
 *
 * Para cada ejercicio (de lección, de mini-examen y de repaso) se mira qué necesita y se comprueba que
 * la lección que lo enseña viene ANTES (o es la misma):
 *   1. Notación: cada letra y cada símbolo (', 2, x y z, M E S, Rw, 2R) se enseña antes de usarse.
 *   2. Algoritmos: cada algoritmo, cuántas veces se repite y girar el cubo con y, en la lección que lo enseña.
 *   3. Conceptos: palabras como «Sune», «conmutador», «paridad», «F2L»… no aparecen en un ejercicio
 *      antes de aparecer en el texto de alguna lección.
 *
 * Las tablas de abajo SON el mapa de dependencias del temario: si añades una lección o un algoritmo,
 * actualízalas. Así una lección nueva no puede colar un ejercicio que pida algo todavía sin enseñar.
 */
const fs = require('fs');
const { INDEX } = require('./lib');

const html = fs.readFileSync(INDEX, 'utf8');
const a = html.indexOf('/*LOGIC-START*/');
const b = html.indexOf('/*DATA-END*/');
if (a < 0 || b < 0) { console.error('No encuentro las marcas LOGIC-START / DATA-END en index.html'); process.exit(1); }

const result = new Function(html.slice(a, b) + `
var viol=[],checked=0;
function strip(h){return String(h||'').replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ');}
function idxOf(arr,id){return arr.findIndex(function(l){return l.id===id;});}
function lname(l){return (l.disp||l.id)+(l.exam?' (examen)':'');}
function match(sol,i,alg){for(var k=0;k<alg.length;k++){if(sol[i+k]!==alg[k])return false;}return true;}
/* longitudes de las rachas consecutivas de un algoritmo dentro de una solución */
function runs(sol,alg){var out=[],i=0,n=alg.length;
  while(i<=sol.length-n){if(match(sol,i,alg)){var r=0;while(i<=sol.length-n&&match(sol,i,alg)){r++;i+=n;}out.push(r);}else i++;}
  return out;}
function has(sol,alg){return runs(sol,alg).length>0;}
function moveTokens(e){return (e.seq||[]).concat(e.anim||[],e.sol||[]);}
var MV=/^(2?)([RLUDFBxyzMES])(w?)(['2]?)$/;

/* ---------- 1. notación (curso 3×3, por orden de lecciones) ---------- */
var LETTER_AT={R:'1.1',U:'1.2',F:'1.3',L:'1.4',D:'1.5',B:'1.6',x:'2.2',y:'2.2',z:'2.2',M:'S1',E:'S1',S:'S1'};
var PRIME_AT={R:'1.7',U:'1.7',L:'1.8',D:'1.8',F:'1.8',B:'1.8',x:'2.2',y:'2.2',z:'2.2',M:'S1',E:'S1',S:'S1'};
var TWO_AT={R:'1.9',U:'1.9',L:'1.9',D:'1.9',F:'1.9',B:'1.9',x:'2.2',y:'2.2',z:'2.2',M:'S1',E:'S1',S:'S1'};
function checkNotation3(){
  LESSONS3.forEach(function(l,i){(l.exercises||[]).forEach(function(e,j){
    moveTokens(e).forEach(function(t){var m=MV.exec(t);if(!m)return;checked++;var L=m[2],suf=m[4];
      function need(id,what){if(idxOf(LESSONS3,id)>i)viol.push('3×3 '+lname(l)+' ej.'+(j+1)+': usa «'+t+'» ('+what+') y se enseña en '+id);}
      need(LETTER_AT[L],'la letra '+L);
      if(suf==="'")need(PRIME_AT[L],"el apóstrofo");
      if(suf==='2')need(TWO_AT[L],'el 2');});});});}

/* ---------- 2. algoritmos y técnicas: qué lección enseña cada cosa, por curso ---------- */
function algs3(sol,goal){
  var out=[];
  runs(sol,SEX).forEach(function(r){var at={1:'3.1',2:'3.4',3:'3.2',4:'3.4',5:'3.3'}[r];if(at)out.push(['R U R\\' U\\' ×'+r,at]);});
  if(sol.some(function(m){return /^y/.test(m);})){if(goal==='layer1')out.push(['girar el cubo con y para la siguiente esquina','3.5']);if(goal==='layer2')out.push(['girar el cubo con y para la siguiente arista','4.4']);}
  if(has(sol,AR))out.push(['arista del medio a la derecha','4.1']);
  if(has(sol,AL))out.push(['arista del medio a la izquierda','4.2']);
  if(runs(sol,AR).some(function(r){return r>=2;})||runs(sol,AL).some(function(r){return r>=2;}))out.push(['arista atascada (repetir el algoritmo)','4.3']);
  if(has(sol,YA))out.push(['cruz amarilla: línea','5.1']);
  if(has(sol,YB))out.push(['cruz amarilla: L','5.2']);
  if(has(sol,YA)&&has(sol,YB))out.push(['cruz amarilla: el punto (dos algoritmos)','5.3']);
  if(has(sol,SUNE))out.push(['Sune','5.4']);
  if(runs(sol,SUNE).some(function(r){return r>=2;}))out.push(['Sune repetido','5.5']);
  if(has(sol,CORN))out.push(['colocar esquinas amarillas','5.6']);
  if(has(sol,UA))out.push(['aristas amarillas','5.7']);
  return out;}
function algsAdv(sol,goal){
  var out=algs3(sol,goal).filter(function(x){return false;});
  if(has(sol,F2L1)||has(sol,F2L2)||has(sol,F2L3)||has(sol,F2L4))out.push(['insertar un par','V2']);
  if(has(sol,F2L5)||has(sol,F2L6))out.push(['otros pares de F2L','V3']);
  if(sol.some(function(m){return /^y/.test(m);})&&goal==='layer2')out.push(['girar el cubo con y entre pares','V4']);
  if(has(sol,YA)||has(sol,YB))out.push(['cruz amarilla (OLL)','V5']);
  if(has(sol,SUNE)||has(sol,ANTI))out.push(['Sune / Anti-Sune','V6']);
  if(has(sol,HOLL)||has(sol,PIOLL)||has(sol,UOLL))out.push(['OLL H, Pi o U','V7']);
  if(has(sol,TOLL)||has(sol,LOLL)||sol.some(function(m){return /^[RLUDFB]w/.test(m);}))out.push(['OLL T o L (Rw)','V8']);
  if(has(sol,APERM)||has(sol,YPERM))out.push(['PLL de esquinas','V9']);
  if(has(sol,UA)||has(sol,UB)||has(sol,HPERM)||has(sol,ZPERM))out.push(['PLL de aristas','V10']);
  return out;}
function algs2(sol,goal){
  var out=[];
  runs(sol,SEX).forEach(function(r){if(r<=5)out.push(['R U R\\' U\\' ×'+r,'T4']);});
  if(sol.some(function(m){return /^y/.test(m);}))out.push(['girar el cubo con y','T5']);
  if(has(sol,SUNE)||has(sol,ANTI))out.push(['Sune / Anti-Sune','T6']);
  if(has(sol,HOLL)||has(sol,PIOLL)||has(sol,UOLL)||has(sol,TOLL2)||has(sol,LOLL2))out.push(['casos H, Pi, U, T, L','T7']);
  if(has(sol,TPERM)||has(sol,YPERM))out.push(['T-perm / Y-perm','T8']);
  return out;}
function algs4(sol,goal){
  var out=[];
  if(sol.some(function(m){return /^[RLUDFB]w/.test(m);}))out.push(['capa ancha (Rw…)','A3']);
  if(sol.some(function(m){return /^2[RLUDFB]/.test(m);}))out.push(['capa interna (2R…)','A4']);
  if(sol.some(function(m){return /^2[RLUDFB]/.test(m);})&&(goal==='centers'||/^cf:/.test(goal)))out.push(['mover centros con capas internas','B1']);
  if(has(sol,P("2R' 2U 2R 2U'"))||has(sol,P("2L 2F 2L' 2F'"))||has(sol,P("2D 2B 2D' 2B'")))out.push(['conmutador de centros','B2']);
  if(has(sol,P("Rw U R' U' Rw' F R F'")))out.push(['algoritmo de emparejado','C2']);
  if(has(sol,P("Lw' U' L U Lw F' L' F")))out.push(['algoritmo espejo de emparejado','C4']);
  if(sol.some(function(m){return /^y/.test(m);})&&goal==='paired')out.push(['girar el cubo con y entre aristas','C3']);
  /* el 4×4 se desbloquea tras el 3×3: R U R' U' repetido ya se conoce; solo hace falta que se explique en D1 */
  if(has(sol,SEX))out.push(['R U R\\' U\\'','D1']);
  if(sol.some(function(m){return /^y/.test(m);})&&goal==='layer1')out.push(['girar el cubo con y','D2']);
  if(has(sol,AR)||has(sol,AL))out.push(['capa del medio','D3']);
  if(has(sol,YA)||has(sol,YB)||has(sol,SUNE)||has(sol,CORN)||has(sol,UA))out.push(['capa de arriba','D4']);
  if(has(sol,OP))out.push(['paridad: arista girada','E2']);
  if(has(sol,PP))out.push(['paridad: aristas intercambiadas','E3']);
  return out;}
var COURSES=[
  ['2×2',LESSONS2,algs2],['3×3',LESSONS3,algs3],['4×4',LESSONS4,algs4],['Avanzado',LESSONSA,algsAdv]];
function checkAlgs(){
  COURSES.forEach(function(c){var arr=c[1],fn=c[2];
    arr.forEach(function(l,i){(l.exercises||[]).forEach(function(e,j){
      if(e.t!=='solve'||!e.sol)return;checked++;
      fn(e.sol,e.goal).forEach(function(x){var at=idxOf(arr,x[1]);
        if(at<0){viol.push(c[0]+' '+lname(l)+' ej.'+(j+1)+': necesita «'+x[0]+'» pero la lección '+x[1]+' no existe');return;}
        if(at>i)viol.push(c[0]+' '+lname(l)+' ej.'+(j+1)+': pide «'+x[0]+'» y se enseña en '+x[1]);});});});});}

/* ---------- 3. conceptos: no se nombra nada antes de que algún texto de lección lo explique ---------- */
var KEYS={
  '2×2':[['Sune',/Sune/],['Anti-Sune',/Anti-Sune/],['T-perm / Y-perm',/T-perm|Y-perm|la T\\b|la Y\\b/]],
  '3×3':[['la flor / los pétalos',/\\bflor\\b|pétalo/i],['la cruz blanca',/cruz blanca/i],['Sune',/Sune/],['cruz amarilla',/cruz amarilla/i],['esquina atascada',/atascad/i],['M, E, S',/\\bM, E\\b|capa(s)? de en medio|capa media/i]],
  '4×4':[['conmutador',/conmutador/i],['paridad',/paridad/i],['capa ancha (Rw)',/\\bRw\\b|capa(s)? ancha/i],['capa interna (2R)',/\\b2[RLUDFB]\\b|capa(s)? interna/i],['emparejar aristas',/emparej/i]],
  'Avanzado':[['F2L',/F2L/],['OLL',/\\bOLL\\b/],['PLL',/\\bPLL\\b/],['Rw',/\\bRw\\b/],['A-perm',/A-perm|\\bA:\\s/],['H, Pi, U',/\\bPi\\b/]]};
function teachText(l){return strip((l.title||'')+' '+(l.sub||'')+' '+(l.recap||'')+' '+(l.learn||'')+' '+(l.pages||[]).map(function(p){return p.t;}).join(' '));}
function exText(e){return strip((e.q||'')+' '+(e.hint||'')+' '+(e.options||[]).map(function(o){return o.label;}).join(' '));}
function checkConcepts(){
  COURSES.forEach(function(c){var arr=c[1];(KEYS[c[0]]||[]).forEach(function(k){
    var first=-1;arr.forEach(function(l,i){if(first<0&&!l.exam&&k[1].test(teachText(l)))first=i;});
    arr.forEach(function(l,i){(l.exercises||[]).forEach(function(e,j){
      if(!k[1].test(exText(e)))return;checked++;
      if(first<0)viol.push(c[0]+' '+lname(l)+' ej.'+(j+1)+': nombra «'+k[0]+'» y ninguna lección lo explica');
      else if(first>i)viol.push(c[0]+' '+lname(l)+' ej.'+(j+1)+': nombra «'+k[0]+'» y se explica en '+lname(arr[first]));});});});});}


/* ---------- 4. cobertura: toda la solución se explica con algoritmos ya enseñados + giros sueltos de U/y ----------
   Si añades una lección con un algoritmo nuevo, hay que registrarlo aquí: mientras no esté, falla. */
function seqStr(x){return x.join(' ');}
function ex2(a){var o=[];a.forEach(function(m){if(m==='U2')o.push('U','U');else if(m==='y2')o.push('y','y');else o.push(m);});return o;}
function covered(sol0,pieces0,i,arr){
  var sol=ex2(sol0),pieces=pieces0.map(function(p){return [ex2(p[0]),p[1]];}),memo={};
  function go(k){if(k>=sol.length)return true;if(k in memo)return memo[k];var ok=false;
    if(/^(U|U'|U2|y|y'|y2)$/.test(sol[k]))ok=go(k+1);
    for(var p=0;p<pieces.length&&!ok;p++){var seq=pieces[p][0],at=idxOf(arr,pieces[p][1]);
      if(at<0||at>i)continue;if(match(sol,k,seq)&&go(k+seq.length))ok=true;}
    return memo[k]=ok;}
  return go(0);}
function checkCoverage(name,arr,firstId,pieces,skipIds){
  var f=idxOf(arr,firstId);
  arr.forEach(function(l,i){if(i<f||skipIds.indexOf(l.id)>=0)return;(l.exercises||[]).forEach(function(e,j){
    if(e.t!=='solve'||!e.sol||e.rand)return;checked++;
    if(!covered(e.sol,pieces,i,arr))viol.push(name+' '+lname(l)+' ej.'+(j+1)+': su solución usa movimientos que ninguna lección anterior enseña ('+seqStr(e.sol)+')');});});}
function checkCoverageAll(){
  checkCoverage('3×3',LESSONS3,'3.1',[[SEX,'3.1'],[AR,'4.1'],[AL,'4.2'],[AR.slice(1),'4.3'],[AL.slice(1),'4.3'],[YA,'5.1'],[YB,'5.2'],[SUNE,'5.4'],[CORN,'5.6'],[UA,'5.7']],['6.1']);
  checkCoverage('2×2',LESSONS2,'T4',[[SEX,'T4'],[SUNE,'T6'],[ANTI,'T6'],[HOLL,'T7'],[PIOLL,'T7'],[UOLL,'T7'],[TOLL2,'T7'],[LOLL2,'T7'],[TPERM,'T8'],[YPERM,'T8']],['T9']);
  checkCoverage('Avanzado',LESSONSA,'V2',[[F2L1,'V2'],[F2L2,'V2'],[F2L3,'V2'],[F2L4,'V2'],[F2L5,'V3'],[F2L6,'V3'],[YA,'V5'],[YB,'V5'],[SUNE,'V6'],[ANTI,'V6'],[HOLL,'V7'],[PIOLL,'V7'],[UOLL,'V7'],[TOLL,'V8'],[LOLL,'V8'],[APERM,'V9'],[YPERM,'V9'],[UA,'V10'],[UB,'V10'],[HPERM,'V10'],[ZPERM,'V10']],['V11']);}
checkNotation3();checkAlgs();checkConcepts();checkCoverageAll();
return {viol:viol,checked:checked};
`)();

console.log('\nCoherencia del temario (nada se pregunta antes de enseñarse)');
console.log('  ' + result.checked + ' comprobaciones');
let failed = 0;
result.viol.forEach(m => { failed++; console.log('  ✗ ' + m); });
if (result.checked < 500) { failed++; console.log('  ✗ hay muchas menos comprobaciones de las esperadas'); }
if (!failed) console.log('  ✓ todo correcto');
process.exit(failed ? 1 : 0);
