'use strict';
// Cliente simulado: ninguna conexión ni cuenta real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const calls = [];
let failRead = false;
const chain = {
  select() { return this; },
  eq(field, id) { assert.equal(field, 'usuario_id'); assert.equal(id, 'fixture'); return this; },
  maybeSingle() {
    return { data: null, error: failRead ? {message:'Sin conexión con el servidor'} : null };
  },
  upsert(row) { calls.push('upsert'); assert.equal(row.usuario_id, 'fixture'); return this; },
  single() { return {data:{revision:1, actualizado_en:'2026-10-25T14:00:00Z'}, error:null}; },
  delete() { calls.push('delete'); return this; },
};
const client = {
  schema(name) {
    assert.equal(name, 'dieta');
    calls.push(name);
    return {from(table) { assert.equal(table, 'dietas'); return chain; }};
  },
  from() { throw new Error('No debe utilizar el esquema por defecto'); },
};
const sandbox = vm.createContext({window:{}, console, navigator:{onLine:true}});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'nube.js'), 'utf8')
  + '\nglobalThis.cloud = Nube;', sandbox);
const cloud = sandbox.cloud;
(async () => {
  cloud.cliente = client;
  cloud.usuario = {id:'fixture'};
  await assert.rejects(cloud.subir({fixture:true}), /comprobado/);
  assert.equal(calls.length, 0, 'No escribe antes de confirmar la lectura');
  failRead = true;
  await assert.rejects(cloud.descargar(), /conexión/);
  assert.equal(cloud.confirmada, false);
  failRead = false;
  assert.equal(await cloud.descargar(), null);
  assert.equal(cloud.confirmada, true);
  assert.equal(await cloud.subir({fixture:true}), true);
  assert.equal(await cloud.borrarFila(), true);
  assert.deepEqual(calls, ['dieta', 'dieta', 'dieta', 'upsert', 'dieta', 'delete']);
  console.log('Nube: lectura, escritura, borrado en dieta y cerrojo de lectura: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
