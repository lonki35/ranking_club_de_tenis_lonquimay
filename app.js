/* ============================================================
   FIREBASE SDK
============================================================ */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* ============================================================
   CONFIGURACIÓN FIREBASE
============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyD49Let7bMQiOI-qlMD2CqeBF8KBIAysEk",
  authDomain: "ranking-club-tenis-lonquimay.firebaseapp.com",
  projectId: "ranking-club-tenis-lonquimay",
  storageBucket: "ranking-club-tenis-lonquimay.firebasestorage.app",
  messagingSenderId: "146624104646",
  appId: "1:146624104646:web:24ad6f8f54dc8da62a2fc7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Configuración global de persistencia local
setPersistence(auth, browserLocalPersistence).catch(console.error);


/* ============================================================
   JUGADORES INICIALES
============================================================ */

const JUGADORES_INICIALES = [
  { nombre: "Rodrigo Alday", categoria: 1 },
  { nombre: "Diego Labrín", categoria: 1 },
  { nombre: "Alan Gamin", categoria: 1 },
  { nombre: "Claudio Díaz", categoria: 1 },
  { nombre: "Felipe Espinoza", categoria: 1 },
  { nombre: "Luis Gatica", categoria: 2 },
  { nombre: "Gabriel Osorio", categoria: 2 },
  { nombre: "Daniel Carrasco", categoria: 3 },
  { nombre: "Waldo González", categoria: 3 },
  { nombre: "Luis Figueroa", categoria: 3 },
  { nombre: "Tochito Pailla", categoria: 3 },
  { nombre: "Rodrigo Breve", categoria: 4 },
  { nombre: "Danilo Mendoza", categoria: 4 },
  { nombre: "Roger Contreras", categoria: 4 },
  { nombre: "Fernando Uribe", categoria: 5 },
  { nombre: "Cristian Rüedi", categoria: 5 },
  { nombre: "Daniel Alegría", categoria: 5 }
];


/* ============================================================
   VARIABLES
============================================================ */

let usuarioActual = null;
let perfilActual = null;
let jugadores = [];
let partidos = [];
let usuarios = [];
let partidoEnEdicion = null;
let jugadorAEliminar = null;

let unsubscribeJugadores = null;
let unsubscribePartidos = null;
let unsubscribeUsuarios = null;
let unsubscribeAuditoria = null;


/* ============================================================
   DOM
============================================================ */

const el = id => document.getElementById(id);


/* ============================================================
   INICIO
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  el("btnGoogle").addEventListener("click", loginGoogle);
  el("btnCerrarSesion").addEventListener("click", cerrarSesion);
  el("btnCancelarPerfil").addEventListener("click", cerrarSesion);
  el("btnCrearPerfil").addEventListener("click", crearPerfil);
  el("tipoSet3").addEventListener("change", actualizarRangoSet3);

  el("jugadorA").addEventListener("change", () => cargarCategoria("A"));
  el("jugadorB").addEventListener("change", () => cargarCategoria("B"));

  el("btnGuardarPartido").addEventListener("click", guardarPartido);
  el("btnLimpiar").addEventListener("click", limpiarFormularioPartido);
  el("btnBuscarRegistro").addEventListener("click", buscarRegistro);
  el("btnCancelarEdicion").addEventListener("click", cancelarEdicion);
  el("btnAnularPartido").addEventListener("click", anularPartido);
  el("btnEliminarPartido").addEventListener("click", () => {
    if (partidoEnEdicion) {
      eliminarPartidoDirecto(partidoEnEdicion.idFirestore, partidoEnEdicion.numeroRegistro);
    }
  });

  el("btnDescargarRanking").addEventListener("click", descargarRankingExcel);
  el("formJugador").addEventListener("submit", crearJugador);

  el("btnMostrarAdminJugadores").addEventListener(
    "click",
    alternarAdministracionJugadores
  );

  el("btnCancelarEliminarJugador").addEventListener("click", cerrarModalEliminarJugador);
  el("btnConfirmarEliminarJugador").addEventListener("click", ejecutarEliminacionJugador);

  el("btnLimpiarAuditoria")?.addEventListener("click", limpiarHistorialAuditoria);

  prepararMarcadores();
  el("fecha").value = fechaActual();

  // Procesar redirección por si se navegó desde móvil
  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("Error al procesar redirección de login:", error);
  }

  escucharAutenticacion();
});


/* ============================================================
   GOOGLE LOGIN / LOGOUT
============================================================ */

async function loginGoogle() {
  ocultarMensaje("mensajeLogin");

  try {
    googleProvider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error al iniciar sesión con Popup:", error);

    // Si el navegador bloqueó la ventana flotante en celulares
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        mostrarMensaje("mensajeLogin", "Asegúrese de permitir las ventanas emergentes en su navegador.", "error");
      }
    } else {
      mostrarMensaje("mensajeLogin", "No fue posible iniciar sesión con Google.", "error");
    }
  }
}

async function cerrarSesion() {
  try {
    detenerListeners();
    perfilActual = null;
    usuarioActual = null;
    await signOut(auth);
    mostrarSoloVista("login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}


/* ============================================================
   AUTH STATE
============================================================ */

const MODO_BYPASS = false;

function escucharAutenticacion() {
  if (MODO_BYPASS) {
    return;
  }

  onAuthStateChanged(auth, async user => {
    usuarioActual = user;

    if (!user) {
      detenerListeners();
      perfilActual = null;
      mostrarSoloVista("login");
      return;
    }

    try {
      const perfilRef = doc(db, "usuarios", user.uid);
      const perfilSnap = await getDoc(perfilRef);

      if (!perfilSnap.exists()) {
        await prepararNuevoPerfil(user);
        return;
      }

      perfilActual = {
        id: perfilSnap.id,
        ...perfilSnap.data()
      };

      if (perfilActual.activo === false) {
        detenerListeners();
        await signOut(auth);
        mostrarSoloVista("login");
        mostrarMensaje("mensajeLogin", "Su cuenta se encuentra desactivada.", "error");
        return;
      }

      abrirAplicacion();
    } catch (error) {
      console.error("Error al obtener perfil desde Firestore:", error);
      mostrarMensaje("mensajeLogin", "Error al conectar con la base de datos. Intente presionar el botón nuevamente.", "error");
    }
  });
}


/* ============================================================
   PRIMER PERFIL
============================================================ */

async function prepararNuevoPerfil(user) {
  mostrarSoloVista("perfil");
  el("correoNuevoPerfil").textContent = user.email || "";
  await cargarJugadoresParaNuevoPerfil();
}

async function cargarJugadoresParaNuevoPerfil() {
  const select = el("jugadorNuevoPerfil");
  select.innerHTML = '<option value="">Seleccione jugador</option>';

  try {
    const snapshot = await getDocs(collection(db, "jugadores"));
    let lista = [];

    if (!snapshot.empty) {
      lista = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => j.activo !== false);
    }

    if (lista.length === 0) {
      lista = JUGADORES_INICIALES.map((j, index) => ({
        id: `inicial-${index}`,
        ...j,
        temporal: true
      }));
    }

    lista
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .forEach(j => {
        const option = new Option(`${j.nombre} — Categoría ${j.categoria}`, j.id);
        option.dataset.nombre = j.nombre;
        option.dataset.categoria = j.categoria;
        option.dataset.temporal = j.temporal ? "true" : "false";
        select.add(option);
      });
  } catch (error) {
    console.error(error);
  }
}

async function crearPerfil() {
  if (!usuarioActual) return;

  const select = el("jugadorNuevoPerfil");
  const option = select.selectedOptions[0];

  if (!select.value) {
    mostrarMensaje("mensajePerfil", "Debe seleccionar su jugador.", "error");
    return;
  }

  const jugadorNombre = option.dataset.nombre;
  const categoria = Number(option.dataset.categoria);

  try {
    let jugadorId = select.value;

    if (option.dataset.temporal === "true") {
      const jugadorRef = await addDoc(collection(db, "jugadores"), {
        nombre: jugadorNombre,
        categoria,
        activo: true,
        creadoEn: serverTimestamp()
      });
      jugadorId = jugadorRef.id;
    }

    await setDoc(doc(db, "usuarios", usuarioActual.uid), {
      nombreGoogle: usuarioActual.displayName || "",
      email: usuarioActual.email || "",
      foto: usuarioActual.photoURL || "",
      jugadorId,
      jugadorNombre,
      rol: "usuario",
      activo: true,
      creadoEn: serverTimestamp()
    });

    await completarNominaInicial();

    perfilActual = {
      id: usuarioActual.uid,
      nombreGoogle: usuarioActual.displayName || "",
      email: usuarioActual.email || "",
      foto: usuarioActual.photoURL || "",
      jugadorId,
      jugadorNombre,
      rol: "usuario",
      activo: true
    };

    abrirAplicacion();
  } catch (error) {
    console.error(error);
    mostrarMensaje("mensajePerfil", "No fue posible crear el perfil.", "error");
  }
}

async function completarNominaInicial() {
  const snapshot = await getDocs(collection(db, "jugadores"));
  const existentes = snapshot.docs.map(d => normalizarTexto(d.data().nombre || ""));

  for (const jugador of JUGADORES_INICIALES) {
    if (!existentes.includes(normalizarTexto(jugador.nombre))) {
      await addDoc(collection(db, "jugadores"), {
        nombre: jugador.nombre,
        categoria: jugador.categoria,
        activo: true,
        creadoEn: serverTimestamp()
      });
    }
  }
}


/* ============================================================
   ABRIR APP
============================================================ */

function abrirAplicacion() {
  mostrarSoloVista("app");

  el("nombreUsuario").textContent =
    usuarioActual.displayName || perfilActual.jugadorNombre || "";
  el("correoUsuario").textContent = usuarioActual.email || "";
  el("rolActual").textContent = esAdmin() ? "ADMINISTRADOR" : "USUARIO";

  if (usuarioActual.photoURL) {
    el("fotoUsuario").src = usuarioActual.photoURL;
    el("fotoUsuario").classList.remove("hidden");
  } else {
    el("fotoUsuario").classList.add("hidden");
  }

  el("panelAdministrador").classList.toggle("hidden", !esAdmin());
  el("thAccionesPartidos").classList.toggle("hidden", !esAdmin());

  if (esAdmin()) {
    el("textoPermisoPartido").textContent =
      "Modo administrador: puede registrar, modificar y eliminar cualquier partido.";
  } else {
    el("textoPermisoPartido").textContent =
      `Jugador asociado: ${perfilActual.jugadorNombre}. Solo puede enviar un partido que haya ganado.`;
  }

  escucharJugadores();
  escucharPartidos();

  if (esAdmin()) {
    escucharUsuarios();
    escucharAuditoria();
  }
}


/* ============================================================
   VISTAS Y ROLES
============================================================ */

function mostrarSoloVista(tipo) {
  el("vistaLogin").classList.add("hidden");
  el("vistaCrearPerfil").classList.add("hidden");
  el("vistaAplicacion").classList.add("hidden");
  el("zonaUsuario").classList.add("hidden");

  if (tipo === "login") el("vistaLogin").classList.remove("hidden");
  if (tipo === "perfil") el("vistaCrearPerfil").classList.remove("hidden");
  if (tipo === "app") {
    el("vistaAplicacion").classList.remove("hidden");
    el("zonaUsuario").classList.remove("hidden");
  }
}

function esAdmin() {
  return perfilActual && perfilActual.rol === "admin";
}


/* ============================================================
   JUGADORES EN TIEMPO REAL
============================================================ */

function escucharJugadores() {
  if (unsubscribeJugadores) unsubscribeJugadores();

  const q = query(collection(db, "jugadores"), orderBy("nombre"));

  unsubscribeJugadores = onSnapshot(q, snapshot => {
    jugadores = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    cargarSelectJugadores();

    if (esAdmin()) {
      renderJugadoresAdmin();
    }

    renderRanking();

    el("estadoConexion").textContent = "Conectado";
    el("estadoConexion").className = "badge badge-ok";
  });
}

function cargarSelectJugadores() {
  ["jugadorA", "jugadorB"].forEach(id => {
    const select = el(id);
    const anterior = select.value;

    select.innerHTML = '<option value="">Seleccione jugador</option>';

    jugadores
      .filter(j => j.activo !== false)
      .forEach(j => {
        const option = new Option(j.nombre, j.id);
        option.dataset.nombre = j.nombre;
        option.dataset.categoria = j.categoria;
        select.add(option);
      });

    if ([...select.options].some(o => o.value === anterior)) {
      select.value = anterior;
    }
  });

  cargarCategoria("A");
  cargarCategoria("B");
}

function cargarCategoria(lado) {
  const select = lado === "A" ? el("jugadorA") : el("jugadorB");
  const categoria = lado === "A" ? el("categoriaA") : el("categoriaB");
  const option = select.selectedOptions[0];
  categoria.value = option?.dataset?.categoria || "";
}


/* ============================================================
   MARCADORES
============================================================ */

function prepararMarcadores() {
  llenarNumeros("set1A", 7);
  llenarNumeros("set1B", 7);
  llenarNumeros("set2A", 7);
  llenarNumeros("set2B", 7);
  llenarNumeros("set3A", 7);
  llenarNumeros("set3B", 7);
}

function llenarNumeros(id, maximo, seleccionado = "") {
  const select = el(id);
  select.innerHTML = '<option value="">-</option>';

  for (let i = 0; i <= maximo; i++) {
    const option = new Option(i, i);
    if (String(i) === String(seleccionado)) {
      option.selected = true;
    }
    select.add(option);
  }
}

function actualizarRangoSet3() {
  const tipo = el("tipoSet3").value;
  const a = el("set3A").value;
  const b = el("set3B").value;
  const maximo = tipo === "super" ? 21 : 7;

  llenarNumeros("set3A", maximo, Number(a) <= maximo ? a : "");
  llenarNumeros("set3B", maximo, Number(b) <= maximo ? b : "");
}


/* ============================================================
   VALIDACIONES Y CÁLCULOS
============================================================ */

function obtenerDatosPartido() {
  const optionA = el("jugadorA").selectedOptions[0];
  const optionB = el("jugadorB").selectedOptions[0];

  return {
    fecha: el("fecha").value,
    jugadorAId: el("jugadorA").value,
    jugadorA: optionA?.dataset?.nombre || "",
    categoriaA: Number(optionA?.dataset?.categoria || 0),
    jugadorBId: el("jugadorB").value,
    jugadorB: optionB?.dataset?.nombre || "",
    categoriaB: Number(optionB?.dataset?.categoria || 0),
    set1A: numeroSelect("set1A"),
    set1B: numeroSelect("set1B"),
    set2A: numeroSelect("set2A"),
    set2B: numeroSelect("set2B"),
    set3A: numeroSelect("set3A"),
    set3B: numeroSelect("set3B"),
    tipoSet3: el("tipoSet3").value
  };
}

function validarPartido(d) {
  if (!d.fecha) return "Debe indicar la fecha.";
  if (!d.jugadorAId || !d.jugadorBId) return "Debe seleccionar ambos jugadores.";
  if (d.jugadorAId === d.jugadorBId) return "Un jugador no puede jugar contra sí mismo.";
  if (d.set1A === null || d.set1B === null || d.set2A === null || d.set2B === null) {
    return "Debe completar los dos primeros sets.";
  }

  const errorSet1 = validarSetNormal(d.set1A, d.set1B);
  if (errorSet1) return `Set 1: ${errorSet1}`;

  const errorSet2 = validarSetNormal(d.set2A, d.set2B);
  if (errorSet2) return `Set 2: ${errorSet2}`;

  const ganaSet1A = d.set1A > d.set1B;
  const ganaSet2A = d.set2A > d.set2B;
  const necesitaTercero = ganaSet1A !== ganaSet2A;
  const tiene3A = d.set3A !== null;
  const tiene3B = d.set3B !== null;

  if (tiene3A !== tiene3B) return "Debe ingresar el resultado completo del tercer set.";
  if (necesitaTercero && !tiene3A) return "El partido está 1-1 en sets. Debe registrar el tercer set.";
  if (!necesitaTercero && tiene3A) return "El partido terminó 2-0. No corresponde registrar tercer set.";

  if (necesitaTercero) {
    if (d.tipoSet3 === "normal") {
      const errorSet3 = validarSetNormal(d.set3A, d.set3B);
      if (errorSet3) return `Set 3: ${errorSet3}`;
    } else {
      const errorSuper = validarSuperTieBreak(d.set3A, d.set3B);
      if (errorSuper) return `Super tie-break: ${errorSuper}`;
    }
  }

  return "";
}

function validarSetNormal(a, b) {
  if (a === b) return "el set no puede terminar empatado.";
  const ganador = Math.max(a, b);
  const perdedor = Math.min(a, b);
  const valido = (ganador === 6 && perdedor <= 4) || (ganador === 7 && (perdedor === 5 || perdedor === 6));
  if (!valido) return "marcador no válido. Se admiten 6-0 a 6-4, 7-5 y 7-6.";
  return "";
}

function validarSuperTieBreak(a, b) {
  if (a === null || b === null) return "debe completar ambos marcadores.";
  if (a === b) return "no puede terminar empatado.";
  const ganador = Math.max(a, b);
  const perdedor = Math.min(a, b);
  if (ganador < 10) return "el ganador debe alcanzar al menos 10 puntos.";
  if (ganador - perdedor < 2) return "debe ganarse por diferencia mínima de 2 puntos.";
  return "";
}

function calcularResultado(d) {
  let setsA = 0;
  let setsB = 0;
  let juegosA = d.set1A + d.set2A;
  let juegosB = d.set1B + d.set2B;

  if (d.set1A > d.set1B) setsA++; else setsB++;
  if (d.set2A > d.set2B) setsA++; else setsB++;

  if (d.set3A !== null) {
    if (d.set3A > d.set3B) setsA++; else setsB++;
    if (d.tipoSet3 === "normal") {
      juegosA += d.set3A;
      juegosB += d.set3B;
    }
  }

  const ganaA = setsA > setsB;
  const ganador = ganaA ? d.jugadorA : d.jugadorB;
  const ganadorId = ganaA ? d.jugadorAId : d.jugadorBId;
  const perdedor = ganaA ? d.jugadorB : d.jugadorA;
  const categoriaGanador = ganaA ? d.categoriaA : d.categoriaB;
  const categoriaPerdedor = ganaA ? d.categoriaB : d.categoriaA;

  let puntosGanador;
  if (categoriaGanador > categoriaPerdedor) puntosGanador = 10;
  else if (categoriaGanador === categoriaPerdedor) puntosGanador = 7;
  else puntosGanador = 5;

  return {
    setsA,
    setsB,
    juegosA,
    juegosB,
    ganador,
    ganadorId,
    perdedor,
    puntosGanador,
    puntosA: ganaA ? puntosGanador : 1,
    puntosB: ganaA ? 1 : puntosGanador
  };
}


/* ============================================================
   GUARDAR / ACTUALIZAR / ELIMINAR PARTIDO
============================================================ */

async function guardarPartido() {
  ocultarMensaje("mensaje");
  const datos = obtenerDatosPartido();
  const error = validarPartido(datos);

  if (error) {
    mostrarMensaje("mensaje", error, "error");
    return;
  }

  const resultado = calcularResultado(datos);

  if (!esAdmin()) {
    const correspondeGanador = perfilActual.jugadorId === resultado.ganadorId;
    if (!correspondeGanador) {
      mostrarMensaje("mensaje", "Solo el ganador del partido puede enviar el resultado.", "error");
      return;
    }
  }

  try {
    if (partidoEnEdicion) {
      await actualizarPartido(datos, resultado);
    } else {
      await crearPartido(datos, resultado);
    }
  } catch (error) {
    console.error(error);
    mostrarMensaje("mensaje", "No fue posible guardar el partido.", "error");
  }
}

async function crearPartido(datos, resultado) {
  const numeroRegistro = await obtenerCorrelativo();

  await addDoc(collection(db, "partidos"), {
    numeroRegistro,
    ...datos,
    ...resultado,
    estado: "vigente",
    informadoPorUid: usuarioActual.uid,
    informadoPorEmail: usuarioActual.email || "",
    informadoPorJugador: perfilActual.jugadorNombre || "",
    creadoEn: serverTimestamp(),
    modificadoEn: serverTimestamp()
  });

  el("numeroRegistroVista").value = numeroRegistro;
  mostrarMensaje("mensaje", `Partido guardado correctamente. N.º de registro ${numeroRegistro}.`, "ok");
  limpiarMarcadores();
}

async function obtenerCorrelativo() {
  const ref = doc(db, "sistema", "correlativos");
  return await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    const actual = snap.exists() ? Number(snap.data().ultimoPartido || 0) : 0;
    const siguiente = actual + 1;
    transaction.set(ref, { ultimoPartido: siguiente }, { merge: true });
    return siguiente;
  });
}

async function actualizarPartido(datos, resultado) {
  if (!partidoEnEdicion) return;

  if (!esAdmin() && partidoEnEdicion.informadoPorUid !== usuarioActual.uid) {
    mostrarMensaje("mensaje", "No tiene permiso para modificar este partido.", "error");
    return;
  }

  const anterior = copiarDatosAuditoria(partidoEnEdicion);

  await updateDoc(doc(db, "partidos", partidoEnEdicion.idFirestore), {
    ...datos,
    ...resultado,
    modificadoEn: serverTimestamp(),
    modificadoPorUid: usuarioActual.uid,
    modificadoPorEmail: usuarioActual.email || ""
  });

  await addDoc(collection(db, "auditoria"), {
    accion: "CORRECCIÓN DE PARTIDO",
    numeroRegistro: partidoEnEdicion.numeroRegistro,
    usuarioUid: usuarioActual.uid,
    usuarioEmail: usuarioActual.email || "",
    anterior,
    nuevo: { ...datos, ...resultado },
    fecha: serverTimestamp()
  });

  mostrarMensaje("mensaje", `Partido N.º ${partidoEnEdicion.numeroRegistro} actualizado correctamente.`, "ok");
  cancelarEdicion();
}

async function eliminarPartidoDirecto(idFirestore, numeroRegistro) {
  if (!esAdmin()) return;

  const confirmar = window.confirm(
    `¿Desea ELIMINAR permanentemente el partido N.º ${numeroRegistro}? Esta acción no se puede deshacer.`
  );

  if (!confirmar) return;

  try {
    const pSnap = await getDoc(doc(db, "partidos", idFirestore));
    const datosPart = pSnap.exists() ? pSnap.data() : {};

    await deleteDoc(doc(db, "partidos", idFirestore));

    await addDoc(collection(db, "auditoria"), {
      accion: "ELIMINACIÓN DEFINITIVA DE PARTIDO",
      numeroRegistro: numeroRegistro,
      usuarioUid: usuarioActual.uid,
      usuarioEmail: usuarioActual.email || "",
      datosEliminados: copiarDatosAuditoria(datosPart),
      fecha: serverTimestamp()
    });

    if (partidoEnEdicion && partidoEnEdicion.idFirestore === idFirestore) {
      cancelarEdicion();
    }

    mostrarMensaje("mensaje", `Partido N.º ${numeroRegistro} eliminado de la base de datos.`, "ok");
  } catch (error) {
    console.error("Error al eliminar partido:", error);
    mostrarMensaje("mensaje", "Error al intentar eliminar el partido.", "error");
  }
}

async function anularPartido() {
  if (!esAdmin() || !partidoEnEdicion) return;

  const confirmar = window.confirm(`¿Está seguro de anular el partido N.º ${partidoEnEdicion.numeroRegistro}?`);
  if (!confirmar) return;

  await updateDoc(doc(db, "partidos", partidoEnEdicion.idFirestore), {
    estado: "anulado",
    modificadoEn: serverTimestamp(),
    modificadoPorUid: usuarioActual.uid,
    modificadoPorEmail: usuarioActual.email || ""
  });

  await addDoc(collection(db, "auditoria"), {
    accion: "ANULACIÓN DE PARTIDO",
    numeroRegistro: partidoEnEdicion.numeroRegistro,
    usuarioUid: usuarioActual.uid,
    usuarioEmail: usuarioActual.email || "",
    fecha: serverTimestamp()
  });

  mostrarMensaje("mensaje", `Partido N.º ${partidoEnEdicion.numeroRegistro} anulado.`, "ok");
  cancelarEdicion();
}


/* ============================================================
   PARTIDOS EN TIEMPO REAL & TABLA
============================================================ */

function escucharPartidos() {
  if (unsubscribePartidos) unsubscribePartidos();

  const q = query(collection(db, "partidos"), orderBy("numeroRegistro", "desc"));

  unsubscribePartidos = onSnapshot(q, snapshot => {
    partidos = snapshot.docs.map(d => ({
      idFirestore: d.id,
      ...d.data()
    }));

    renderPartidos();
    renderRanking();
  });
}

function renderPartidos() {
  const tbody = el("tablaPartidos");
  tbody.innerHTML = "";

  partidos.forEach(p => {
    const tr = document.createElement("tr");

    const valores = [
      p.numeroRegistro,
      p.fecha,
      p.jugadorA,
      p.categoriaA,
      marcadorPartido(p),
      p.jugadorB,
      p.categoriaB,
      p.ganador,
      p.puntosGanador,
      p.informadoPorJugador || p.informadoPorEmail || "",
      p.estado || "vigente"
    ];

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor ?? "";
      tr.appendChild(td);
    });

    if (esAdmin()) {
      const tdAcciones = document.createElement("td");
      tdAcciones.style.whiteSpace = "nowrap";

      const btnModificar = document.createElement("button");
      btnModificar.textContent = "Modificar";
      btnModificar.className = "btn btn-primary btn-small";
      btnModificar.onclick = () => cargarEdicion(p);

      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.className = "btn btn-danger btn-small";
      btnEliminar.style.marginLeft = "5px";
      btnEliminar.onclick = () => eliminarPartidoDirecto(p.idFirestore, p.numeroRegistro);

      tdAcciones.append(btnModificar, btnEliminar);
      tr.appendChild(tdAcciones);
    }

    tbody.appendChild(tr);
  });
}

function marcadorPartido(p) {
  let texto = `${p.set1A}-${p.set1B} / ${p.set2A}-${p.set2B}`;
  if (p.set3A !== null && p.set3A !== undefined) {
    texto += ` / ${p.set3A}-${p.set3B}`;
    if (p.tipoSet3 === "super") texto += " STB";
  }
  return texto;
}

async function buscarRegistro() {
  const numero = Number(el("buscarRegistro").value);
  if (!numero) {
    mostrarMensaje("mensaje", "Ingrese un N.º de registro.", "error");
    return;
  }

  try {
    const q = query(collection(db, "partidos"), where("numeroRegistro", "==", numero), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      mostrarMensaje("mensaje", `No existe el partido N.º ${numero}.`, "error");
      return;
    }

    const d = snapshot.docs[0];
    const partido = { idFirestore: d.id, ...d.data() };

    if (!esAdmin() && partido.informadoPorUid !== usuarioActual.uid) {
      mostrarMensaje("mensaje", "Solo puede corregir partidos informados desde su cuenta.", "error");
      return;
    }

    cargarEdicion(partido);
  } catch (error) {
    console.error(error);
  }
}

function cargarEdicion(p) {
  partidoEnEdicion = p;
  el("modoEdicion").classList.remove("hidden");
  el("numeroEditando").textContent = p.numeroRegistro;
  el("numeroRegistroVista").value = p.numeroRegistro;
  el("fecha").value = p.fecha;

  el("jugadorA").value = p.jugadorAId;
  cargarCategoria("A");

  el("jugadorB").value = p.jugadorBId;
  cargarCategoria("B");

  el("set1A").value = p.set1A;
  el("set1B").value = p.set1B;
  el("set2A").value = p.set2A;
  el("set2B").value = p.set2B;

  el("tipoSet3").value = p.tipoSet3 || "normal";
  actualizarRangoSet3();

  el("set3A").value = p.set3A ?? "";
  el("set3B").value = p.set3B ?? "";

  if (esAdmin()) {
    el("btnAnularPartido").classList.remove("hidden");
    el("btnEliminarPartido").classList.remove("hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicion() {
  partidoEnEdicion = null;
  el("modoEdicion").classList.add("hidden");
  el("btnAnularPartido").classList.add("hidden");
  el("btnEliminarPartido").classList.add("hidden");
  el("numeroRegistroVista").value = "Se asignará automáticamente";
  limpiarFormularioPartido();
}


/* ============================================================
   RANKING Y EXCEL
============================================================ */

function calcularRanking() {
  const mapa = {};

  jugadores
    .filter(j => j.activo !== false)
    .forEach(j => {
      mapa[j.id] = {
        jugadorId: j.id,
        nombre: j.nombre,
        categoria: Number(j.categoria),
        puntos: 0,
        pj: 0,
        pg: 0,
        pp: 0,
        sets: 0,
        juegos: 0
      };
    });

  partidos
    .filter(p => p.estado !== "anulado")
    .forEach(p => {
      if (!mapa[p.jugadorAId]) {
        mapa[p.jugadorAId] = {
          jugadorId: p.jugadorAId,
          nombre: p.jugadorA,
          categoria: Number(p.categoriaA),
          puntos: 0,
          pj: 0,
          pg: 0,
          pp: 0,
          sets: 0,
          juegos: 0
        };
      }

      if (!mapa[p.jugadorBId]) {
        mapa[p.jugadorBId] = {
          jugadorId: p.jugadorBId,
          nombre: p.jugadorB,
          categoria: Number(p.categoriaB),
          puntos: 0,
          pj: 0,
          pg: 0,
          pp: 0,
          sets: 0,
          juegos: 0
        };
      }

      const a = mapa[p.jugadorAId];
      const b = mapa[p.jugadorBId];

      a.pj++;
      b.pj++;
      a.puntos += Number(p.puntosA || 0);
      b.puntos += Number(p.puntosB || 0);
      a.sets += Number(p.setsA || 0);
      b.sets += Number(p.setsB || 0);
      a.juegos += Number(p.juegosA || 0);
      b.juegos += Number(p.juegosB || 0);

      if (p.ganadorId === p.jugadorAId) {
        a.pg++;
        b.pp++;
      } else {
        b.pg++;
        a.pp++;
      }
    });

  return Object.values(mapa).sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.pg - a.pg ||
      b.sets - a.sets ||
      b.juegos - a.juegos ||
      a.nombre.localeCompare(b.nombre, "es")
  );
}

function renderRanking() {
  const tbody = el("tablaRanking");
  tbody.innerHTML = "";

  const ranking = calcularRanking();
  ranking.forEach((j, index) => {
    const tr = document.createElement("tr");
    const valores = [
      index + 1,
      j.nombre,
      j.categoria,
      j.puntos,
      j.pj,
      j.pg,
      j.pp,
      j.sets,
      j.juegos
    ];

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function descargarRankingExcel() {
  if (typeof XLSX === "undefined") {
    mostrarMensaje("mensaje", "No se pudo cargar el módulo de Excel.", "error");
    return;
  }

  const ranking = calcularRanking();
  const datos = ranking.map((j, index) => ({
    "Posición": index + 1,
    "Jugador": j.nombre,
    "Categoría": j.categoria,
    "Puntos": j.puntos,
    "Partidos jugados": j.pj,
    "Partidos ganados": j.pg,
    "Partidos perdidos": j.pp,
    "Sets ganados": j.sets,
    "Juegos ganados": j.juegos
  }));

  const hoja = XLSX.utils.json_to_sheet(datos);
  hoja["!cols"] = [
    { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "RANKING");
  XLSX.writeFile(libro, `Ranking_Club_Tenis_Lonquimay_${fechaActual()}.xlsx`);
}


/* ============================================================
   ADMINISTRACIÓN DE JUGADORES
============================================================ */

function alternarAdministracionJugadores() {
  if (!esAdmin()) return;

  const panel = el("contenidoAdminJugadores");
  const boton = el("btnMostrarAdminJugadores");
  const estaOculto = panel.classList.contains("hidden");

  if (estaOculto) {
    panel.classList.remove("hidden");
    boton.textContent = "Cerrar administración de jugadores";
  } else {
    panel.classList.add("hidden");
    boton.textContent = "Administrar jugadores";
  }
}

async function crearJugador(event) {
  event.preventDefault();
  ocultarMensaje("mensajeJugador");

  if (!esAdmin()) {
    mostrarMensaje("mensajeJugador", "Solo el administrador puede crear jugadores.", "error");
    return;
  }

  const nombre = el("nuevoNombre").value.trim();
  const categoria = Number(el("nuevaCategoria").value);

  if (!nombre) {
    mostrarMensaje("mensajeJugador", "Debe ingresar el nombre del jugador.", "error");
    return;
  }

  if (![1, 2, 3, 4, 5].includes(categoria)) {
    mostrarMensaje("mensajeJugador", "Debe seleccionar una categoría entre 1 y 5.", "error");
    return;
  }

  const nombreNormalizado = normalizarTexto(nombre);
  const jugadorDuplicado = jugadores.find(j => normalizarTexto(j.nombre || "") === nombreNormalizado);

  if (jugadorDuplicado) {
    mostrarMensaje("mensajeJugador", `El jugador "${jugadorDuplicado.nombre}" ya existe en la nómina.`, "error");
    return;
  }

  try {
    await addDoc(collection(db, "jugadores"), {
      nombre,
      categoria,
      activo: true,
      creadoPorUid: usuarioActual.uid,
      creadoPorEmail: usuarioActual.email || "",
      creadoEn: serverTimestamp()
    });

    el("formJugador").reset();
    mostrarMensaje("mensajeJugador", `Jugador ${nombre} creado correctamente en Categoría ${categoria}.`, "ok");
  } catch (error) {
    console.error("Error al crear jugador:", error);
    mostrarMensaje("mensajeJugador", "No fue posible crear el jugador.", "error");
  }
}

function renderJugadoresAdmin() {
  if (!esAdmin()) return;

  const tbody = el("tablaJugadores");
  tbody.innerHTML = "";

  jugadores.forEach(j => {
    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    const inputNombre = document.createElement("input");
    inputNombre.value = j.nombre;
    tdNombre.appendChild(inputNombre);

    const tdCategoria = document.createElement("td");
    const selectCategoria = document.createElement("select");
    for (let cat = 1; cat <= 5; cat++) {
      const opt = new Option(cat, cat);
      if (Number(j.categoria) === cat) opt.selected = true;
      selectCategoria.add(opt);
    }
    tdCategoria.appendChild(selectCategoria);

    const tdEstado = document.createElement("td");
    tdEstado.textContent = j.activo === false ? "Inactivo" : "Activo";

    const tdAcciones = document.createElement("td");
    tdAcciones.style.whiteSpace = "nowrap";

    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "Guardar";
    btnGuardar.className = "btn btn-primary btn-small";
    btnGuardar.onclick = async () => {
      await updateDoc(doc(db, "jugadores", j.id), {
        nombre: inputNombre.value.trim(),
        categoria: Number(selectCategoria.value),
        modificadoEn: serverTimestamp()
      });
      window.alert("Datos del jugador actualizados.");
    };

    const btnEstado = document.createElement("button");
    btnEstado.textContent = j.activo === false ? "Activar" : "Desactivar";
    btnEstado.className = j.activo === false ? "btn btn-success btn-small" : "btn btn-warning btn-small";
    btnEstado.style.marginLeft = "4px";
    btnEstado.onclick = async () => {
      await updateDoc(doc(db, "jugadores", j.id), { activo: j.activo === false });
    };

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.className = "btn btn-danger btn-small";
    btnEliminar.style.marginLeft = "4px";
    btnEliminar.onclick = () => iniciarEliminacionJugador(j);

    tdAcciones.append(btnGuardar, btnEstado, btnEliminar);
    tr.append(tdNombre, tdCategoria, tdEstado, tdAcciones);
    tbody.appendChild(tr);
  });
}

async function iniciarEliminacionJugador(jugador) {
  if (!esAdmin()) return;

  jugadorAEliminar = jugador;

  const partidosAsociados = partidos.filter(
    p => p.jugadorAId === jugador.id || p.jugadorBId === jugador.id
  );

  el("modalTituloEliminar").textContent = `Eliminar a: ${jugador.nombre}`;
  el("modalDetalleEliminar").textContent =
    `El jugador cuenta con ${partidosAsociados.length} partido(s) registrado(s). Seleccione qué desea hacer con su historial:`;

  el("modalEliminarJugador").classList.remove("hidden");
}

function cerrarModalEliminarJugador() {
  jugadorAEliminar = null;
  el("modalEliminarJugador").classList.add("hidden");
}

async function ejecutarEliminacionJugador() {
  if (!jugadorAEliminar || !esAdmin()) return;

  const jugador = jugadorAEliminar;
  const opcion = document.querySelector('input[name="opcionHistorial"]:checked')?.value || "conservar";

  try {
    const qA = query(collection(db, "partidos"), where("jugadorAId", "==", jugador.id));
    const qB = query(collection(db, "partidos"), where("jugadorBId", "==", jugador.id));
    const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);

    const batch = writeBatch(db);
    const partidosIds = new Set();
    const docsPartidos = [];

    [...snapA.docs, ...snapB.docs].forEach(docSnap => {
      if (!partidosIds.has(docSnap.id)) {
        partidosIds.add(docSnap.id);
        docsPartidos.push(docSnap);
      }
    });

    if (opcion === "eliminar") {
      docsPartidos.forEach(docSnap => {
        batch.delete(doc(db, "partidos", docSnap.id));
      });
    } else if (opcion === "anular") {
      docsPartidos.forEach(docSnap => {
        batch.update(doc(db, "partidos", docSnap.id), {
          estado: "anulado",
          modificadoEn: serverTimestamp(),
          modificadoPorUid: usuarioActual.uid,
          modificadoPorEmail: usuarioActual.email || ""
        });
      });
    }

    batch.delete(doc(db, "jugadores", jugador.id));

    const qUsuarios = query(collection(db, "usuarios"), where("jugadorId", "==", jugador.id));
    const snapUsuarios = await getDocs(qUsuarios);
    snapUsuarios.forEach(uDoc => {
      batch.update(doc(db, "usuarios", uDoc.id), {
        jugadorId: null,
        jugadorNombre: null
      });
    });

    await batch.commit();

    await addDoc(collection(db, "auditoria"), {
      accion: "ELIMINACIÓN DE JUGADOR",
      numeroRegistro: `Jugador: ${jugador.nombre}`,
      usuarioUid: usuarioActual.uid,
      usuarioEmail: usuarioActual.email || "",
      detalle: `Opción tomada con partidos (${docsPartidos.length}): ${opcion}`,
      fecha: serverTimestamp()
    });

    cerrarModalEliminarJugador();
    mostrarMensaje("mensajeJugador", `Jugador "${jugador.nombre}" eliminado con éxito.`, "ok");
  } catch (error) {
    console.error("Error eliminando jugador:", error);
    window.alert("Ocurrió un error al intentar eliminar el jugador.");
  }
}


/* ============================================================
   ADMINISTRACIÓN DE USUARIOS
============================================================ */

function escucharUsuarios() {
  if (!esAdmin()) return;
  if (unsubscribeUsuarios) unsubscribeUsuarios();

  unsubscribeUsuarios = onSnapshot(collection(db, "usuarios"), snapshot => {
    usuarios = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUsuariosAdmin();
  });
}

function renderUsuariosAdmin() {
  const tbody = el("tablaUsuarios");
  tbody.innerHTML = "";

  usuarios.forEach(u => {
    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.textContent = u.nombreGoogle || "";

    const tdEmail = document.createElement("td");
    tdEmail.textContent = u.email || "";

    const tdJugador = document.createElement("td");
    const selectJugador = document.createElement("select");
    selectJugador.add(new Option("Sin jugador", ""));

    jugadores.forEach(j => {
      const opt = new Option(j.nombre, j.id);
      if (j.id === u.jugadorId) opt.selected = true;
      selectJugador.add(opt);
    });
    tdJugador.appendChild(selectJugador);

    const tdRol = document.createElement("td");
    const selectRol = document.createElement("select");
    selectRol.add(new Option("Usuario", "usuario"));
    selectRol.add(new Option("Administrador", "admin"));
    selectRol.value = u.rol || "usuario";
    tdRol.appendChild(selectRol);

    const tdActivo = document.createElement("td");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = u.activo !== false;
    tdActivo.appendChild(check);

    const tdAcciones = document.createElement("td");
    tdAcciones.style.whiteSpace = "nowrap";

    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "Guardar";
    btnGuardar.className = "btn btn-primary btn-small";
    btnGuardar.onclick = async () => {
      const jug = jugadores.find(j => j.id === selectJugador.value);
      await updateDoc(doc(db, "usuarios", u.id), {
        jugadorId: selectJugador.value || null,
        jugadorNombre: jug ? jug.nombre : null,
        rol: selectRol.value,
        activo: check.checked,
        modificadoEn: serverTimestamp(),
        modificadoPorUid: usuarioActual.uid
      });
      window.alert("Perfil de usuario actualizado.");
    };

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.className = "btn btn-danger btn-small";
    btnEliminar.style.marginLeft = "4px";
    btnEliminar.onclick = async () => {
      if (u.id === usuarioActual.uid) {
        window.alert("No puedes eliminar tu propia cuenta de administrador.");
        return;
      }

      const confirmar = window.confirm(
        `¿Desea eliminar el perfil de ${u.email}? El usuario perderá el acceso a la aplicación.`
      );

      if (!confirmar) return;

      try {
        await deleteDoc(doc(db, "usuarios", u.id));
        window.alert("Perfil de usuario eliminado.");
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        window.alert("Ocurrió un error al intentar eliminar la cuenta.");
      }
    };

    tdAcciones.append(btnGuardar, btnEliminar);
    tr.append(tdNombre, tdEmail, tdJugador, tdRol, tdActivo, tdAcciones);
    tbody.appendChild(tr);
  });
}


/* ============================================================
   AUDITORÍA
============================================================ */

function escucharAuditoria() {
  if (!esAdmin()) return;
  if (unsubscribeAuditoria) unsubscribeAuditoria();

  const q = query(collection(db, "auditoria"), orderBy("fecha", "desc"), limit(100));

  unsubscribeAuditoria = onSnapshot(q, snapshot => {
    const tbody = el("tablaAuditoria");
    tbody.innerHTML = "";

    snapshot.docs.forEach(d => {
      const dato = d.data();
      const tr = document.createElement("tr");
      const fecha = dato.fecha?.toDate ? dato.fecha.toDate().toLocaleString("es-CL") : "";

      [fecha, dato.accion || "", dato.numeroRegistro || "", dato.usuarioEmail || ""].forEach(valor => {
        const td = document.createElement("td");
        td.textContent = valor;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  });
}

async function limpiarHistorialAuditoria() {
  if (!esAdmin()) return;

  const confirmar = window.confirm(
    "¿Está seguro de que desea ELIMINAR TODO el historial de auditoría? Esta acción no se puede deshacer."
  );

  if (!confirmar) return;

  try {
    const snapshot = await getDocs(collection(db, "auditoria"));
    
    if (snapshot.empty) {
      window.alert("El historial de auditoría ya está vacío.");
      return;
    }

    const promesasBorrado = snapshot.docs.map(docSnap => deleteDoc(doc(db, "auditoria", docSnap.id)));
    await Promise.all(promesasBorrado);

    window.alert("Historial de auditoría limpiado correctamente.");
  } catch (error) {
    console.error("Error al limpiar auditoría:", error);
    window.alert("No fue posible borrar el historial de auditoría.");
  }
}


/* ============================================================
   UTILIDADES Y LIMPIEZA
============================================================ */

function limpiarFormularioPartido() {
  el("fecha").value = fechaActual();
  el("jugadorA").value = "";
  el("jugadorB").value = "";
  el("categoriaA").value = "";
  el("categoriaB").value = "";
  limpiarMarcadores();
}

function limpiarMarcadores() {
  el("set1A").value = "";
  el("set1B").value = "";
  el("set2A").value = "";
  el("set2B").value = "";
  el("tipoSet3").value = "normal";
  actualizarRangoSet3();
  el("set3A").value = "";
  el("set3B").value = "";
}

function detenerListeners() {
  if (unsubscribeJugadores) { unsubscribeJugadores(); unsubscribeJugadores = null; }
  if (unsubscribePartidos) { unsubscribePartidos(); unsubscribePartidos = null; }
  if (unsubscribeUsuarios) { unsubscribeUsuarios(); unsubscribeUsuarios = null; }
  if (unsubscribeAuditoria) { unsubscribeAuditoria(); unsubscribeAuditoria = null; }
}

function numeroSelect(id) {
  const valor = el(id).value;
  return valor === "" ? null : Number(valor);
}

function fechaActual() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizarTexto(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function copiarDatosAuditoria(objeto) {
  const copia = {};
  Object.entries(objeto).forEach(([clave, valor]) => {
    if (
      valor === null ||
      typeof valor === "string" ||
      typeof valor === "number" ||
      typeof valor === "boolean"
    ) {
      copia[clave] = valor;
    }
  });
  return copia;
}

function mostrarMensaje(id, texto, tipo) {
  const caja = el(id);
  caja.textContent = texto;
  caja.className = `message ${tipo}`;
}

function ocultarMensaje(id) {
  const caja = el(id);
  caja.textContent = "";
  caja.className = "message hidden";
}
