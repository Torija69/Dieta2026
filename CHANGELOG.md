# Changelog — dieta2026

## v1.5.1 — 2026-10-22

- Librería de Supabase 2.115.0 servida desde el propio sitio (`vendor/`), idéntica a la de npm y con verificación de integridad; ya no se carga desde jsDelivr.
- Política de seguridad de contenido: solo se ejecuta código propio y solo se conecta con el proyecto de Supabase.
- Al cerrar sesión se puede borrar lo guardado en el dispositivo (registros, copia de seguridad y fotos). Solo se ofrece si la nube está confirmada y no se borra si quedan cambios sin subir.
- Cierre de sesión tras un tiempo sin uso (5, 15, 30 —por defecto— o 60 minutos, o nunca), también al volver a abrir la página. No borra datos y solo actúa con «Pedir correo y contraseña al abrir».
- Corregido: «Cerrar sesión» desde la ventana de la cuenta cerraba la confirmación sin salir.
- Datos, esquema de Supabase y `nube.js` sin cambios.

## v1.5.0 — 2026-10-22

- Sistema Torija v1.0.0 en acceso, siete vistas, formularios y modales; fuentes locales.
- Modo oscuro ya existente y colores de estados conservados.
- Motor sin cambios funcionales de dieta salvo la seguridad de importación y los metadatos de versión; nube, esquema, datos y permisos intactos.
- Demostración temporal solo en memoria, sin Supabase ni APIs de persistencia; acceso ilustrativo no operativo.
- Paquetes web sin documentación interna y pruebas de integridad y aislamiento.
- Importación JSON reforzada: rechazo previo de identificadores, tipos, fechas o fotos maliciosas; imágenes y atributos escapados al representarlos, sin cambios en copias válidas anteriores.
- Publicación aprobada por el usuario en el origen existente de GitHub Pages, sin migrar ni modificar los datos.

## 2026-10-01

- Añadidos AGENTS.md y docs/ (spec y decisiones) según el catálogo común.
