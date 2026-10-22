/* Illustration only: no authentication, storage or network. */
'use strict';
document.body.classList.add('bloqueado');
document.querySelector('#pantalla-acceso').hidden = false;
document.querySelector('#acceso-form').hidden = false;
document.querySelector('#acceso-sub').textContent =
  'Vista de diseño no operativa. No introduzcas tus credenciales.';
document.querySelectorAll('#acceso-form input, #acceso-form button').forEach(el => {
  el.disabled = true;
});
document.querySelector('#acceso-email').placeholder = 'correo@ejemplo.invalid';
document.querySelector('#acceso-pass').placeholder = 'Contraseña';
document.querySelector('#acceso-aviso').textContent =
  'La demostración no inicia sesiones ni accede a datos reales.';
document.querySelector('#acceso-form').addEventListener('submit', e => e.preventDefault());
