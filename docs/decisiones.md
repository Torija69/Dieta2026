# Registro de decisiones — dieta2026

| Fecha | Decisión | Motivo | Alternativas descartadas |
|---|---|---|---|
| 2026-10-22 | Rechazar copias JSON maliciosas y escapar atributos/imágenes al renderizar antes de publicar | La revisión halló XSS heredado; el usuario eligió expresamente corregirlo primero. Mantener compatibles copias propias v1.4.2 y la nube | Publicar con el riesgo abierto, convertir la demo sin nube en producción |
| 2026-10-22 | Publicar v1.5.0 en el GitHub Pages existente tras aprobación expresa del diseño y publicación | Mantener el origen, el almacenamiento, la sesión y la sincronización de producción | Sustituir la aplicación real por la demo temporal o moverla a otro dominio |
| 2026-10-22 | Usar adaptadores de memoria solo en la demo alojada, sin APIs de persistencia | El alojamiento de vistas previas no admite localStorage ni IndexedDB; no modificar por ello la aplicación real | Ocultar las llamadas restringidas o debilitar el almacenamiento de producción |
| 2026-10-22 | Preparar Torija v1.0.0 como piloto visual v1.5.0 | Tercera aplicación elegida expresamente por el usuario | Migrar automáticamente otras aplicaciones |
| 2026-10-22 | Conservar modo oscuro preexistente y colores semánticos | Respetar preferencias, estados e historial; no añadir ni eliminar funciones por una identidad visual | Suprimir el tema oscuro o recolorear todos los estados en lima |
| 2026-10-22 | Separar dist/public y dist/preview, con CSP sin conexiones y almacenamiento propio en la demo | Probar interfaz sin leer ni escribir información de salud ni usar cuentas reales | Probar sobre la cuenta del usuario o conectar una vista previa a Supabase |
| 2026-10-22 | Mantener el origen de GitHub Pages para la futura publicación aprobada | No separar localStorage, IndexedDB o sesión del usuario | Publicar la aplicación real en un dominio nuevo |
| 2026-10-01 | Incorporar el proyecto al catálogo común (patrón «Web estática con Supabase») | Aplicar ASDLC: contexto y reglas versionadas junto al código | — |
