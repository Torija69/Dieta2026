/* =========================================================
   Mi Plan de Dieta — capa de nube (Supabase)
   ---------------------------------------------------------
   Control de acceso y sincronización opcionales. La aplicación
   sigue funcionando sin conexión y sin cuenta: los datos locales
   son siempre la copia de trabajo y la nube es un espejo.

   La clave "publicable" que aparece aquí está pensada para
   incluirse en el navegador. No da acceso a nada por sí misma:
   todas las tablas tienen seguridad a nivel de fila (RLS) y cada
   usuario solo puede leer y escribir sus propios datos.
   ========================================================= */

const NUBE_CONFIG = {
  url: 'https://ymkojmxilsitilfpmfxc.supabase.co',
  clavePublicable: 'sb_publishable_L7C8CWIcKhlDjUkLuT6yJg__RVvJ18w',
  tabla: 'dietas',
  bucket: 'fotos-dieta',
  retardoSubida: 2000,
};

const Nube = {
  cliente: null,
  sesion: null,
  usuario: null,
  /** 'sin-biblioteca' | 'desconectado' | 'sincronizado' | 'sincronizando' | 'pendiente' | 'error' | 'local' */
  estado: 'desconectado',
  detalle: '',
  revision: 0,
  temporizador: null,
  pendiente: false,
  suscriptores: [],
  aplicandoRemoto: false,

  /* --- Ciclo de vida --- */

  disponible() {
    return !!this.cliente;
  },

  conectado() {
    return !!(this.cliente && this.usuario);
  },

  correo() {
    return this.usuario ? this.usuario.email : '';
  },

  /**
   * Crea el cliente de Supabase si la biblioteca está cargada.
   * @returns {Promise<boolean>} true si hay cliente disponible
   */
  async init() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      this.estado = 'sin-biblioteca';
      this.detalle = 'No se pudo cargar la biblioteca de Supabase. La aplicación funciona solo en este dispositivo.';
      return false;
    }
    try {
      this.cliente = window.supabase.createClient(NUBE_CONFIG.url, NUBE_CONFIG.clavePublicable, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    } catch (e) {
      console.warn('No se pudo crear el cliente de Supabase', e);
      this.estado = 'sin-biblioteca';
      this.detalle = 'No se pudo iniciar la conexión con la nube.';
      return false;
    }

    try {
      const { data } = await this.cliente.auth.getSession();
      this.fijarSesion(data ? data.session : null);
    } catch (e) {
      this.fijarSesion(null);
    }

    this.cliente.auth.onAuthStateChange((evento, sesion) => {
      this.fijarSesion(sesion);
      this.avisar(evento);
    });

    window.addEventListener('online', () => {
      if (this.pendiente && this.conectado()) this.subirAhora();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendiente) this.subirAhora();
    });

    return true;
  },

  fijarSesion(sesion) {
    this.sesion = sesion || null;
    this.usuario = sesion && sesion.user ? sesion.user : null;
    if (!this.usuario) {
      this.estado = 'desconectado';
      this.detalle = '';
      this.revision = 0;
    }
  },

  /** Registra un observador de cambios de sesión o de estado. */
  alCambiar(cb) {
    this.suscriptores.push(cb);
  },

  avisar(evento) {
    this.suscriptores.forEach((cb) => {
      try {
        cb(evento, this);
      } catch (e) {
        console.warn(e);
      }
    });
  },

  /* --- Autenticación --- */

  async registrar(email, contrasena) {
    const { data, error } = await this.cliente.auth.signUp({
      email,
      password: contrasena,
      options: { emailRedirectTo: window.location.href.split('#')[0] },
    });
    if (error) throw new Error(this.traducirError(error));
    // Si el proyecto exige confirmación por correo no llega sesión todavía.
    return { necesitaConfirmacion: !data.session, usuario: data.user };
  },

  async entrar(email, contrasena) {
    const { error } = await this.cliente.auth.signInWithPassword({ email, password: contrasena });
    if (error) throw new Error(this.traducirError(error));
    return true;
  },

  async salir() {
    if (this.pendiente) await this.subirAhora();
    /* Ámbito local: borra la sesión de este dispositivo sin llamar al servidor,
       de modo que cerrar sesión funciona incluso sin conexión. */
    try {
      await this.cliente.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('No se pudo cerrar la sesión limpiamente', e);
    }
    this.fijarSesion(null);
    this.avisar('SIGNED_OUT');
  },

  async recuperar(email) {
    const { error } = await this.cliente.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.split('#')[0],
    });
    if (error) throw new Error(this.traducirError(error));
    return true;
  },

  async cambiarContrasena(nueva) {
    const { error } = await this.cliente.auth.updateUser({ password: nueva });
    if (error) throw new Error(this.traducirError(error));
    return true;
  },

  /** Mensajes de error de Supabase en español claro. */
  traducirError(error) {
    const m = (error && error.message ? error.message : '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos';
    if (m.includes('email not confirmed')) return 'Todavía no has confirmado el correo electrónico';
    if (m.includes('user already registered')) return 'Ya existe una cuenta con ese correo electrónico';
    if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
    if (m.includes('unable to validate email') || m.includes('invalid email')) return 'La dirección de correo no es válida';
    if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos: espera unos minutos';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión con el servidor';
    return error && error.message ? error.message : 'Error desconocido';
  },

  /* --- Datos --- */

  /**
   * Lee la fila del usuario.
   * @returns {Promise<{datos: object, revision: number, actualizadoEn: string}|null>}
   */
  async descargar() {
    if (!this.conectado()) return null;
    const { data, error } = await this.cliente
      .from(NUBE_CONFIG.tabla)
      .select('datos, revision, actualizado_en')
      .eq('usuario_id', this.usuario.id)
      .maybeSingle();
    if (error) throw new Error(this.traducirError(error));
    if (!data) return null;
    this.revision = data.revision || 0;
    return { datos: data.datos, revision: data.revision, actualizadoEn: data.actualizado_en };
  },

  /** Escribe el estado completo en la nube. */
  async subir(datos) {
    if (!this.conectado()) return false;
    this.estado = 'sincronizando';
    this.avisar('SYNC');
    const fila = {
      usuario_id: this.usuario.id,
      datos,
      revision: (this.revision || 0) + 1,
    };
    const { data, error } = await this.cliente
      .from(NUBE_CONFIG.tabla)
      .upsert(fila, { onConflict: 'usuario_id' })
      .select('revision, actualizado_en')
      .single();
    if (error) {
      this.pendiente = true;
      this.estado = navigator.onLine ? 'error' : 'pendiente';
      this.detalle = this.traducirError(error);
      this.avisar('SYNC');
      throw new Error(this.detalle);
    }
    this.revision = data.revision;
    this.pendiente = false;
    this.estado = 'sincronizado';
    this.detalle = data.actualizado_en;
    this.avisar('SYNC');
    return true;
  },

  /** Programa una subida agrupando cambios seguidos. */
  programarSubida(obtenerDatos) {
    if (!this.conectado() || this.aplicandoRemoto) return;
    this.obtenerDatos = obtenerDatos || this.obtenerDatos;
    this.pendiente = true;
    this.estado = 'pendiente';
    this.avisar('SYNC');
    if (this.temporizador) window.clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.subirAhora(), NUBE_CONFIG.retardoSubida);
  },

  async subirAhora() {
    if (this.temporizador) {
      window.clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    if (!this.conectado() || typeof this.obtenerDatos !== 'function') return false;
    try {
      await this.subir(this.obtenerDatos());
      return true;
    } catch (e) {
      console.warn('Sincronización pendiente:', e.message);
      return false;
    }
  },

  async borrarFila() {
    if (!this.conectado()) return false;
    const { error } = await this.cliente.from(NUBE_CONFIG.tabla).delete().eq('usuario_id', this.usuario.id);
    if (error) throw new Error(this.traducirError(error));
    this.revision = 0;
    return true;
  },

  /* --- Fotografías en Storage --- */

  ruta(clave) {
    return `${this.usuario.id}/${clave}.jpg`;
  },

  async subirFoto(clave, dataUrl) {
    if (!this.conectado()) return false;
    const blob = await this.dataUrlABlob(dataUrl);
    if (!blob) return false;
    const { error } = await this.cliente.storage
      .from(NUBE_CONFIG.bucket)
      .upload(this.ruta(clave), blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
    if (error) {
      console.warn('No se pudo subir la fotografía', error.message);
      return false;
    }
    return true;
  },

  async descargarFoto(clave) {
    if (!this.conectado()) return null;
    const { data, error } = await this.cliente.storage.from(NUBE_CONFIG.bucket).download(this.ruta(clave));
    if (error || !data) return null;
    return await this.blobADataUrl(data);
  },

  async borrarFoto(clave) {
    if (!this.conectado()) return false;
    const { error } = await this.cliente.storage.from(NUBE_CONFIG.bucket).remove([this.ruta(clave)]);
    return !error;
  },

  async listarFotos() {
    if (!this.conectado()) return [];
    const { data, error } = await this.cliente.storage.from(NUBE_CONFIG.bucket).list(this.usuario.id, { limit: 1000 });
    if (error || !data) return [];
    return data.map((f) => f.name.replace(/\.jpg$/, ''));
  },

  async dataUrlABlob(dataUrl) {
    try {
      const respuesta = await fetch(dataUrl);
      return await respuesta.blob();
    } catch (e) {
      return null;
    }
  },

  blobADataUrl(blob) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  },

  /* --- Texto para la interfaz --- */

  textoEstado() {
    if (!this.disponible()) return { icono: '📴', texto: 'Solo en este dispositivo' };
    if (!this.usuario) return { icono: '🔒', texto: 'Sin cuenta' };
    switch (this.estado) {
      case 'sincronizado':
        return { icono: '☁️', texto: 'Sincronizado' };
      case 'sincronizando':
        return { icono: '🔄', texto: 'Sincronizando…' };
      case 'pendiente':
        return { icono: '⏳', texto: 'Cambios pendientes' };
      case 'error':
        return { icono: '⚠️', texto: 'Error de sincronización' };
      default:
        return { icono: '☁️', texto: 'Conectado' };
    }
  },
};

window.Nube = Nube;
