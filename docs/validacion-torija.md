# Validación del piloto Torija v1.5.0

22 de octubre de 2026 · Sistema Torija v1.0.0 · Vista previa privada desplegada; producción sin cambios.

## Integridad y privacidad

- `app.js` idéntico a la base v1.4.2 al excluir únicamente VERSION y VERSION_FECHA.
- `nube.js`, `supabase.sql` y `styles.css` originales idénticos por SHA-256.
- No se han consultado cuentas, filas ni fotos reales de Supabase, ni modificado su configuración.
- Candidata en `dist/public/` conserva los archivos de producción y sus claves de datos.
- Demo en `dist/preview/`: sin SDK, configuración remota real o conexiones; CSP `connect-src 'none'`.
- Demo final con adaptadores de memoria para datos, fotos y bloqueo: no ejecuta APIs de persistencia.
- Probada con getters de localStorage, sessionStorage e IndexedDB que lanzan errores: cero intentos de acceso.
- Guardado durante la visita, cambio de vistas y JSON exportado/importado funcionan en memoria; recargar elimina los cambios, como indica el aviso.
- En la candidata de producción, comentario y foto sintéticos sí persisten tras recargar, con el SDK bloqueado durante QA.
- Siete pruebas automatizadas de integridad, aislamiento, fuentes y paquetes sin documentación interna.

## Pruebas locales

- Hoy: tres comidas; cumplida/no cumplida/no aplica; cálculo del 50 % excluyendo no aplica.
- Comentario y foto sintéticos guardados y ampliación de foto. Persistencia tras recarga en la candidata; memoria temporal y reinicio al recargar en la demo final.
- Día completo, vuelta a pendiente y excepciones respetan la lógica original, incluido el registro explícito durante una excepción.
- Semana: siete días, navegación, selector de fecha y apertura del día con tres comidas.
- Control: cuadrícula, navegación semanal y estadísticas.
- Compra: navegación, cambio de fecha, añadir/editar/borrar producto, categoría y ocultar comprados.
- Producto vacío rechazado; lista automática restaurada con confirmación.
- CSV y texto descargados con los datos de prueba; acción de imprimir y estilos de impresión.
- Excepciones: nombre obligatorio, fechas inválidas, crear/editar/desactivar/duplicar/ver días/borrar.
- Navidad solo se activa al confirmar; comidas pendientes aparecen exentas durante una excepción.
- Ajustes: menú editable y restauración, fechas, extensión y reinicio manteniendo el historial.
- JSON con versión única exportado e importado, fotos conservadas, JSON inválido rechazado; repetido con el adaptador temporal final.
- Resumen exportado; confirmación de borrar datos abierta y cancelada.
- Temas claro, oscuro y automático, además del botón de alternar.
- Cuenta en modo local y cierre de diálogos con Escape.
- Acceso de la candidata: validación de correo y longitud, mostrar/ocultar contraseña por clic real, formulario de cambio de clave con sus tres campos.
- Ninguna credencial válida enviada y ninguna operación de contraseña o sesión real.
- Las siete vistas comprobadas a 1440, 1024, 820 y 375px, sin desbordamiento global.
- Revisión visual de todas las vistas, acceso y modales, incluidos tema oscuro y móvil.
- Sin errores JavaScript ni peticiones HTTP externas desde la demo durante estas pruebas.

## Límites y entrega

No se prueba la sincronización real ni un inicio de sesión válido porque requeriría acceder a datos de salud. La lógica y configuración de nube no se modifican y están protegidas por las pruebas de integridad.

El acceso ilustrativo de la demo no acepta credenciales. La función de actualización de recursos de la aplicación real no es una actualización remota operativa en esta demostración sin conexiones. La restricción de persistencia del alojamiento solo afecta a la demostración, no a los archivos de producción.

Rama `feat/diseno-torija-v1.5.0`, sin integrar main ni cambiar GitHub Pages o catálogo. La publicación definitiva debe conservar https://torija69.github.io/Dieta2026/ como origen.

Vista previa privada independiente creada con aprobación del usuario. En la versión alojada se han comprobado las siete vistas a 1440 y 375px sin desbordamiento global, comentarios mantenidos durante la visita, creación de una excepción, tema oscuro y acceso ilustrativo deshabilitado con enlace de vuelta. Al volver a cargar, desaparecen los cambios de prueba. Cero errores JavaScript, peticiones externas o intentos de usar las APIs de persistencia bloqueadas.
