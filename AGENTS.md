# AGENTS.md — dieta2026

Reglas comunes: `~/Proyectos/catalogo-proyectos/AGENTS.md` (léelas primero).

## Contexto

- **Qué es:** Aplicación web de seguimiento personal de dieta con datos en Supabase
- **Patrón:** Web estática con Supabase (ver `catalogo-proyectos/componentes.md`)
- **Repositorio:** https://github.com/Torija69/dieta2026
- **Especificación:** `docs/spec.md` · **Decisiones:** `docs/decisiones.md`

## Cómo arrancar

Publicada en https://torija69.github.io/Dieta2026/ ; en local, abrir `index.html`

## Reglas específicas

- No subir datos personales ni credenciales.
- Mantener la estructura de ficheros actual salvo decisión registrada en `docs/decisiones.md`.
- Piloto Torija: no cambiar lógica, claves, esquema ni nube por motivos visuales.
- No consultar ni escribir datos de salud o cuentas reales para QA; usar solo fixtures y la demo aislada.
- Generar con `python3 scripts/preparar_web.py`: dist/public es candidata; dist/preview es demo sin nube.
- La demo no se publica como aplicación real. Conservar GitHub Pages como origen y esperar aprobación antes de main.

## Al terminar una tarea

Actualizar `README.md`, `docs/spec.md`, `docs/decisiones.md` y `CHANGELOG.md` si aplica; commit en español y `git push`; actualizar la fila en el catálogo si cambia algo relevante.
