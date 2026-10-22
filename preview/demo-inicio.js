/* Runs after app.js, before DOMContentLoaded. Temporary demo memory only. */
'use strict';
if (CLAVE_DATOS !== 'Torija.Dieta.demo.v1') {
  throw new Error('La demostración no puede utilizar el almacenamiento de producción.');
}
const ejemplo = estadoInicial(D.iso(D.hoy()));
ejemplo.settings.tema = 'light';
Store.set(CLAVE_DATOS, JSON.stringify(ejemplo));
