# Mi Plan de Dieta

**Seguimiento personal de dieta, comidas y compra semanal**

Aplicación web para gestionar una dieta personal de seis meses basada en un menú que se
repite en ciclos de dos semanas. Funciona íntegramente en el navegador: no hay servidor,
no hay cuentas de usuario y no se envía ningún dato a Internet. Todo lo que registras
(estados de las comidas, comentarios, fotografías, listas de la compra y excepciones) se
guarda en el propio dispositivo.

---

## Cómo abrir la aplicación

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
- Sincronización opcional entre dispositivos mediante un archivo en la nube.
- Registro de peso, medidas o sensaciones asociadas a cada semana.
- Instalación como aplicación (PWA) con icono propio y funcionamiento sin conexión
  garantizado.
- Varias plantillas de menú y posibilidad de alternar ciclos de tres o cuatro semanas.
