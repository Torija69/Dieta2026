'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const context = vm.createContext({
  console, window: {Nube: {}, addEventListener() {}},
  document: {addEventListener() {}, querySelector() {return null;}, querySelectorAll() {return [];}},
});
vm.runInContext(source + '\nglobalThis.security = {validarCopiaImportada,esFotoSegura,estadoInicial,Fotos};', context);
const {validarCopiaImportada: validar, esFotoSegura, estadoInicial, Fotos} = context.security;
const clone = (v) => JSON.parse(JSON.stringify(v));
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yAcYAAAAASUVORK5CYII=';
const base = clone(estadoInicial('2026-10-05'));
base.mealLogs['2026-10-22-desayuno'] = {
  fecha:'2026-10-22', tipoDeComida:'desayuno', estado:'cumplida',
  comentario:'Texto <img src=x onerror=alert(1)> literal', fotografia:'foto-2026-10-22-desayuno',
};
base.fotos = {'foto-2026-10-22-desayuno':png};
base.shoppingLists['2026-10-26'] = {productos:[
  {id:'prod-prueba-1',nombre:'Pan',categoria:'Otros',cantidad:'2',unidad:'uds',nota:'',comprado:false},
]};
base.programHistory.push({
  fechaInicioPrograma:'2026-01-01',fechaFinPrograma:'2026-06-30',
  comidasCumplidas:10,comidasNoCumplidas:2,adherencia:83.3,archivadoEn:'2026-07-01T12:00:00.000Z',
});
assert.equal(validar(base),true,'copia completa válida con foto, menú, historia y textos literales');
assert.equal(validar({settings:{fechaInicioPrograma:'2026-10-05'}}),true,'copia antigua mínima válida');
assert.equal(validar(clone(estadoInicial('2026-10-05'))),true,'estado original válido');
const snapshot = JSON.stringify(base);
const mutations = [
  v=>{v.exceptions[0].id='x" autofocus onfocus="alert(1)';},
  v=>{v.shoppingLists['2026-10-26'].productos[0].id='x"><img src=x onerror=alert(1)>';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='x" onerror="alert(1)';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='javascript:alert(1)';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='https://example.invalid/tracking.png';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='data:text/html;base64,PHNjcmlwdD4=';},
  v=>{v.fotos['foto-2026-10-22-desayuno']='data:image/png;base64,AAAA" onload="alert(1)';},
  v=>{v.fotos['x" onerror="alert(1)']=png;},
  v=>{v.settings.fechaInicioPrograma='2026-02-30';},
  v=>{v.settings.menuSemana1[0].comida={toString:'malicioso'};},
  v=>{v.programHistory[0].comidasCumplidas='<img src=x onerror=alert(1)>';},
  v=>{v.programHistory[0].adherencia='<svg onload=alert(1)>';},
  v=>{v.mealLogs['2026-10-22-desayuno'].estado='__proto__';},
  v=>{v.exceptions[0].fechaFin='2025-01-01';},
  v=>{v.shoppingLists['2026-10-26'].productos.push({...v.shoppingLists['2026-10-26'].productos[0]});},
  v=>{Object.defineProperty(v.settings,'__proto__',{value:{polluted:true},enumerable:true});},
  v=>{v.mealLogs.constructor={prototype:{polluted:true}};},
  v=>{v.shoppingLists=[];},
  v=>{v.exceptions=[null];},
  v=>{v.mealLogs['2026-10-23-cena']={comentario:'sin fecha ni tipo'};},
  v=>{v.mealLogs['2026-10-22-desayuno'].estado=['cumplida'];},
  v=>{v.mealLogs['2026-10-22-desayuno'].tipoDeComida='cena';},
  v=>{v.mealLogs['2026-10-22-desayuno'].fecha=null;},
];
for (const [i, mutate] of mutations.entries()) {
  const copy = clone(base); mutate(copy);
  assert.equal(validar(copy),false,`rechaza caso malicioso ${i+1}`);
}
assert.equal(JSON.stringify(base),snapshot,'validación no muta datos');
assert.equal({}.polluted,undefined,'sin contaminación de prototipos');
assert.equal(esFotoSegura(png),true);
assert.equal(esFotoSegura('data:image/png;base64,AAA'),false);
assert.equal(esFotoSegura('data:image/svg+xml;base64,PHN2Zz4='),false);
(async()=>{
  Fotos.cache.set('antigua','x" onerror="alert(1)');
  assert.equal(Fotos.obtener('antigua'),null,'no representa imagen heredada insegura');
  assert.equal(await Fotos.guardar('maliciosa','javascript:alert(1)'),false);
  assert.equal(Fotos.cache.has('maliciosa'),false,'rechazo antes de escribir caché');
  console.log(`Seguridad: copia válida/antigua, ${mutations.length} casos maliciosos y defensa de fotos: OK`);
})().catch(e=>{console.error(e);process.exitCode=1;});
