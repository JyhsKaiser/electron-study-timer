// ==========================================
// 1. REFERENCIAS AL DOM Y VARIABLES DE ESTADO
// ==========================================

// Vistas principales
const vistaDashboard = document.getElementById('vista-dashboard');
const vistaEditor = document.getElementById('vista-editor');
const vistaWidget = document.getElementById('vista-widget');

// Elementos del Dashboard
const contenedorRutinas = document.getElementById('contenedor-rutinas');
const btnNuevaLista = document.getElementById('btn-nueva-lista');

// Elementos del Editor
const inputNombreLista = document.getElementById('input-nombre-lista');
const inputNombreAct = document.getElementById('input-nombre-act');
const inputMinutosAct = document.getElementById('input-minutos-act');
const inputSegundosAct = document.getElementById('input-segundos-act');
const btnAgregarAct = document.getElementById('btn-agregar-act');
const listaDinamicaEditor = document.getElementById('lista-actividades-dinamica');
const btnCancelarLista = document.getElementById('btn-cancelar-lista');
const btnGuardarLista = document.getElementById('btn-guardar-lista');

// Elementos del Widget
const widgetProgreso = document.getElementById('widget-progreso');
const widgetTerminado = document.getElementById('widget-terminado');
const displayActividad = document.getElementById('actividad-actual');
const displayTiempo = document.getElementById('tiempo-restante');
const btnPausar = document.getElementById('btn-pausar');
const btnSaltar = document.getElementById('btn-saltar');
const btnDetener = document.getElementById('btn-detener');
const btnVolverMenu = document.getElementById('btn-volver-menu');

// Audio
const sonidoAlerta = new Audio('../assets/alerta.mp3');

// Estado Global
let rutinasGuardadas = []; // Todas las rutinas de localStorage
let rutinaEnEdicion = null; // Objeto temporal para el CRUD
let rutinaActiva = null; // La rutina que se está reproduciendo

// Estado del Temporizador
let indiceActividad = 0;
let tiempoRestante = 0;
let intervaloTimer = null;
let estaPausado = false;

// ==========================================
// 2. GESTIÓN DE DATOS (LOCALSTORAGE)
// ==========================================

function cargarDatos() {
    const datos = localStorage.getItem('misRutinas');
    if (datos) {
        rutinasGuardadas = JSON.parse(datos);
    } else {
        // Datos de ejemplo para la primera vez que abres la app
        rutinasGuardadas = [
            {
                id: Date.now(),
                nombreLista: "Inglés Intensivo",
                actividades: [
                    { nombre: "Vocabulary", minutos: 15 },
                    { nombre: "Listening", minutos: 20 },
                    { nombre: "Speaking", minutos: 15 }
                ]
            }
        ];
        guardarDatos();
    }
}

function guardarDatos() {
    localStorage.setItem('misRutinas', JSON.stringify(rutinasGuardadas));
}

// ==========================================
// 3. NAVEGACIÓN Y DASHBOARD
// ==========================================

function mostrarVista(vista) {
    vistaDashboard.style.display = 'none';
    vistaEditor.style.display = 'none';
    vistaWidget.style.display = 'none';
    vista.style.display = 'block';

    // Le decimos al backend si debe hacerse widget o no
    const esWidget = (vista === vistaWidget);
    window.electronAPI.setWidgetMode(esWidget);
}

function renderizarDashboard() {
    contenedorRutinas.innerHTML = ''; // Limpiar grid

    rutinasGuardadas.forEach(rutina => {
        // Calcular tiempo total
        const totalSegundos = rutina.actividades.reduce((total, act) => total + (act.minutos * 60) + (act.segundos || 0), 0);
        const m = Math.floor(totalSegundos / 60);
        const s = totalSegundos % 60;

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-rutina';
        tarjeta.innerHTML = `
      <h3>${rutina.nombreLista}</h3>
      <p>${rutina.actividades.length} actividades • ${m}m ${s}s totales</p>
      <div class="tarjeta-acciones">
        <button class="btn-exito" onclick="iniciarRutina(${rutina.id})">▶ Iniciar</button>
        <button class="btn-secundario" onclick="abrirEditor(${rutina.id})">✏ Editar</button>
        <button class="btn-peligro" onclick="eliminarRutina(${rutina.id})">🗑</button>
      </div>
    `;
        contenedorRutinas.appendChild(tarjeta);
    });
}

// ==========================================
// 4. LÓGICA DEL EDITOR (CRUD DE LISTAS)
// ==========================================

function abrirEditor(idRutina = null) {
    if (idRutina) {
        // Modo Edición (Clonamos para no afectar el original hasta guardar)
        const rutinaOriginal = rutinasGuardadas.find(r => r.id === idRutina);
        rutinaEnEdicion = JSON.parse(JSON.stringify(rutinaOriginal));
    } else {
        // Modo Creación
        rutinaEnEdicion = { id: Date.now(), nombreLista: "", actividades: [] };
    }

    inputNombreLista.value = rutinaEnEdicion.nombreLista;
    renderizarActividadesEditor();
    mostrarVista(vistaEditor);
}

// function renderizarActividadesEditor() {
//     listaDinamicaEditor.innerHTML = '';
//     rutinaEnEdicion.actividades.forEach((act, index) => {
//         const li = document.createElement('li');
//         li.innerHTML = `
//       <span>${act.nombre} (${act.minutos}m ${seg}s)</span>
//       <button class="btn-peligro" onclick="eliminarActividadEditor(${index})">X</button>
//     `;
//         listaDinamicaEditor.appendChild(li);
//     });
// }
function renderizarActividadesEditor() {
    listaDinamicaEditor.innerHTML = '';
    rutinaEnEdicion.actividades.forEach((act, index) => {
        const li = document.createElement('li');
        const seg = act.segundos || 0; // Previene errores con datos viejos

        li.innerHTML = `
      <span>${act.nombre} (${act.minutos}m ${seg}s)</span>
      <button class="btn-peligro" onclick="eliminarActividadEditor(${index})">X</button>
    `;

        // ¡Esta es la línea clave que hace que aparezca en la lista!
        listaDinamicaEditor.appendChild(li);
    });
}

window.eliminarActividadEditor = function (index) {
    rutinaEnEdicion.actividades.splice(index, 1);
    renderizarActividadesEditor();
};

btnAgregarAct.addEventListener('click', () => {
    const nombre = inputNombreAct.value.trim();
    const minutos = parseInt(inputMinutosAct.value) || 0;
    const segundos = parseInt(inputSegundosAct.value) || 0;

    // Validamos que tenga nombre, y que el tiempo sea mayor a 0 y los segundos correctos
    if (nombre && (minutos > 0 || segundos > 0) && segundos >= 0 && segundos < 60 && minutos >= 0) {
        rutinaEnEdicion.actividades.push({ nombre, minutos, segundos });

        // Limpiamos los inputs
        inputNombreAct.value = '';
        inputMinutosAct.value = '';
        inputSegundosAct.value = '';

        renderizarActividadesEditor();
    } else {
        alert('Ingresa un nombre y un tiempo válido (ej. Segundos entre 0 y 59).');
    }
});

btnGuardarLista.addEventListener('click', () => {
    const nombreLista = inputNombreLista.value.trim();
    if (!nombreLista || rutinaEnEdicion.actividades.length === 0) {
        alert("Dale un nombre a la rutina y agrega al menos una actividad.");
        return;
    }

    rutinaEnEdicion.nombreLista = nombreLista;

    // Si existe la actualizamos, si no, la agregamos
    const index = rutinasGuardadas.findIndex(r => r.id === rutinaEnEdicion.id);
    if (index !== -1) {
        rutinasGuardadas[index] = rutinaEnEdicion;
    } else {
        rutinasGuardadas.push(rutinaEnEdicion);
    }

    guardarDatos();
    renderizarDashboard();
    mostrarVista(vistaDashboard);
});

btnCancelarLista.addEventListener('click', () => {
    mostrarVista(vistaDashboard);
});

window.eliminarRutina = function (id) {
    if (confirm("¿Seguro que deseas eliminar esta rutina?")) {
        rutinasGuardadas = rutinasGuardadas.filter(r => r.id !== id);
        guardarDatos();
        renderizarDashboard();
    }
};

// ==========================================
// 5. MOTOR DEL TEMPORIZADOR (WIDGET)
// ==========================================

window.iniciarRutina = function (id) {
    const rutina = rutinasGuardadas.find(r => r.id === id);
    if (rutina.actividades.length === 0) return;

    rutinaActiva = rutina;
    indiceActividad = 0;

    // Preparamos la UI del widget
    widgetProgreso.style.display = 'block';
    widgetTerminado.style.display = 'none';

    mostrarVista(vistaWidget);
    cargarActividad(indiceActividad);
};

function cargarActividad(indice) {
    if (indice >= rutinaActiva.actividades.length) {
        finalizarRutina();
        return;
    }


    const actividad = rutinaActiva.actividades[indice];
    displayActividad.innerText = actividad.nombre;
    tiempoRestante = (actividad.minutos * 60) + (actividad.segundos || 0);

    estaPausado = false;
    btnPausar.innerText = "Pausar";

    // === NUEVA LÓGICA UX ===
    // Si el índice actual es igual al total de actividades menos 1 (es decir, la última), deshabilitamos el botón.
    btnSaltar.disabled = (indice === rutinaActiva.actividades.length - 1);
    // ========================

    actualizarReloj();
    clearInterval(intervaloTimer);
    intervaloTimer = setInterval(tick, 1000);
}

function tick() {
    tiempoRestante--;
    actualizarReloj();

    if (tiempoRestante <= 0) {
        clearInterval(intervaloTimer);
        notificarCambio();
        indiceActividad++;
        cargarActividad(indiceActividad);
    }
}

function actualizarReloj() {
    const min = Math.floor(tiempoRestante / 60);
    const seg = tiempoRestante % 60;
    displayTiempo.innerText = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

function notificarCambio() {
    sonidoAlerta.play().catch(e => console.log('Error de audio:', e));
    new Notification("¡Tiempo terminado!", { body: "Pasando a la siguiente actividad." });
}

function finalizarRutina() {
    clearInterval(intervaloTimer);
    // Ocultamos el progreso y mostramos el mensaje de éxito manteniendo el widget
    widgetProgreso.style.display = 'none';
    widgetTerminado.style.display = 'block';
}

// Controles del Widget
btnPausar.addEventListener('click', () => {
    if (estaPausado) {
        intervaloTimer = setInterval(tick, 1000);
        btnPausar.innerText = "Pausar";
    } else {
        clearInterval(intervaloTimer);
        btnPausar.innerText = "Reanudar";
    }
    estaPausado = !estaPausado;
});

btnSaltar.addEventListener('click', () => {
    clearInterval(intervaloTimer);
    indiceActividad++;
    cargarActividad(indiceActividad);
});

btnDetener.addEventListener('click', () => {
    clearInterval(intervaloTimer);
    mostrarVista(vistaDashboard);
});

btnVolverMenu.addEventListener('click', () => {
    mostrarVista(vistaDashboard);
});

// ==========================================
// 6. INICIALIZACIÓN
// ==========================================
btnNuevaLista.addEventListener('click', () => abrirEditor());

// Arrancar app
cargarDatos();
renderizarDashboard();
mostrarVista(vistaDashboard);