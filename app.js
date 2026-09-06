/* =========================================================
   Mi Plan de Dieta — app.js
   Aplicación local para el seguimiento de una dieta de seis meses
   con menú cíclico de dos semanas.

   Índice del archivo
   1. Utilidades generales y de fechas
   2. Datos por defecto (menús, consejos, ingredientes)
   3. Almacenamiento (localStorage + IndexedDB para fotos)
   4. Estado de la aplicación
   5. Lógica del programa y del ciclo de semanas
   6. Excepciones
   7. Registros de comidas y estadísticas
   8. Lista de la compra
   9. Interfaz: avisos, modales y componentes
   10. Vistas: Hoy, Semana, Control, Compra, Progreso, Excepciones, Configuración
   11. Eventos e inicialización
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   1. Utilidades generales y de fechas
   --------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escapa texto para insertarlo con seguridad en HTML. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const MS_DIA = 86400000;
const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Utilidades de fecha, siempre en horario local (sin UTC). */
const D = {
  hoy() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  },
  /** Fecha local a cadena YYYY-MM-DD. */
  iso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  },
  /** Cadena YYYY-MM-DD a fecha local (evita el desfase de zona horaria). */
  parse(s) {
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  },
  addDays(d, n) {
    const r = D.parse(d);
    r.setDate(r.getDate() + n);
    return r;
  },
  /** Suma meses conservando el último día del mes cuando es necesario. */
  addMonths(d, n) {
    const base = D.parse(d);
    const dia = base.getDate();
    const r = new Date(base.getFullYear(), base.getMonth() + n, 1);
    const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(dia, ultimo));
    return r;
  },
  /** Lunes de la semana de calendario que contiene la fecha. */
  lunes(d) {
    const base = D.parse(d);
    const desplazamiento = (base.getDay() + 6) % 7; // 0 = lunes
    return D.addDays(base, -desplazamiento);
  },
  domingo(d) {
    return D.addDays(D.lunes(d), 6);
  },
  /** Diferencia en días completos entre dos fechas locales. */
  diffDias(a, b) {
    const x = D.parse(a);
    const y = D.parse(b);
    return Math.round((y.getTime() - x.getTime()) / MS_DIA);
  },
  /** Índice 0..6 con lunes = 0. */
  indiceDia(d) {
    return (D.parse(d).getDay() + 6) % 7;
  },
  largo(d) {
    return D.parse(d).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },
  medio(d) {
    // Formato «martes 14 de octubre» (sin coma, tal y como se usa en los textos alternativos).
    return D.parse(d)
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      .replace(',', '');
  },
  diaMes(d) {
    return D.parse(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  },
  corto(d) {
    return D.parse(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  cortoSinAnio(d) {
    return D.parse(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  },
  nombreMes(d) {
    const t = D.parse(d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },
  horaFecha(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};

function capitalizar(t) {
  return String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);
}

/* ---------------------------------------------------------
   2. Datos por defecto
   --------------------------------------------------------- */
const DESAYUNO_COMUN_DEFECTO = 'Pan de trigo sarraceno, aguacate y tortilla de 1 huevo';

const CONSEJO_HAMBRE_DEFECTO = [
  'Frutos del bosque',
  'Queso cottage',
  'Sandía (aunque actualmente puede ser complicada de conseguir)',
];

const MENU_SEMANA_1_DEFECTO = [
  { comida: 'Lentejas', cena: 'Ensalada + huevo frito con pan de trigo sarraceno' },
  { comida: 'Ensalada de atún', cena: 'Humus con zanahorias' },
  { comida: 'Pollo con verdura', cena: 'Tortilla de calabacín' },
  { comida: 'Pescado con ensalada', cena: 'Pollo con verduras' },
  { comida: 'Ensalada de alubias', cena: 'Champiñones con huevo' },
  { comida: 'Salmón con ensalada o verduras', cena: 'Bacalao con ensalada o verduras' },
  { comida: 'Ensaladilla rusa keto', cena: 'Pisto' },
];

const MENU_SEMANA_2_DEFECTO = [
  { comida: 'Ensalada de garbanzos', cena: 'Tortilla de calabacín' },
  { comida: 'Pollo con verduras', cena: 'Crema de verduras con limón y pimienta' },
  { comida: 'Lentejas', cena: 'Ensalada con atún' },
  { comida: 'Pizza keto', cena: 'Ensalada' },
  { comida: 'Pollo con ensalada', cena: 'Pisto con huevo' },
  { comida: 'Pasta konjac con verduras', cena: 'Pescado con ensalada o salmón' },
  { comida: 'Ensalada de garbanzos', cena: 'Bacalao' },
];

const CATEGORIAS = [
  'Frutas y verduras',
  'Legumbres',
  'Carne, pescado y huevos',
  'Cereales y productos especiales',
  'Lácteos, condimentos y otros',
  'Otros',
];

/** Categoría de cada ingrediente de la lista orientativa. */
const CATEGORIA_INGREDIENTE = {
  Aguacates: 'Frutas y verduras',
  'Frutos del bosque': 'Frutas y verduras',
  Sandía: 'Frutas y verduras',
  Zanahorias: 'Frutas y verduras',
  Calabacines: 'Frutas y verduras',
  'Verduras variadas': 'Frutas y verduras',
  'Ensalada o lechuga': 'Frutas y verduras',
  Tomates: 'Frutas y verduras',
  Cebolla: 'Frutas y verduras',
  Champiñones: 'Frutas y verduras',
  Limones: 'Frutas y verduras',
  'Ingredientes para pisto': 'Frutas y verduras',
  Lentejas: 'Legumbres',
  Alubias: 'Legumbres',
  Garbanzos: 'Legumbres',
  'Humus o garbanzos para prepararlo': 'Legumbres',
  Huevos: 'Carne, pescado y huevos',
  Pollo: 'Carne, pescado y huevos',
  Atún: 'Carne, pescado y huevos',
  Salmón: 'Carne, pescado y huevos',
  Bacalao: 'Carne, pescado y huevos',
  'Pescado variado': 'Carne, pescado y huevos',
  'Pan de trigo sarraceno': 'Cereales y productos especiales',
  'Ingredientes para pizza keto': 'Cereales y productos especiales',
  'Pasta konjac': 'Cereales y productos especiales',
  'Ingredientes para ensaladilla rusa keto': 'Cereales y productos especiales',
  'Queso cottage': 'Lácteos, condimentos y otros',
  'Aceite de oliva': 'Lácteos, condimentos y otros',
  Pimienta: 'Lácteos, condimentos y otros',
  Sal: 'Lácteos, condimentos y otros',
  Especias: 'Lácteos, condimentos y otros',
  'Ingredientes para crema de verduras': 'Lácteos, condimentos y otros',
};

/** Ingredientes orientativos de cada plato del plan. */
const INGREDIENTES_PLATO = {
  'Pan de trigo sarraceno, aguacate y tortilla de 1 huevo': [
    'Pan de trigo sarraceno',
    'Aguacates',
    'Huevos',
    'Aceite de oliva',
    'Sal',
  ],
  Lentejas: ['Lentejas', 'Cebolla', 'Zanahorias', 'Aceite de oliva'],
  'Ensalada + huevo frito con pan de trigo sarraceno': [
    'Ensalada o lechuga',
    'Tomates',
    'Huevos',
    'Pan de trigo sarraceno',
    'Aceite de oliva',
  ],
  'Ensalada de atún': ['Ensalada o lechuga', 'Atún', 'Tomates', 'Cebolla'],
  'Ensalada con atún': ['Ensalada o lechuga', 'Atún', 'Tomates', 'Cebolla'],
  'Humus con zanahorias': ['Humus o garbanzos para prepararlo', 'Zanahorias', 'Limones', 'Aceite de oliva'],
  'Pollo con verdura': ['Pollo', 'Verduras variadas', 'Aceite de oliva'],
  'Pollo con verduras': ['Pollo', 'Verduras variadas', 'Aceite de oliva'],
  'Tortilla de calabacín': ['Calabacines', 'Huevos', 'Cebolla', 'Aceite de oliva'],
  'Pescado con ensalada': ['Pescado variado', 'Ensalada o lechuga', 'Tomates'],
  'Ensalada de alubias': ['Alubias', 'Ensalada o lechuga', 'Cebolla', 'Tomates'],
  'Champiñones con huevo': ['Champiñones', 'Huevos', 'Aceite de oliva'],
  'Salmón con ensalada o verduras': ['Salmón', 'Ensalada o lechuga', 'Verduras variadas'],
  'Bacalao con ensalada o verduras': ['Bacalao', 'Ensalada o lechuga', 'Verduras variadas'],
  'Ensaladilla rusa keto': ['Ingredientes para ensaladilla rusa keto', 'Huevos', 'Atún', 'Zanahorias'],
  Pisto: ['Ingredientes para pisto', 'Calabacines', 'Tomates', 'Cebolla', 'Aceite de oliva'],
  'Pisto con huevo': ['Ingredientes para pisto', 'Huevos', 'Calabacines', 'Tomates', 'Cebolla'],
  'Ensalada de garbanzos': ['Garbanzos', 'Ensalada o lechuga', 'Tomates', 'Cebolla'],
  'Crema de verduras con limón y pimienta': ['Ingredientes para crema de verduras', 'Limones', 'Pimienta', 'Sal'],
  'Pizza keto': ['Ingredientes para pizza keto', 'Tomates', 'Especias'],
  Ensalada: ['Ensalada o lechuga', 'Tomates', 'Aceite de oliva'],
  'Pollo con ensalada': ['Pollo', 'Ensalada o lechuga', 'Tomates'],
  'Pasta konjac con verduras': ['Pasta konjac', 'Verduras variadas', 'Aceite de oliva'],
  'Pescado con ensalada o salmón': ['Pescado variado', 'Salmón', 'Ensalada o lechuga'],
  Bacalao: ['Bacalao', 'Aceite de oliva', 'Especias'],
};

/** Productos que corresponden al bloque «Cuando hay hambre». */
const INGREDIENTES_HAMBRE = ['Frutos del bosque', 'Queso cottage', 'Sandía'];

const TIPOS_COMIDA = ['desayuno', 'comida', 'cena'];

const META_COMIDA = {
  desayuno: { etiqueta: 'Desayuno', icono: '🍳' },
  comida: { etiqueta: 'Comida', icono: '🍽️' },
  cena: { etiqueta: 'Cena', icono: '🌙' },
};

const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', icono: '⏳', clase: 'pendiente' },
  cumplida: { etiqueta: 'Cumplida', icono: '✔️', clase: 'cumplida' },
  no_cumplida: { etiqueta: 'No cumplida', icono: '✖️', clase: 'no_cumplida' },
  no_aplica: { etiqueta: 'No aplica', icono: '➖', clase: 'no_aplica' },
  exenta: { etiqueta: 'Exenta por excepción', icono: '🎉', clase: 'exenta' },
};

const TIPOS_EXCEPCION = {
  dia: 'Todo el día',
  desayuno: 'Solo desayuno',
  comida: 'Solo comida',
  cena: 'Solo cena',
};

/* Si nube.js no está disponible, la aplicación sigue funcionando en local. */
if (!window.Nube) {
  window.Nube = {
    aplicandoRemoto: false,
    estado: 'sin-biblioteca',
    detalle: 'No se ha cargado el módulo de nube.',
    disponible: () => false,
    conectado: () => false,
    correo: () => '',
    init: () => Promise.resolve(false),
    alCambiar: () => {},
    textoEstado: () => ({ icono: '📴', texto: 'Solo en este dispositivo' }),
  };
}

/* ---------------------------------------------------------
   3. Almacenamiento
   --------------------------------------------------------- */
const CLAVE_DATOS = 'miPlanDieta.v1';
const CLAVE_COPIA = 'miPlanDieta.v1.copia';

/** Envoltorio de localStorage con reserva en memoria (entornos restringidos). */
const Store = {
  disponible: true,
  memoria: {},
  init() {
    try {
      const prueba = '__mpd_test__';
      window.localStorage.setItem(prueba, '1');
      window.localStorage.removeItem(prueba);
      this.disponible = true;
    } catch (e) {
      this.disponible = false;
      console.warn('localStorage no disponible; se usará memoria temporal.');
    }
  },
  get(clave) {
    if (!this.disponible) return this.memoria[clave] || null;
    try {
      return window.localStorage.getItem(clave);
    } catch (e) {
      return null;
    }
  },
  set(clave, valor) {
    if (!this.disponible) {
      this.memoria[clave] = valor;
      return true;
    }
    try {
      window.localStorage.setItem(clave, valor);
      return true;
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
      return false;
    }
  },
  remove(clave) {
    if (!this.disponible) {
      delete this.memoria[clave];
      return;
    }
    try {
      window.localStorage.removeItem(clave);
    } catch (e) {
      /* sin acción */
    }
  },
};

/** Almacén de fotografías: IndexedDB si es posible, si no localStorage. */
const Fotos = {
  db: null,
  modo: 'memoria',
  cache: new Map(),
  async init() {
    // 1. Intento con IndexedDB
    try {
      this.db = await new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) return reject(new Error('sin IndexedDB'));
        const req = window.indexedDB.open('miPlanDietaFotos', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('fotos')) db.createObjectStore('fotos');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('error IndexedDB'));
        req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
        setTimeout(() => reject(new Error('tiempo de espera de IndexedDB')), 2500);
      });
      this.modo = 'indexeddb';
      await this.cargarTodas();
      return;
    } catch (e) {
      this.db = null;
    }
    // 2. Reserva: localStorage
    this.modo = Store.disponible ? 'localstorage' : 'memoria';
    try {
      const bruto = Store.get(`${CLAVE_DATOS}.fotos`);
      const obj = bruto ? JSON.parse(bruto) : {};
      Object.keys(obj).forEach((k) => this.cache.set(k, obj[k]));
    } catch (e) {
      /* sin acción */
    }
  },
  async cargarTodas() {
    if (!this.db) return;
    await new Promise((resolve) => {
      const tx = this.db.transaction('fotos', 'readonly');
      const st = tx.objectStore('fotos');
      const claves = st.getAllKeys();
      const valores = st.getAll();
      tx.oncomplete = () => {
        (claves.result || []).forEach((k, i) => this.cache.set(k, (valores.result || [])[i]));
        resolve();
      };
      tx.onerror = () => resolve();
    });
  },
  obtener(clave) {
    return this.cache.get(clave) || null;
  },
  volcarLocal() {
    const obj = {};
    this.cache.forEach((v, k) => {
      obj[k] = v;
    });
    return Store.set(`${CLAVE_DATOS}.fotos`, JSON.stringify(obj));
  },
  async guardar(clave, dataUrl) {
    this.cache.set(clave, dataUrl);
    if (this.modo === 'indexeddb' && this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction('fotos', 'readwrite');
          tx.objectStore('fotos').put(dataUrl, clave);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        return true;
      } catch (e) {
        this.cache.delete(clave);
        return false;
      }
    }
    const ok = this.volcarLocal();
    if (!ok) this.cache.delete(clave);
    return ok;
  },
  async borrar(clave) {
    this.cache.delete(clave);
    if (this.modo === 'indexeddb' && this.db) {
      try {
        await new Promise((resolve) => {
          const tx = this.db.transaction('fotos', 'readwrite');
          tx.objectStore('fotos').delete(clave);
          tx.oncomplete = resolve;
          tx.onerror = resolve;
        });
      } catch (e) {
        /* sin acción */
      }
      return;
    }
    this.volcarLocal();
  },
  todas() {
    const salida = [];
    this.cache.forEach((v, k) => salida.push({ clave: k, dataUrl: v }));
    return salida;
  },
  async vaciar() {
    this.cache.clear();
    if (this.modo === 'indexeddb' && this.db) {
      try {
        await new Promise((resolve) => {
          const tx = this.db.transaction('fotos', 'readwrite');
          tx.objectStore('fotos').clear();
          tx.oncomplete = resolve;
          tx.onerror = resolve;
        });
      } catch (e) {
        /* sin acción */
      }
    } else {
      Store.remove(`${CLAVE_DATOS}.fotos`);
    }
  },
};

/* ---------------------------------------------------------
   4. Estado de la aplicación
   --------------------------------------------------------- */
function estadoInicial(fechaInicioISO) {
  const inicio = D.parse(fechaInicioISO);
  const fin = D.addDays(D.addMonths(inicio, 6), -1);
  return {
    version: 1,
    meta: { actualizadoEn: new Date().toISOString() },
    settings: {
      fechaInicioPrograma: D.iso(inicio),
      fechaFinPrograma: D.iso(fin),
      tema: 'auto',
      permitirRegistrosFuturos: true,
      mostrarFotosResumen: true,
      primerDiaSemana: 1,
      formatoFecha: 'es-ES',
      desayunoComun: DESAYUNO_COMUN_DEFECTO,
      consejoHambre: CONSEJO_HAMBRE_DEFECTO.slice(),
      menuSemana1: MENU_SEMANA_1_DEFECTO.map((d) => ({ ...d })),
      menuSemana2: MENU_SEMANA_2_DEFECTO.map((d) => ({ ...d })),
    },
    mealLogs: {},
    shoppingLists: {},
    exceptions: [excepcionNavidadSugerida(inicio)],
    programHistory: [],
  };
}

/** Propuesta editable de excepción navideña, desactivada por defecto. */
function excepcionNavidadSugerida(fechaBase) {
  const base = D.parse(fechaBase);
  const anio = base.getMonth() === 0 && base.getDate() === 1 ? base.getFullYear() - 1 : base.getFullYear();
  return {
    id: uid('exc'),
    nombre: 'Vacaciones de Navidad y fin de año',
    fechaInicio: `${anio}-12-24`,
    fechaFin: `${anio + 1}-01-01`,
    tipo: 'dia',
    nota: 'Periodo permitido por fiestas navideñas',
    activa: false,
    sugerida: true,
    fechaCreacion: new Date().toISOString(),
  };
}

let state = null;

/** Vista y fechas seleccionadas en la interfaz. */
const ui = {
  vista: 'hoy',
  semanaVista: null, // lunes ISO de la vista Semana
  semanaControl: null, // lunes ISO de la vista Control
  semanaCompra: null, // lunes ISO de la lista de la compra
  filtroCategoria: 'todas',
  ocultarComprados: false,
  filtroMes: 'todos',
  ultimoFoco: null,
  claveFotoPendiente: null,
};

function guardar(mensaje) {
  if (!state.meta) state.meta = {};
  if (!Nube.aplicandoRemoto) state.meta.actualizadoEn = new Date().toISOString();
  const datos = JSON.stringify(state);
  const ok = Store.set(CLAVE_DATOS, datos);
  if (!ok) {
    toast('No se pudieron guardar los cambios: almacenamiento lleno o no disponible', 'error');
    return false;
  }
  if (mensaje) toast(mensaje);
  if (Nube.conectado() && !Nube.aplicandoRemoto) Nube.programarSubida(() => state);
  pintarCuenta();
  return true;
}

function cargar() {
  const bruto = Store.get(CLAVE_DATOS);
  if (!bruto) return null;
  try {
    const datos = JSON.parse(bruto);
    return normalizar(datos);
  } catch (e) {
    console.warn('Datos guardados ilegibles', e);
    return null;
  }
}

/** Completa campos ausentes para tolerar datos de versiones anteriores. */
function normalizar(datos) {
  if (!datos || typeof datos !== 'object') return null;
  const base = estadoInicial(D.iso(D.hoy()));
  const s = Object.assign({}, base.settings, datos.settings || {});
  if (!Array.isArray(s.consejoHambre) || !s.consejoHambre.length) s.consejoHambre = CONSEJO_HAMBRE_DEFECTO.slice();
  if (!Array.isArray(s.menuSemana1) || s.menuSemana1.length !== 7) s.menuSemana1 = base.settings.menuSemana1;
  if (!Array.isArray(s.menuSemana2) || s.menuSemana2.length !== 7) s.menuSemana2 = base.settings.menuSemana2;
  s.primerDiaSemana = 1;
  return {
    version: 1,
    meta:
      datos.meta && typeof datos.meta === 'object' && datos.meta.actualizadoEn
        ? datos.meta
        : { actualizadoEn: new Date().toISOString() },
    settings: s,
    mealLogs: datos.mealLogs && typeof datos.mealLogs === 'object' ? datos.mealLogs : {},
    shoppingLists: datos.shoppingLists && typeof datos.shoppingLists === 'object' ? datos.shoppingLists : {},
    exceptions: Array.isArray(datos.exceptions) ? datos.exceptions : [],
    programHistory: Array.isArray(datos.programHistory) ? datos.programHistory : [],
  };
}

/* ---------------------------------------------------------
   5. Lógica del programa y del ciclo de dos semanas
   --------------------------------------------------------- */
function inicioPrograma() {
  return D.parse(state.settings.fechaInicioPrograma);
}

function finPrograma() {
  return D.parse(state.settings.fechaFinPrograma);
}

/** Semanas completas transcurridas entre el lunes de inicio y el lunes de la fecha. */
function semanasTranscurridas(fecha) {
  return Math.floor(D.diffDias(D.lunes(inicioPrograma()), D.lunes(fecha)) / 7);
}

/** Información del ciclo para cualquier fecha. */
function infoSemana(fecha) {
  const lunes = D.lunes(fecha);
  const domingo = D.addDays(lunes, 6);
  const w = semanasTranscurridas(lunes);
  const paridad = ((w % 2) + 2) % 2;
  return {
    lunes,
    domingo,
    lunesISO: D.iso(lunes),
    domingoISO: D.iso(domingo),
    semanasTranscurridas: w,
    numeroSemana: w + 1,
    ciclo: Math.floor(w / 2) + 1,
    menu: paridad === 0 ? 1 : 2,
    dentroPrograma: domingo >= inicioPrograma() && lunes <= finPrograma(),
    titulo: `Semana del ${D.diaMes(lunes)} al ${D.diaMes(domingo)} de ${domingo.getFullYear()}`,
  };
}

function menuDeSemana(numero) {
  return numero === 2 ? state.settings.menuSemana2 : state.settings.menuSemana1;
}

/** Menú (desayuno, comida y cena) correspondiente a una fecha. */
function menuDeFecha(fecha) {
  const info = infoSemana(fecha);
  const dia = menuDeSemana(info.menu)[D.indiceDia(fecha)] || { comida: '', cena: '' };
  return {
    desayuno: state.settings.desayunoComun,
    comida: dia.comida,
    cena: dia.cena,
    menu: info.menu,
    info,
  };
}

function dentroDelPrograma(fecha) {
  const f = D.parse(fecha);
  return f >= inicioPrograma() && f <= finPrograma();
}

function infoPrograma() {
  const inicio = inicioPrograma();
  const fin = finPrograma();
  const hoy = D.hoy();
  const totalDias = Math.max(1, D.diffDias(inicio, fin) + 1);
  const transcurridos = clamp(D.diffDias(inicio, hoy) + 1, 0, totalDias);
  const restantes = Math.max(0, D.diffDias(hoy, fin));
  let estado = 'en_curso';
  if (hoy < inicio) estado = 'pendiente';
  else if (hoy > fin) estado = 'completado';
  const infoHoy = infoSemana(hoy);
  return {
    inicio,
    fin,
    hoy,
    totalDias,
    transcurridos,
    restantes,
    estado,
    etiquetaEstado:
      estado === 'pendiente' ? 'Pendiente de comenzar' : estado === 'completado' ? 'Programa completado' : 'En curso',
    porcentajeTemporal: Math.round((transcurridos / totalDias) * 100),
    semanasTranscurridas: Math.max(0, infoHoy.semanasTranscurridas),
    numeroSemana: Math.max(1, infoHoy.numeroSemana),
    ciclo: Math.max(1, infoHoy.ciclo),
    menuActual: infoHoy.menu,
    totalSemanas: Math.ceil(totalDias / 7),
  };
}

/* ---------------------------------------------------------
   6. Excepciones
   --------------------------------------------------------- */
function excepcionesActivas() {
  return state.exceptions.filter((e) => e.activa);
}

/** Excepción activa que afecta a una comida concreta (o al día completo). */
function excepcionDeComida(fechaISO, tipoComida) {
  return (
    excepcionesActivas().find(
      (e) => fechaISO >= e.fechaInicio && fechaISO <= e.fechaFin && (e.tipo === 'dia' || e.tipo === tipoComida)
    ) || null
  );
}

/** Cualquier excepción activa que afecte al día (total o parcialmente). */
function excepcionDelDia(fechaISO) {
  return excepcionesActivas().find((e) => fechaISO >= e.fechaInicio && fechaISO <= e.fechaFin) || null;
}

function diaCompletamenteExento(fechaISO) {
  return TIPOS_COMIDA.every((t) => !!excepcionDeComida(fechaISO, t));
}

function diasAfectados(exc) {
  const salida = [];
  let d = D.parse(exc.fechaInicio);
  const fin = D.parse(exc.fechaFin);
  let guardia = 0;
  while (d <= fin && guardia < 500) {
    salida.push(D.iso(d));
    d = D.addDays(d, 1);
    guardia += 1;
  }
  return salida;
}

/* ---------------------------------------------------------
   7. Registros de comidas y estadísticas
   --------------------------------------------------------- */
function claveComida(fechaISO, tipo) {
  return `${fechaISO}-${tipo}`;
}

function registro(fechaISO, tipo) {
  return state.mealLogs[claveComida(fechaISO, tipo)] || null;
}

/** Estado efectivo de una comida (el registrado o el derivado de excepciones). */
function estadoComida(fechaISO, tipo) {
  const log = registro(fechaISO, tipo);
  if (log && log.estado) return log.estado;
  if (excepcionDeComida(fechaISO, tipo)) return 'exenta';
  return 'pendiente';
}

function esEstadoRegistrado(fechaISO, tipo) {
  const log = registro(fechaISO, tipo);
  return !!(log && log.estado);
}

function asegurarRegistro(fechaISO, tipo) {
  const clave = claveComida(fechaISO, tipo);
  if (!state.mealLogs[clave]) {
    state.mealLogs[clave] = {
      fecha: fechaISO,
      tipoDeComida: tipo,
      estado: null,
      comentario: '',
      fotografia: null,
      fechaDeActualizacion: null,
    };
  }
  return state.mealLogs[clave];
}

function limpiarRegistro(clave) {
  const log = state.mealLogs[clave];
  if (!log) return;
  if (!log.estado && !log.comentario && !log.fotografia) delete state.mealLogs[clave];
}

function fijarEstado(fechaISO, tipo, estado) {
  const log = asegurarRegistro(fechaISO, tipo);
  log.estado = estado; // null = volver al estado automático
  log.fechaDeActualizacion = new Date().toISOString();
  limpiarRegistro(claveComida(fechaISO, tipo));
}

/** Estadísticas de un rango de fechas (ambas incluidas). */
function estadisticas(desdeISO, hastaISO) {
  const conteo = { cumplida: 0, no_cumplida: 0, pendiente: 0, no_aplica: 0, exenta: 0 };
  const porTipo = {
    desayuno: { cumplida: 0, no_cumplida: 0, total: 0 },
    comida: { cumplida: 0, no_cumplida: 0, total: 0 },
    cena: { cumplida: 0, no_cumplida: 0, total: 0 },
  };
  let diasCompletos = 0;
  let diasExcepcion = 0;
  let fotos = 0;
  let comentarios = 0;
  const dias = [];

  let d = D.parse(desdeISO);
  const fin = D.parse(hastaISO);
  let guardia = 0;
  while (d <= fin && guardia < 1200) {
    const iso = D.iso(d);
    const estadosDia = {};
    let cumplidasDia = 0;
    let noCumplidasDia = 0;
    TIPOS_COMIDA.forEach((t) => {
      const est = estadoComida(iso, t);
      estadosDia[t] = est;
      conteo[est] += 1;
      if (est === 'cumplida' || est === 'no_cumplida') {
        porTipo[t][est] += 1;
        porTipo[t].total += 1;
      }
      if (est === 'cumplida') cumplidasDia += 1;
      if (est === 'no_cumplida') noCumplidasDia += 1;
      const log = registro(iso, t);
      if (log && log.fotografia) fotos += 1;
      if (log && log.comentario) comentarios += 1;
    });
    const evaluablesDia = cumplidasDia + noCumplidasDia;
    if (cumplidasDia === 3) diasCompletos += 1;
    if (excepcionDelDia(iso)) diasExcepcion += 1;
    dias.push({
      iso,
      estados: estadosDia,
      porcentaje: evaluablesDia ? Math.round((cumplidasDia / evaluablesDia) * 100) : null,
      excepcion: excepcionDelDia(iso),
    });
    d = D.addDays(d, 1);
    guardia += 1;
  }

  const evaluables = conteo.cumplida + conteo.no_cumplida;
  return {
    conteo,
    porTipo,
    diasCompletos,
    diasExcepcion,
    fotos,
    comentarios,
    dias,
    evaluables,
    porcentaje: evaluables ? Math.round((conteo.cumplida / evaluables) * 100) : null,
  };
}

function porcentajeDia(fechaISO) {
  let c = 0;
  let n = 0;
  TIPOS_COMIDA.forEach((t) => {
    const e = estadoComida(fechaISO, t);
    if (e === 'cumplida') c += 1;
    if (e === 'no_cumplida') n += 1;
  });
  return c + n ? Math.round((c / (c + n)) * 100) : null;
}

/* ---------------------------------------------------------
   8. Lista de la compra
   --------------------------------------------------------- */
function categoriaDe(nombre) {
  return CATEGORIA_INGREDIENTE[nombre] || 'Otros';
}

/** Genera la lista automática de la semana indicada respetando excepciones. */
function generarLista(lunesISO, { ignorarExcepciones = false } = {}) {
  const info = infoSemana(D.parse(lunesISO));
  const menu = menuDeSemana(info.menu);
  const mapa = new Map(); // nombre -> { categoria, platos:Set }

  const anadir = (nombre, plato) => {
    if (!mapa.has(nombre)) mapa.set(nombre, { categoria: categoriaDe(nombre), platos: new Set() });
    if (plato) mapa.get(nombre).platos.add(plato);
  };

  let diasUtiles = 0;
  for (let i = 0; i < 7; i += 1) {
    const fecha = D.addDays(info.lunes, i);
    const iso = D.iso(fecha);
    const platos = [];
    const exento = (tipo) => !ignorarExcepciones && excepcionDeComida(iso, tipo);
    if (!exento('desayuno')) platos.push(state.settings.desayunoComun);
    if (!exento('comida')) platos.push((menu[i] || {}).comida);
    if (!exento('cena')) platos.push((menu[i] || {}).cena);
    if (platos.length) diasUtiles += 1;
    platos.filter(Boolean).forEach((plato) => {
      const ings = INGREDIENTES_PLATO[plato];
      if (ings) ings.forEach((ing) => anadir(ing, plato));
      else anadir(plato, plato); // plato personalizado sin ingredientes conocidos
    });
  }

  if (diasUtiles > 0) INGREDIENTES_HAMBRE.forEach((ing) => anadir(ing, 'Cuando hay hambre'));

  const productos = [];
  mapa.forEach((valor, nombre) => {
    const platos = Array.from(valor.platos);
    const nota =
      platos.length > 1
        ? `Usado en varios platos de esta semana (${platos.slice(0, 4).join(', ')}${platos.length > 4 ? '…' : ''})`
        : platos.length === 1
          ? `Para: ${platos[0]}`
          : '';
    productos.push({
      id: uid('prod'),
      nombre,
      categoria: valor.categoria,
      cantidad: '',
      unidad: '',
      nota,
      comprado: false,
      auto: true,
    });
  });

  productos.sort((a, b) => {
    const ca = CATEGORIAS.indexOf(a.categoria);
    const cb = CATEGORIAS.indexOf(b.categoria);
    if (ca !== cb) return ca - cb;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  return {
    semanaId: info.lunesISO,
    rango: { inicio: info.lunesISO, fin: info.domingoISO },
    menu: info.menu,
    productos,
    omitida: false,
    generadaEn: new Date().toISOString(),
    diasUtiles,
  };
}

function listaGuardada(lunesISO) {
  return state.shoppingLists[lunesISO] || null;
}

/** Devuelve la lista de la semana, generándola si procede. */
function obtenerLista(lunesISO, { forzar = false } = {}) {
  const existente = listaGuardada(lunesISO);
  if (existente && !forzar) return existente;
  const lunes = D.parse(lunesISO);
  const semanaExenta = semanaTotalmenteExenta(lunesISO);
  const posteriorAlFin = lunes > finPrograma();
  if (!forzar && (semanaExenta || posteriorAlFin)) return null;
  const nueva = generarLista(lunesISO);
  state.shoppingLists[lunesISO] = nueva;
  guardar();
  return nueva;
}

function lunesProximaSemana() {
  return D.iso(D.addDays(D.lunes(D.hoy()), 7));
}

/** Una lista automática sin editar puede descartarse sin pérdida de información. */
function listaSinTocar(lista) {
  if (!lista || lista.personalizada || lista.omitida || lista.forzada) return false;
  return lista.productos.every((p) => p.auto && !p.comprado && !p.cantidad && !p.unidad);
}

function semanaTotalmenteExenta(lunesISO) {
  const lunes = D.parse(lunesISO);
  return [0, 1, 2, 3, 4, 5, 6].every((i) => diaCompletamenteExento(D.iso(D.addDays(lunes, i))));
}
/* ---------------------------------------------------------
   9. Interfaz: avisos, modales y componentes
   --------------------------------------------------------- */
function anunciar(texto) {
  const region = $('#live-region');
  if (region) region.textContent = texto;
}

/** Aviso no intrusivo (toast). */
function toast(mensaje, tipo = 'ok') {
  const cont = $('#toasts');
  if (!cont) return;
  const el = document.createElement('p');
  el.className = `toast${tipo === 'error' ? ' toast--error' : ''}`;
  el.innerHTML = `<span aria-hidden="true">${tipo === 'error' ? '⚠️' : '✅'}</span><span>${esc(mensaje)}</span>`;
  cont.appendChild(el);
  anunciar(mensaje);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

let accionesModal = [];

/** Abre un modal accesible. acciones: [{texto, clase, cerrar, onClick}] */
function abrirModal({ titulo, cuerpo, acciones = [], ancho = false, alAbrir = null }) {
  ui.ultimoFoco = document.activeElement;
  const backdrop = $('#modal-backdrop');
  const modal = $('#modal');
  $('#modal-title').textContent = titulo;
  $('#modal-body').innerHTML = cuerpo;
  modal.classList.toggle('modal--wide', !!ancho);
  accionesModal = acciones;
  $('#modal-actions').innerHTML = acciones
    .map(
      (a, i) =>
        `<button type="button" class="btn ${a.clase || ''}" data-modal-accion="${i}">${esc(a.texto)}</button>`
    )
    .join('');
  backdrop.hidden = false;
  if (typeof alAbrir === 'function') alAbrir(modal);
  const primero = modal.querySelector(
    'input:not([type=hidden]), select, textarea, button[data-modal-accion], button'
  );
  if (primero) primero.focus();
}

function cerrarModal() {
  const backdrop = $('#modal-backdrop');
  if (backdrop.hidden) return;
  backdrop.hidden = true;
  $('#modal-body').innerHTML = '';
  accionesModal = [];
  if (ui.ultimoFoco && document.contains(ui.ultimoFoco)) ui.ultimoFoco.focus();
}

/** Diálogo de confirmación con acciones personalizables. */
function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = true, extra = '', onConfirmar }) {
  abrirModal({
    titulo,
    cuerpo: `<p>${mensaje}</p>${extra}`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost', cerrar: true },
      {
        texto: textoConfirmar,
        clase: peligro ? 'btn--danger' : 'btn--primary',
        cerrar: true,
        onClick: onConfirmar,
      },
    ],
  });
}

/* --- Componentes reutilizables --- */
function insignia(estado) {
  const m = ESTADOS[estado] || ESTADOS.pendiente;
  return `<span class="badge badge--${m.clase}"><span aria-hidden="true">${m.icono}</span>${esc(m.etiqueta)}</span>`;
}

function barra(porcentaje, extraClase = '') {
  const p = porcentaje == null ? 0 : clamp(porcentaje, 0, 100);
  return `<div class="progress ${extraClase}" role="img" aria-label="${
    porcentaje == null ? 'Sin comidas evaluables' : `Progreso: ${p} por ciento`
  }"><span style="width:${p}%"></span></div>`;
}

function stat(titulo, valor) {
  return `<div class="stat"><dt>${esc(titulo)}</dt><dd>${valor}</dd></div>`;
}

function textoPorcentaje(p) {
  return p == null ? 'Sin datos evaluables' : `${p} %`;
}

/** Texto de posición de la semana dentro del programa. */
function textoSemanaPrograma(info) {
  if (info.numeroSemana < 1) return 'Semana previa al inicio del programa';
  return `Semana número ${info.numeroSemana} del programa · Ciclo número ${info.ciclo}`;
}

function leyenda() {
  return `<ul class="legend">${Object.keys(ESTADOS)
    .map((k) => insignia(k))
    .map((b) => `<li>${b}</li>`)
    .join('')}</ul>`;
}

/** Tarjeta completa de una comida, con estados, comentario y foto. */
function tarjetaComida(fechaISO, tipo, plato) {
  const meta = META_COMIDA[tipo];
  const estado = estadoComida(fechaISO, tipo);
  const exc = excepcionDeComida(fechaISO, tipo);
  const log = registro(fechaISO, tipo);
  const registrado = esEstadoRegistrado(fechaISO, tipo);
  const futura = D.parse(fechaISO) > D.hoy();
  const bloqueada = futura && !state.settings.permitirRegistrosFuturos;
  const altFoto = `Foto del plato de ${meta.etiqueta.toLowerCase()} del ${D.medio(fechaISO)}`;
  const fotoClave = log && log.fotografia ? log.fotografia : null;
  const fotoUrl = fotoClave ? Fotos.obtener(fotoClave) : null;

  const botonesEstado = [
    { estado: 'cumplida', texto: 'Cumplida', icono: '✔️' },
    { estado: 'no_cumplida', texto: 'No cumplida', icono: '✖️' },
    { estado: 'no_aplica', texto: 'No aplica', icono: '➖' },
  ]
    .map(
      (b) => `<button type="button" class="btn btn--sm state-btn" data-accion="estado" data-fecha="${fechaISO}"
        data-tipo="${tipo}" data-estado="${b.estado}" aria-pressed="${estado === b.estado && registrado}"
        ${bloqueada ? 'disabled' : ''}
        aria-label="${esc(b.texto)} — ${esc(meta.etiqueta)} del ${esc(D.medio(fechaISO))}">
        <span aria-hidden="true">${b.icono}</span>${esc(b.texto)}</button>`
    )
    .join('');

  return `<article class="meal" data-clave="${claveComida(fechaISO, tipo)}">
    <div class="meal-head">
      <div>
        <span class="meal-kind"><span aria-hidden="true">${meta.icono}</span> ${esc(meta.etiqueta)}</span>
        <h4 class="meal-dish">${esc(plato || 'Sin plato definido')}</h4>
      </div>
      ${insignia(estado)}
    </div>
    ${
      exc
        ? `<p class="hint"><span aria-hidden="true">🎉</span> Exenta por excepción: ${esc(exc.nombre)}${
            exc.tipo !== 'dia' ? ` (${esc(TIPOS_EXCEPCION[exc.tipo])})` : ''
          }. Puedes registrar un estado si quieres llevar el control.</p>`
        : ''
    }
    ${
      bloqueada
        ? '<p class="hint"><span aria-hidden="true">🔒</span> Fecha futura: activa «Permitir registrar comidas futuras» en Configuración.</p>'
        : futura
          ? '<p class="hint"><span aria-hidden="true">🗒️</span> Fecha futura: cualquier marca será un registro anticipado.</p>'
          : ''
    }
    <div class="meal-actions">
      ${botonesEstado}
      <button type="button" class="btn btn--sm btn--ghost" data-accion="pendiente" data-fecha="${fechaISO}" data-tipo="${tipo}"
        ${!registrado ? 'disabled' : ''}
        aria-label="Volver a pendiente — ${esc(meta.etiqueta)} del ${esc(D.medio(fechaISO))}">
        <span aria-hidden="true">↩️</span>Volver a pendiente</button>
      <button type="button" class="btn btn--sm btn--ghost" data-accion="comentario" data-fecha="${fechaISO}" data-tipo="${tipo}"
        aria-label="Comentario de ${esc(meta.etiqueta)} del ${esc(D.medio(fechaISO))}">
        <span aria-hidden="true">💬</span>${log && log.comentario ? 'Editar comentario' : 'Añadir comentario'}</button>
      <button type="button" class="btn btn--sm btn--ghost" data-accion="foto" data-fecha="${fechaISO}" data-tipo="${tipo}"
        aria-label="${fotoClave ? 'Cambiar' : 'Añadir'} foto de ${esc(meta.etiqueta)} del ${esc(D.medio(fechaISO))}">
        <span aria-hidden="true">📷</span>${fotoClave ? 'Cambiar foto' : 'Añadir foto'}</button>
    </div>
    ${
      (log && (log.comentario || fotoClave)) || (log && log.fechaDeActualizacion)
        ? `<div class="meal-extra">
            ${
              log.comentario
                ? `<p class="meal-comment"><span aria-hidden="true">💬</span> ${esc(log.comentario)}
                    <button type="button" class="btn btn--sm btn--ghost" data-accion="borrar-comentario"
                      data-fecha="${fechaISO}" data-tipo="${tipo}">Eliminar comentario</button></p>`
                : ''
            }
            ${
              fotoUrl
                ? `<div class="meal-photo">
                    <button type="button" class="thumb" data-accion="ver-foto" data-clave="${esc(fotoClave)}"
                      data-alt="${esc(altFoto)}" aria-label="Ampliar ${esc(altFoto)}">
                      <img src="${fotoUrl}" alt="${esc(altFoto)}" />
                    </button>
                    <button type="button" class="btn btn--sm btn--ghost" data-accion="borrar-foto"
                      data-fecha="${fechaISO}" data-tipo="${tipo}">Eliminar foto</button>
                  </div>`
                : fotoClave
                  ? '<p class="hint">La fotografía guardada no está disponible en este dispositivo.</p>'
                  : ''
            }
            ${
              log.fechaDeActualizacion
                ? `<p class="meta-time">Última actualización: ${esc(D.horaFecha(log.fechaDeActualizacion))}</p>`
                : ''
            }
          </div>`
        : ''
    }
  </article>`;
}

function tarjetaHambre() {
  return `<section class="card card--flat" aria-labelledby="hambre-titulo">
    <h3 class="card-title" id="hambre-titulo"><span aria-hidden="true">🍓</span> Cuando hay hambre</h3>
    <p class="hint">Opciones válidas en cualquier momento del programa.</p>
    <ul>${state.settings.consejoHambre.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  </section>`;
}

/**
 * Aviso sobre el estado del programa.
 * @param {string|null} fechaISO fecha concreta a comprobar
 * @param {{hasta?: string}} [rango] si se indica, la fecha se considera dentro cuando el
 *   intervalo fechaISO–hasta se solapa con el programa (útil para semanas a caballo).
 */
function avisoEstadoPrograma(fechaISO, rango = {}) {
  const p = infoPrograma();
  if (p.estado === 'pendiente') {
    return `<div class="notice notice--warn"><span aria-hidden="true">⏳</span><span class="notice-body">
      <strong>El programa todavía no ha comenzado</strong>
      Comienza el ${esc(D.largo(p.inicio))}. Puedes consultar el menú, pero el seguimiento contará desde esa fecha.
    </span></div>`;
  }
  if (p.estado === 'completado') {
    return `<div class="notice notice--info"><span aria-hidden="true">🏁</span><span class="notice-body">
      <strong>Programa completado</strong>
      Finalizó el ${esc(D.largo(p.fin))}. El historial sigue disponible en Progreso.
    </span></div>`;
  }
  const fueraDeRango =
    fechaISO &&
    (rango.hasta
      ? rango.hasta < D.iso(p.inicio) || fechaISO > D.iso(p.fin)
      : !dentroDelPrograma(fechaISO));
  if (fueraDeRango) {
    return `<div class="notice notice--info"><span aria-hidden="true">📅</span><span class="notice-body">
      <strong>Fecha fuera del programa activo</strong>
      El ciclo de menús se sigue mostrando, pero esta fecha no está entre el ${esc(D.corto(p.inicio))} y el ${esc(
        D.corto(p.fin)
      )}.
    </span></div>`;
  }
  return '';
}

/* ---------------------------------------------------------
   10. Vistas
   --------------------------------------------------------- */
const VISTAS = [
  { id: 'hoy', etiqueta: 'Hoy', icono: '🌞' },
  { id: 'semana', etiqueta: 'Semana', icono: '🗓️' },
  { id: 'control', etiqueta: 'Control', icono: '✅' },
  { id: 'compra', etiqueta: 'Compra', icono: '🛒' },
  { id: 'progreso', etiqueta: 'Progreso', icono: '📈' },
  { id: 'excepciones', etiqueta: 'Excepciones', icono: '🎉', corta: 'Excep.' },
  { id: 'config', etiqueta: 'Ajustes', icono: '⚙️' },
];

function pintarNavegacion() {
  // El menú móvil usa etiquetas cortas para que las siete secciones quepan en pantalla.
  const botones = (corto) =>
    VISTAS.map(
      (v) => `<li><button type="button" class="nav-btn" data-vista="${v.id}"
      ${ui.vista === v.id ? 'aria-current="page"' : ''} aria-label="${esc(v.etiqueta)}">
      <span class="nav-icon" aria-hidden="true">${v.icono}</span><span>${esc(
        corto ? v.corta || v.etiqueta : v.etiqueta
      )}</span></button></li>`
    ).join('');
  $('#nav-desktop').innerHTML = botones(false);
  $('#nav-mobile').innerHTML = botones(true);
}

function irA(vista) {
  ui.vista = vista;
  VISTAS.forEach((v) => {
    const sec = $(`#view-${v.id}`);
    if (sec) sec.hidden = v.id !== vista;
  });
  pintarNavegacion();
  render();
  const sec = $(`#view-${vista}`);
  if (sec) {
    sec.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/* --- Cabecera --- */
function pintarCabecera() {
  const p = infoPrograma();
  $('#header-date').textContent = capitalizar(D.largo(D.hoy()));
  const posicion =
    p.numeroSemana >= 1 && p.numeroSemana <= p.totalSemanas
      ? `Semana ${p.numeroSemana} de ${p.totalSemanas} · Ciclo ${p.ciclo}`
      : p.numeroSemana < 1
        ? 'Antes de la semana 1'
        : `Fuera del calendario de ${p.totalSemanas} semanas`;
  $('#header-program').textContent = `${p.etiquetaEstado} · Menú Semana ${p.menuActual} · ${posicion}`;
  pintarCuenta();
}

/* --- Vista: Hoy --- */
function renderHoy() {
  const hoy = D.hoy();
  const iso = D.iso(hoy);
  const m = menuDeFecha(hoy);
  const exc = excepcionDelDia(iso);
  const completo = diaCompletamenteExento(iso);
  const pct = porcentajeDia(iso);

  const html = `
    ${avisoEstadoPrograma(iso)}
    ${
      exc
        ? `<div class="notice notice--exception"><span aria-hidden="true">🎉</span><span class="notice-body">
            <strong>🎉 Día de excepción</strong>
            Motivo: ${esc(exc.nombre)} · ${esc(TIPOS_EXCEPCION[exc.tipo])}${
              exc.nota ? ` · ${esc(exc.nota)}` : ''
            }<br />
            ${
              completo
                ? 'Las tres comidas están exentas: el menú se muestra pero no es obligatorio cumplirlo.'
                : 'Solo parte del día está exenta; el resto de comidas sigue contando.'
            }
          </span></div>`
        : ''
    }
    <section class="card" aria-labelledby="hoy-resumen">
      <div class="row row--between">
        <div>
          <h3 id="hoy-resumen">${esc(capitalizar(D.largo(hoy)))}</h3>
          <p class="hint">Menú: <strong>Semana ${m.menu}</strong> · ${esc(textoSemanaPrograma(m.info))} · ${esc(
            capitalizar(NOMBRES_DIAS[D.indiceDia(hoy)])
          )}</p>
        </div>
        <div class="row">
          <span class="badge badge--accent"><span aria-hidden="true">🍽️</span>Menú Semana ${m.menu}</span>
          <span class="badge badge--neutral"><span aria-hidden="true">📊</span>Día: ${textoPorcentaje(pct)}</span>
        </div>
      </div>
      <div style="margin-top:var(--space-3)">${barra(pct)}</div>
      <p class="hint">${
        pct == null ? 'No hay comidas evaluables todavía en el día de hoy.' : `Progreso del día: ${pct} %.`
      }</p>
      <div class="row" style="margin-top:var(--space-3)">
        <button type="button" class="btn btn--primary" data-accion="dia-cumplido" data-fecha="${iso}">
          <span aria-hidden="true">✔️</span>Marcar el día completo como cumplido</button>
        <button type="button" class="btn" data-accion="restablecer-dia" data-fecha="${iso}">
          <span aria-hidden="true">🔄</span>Restablecer día</button>
      </div>
    </section>

    <section class="card" aria-labelledby="hoy-comidas">
      <h3 id="hoy-comidas" class="card-title"><span aria-hidden="true">🍽️</span> Comidas de hoy</h3>
      ${tarjetaComida(iso, 'desayuno', m.desayuno)}
      ${tarjetaComida(iso, 'comida', m.comida)}
      ${tarjetaComida(iso, 'cena', m.cena)}
    </section>

    ${tarjetaHambre()}
  `;
  $('#hoy-content').innerHTML = html;
}

/* --- Vista: Semana --- */
function renderSemana() {
  if (!ui.semanaVista) ui.semanaVista = D.iso(D.lunes(D.hoy()));
  const info = infoSemana(D.parse(ui.semanaVista));
  const menu = menuDeSemana(info.menu);
  const stats = estadisticas(info.lunesISO, info.domingoISO);
  const hoyISO = D.iso(D.hoy());

  const dias = [];
  for (let i = 0; i < 7; i += 1) {
    const fecha = D.addDays(info.lunes, i);
    const iso = D.iso(fecha);
    const exc = excepcionDelDia(iso);
    const pct = porcentajeDia(iso);
    const platos = {
      desayuno: state.settings.desayunoComun,
      comida: (menu[i] || {}).comida,
      cena: (menu[i] || {}).cena,
    };
    dias.push(`<article class="day-card ${iso === hoyISO ? 'day-card--today' : ''}">
      <div class="day-head">
        <span class="day-name">${esc(NOMBRES_DIAS[i])}${iso === hoyISO ? ' · hoy' : ''}</span>
        <span class="day-date">${esc(D.cortoSinAnio(fecha))}</span>
      </div>
      <div class="row">
        <span class="badge badge--neutral"><span aria-hidden="true">📊</span>${textoPorcentaje(pct)}</span>
        ${
          exc
            ? `<span class="badge badge--exenta"><span aria-hidden="true">🎉</span>Excepción: ${esc(exc.nombre)}</span>`
            : ''
        }
      </div>
      ${barra(pct, 'progress--thin')}
      <ul class="day-meals">
        ${TIPOS_COMIDA.map((t) => {
          const est = estadoComida(iso, t);
          const meta = ESTADOS[est];
          return `<li class="day-meal cell--${meta.clase}">
            <span class="day-meal-icon" aria-hidden="true">${META_COMIDA[t].icono}</span>
            <span class="day-meal-text">
              <span class="day-meal-kind">${META_COMIDA[t].etiqueta} · ${meta.icono} ${meta.etiqueta}</span>
              ${esc(platos[t] || '—')}
            </span>
          </li>`;
        }).join('')}
      </ul>
      <div class="row">
        <button type="button" class="btn btn--sm" data-accion="abrir-dia" data-fecha="${iso}">
          <span aria-hidden="true">📝</span>Registrar / comentar</button>
        <button type="button" class="btn btn--sm btn--ghost" data-accion="dia-cumplido" data-fecha="${iso}">
          <span aria-hidden="true">✔️</span>Día cumplido</button>
      </div>
    </article>`);
  }

  $('#semana-content').innerHTML = `
    ${avisoEstadoPrograma(info.lunesISO, { hasta: info.domingoISO })}
    <section class="card" aria-labelledby="sem-resumen">
      <div class="row row--between">
        <div>
          <h3 id="sem-resumen">Semana del ${esc(D.diaMes(info.lunes))} al ${esc(D.diaMes(info.domingo))} de ${
            info.domingo.getFullYear()
          }</h3>
          <p class="hint">Menú: <strong>Semana ${info.menu}</strong> · ${esc(textoSemanaPrograma(info))}</p>
        </div>
        <div class="row no-print">
          <button type="button" class="btn btn--icon" data-accion="sem-prev" aria-label="Semana anterior">
            <span aria-hidden="true">←</span></button>
          <button type="button" class="btn btn--icon" data-accion="sem-next" aria-label="Semana siguiente">
            <span aria-hidden="true">→</span></button>
          <button type="button" class="btn btn--sm" data-accion="sem-hoy"><span aria-hidden="true">📍</span>Volver a hoy</button>
          <button type="button" class="btn btn--sm" data-accion="sem-ir"><span aria-hidden="true">🔎</span>Ir a una fecha</button>
        </div>
      </div>
      <dl class="grid grid--stats" style="margin-top:var(--space-4)">
        ${stat('Cumplimiento de la semana', esc(textoPorcentaje(stats.porcentaje)))}
        ${stat('Comidas cumplidas', stats.conteo.cumplida)}
        ${stat('Días completos', stats.diasCompletos)}
        ${stat('Comidas exentas', stats.conteo.exenta)}
      </dl>
      <div style="margin-top:var(--space-3)">${barra(stats.porcentaje)}</div>
      ${
        stats.porcentaje == null
          ? '<p class="hint">No hay comidas evaluables durante este periodo.</p>'
          : `<p class="hint">${stats.conteo.cumplida} cumplidas y ${stats.conteo.no_cumplida} no cumplidas sobre ${stats.evaluables} comidas evaluadas.</p>`
      }
    </section>

    ${tarjetaHambre()}

    <div class="grid grid--week">${dias.join('')}</div>
  `;
}

/** Modal con las tres comidas de un día (usado desde Semana y Progreso). */
function abrirDia(fechaISO) {
  const m = menuDeFecha(D.parse(fechaISO));
  const exc = excepcionDelDia(fechaISO);
  abrirModal({
    titulo: capitalizar(D.largo(fechaISO)),
    ancho: true,
    cuerpo: `
      <p class="hint">Menú Semana ${m.menu} · ${esc(textoSemanaPrograma(m.info))}</p>
      ${
        exc
          ? `<div class="notice notice--exception"><span aria-hidden="true">🎉</span><span class="notice-body">
              <strong>Excepción: ${esc(exc.nombre)}</strong>${esc(TIPOS_EXCEPCION[exc.tipo])}</span></div>`
          : ''
      }
      <div id="modal-dia" data-fecha="${fechaISO}">
        ${tarjetaComida(fechaISO, 'desayuno', m.desayuno)}
        ${tarjetaComida(fechaISO, 'comida', m.comida)}
        ${tarjetaComida(fechaISO, 'cena', m.cena)}
      </div>
      <div class="row" style="margin-top:var(--space-4)">
        <button type="button" class="btn btn--primary" data-accion="dia-cumplido" data-fecha="${fechaISO}">
          <span aria-hidden="true">✔️</span>Marcar el día completo como cumplido</button>
        <button type="button" class="btn" data-accion="restablecer-dia" data-fecha="${fechaISO}">
          <span aria-hidden="true">🔄</span>Restablecer día</button>
      </div>`,
    acciones: [{ texto: 'Cerrar', clase: 'btn--ghost', cerrar: true }],
  });
}

/** Refresca el contenido del modal de día si está abierto. */
function refrescarModalDia() {
  const cont = $('#modal-dia');
  if (!cont) return false;
  const fechaISO = cont.dataset.fecha;
  const m = menuDeFecha(D.parse(fechaISO));
  cont.innerHTML = `
    ${tarjetaComida(fechaISO, 'desayuno', m.desayuno)}
    ${tarjetaComida(fechaISO, 'comida', m.comida)}
    ${tarjetaComida(fechaISO, 'cena', m.cena)}`;
  return true;
}

/* --- Vista: Control --- */
function renderControl() {
  if (!ui.semanaControl) ui.semanaControl = D.iso(D.lunes(D.hoy()));
  const info = infoSemana(D.parse(ui.semanaControl));
  const stats = estadisticas(info.lunesISO, info.domingoISO);
  const menu = menuDeSemana(info.menu);

  const opciones = [];
  const totalSemanas = infoPrograma().totalSemanas;
  for (let i = 0; i < totalSemanas; i += 1) {
    const lunes = D.addDays(D.lunes(inicioPrograma()), i * 7);
    const iso = D.iso(lunes);
    opciones.push(
      `<option value="${iso}" ${iso === info.lunesISO ? 'selected' : ''}>Semana ${i + 1} · ${D.corto(
        lunes
      )} – ${D.corto(D.addDays(lunes, 6))} · Menú ${infoSemana(lunes).menu}</option>`
    );
  }
  if (!opciones.some((o) => o.includes('selected'))) {
    opciones.unshift(
      `<option value="${info.lunesISO}" selected>Semana fuera del programa · ${D.corto(info.lunes)} – ${D.corto(
        info.domingo
      )}</option>`
    );
  }

  const filas = stats.dias
    .map((d, i) => {
      const nombre = NOMBRES_DIAS[i];
      const celdas = TIPOS_COMIDA.map((t) => {
        const est = d.estados[t];
        const meta = ESTADOS[est];
        return `<div class="cell--${meta.clase}"><span aria-hidden="true">${meta.icono}</span> ${meta.etiqueta}</div>`;
      }).join('');
      return `<div><strong>${esc(capitalizar(nombre))}</strong><br />${esc(D.cortoSinAnio(d.iso))}</div>
        ${celdas}
        <div><span aria-hidden="true">📊</span> <span aria-label="Cumplimiento del día: ${esc(
          textoPorcentaje(d.porcentaje)
        )}">${d.porcentaje == null ? '—' : `${d.porcentaje} %`}</span></div>`;
    })
    .join('');

  const detalles = stats.dias
    .map((d, i) => {
      const notas = TIPOS_COMIDA.map((t) => {
        const log = registro(d.iso, t);
        if (!log || (!log.comentario && !log.fotografia)) return '';
        const fotoUrl = log.fotografia ? Fotos.obtener(log.fotografia) : null;
        const alt = `Foto del plato de ${META_COMIDA[t].etiqueta.toLowerCase()} del ${D.medio(d.iso)}`;
        return `<div class="meal-extra" style="border-top:0;margin:0">
          <div class="meal-comment"><strong>${META_COMIDA[t].etiqueta}</strong> · ${esc(log.comentario || 'Sin comentario')}
          ${log.fechaDeActualizacion ? `<span class="meta-time">${esc(D.horaFecha(log.fechaDeActualizacion))}</span>` : ''}</div>
          ${
            fotoUrl && state.settings.mostrarFotosResumen
              ? `<button type="button" class="thumb" data-accion="ver-foto" data-clave="${esc(
                  log.fotografia
                )}" data-alt="${esc(alt)}" aria-label="Ampliar ${esc(alt)}"><img src="${fotoUrl}" alt="${esc(
                  alt
                )}" /></button>`
              : ''
          }
        </div>`;
      })
        .filter(Boolean)
        .join('');
      if (!notas) return '';
      return `<section class="card card--flat">
        <h4>${esc(capitalizar(NOMBRES_DIAS[i]))} ${esc(D.cortoSinAnio(d.iso))} — ${esc(
          (menu[i] || {}).comida || ''
        )} / ${esc((menu[i] || {}).cena || '')}</h4>
        ${notas}
      </section>`;
    })
    .filter(Boolean)
    .join('');

  const porTipo = TIPOS_COMIDA.map((t) => {
    const p = stats.porTipo[t];
    const pct = p.total ? Math.round((p.cumplida / p.total) * 100) : null;
    return `<div class="stat">
      <dt><span aria-hidden="true">${META_COMIDA[t].icono}</span> ${META_COMIDA[t].etiqueta}</dt>
      <dd>${esc(textoPorcentaje(pct))}</dd>
      ${barra(pct, 'progress--thin')}
      <p class="hint">${p.cumplida} cumplidas · ${p.no_cumplida} no cumplidas</p>
    </div>`;
  }).join('');

  $('#control-content').innerHTML = `
    <section class="card" aria-labelledby="ctrl-sel">
      <h3 id="ctrl-sel" class="card-title"><span aria-hidden="true">📆</span> Semana a revisar</h3>
      <div class="field">
        <label for="ctrl-semana">Elige una semana del programa</label>
        <select id="ctrl-semana" data-accion="ctrl-semana">${opciones.join('')}</select>
      </div>
      <div class="row no-print">
        <button type="button" class="btn btn--sm" data-accion="ctrl-prev"><span aria-hidden="true">←</span>Semana anterior</button>
        <button type="button" class="btn btn--sm" data-accion="ctrl-next">Semana siguiente<span aria-hidden="true">→</span></button>
        <button type="button" class="btn btn--sm" data-accion="ctrl-hoy"><span aria-hidden="true">📍</span>Volver a hoy</button>
      </div>
      <p class="hint">Semana del ${esc(D.diaMes(info.lunes))} al ${esc(D.diaMes(info.domingo))} · Menú: Semana ${
        info.menu
      } · ${esc(textoSemanaPrograma(info))}</p>
    </section>

    <section class="card" aria-labelledby="ctrl-resumen">
      <h3 id="ctrl-resumen" class="card-title"><span aria-hidden="true">📊</span> Cumplimiento de la semana</h3>
      <p style="font-size:var(--text-lg);font-weight:600">${esc(textoPorcentaje(stats.porcentaje))}</p>
      ${barra(stats.porcentaje)}
      ${
        stats.porcentaje == null
          ? '<p class="hint">No hay comidas evaluables durante este periodo.</p>'
          : `<p class="hint">Fórmula: cumplidas / (cumplidas + no cumplidas) × 100. Las comidas pendientes, no aplicables y exentas quedan fuera del cálculo.</p>`
      }
      <dl class="grid grid--stats" style="margin-top:var(--space-4)">
        ${stat('✔️ Cumplidas', stats.conteo.cumplida)}
        ${stat('✖️ No cumplidas', stats.conteo.no_cumplida)}
        ${stat('⏳ Pendientes', stats.conteo.pendiente)}
        ${stat('➖ No aplican', stats.conteo.no_aplica)}
        ${stat('🎉 Exentas', stats.conteo.exenta)}
        ${stat('🌟 Días completos', stats.diasCompletos)}
      </dl>
    </section>

    <section class="card" aria-labelledby="ctrl-tipos">
      <h3 id="ctrl-tipos" class="card-title"><span aria-hidden="true">🍳</span> Progreso por tipo de comida</h3>
      <dl class="grid grid--stats">${porTipo}</dl>
    </section>

    <section class="card" aria-labelledby="ctrl-grid">
      <h3 id="ctrl-grid" class="card-title"><span aria-hidden="true">🧩</span> Resumen por día</h3>
      <div class="state-grid">
        <div class="sg-head">Día</div>
        <div class="sg-head">Desayuno</div>
        <div class="sg-head">Comida</div>
        <div class="sg-head">Cena</div>
        <div class="sg-head">Día</div>
        ${filas}
      </div>
      ${leyenda()}
    </section>

    <section aria-labelledby="ctrl-notas">
      <h3 id="ctrl-notas" class="card-title"><span aria-hidden="true">💬</span> Comentarios y fotos de la semana</h3>
      ${detalles || '<p class="empty">No hay comentarios ni fotografías en esta semana.</p>'}
    </section>
  `;
}
/* --- Vista: Compra --- */
function renderCompra() {
  if (!ui.semanaCompra) ui.semanaCompra = lunesProximaSemana();
  const info = infoSemana(D.parse(ui.semanaCompra));
  const esProxima = info.lunesISO === lunesProximaSemana();
  const semanaExenta = semanaTotalmenteExenta(info.lunesISO);
  // Si la semana pasó a estar exenta y la lista automática no se había editado, se descarta.
  const previa = listaGuardada(info.lunesISO);
  if (semanaExenta && previa && listaSinTocar(previa)) {
    delete state.shoppingLists[info.lunesISO];
    guardar();
  }
  const lista = listaGuardada(info.lunesISO) || obtenerLista(info.lunesISO);
  const posterior = info.lunes > finPrograma();

  const cabecera = `
    <section class="card" aria-labelledby="compra-cab">
      <h3 id="compra-cab">Lista de compra para la semana del ${esc(D.diaMes(info.lunes))} al ${esc(
        D.diaMes(info.domingo)
      )} de ${info.domingo.getFullYear()}</h3>
      <p class="hint">Menú correspondiente: <strong>Semana ${info.menu}</strong> · ${esc(
        textoSemanaPrograma(info)
      )}${esProxima ? ' · Es la próxima semana' : ''}</p>
      <div class="row no-print" style="margin-top:var(--space-3)">
        <button type="button" class="btn btn--icon" data-accion="compra-prev" aria-label="Semana de compra anterior"><span aria-hidden="true">←</span></button>
        <button type="button" class="btn btn--icon" data-accion="compra-next" aria-label="Semana de compra siguiente"><span aria-hidden="true">→</span></button>
        <button type="button" class="btn btn--sm" data-accion="compra-cambiar"><span aria-hidden="true">🔎</span>Cambiar semana</button>
        <button type="button" class="btn btn--sm" data-accion="compra-proxima" ${esProxima ? 'disabled' : ''}>
          <span aria-hidden="true">📍</span>Volver a la próxima semana</button>
      </div>
    </section>`;

  if (!lista || lista.omitida) {
    const motivo = lista && lista.omitida
      ? 'Has marcado esta semana como «sin compra».'
      : semanaExenta
        ? `${
            esProxima ? 'La próxima semana' : 'Esta semana'
          } está marcada como periodo de excepción. No se ha generado una lista de compra automática.`
        : posterior
          ? 'Esta semana es posterior a la fecha de finalización del programa, por lo que no se generan listas automáticas.'
          : 'No hay lista para esta semana.';
    $('#compra-content').innerHTML = `${cabecera}
      <div class="notice notice--warn"><span aria-hidden="true">🎉</span><span class="notice-body">
        <strong>Sin lista automática</strong>${esc(motivo)}</span></div>
      <section class="card">
        <div class="row">
          <button type="button" class="btn btn--primary" data-accion="compra-forzar"><span aria-hidden="true">🧾</span>Generar lista igualmente</button>
          <button type="button" class="btn" data-accion="compra-omitir"><span aria-hidden="true">🚫</span>Omitir compra esta semana</button>
          <button type="button" class="btn" data-accion="compra-personalizada"><span aria-hidden="true">✏️</span>Crear lista personalizada</button>
        </div>
        <p class="hint">También puedes añadir manualmente productos para comidas especiales, celebraciones o vacaciones.</p>
      </section>`;
    return;
  }

  const diasExentos = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = D.iso(D.addDays(info.lunes, i));
    const exc = excepcionDelDia(iso);
    if (exc) diasExentos.push(`${NOMBRES_DIAS[i]} (${exc.nombre})`);
  }

  const menu = menuDeSemana(info.menu);
  const platos = `<section class="card card--flat" aria-labelledby="compra-menu">
    <h3 id="compra-menu" class="card-title"><span aria-hidden="true">📋</span> Platos de esta semana</h3>
    <p class="hint"><strong>Los siete desayunos:</strong> ${esc(state.settings.desayunoComun)}</p>
    <div class="state-grid menu-grid">
      <div class="sg-head">Día</div><div class="sg-head">Comida</div><div class="sg-head">Cena</div>
      ${menu
        .map(
          (d, i) =>
            `<div class="mg-dia"><strong>${esc(capitalizar(NOMBRES_DIAS[i]))}</strong></div>
             <div data-label="Comida">${esc(d.comida)}</div>
             <div data-label="Cena">${esc(d.cena)}</div>`
        )
        .join('')}
    </div>
  </section>`;

  const pendientes = lista.productos.filter((p) => !p.comprado).length;
  const comprados = lista.productos.length - pendientes;

  const categorias = CATEGORIAS.filter((c) => lista.productos.some((p) => p.categoria === c));
  const visibles = lista.productos.filter(
    (p) =>
      (ui.filtroCategoria === 'todas' || p.categoria === ui.filtroCategoria) && !(ui.ocultarComprados && p.comprado)
  );

  const grupos = categorias
    .filter((c) => visibles.some((p) => p.categoria === c))
    .map((cat) => {
      const items = visibles
        .filter((p) => p.categoria === cat)
        .map(
          (p) => `<div class="item ${p.comprado ? 'item--bought' : ''}">
            <input type="checkbox" id="chk-${p.id}" data-accion="prod-comprado" data-id="${p.id}" ${
              p.comprado ? 'checked' : ''
            } aria-label="Marcar ${esc(p.nombre)} como comprado" ${p.comprado ? '' : ''} />
            <div class="item-main">
              <label class="item-name" for="chk-${p.id}">${esc(p.nombre)}</label>
              ${p.nota ? `<span class="item-note">${esc(p.nota)}</span>` : ''}
              <div class="item-qty">
                <label class="visually-hidden" for="qty-${p.id}">Cantidad de ${esc(p.nombre)}</label>
                <input class="qty" id="qty-${p.id}" type="text" inputmode="decimal" placeholder="Cantidad"
                  value="${esc(p.cantidad)}" data-accion="prod-campo" data-campo="cantidad" data-id="${p.id}" />
                <label class="visually-hidden" for="unit-${p.id}">Unidad de ${esc(p.nombre)}</label>
                <input class="unit" id="unit-${p.id}" type="text" placeholder="Unidad"
                  value="${esc(p.unidad)}" data-accion="prod-campo" data-campo="unidad" data-id="${p.id}" />
              </div>
            </div>
            <div class="item-tools no-print">
              <button type="button" class="btn btn--sm btn--ghost" data-accion="prod-editar" data-id="${p.id}"
                aria-label="Editar ${esc(p.nombre)}"><span aria-hidden="true">✏️</span></button>
              <button type="button" class="btn btn--sm btn--ghost" data-accion="prod-borrar" data-id="${p.id}"
                aria-label="Eliminar ${esc(p.nombre)}"><span aria-hidden="true">🗑️</span></button>
            </div>
          </div>`
        )
        .join('');
      return `<section class="cat-group"><h3><span aria-hidden="true">🧺</span> ${esc(cat)}
        <span class="badge badge--neutral">${lista.productos.filter((p) => p.categoria === cat).length}</span></h3>
        ${items}</section>`;
    })
    .join('');

  $('#compra-content').innerHTML = `${cabecera}
    ${
      semanaExenta
        ? `<div class="notice notice--exception no-print"><span aria-hidden="true">🎉</span><span class="notice-body">
            <strong>Semana completa de excepción</strong>
            Toda esta semana está marcada como periodo de excepción. La lista que ves está guardada de antes o la has
            generado manualmente.
            <span class="row" style="margin-top:var(--space-2)">
              <button type="button" class="btn btn--sm" data-accion="compra-forzar">Regenerar lista igualmente</button>
              <button type="button" class="btn btn--sm" data-accion="compra-omitir">Omitir compra esta semana</button>
              <button type="button" class="btn btn--sm" data-accion="compra-personalizada">Crear lista personalizada</button>
            </span>
          </span></div>`
        : ''
    }
    ${
      diasExentos.length && !semanaExenta
        ? `<div class="notice notice--exception"><span aria-hidden="true">🎉</span><span class="notice-body">
            <strong>Días con excepción en esta semana</strong>
            ${esc(diasExentos.join(' · '))}. Los platos exentos no se han incluido en la lista automática.</span></div>`
        : ''
    }
    ${platos}
    <section class="card no-print" aria-labelledby="compra-herr">
      <h3 id="compra-herr" class="card-title"><span aria-hidden="true">🧰</span> Herramientas</h3>
      <div class="row">
        <span class="badge badge--pendiente"><span aria-hidden="true">⏳</span>${pendientes} pendientes</span>
        <span class="badge badge--cumplida"><span aria-hidden="true">✔️</span>${comprados} comprados</span>
      </div>
      <div class="grid grid--2" style="margin-top:var(--space-4)">
        <div class="field">
          <label for="filtro-cat">Filtrar por categoría</label>
          <select id="filtro-cat" data-accion="filtro-cat">
            <option value="todas" ${ui.filtroCategoria === 'todas' ? 'selected' : ''}>Todas las categorías</option>
            ${categorias
              .map(
                (c) => `<option value="${esc(c)}" ${ui.filtroCategoria === c ? 'selected' : ''}>${esc(c)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="check-row" style="align-items:center;margin-top:var(--space-6)">
          <input type="checkbox" id="ocultar-comprados" data-accion="ocultar-comprados" ${
            ui.ocultarComprados ? 'checked' : ''
          } />
          <label for="ocultar-comprados">Ocultar productos ya comprados</label>
        </div>
      </div>
      <div class="row">
        <button type="button" class="btn btn--primary" data-accion="prod-nuevo"><span aria-hidden="true">➕</span>Añadir producto</button>
        <button type="button" class="btn" data-accion="compra-restaurar"><span aria-hidden="true">♻️</span>Restaurar lista automática</button>
        <button type="button" class="btn" data-accion="compra-imprimir"><span aria-hidden="true">🖨️</span>Imprimir</button>
        <button type="button" class="btn" data-accion="compra-csv"><span aria-hidden="true">📄</span>Exportar CSV</button>
        <button type="button" class="btn" data-accion="compra-txt"><span aria-hidden="true">📝</span>Exportar texto</button>
      </div>
    </section>
    ${grupos || '<p class="empty">No hay productos que coincidan con el filtro seleccionado.</p>'}
  `;
}

function productoPorId(id) {
  const lista = listaGuardada(ui.semanaCompra);
  if (!lista) return null;
  return lista.productos.find((p) => p.id === id) || null;
}

/** Añade o fusiona un producto evitando duplicados por nombre. */
function anadirProducto(lista, datos) {
  const existente = lista.productos.find((p) => p.nombre.toLowerCase() === datos.nombre.toLowerCase());
  if (existente) {
    const notas = [existente.nota, datos.nota].filter(Boolean).join(' · ');
    existente.nota = notas || 'Usado en varios platos de esta semana';
    return { fusionado: true, producto: existente };
  }
  const producto = {
    id: uid('prod'),
    nombre: datos.nombre,
    categoria: datos.categoria || 'Otros',
    cantidad: datos.cantidad || '',
    unidad: datos.unidad || '',
    nota: datos.nota || '',
    comprado: false,
    auto: false,
  };
  lista.productos.push(producto);
  return { fusionado: false, producto };
}

function formularioProducto(producto) {
  const p = producto || { nombre: '', categoria: 'Otros', cantidad: '', unidad: '', nota: '' };
  return `
    <div class="field"><label for="f-nombre">Nombre del producto (obligatorio)</label>
      <input type="text" id="f-nombre" value="${esc(p.nombre)}" required /></div>
    <div class="field"><label for="f-categoria">Categoría</label>
      <select id="f-categoria">${CATEGORIAS.map(
        (c) => `<option value="${esc(c)}" ${p.categoria === c ? 'selected' : ''}>${esc(c)}</option>`
      ).join('')}</select></div>
    <div class="grid grid--2">
      <div class="field"><label for="f-cantidad">Cantidad</label>
        <input type="text" id="f-cantidad" value="${esc(p.cantidad)}" /></div>
      <div class="field"><label for="f-unidad">Unidad</label>
        <input type="text" id="f-unidad" value="${esc(p.unidad)}" /></div>
    </div>
    <div class="field"><label for="f-nota">Nota</label>
      <input type="text" id="f-nota" value="${esc(p.nota)}" /></div>`;
}

function csvLista(lista) {
  const cab = ['Categoría', 'Producto', 'Cantidad', 'Unidad', 'Nota', 'Comprado'];
  const filas = lista.productos.map((p) => [
    p.categoria,
    p.nombre,
    p.cantidad,
    p.unidad,
    p.nota,
    p.comprado ? 'Sí' : 'No',
  ]);
  return [cab, ...filas]
    .map((f) => f.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
}

function textoLista(lista) {
  const info = infoSemana(D.parse(lista.semanaId));
  const lineas = [
    `Lista de compra — semana del ${D.corto(info.lunes)} al ${D.corto(info.domingo)}`,
    `Menú correspondiente: Semana ${lista.menu}`,
    '',
  ];
  CATEGORIAS.forEach((cat) => {
    const items = lista.productos.filter((p) => p.categoria === cat);
    if (!items.length) return;
    lineas.push(`## ${cat}`);
    items.forEach((p) => {
      const cant = [p.cantidad, p.unidad].filter(Boolean).join(' ');
      lineas.push(`- [${p.comprado ? 'x' : ' '}] ${p.nombre}${cant ? ` — ${cant}` : ''}${p.nota ? ` (${p.nota})` : ''}`);
    });
    lineas.push('');
  });
  return lineas.join('\n');
}

/* --- Vista: Progreso --- */
function renderProgreso() {
  const p = infoPrograma();
  const stats = estadisticas(state.settings.fechaInicioPrograma, state.settings.fechaFinPrograma);

  // Resumen mensual
  const meses = [];
  let cursor = new Date(p.inicio.getFullYear(), p.inicio.getMonth(), 1);
  while (cursor <= p.fin) {
    const iniMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const finMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const desde = iniMes < p.inicio ? p.inicio : iniMes;
    const hasta = finMes > p.fin ? p.fin : finMes;
    const m = estadisticas(D.iso(desde), D.iso(hasta));
    meses.push({
      clave: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      nombre: D.nombreMes(iniMes),
      stats: m,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const mesesFiltrados = ui.filtroMes === 'todos' ? meses : meses.filter((m) => m.clave === ui.filtroMes);

  const filasMes = mesesFiltrados
    .map(
      (m) => `<div class="month-row">
        <div><strong>${esc(m.nombre)}</strong><br /><span class="hint">${m.stats.conteo.cumplida} cumplidas · ${
          m.stats.conteo.no_cumplida
        } no cumplidas · ${m.stats.conteo.exenta} exentas</span></div>
        <div>${barra(m.stats.porcentaje)}</div>
        <div><strong>${esc(textoPorcentaje(m.stats.porcentaje))}</strong></div>
      </div>`
    )
    .join('');

  // Cuadrícula de semanas
  const chips = [];
  for (let i = 0; i < p.totalSemanas; i += 1) {
    const lunes = D.addDays(D.lunes(p.inicio), i);
    const l = D.addDays(D.lunes(p.inicio), i * 7);
    const dom = D.addDays(l, 6);
    if (ui.filtroMes !== 'todos') {
      const clave = `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, '0')}`;
      const claveDom = `${dom.getFullYear()}-${String(dom.getMonth() + 1).padStart(2, '0')}`;
      if (clave !== ui.filtroMes && claveDom !== ui.filtroMes) continue;
    }
    const info = infoSemana(l);
    const s = estadisticas(D.iso(l), D.iso(dom));
    const hayExc = s.diasExcepcion > 0;
    const clase =
      s.porcentaje == null ? 'pendiente' : s.porcentaje >= 80 ? 'cumplida' : s.porcentaje >= 50 ? 'pendiente' : 'no_cumplida';
    chips.push(`<li class="week-chip cell--${clase}">
      <strong>Semana ${info.numeroSemana}</strong>
      <span>${esc(D.cortoSinAnio(l))} – ${esc(D.cortoSinAnio(dom))}</span><br />
      <span>Menú ${info.menu} · ${esc(textoPorcentaje(s.porcentaje))}</span>
      ${hayExc ? '<br /><span aria-hidden="true">🎉</span> Con excepción' : ''}
      <br /><button type="button" class="btn btn--sm btn--ghost no-print" data-accion="ir-semana" data-fecha="${D.iso(
        l
      )}">Ver</button>
    </li>`);
    if (lunes > p.fin) break;
  }

  // Historial de fotos y comentarios
  const historial = Object.keys(state.mealLogs)
    .map((k) => state.mealLogs[k])
    .filter((l) => l.comentario || l.fotografia)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 60);

  const galeria = historial
    .map((l) => {
      const url = l.fotografia ? Fotos.obtener(l.fotografia) : null;
      const alt = `Foto del plato de ${META_COMIDA[l.tipoDeComida].etiqueta.toLowerCase()} del ${D.medio(l.fecha)}`;
      return `<li><figure>
        ${
          url
            ? `<button type="button" class="thumb" data-accion="ver-foto" data-clave="${esc(
                l.fotografia
              )}" data-alt="${esc(alt)}" aria-label="Ampliar ${esc(alt)}"><img src="${url}" alt="${esc(
                alt
              )}" /></button>`
            : '<div class="empty" style="padding:var(--space-4)">Solo comentario</div>'
        }
        <figcaption>${esc(capitalizar(D.medio(l.fecha)))} · ${esc(
          META_COMIDA[l.tipoDeComida].etiqueta
        )}<br />${esc(l.comentario || '')}</figcaption>
      </figure></li>`;
    })
    .join('');

  $('#progreso-content').innerHTML = `
    ${avisoEstadoPrograma(null)}
    <section class="card" aria-labelledby="prog-general">
      <h3 id="prog-general" class="card-title"><span aria-hidden="true">🗺️</span> Estado del programa</h3>
      <dl class="grid grid--stats">
        ${stat('Fecha de inicio', esc(D.corto(p.inicio)))}
        ${stat('Fecha de fin', esc(D.corto(p.fin)))}
        ${stat('Estado', esc(p.etiquetaEstado))}
        ${stat('Días transcurridos', p.transcurridos)}
        ${stat('Días restantes', p.restantes)}
        ${stat('Porcentaje temporal', `${p.porcentajeTemporal} %`)}
        ${stat('Semanas transcurridas', p.semanasTranscurridas)}
        ${stat('Ciclos de dos semanas', p.ciclo)}
      </dl>
      <div style="margin-top:var(--space-4)">${barra(p.porcentajeTemporal)}</div>
      <p class="hint">Progreso temporal del programa: ${p.porcentajeTemporal} % (${p.transcurridos} de ${
        p.totalDias
      } días).</p>
      ${
        p.estado === 'completado'
          ? `<div class="row no-print" style="margin-top:var(--space-3)">
              <button type="button" class="btn btn--primary" data-accion="extender"><span aria-hidden="true">➕</span>Extender programa</button>
              <button type="button" class="btn" data-accion="reiniciar"><span aria-hidden="true">🔄</span>Reiniciar programa</button>
              <button type="button" class="btn" data-accion="ver-historial"><span aria-hidden="true">📚</span>Ver historial</button>
              <button type="button" class="btn" data-accion="exportar-resumen"><span aria-hidden="true">📤</span>Exportar resumen</button>
            </div>`
          : ''
      }
    </section>

    <section class="card" aria-labelledby="prog-adh">
      <h3 id="prog-adh" class="card-title"><span aria-hidden="true">🎯</span> Adherencia global</h3>
      <p style="font-size:var(--text-lg);font-weight:600">${esc(textoPorcentaje(stats.porcentaje))}</p>
      ${barra(stats.porcentaje)}
      ${stats.porcentaje == null ? '<p class="hint">No hay comidas evaluables durante este periodo.</p>' : ''}
      <dl class="grid grid--stats" style="margin-top:var(--space-4)">
        ${stat('✔️ Comidas cumplidas', stats.conteo.cumplida)}
        ${stat('✖️ Comidas no cumplidas', stats.conteo.no_cumplida)}
        ${stat('⏳ Comidas pendientes', stats.conteo.pendiente)}
        ${stat('🎉 Comidas exentas', stats.conteo.exenta)}
        ${stat('➖ No aplican', stats.conteo.no_aplica)}
        ${stat('📅 Días de excepción', stats.diasExcepcion)}
        ${stat('📷 Fotos añadidas', stats.fotos)}
        ${stat('💬 Comentarios añadidos', stats.comentarios)}
      </dl>
    </section>

    <section class="card" aria-labelledby="prog-mes">
      <h3 id="prog-mes" class="card-title"><span aria-hidden="true">📆</span> Resumen por mes</h3>
      <div class="field no-print" style="max-width:22rem">
        <label for="filtro-mes">Filtrar por mes</label>
        <select id="filtro-mes" data-accion="filtro-mes">
          <option value="todos" ${ui.filtroMes === 'todos' ? 'selected' : ''}>Todos los meses</option>
          ${meses
            .map(
              (m) => `<option value="${m.clave}" ${ui.filtroMes === m.clave ? 'selected' : ''}>${esc(m.nombre)}</option>`
            )
            .join('')}
        </select>
      </div>
      ${filasMes || '<p class="empty">No hay meses que mostrar.</p>'}
    </section>

    <section class="card" aria-labelledby="prog-semanas">
      <h3 id="prog-semanas" class="card-title"><span aria-hidden="true">🧩</span> Cuadrícula de semanas</h3>
      <ul class="week-chips">${chips.join('')}</ul>
      ${leyenda()}
      <p class="hint">Cada tarjeta muestra el número de semana, el menú aplicable y el cumplimiento calculado.</p>
    </section>

    <section class="card" aria-labelledby="prog-hist">
      <h3 id="prog-hist" class="card-title"><span aria-hidden="true">📚</span> Historial de fotos y comentarios</h3>
      ${galeria ? `<ul class="gallery">${galeria}</ul>` : '<p class="empty">Todavía no hay fotos ni comentarios.</p>'}
    </section>

    ${
      state.programHistory.length
        ? `<section class="card" aria-labelledby="prog-ant">
            <h3 id="prog-ant" class="card-title"><span aria-hidden="true">🗂️</span> Programas anteriores</h3>
            ${state.programHistory
              .map(
                (h) =>
                  `<p>${esc(D.corto(h.fechaInicioPrograma))} – ${esc(D.corto(h.fechaFinPrograma))} · ${
                    h.comidasCumplidas != null ? `${h.comidasCumplidas} comidas cumplidas` : 'sin resumen'
                  } · archivado el ${esc(D.horaFecha(h.archivadoEn))}</p>`
              )
              .join('')}
          </section>`
        : ''
    }
  `;
}

/* --- Vista: Excepciones --- */
function renderExcepciones() {
  const tarjetas = state.exceptions
    .slice()
    .sort((a, b) => (a.fechaInicio < b.fechaInicio ? -1 : 1))
    .map((e) => {
      const dias = diasAfectados(e).length;
      return `<article class="exception-card ${e.activa ? '' : 'is-off'}">
        <div class="row row--between">
          <div>
            <h3>${esc(e.nombre)}</h3>
            <p class="hint">${esc(D.corto(e.fechaInicio))} – ${esc(D.corto(e.fechaFin))} · ${esc(
              TIPOS_EXCEPCION[e.tipo]
            )} · ${dias} día${dias === 1 ? '' : 's'}</p>
          </div>
          ${
            e.activa
              ? '<span class="badge badge--exenta"><span aria-hidden="true">🎉</span>Activa</span>'
              : '<span class="badge badge--neutral"><span aria-hidden="true">💤</span>Desactivada</span>'
          }
        </div>
        ${e.nota ? `<p class="hint">${esc(e.nota)}</p>` : ''}
        <p class="hint">Creada el ${esc(D.horaFecha(e.fechaCreacion))}</p>
        <div class="row">
          <button type="button" class="btn btn--sm" data-accion="exc-toggle" data-id="${e.id}">
            <span aria-hidden="true">${e.activa ? '⏸️' : '▶️'}</span>${e.activa ? 'Desactivar' : 'Activar'}</button>
          <button type="button" class="btn btn--sm" data-accion="exc-editar" data-id="${e.id}">
            <span aria-hidden="true">✏️</span>Editar</button>
          <button type="button" class="btn btn--sm" data-accion="exc-duplicar" data-id="${e.id}">
            <span aria-hidden="true">📑</span>Duplicar para otro año</button>
          <button type="button" class="btn btn--sm" data-accion="exc-dias" data-id="${e.id}">
            <span aria-hidden="true">📅</span>Ver días afectados</button>
          <button type="button" class="btn btn--sm btn--danger" data-accion="exc-borrar" data-id="${e.id}">
            <span aria-hidden="true">🗑️</span>Eliminar</button>
        </div>
      </article>`;
    })
    .join('');

  const hayNavidad = state.exceptions.some((e) => /navidad/i.test(e.nombre));

  $('#excepciones-content').innerHTML = `
    <section class="card">
      <p>Las excepciones permiten saltarse la dieta sin que cuente como incumplimiento. No alteran el ciclo de dos
      semanas: solo afectan al control de cumplimiento y a la lista de la compra.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" data-accion="exc-nueva"><span aria-hidden="true">➕</span>Crear excepción</button>
        <button type="button" class="btn" data-accion="exc-navidad"><span aria-hidden="true">🎄</span>Activar excepción de Navidad</button>
      </div>
      ${
        hayNavidad
          ? ''
          : '<p class="hint">No existe la propuesta navideña: el botón la creará con las fechas del 24 de diciembre al 1 de enero.</p>'
      }
    </section>
    ${tarjetas || '<p class="empty">Todavía no hay excepciones registradas.</p>'}
  `;
}

function formularioExcepcion(exc) {
  const e = exc || {
    nombre: '',
    fechaInicio: D.iso(D.hoy()),
    fechaFin: D.iso(D.hoy()),
    tipo: 'dia',
    nota: '',
    activa: true,
  };
  return `
    <div class="field"><label for="e-nombre">Nombre o motivo (obligatorio)</label>
      <input type="text" id="e-nombre" value="${esc(e.nombre)}" required /></div>
    <div class="grid grid--2">
      <div class="field"><label for="e-inicio">Fecha de inicio</label>
        <input type="date" id="e-inicio" value="${esc(e.fechaInicio)}" /></div>
      <div class="field"><label for="e-fin">Fecha de fin</label>
        <input type="date" id="e-fin" value="${esc(e.fechaFin)}" /></div>
    </div>
    <div class="field"><label for="e-tipo">Tipo</label>
      <select id="e-tipo">${Object.keys(TIPOS_EXCEPCION)
        .map((k) => `<option value="${k}" ${e.tipo === k ? 'selected' : ''}>${esc(TIPOS_EXCEPCION[k])}</option>`)
        .join('')}</select></div>
    <div class="field"><label for="e-nota">Nota (opcional)</label>
      <input type="text" id="e-nota" value="${esc(e.nota || '')}" /></div>
    <div class="check-row"><input type="checkbox" id="e-activa" ${e.activa ? 'checked' : ''} />
      <label for="e-activa">Excepción activa</label></div>`;
}

function leerFormularioExcepcion() {
  const nombre = $('#e-nombre').value.trim();
  const fechaInicio = $('#e-inicio').value;
  const fechaFin = $('#e-fin').value;
  if (!nombre) {
    toast('El nombre de la excepción es obligatorio', 'error');
    return null;
  }
  if (!fechaInicio || !fechaFin) {
    toast('Indica las fechas de inicio y de fin', 'error');
    return null;
  }
  if (fechaInicio > fechaFin) {
    toast('La fecha de inicio no puede ser posterior a la fecha final', 'error');
    return null;
  }
  return {
    nombre,
    fechaInicio,
    fechaFin,
    tipo: $('#e-tipo').value,
    nota: $('#e-nota').value.trim(),
    activa: $('#e-activa').checked,
  };
}

/* --- Vista: Configuración --- */
function renderConfig() {
  const s = state.settings;
  const p = infoPrograma();
  const filasMenu = (numero) => {
    const menu = menuDeSemana(numero);
    return menu
      .map(
        (d, i) => `<div class="grid grid--2" style="margin-bottom:var(--space-3)">
          <div class="field" style="margin:0">
            <label for="m${numero}-c-${i}">${esc(capitalizar(NOMBRES_DIAS[i]))} · comida</label>
            <input type="text" id="m${numero}-c-${i}" value="${esc(d.comida)}"
              data-accion="editar-menu" data-semana="${numero}" data-dia="${i}" data-campo="comida" />
          </div>
          <div class="field" style="margin:0">
            <label for="m${numero}-n-${i}">${esc(capitalizar(NOMBRES_DIAS[i]))} · cena</label>
            <input type="text" id="m${numero}-n-${i}" value="${esc(d.cena)}"
              data-accion="editar-menu" data-semana="${numero}" data-dia="${i}" data-campo="cena" />
          </div>
        </div>`
      )
      .join('');
  };

  $('#config-content').innerHTML = `
    <section class="card" aria-labelledby="cfg-prog">
      <h3 id="cfg-prog" class="card-title"><span aria-hidden="true">📅</span> Programa</h3>
      <div class="grid grid--2">
        <div class="field"><label for="cfg-inicio">Fecha de inicio del programa</label>
          <input type="date" id="cfg-inicio" value="${esc(s.fechaInicioPrograma)}" data-accion="cfg-inicio" />
          <p class="hint">Al cambiarla se recalcula el ciclo de dos semanas.</p></div>
        <div class="field"><label for="cfg-fin">Fecha de finalización</label>
          <input type="date" id="cfg-fin" value="${esc(s.fechaFinPrograma)}" data-accion="cfg-fin" />
          <p class="hint">Duración estándar: seis meses desde la fecha de inicio.</p></div>
      </div>
      <p>Estado del programa: <strong>${esc(p.etiquetaEstado)}</strong> · ${p.transcurridos} días transcurridos ·
        ${p.restantes} días restantes · ${p.porcentajeTemporal} % temporal.</p>
      <div class="row">
        <button type="button" class="btn" data-accion="extender-meses" data-meses="1">+1 mes</button>
        <button type="button" class="btn" data-accion="extender-meses" data-meses="3">+3 meses</button>
        <button type="button" class="btn" data-accion="extender-meses" data-meses="6">+6 meses</button>
        <button type="button" class="btn" data-accion="cfg-seis-meses"><span aria-hidden="true">🔁</span>Restablecer a seis meses</button>
        <button type="button" class="btn btn--danger" data-accion="reiniciar"><span aria-hidden="true">🔄</span>Reiniciar programa</button>
      </div>
    </section>

    <section class="card" aria-labelledby="cfg-dieta">
      <h3 id="cfg-dieta" class="card-title"><span aria-hidden="true">🥗</span> Dieta</h3>
      <div class="field"><label for="cfg-desayuno">Desayuno común de todos los días</label>
        <input type="text" id="cfg-desayuno" value="${esc(s.desayunoComun)}" data-accion="cfg-desayuno" /></div>
      <div class="field"><label for="cfg-hambre">Consejo «Cuando hay hambre» (una opción por línea)</label>
        <textarea id="cfg-hambre" data-accion="cfg-hambre">${esc(s.consejoHambre.join('\n'))}</textarea></div>
      <h4>Menú de la Semana 1</h4>
      ${filasMenu(1)}
      <h4>Menú de la Semana 2</h4>
      ${filasMenu(2)}
      <button type="button" class="btn btn--danger" data-accion="restaurar-menu">
        <span aria-hidden="true">♻️</span>Restaurar el menú original del plan</button>
    </section>

    ${tarjetaNube()}

    <section class="card" aria-labelledby="cfg-datos">
      <h3 id="cfg-datos" class="card-title"><span aria-hidden="true">💾</span> Datos</h3>
      <p class="hint">Almacenamiento actual: ${
        Store.disponible ? 'localStorage disponible' : 'localStorage no disponible (datos solo en memoria)'
      } · fotografías en ${esc(Fotos.modo)}.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" data-accion="exportar-json"><span aria-hidden="true">📤</span>Exportar todos los datos (JSON)</button>
        <button type="button" class="btn" data-accion="importar-json"><span aria-hidden="true">📥</span>Importar datos desde JSON</button>
        <button type="button" class="btn" data-accion="exportar-resumen"><span aria-hidden="true">🧾</span>Exportar resumen</button>
        <button type="button" class="btn btn--danger" data-accion="borrar-todo"><span aria-hidden="true">🗑️</span>Borrar todos los datos</button>
      </div>
    </section>

    <section class="card" aria-labelledby="cfg-pref">
      <h3 id="cfg-pref" class="card-title"><span aria-hidden="true">🎨</span> Preferencias</h3>
      <div class="field"><label for="cfg-tema">Tema</label>
        <select id="cfg-tema" data-accion="cfg-tema">
          <option value="light" ${s.tema === 'light' ? 'selected' : ''}>Claro</option>
          <option value="dark" ${s.tema === 'dark' ? 'selected' : ''}>Oscuro</option>
          <option value="auto" ${s.tema === 'auto' ? 'selected' : ''}>Automático (según el sistema)</option>
        </select></div>
      <div class="check-row">
        <input type="checkbox" id="cfg-fotos" ${s.mostrarFotosResumen ? 'checked' : ''} data-accion="cfg-fotos" />
        <label for="cfg-fotos">Mostrar fotografías en las vistas de resumen</label></div>
      <div class="check-row">
        <input type="checkbox" id="cfg-futuras" ${
          s.permitirRegistrosFuturos ? 'checked' : ''
        } data-accion="cfg-futuras" />
        <label for="cfg-futuras">Permitir registrar comidas de fechas futuras (registro anticipado)</label></div>
      <div class="grid grid--2">
        <div class="field"><label for="cfg-primer-dia">Primer día de la semana</label>
          <input type="text" id="cfg-primer-dia" value="Lunes" readonly />
          <p class="hint">Fijado en lunes para que el ciclo de dos semanas sea estable.</p></div>
        <div class="field"><label for="cfg-formato">Formato de fecha</label>
          <input type="text" id="cfg-formato" value="Español de España (dd/mm/aaaa)" readonly /></div>
      </div>
    </section>
  `;
}

/* --- Render general --- */
function render() {
  pintarCabecera();
  if (ui.vista === 'hoy') renderHoy();
  else if (ui.vista === 'semana') renderSemana();
  else if (ui.vista === 'control') renderControl();
  else if (ui.vista === 'compra') renderCompra();
  else if (ui.vista === 'progreso') renderProgreso();
  else if (ui.vista === 'excepciones') renderExcepciones();
  else if (ui.vista === 'config') renderConfig();
}

function actualizar(mensaje) {
  guardar(mensaje);
  render();
  refrescarModalDia();
}
/* ---------------------------------------------------------
   11. Tema, fotografías, exportación e importación
   --------------------------------------------------------- */
function temaEfectivo() {
  const t = state ? state.settings.tema : 'auto';
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema() {
  const efectivo = temaEfectivo();
  document.documentElement.setAttribute('data-theme', efectivo);
  const icono = $('#theme-icon');
  const boton = $('#theme-toggle');
  if (icono) icono.textContent = efectivo === 'dark' ? '☀️' : '🌙';
  if (boton) {
    const nombre = state && state.settings.tema === 'auto' ? 'automático' : efectivo === 'dark' ? 'oscuro' : 'claro';
    boton.setAttribute(
      'aria-label',
      `Cambiar tema de color (actual: ${nombre}). Pulsa para usar el tema ${efectivo === 'dark' ? 'claro' : 'oscuro'}`
    );
  }
}

function alternarTema() {
  state.settings.tema = temaEfectivo() === 'dark' ? 'light' : 'dark';
  aplicarTema();
  guardar('Cambios guardados');
  if (ui.vista === 'config') render();
}

/* --- Fotografías --- */
let inputFoto = null;

function soportaWebp() {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) {
    return false;
  }
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/** Redimensiona a 1280 px de lado mayor y comprime en WebP o JPEG. */
async function comprimirImagen(file, maxLado = 1280) {
  const img = await cargarImagen(file);
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const tipo = soportaWebp() ? 'image/webp' : 'image/jpeg';
  return canvas.toDataURL(tipo, 0.82);
}

async function procesarFoto(file) {
  const clavePendiente = ui.claveFotoPendiente;
  ui.claveFotoPendiente = null;
  if (!file || !clavePendiente) return;
  if (!/^image\//.test(file.type)) {
    toast('El archivo seleccionado no es una imagen', 'error');
    return;
  }
  const [fechaISO, tipo] = [clavePendiente.slice(0, 10), clavePendiente.slice(11)];
  try {
    const dataUrl = await comprimirImagen(file);
    const clave = `foto-${clavePendiente}`;
    const ok = await Fotos.guardar(clave, dataUrl);
    if (!ok) {
      toast('No hay espacio suficiente para guardar la fotografía', 'error');
      return;
    }
    const log = asegurarRegistro(fechaISO, tipo);
    log.fotografia = clave;
    log.fechaDeActualizacion = new Date().toISOString();
    actualizar('Foto añadida');
    if (Nube.conectado()) {
      Nube.subirFoto(clave, dataUrl).catch(() => {});
    }
  } catch (e) {
    console.warn(e);
    toast('No se pudo procesar la fotografía', 'error');
  }
}

function pedirFoto(fechaISO, tipo) {
  ui.claveFotoPendiente = claveComida(fechaISO, tipo);
  if (!inputFoto) {
    inputFoto = document.createElement('input');
    inputFoto.type = 'file';
    inputFoto.accept = 'image/*';
    inputFoto.className = 'visually-hidden';
    inputFoto.addEventListener('change', () => {
      const f = inputFoto.files && inputFoto.files[0];
      inputFoto.value = '';
      procesarFoto(f);
    });
    document.body.appendChild(inputFoto);
  }
  inputFoto.click();
}

function verFoto(clave, alt) {
  const url = Fotos.obtener(clave);
  if (!url) {
    toast('La fotografía no está disponible', 'error');
    return;
  }
  abrirModal({
    titulo: 'Fotografía del plato',
    ancho: true,
    cuerpo: `<img class="full" src="${url}" alt="${esc(alt || 'Fotografía del plato')}" />
      <p class="hint">${esc(alt || '')}</p>`,
    acciones: [{ texto: 'Cerrar', clase: 'btn--ghost', cerrar: true }],
  });
}

/* --- Descargas --- */
function descargar(nombre, contenido, mime) {
  try {
    const blob = new Blob([contenido], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    toast('No se pudo generar la descarga', 'error');
    return false;
  }
}

function exportarJSON() {
  const datos = {
    aplicacion: 'Mi Plan de Dieta',
    version: 1,
    exportadoEn: new Date().toISOString(),
    settings: state.settings,
    mealLogs: state.mealLogs,
    shoppingLists: state.shoppingLists,
    exceptions: state.exceptions,
    programHistory: state.programHistory,
    fotos: Fotos.todas().reduce((acc, f) => {
      acc[f.clave] = f.dataUrl;
      return acc;
    }, {}),
  };
  if (descargar(`mi-plan-dieta-${D.iso(D.hoy())}.json`, JSON.stringify(datos, null, 2), 'application/json')) {
    toast('Datos exportados');
  }
}

function exportarResumen() {
  const p = infoPrograma();
  const s = estadisticas(state.settings.fechaInicioPrograma, state.settings.fechaFinPrograma);
  const lineas = [
    'Mi Plan de Dieta — resumen del programa',
    '=======================================',
    `Inicio: ${D.corto(p.inicio)}`,
    `Fin: ${D.corto(p.fin)}`,
    `Estado: ${p.etiquetaEstado}`,
    `Días transcurridos: ${p.transcurridos} de ${p.totalDias} (${p.porcentajeTemporal} %)`,
    `Semanas transcurridas: ${p.semanasTranscurridas} · Ciclo actual: ${p.ciclo} · Menú actual: Semana ${p.menuActual}`,
    '',
    `Adherencia global: ${s.porcentaje == null ? 'sin comidas evaluables' : `${s.porcentaje} %`}`,
    `Comidas cumplidas: ${s.conteo.cumplida}`,
    `Comidas no cumplidas: ${s.conteo.no_cumplida}`,
    `Comidas pendientes: ${s.conteo.pendiente}`,
    `Comidas no aplicables: ${s.conteo.no_aplica}`,
    `Comidas exentas: ${s.conteo.exenta}`,
    `Días completamente cumplidos: ${s.diasCompletos}`,
    `Días de excepción: ${s.diasExcepcion}`,
    `Fotos: ${s.fotos} · Comentarios: ${s.comentarios}`,
  ];
  if (descargar(`resumen-mi-plan-dieta-${D.iso(D.hoy())}.txt`, lineas.join('\n'), 'text/plain')) {
    toast('Datos exportados');
  }
}

let inputImport = null;

function importarJSON() {
  if (!inputImport) {
    inputImport = document.createElement('input');
    inputImport.type = 'file';
    inputImport.accept = 'application/json,.json';
    inputImport.className = 'visually-hidden';
    inputImport.addEventListener('change', async () => {
      const f = inputImport.files && inputImport.files[0];
      inputImport.value = '';
      if (!f) return;
      try {
        const texto = await f.text();
        const datos = JSON.parse(texto);
        if (!datos || typeof datos !== 'object' || !datos.settings || !datos.settings.fechaInicioPrograma) {
          toast('El archivo no tiene una estructura válida', 'error');
          return;
        }
        const normalizado = normalizar(datos);
        if (!normalizado) {
          toast('El archivo no tiene una estructura válida', 'error');
          return;
        }
        Store.set(CLAVE_COPIA, JSON.stringify(state)); // copia de seguridad
        state = normalizado;
        if (datos.fotos && typeof datos.fotos === 'object') {
          const claves = Object.keys(datos.fotos);
          for (let i = 0; i < claves.length; i += 1) {
            await Fotos.guardar(claves[i], datos.fotos[claves[i]]);
          }
        }
        guardar();
        aplicarTema();
        ui.semanaVista = null;
        ui.semanaControl = null;
        ui.semanaCompra = null;
        render();
        toast('Datos importados correctamente');
      } catch (e) {
        console.warn(e);
        toast('No se pudo importar: el archivo JSON no es válido', 'error');
      }
    });
    document.body.appendChild(inputImport);
  }
  inputImport.click();
}

/* ---------------------------------------------------------
   Acciones del programa
   --------------------------------------------------------- */
function fijarFechasPrograma(inicioISO, finISO) {
  if (finISO < inicioISO) {
    toast('La fecha de fin no puede ser anterior a la fecha de inicio', 'error');
    return false;
  }
  state.settings.fechaInicioPrograma = inicioISO;
  state.settings.fechaFinPrograma = finISO;
  ui.semanaVista = null;
  ui.semanaControl = null;
  ui.semanaCompra = null;
  actualizar('Cambios guardados');
  return true;
}

function extenderPrograma() {
  abrirModal({
    titulo: 'Extender programa',
    cuerpo: `<p>Se ampliará la fecha de finalización sin borrar ningún dato.</p>
      <div class="field"><label for="ext-meses">Meses a añadir</label>
        <select id="ext-meses">
          <option value="1">1 mes</option>
          <option value="3">3 meses</option>
          <option value="6" selected>6 meses</option>
        </select></div>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      {
        texto: 'Extender',
        clase: 'btn--primary',
        onClick: () => {
          const meses = Number($('#ext-meses').value) || 1;
          aplicarExtension(meses);
        },
      },
    ],
  });
}

function aplicarExtension(meses) {
  const nuevoFin = D.addMonths(finPrograma(), meses);
  state.settings.fechaFinPrograma = D.iso(nuevoFin);
  actualizar(`Cambios guardados: programa extendido ${meses} ${meses === 1 ? 'mes' : 'meses'}`);
}

function reiniciarPrograma() {
  abrirModal({
    titulo: 'Reiniciar programa',
    cuerpo: `<p>Elige cómo quieres reiniciar el programa. Esta acción no se puede deshacer.</p>
      <div class="field"><label for="rst-inicio">Nueva fecha de inicio</label>
        <input type="date" id="rst-inicio" value="${esc(D.iso(D.hoy()))}" /></div>
      <p class="hint">«Mantener el historial» archiva el programa actual y conserva los registros guardados.
      «Borrar todos los datos» elimina registros, listas, fotos y excepciones.</p>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      {
        texto: 'Reiniciar manteniendo el historial',
        clase: 'btn--primary',
        onClick: () => {
          const inicio = $('#rst-inicio').value || D.iso(D.hoy());
          const s = estadisticas(state.settings.fechaInicioPrograma, state.settings.fechaFinPrograma);
          state.programHistory.push({
            fechaInicioPrograma: state.settings.fechaInicioPrograma,
            fechaFinPrograma: state.settings.fechaFinPrograma,
            comidasCumplidas: s.conteo.cumplida,
            comidasNoCumplidas: s.conteo.no_cumplida,
            adherencia: s.porcentaje,
            archivadoEn: new Date().toISOString(),
          });
          state.settings.fechaInicioPrograma = inicio;
          state.settings.fechaFinPrograma = D.iso(D.addDays(D.addMonths(D.parse(inicio), 6), -1));
          ui.semanaVista = null;
          ui.semanaControl = null;
          ui.semanaCompra = null;
          actualizar('Cambios guardados: programa reiniciado con historial');
        },
      },
      {
        texto: 'Borrar todos los datos y empezar de cero',
        clase: 'btn--danger',
        onClick: async () => {
          const inicio = $('#rst-inicio').value || D.iso(D.hoy());
          await Fotos.vaciar();
          state = estadoInicial(inicio);
          ui.semanaVista = null;
          ui.semanaControl = null;
          ui.semanaCompra = null;
          aplicarTema();
          actualizar('Cambios guardados: se han borrado todos los datos');
        },
      },
    ],
  });
}

function verHistorial() {
  const filas = state.programHistory
    .map(
      (h) =>
        `<li>${esc(D.corto(h.fechaInicioPrograma))} – ${esc(D.corto(h.fechaFinPrograma))} · adherencia ${
          h.adherencia == null ? 'sin datos' : `${h.adherencia} %`
        } · ${h.comidasCumplidas} comidas cumplidas</li>`
    )
    .join('');
  const actual = estadisticas(state.settings.fechaInicioPrograma, state.settings.fechaFinPrograma);
  abrirModal({
    titulo: 'Historial de programas',
    cuerpo: `<h3>Programa actual</h3>
      <p>${esc(D.corto(inicioPrograma()))} – ${esc(D.corto(finPrograma()))} · adherencia ${esc(
        textoPorcentaje(actual.porcentaje)
      )} · ${actual.conteo.cumplida} comidas cumplidas · ${actual.diasExcepcion} días de excepción</p>
      <h3>Programas anteriores</h3>
      ${filas ? `<ul>${filas}</ul>` : '<p class="hint">No hay programas archivados.</p>'}`,
    acciones: [{ texto: 'Cerrar', clase: 'btn--ghost' }],
  });
}

function borrarTodo() {
  abrirModal({
    titulo: 'Borrar todos los datos',
    cuerpo: `<p>Se eliminarán los registros de comidas, comentarios, fotografías, listas de la compra y excepciones.
      Esta acción no se puede deshacer.</p>
      <p class="hint">Recomendación: exporta una copia antes de continuar.</p>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      { texto: 'Exportar antes de borrar', clase: '', onClick: () => exportarJSON(), cerrar: false },
      {
        texto: 'Borrar definitivamente',
        clase: 'btn--danger',
        onClick: async () => {
          await Fotos.vaciar();
          Store.remove(CLAVE_DATOS);
          state = estadoInicial(D.iso(D.hoy()));
          ui.semanaVista = null;
          ui.semanaControl = null;
          ui.semanaCompra = null;
          aplicarTema();
          actualizar('Cambios guardados: todos los datos han sido borrados');
        },
      },
    ],
  });
}

/* --- Comentarios --- */
function editarComentario(fechaISO, tipo) {
  const log = registro(fechaISO, tipo);
  const actual = log && log.comentario ? log.comentario : '';
  abrirModal({
    titulo: `Comentario · ${META_COMIDA[tipo].etiqueta} del ${D.medio(fechaISO)}`,
    cuerpo: `<div class="field"><label for="c-texto">Comentario</label>
      <textarea id="c-texto" placeholder="Cómo ha ido, cambios, sensaciones…">${esc(actual)}</textarea></div>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      ...(actual
        ? [
            {
              texto: 'Eliminar comentario',
              clase: 'btn--danger',
              onClick: () => {
                const l = asegurarRegistro(fechaISO, tipo);
                l.comentario = '';
                l.fechaDeActualizacion = new Date().toISOString();
                limpiarRegistro(claveComida(fechaISO, tipo));
                actualizar('Comentario eliminado');
              },
            },
          ]
        : []),
      {
        texto: 'Guardar comentario',
        clase: 'btn--primary',
        onClick: () => {
          const texto = $('#c-texto').value.trim();
          const l = asegurarRegistro(fechaISO, tipo);
          l.comentario = texto;
          l.fechaDeActualizacion = new Date().toISOString();
          limpiarRegistro(claveComida(fechaISO, tipo));
          actualizar('Comentario guardado');
        },
      },
    ],
  });
}

/* --- Días --- */
function marcarDiaCumplido(fechaISO) {
  const futura = D.parse(fechaISO) > D.hoy();
  if (futura && !state.settings.permitirRegistrosFuturos) {
    toast('No se pueden registrar comidas futuras. Puedes activarlo en Configuración', 'error');
    return;
  }
  let cambios = 0;
  TIPOS_COMIDA.forEach((t) => {
    if (estadoComida(fechaISO, t) === 'exenta') return; // respeta las exentas
    fijarEstado(fechaISO, t, 'cumplida');
    cambios += 1;
  });
  actualizar(cambios ? 'Comida marcada como cumplida: día completo' : 'Todas las comidas del día están exentas');
}

function restablecerDia(fechaISO) {
  TIPOS_COMIDA.forEach((t) => fijarEstado(fechaISO, t, null));
  actualizar('Cambios guardados: día restablecido');
}

/* --- Selector de fecha --- */
function pedirFecha(titulo, valorInicial, alAceptar) {
  abrirModal({
    titulo,
    cuerpo: `<div class="field"><label for="sel-fecha">Fecha</label>
      <input type="date" id="sel-fecha" value="${esc(valorInicial)}" /></div>`,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      {
        texto: 'Ir',
        clase: 'btn--primary',
        onClick: () => {
          const v = $('#sel-fecha').value;
          if (!v) {
            toast('Indica una fecha válida', 'error');
            return false;
          }
          alAceptar(v);
          return true;
        },
      },
    ],
  });
}

function avisarSiLejana(fechaISO) {
  const limite = D.addDays(finPrograma(), 30);
  if (D.parse(fechaISO) > limite) {
    toast('Atención: esta fecha es muy posterior al fin del programa', 'error');
  }
}

/* ---------------------------------------------------------
   Eventos
   --------------------------------------------------------- */
function manejarClick(ev) {
  const navBtn = ev.target.closest('[data-vista]');
  if (navBtn) {
    irA(navBtn.dataset.vista);
    return;
  }

  const accionModal = ev.target.closest('[data-modal-accion]');
  if (accionModal) {
    const a = accionesModal[Number(accionModal.dataset.modalAccion)];
    if (!a) return;
    let resultado = true;
    if (typeof a.onClick === 'function') resultado = a.onClick();
    if (resultado !== false && a.cerrar !== false) cerrarModal();
    return;
  }

  const btn = ev.target.closest('[data-accion]');
  if (!btn || btn.tagName === 'INPUT' || btn.tagName === 'SELECT' || btn.tagName === 'TEXTAREA') return;
  const a = btn.dataset.accion;
  const fecha = btn.dataset.fecha;
  const tipo = btn.dataset.tipo;
  const id = btn.dataset.id;

  switch (a) {
    /* Comidas */
    case 'estado': {
      const futura = D.parse(fecha) > D.hoy();
      if (futura && !state.settings.permitirRegistrosFuturos) {
        toast('No se pueden registrar comidas futuras. Actívalo en Configuración', 'error');
        return;
      }
      const nuevo = btn.dataset.estado;
      const actual = estadoComida(fecha, tipo);
      const registrado = esEstadoRegistrado(fecha, tipo);
      if (registrado && actual === nuevo) {
        fijarEstado(fecha, tipo, null);
        actualizar('Cambios guardados: comida sin registro');
      } else {
        fijarEstado(fecha, tipo, nuevo);
        actualizar(
          nuevo === 'cumplida'
            ? 'Comida marcada como cumplida'
            : `Cambios guardados: ${ESTADOS[nuevo].etiqueta.toLowerCase()}`
        );
      }
      return;
    }
    case 'pendiente':
      fijarEstado(fecha, tipo, null);
      actualizar('Cambios guardados: comida pendiente');
      return;
    case 'comentario':
      editarComentario(fecha, tipo);
      return;
    case 'borrar-comentario': {
      const l = asegurarRegistro(fecha, tipo);
      l.comentario = '';
      l.fechaDeActualizacion = new Date().toISOString();
      limpiarRegistro(claveComida(fecha, tipo));
      actualizar('Comentario eliminado');
      return;
    }
    case 'foto':
      pedirFoto(fecha, tipo);
      return;
    case 'ver-foto':
      verFoto(btn.dataset.clave, btn.dataset.alt);
      return;
    case 'borrar-foto':
      confirmar({
        titulo: 'Eliminar fotografía',
        mensaje: '¿Seguro que quieres eliminar la fotografía de esta comida?',
        textoConfirmar: 'Eliminar foto',
        onConfirmar: async () => {
          const l = asegurarRegistro(fecha, tipo);
          if (l.fotografia) {
            const claveBorrada = l.fotografia;
            await Fotos.borrar(claveBorrada);
            if (Nube.conectado()) Nube.borrarFoto(claveBorrada).catch(() => {});
          }
          l.fotografia = null;
          l.fechaDeActualizacion = new Date().toISOString();
          limpiarRegistro(claveComida(fecha, tipo));
          actualizar('Foto eliminada');
        },
      });
      return;
    case 'dia-cumplido':
      marcarDiaCumplido(fecha);
      return;
    case 'restablecer-dia':
      restablecerDia(fecha);
      return;
    case 'abrir-dia':
      abrirDia(fecha);
      return;

    /* Semana */
    case 'sem-prev':
      ui.semanaVista = D.iso(D.addDays(D.parse(ui.semanaVista), -7));
      render();
      return;
    case 'sem-next':
      ui.semanaVista = D.iso(D.addDays(D.parse(ui.semanaVista), 7));
      avisarSiLejana(ui.semanaVista);
      render();
      return;
    case 'sem-hoy':
      ui.semanaVista = D.iso(D.lunes(D.hoy()));
      render();
      return;
    case 'sem-ir':
      pedirFecha('Ir a una fecha concreta', ui.semanaVista, (v) => {
        ui.semanaVista = D.iso(D.lunes(D.parse(v)));
        avisarSiLejana(ui.semanaVista);
        render();
      });
      return;
    case 'ir-semana':
      ui.semanaVista = D.iso(D.lunes(D.parse(fecha)));
      irA('semana');
      return;

    /* Control */
    case 'ctrl-prev':
      ui.semanaControl = D.iso(D.addDays(D.parse(ui.semanaControl), -7));
      render();
      return;
    case 'ctrl-next':
      ui.semanaControl = D.iso(D.addDays(D.parse(ui.semanaControl), 7));
      avisarSiLejana(ui.semanaControl);
      render();
      return;
    case 'ctrl-hoy':
      ui.semanaControl = D.iso(D.lunes(D.hoy()));
      render();
      return;

    /* Compra */
    case 'compra-prev':
      ui.semanaCompra = D.iso(D.addDays(D.parse(ui.semanaCompra), -7));
      render();
      return;
    case 'compra-next':
      ui.semanaCompra = D.iso(D.addDays(D.parse(ui.semanaCompra), 7));
      avisarSiLejana(ui.semanaCompra);
      render();
      return;
    case 'compra-proxima':
      ui.semanaCompra = lunesProximaSemana();
      render();
      return;
    case 'compra-cambiar':
      pedirFecha('Elegir semana de compra', ui.semanaCompra, (v) => {
        ui.semanaCompra = D.iso(D.lunes(D.parse(v)));
        avisarSiLejana(ui.semanaCompra);
        render();
      });
      return;
    case 'compra-forzar': {
      const lista = generarLista(ui.semanaCompra, { ignorarExcepciones: true });
      lista.forzada = true;
      state.shoppingLists[ui.semanaCompra] = lista;
      actualizar('Cambios guardados: lista generada');
      return;
    }
    case 'compra-omitir': {
      const existente = listaGuardada(ui.semanaCompra) || generarLista(ui.semanaCompra);
      existente.omitida = true;
      existente.productos = [];
      state.shoppingLists[ui.semanaCompra] = existente;
      actualizar('Cambios guardados: compra omitida esta semana');
      return;
    }
    case 'compra-personalizada': {
      state.shoppingLists[ui.semanaCompra] = {
        semanaId: ui.semanaCompra,
        rango: { inicio: ui.semanaCompra, fin: D.iso(D.addDays(D.parse(ui.semanaCompra), 6)) },
        menu: infoSemana(D.parse(ui.semanaCompra)).menu,
        productos: [],
        omitida: false,
        generadaEn: new Date().toISOString(),
        personalizada: true,
      };
      actualizar('Cambios guardados: lista personalizada creada');
      return;
    }
    case 'compra-restaurar':
      confirmar({
        titulo: 'Restaurar lista de la compra',
        mensaje:
          'Se sustituirá la lista actual por la lista automática de esta semana. Se perderán los productos añadidos y las cantidades escritas.',
        textoConfirmar: 'Restaurar lista',
        onConfirmar: () => {
          state.shoppingLists[ui.semanaCompra] = generarLista(ui.semanaCompra);
          actualizar('Lista de compra restaurada');
        },
      });
      return;
    case 'compra-imprimir':
      window.print();
      return;
    case 'compra-csv': {
      const lista = listaGuardada(ui.semanaCompra);
      if (lista && descargar(`compra-${ui.semanaCompra}.csv`, csvLista(lista), 'text/csv')) toast('Datos exportados');
      return;
    }
    case 'compra-txt': {
      const lista = listaGuardada(ui.semanaCompra);
      if (lista && descargar(`compra-${ui.semanaCompra}.txt`, textoLista(lista), 'text/plain'))
        toast('Datos exportados');
      return;
    }
    case 'prod-nuevo':
      abrirModal({
        titulo: 'Añadir producto',
        cuerpo: formularioProducto(null),
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Añadir',
            clase: 'btn--primary',
            onClick: () => {
              const nombre = $('#f-nombre').value.trim();
              if (!nombre) {
                toast('El nombre del producto es obligatorio', 'error');
                return false;
              }
              const lista = listaGuardada(ui.semanaCompra);
              if (!lista) return false;
              const res = anadirProducto(lista, {
                nombre,
                categoria: $('#f-categoria').value || 'Otros',
                cantidad: $('#f-cantidad').value.trim(),
                unidad: $('#f-unidad').value.trim(),
                nota: $('#f-nota').value.trim(),
              });
              actualizar(res.fusionado ? 'Cambios guardados: producto ya existente, notas fusionadas' : 'Cambios guardados');
              return true;
            },
          },
        ],
      });
      return;
    case 'prod-editar': {
      const producto = productoPorId(id);
      if (!producto) return;
      abrirModal({
        titulo: 'Editar producto',
        cuerpo: formularioProducto(producto),
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Guardar',
            clase: 'btn--primary',
            onClick: () => {
              const nombre = $('#f-nombre').value.trim();
              if (!nombre) {
                toast('El nombre del producto es obligatorio', 'error');
                return false;
              }
              producto.nombre = nombre;
              producto.categoria = $('#f-categoria').value || 'Otros';
              producto.cantidad = $('#f-cantidad').value.trim();
              producto.unidad = $('#f-unidad').value.trim();
              producto.nota = $('#f-nota').value.trim();
              actualizar('Cambios guardados');
              return true;
            },
          },
        ],
      });
      return;
    }
    case 'prod-borrar': {
      const lista = listaGuardada(ui.semanaCompra);
      if (!lista) return;
      lista.productos = lista.productos.filter((p) => p.id !== id);
      actualizar('Cambios guardados: producto eliminado');
      return;
    }

    /* Progreso y programa */
    case 'extender':
      extenderPrograma();
      return;
    case 'extender-meses':
      aplicarExtension(Number(btn.dataset.meses) || 1);
      return;
    case 'cfg-seis-meses':
      fijarFechasPrograma(
        state.settings.fechaInicioPrograma,
        D.iso(D.addDays(D.addMonths(inicioPrograma(), 6), -1))
      );
      return;
    case 'reiniciar':
      reiniciarPrograma();
      return;
    case 'ver-historial':
      verHistorial();
      return;
    case 'exportar-resumen':
      exportarResumen();
      return;

    /* Excepciones */
    case 'exc-nueva':
      abrirModal({
        titulo: 'Crear excepción',
        cuerpo: formularioExcepcion(null),
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Crear excepción',
            clase: 'btn--primary',
            onClick: () => {
              const datos = leerFormularioExcepcion();
              if (!datos) return false;
              state.exceptions.push(
                Object.assign({ id: uid('exc'), fechaCreacion: new Date().toISOString() }, datos)
              );
              actualizar('Excepción creada');
              return true;
            },
          },
        ],
      });
      return;
    case 'exc-editar': {
      const exc = state.exceptions.find((e) => e.id === id);
      if (!exc) return;
      abrirModal({
        titulo: 'Editar excepción',
        cuerpo: formularioExcepcion(exc),
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Guardar cambios',
            clase: 'btn--primary',
            onClick: () => {
              const datos = leerFormularioExcepcion();
              if (!datos) return false;
              Object.assign(exc, datos, { sugerida: false });
              actualizar('Cambios guardados');
              return true;
            },
          },
        ],
      });
      return;
    }
    case 'exc-toggle': {
      const exc = state.exceptions.find((e) => e.id === id);
      if (!exc) return;
      exc.activa = !exc.activa;
      actualizar(exc.activa ? 'Cambios guardados: excepción activada' : 'Cambios guardados: excepción desactivada');
      return;
    }
    case 'exc-borrar': {
      const exc = state.exceptions.find((e) => e.id === id);
      if (!exc) return;
      confirmar({
        titulo: 'Eliminar excepción',
        mensaje: `¿Eliminar «${esc(exc.nombre)}»? Las comidas exentas volverán a contar en el cumplimiento.`,
        textoConfirmar: 'Eliminar excepción',
        onConfirmar: () => {
          state.exceptions = state.exceptions.filter((e) => e.id !== id);
          actualizar('Excepción eliminada');
        },
      });
      return;
    }
    case 'exc-duplicar': {
      const exc = state.exceptions.find((e) => e.id === id);
      if (!exc) return;
      const copia = Object.assign({}, exc, {
        id: uid('exc'),
        fechaInicio: D.iso(D.addMonths(D.parse(exc.fechaInicio), 12)),
        fechaFin: D.iso(D.addMonths(D.parse(exc.fechaFin), 12)),
        activa: false,
        sugerida: false,
        fechaCreacion: new Date().toISOString(),
      });
      abrirModal({
        titulo: 'Duplicar excepción para otro año',
        cuerpo: formularioExcepcion(copia),
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Crear copia',
            clase: 'btn--primary',
            onClick: () => {
              const datos = leerFormularioExcepcion();
              if (!datos) return false;
              state.exceptions.push(Object.assign(copia, datos));
              actualizar('Excepción creada');
              return true;
            },
          },
        ],
      });
      return;
    }
    case 'exc-dias': {
      const exc = state.exceptions.find((e) => e.id === id);
      if (!exc) return;
      const dias = diasAfectados(exc);
      abrirModal({
        titulo: `Días afectados · ${exc.nombre}`,
        cuerpo: `<p class="hint">${esc(TIPOS_EXCEPCION[exc.tipo])} · ${dias.length} día${
          dias.length === 1 ? '' : 's'
        } · ${exc.activa ? 'excepción activa' : 'excepción desactivada'}</p>
          <ul>${dias.map((d) => `<li>${esc(capitalizar(D.largo(d)))}</li>`).join('')}</ul>`,
        acciones: [{ texto: 'Cerrar', clase: 'btn--ghost' }],
      });
      return;
    }
    case 'exc-navidad': {
      let exc = state.exceptions.find((e) => /navidad/i.test(e.nombre));
      if (!exc) {
        exc = excepcionNavidadSugerida(D.hoy());
        state.exceptions.push(exc);
      }
      abrirModal({
        titulo: 'Activar excepción de Navidad',
        cuerpo: `<p>Revisa las fechas antes de guardar. La excepción quedará activa y las comidas de esos días
          se marcarán como exentas.</p>${formularioExcepcion(Object.assign({}, exc, { activa: true }))}`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn--ghost' },
          {
            texto: 'Confirmar y activar',
            clase: 'btn--primary',
            onClick: () => {
              const datos = leerFormularioExcepcion();
              if (!datos) return false;
              Object.assign(exc, datos, { activa: true, sugerida: false });
              actualizar('Cambios guardados: excepción de Navidad activada');
              return true;
            },
          },
        ],
      });
      return;
    }

    /* Configuración */
    case 'restaurar-menu':
      confirmar({
        titulo: 'Restaurar el menú original',
        mensaje:
          'Se recuperarán el desayuno común, el consejo «Cuando hay hambre» y los menús de la Semana 1 y la Semana 2 del plan original. No se borrará el historial de seguimiento.',
        textoConfirmar: 'Restaurar menú',
        onConfirmar: () => {
          state.settings.desayunoComun = DESAYUNO_COMUN_DEFECTO;
          state.settings.consejoHambre = CONSEJO_HAMBRE_DEFECTO.slice();
          state.settings.menuSemana1 = MENU_SEMANA_1_DEFECTO.map((d) => ({ ...d }));
          state.settings.menuSemana2 = MENU_SEMANA_2_DEFECTO.map((d) => ({ ...d }));
          actualizar('Cambios guardados: menú original restaurado');
        },
      });
      return;
    /* Cuenta y nube */
    case 'cuenta':
      abrirCuenta();
      return;
    case 'nube-entrar':
      formularioAcceso('entrar');
      return;
    case 'nube-registrar':
      formularioAcceso('registrar');
      return;
    case 'nube-recuperar':
      formularioAcceso('recuperar');
      return;
    case 'nube-salir':
      cerrarSesionNube();
      return;
    case 'acceso-registrar':
      formularioAcceso('registrar');
      return;
    case 'acceso-recuperar':
      formularioAcceso('recuperar');
      return;
    case 'ver-clave':
      alternarVerClave(btn);
      return;
    case 'acceso-sin-conexion':
      Bloqueo.permitidoAhora = true;
      aplicarBloqueo(false);
      toast('Consultando los datos guardados en este dispositivo');
      return;
    case 'nube-sincronizar':
      sincronizarAhora();
      return;
    case 'nube-subir':
      forzarSubida();
      return;
    case 'nube-bajar':
      forzarBajada();
      return;
    case 'nube-contrasena':
      formularioNuevaContrasena();
      return;
    case 'nube-borrar-remoto':
      borrarDatosNube();
      return;
    case 'exportar-json':
      exportarJSON();
      return;
    case 'importar-json':
      importarJSON();
      return;
    case 'borrar-todo':
      borrarTodo();
      return;
    default:
      return;
  }
}

function manejarCambio(ev) {
  const el = ev.target.closest('[data-accion]');
  if (!el) return;
  const a = el.dataset.accion;
  switch (a) {
    case 'ctrl-semana':
      ui.semanaControl = D.iso(D.lunes(D.parse(el.value)));
      render();
      return;
    case 'filtro-cat':
      ui.filtroCategoria = el.value;
      render();
      return;
    case 'ocultar-comprados':
      ui.ocultarComprados = el.checked;
      render();
      return;
    case 'filtro-mes':
      ui.filtroMes = el.value;
      render();
      return;
    case 'prod-comprado': {
      const p = productoPorId(el.dataset.id);
      if (!p) return;
      p.comprado = el.checked;
      actualizar(p.comprado ? 'Cambios guardados: producto comprado' : 'Cambios guardados');
      return;
    }
    case 'prod-campo': {
      const p = productoPorId(el.dataset.id);
      if (!p) return;
      p[el.dataset.campo] = el.value;
      guardar('Cambios guardados');
      return;
    }
    case 'cfg-inicio': {
      const inicio = el.value;
      if (!inicio) return;
      const fin = D.iso(D.addDays(D.addMonths(D.parse(inicio), 6), -1));
      fijarFechasPrograma(inicio, fin);
      return;
    }
    case 'cfg-fin':
      // Si la validación falla se restaura el valor guardado para no dejar el campo en un estado inválido.
      if (!fijarFechasPrograma(state.settings.fechaInicioPrograma, el.value)) {
        el.value = state.settings.fechaFinPrograma;
      }
      return;
    case 'cfg-desayuno':
      state.settings.desayunoComun = el.value.trim() || DESAYUNO_COMUN_DEFECTO;
      guardar('Cambios guardados');
      return;
    case 'cfg-hambre':
      state.settings.consejoHambre = el.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (!state.settings.consejoHambre.length) state.settings.consejoHambre = CONSEJO_HAMBRE_DEFECTO.slice();
      guardar('Cambios guardados');
      return;
    case 'editar-menu': {
      const semana = Number(el.dataset.semana);
      const dia = Number(el.dataset.dia);
      const campo = el.dataset.campo;
      menuDeSemana(semana)[dia][campo] = el.value;
      guardar('Cambios guardados');
      return;
    }
    case 'cfg-tema':
      state.settings.tema = el.value;
      aplicarTema();
      guardar('Cambios guardados');
      return;
    case 'cfg-fotos':
      state.settings.mostrarFotosResumen = el.checked;
      guardar('Cambios guardados');
      return;
    case 'cfg-bloqueo':
      Bloqueo.fijar(el.checked);
      Bloqueo.permitidoAhora = false;
      toast(
        el.checked
          ? 'Cambios guardados: al abrir la aplicación se pedirá la contraseña'
          : 'Cambios guardados: la aplicación se abrirá sin pedir la contraseña'
      );
      return;
    case 'cfg-futuras':
      state.settings.permitirRegistrosFuturos = el.checked;
      actualizar('Cambios guardados');
      return;
    default:
      return;
  }
}

/* ---------------------------------------------------------
   13. Cuenta y sincronización con la nube (Supabase)
   --------------------------------------------------------- */

/** Refresca el botón de cuenta de la cabecera. */
function pintarCuenta() {
  const btn = $('#cuenta-btn');
  if (!btn) return;
  const info = Nube.textoEstado();
  $('#cuenta-icono').textContent = info.icono;
  $('#cuenta-texto').textContent = Nube.conectado() ? info.texto : Nube.disponible() ? 'Acceso' : 'Local';
  const correo = Nube.correo();
  btn.setAttribute(
    'aria-label',
    Nube.conectado()
      ? `Cuenta de ${correo}. Estado: ${info.texto}. Abrir opciones de cuenta`
      : 'Entrar o crear una cuenta para sincronizar los datos'
  );
  btn.title = correo || 'Acceso y sincronización';
  btn.classList.toggle('btn--cuenta-activa', Nube.conectado());
  const salir = $('#salir-btn');
  if (salir) {
    salir.hidden = !Nube.conectado();
    salir.setAttribute(
      'aria-label',
      correo ? `Cerrar la sesión de ${correo}` : 'Cerrar sesión'
    );
  }
}

/**
 * Alterna entre ver y ocultar una contraseña. El botón vive dentro de un
 * contenedor `.campo-clave` junto al campo al que afecta.
 */
function alternarVerClave(boton) {
  const caja = boton.closest('.campo-clave');
  if (!caja) return;
  const campo = caja.querySelector('input');
  if (!campo) return;
  const visible = campo.type === 'text';
  campo.type = visible ? 'password' : 'text';
  boton.setAttribute('aria-pressed', visible ? 'false' : 'true');
  const etiqueta = visible ? 'Mostrar la contraseña' : 'Ocultar la contraseña';
  boton.setAttribute('aria-label', etiqueta);
  boton.title = etiqueta;
  const icono = boton.querySelector('span');
  if (icono) icono.textContent = visible ? '👁️' : '🙈';
  campo.focus();
}

/** Devuelve el HTML de un campo de contraseña con el botón de ver u ocultar. */
function campoClave(id, autocompletar) {
  return `<div class="campo-clave">
      <input type="password" id="${id}" autocomplete="${autocompletar}" minlength="6" required />
      <button type="button" class="btn btn--ojo" data-accion="ver-clave" aria-pressed="false"
        aria-label="Mostrar la contraseña" title="Mostrar la contraseña"><span aria-hidden="true">👁️</span></button>
    </div>`;
}

/** Arranca la capa de nube y sincroniza si ya hay sesión abierta. */
function iniciarNube() {
  Nube.init()
    .then((listo) => {
      pintarCuenta();
      aplicarBloqueo(false);
      if (!listo) return;
      if (Nube.conectado()) sincronizacionInicial();
      Nube.alCambiar((evento) => {
        pintarCuenta();
        aplicarBloqueo(false);
        if (evento === 'PASSWORD_RECOVERY') formularioNuevaContrasena();
        if (evento === 'SIGNED_OUT') render();
      });
      if (Nube.conectado()) sincronizacionInicial();
    })
    .catch((e) => {
      console.warn('Nube no disponible', e);
      Bloqueo.permitidoAhora = true;
      aplicarBloqueo(false);
    });
}

/** ¿El dispositivo tiene datos propios que merezca la pena conservar? */
function hayDatosLocales() {
  if (!state) return false;
  const registros = Object.keys(state.mealLogs || {}).length;
  const listas = Object.keys(state.shoppingLists || {}).length;
  const excepciones = (state.exceptions || []).filter((e) => !e.sugerida || e.activa).length;
  return registros > 0 || listas > 0 || excepciones > 0;
}

/**
 * Compara la copia local con la de la nube y deja la más reciente en los dos sitios.
 * Criterio: gana la que se guardó más tarde (marca `meta.actualizadoEn`).
 */
/** Evita que dos sincronizaciones iniciales se solapen. */
let sincronizando = false;

/** Rechaza si la promesa tarda más de `ms` para no dejar la interfaz colgada. */
function conLimite(promesa, ms, mensaje) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error(mensaje)), ms)),
  ]);
}

async function sincronizacionInicial(reintento) {
  if (!Nube.conectado() || sincronizando) return;
  sincronizando = true;
  Nube.estado = 'sincronizando';
  Nube.detalle = '';
  pintarCuenta();
  try {
    const remoto = await conLimite(
      Nube.descargar(),
      20000,
      'el servidor ha tardado demasiado en responder'
    );
    if (!remoto || !remoto.datos || !Object.keys(remoto.datos).length) {
      await subirTodoALaNube();
      toast('Datos subidos a la nube');
      return;
    }
    const localISO = (state.meta && state.meta.actualizadoEn) || '';
    const remotoISO = (remoto.datos.meta && remoto.datos.meta.actualizadoEn) || remoto.actualizadoEn || '';
    if (!hayDatosLocales() || remotoISO > localISO) {
      await aplicarRemoto(remoto.datos);
      toast('Datos descargados de la nube');
    } else if (localISO > remotoISO) {
      await subirTodoALaNube();
      toast('Datos subidos a la nube');
    } else {
      Nube.estado = 'sincronizado';
      pintarCuenta();
    }
  } catch (e) {
    Nube.estado = 'error';
    Nube.detalle = e.message;
    pintarCuenta();
    if (reintento) {
      toast(`No se pudo sincronizar: ${e.message}`, 'error');
    } else {
      /* Un primer fallo suele ser una conexión lenta: se vuelve a intentar solo. */
      window.setTimeout(() => {
        sincronizando = false;
        sincronizacionInicial(true);
      }, 3000);
    }
  } finally {
    sincronizando = false;
    quizasPrimerArranque();
  }
}

/**
 * Muestra la pantalla de bienvenida si quedó pendiente por el bloqueo y, una vez
 * dentro, resulta que no hay datos ni en el dispositivo ni en la nube.
 */
function quizasPrimerArranque() {
  if (!ui.primerArranquePendiente) return;
  if (document.body.classList.contains('bloqueado')) return;
  if (hayDatosLocales()) {
    ui.primerArranquePendiente = false;
    return;
  }
  ui.primerArranquePendiente = false;
  primerArranque();
}

/** Sustituye el estado local por el de la nube. */
async function aplicarRemoto(datos) {
  const normalizado = normalizar(datos);
  if (!normalizado) throw new Error('Los datos de la nube no son válidos');
  Nube.aplicandoRemoto = true;
  state = normalizado;
  aplicarTema();
  guardar();
  Nube.aplicandoRemoto = false;
  Nube.estado = 'sincronizado';
  ui.semanaVista = D.iso(D.lunes(D.hoy()));
  ui.semanaControl = D.iso(D.lunes(D.hoy()));
  ui.semanaCompra = lunesProximaSemana();
  render();
  pintarCuenta();
  await recuperarFotosDeLaNube();
}

/** Descarga las fotografías que el estado menciona y no están en este dispositivo. */
async function recuperarFotosDeLaNube() {
  if (!Nube.conectado()) return;
  const claves = Object.keys(state.mealLogs || {})
    .map((k) => state.mealLogs[k].fotografia)
    .filter((c) => c && !Fotos.obtener(c));
  for (let i = 0; i < claves.length; i += 1) {
    try {
      const dataUrl = await Nube.descargarFoto(claves[i]);
      if (dataUrl) await Fotos.guardar(claves[i], dataUrl);
    } catch (e) {
      /* si falla una foto, se continúa con el resto */
    }
  }
  if (claves.length) render();
}

/** Sube el estado y las fotografías que falten en la nube. */
async function subirTodoALaNube() {
  if (!Nube.conectado()) return false;
  await Nube.subir(state);
  pintarCuenta();
  try {
    const enLaNube = await Nube.listarFotos();
    const locales = Fotos.todas();
    for (let i = 0; i < locales.length; i += 1) {
      if (enLaNube.indexOf(locales[i].clave) === -1) {
        await Nube.subirFoto(locales[i].clave, locales[i].dataUrl);
      }
    }
  } catch (e) {
    /* las fotografías se reintentarán en la siguiente sincronización */
  }
  return true;
}

/* --- Diálogos --- */

/** Panel de cuenta: estado, acceso o cierre de sesión. */
function abrirCuenta() {
  if (!Nube.disponible()) {
    abrirModal({
      titulo: 'Solo en este dispositivo',
      cuerpo: `<p>No se ha podido cargar la conexión con la nube, así que la aplicación está funcionando en modo
        local: todo se guarda únicamente en este navegador.</p>
        <p class="hint">${esc(Nube.detalle || 'Comprueba la conexión y vuelve a cargar la página.')}</p>`,
      acciones: [{ texto: 'Entendido', clase: 'btn--primary', cerrar: true }],
    });
    return;
  }
  if (!Nube.conectado()) {
    formularioAcceso('entrar');
    return;
  }
  const info = Nube.textoEstado();
  abrirModal({
    titulo: 'Tu cuenta',
    cuerpo: `<p>Sesión iniciada como <strong>${esc(Nube.correo())}</strong>.</p>
      <p>Estado de la sincronización: <strong>${esc(info.icono)} ${esc(info.texto)}</strong></p>
      <p class="hint">Los datos se guardan primero en este dispositivo y se copian a la nube en segundo plano, de
      modo que puedes seguir registrando comidas sin conexión.</p>`,
    acciones: [
      {
        texto: '🔄 Sincronizar ahora',
        clase: 'btn--primary',
        onClick: () => {
          sincronizarAhora();
          return true;
        },
      },
      {
        texto: '🔑 Cambiar contraseña',
        onClick: () => {
          formularioNuevaContrasena();
          return false;
        },
      },
      {
        texto: '🚪 Cerrar sesión',
        onClick: () => {
          cerrarSesionNube();
          return true;
        },
      },
      { texto: 'Cerrar', clase: 'btn--ghost', cerrar: true },
    ],
  });
}

/**
 * Formulario de acceso.
 * @param {'entrar'|'registrar'|'recuperar'} modo
 */
function formularioAcceso(modo) {
  const titulos = {
    entrar: 'Entrar en tu cuenta',
    registrar: 'Crear una cuenta',
    recuperar: 'Recuperar la contraseña',
  };
  const campoContrasena =
    modo === 'recuperar'
      ? ''
      : `<div class="field"><label for="ac-pass">Contraseña</label>
          ${campoClave('ac-pass', modo === 'registrar' ? 'new-password' : 'current-password')}
          ${modo === 'registrar' ? '<p class="hint">Mínimo 6 caracteres.</p>' : ''}</div>`;
  const explicacion = {
    entrar: 'Entra para sincronizar tus registros entre el móvil y el ordenador.',
    registrar:
      'Crea una cuenta con tu correo y una contraseña. La cuenta se activa al momento: no hay que confirmar ningún mensaje.',
    recuperar:
      'Te enviaremos un enlace al correo para establecer una contraseña nueva. El envío depende del servicio de correo del servidor, así que el mensaje puede tardar o no llegar; si no lo recibes, cambia la contraseña desde el panel de Supabase.',
  };
  const enlaces = {
    entrar: `<div class="row">
        <button type="button" class="btn btn--ghost" data-accion="nube-registrar">Crear una cuenta</button>
        <button type="button" class="btn btn--ghost" data-accion="nube-recuperar">He olvidado la contraseña</button>
      </div>`,
    registrar: `<div class="row">
        <button type="button" class="btn btn--ghost" data-accion="nube-entrar">Ya tengo cuenta</button>
      </div>`,
    recuperar: `<div class="row">
        <button type="button" class="btn btn--ghost" data-accion="nube-entrar">Volver al acceso</button>
      </div>`,
  };

  abrirModal({
    titulo: titulos[modo],
    cuerpo: `<p>${esc(explicacion[modo])}</p>
      <div class="field"><label for="ac-email">Correo electrónico</label>
        <input type="email" id="ac-email" autocomplete="email" value="${esc(Nube.correo())}" required /></div>
      ${campoContrasena}
      <p class="hint" id="ac-aviso" role="status" aria-live="polite"></p>
      ${enlaces[modo]}`,
    alAbrir: () => {
      const campo = $('#ac-email');
      if (campo) campo.focus();
    },
    acciones: [
      {
        texto: modo === 'registrar' ? 'Crear cuenta' : modo === 'recuperar' ? 'Enviar enlace' : 'Entrar',
        clase: 'btn--primary',
        onClick: () => {
          const email = ($('#ac-email').value || '').trim();
          const pass = $('#ac-pass') ? $('#ac-pass').value : '';
          const aviso = $('#ac-aviso');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            aviso.textContent = 'Escribe una dirección de correo válida.';
            return false;
          }
          if (modo !== 'recuperar' && pass.length < 6) {
            aviso.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return false;
          }
          aviso.textContent = 'Conectando…';
          const tarea =
            modo === 'registrar'
              ? Nube.registrar(email, pass)
              : modo === 'recuperar'
                ? Nube.recuperar(email)
                : Nube.entrar(email, pass);
          tarea
            .then((res) => {
              cerrarModal();
              if (modo === 'recuperar') {
                toast('Te hemos enviado un correo para restablecer la contraseña');
              } else if (modo === 'registrar' && res && res.necesitaConfirmacion) {
                abrirModal({
                  titulo: 'Confirma tu correo',
                  cuerpo: `<p>Hemos enviado un mensaje a <strong>${esc(email)}</strong>. Abre el enlace para
                    activar la cuenta y vuelve a entrar.</p>
                    <p class="hint">Mientras tanto puedes seguir usando la aplicación en este dispositivo: al entrar
                    por primera vez, tus datos actuales se subirán a la nube.</p>`,
                  acciones: [{ texto: 'Entendido', clase: 'btn--primary', cerrar: true }],
                });
              } else {
                toast(`Sesión iniciada como ${email}`);
              }
              pintarCuenta();
              if (modo !== 'recuperar' && Nube.conectado()) sincronizacionInicial();
            })
            .catch((e) => {
              const a = $('#ac-aviso');
              if (a) a.textContent = e.message;
              else toast(e.message, 'error');
            });
          return false;
        },
      },
      { texto: 'Cancelar', clase: 'btn--ghost', cerrar: true },
    ],
  });
}

function formularioNuevaContrasena() {
  abrirModal({
    titulo: 'Nueva contraseña',
    cuerpo: `<div class="field"><label for="ac-pass1">Contraseña nueva</label>
        ${campoClave('ac-pass1', 'new-password')}</div>
      <div class="field"><label for="ac-pass2">Repite la contraseña</label>
        ${campoClave('ac-pass2', 'new-password')}</div>
      <p class="hint" id="ac-aviso2" role="status" aria-live="polite"></p>`,
    alAbrir: () => $('#ac-pass1') && $('#ac-pass1').focus(),
    acciones: [
      {
        texto: 'Guardar contraseña',
        clase: 'btn--primary',
        onClick: () => {
          const p1 = $('#ac-pass1').value;
          const p2 = $('#ac-pass2').value;
          const aviso = $('#ac-aviso2');
          if (p1.length < 6) {
            aviso.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return false;
          }
          if (p1 !== p2) {
            aviso.textContent = 'Las dos contraseñas no coinciden.';
            return false;
          }
          Nube.cambiarContrasena(p1)
            .then(() => {
              cerrarModal();
              toast('Cambios guardados: contraseña actualizada');
            })
            .catch((e) => {
              aviso.textContent = e.message;
            });
          return false;
        },
      },
      { texto: 'Cancelar', clase: 'btn--ghost', cerrar: true },
    ],
  });
}

function cerrarSesionNube() {
  Bloqueo.permitidoAhora = false;
  confirmar({
    titulo: 'Cerrar sesión',
    mensaje:
      'Los datos seguirán guardados en este dispositivo y en la nube. Para volver a sincronizar tendrás que entrar de nuevo.',
    textoConfirmar: 'Cerrar sesión',
    peligro: false,
    onConfirmar: () => {
      Nube.salir()
        .then(() => {
          toast('Sesión cerrada');
          pintarCuenta();
          render();
        })
        .catch((e) => toast(e.message, 'error'));
    },
  });
}

async function sincronizarAhora() {
  if (!Nube.conectado()) {
    formularioAcceso('entrar');
    return;
  }
  toast('Sincronizando…');
  await sincronizacionInicial();
  if (Nube.estado === 'sincronizado') toast('Sincronización completada');
}

function forzarSubida() {
  confirmar({
    titulo: 'Subir los datos de este dispositivo',
    mensaje: 'Se sustituirá la copia de la nube por la de este dispositivo. Es útil si sospechas que la nube tiene datos antiguos.',
    textoConfirmar: 'Subir y sustituir',
    onConfirmar: () => {
      subirTodoALaNube()
        .then(() => toast('Datos subidos a la nube'))
        .catch((e) => toast(`No se pudo subir: ${e.message}`, 'error'));
    },
  });
}

function forzarBajada() {
  confirmar({
    titulo: 'Descargar los datos de la nube',
    mensaje: 'Se sustituirán los datos de este dispositivo por los de la nube. Los cambios locales sin sincronizar se perderán.',
    textoConfirmar: 'Descargar y sustituir',
    onConfirmar: () => {
      Nube.descargar()
        .then((remoto) => {
          if (!remoto || !remoto.datos || !Object.keys(remoto.datos).length) {
            toast('Todavía no hay datos guardados en la nube', 'error');
            return null;
          }
          return aplicarRemoto(remoto.datos).then(() => toast('Datos descargados de la nube'));
        })
        .catch((e) => toast(`No se pudo descargar: ${e.message}`, 'error'));
    },
  });
}

function borrarDatosNube() {
  confirmar({
    titulo: 'Borrar la copia de la nube',
    mensaje:
      'Se eliminarán tus datos del servidor, incluidas las fotografías. La copia de este dispositivo no se toca. Esta acción no se puede deshacer.',
    textoConfirmar: 'Borrar de la nube',
    onConfirmar: () => {
      Nube.borrarFila()
        .then(async () => {
          const claves = await Nube.listarFotos();
          for (let i = 0; i < claves.length; i += 1) await Nube.borrarFoto(claves[i]);
          Nube.estado = 'conectado';
          pintarCuenta();
          render();
          toast('Datos borrados de la nube');
        })
        .catch((e) => toast(`No se pudo borrar: ${e.message}`, 'error'));
    },
  });
}

/** Tarjeta «Cuenta y sincronización» de la vista Configuración. */
function tarjetaNube() {
  const info = Nube.textoEstado();
  if (!Nube.disponible()) {
    return `<section class="card" aria-labelledby="cfg-nube">
      <h3 id="cfg-nube" class="card-title"><span aria-hidden="true">📴</span> Cuenta y sincronización</h3>
      <p>La aplicación está funcionando <strong>solo en este dispositivo</strong>: no se ha podido cargar la
      conexión con la nube.</p>
      <p class="hint">${esc(Nube.detalle || 'Comprueba la conexión a Internet y vuelve a cargar la página.')}</p>
    </section>`;
  }
  if (!Nube.conectado()) {
    return `<section class="card" aria-labelledby="cfg-nube">
      <h3 id="cfg-nube" class="card-title"><span aria-hidden="true">🔒</span> Cuenta y sincronización</h3>
      <p>Ahora mismo los datos se guardan solo en este navegador. Si creas una cuenta, tus registros, comentarios y
      fotografías se copian a la nube y puedes consultarlos desde el móvil y desde el ordenador.</p>
      <p class="hint">Cada cuenta solo puede leer y escribir sus propios datos: el acceso está restringido en el
      servidor mediante seguridad a nivel de fila.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" data-accion="nube-entrar"><span aria-hidden="true">🔑</span>Entrar</button>
        <button type="button" class="btn" data-accion="nube-registrar"><span aria-hidden="true">🆕</span>Crear una cuenta</button>
        <button type="button" class="btn btn--ghost" data-accion="nube-recuperar"><span aria-hidden="true">✉️</span>He olvidado la contraseña</button>
      </div>
    </section>`;
  }
  const marca = Nube.estado === 'sincronizado' && Nube.detalle ? new Date(Nube.detalle) : null;
  const cuando = marca && !isNaN(marca) ? ` · Última copia: ${marca.toLocaleString('es-ES')}` : '';
  return `<section class="card" aria-labelledby="cfg-nube">
    <h3 id="cfg-nube" class="card-title"><span aria-hidden="true">☁️</span> Cuenta y sincronización</h3>
    <p>Sesión iniciada como <strong>${esc(Nube.correo())}</strong>.</p>
    <p>Estado: <strong>${esc(info.icono)} ${esc(info.texto)}</strong>${esc(cuando)}</p>
    <p class="hint">Se guarda primero en el dispositivo y después en la nube, así que puedes seguir registrando
    comidas sin conexión: los cambios se envían cuando vuelve la conexión. Si editas desde dos dispositivos, se
    conserva la versión guardada más tarde.</p>
    <div class="check-row">
      <input type="checkbox" id="cfg-bloqueo" ${Bloqueo.activo() ? 'checked' : ''} data-accion="cfg-bloqueo" />
      <label for="cfg-bloqueo">Pedir correo y contraseña al abrir la aplicación en este dispositivo</label>
    </div>
    <p class="hint">Con esta opción activada, al abrir la página se muestra una pantalla de acceso y no se ve
    ningún dato hasta que entras. Es una preferencia de este dispositivo y no se sincroniza.</p>
    <div class="row">
      <button type="button" class="btn btn--primary" data-accion="nube-sincronizar"><span aria-hidden="true">🔄</span>Sincronizar ahora</button>
      <button type="button" class="btn" data-accion="nube-subir"><span aria-hidden="true">⬆️</span>Subir este dispositivo a la nube</button>
      <button type="button" class="btn" data-accion="nube-bajar"><span aria-hidden="true">⬇️</span>Traer los datos de la nube</button>
      <button type="button" class="btn" data-accion="nube-contrasena"><span aria-hidden="true">🔑</span>Cambiar contraseña</button>
      <button type="button" class="btn btn--danger" data-accion="nube-borrar-remoto"><span aria-hidden="true">🗑️</span>Borrar la copia de la nube</button>
      <button type="button" class="btn btn--ghost" data-accion="nube-salir"><span aria-hidden="true">🚪</span>Cerrar sesión</button>
    </div>
  </section>`;
}

/* ---------------------------------------------------------
   14. Bloqueo de acceso al abrir la aplicación

   Es una preferencia de cada dispositivo, no de la cuenta: se guarda
   aparte de `state` para poder leerla antes de cargar nada más.
   --------------------------------------------------------- */

const CLAVE_BLOQUEO = 'miPlanDieta.v1.bloqueo';

const Bloqueo = {
  /** ¿Hay que pedir correo y contraseña al abrir? Activado por defecto. */
  activo() {
    try {
      const v = localStorage.getItem(CLAVE_BLOQUEO);
      return v === null ? true : v === '1';
    } catch (e) {
      return false;
    }
  },

  fijar(valor) {
    try {
      localStorage.setItem(CLAVE_BLOQUEO, valor ? '1' : '0');
    } catch (e) {
      /* sin almacenamiento no se puede recordar la preferencia */
    }
  },

  /** Permiso concedido solo para esta visita (caso «sin conexión»). */
  permitidoAhora: false,
};

/** Aplica o retira la pantalla de acceso según la sesión y la preferencia. */
function aplicarBloqueo(comprobando) {
  const pantalla = $('#pantalla-acceso');
  if (!pantalla) return;

  const sub = $('#acceso-sub');
  const form = $('#acceso-form');
  const enlaces = $('#acceso-enlaces');
  const nota = $('#acceso-nota');
  const botonSinConexion = $('#acceso-sin-conexion');

  /* Mientras se comprueba la sesión se tapa la aplicación sin preguntar nada:
     todavía no se sabe si hay sesión guardada. */
  if (comprobando) {
    pantalla.hidden = false;
    document.body.classList.add('bloqueado');
    sub.textContent = 'Comprobando la sesión…';
    form.hidden = true;
    enlaces.hidden = true;
    nota.hidden = true;
    botonSinConexion.hidden = true;
    return;
  }

  const debeBloquear =
    Bloqueo.activo() && Nube.disponible() && !Nube.conectado() && !Bloqueo.permitidoAhora;

  if (!debeBloquear) {
    pantalla.hidden = true;
    document.body.classList.remove('bloqueado');
    return;
  }

  pantalla.hidden = false;
  document.body.classList.add('bloqueado');

  const sinConexion = navigator.onLine === false;
  sub.textContent = sinConexion
    ? 'No hay conexión en este momento.'
    : 'Introduce tu correo y tu contraseña para ver tus datos.';
  form.hidden = sinConexion;
  /* Sin registro ni recuperación en la pantalla de inicio: las cuentas se crean
     desde el panel de Supabase. */
  enlaces.hidden = true;
  nota.hidden = !sinConexion;
  botonSinConexion.hidden = !sinConexion;

  if (!sinConexion) {
    const email = $('#acceso-email');
    if (email && document.activeElement !== email) email.focus();
  } else if (!botonSinConexion.hidden) {
    botonSinConexion.focus();
  }
}

/** Envío del formulario de la pantalla de acceso. */
function entrarDesdePantalla(ev) {
  if (ev) ev.preventDefault();
  const email = ($('#acceso-email').value || '').trim();
  const pass = $('#acceso-pass').value || '';
  const aviso = $('#acceso-aviso');
  const boton = $('#acceso-entrar');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    aviso.textContent = 'Escribe una dirección de correo válida.';
    $('#acceso-email').focus();
    return;
  }
  if (pass.length < 6) {
    aviso.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    $('#acceso-pass').focus();
    return;
  }

  aviso.textContent = 'Conectando…';
  boton.disabled = true;
  Nube.entrar(email, pass)
    .then(() => {
      aviso.textContent = '';
      $('#acceso-pass').value = '';
      aplicarBloqueo(false);
      toast(`Sesión iniciada como ${email}`);
      sincronizacionInicial();
    })
    .catch((e) => {
      aviso.textContent = e.message;
      $('#acceso-pass').focus();
    })
    .then(() => {
      boton.disabled = false;
    });
}

/* ---------------------------------------------------------
   Primer arranque e inicialización
   --------------------------------------------------------- */
function primerArranque() {
  const hoyISO = D.iso(D.hoy());
  abrirModal({
    titulo: 'Bienvenido a Mi Plan de Dieta',
    cuerpo: `<p>Antes de empezar, indica la fecha de inicio del programa. La duración estándar es de seis meses y la
      fecha de finalización se calcula automáticamente.</p>
      <div class="field"><label for="inicio-prog">Fecha de inicio del programa</label>
        <input type="date" id="inicio-prog" value="${hoyISO}" /></div>
      <p class="hint">Podrás cambiar las fechas más adelante en Configuración. También se creará una propuesta de
      excepción navideña (24 de diciembre – 1 de enero) que permanecerá desactivada hasta que tú la actives.</p>`,
    acciones: [
      {
        texto: 'Empezar el programa',
        clase: 'btn--primary',
        onClick: () => {
          const v = $('#inicio-prog').value || hoyISO;
          state = estadoInicial(v);
          aplicarTema();
          guardar('Cambios guardados: programa creado');
          ui.semanaVista = null;
          ui.semanaControl = null;
          ui.semanaCompra = null;
          render();
          return true;
        },
      },
    ],
  });
}

function init() {
  Store.init();
  Fotos.init()
    .catch(() => {})
    .then(() => {
      const guardado = cargar();
      const esNuevo = !guardado;
      state = guardado || estadoInicial(D.iso(D.hoy()));
      ui.semanaVista = D.iso(D.lunes(D.hoy()));
      ui.semanaControl = D.iso(D.lunes(D.hoy()));
      ui.semanaCompra = lunesProximaSemana();
      aplicarTema();
      pintarNavegacion();
      irA('hoy');
      /* Si el bloqueo está activo se tapa la aplicación antes de mostrar nada. */
      if (Bloqueo.activo() && window.supabase) {
        document.body.classList.add('bloqueado');
        $('#pantalla-acceso').hidden = false;
        aplicarBloqueo(true);
      }
      ui.primerArranquePendiente = esNuevo;
      if (esNuevo && !document.body.classList.contains('bloqueado')) {
        ui.primerArranquePendiente = false;
        primerArranque();
      }
      iniciarNube();
      if (!Store.disponible) {
        toast('El almacenamiento local está bloqueado en este contexto: los datos no se conservarán al recargar', 'error');
      }
    });

  // Eventos globales
  document.addEventListener('click', manejarClick);
  document.addEventListener('change', manejarCambio);
  $('#acceso-form').addEventListener('submit', entrarDesdePantalla);
  window.addEventListener('online', () => aplicarBloqueo(false));
  window.addEventListener('offline', () => aplicarBloqueo(false));
  $('#theme-toggle').addEventListener('click', alternarTema);
  $('#modal-backdrop').addEventListener('mousedown', (ev) => {
    if (ev.target === $('#modal-backdrop')) cerrarModal();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !$('#modal-backdrop').hidden) {
      ev.preventDefault();
      cerrarModal();
    }
    if (ev.key === 'Tab' && !$('#modal-backdrop').hidden) {
      const foco = $$(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        $('#modal')
      );
      if (!foco.length) return;
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      if (ev.shiftKey && document.activeElement === primero) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault();
        primero.focus();
      }
    }
  });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => aplicarTema());
  }
  // La fecha puede cambiar si la aplicación queda abierta durante la noche
  window.setInterval(() => {
    if (state) pintarCabecera();
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
