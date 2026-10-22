# Especificación — dieta2026 (Mi Plan de Dieta)

## Objetivo

Seguir una dieta personal de seis meses basada en un menú que se repite en ciclos de dos semanas: comidas, comentarios, fotos, lista de la compra y excepciones.

## Usuarios y uso

- Uso personal, en el móvil y el ordenador.
- Publicada en https://torija69.github.io/Dieta2026/ y añadible a la pantalla de inicio. También se puede abrir en local con `index.html`.

## Funcionalidades

- [x] Ciclo de dos semanas de lunes a domingo, calculado desde la fecha de inicio del programa.
- [x] Menú del ciclo y registro del estado de cada comida, con comentarios y fotos.
- [x] Duración del programa de seis meses.
- [x] Lista de la compra de la semana siguiente.
- [x] Cálculo de porcentajes de cumplimiento.
- [x] Excepciones por fechas especiales (incluida la Navidad).
- [x] Exportar e importar copias de seguridad.
- [x] Cuenta opcional en Supabase para sincronizar entre dispositivos (Auth, RLS y fotos), con pantalla de acceso al abrir.
- [x] Cambiar la contraseña y cerrar sesión. Las cuentas solo se crean desde el panel de Supabase.
- [x] La versión del programa es un dato único; v1.5.0 con diseño Torija aprobado.
- [x] Funciona sin conexión.

## Fuera de alcance

- Registro público de usuarios.
- Servidor propio: solo hay web estática y Supabase.

## Datos

| Dato | Dónde |
|---|---|
| Ajustes, menú, registros, comentarios, listas y excepciones | `localStorage` (`miPlanDieta.v1`) |
| Fotos | `IndexedDB` (`miPlanDietaFotos`) o, si no, `localStorage` |
| Sincronización (opcional) | Supabase: tabla `dietas` con RLS (cada usuario solo ve lo suyo) y Storage de fotos |

- Son datos personales de salud. En el cliente solo va la clave publicable de Supabase y el esquema está en `supabase.sql`.

## Criterios de aceptación

- La app funciona en Chrome, Edge, Firefox y Safari 16.4 o superior, con y sin conexión.
- Con sesión iniciada, un cambio hecho en el móvil aparece en el ordenador tras sincronizar.
- Sin sesión confirmada no se cargan ni escriben datos en la nube.

## Diseño Torija v1.5.0

- Aplicar Torija v1.0.0 a acceso, Hoy, Semana, Control, Compra, Progreso, Excepciones y Ajustes.
- Mantener cálculos, menús, ciclo, almacenamiento, fotos, cuenta y sincronización.
- No modificar ni consultar la base de datos; mantener nube y SQL idénticos.
- Respetar el tema oscuro ya disponible y las preferencias guardadas, aunque el sistema Torija parta del modo claro.
- Preparar demostración local separada de producción, sin SDK, conexiones, credenciales o datos reales.
- Demo temporal en memoria, sin APIs de persistencia, e informar que se pierde al recargar; acceso no operativo.
- Candidata a producción con lógica de la dieta intacta, metadatos y corrección aislada de seguridad; mismo origen de GitHub Pages.
- Con aprobación separada, se corrige la importación JSON preexistente: valida antes de mutar estado, copia o fotos y admite copias válidas anteriores.
- Publicación v1.5.0 aprobada expresamente; integrar main y actualizar catálogo manteniendo el origen existente.
