# Copia local de supabase-js

- Paquete: `@supabase/supabase-js` 2.115.0, archivo `dist/umd/supabase.js`, sin modificar.
- Origen: https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.115.0.tgz
- Integridad npm del paquete: `sha512-PYJSxtCo37R7tTZW6pAqsxUeSx/dlhA7zn8RzKEUSCqyTxCUhG+iHrDTb04UyVBYbttaUbhwkNTvb8h5HW+uZA==` (comprobada el 22/10/2026). El archivo es idéntico al que servía jsDelivr.
- Integridad en `index.html`: `sha384-CLZeq1dk8+Uzrs7TVvBUdlFoV5F0DMqgRoeHa8g5wJcuPe5SkVfEvdxB0ZuzlnBQ`. Si el archivo cambia, el navegador no lo ejecuta.
- Licencia MIT: `LICENSE-supabase-js.txt`.

Para actualizar: descargar el paquete de npm, verificar su `integrity`, copiar `dist/umd/supabase.js` con la versión en el nombre, recalcular el `sha384` (`openssl dgst -sha384 -binary <archivo> | base64`) y cambiar `index.html`, `scripts/preparar_web.py` y las pruebas.
