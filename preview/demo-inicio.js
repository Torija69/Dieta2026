/* Runs after app.js, before DOMContentLoaded. Demo storage only. */
'use strict';
if (CLAVE_DATOS !== 'Torija.Dieta.demo.v1') {
  throw new Error('La demostración no puede utilizar el almacenamiento de producción.');
}
try {
  if (!localStorage.getItem(CLAVE_DATOS)) {
    const ejemplo = estadoInicial(D.iso(D.hoy()));
    ejemplo.settings.tema = 'light';
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(ejemplo));
  }
  localStorage.setItem(CLAVE_BLOQUEO, '0');
} catch {
  // The original app falls back to session memory when storage is unavailable.
  console.warn('Demostración sin almacenamiento persistente: solo memoria de esta visita.');
}
