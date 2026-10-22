/* Temporary adapter for the hosted illustration. No browser storage APIs. */
const Store = {
  disponible: false,
  memoria: Object.create(null),
  init() {},
  get(clave) { return this.memoria[clave] || null; },
  set(clave, valor) { this.memoria[clave] = valor; return true; },
  remove(clave) { delete this.memoria[clave]; },
};
const Fotos = {
  db: null,
  modo: 'memoria temporal de la demostración',
  cache: new Map(),
  async init() {},
  async cargarTodas() {},
  obtener(clave) { const url = this.cache.get(clave); return esFotoSegura(url) ? url : null; },
  volcarLocal() { return true; },
  async guardar(clave, dataUrl) { if (!esFotoSegura(dataUrl)) return false; this.cache.set(clave, dataUrl); return true; },
  async borrar(clave) { this.cache.delete(clave); },
  todas() { return [...this.cache].map(([clave, dataUrl]) => ({clave, dataUrl})); },
  async vaciar() { this.cache.clear(); },
};
