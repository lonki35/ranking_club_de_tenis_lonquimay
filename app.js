import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  runTransaction,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* ============================================================
   1. CONFIGURACIÓN FIREBASE
============================================================ */

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD49Let7bMQiOI-qlMD2CqeBF8KBIAysEk",
  authDomain: "ranking-club-tenis-lonquimay.firebaseapp.com",
  projectId: "ranking-club-tenis-lonquimay",
  storageBucket: "ranking-club-tenis-lonquimay.firebasestorage.app",
  messagingSenderId: "146624104646",
  appId: "1:146624104646:web:24ad6f8f54dc8da62a2fc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


/* ============================================================
   2. ESTADO GENERAL
============================================================ */

let jugadores = [];

let partidos = [];

let partidoEnEdicionId = null;

let numeroRegistroEnEdicion = null;


/* ============================================================
   3. UTILIDAD DOM
============================================================ */

const el = id => document.getElementById(id);

const fecha = el("fecha");

const jugadorA = el("jugadorA");

const jugadorB = el("jugadorB");

const categoriaA = el("categoriaA");

const categoriaB = el("categoriaB");

const mensaje = el("mensaje");

const estadoConexion = el("estadoConexion");


/* ============================================================
   4. INICIO
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  fecha.value =
    new Date()
      .toISOString()
      .slice(0, 10);


  el("btnGuardarPartido")
    .addEventListener(
      "click",
      guardarPartido
    );


  el("btnLimpiar")
    .addEventListener(
      "click",
      () => limpiarFormulario(true)
    );


  el("btnBuscarRegistro")
    .addEventListener(
      "click",
      buscarRegistro
    );


  el("btnCancelarEdicion")
    .addEventListener(
      "click",
      cancelarEdicion
    );


  el("formJugador")
    .addEventListener(
      "submit",
      crearJugador
    );


  jugadorA.addEventListener(
    "change",
    () => cargarCategoria("A")
  );


  jugadorB.addEventListener(
    "change",
    () => cargarCategoria("B")
  );


  escucharJugadores();

  escucharPartidos();

});


/* ============================================================
   5. JUGADORES
============================================================ */

function escucharJugadores() {

  const q =
    query(
      collection(
        db,
        "jugadores"
      ),
      orderBy("nombre")
    );


  onSnapshot(

    q,

    snapshot => {

      jugadores =
        snapshot.docs.map(
          d => ({
            id: d.id,
            ...d.data()
          })
        );


      dibujarJugadores();

      poblarSelects();

      renderRanking();


      estadoConexion.textContent =
        "Conectado";


      estadoConexion.className =
        "badge badge-ok";

    },

    error => {

      console.error(error);


      estadoConexion.textContent =
        "Sin conexión";


      estadoConexion.className =
        "badge badge-warn";


      mostrarMensaje(
        "No se pudo leer la base de jugadores.",
        "error"
      );

    }

  );

}


/* ============================================================
   6. CREAR JUGADOR
============================================================ */

async function crearJugador(event) {

  event.preventDefault();


  const nombre =
    el("nuevoNombre")
      .value
      .trim();


  const categoria =
    Number(
      el("nuevaCategoria")
        .value
    );


  if (
    !nombre ||
    !categoria
  ) {

    mostrarMensaje(
      "Debe ingresar nombre y categoría.",
      "error"
    );

    return;

  }


  const duplicado =
    jugadores.some(
      j =>
        j.nombre
          .toLocaleLowerCase("es") ===
        nombre
          .toLocaleLowerCase("es")
    );


  if (duplicado) {

    mostrarMensaje(
      "Ya existe un jugador con ese nombre.",
      "error"
    );

    return;

  }


  try {

    await addDoc(
      collection(
        db,
        "jugadores"
      ),
      {
        nombre,
        categoria,
        creadoEn:
          serverTimestamp()
      }
    );


    el("formJugador")
      .reset();


    mostrarMensaje(
      `Jugador ${nombre} creado correctamente.`,
      "ok"
    );

  }

  catch (error) {

    console.error(error);


    mostrarMensaje(
      "No se pudo crear el jugador.",
      "error"
    );

  }

}


/* ============================================================
   7. ELIMINAR JUGADOR
============================================================ */

async function eliminarJugador(
  id,
  nombre
) {

  const confirmado =
    confirm(
      `¿Eliminar a ${nombre} del listado activo?\n\n` +
      "Sus partidos históricos se conservarán."
    );


  if (!confirmado) {

    return;

  }


  try {

    await deleteDoc(
      doc(
        db,
        "jugadores",
        id
      )
    );


    mostrarMensaje(
      `${nombre} fue eliminado del listado activo.`,
      "ok"
    );

  }

  catch (error) {

    console.error(error);


    mostrarMensaje(
      "No se pudo eliminar el jugador.",
      "error"
    );

  }

}


/* ============================================================
   8. DIBUJAR JUGADORES
============================================================ */

function dibujarJugadores() {

  const tbody =
    el("tablaJugadores");


  tbody.innerHTML = "";


  jugadores.forEach(
    jugador => {

      const tr =
        document.createElement(
          "tr"
        );


      const tdNombre =
        document.createElement(
          "td"
        );


      tdNombre.textContent =
        jugador.nombre;


      const tdCategoria =
        document.createElement(
          "td"
        );


      tdCategoria.textContent =
        jugador.categoria;


      const tdAccion =
        document.createElement(
          "td"
        );


      const boton =
        document.createElement(
          "button"
        );


      boton.className =
        "btn btn-danger btn-small";


      boton.textContent =
        "Eliminar";


      boton.addEventListener(
        "click",
        () =>
          eliminarJugador(
            jugador.id,
            jugador.nombre
          )
      );


      tdAccion.appendChild(
        boton
      );


      tr.append(
        tdNombre,
        tdCategoria,
        tdAccion
      );


      tbody.appendChild(
        tr
      );

    }

  );

}


/* ============================================================
   9. POBLAR SELECTS DE JUGADORES
============================================================ */

function poblarSelects() {

  const seleccionadoA =
    jugadorA.value;


  const seleccionadoB =
    jugadorB.value;


  jugadorA.innerHTML =
    '<option value="">Jugador A</option>';


  jugadorB.innerHTML =
    '<option value="">Jugador B</option>';


  jugadores.forEach(
    jugador => {

      const optionA =
        new Option(
          jugador.nombre,
          jugador.id
        );


      const optionB =
        new Option(
          jugador.nombre,
          jugador.id
        );


      optionA.dataset.nombre =
        jugador.nombre;


      optionA.dataset.categoria =
        jugador.categoria;


      optionB.dataset.nombre =
        jugador.nombre;


      optionB.dataset.categoria =
        jugador.categoria;


      jugadorA.add(
        optionA
      );


      jugadorB.add(
        optionB
      );

    }

  );


  if (
    [...jugadorA.options]
      .some(
        option =>
          option.value ===
          seleccionadoA
      )
  ) {

    jugadorA.value =
      seleccionadoA;

  }


  if (
    [...jugadorB.options]
      .some(
        option =>
          option.value ===
          seleccionadoB
      )
  ) {

    jugadorB.value =
      seleccionadoB;

  }


  cargarCategoria("A");

  cargarCategoria("B");

}


/* ============================================================
   10. CARGAR CATEGORÍA AUTOMÁTICA
============================================================ */

function cargarCategoria(lado) {

  const select =
    lado === "A"
      ? jugadorA
      : jugadorB;


  const categoria =
    lado === "A"
      ? categoriaA
      : categoriaB;


  const option =
    select
      .selectedOptions[0];


  categoria.value =
    option
      ?.dataset
      ?.categoria || "";

}


/* ============================================================
   11. ESCUCHAR PARTIDOS
============================================================ */

function escucharPartidos() {

  const q =
    query(
      collection(
        db,
        "partidos"
      ),
      orderBy(
        "numeroRegistro",
        "desc"
      )
    );


  onSnapshot(

    q,

    snapshot => {

      partidos =
        snapshot.docs.map(
          d => ({
            idFirestore:
              d.id,
            ...d.data()
          })
        );


      dibujarPartidos();

      renderRanking();

    },

    error => {

      console.error(error);


      mostrarMensaje(
        "No se pudo leer el historial de partidos.",
        "error"
      );

    }

  );

}


/* ============================================================
   12. GUARDAR NUEVO O ACTUALIZAR EXISTENTE
============================================================ */

async function guardarPartido() {

  ocultarMensaje();


  const datos =
    obtenerFormulario();


  const error =
    validarPartido(
      datos
    );


  if (error) {

    mostrarMensaje(
      error,
      "error"
    );

    return;

  }


  let calculo;


  try {

    calculo =
      calcularResultado(
        datos
      );

  }

  catch (e) {

    mostrarMensaje(
      e.message,
      "error"
    );

    return;

  }


  const boton =
    el("btnGuardarPartido");


  boton.disabled =
    true;


  try {

    /* =====================================================
       ACTUALIZAR PARTIDO EXISTENTE
    ===================================================== */

    if (
      partidoEnEdicionId
    ) {

      boton.textContent =
        "Actualizando...";


      await updateDoc(

        doc(
          db,
          "partidos",
          partidoEnEdicionId
        ),

        {

          ...datos,

          ...calculo,

          modificadoEn:
            serverTimestamp()

        }

      );


      mostrarMensaje(
        `Registro N.º ${numeroRegistroEnEdicion} actualizado correctamente.`,
        "ok"
      );


      cancelarEdicion(
        false
      );


      limpiarFormulario(
        false
      );

    }


    /* =====================================================
       NUEVO PARTIDO
    ===================================================== */

    else {

      boton.textContent =
        "Guardando...";


      const numeroRegistro =
        await obtenerSiguienteCorrelativo();


      await addDoc(

        collection(
          db,
          "partidos"
        ),

        {

          numeroRegistro,

          ...datos,

          ...calculo,

          creadoEn:
            serverTimestamp(),

          modificadoEn:
            serverTimestamp()

        }

      );


      el(
        "numeroRegistroVista"
      ).value =
        numeroRegistro;


      mostrarMensaje(

        `Partido guardado correctamente. ` +

        `N.º de registro: ${numeroRegistro}. ` +

        `Ganador: ${calculo.ganador} ` +

        `(${calculo.puntosGanador} puntos).`,

        "ok"

      );


      limpiarFormulario(
        false,
        true
      );

    }

  }

  catch (errorGuardar) {

    console.error(
      errorGuardar
    );


    mostrarMensaje(
      "No se pudo guardar el partido.",
      "error"
    );

  }

  finally {

    boton.disabled =
      false;


    boton.textContent =
      partidoEnEdicionId
        ? "Guardar corrección"
        : "Guardar partido";

  }

}


/* ============================================================
   13. CORRELATIVO SEGURO EN FIRESTORE
============================================================ */

async function obtenerSiguienteCorrelativo() {

  const contadorRef =
    doc(
      db,
      "sistema",
      "correlativos"
    );


  const siguiente =
    await runTransaction(

      db,

      async transaction => {

        const snapshot =
          await transaction.get(
            contadorRef
          );


        let actual = 0;


        if (
          snapshot.exists()
        ) {

          actual =
            Number(
              snapshot
                .data()
                .ultimoPartido || 0
            );

        }


        const nuevo =
          actual + 1;


        transaction.set(

          contadorRef,

          {

            ultimoPartido:
              nuevo,

            actualizadoEn:
              serverTimestamp()

          },

          {
            merge: true
          }

        );


        return nuevo;

      }

    );


  return siguiente;

}


/* ============================================================
   14. BUSCAR PARTIDO POR N.º DE REGISTRO
============================================================ */

async function buscarRegistro() {

  ocultarMensaje();


  const numero =
    Number(
      el("buscarRegistro")
        .value
    );


  if (
    !Number.isInteger(numero) ||
    numero < 1
  ) {

    mostrarMensaje(
      "Ingrese un N.º de registro válido.",
      "error"
    );

    return;

  }


  try {

    const q =
      query(

        collection(
          db,
          "partidos"
        ),

        where(
          "numeroRegistro",
          "==",
          numero
        ),

        limit(1)

      );


    const snapshot =
      await getDocs(
        q
      );


    if (
      snapshot.empty
    ) {

      el(
        "resultadoBusqueda"
      ).className =
        "lookup-result hidden";


      mostrarMensaje(
        `No existe el registro N.º ${numero}.`,
        "error"
      );


      return;

    }


    const documento =
      snapshot.docs[0];


    const partido = {

      idFirestore:
        documento.id,

      ...documento.data()

    };


    mostrarResumenBusqueda(
      partido
    );


    cargarPartidoParaEdicion(
      partido
    );

  }

  catch (error) {

    console.error(error);


    mostrarMensaje(
      "No se pudo buscar el registro.",
      "error"
    );

  }

}


/* ============================================================
   15. MOSTRAR RESUMEN DE BÚSQUEDA
============================================================ */

function mostrarResumenBusqueda(
  partido
) {

  const div =
    el(
      "resultadoBusqueda"
    );


  div.innerHTML = `

    <strong>
      Registro N.º
      ${partido.numeroRegistro}
    </strong>

    <br>

    ${partido.fecha}
    ·
    ${partido.jugadorA}
    (${partido.categoriaA})

    vs

    ${partido.jugadorB}
    (${partido.categoriaB})

    <br>

    Resultado:
    ${construirMarcador(partido)}

    ·

    Ganador:
    ${partido.ganador}

  `;


  div.className =
    "lookup-result";

}


/* ============================================================
   16. CARGAR PARTIDO PARA EDICIÓN
============================================================ */

function cargarPartidoParaEdicion(
  partido
) {

  partidoEnEdicionId =
    partido.idFirestore;


  numeroRegistroEnEdicion =
    partido.numeroRegistro;


  el(
    "modoEdicion"
  ).className =
    "edit-banner";


  el(
    "numeroEditando"
  ).textContent =
    partido.numeroRegistro;


  el(
    "numeroRegistroVista"
  ).value =
    partido.numeroRegistro;


  el(
    "btnGuardarPartido"
  ).textContent =
    "Guardar corrección";


  fecha.value =
    partido.fecha;


  asegurarJugadorEnSelect(

    jugadorA,

    partido.jugadorAId,

    partido.jugadorA,

    partido.categoriaA

  );


  asegurarJugadorEnSelect(

    jugadorB,

    partido.jugadorBId,

    partido.jugadorB,

    partido.categoriaB

  );


  jugadorA.value =
    partido.jugadorAId || "";


  jugadorB.value =
    partido.jugadorBId || "";


  categoriaA.value =
    partido.categoriaA;


  categoriaB.value =
    partido.categoriaB;


  el("set1A").value =
    partido.set1A;


  el("set1B").value =
    partido.set1B;


  el("tipoSet1").value =
    partido.tipoSet1;


  el("set2A").value =
    partido.set2A;


  el("set2B").value =
    partido.set2B;


  el("tipoSet2").value =
    partido.tipoSet2;


  el("set3A").value =
    partido.set3A ?? "";


  el("set3B").value =
    partido.set3B ?? "";


  el("tipoSet3").value =
    partido.tipoSet3 || "";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ============================================================
   17. ASEGURAR JUGADOR HISTÓRICO EN SELECT
============================================================ */

function asegurarJugadorEnSelect(
  select,
  id,
  nombre,
  categoria
) {

  if (!id) {

    return;

  }


  const existe =
    [...select.options]
      .some(
        option =>
          option.value === id
      );


  if (!existe) {

    const option =
      new Option(
        `${nombre} (histórico)`,
        id
      );


    option.dataset.nombre =
      nombre;


    option.dataset.categoria =
      categoria;


    select.add(
      option
    );

  }

}


/* ============================================================
   18. CANCELAR EDICIÓN
============================================================ */

function cancelarEdicion(
  limpiar = true
) {

  partidoEnEdicionId =
    null;


  numeroRegistroEnEdicion =
    null;


  el(
    "modoEdicion"
  ).className =
    "edit-banner hidden";


  el(
    "numeroEditando"
  ).textContent =
    "";


  el(
    "numeroRegistroVista"
  ).value =
    "Se asigna al guardar";


  el(
    "btnGuardarPartido"
  ).textContent =
    "Guardar partido";


  el(
    "buscarRegistro"
  ).value =
    "";


  el(
    "resultadoBusqueda"
  ).className =
    "lookup-result hidden";


  if (limpiar) {

    limpiarFormulario(
      true
    );

  }

}


/* ============================================================
   19. OBTENER DATOS DEL FORMULARIO
============================================================ */

function obtenerFormulario() {

  const optionA =
    jugadorA
      .selectedOptions[0];


  const optionB =
    jugadorB
      .selectedOptions[0];


  return {

    fecha:
      fecha.value,


    jugadorAId:
      jugadorA.value,


    jugadorA:
      optionA
        ?.dataset
        ?.nombre || "",


    categoriaA:
      Number(
        categoriaA.value
      ),


    jugadorBId:
      jugadorB.value,


    jugadorB:
      optionB
        ?.dataset
        ?.nombre || "",


    categoriaB:
      Number(
        categoriaB.value
      ),


    set1A:
      numeroObligatorio(
        "set1A"
      ),


    set1B:
      numeroObligatorio(
        "set1B"
      ),


    tipoSet1:
      el(
        "tipoSet1"
      ).value,


    set2A:
      numeroObligatorio(
        "set2A"
      ),


    set2B:
      numeroObligatorio(
        "set2B"
      ),


    tipoSet2:
      el(
        "tipoSet2"
      ).value,


    set3A:
      numeroOpcional(
        "set3A"
      ),


    set3B:
      numeroOpcional(
        "set3B"
      ),


    tipoSet3:
      el(
        "tipoSet3"
      ).value

  };

}


/* ============================================================
   20. NÚMERO OBLIGATORIO
============================================================ */

function numeroObligatorio(
  id
) {

  const valor =
    el(id).value;


  return valor === ""
    ? null
    : Number(valor);

}


/* ============================================================
   21. NÚMERO OPCIONAL
============================================================ */

function numeroOpcional(
  id
) {

  const valor =
    el(id).value;


  return valor === ""
    ? null
    : Number(valor);

}


/* ============================================================
   22. VALIDACIÓN DEL PARTIDO
============================================================ */

function validarPartido(
  datos
) {

  if (!datos.fecha) {

    return "Debe indicar la fecha.";

  }


  if (
    !datos.jugadorAId ||
    !datos.jugadorBId
  ) {

    return "Debe seleccionar ambos jugadores.";

  }


  if (
    datos.jugadorAId ===
    datos.jugadorBId
  ) {

    return "Un jugador no puede jugar contra sí mismo.";

  }


  if (
    [
      datos.set1A,
      datos.set1B,
      datos.set2A,
      datos.set2B
    ].some(
      valor =>
        valor === null ||
        valor < 0
    )
  ) {

    return "Set 1 y Set 2 deben estar completos.";

  }


  if (
    (
      datos.set3A === null
    )
    !==
    (
      datos.set3B === null
    )
  ) {

    return "Si se usa Set 3 deben ingresarse ambos resultados.";

  }


  if (
    datos.set3A !== null &&
    !datos.tipoSet3
  ) {

    return "Debe indicar el tipo de Set 3.";

  }


  return "";

}


/* ============================================================
   23. CALCULAR RESULTADO
============================================================ */

function calcularResultado(
  datos
) {

  let setsA = 0;

  let setsB = 0;

  let juegosA = 0;

  let juegosB = 0;


  procesarSet(
    datos.set1A,
    datos.set1B,
    datos.tipoSet1
  );


  procesarSet(
    datos.set2A,
    datos.set2B,
    datos.tipoSet2
  );


  if (
    datos.set3A !== null &&
    datos.set3B !== null
  ) {

    procesarSet(
      datos.set3A,
      datos.set3B,
      datos.tipoSet3
    );

  }


  function procesarSet(
    puntosA,
    puntosB,
    tipo
  ) {

    if (
      puntosA ===
      puntosB
    ) {

      throw new Error(
        "Un set no puede terminar empatado."
      );

    }


    if (
      puntosA >
      puntosB
    ) {

      setsA++;

    }


    if (
      puntosB >
      puntosA
    ) {

      setsB++;

    }


    /*
      Super tie-break:
      cuenta como set,
      pero no suma juegos.
    */

    if (
      tipo !==
      "super"
    ) {

      juegosA +=
        puntosA;


      juegosB +=
        puntosB;

    }

  }


  if (
    setsA === setsB
  ) {

    throw new Error(
      "El marcador no permite determinar un ganador."
    );

  }


  const ganaA =
    setsA >
    setsB;


  const ganador =
    ganaA
      ? datos.jugadorA
      : datos.jugadorB;


  const perdedor =
    ganaA
      ? datos.jugadorB
      : datos.jugadorA;


  const categoriaGanador =
    ganaA
      ? datos.categoriaA
      : datos.categoriaB;


  const categoriaPerdedor =
    ganaA
      ? datos.categoriaB
      : datos.categoriaA;


  let puntosGanador;


  /*
    Categoría 1 = mayor nivel.

    Ejemplo:
    Cat. 4 vence Cat. 2:
    venció a categoría superior = 10 pts.

    Cat. 2 vence Cat. 4:
    venció a categoría inferior = 5 pts.
  */


  if (
    categoriaGanador >
    categoriaPerdedor
  ) {

    puntosGanador = 10;

  }


  else if (
    categoriaGanador ===
    categoriaPerdedor
  ) {

    puntosGanador = 7;

  }


  else {

    puntosGanador = 5;

  }


  return {

    setsA,

    setsB,

    juegosA,

    juegosB,

    ganador,

    perdedor,

    puntosGanador,

    puntosA:
      ganaA
        ? puntosGanador
        : 1,

    puntosB:
      ganaA
        ? 1
        : puntosGanador

  };

}


/* ============================================================
   24. CALCULAR Y MOSTRAR RANKING
============================================================ */

function renderRanking() {

  const ranking = {};


  /*
    Incorporamos jugadores activos.
  */

  jugadores.forEach(
    jugador => {

      ranking[
        jugador.nombre
      ] =
        crearEstadistica(
          jugador.nombre,
          jugador.categoria
        );

    }

  );


  /*
    Incorporamos historial.

    Aunque un jugador haya sido eliminado,
    sigue apareciendo si tiene partidos.
  */

  partidos.forEach(
    partido => {

      if (
        !ranking[
          partido.jugadorA
        ]
      ) {

        ranking[
          partido.jugadorA
        ] =
          crearEstadistica(
            partido.jugadorA,
            partido.categoriaA
          );

      }


      if (
        !ranking[
          partido.jugadorB
        ]
      ) {

        ranking[
          partido.jugadorB
        ] =
          crearEstadistica(
            partido.jugadorB,
            partido.categoriaB
          );

      }


      const a =
        ranking[
          partido.jugadorA
        ];


      const b =
        ranking[
          partido.jugadorB
        ];


      a.pj++;

      b.pj++;


      a.puntos +=
        Number(
          partido.puntosA || 0
        );


      b.puntos +=
        Number(
          partido.puntosB || 0
        );


      a.sets +=
        Number(
          partido.setsA || 0
        );


      b.sets +=
        Number(
          partido.setsB || 0
        );


      a.juegos +=
        Number(
          partido.juegosA || 0
        );


      b.juegos +=
        Number(
          partido.juegosB || 0
        );


      if (
        partido.ganador ===
        partido.jugadorA
      ) {

        a.pg++;

        b.pp++;

      }

      else {

        b.pg++;

        a.pp++;

      }


      /*
        Mostrar categoría histórica
        más reciente encontrada.
      */

      a.categoria =
        partido.categoriaA;


      b.categoria =
        partido.categoriaB;

    }

  );


  const lista =
    Object
      .values(
        ranking
      )
      .sort(
        (a, b) =>

          b.puntos -
          a.puntos

          ||

          b.pg -
          a.pg

          ||

          b.sets -
          a.sets

          ||

          b.juegos -
          a.juegos

          ||

          a.nombre.localeCompare(
            b.nombre,
            "es"
          )
      );


  const tbody =
    el(
      "tablaRanking"
    );


  tbody.innerHTML =
    "";


  lista.forEach(
    (
      jugador,
      indice
    ) => {

      const tr =
        document.createElement(
          "tr"
        );


      const valores = [

        indice + 1,

        jugador.nombre,

        jugador.categoria,

        jugador.puntos,

        jugador.pj,

        jugador.pg,

        jugador.pp,

        jugador.sets,

        jugador.juegos

      ];


      valores.forEach(
        valor => {

          const td =
            document.createElement(
              "td"
            );


          td.textContent =
            valor;


          tr.appendChild(
            td
          );

        }

      );


      tbody.appendChild(
        tr
      );

    }

  );

}


/* ============================================================
   25. CREAR ESTRUCTURA ESTADÍSTICA
============================================================ */

function crearEstadistica(
  nombre,
  categoria
) {

  return {

    nombre,

    categoria,

    puntos: 0,

    pj: 0,

    pg: 0,

    pp: 0,

    sets: 0,

    juegos: 0

  };

}


/* ============================================================
   26. MOSTRAR REGISTRO MAESTRO
============================================================ */

function dibujarPartidos() {

  const tbody =
    el(
      "tablaPartidos"
    );


  tbody.innerHTML =
    "";


  partidos.forEach(
    partido => {

      const tr =
        document.createElement(
          "tr"
        );


      const valores = [

        partido.numeroRegistro ?? "",

        partido.fecha || "",

        partido.jugadorA || "",

        partido.categoriaA || "",

        construirMarcador(
          partido
        ),

        partido.jugadorB || "",

        partido.categoriaB || "",

        partido.ganador || "",

        partido.puntosGanador || "",

        formatearTimestamp(
          partido.modificadoEn
        )

      ];


      valores.forEach(
        valor => {

          const td =
            document.createElement(
              "td"
            );


          td.textContent =
            valor;


          tr.appendChild(
            td
          );

        }

      );


      tbody.appendChild(
        tr
      );

    }

  );

}


/* ============================================================
   27. CONSTRUIR MARCADOR
============================================================ */

function construirMarcador(
  partido
) {

  let marcador =

    `${partido.set1A}-${partido.set1B}` +

    " / " +

    `${partido.set2A}-${partido.set2B}`;


  if (
    partido.set3A !== null &&
    partido.set3A !== undefined
  ) {

    marcador +=

      " / " +

      `${partido.set3A}-${partido.set3B}`;


    if (
      partido.tipoSet3 ===
      "super"
    ) {

      marcador +=
        " STB";

    }

  }


  return marcador;

}


/* ============================================================
   28. FORMATEAR FECHA/HORA FIRESTORE
============================================================ */

function formatearTimestamp(
  timestamp
) {

  if (
    !timestamp ||
    !timestamp.toDate
  ) {

    return "";

  }


  return timestamp
    .toDate()
    .toLocaleString(
      "es-CL",
      {
        dateStyle:
          "short",

        timeStyle:
          "short"
      }
    );

}


/* ============================================================
   29. LIMPIAR FORMULARIO
============================================================ */

function limpiarFormulario(
  limpiarJugadores,
  conservarNumeroVista = false
) {

  [

    "set1A",

    "set1B",

    "set2A",

    "set2B",

    "set3A",

    "set3B"

  ].forEach(
    id => {

      el(id).value =
        "";

    }

  );


  el(
    "tipoSet1"
  ).value =
    "normal";


  el(
    "tipoSet2"
  ).value =
    "normal";


  el(
    "tipoSet3"
  ).value =
    "";


  if (
    limpiarJugadores
  ) {

    jugadorA.value =
      "";


    jugadorB.value =
      "";


    categoriaA.value =
      "";


    categoriaB.value =
      "";

  }


  if (
    !conservarNumeroVista &&
    !partidoEnEdicionId
  ) {

    el(
      "numeroRegistroVista"
    ).value =
      "Se asigna al guardar";

  }

}


/* ============================================================
   30. MENSAJES
============================================================ */

function mostrarMensaje(
  texto,
  tipo
) {

  mensaje.textContent =
    texto;


  mensaje.className =
    `message ${tipo}`;

}


function ocultarMensaje() {

  mensaje.className =
    "message hidden";

}
