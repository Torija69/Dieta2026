# Mi Plan de Dieta

**Seguimiento personal de dieta, comidas y compra semanal**

Aplicación web para gestionar una dieta personal de seis meses basada en un menú que se
repite en ciclos de dos semanas. Funciona íntegramente en el navegador: no hay servidor,
no hay cuentas de usuario y no se envía ningún dato a Internet. Todo lo que registras
(estados de las comidas, comentarios, fotografías, listas de la compra y excepciones) se
guarda en el propio dispositivo.

---

## Cómo abrir la aplicación

**En línea:** la versión publicada está en **https://torija69.github.io/Dieta2026/**. Se puede
añadir a la pantalla de inicio del móvil como un acceso directo.

**En local:**

1. Descarga o copia la carpeta completa del proyecto (debe contener `index.html`,
   `styles.css` y `app.js` en el mismo directorio).
2. Haz doble clic en `index.html`, o ábrelo desde el navegador con **Archivo → Abrir**.
3. La primera vez se muestra una pantalla de bienvenida en la que se propone la fecha de
   hoy como inicio del programa. Puedes cambiarla y confirmar.

No hace falta instalar nada, ni ejecutar un servidor local, ni tener conexión a Internet.
Si abres la aplicación por primera vez con conexión, las tipografías se descargan y quedan
en la caché del navegador; sin conexión se usan tipografías del sistema y la aplicación
funciona exactamente igual.

Para tenerla siempre a mano en el móvil, ábrela en el navegador y usa
**Añadir a la pantalla de inicio**.

### Navegadores compatibles

| Navegador                      | Estado                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Chrome / Edge (versión actual) | Compatible, recomendado                                 |
| Safari 16.4 o superior         | Compatible (macOS e iOS)                                |
| Firefox (versión actual)       | Compatible                                              |
| Navegadores antiguos           | No recomendado: se usan CSS moderno y JavaScript actual |

Se emplean `localStorage`, `IndexedDB`, `oklch()`, variables CSS, `color-mix()` y módulos
modernos de JavaScript. En modo de navegación privada algunos navegadores limitan el
almacenamiento: la aplicación lo detecta, avisa y sigue funcionando durante la sesión.

---

## El ciclo de dos semanas

- La semana va **de lunes a domingo**, siempre.
- Se cuentan las semanas completas transcurridas desde el lunes de la semana en la que
  empieza el programa.
- **Semanas transcurridas par → menú de la Semana 1. Impar → menú de la Semana 2.**
- El ciclo es continuo: **no se reinicia** al cambiar de mes ni de año, y sigue avanzando
  aunque no registres nada.
- **Las excepciones no alteran ni desplazan el ciclo.** Un periodo de vacaciones marca las
  comidas como exentas, pero el menú que corresponde a cada día no cambia.

Todas las fechas se calculan con la hora local del dispositivo (mediodía local como
referencia interna), de modo que no hay desfases por zonas horarias ni por el cambio de
hora.

### Menú del ciclo

Desayuno, todos los días: **pan de trigo sarraceno, aguacate y tortilla de 1 huevo**.

Cuando hay hambre (válido en cualquier momento): frutos del bosque, queso cottage y sandía
(aunque actualmente puede ser complicada de conseguir).

**Semana 1**

| Día       | Comida                         | Cena                                             |
| --------- | ------------------------------ | ------------------------------------------------ |
| Lunes     | Lentejas                       | Ensalada + huevo frito con pan de trigo sarraceno |
| Martes    | Ensalada de atún               | Humus con zanahorias                             |
| Miércoles | Pollo con verdura              | Tortilla de calabacín                            |
| Jueves    | Pescado con ensalada           | Pollo con verduras                               |
| Viernes   | Ensalada de alubias            | Champiñones con huevo                            |
| Sábado    | Salmón con ensalada o verduras | Bacalao con ensalada o verduras                  |
| Domingo   | Ensaladilla rusa keto          | Pisto                                            |

**Semana 2**

| Día       | Comida                    | Cena                                   |
| --------- | ------------------------- | -------------------------------------- |
| Lunes     | Ensalada de garbanzos     | Tortilla de calabacín                  |
| Martes    | Pollo con verduras        | Crema de verduras con limón y pimienta |
| Miércoles | Lentejas                  | Ensalada con atún                      |
| Jueves    | Pizza keto                | Ensalada                               |
| Viernes   | Pollo con ensalada        | Pisto con huevo                        |
| Sábado    | Pasta konjac con verduras | Pescado con ensalada o salmón          |
| Domingo   | Ensalada de garbanzos     | Bacalao                                |

El menú es editable desde **Ajustes → Dieta**, con un botón para restaurar el plan original.

---

## Duración de seis meses

- En **Ajustes** se define la fecha de inicio del programa; la fecha de finalización se
  propone automáticamente seis meses después y también es editable.
- En **Progreso** se muestran los días transcurridos, los días restantes, el porcentaje
  temporal, las semanas transcurridas, el número de ciclo y el menú en curso.
- Si la fecha de hoy es anterior al inicio, aparece el aviso **«El programa todavía no ha
  comenzado»**; si es posterior al final, **«Programa completado»**.
- Desde Ajustes puedes **extender el programa** 1, 3 o 6 meses, **restablecer la duración a
  seis meses** o **reiniciar el programa** eligiendo entre conservar el historial o borrarlo
  todo.
- La cabecera indica siempre el estado, el menú vigente y la posición dentro del ciclo.

---

## Lista de la compra de la semana siguiente

Al abrir la sección **Compra** se muestra, por defecto, la lista de la **semana siguiente a
la semana actual**, porque la compra se hace normalmente el fin de semana anterior. Puedes
navegar a otras semanas y volver a la próxima con un botón.

- Los ingredientes se agrupan en cinco categorías: frutas y verduras; legumbres; carne,
  pescado y huevos; cereales y productos especiales; lácteos, condimentos y otros. Cuando un
  producto no encaja en ninguna, se asigna a **Otros** (nunca se crean categorías vacías).
- **No se incluyen cantidades predeterminadas**: cada producto tiene campos libres de
  cantidad y unidad para que los rellenes a tu criterio.
- Un ingrediente que aparece en varios platos **figura una sola vez**, con la nota
  «Usado en varios platos de esta semana» y la relación de platos.
- Puedes marcar productos como comprados, editarlos, eliminarlos, añadir productos nuevos,
  filtrar por categoría, ocultar los ya comprados y consultar los contadores de pendientes y
  comprados.
- La lista se guarda por semana: tus ediciones no se pierden al cambiar de vista o de semana.
  **Restaurar lista automática** vuelve a generarla desde el menú.
- Exportación: **imprimir**, **CSV** y **texto plano** (para pegar en notas o mensajes).

---

## Cálculo de los porcentajes

El cumplimiento se calcula siempre así:

```
porcentaje = cumplidas / (cumplidas + no cumplidas) × 100
```

- Las comidas **pendientes**, **no aplicables** y **exentas por excepción** quedan **fuera
  del cálculo**: no suman ni penalizan.
- Cuando no hay ninguna comida evaluable en el periodo, no se muestra 0 %, sino el texto
  **«No hay comidas evaluables durante este periodo»**.
- Los estados posibles de cada comida son: pendiente, cumplida, no cumplida, no aplica y
  exenta por excepción. Cada estado se identifica con **icono, texto y color**, nunca solo
  con el color.
- **Marcar el día completo como cumplido** respeta las comidas exentas y no las modifica.
  **Restablecer día** devuelve las tres comidas del día a pendiente.
- El porcentaje se calcula por día, por semana, por mes y para todo el programa.

---

## Excepciones (fechas especiales)

Una excepción es un periodo en el que puedes saltarte la dieta sin que cuente como
incumplimiento.

- Cada excepción tiene nombre obligatorio, fecha de inicio, fecha de fin, tipo (todo el día,
  solo desayuno, solo comida o solo cena), nota opcional y un interruptor de activación.
- Puedes crearlas, editarlas, duplicarlas para otro año, ver los días afectados y eliminarlas.
- **No afectan al ciclo de dos semanas**, solo al control de cumplimiento y a la lista de la
  compra.
- Si toda la semana siguiente está marcada como excepción, la aplicación no genera lista
  automática y ofrece tres opciones: **generar lista igualmente**, **omitir la compra esa
  semana** o **crear una lista personalizada**.

### Excepción navideña

La aplicación incluye, ya preparada pero **desactivada**, una propuesta de excepción
«Vacaciones de Navidad y fin de año» del **24 de diciembre al 1 de enero**, de tipo todo el
día y con la nota «Periodo permitido por fiestas navideñas». **No se activa
automáticamente**: el botón **Activar excepción de Navidad** abre un diálogo de confirmación
donde puedes revisar y modificar las fechas antes de guardar.

---

## Cuenta y sincronización con la nube (Supabase)

La aplicación puede funcionar **sin cuenta** (todo se guarda en el propio navegador) o **con
cuenta**, para que los datos viajen entre el móvil y el ordenador.

### Pantalla de acceso al abrir

Por defecto, al abrir la página aparece una **pantalla de acceso** que pide correo y contraseña y
no muestra ningún dato hasta que se entra. Solo ofrece el botón **Entrar**: no incluye registro ni
recuperación de contraseña, porque **las cuentas se crean a mano en el panel de Supabase**
(*Authentication → Users → Add user*, marcando *Auto Confirm User*). Los formularios de registro y
recuperación siguen existiendo en el código (se abren desde *Ajustes → Cuenta y sincronización*
cuando no hay sesión), pero no se muestran en la pantalla de inicio.

- La preferencia se controla en *Ajustes → Cuenta y sincronización → «Pedir correo y contraseña al
  abrir la aplicación en este dispositivo»*. Es una preferencia **de cada dispositivo** (se guarda
  en `localStorage`, clave `miPlanDieta.v1.bloqueo`) y no se sincroniza.
- Si en ese momento no hay conexión, la pantalla ofrece **«Continuar sin conexión»** para seguir
  consultando los datos guardados en el dispositivo, ya que la contraseña no se puede comprobar.
- Esta pantalla protege lo que se ve en un dispositivo compartido, pero **la protección real de los
  datos es la seguridad a nivel de fila (RLS)** del servidor: sin una sesión válida no se puede
  leer nada de la nube.

### Cambiar la contraseña

La aplicación **no permite crear cuentas**: las da de alta el administrador desde el panel de
Supabase (*Authentication → Users → Add user*, con *Auto Confirm User* marcado) y el registro está
cerrado también en el servidor (*Allow new users to sign up* desactivado).

Cambiar la contraseña sí está permitido, en dos sitios:

1. **Desde la pantalla de acceso**, con el enlace «Cambiar la contraseña»: pide correo, contraseña
   actual y la nueva dos veces. La contraseña actual se comprueba contra el servidor antes de
   guardar la nueva, así que no sirve para tocar cuentas ajenas. Al guardar se entra ya con la
   contraseña nueva.
2. **Con la sesión abierta**, en *Ajustes → Cuenta y sincronización → Cambiar contraseña* o desde el
   botón de cuenta de la cabecera. También pide la contraseña actual.

No hay recuperación por correo, porque el proyecto no tiene servidor de correo propio configurado.
Si alguien olvida su contraseña, se le asigna una nueva desde el panel de Supabase.

### Cerrar sesión y ver la contraseña

- La cabecera muestra un botón con una flecha de salida, a la derecha del estado de la cuenta, que
  **cierra la sesión en un clic** (pide confirmación antes). Solo aparece cuando hay sesión iniciada.
  También se puede cerrar sesión desde *Ajustes → Cuenta y sincronización* y desde el botón de cuenta.
- Todos los campos de contraseña (pantalla de acceso, formulario de entrada y cambio de contraseña)
  llevan un botón con un ojo para **mostrar u ocultar** lo escrito. El botón usa `aria-pressed` y
  cambia su etiqueta entre «Mostrar la contraseña» y «Ocultar la contraseña», de modo que el estado
  no depende solo del icono.

### Confirmación de correo

El proyecto tiene **desactivada** la confirmación por correo (*Authentication → Sign In /
Providers → User Signups → Confirm email*), porque el servicio de correo integrado de Supabase
está muy limitado en el plan gratuito y los mensajes no siempre llegan. Con ese ajuste, la cuenta
queda activa en el momento en que se crea. Si algún día se quieren enviar correos de verdad
(confirmaciones o recuperación de contraseña), hay que configurar un **SMTP propio** en
*Authentication → Emails → SMTP Settings* (Resend, Brevo, SendGrid…). Mientras no lo haya, la
contraseña se puede cambiar desde la propia aplicación estando dentro, o desde el panel de
Supabase en *Authentication → Users*.

### Cómo se controla el acceso desde la web

- El acceso se gestiona con **Supabase Auth** (correo electrónico y contraseña). El botón
  **Cuenta** de la cabecera abre el formulario de acceso, registro y recuperación de contraseña.
- Cada fila de la base de datos pertenece a un usuario. La tabla `public.dietas` tiene la
  **seguridad a nivel de fila (RLS) activada** y cuatro políticas que solo permiten leer,
  insertar, modificar y borrar la fila cuyo `usuario_id` coincide con `auth.uid()`. Es decir:
  aunque alguien conozca la dirección del proyecto, **no puede ver los datos de otra cuenta**.
- Las fotografías se guardan en un **bucket privado** llamado `fotos-dieta`, con la ruta
  `<id-de-usuario>/<clave-de-la-foto>.jpg`. Las políticas de `storage.objects` comprueban que la
  primera carpeta de la ruta sea el identificador del usuario, de modo que cada persona solo
  accede a sus propias imágenes. El bucket no es público: las imágenes se descargan con la sesión
  del usuario.
- La página usa la **clave publicable** (`sb_publishable_…`), que está pensada para ir en el
  navegador. No concede ningún permiso por sí misma: quien decide qué se puede leer o escribir es
  RLS. **Nunca** debe usarse la clave `service_role` en el navegador.
- Si prefieres restringir aún más quién puede registrarse, en el panel de Supabase puedes
  desactivar los registros nuevos (*Authentication → Sign In / Providers → Allow new users to
  sign up*) una vez creada tu cuenta. Así la aplicación queda de uso exclusivamente personal.

### Configuración

Los datos del proyecto están en las primeras líneas de `nube.js`:

```js
const NUBE_CONFIG = {
  url: 'https://TU-PROYECTO.supabase.co',
  clavePublicable: 'sb_publishable_...',
};
```

El esquema de la base de datos y las políticas están en `supabase.sql`: se puede pegar tal cual
en el editor SQL de Supabase para reproducir la instalación desde cero.

Para que la aplicación pueda leer y escribir en la tabla, el proyecto necesita la **Data API
activada** con el esquema `public` expuesto (*Project Settings → Data API*). Si está desactivada,
el acceso funciona y las fotos también, pero la sincronización de los datos devuelve un error de
tipo «Could not query the database for the schema cache».

### Cómo se sincroniza

El modelo es **local primero**: la aplicación siempre escribe en el navegador y después envía una
copia a la nube.

1. Al iniciar sesión se comparan las fechas de última modificación (`meta.actualizadoEn`).
2. Si en la nube no hay nada, se sube lo que haya en el dispositivo.
3. Si la copia de la nube es **más reciente**, se aplica en el dispositivo.
4. Si la copia local es más reciente, se sube.
5. Después, cada cambio se sube automáticamente unos segundos más tarde (envío agrupado). Si no
   hay conexión, el envío queda pendiente y se reintenta al recuperar la red o al volver a la
   pestaña.

La regla es **la última escritura gana**, comparando la fecha de modificación. No hay fusión
campo a campo: si editas el mismo día en dos dispositivos sin sincronizar, se conserva el cambio
más reciente. Para casos dudosos, en Ajustes hay dos botones manuales:

- **Subir este dispositivo a la nube**: fuerza que la copia local sustituya la de la nube.
- **Traer los datos de la nube**: fuerza que la copia de la nube sustituya la local.

Las fotografías se copian al bucket cuando se añaden y se borran del bucket al eliminarlas. Si al
sincronizar falta una fotografía en el dispositivo, se descarga de la nube al abrir el día.

### Sin conexión

`localStorage` e `IndexedDB` siguen siendo la fuente principal, así que la aplicación funciona
igual sin conexión y sin cuenta. Lo único que se pospone es el envío a la nube.

### Dónde alojar la web

Supabase **no aloja sitios estáticos**: ofrece base de datos, autenticación, almacenamiento y
funciones, pero no una URL para publicar `index.html`. Opciones sencillas para tener la aplicación
en una dirección web:

- **GitHub Pages** desde este mismo repositorio (*Settings → Pages → Deploy from a branch →
  main → / (root)*). Ya está activado: la aplicación está publicada en
  **https://torija69.github.io/Dieta2026/** y se actualiza en cada `push` a `main`.
- Cualquier alojamiento estático (Netlify, Vercel, Cloudflare Pages) subiendo los cuatro
  archivos.
- O simplemente abrir `index.html` en el dispositivo, como hasta ahora.

Conviene añadir la dirección final en Supabase, en *Authentication → URL Configuration → Site
URL* y *Redirect URLs*, para que los correos de confirmación y de recuperación de contraseña
vuelvan a la aplicación.

### Aviso sobre los correos de confirmación

Por defecto Supabase pide **confirmar el correo** al registrarse y el servicio de correo incluido
está muy limitado (unos pocos envíos por hora). Si el correo no llega, hay dos caminos:

- Crear el usuario a mano en el panel: *Authentication → Users → Add user*, marcando
  **Auto Confirm User**.
- O desactivar la confirmación en *Authentication → Sign In / Providers → Email → Confirm email*.

---

## Almacenamiento de los datos

| Contenido                                                        | Dónde se guarda                                  |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| Ajustes, menú, registros de comidas, comentarios, listas, excepciones | `localStorage`, clave `miPlanDieta.v1`      |
| Fotografías de los platos                                        | `IndexedDB` (`miPlanDietaFotos`) si está disponible |
| Fotografías, alternativa de reserva                              | `localStorage`, clave `miPlanDieta.v1.fotos`     |
| Copia de seguridad previa a una importación                      | `localStorage`, clave `miPlanDieta.v1.copia`     |

- Los datos **persisten al recargar** y al cerrar el navegador, y la aplicación funciona sin
  conexión.
- Las fotografías se redimensionan y se comprimen a JPEG antes de guardarse.
- En Ajustes se indica qué mecanismo de almacenamiento está activo en tu navegador.
- Si borras los datos del sitio en el navegador, se pierde la información: exporta una copia
  de seguridad de vez en cuando.

---

## Exportar e importar

- **Exportar todos los datos (JSON)**: descarga un archivo con ajustes, registros, listas y
  excepciones. Sirve como copia de seguridad y para pasar los datos a otro dispositivo.
- **Importar datos desde JSON**: pide confirmación, guarda una copia del estado anterior y
  rechaza los archivos que no sean JSON válido o que no tengan la estructura esperada.
- **Exportar resumen**: genera un resumen de texto con el estado del programa y los
  porcentajes de cumplimiento.
- La lista de la compra se puede exportar aparte en CSV o en texto plano, y también imprimir.

---

## Limitaciones de `localStorage` con fotografías

`localStorage` es un almacén pequeño: la mayoría de los navegadores lo limitan a unos
**5 MB por sitio**, y solo admite texto, de modo que una imagen ocupa aproximadamente un
tercio más al codificarse en base64.

Por eso:

- Las fotografías se guardan preferentemente en **IndexedDB**, que dispone de mucho más
  espacio.
- Cuando IndexedDB no está disponible, se usa `localStorage` con las imágenes reducidas y
  comprimidas, y se avisa de que el espacio es limitado.
- Si el almacenamiento se agota, aparece el mensaje **«No hay espacio suficiente para guardar
  la fotografía»** y el resto de los datos no se ve afectado. En ese caso conviene eliminar
  fotografías antiguas o exportar una copia de seguridad.
- En navegación privada el navegador puede vaciar el almacenamiento al cerrar la ventana.

---

## Accesibilidad

- HTML semántico, un solo `h1`, secciones etiquetadas y enlace para saltar al contenido.
- Todos los campos tienen etiqueta asociada y los botones de solo icono, `aria-label`.
- Navegación completa con teclado, foco visible y orden lógico.
- Los diálogos atrapan el foco, se cierran con **Escape** y devuelven el foco al elemento de
  origen.
- Los cambios se anuncian mediante una región `aria-live`.
- Las fotografías tienen texto alternativo descriptivo, por ejemplo «Foto del plato de comida
  del martes 14 de octubre».
- Los estados nunca se representan solo con color: siempre llevan icono y texto.

---

## Estructura del proyecto

```
mi-plan-dieta/
├── index.html    Estructura de la página y las siete secciones
├── styles.css    Sistema de diseño, temas claro y oscuro, responsive e impresión
├── app.js        Datos del menú, lógica del ciclo, vistas y persistencia
├── nube.js       Cuenta, sesión y sincronización opcional con Supabase
├── supabase.sql  Tablas, políticas RLS y bucket de fotografías
└── README.md     Este documento
```

`app.js` está organizado por bloques comentados: utilidades de fecha, datos del menú e
ingredientes, estado y almacenamiento, cálculo de estadísticas, generación de la lista de la
compra, componentes de interfaz, vistas, acciones y arranque.

---

## Posibles mejoras futuras

- Gráficas de evolución del cumplimiento a lo largo de los seis meses.
- Cantidades sugeridas por producto y agrupación por establecimiento.
- Recordatorios y notificaciones para registrar las comidas del día.
- Fusión más fina de los cambios cuando se edita a la vez en dos dispositivos.
- Acceso con enlace mágico o con proveedores externos, además de correo y contraseña.
- Registro de peso, medidas o sensaciones asociadas a cada semana.
- Instalación como aplicación (PWA) con icono propio y funcionamiento sin conexión
  garantizado.
- Varias plantillas de menú y posibilidad de alternar ciclos de tres o cuatro semanas.
