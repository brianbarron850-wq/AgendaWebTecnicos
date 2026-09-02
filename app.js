// ==========================================
// ADAPTACIÓN API PARA GITHUB PAGES / HOST EXTERNO
// ==========================================
const URL_API_GAS = "https://script.google.com/macros/s/AKfycbz5SPnLXSRpucrEp1ymTG0g-s0kpvA_fPWNIJMaCknB-r0Rif7nWAx1Z91Enn9_uY8r/exec";
    
if (typeof google === 'undefined') {
  window.google = {
    script: {
      run: {
        withSuccessHandler: function(onSuccess) { this._onSuccess = onSuccess; return this; },
        withFailureHandler: function(onFailure) { this._onFailure = onFailure; return this; },
        _call: function(funcName, args) {
          const successCb = this._onSuccess;
          const failureCb = this._onFailure;
          this._onSuccess = null;
          this._onFailure = null;

          const requestBody = JSON.stringify({ func: funcName, args: args });
          const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
          const REINTENTOS_MAX = 3;
          const ESPERAS_MS = [0, 1500, 3000];

          const ejecutar = async () => {
            for (let i = 0; i < REINTENTOS_MAX; i++) {
              if (i > 0) await delay(ESPERAS_MS[i]);

              let res;
              try {
                res = await fetch(URL_API_GAS, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: requestBody,
                  redirect: 'follow'
                });
              } catch (fetchErr) {
                if (i < REINTENTOS_MAX - 1) continue;
                throw fetchErr;
              }

              if (!res.ok) {
                if (i < REINTENTOS_MAX - 1) continue;
                throw new Error("Fallo en la red: " + res.status);
              }

              const text = await res.text();
              if (text.trim().startsWith('<')) {
                throw new Error("⚠️ Alerta de Google:\nLa conexión devolvió una página en lugar de datos.\n\nEsto suele pasar porque los permisos de la URL en Apps Script no están en 'Cualquier Persona' o porque excediste las cuotas.");
              }

              const data = JSON.parse(text);
              if (data && data.error) { if (failureCb) failureCb(data.error); }
              else { if (successCb) successCb(data.result); }
              return;
            }
          };

          ejecutar().catch(err => {
            console.error("Error en conexión:", err);
            let errorMsg = err.message || err.toString();
            if (errorMsg.includes('Failed to fetch')) {
              errorMsg = "Failed to fetch: La petición ha sido bloqueada. Revisa que la URL de la API sea correcta.";
            }
            if (failureCb) failureCb(errorMsg);
          });
        },
        validarAutenticacion: function(pin) { this._call('validarAutenticacion', [pin]); },
        obtenerDatosAgenda: function() { this._call('obtenerDatosAgenda', []); },
        buscarClienteWispHub: function(n, id) { this._call('buscarClienteWispHub', [n, id]); },
        guardarRegistroAgenda: function(d) { this._call('guardarRegistroAgenda', [d]); },
        eliminarRegistroAgenda: function(r, u) { this._call('eliminarRegistroAgenda', [r, u]); },
        renombrarCuadrillaBD: function(v, n, f) { this._call('renombrarCuadrillaBD', [v, n, f]); }, 
        obtenerTodoContenidoBaseDatos: function() { this._call('obtenerTodoContenidoBaseDatos', []); },
        obtenerDatosDashboard: function() { this._call('obtenerDatosDashboard', []); },
        obtenerAuditoriaEliminados: function() { this._call('obtenerAuditoriaEliminados', []); },
        actualizarFechasDashboard: function(d1, g1) { this._call('actualizarFechasDashboard', [d1, g1]); }
      }
    }
  };
}

const safeStorage = {
    mem: {},
    getItem: function(key) { try { return localStorage.getItem(key); } catch(e) { return this.mem[key] || null; } },
    setItem: function(key, val) { try { localStorage.setItem(key, val); } catch(e) { this.mem[key] = val.toString(); } },
    removeItem: function(key) { try { localStorage.removeItem(key); } catch(e) { delete this.mem[key]; } }
};
const safeSession = {
    mem: {},
    getItem: function(key) { try { return sessionStorage.getItem(key); } catch(e) { return this.mem[key] || null; } },
    setItem: function(key, val) { try { sessionStorage.setItem(key, val); } catch(e) { this.mem[key] = val.toString(); } },
    removeItem: function(key) { try { sessionStorage.removeItem(key); } catch(e) { delete this.mem[key]; } }
};

const tecnicosPorDefecto = ["Cuadrilla 1", "Cuadrilla 2", "Cuadrilla 3", "Cuadrilla 4", "Euriel", "Ivan", "Ulises", "Jose","Edgar" ];
const motivosPorDefecto = ["Instalación", "Soporte", "Cambio de Domicilio", "Desinstalación", "Soporte/Desinstalacion", "Des/Reactivo", "Migracion", "Reactivacion", "CAT" ];
const horariosPorDefecto = ["9:00am", "9:30am", "10:00am", "10:30am", "11:00am", "11:30am", "Antes de las 12pm", "12:00pm", "12:30pm","Despues de las 12pm", "1:00pm", "1:30pm", "2:00pm", "2:30pm","Antes de las 3pm", "3:00pm", "3:30pm", "Despues de las 3pm", "4:00pm", "4:30pm", "5:00pm", "5:30pm", "Despues de las 6pm", "Disponibilidad"];

const camposPermitidosTecnico = [
  'form_ip',
  'form_coordenadasoentrecalles',
  'form_serealizo',
  'form_monto',
  'form_comentariosdeltecnico'
];

let baseDatosGoogle = [];
try { var _bC = safeStorage.getItem('bDG_v1'); if(_bC) { baseDatosGoogle = JSON.parse(_bC); } } catch(e) {}
let rolUsuario = null;
window.isDragging = false;
let mapInstance = null;
let routingControl = null;

// ==========================================
// INICIALIZACIÓN Y FLUJO DE LOGIN
// ==========================================
window.onload = function() {
  try {
      const hoy = new Date().toISOString().split('T')[0];
      document.getElementById('filtroFecha').value = hoy;
      
      if(!safeStorage.getItem('config_lista_tecnicos')) safeStorage.setItem('config_lista_tecnicos', JSON.stringify(tecnicosPorDefecto));
      if(!safeStorage.getItem('config_lista_motivos')) safeStorage.setItem('config_lista_motivos', JSON.stringify(motivosPorDefecto));
      if(!safeStorage.getItem('config_lista_horarios')) safeStorage.setItem('config_lista_horarios', JSON.stringify(horariosPorDefecto));
      
      poblarSelects();

      const sesionGuardada = safeSession.getItem('sesion_activa');
      if (sesionGuardada) {
        iniciarAppConRol(sesionGuardada);
      }
  } catch (errorFalla) {
      const m = document.getElementById('msgErrorPin');
      if (m) { m.innerText = "Error inicializando la app: " + errorFalla.message; m.classList.remove('hidden'); }
  }
};

function verificarPin() {
  try {
      const pinInput = document.getElementById('inputPin');
      const pin = pinInput.value.trim();
      const btn = document.getElementById('btnLogin');
      const msgError = document.getElementById('msgErrorPin');
      
      if(!pin) return;
      
      btn.innerHTML = "⏳ Verificando...";
      btn.disabled = true;
      msgError.classList.add('hidden');
      msgError.innerText = ""; 
      
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.status === 'success') {
              safeSession.setItem('sesion_activa', res.role);
              if (res.nombre) safeSession.setItem('nombre_usuario', res.nombre);
              iniciarAppConRol(res.role);
            } else {
              msgError.innerText = (res && res.message) ? res.message : "Credenciales no válidas.";
              msgError.classList.remove('hidden');
              btn.innerHTML = "Ingresar";
              btn.disabled = false;
            }
          })
          .withFailureHandler(function(err) {
            msgError.innerText = "Error del sistema: " + (err.message || err);
            msgError.classList.remove('hidden');
            btn.innerHTML = "Ingresar";
            btn.disabled = false;
          })
          .validarAutenticacion(pin);
      }
  } catch (e) {
      const err = document.getElementById('msgErrorPin');
      if (err) { err.innerText = "Error local: " + e.message; err.classList.remove('hidden'); }
      document.getElementById('btnLogin').innerHTML = "Ingresar";
      document.getElementById('btnLogin').disabled = false;
  }
}

function iniciarAppConRol(rol) {
  rolUsuario = rol;
  document.getElementById('modalLogin').classList.add('hidden');
  document.getElementById('appContenedor').classList.remove('hidden');
  document.getElementById('badgeRol').innerText = rol === 'admin' ? 'Administrador' : 'Técnico';
  
  // FIX: Configuración y visibilidad de los controles para el usuario Técnico vs Administrador
  if (rol === 'tecnico') {
    document.getElementById('panelAdmin').classList.add('hidden');
    document.getElementById('btnVolverAgendaTecnico').classList.remove('hidden');
    document.querySelectorAll('.admin-only').forEach(function(el) {
      el.classList.add('hidden');
    });
  } else {
    document.getElementById('panelAdmin').classList.remove('hidden');
    document.getElementById('btnVolverAgendaTecnico').classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(function(el) {
      el.classList.remove('hidden');
    });
  }
  
  // FIX CRÍTICO: Disparar la sincronización de datos de la agenda inmediatamente después de logear
  // Esto resuelve el error del pantallazo en blanco post-login
  sincronizarDatos();
}

function cerrarSesion() {
    safeSession.removeItem('sesion_activa');
    safeSession.removeItem('nombre_usuario');
    document.getElementById('appContenedor').classList.add('hidden');
    document.getElementById('modalLogin').classList.remove('hidden');
    document.getElementById('inputPin').value = '';
}

// ==========================================
// CONTROL DE DATOS Y RENDERIZADO VISUAL
// ==========================================
function sincronizarDatos() {
    const btn = document.getElementById('btnSincronizar');
    const btnTech = document.getElementById('btnVolverAgendaTecnico');
    if(btn) btn.innerHTML = "⏳ Sincronizando...";
    if(btnTech) btnTech.innerHTML = "⏳ Cargando...";
    
    google.script.run
        .withSuccessHandler(function(data) {
            baseDatosGoogle = data || [];
            safeStorage.setItem('bDG_v1', JSON.stringify(baseDatosGoogle));
            renderizarAgenda();
            if(btn) btn.innerHTML = "🔄 Sincronizar";
            if(btnTech) btnTech.innerHTML = "🔙 Regresar / Actualizar";
        })
        .withFailureHandler(function(err) {
            console.error("Error obteniendo datos:", err);
            if(btn) btn.innerHTML = "🔄 Sincronizar";
            if(btnTech) btnTech.innerHTML = "🔙 Regresar / Actualizar";
            alert("Error de conexión al obtener la agenda.");
        })
        .obtenerDatosAgenda();
}

function cambioDeFechaFiltro() {
    renderizarAgenda();
}

function renderizarAgenda() {
    const contenedor = document.getElementById('contenedorDias');
    contenedor.innerHTML = "";
    
    const fechaFiltro = document.getElementById('filtroFecha').value;
    let datosFiltrados = baseDatosGoogle;
    
    if (fechaFiltro) {
        datosFiltrados = datosFiltrados.filter(item => item.fecha === fechaFiltro);
    }

    if (rolUsuario === 'tecnico') {
        const nombreTecnico = safeSession.getItem('nombre_usuario');
        if (nombreTecnico) {
            datosFiltrados = datosFiltrados.filter(item => normalizarNombreTecnico(item.tecnico) === normalizarNombreTecnico(nombreTecnico));
        }
    }

    if (datosFiltrados.length === 0) {
        contenedor.innerHTML = `<div class="text-center p-10 text-slate-500 font-bold bg-white rounded-xl shadow-sm border border-slate-200">No hay citas programadas para esta vista.</div>`;
        return;
    }

    const vistaGrid = document.createElement('div');
    vistaGrid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    datosFiltrados.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-xl shadow-sm border border-slate-200 slot-card flex flex-col justify-between";
        
        let linkTracking = "";
        let enlaceClientePersonalizado = "";
        
        // FIX: Integración de Link de Seguimiento y Mapa Activo en vista Técnico
        if (item.coordenadasoentrecalles && item.coordenadasoentrecalles.includes(',')) {
            linkTracking = `<button onclick="abrirMapaRutas('${item.coordenadasoentrecalles}')" class="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded shadow-sm w-full md:w-auto">📍 Ver Trayectoria al Destino</button>`;
        }
        
        if (item.linkCliente && item.linkCliente.trim() !== "") {
            enlaceClientePersonalizado = `<a href="${item.linkCliente}" target="_blank" class="mt-2 ml-0 md:ml-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1.5 px-3 rounded shadow-sm inline-block text-center w-full md:w-auto">🔗 Link del Cliente</a>`;
        }

        const controlesTech = rolUsuario === 'tecnico' ? `
          <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-2 items-center">
              ${linkTracking}
              ${enlaceClientePersonalizado}
          </div>` : '';

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-lg text-slate-800 break-words w-2/3">${item.nombredelcliente || 'Sin Nombre'}</h4>
                    <span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide text-center">${item.serealizo || 'Pendiente'}</span>
                </div>
                <div class="space-y-1">
                  <p class="text-sm text-slate-600"><strong>Motivo:</strong> <span class="text-slate-800">${item.motivo}</span></p>
                  <p class="text-sm text-slate-600"><strong>Horario:</strong> <span class="text-slate-800">${item.horario}</span></p>
                  <p class="text-sm text-slate-600"><strong>Dirección:</strong> <span class="text-slate-800">${item.calleynumero}, ${item.coloniaofracc}</span></p>
                  <p class="text-sm text-slate-600"><strong>Teléfono:</strong> <span class="text-slate-800">${item.telefono || 'N/A'}</span></p>
                </div>
            </div>
            ${controlesTech}
        `;
        vistaGrid.appendChild(card);
    });

    contenedor.appendChild(vistaGrid);
}

function poblarSelects() {
    const listados = [
      { id: 'form_tecnico', key: 'config_lista_tecnicos', def: tecnicosPorDefecto },
      { id: 'form_motivo', key: 'config_lista_motivos', def: motivosPorDefecto },
      { id: 'form_horario', key: 'config_lista_horarios', def: horariosPorDefecto }
    ];

    listados.forEach(cfg => {
        let options = [];
        try { options = JSON.parse(safeStorage.getItem(cfg.key)); } catch(e) {}
        if(!Array.isArray(options) || options.length === 0) options = cfg.def;
        
        const sel = document.getElementById(cfg.id);
        if (sel) {
          sel.innerHTML = `<option value="">Seleccione una opción...</option>` + 
                          options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
        }
    });
}

function cerrarModal() {
    document.getElementById('modalRegistro').classList.add('hidden');
    document.getElementById('formularioAgenda').reset();
}

// ==========================================
// INTEGRACIÓN LEAFLET Y TRAYECTORIAS MAPA
// ==========================================
function abrirMapaRutas(destinoStr) {
    document.getElementById('modalMapaRutas').classList.remove('hidden');
    
    setTimeout(() => {
        if (!mapInstance) {
            mapInstance = L.map('mapContainer').setView([28.632996, -106.069100], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(mapInstance);
        } else {
            mapInstance.invalidateSize();
        }

        const destArr = destinoStr.split(',').map(c => parseFloat(c.trim()));
        if (destArr.length !== 2 || isNaN(destArr[0]) || isNaN(destArr[1])) {
            alert("Las coordenadas del destino son inválidas para trazar la ruta.");
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const origen = [position.coords.latitude, position.coords.longitude];
                    if (routingControl) {
                        mapInstance.removeControl(routingControl);
                    }
                    routingControl = L.Routing.control({
                        waypoints: [
                            L.latLng(origen[0], origen[1]),
                            L.latLng(destArr[0], destArr[1])
                        ],
                        routeWhileDragging: false,
                        showAlternatives: false,
                        addWaypoints: false,
                        fitSelectedRoutes: true,
                        show: false // Oculta el panel lateral de direcciones para vista móvil limpia
                    }).addTo(mapInstance);
                },
                function(error) {
                    alert("No se pudo obtener tu ubicación actual. Asegúrate de otorgar los permisos de GPS al navegador.");
                }, 
                { enableHighAccuracy: true }
            );
        } else {
            alert("Tu navegador no soporta geolocalización.");
        }
    }, 300);
}

function cerrarMapaRutas() {
    document.getElementById('modalMapaRutas').classList.add('hidden');
}
