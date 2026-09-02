// ==========================================
// ADAPTACIÓN API PARA GITHUB PAGES / HOST EXTERNO 
// (Completado y unificado)
// ==========================================

// BLOQUEO DE INSPECCIÓN Y CLIC DERECHO
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('keydown', function(e) {
  if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
  if (e.ctrlKey) {
    if (e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j')) { e.preventDefault(); return false; }
    if (e.key.toLowerCase() === 'u') { e.preventDefault(); return false; }
  }
});

const URL_API_GAS = "https://script.google.com/macros/s/AKfycbxhutzAgaC_u-P1GQ6M8rTYFuQlToKhONNs9nDEwWXblfuhlnQHjUnoV6L8Ap5ogb71HA/exec";

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
              errorMsg = "Failed to fetch: La petición ha sido bloqueada. Revisa la URL.";
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
const agentesPorDefecto = ["Denise", "Jenni", "Luz", "Luis", "Brian", "Fernando", "Laura", "Mario", "Jaime", "Kennya"];
const coloniasPorDefecto = ["11_Febrero", "2_Octubre", "Centro"]; 
const planesPorDefecto = ["30mb", "50mb", "Cortesia", "PCCC", "PCNCC", "CCC", "CNCC", "Gratis", "No aplica"];
const confirmadaPorDefecto = ["No", "Si", "Mesaje"];
const serealizoPorDefecto = ["Pendiente", "Si", "No", "Reagendar", "Reagendo", "Cancelo"];
const yafueclientePorDefecto = ["No", "Si"];
const bienvenidaPorDefecto = ["Si", "No", "Pendiente"];
const mediosPorDefecto = ["Amigo/Familiar", "Facebook", "Radio", "Es cliente", "No contesto", "Rotulo", "Recomendación", "Folleto", "Página Web", "Otros"];

const camposPermitidosTecnico = [
  'form_ip',
  'form_coordenadasoentrecalles',
  'form_serealizo',
  'form_monto',
  'form_comentariosdeltecnico'
];

let baseDatosGoogle = [];
try { var _bC = safeStorage.getItem('bDG_v1'); if(_bC) { baseDatosGoogle = JSON.parse(_bC); } } catch(e) {}
let espaciosPorFecha = {};
let rolUsuario = null;
window.isDragging = false;

function normalizarTecnico(texto) {
    if (!texto) return "";
    return texto.toString().trim().toLowerCase().split(/\s+/).map(function(w){
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
}

function poblarSelect(id, valores) {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = '<option value="">Seleccione...</option>';
    valores.forEach(v => s.innerHTML += `<option value="${v}">${v}</option>`);
}

function poblarSelects() {
    poblarSelect('form_tecnico', JSON.parse(safeStorage.getItem('config_lista_tecnicos') || '[]'));
    poblarSelect('form_motivo', JSON.parse(safeStorage.getItem('config_lista_motivos') || '[]'));
    poblarSelect('form_horario', JSON.parse(safeStorage.getItem('config_lista_horarios') || '[]'));
    poblarSelect('form_agente', JSON.parse(safeStorage.getItem('config_lista_agentes') || '[]'));
    poblarSelect('form_coloniaofracc', JSON.parse(safeStorage.getItem('config_lista_colonias') || '[]'));
    poblarSelect('form_coloniaofracc2', JSON.parse(safeStorage.getItem('config_lista_colonias') || '[]'));
    poblarSelect('form_plan', JSON.parse(safeStorage.getItem('config_lista_planes') || '[]'));
    poblarSelect('form_confirmada', JSON.parse(safeStorage.getItem('config_lista_confirmada') || '[]'));
    poblarSelect('form_serealizo', JSON.parse(safeStorage.getItem('config_lista_serealizo') || '[]'));
    poblarSelect('form_yafuecliente', JSON.parse(safeStorage.getItem('config_lista_yafuecliente') || '[]'));
    poblarSelect('form_bienvenida', JSON.parse(safeStorage.getItem('config_lista_bienvenida') || '[]'));
    poblarSelect('form_pormediosediocuentadenosotros', JSON.parse(safeStorage.getItem('config_lista_medios') || '[]'));
}

window.onload = function() {
  try {
      const hoy = new Date().toISOString().split('T')[0];
      document.getElementById('filtroFecha').value = hoy;
      
      if(!safeStorage.getItem('config_lista_tecnicos')) safeStorage.setItem('config_lista_tecnicos', JSON.stringify(tecnicosPorDefecto));
      if(!safeStorage.getItem('config_lista_motivos')) safeStorage.setItem('config_lista_motivos', JSON.stringify(motivosPorDefecto));
      if(!safeStorage.getItem('config_lista_horarios')) safeStorage.setItem('config_lista_horarios', JSON.stringify(horariosPorDefecto));
      if(!safeStorage.getItem('config_lista_agentes')) safeStorage.setItem('config_lista_agentes', JSON.stringify(agentesPorDefecto));
      if(!safeStorage.getItem('config_lista_colonias')) safeStorage.setItem('config_lista_colonias', JSON.stringify(coloniasPorDefecto));
      if(!safeStorage.getItem('config_lista_planes')) safeStorage.setItem('config_lista_planes', JSON.stringify(planesPorDefecto));
      if(!safeStorage.getItem('config_lista_confirmada')) safeStorage.setItem('config_lista_confirmada', JSON.stringify(confirmadaPorDefecto));
      if(!safeStorage.getItem('config_lista_serealizo')) safeStorage.setItem('config_lista_serealizo', JSON.stringify(serealizoPorDefecto));
      if(!safeStorage.getItem('config_lista_yafuecliente')) safeStorage.setItem('config_lista_yafuecliente', JSON.stringify(yafueclientePorDefecto));
      if(!safeStorage.getItem('config_lista_bienvenida')) safeStorage.setItem('config_lista_bienvenida', JSON.stringify(bienvenidaPorDefecto));
      if(!safeStorage.getItem('config_lista_medios')) safeStorage.setItem('config_lista_medios', JSON.stringify(mediosPorDefecto));
      
      let cached = safeStorage.getItem('espacios_por_fecha_v4');
      if(cached) espaciosPorFecha = JSON.parse(cached);
      
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
  const pinInput = document.getElementById('inputPin');
  const pin = pinInput.value.trim();
  const btn = document.getElementById('btnLogin');
  const msgError = document.getElementById('msgErrorPin');
  
  if(!pin) return;
  
  btn.innerHTML = "⏳ Verificando...";
  btn.disabled = true;
  msgError.classList.add('hidden');
  msgError.innerText = ""; 
  
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

function iniciarAppConRol(rol) {
  rolUsuario = rol;
  document.getElementById('modalLogin').classList.add('hidden');
  document.getElementById('appContenedor').classList.remove('hidden');
  document.getElementById('badgeRol').innerText = rol === 'admin' ? 'Administrador' : 'Técnico';
  
  if (rol === 'tecnico') {
    document.getElementById('panelAdmin').classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(function(el) {
        el.classList.add('hidden');
    });
  }
  // Corrección 1: Se llama inmediatamente para generar la vista
  sincronizarDatos();
}

function cerrarSesion() {
    safeSession.removeItem('sesion_activa');
    safeSession.removeItem('nombre_usuario');
    location.reload();
}

function sincronizarDatos() {
    const btn = document.getElementById('btnSincronizar');
    btn.innerHTML = "⏳...";
    google.script.run
      .withSuccessHandler(function(data) {
          baseDatosGoogle = data || [];
          safeStorage.setItem('bDG_v1', JSON.stringify(baseDatosGoogle));
          dibujarAgenda();
          btn.innerHTML = "🔄 Sincronizar";
      })
      .withFailureHandler(function(err) {
          alert("Error de sincronización: " + err);
          btn.innerHTML = "🔄 Sincronizar";
      })
      .obtenerDatosAgenda();
}

function cambioDeFechaFiltro() {
    dibujarAgenda();
}

function agregarCuadrillaFecha() {
    const input = document.getElementById('inputNuevaCuadrilla');
    const val = input.value.trim();
    if (val) {
        let lista = JSON.parse(safeStorage.getItem('config_lista_tecnicos') || '[]');
        if (!lista.includes(val)) {
            lista.push(val);
            safeStorage.setItem('config_lista_tecnicos', JSON.stringify(lista));
            poblarSelects();
        }
        input.value = "";
        dibujarAgenda();
    }
}

function dibujarAgenda() {
    const contenedor = document.getElementById('contenedorDias');
    const fecha = document.getElementById('filtroFecha').value;
    contenedor.innerHTML = "";
    
    if(!fecha) return;

    let registrosDelDia = baseDatosGoogle.filter(r => r.fecha === fecha);
    
    let cuadrillasActivas = JSON.parse(safeStorage.getItem('config_lista_tecnicos') || '[]');
    let presentadas = {};

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">`;
    
    cuadrillasActivas.forEach(cuadrilla => {
        let registrosCuadrilla = registrosDelDia.filter(r => r.tecnico && normalizarTecnico(r.tecnico) === normalizarTecnico(cuadrilla));
        
        if (registrosCuadrilla.length > 0 || rolUsuario === 'admin') {
            html += `<div class="bg-white p-4 rounded-xl shadow border border-slate-200">
                <h3 class="font-bold text-lg text-indigo-800 border-b border-indigo-100 pb-2 mb-3 flex justify-between items-center">
                    ${cuadrilla}
                    ${rolUsuario === 'admin' ? `<button onclick="abrirModal('', '${cuadrilla}', '${fecha}')" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">+ Cita</button>` : ''}
                </h3>
                <div class="space-y-3">`;
            
            if (registrosCuadrilla.length === 0) {
                html += `<p class="text-xs text-slate-400 italic text-center py-2">Sin citas asignadas</p>`;
            } else {
                registrosCuadrilla.forEach(cita => {
                    // Corrección: Botón de mapa si hay coordenadas y mostrar enlace de rastreo
                    let mapButton = cita.coordenadasoentrecalles ? `<button onclick="abrirMapaRuta('${cita.coordenadasoentrecalles}')" type="button" class="mt-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold text-xs py-1 px-2 rounded-lg w-full flex items-center justify-center gap-1 transition-colors">🗺️ Trazar Ruta</button>` : '';
                    let rastreoLink = cita.linkCliente ? `<a href="${cita.linkCliente}" target="_blank" class="mt-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs py-1 px-2 rounded-lg w-full flex items-center justify-center gap-1 transition-colors">🔗 Enlace de Rastreo</a>` : '';
                    
                    html += `
                    <div class="slot-card bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-pointer relative" onclick='abrirModalEditar(${JSON.stringify(cita).replace(/'/g, "&apos;")})'>
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-black text-sm text-slate-800">${cita.horario || 'Sin hora'}</span>
                            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${cita.serealizo === 'Si' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${cita.serealizo || 'Pendiente'}</span>
                        </div>
                        <p class="font-bold text-sm text-slate-700 leading-tight">${cita.nombredelcliente || 'Sin nombre'}</p>
                        <p class="text-xs text-slate-500 mt-1">${cita.motivo}</p>
                        <p class="text-xs text-slate-500 truncate">${cita.calleynumero}</p>
                        ${mapButton}
                        ${rastreoLink}
                    </div>`;
                });
            }
            html += `</div></div>`;
        }
    });

    html += `</div>`;
    contenedor.innerHTML = html;
}

function abrirMapaRuta(coordenadas) {
    if(coordenadas) {
        event.stopPropagation();
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordenadas)}`, '_blank');
    }
}

function abrirModal(rowNum, cuadrilla, fecha) {
    document.getElementById('formularioAgenda').reset();
    document.getElementById('form_rownum').value = rowNum || "";
    document.getElementById('form_fecha').value = fecha;
    document.getElementById('form_cuadrilla').value = cuadrilla;
    document.getElementById('form_tecnico').value = cuadrilla;
    
    document.getElementById('modalTitulo').innerText = rowNum ? "Editar Registro" : "Nueva Cita";
    document.getElementById('btnEliminarRegistro').classList.add('hidden');
    document.getElementById('btnDuplicarRegistro').classList.add('hidden');
    document.getElementById('contenedor_cambio_domicilio').classList.add('hidden');
    
    // Corrección 2: Asegurar comportamiento del rol en modal
    if (rolUsuario === 'tecnico') {
        const inputs = document.getElementById('formularioAgenda').querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!camposPermitidosTecnico.includes(input.id)) {
                input.readOnly = true;
                if (input.tagName === 'SELECT') {
                    input.style.pointerEvents = 'none';
                    input.tabIndex = -1;
                }
                input.classList.add('campo-bloqueado');
            }
        });
        document.getElementById('btnGuardarRegistro').classList.remove('hidden');
        document.getElementById('btnCancelar').classList.add('hidden');
        document.getElementById('btnVolver').classList.remove('hidden'); // Botón extra solicitado
    } else {
        document.getElementById('btnGuardarRegistro').classList.remove('hidden');
        document.getElementById('btnCancelar').classList.remove('hidden');
        document.getElementById('btnVolver').classList.add('hidden');
    }

    document.getElementById('modalRegistro').classList.remove('hidden');
}

function abrirModalEditar(cita) {
    abrirModal(cita.rowNum, cita.tecnico, cita.fecha);
    
    for (const key in cita) {
        const el = document.getElementById(`form_${key}`);
        if (el) el.value = cita[key];
    }
    
    if(rolUsuario === 'admin') {
        document.getElementById('btnEliminarRegistro').classList.remove('hidden');
        document.getElementById('btnDuplicarRegistro').classList.remove('hidden');
    }
}

function cerrarModal() {
    document.getElementById('modalRegistro').classList.add('hidden');
}

function enviarDatos(e) {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarRegistro');
    btn.innerHTML = "Guardando...";
    btn.disabled = true;

    let datos = {};
    const inputs = document.getElementById('formularioAgenda').querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if(input.id.startsWith('form_')) {
            let key = input.id.replace('form_', '');
            datos[key] = input.value;
        }
    });
    
    datos.usuario_movimiento = safeSession.getItem('nombre_usuario') || rolUsuario;
    datos.tecnico = datos.tecnico || datos.cuadrilla; 

    google.script.run
        .withSuccessHandler(function(res) {
            cerrarModal();
            sincronizarDatos();
            btn.innerHTML = "Guardar Cambios";
            btn.disabled = false;
        })
        .withFailureHandler(function(err) {
            alert("Error: " + err);
            btn.innerHTML = "Guardar Cambios";
            btn.disabled = false;
        })
        .guardarRegistroAgenda(datos);
}

function eliminarRegistroBD() {
    if(!confirm("¿Estás seguro de eliminar este registro de la base de datos de Google Sheets permanentemente?")) return;
    
    const row = document.getElementById('form_rownum').value;
    const usr = safeSession.getItem('nombre_usuario') || rolUsuario;
    
    if(!row) return;
    
    google.script.run
        .withSuccessHandler(function(res) {
            cerrarModal();
            sincronizarDatos();
        })
        .eliminarRegistroAgenda(row, usr);
}

function buscarEnWisphub(e) {
    e.preventDefault();
    const id = document.getElementById('form_id_wisphub').value;
    const nombre = document.getElementById('form_nombredelcliente').value;
    const badge = document.getElementById('badge_estado_wisphub');
    const container = document.getElementById('contenedor_estado_wisphub');
    
    if(!id && !nombre) { alert("Ingresa un ID o Nombre para buscar."); return; }
    
    badge.innerText = "Buscando...";
    container.classList.remove('hidden');
    
    google.script.run
        .withSuccessHandler(function(res) {
            if(res.status === 'success') {
                document.getElementById('form_id_wisphub').value = res.data.id;
                document.getElementById('form_nombredelcliente').value = res.data.nombre;
                document.getElementById('form_telefono').value = res.data.telefono;
                document.getElementById('form_ip').value = res.data.ip;
                document.getElementById('form_calleynumero').value = res.data.calleynumero;
                document.getElementById('form_coordenadasoentrecalles').value = res.data.coordenadas;
                
                badge.innerText = res.data.estado;
                badge.className = "text-[11px] uppercase tracking-wider font-black px-2 py-1 rounded-lg border shadow-sm " + (res.data.estado.toLowerCase() === 'activo' ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300");
            } else if (res.status === 'multiple') {
                mostrarSimilaresWisphub(res.similares);
                badge.innerText = "Múltiples";
                badge.className = "text-[11px] uppercase tracking-wider font-black px-2 py-1 rounded-lg border shadow-sm bg-amber-100 text-amber-700 border-amber-300";
            } else {
                badge.innerText = "No encontrado";
                badge.className = "text-[11px] uppercase tracking-wider font-black px-2 py-1 rounded-lg border shadow-sm bg-slate-100 text-slate-700 border-slate-300";
            }
        })
        .buscarClienteWispHub(nombre, id);
}

function mostrarSimilaresWisphub(lista) {
    const listado = document.getElementById('listaClientesSimilares');
    listado.innerHTML = '';
    
    lista.forEach(c => {
        listado.innerHTML += `
        <div class="p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 cursor-pointer" onclick='seleccionarClienteSimilar(${JSON.stringify(c).replace(/'/g, "&apos;")})'>
            <p class="font-bold text-sm text-slate-800">${c.nombre}</p>
            <p class="text-xs text-slate-500">ID: ${c.id} | IP: ${c.ip}</p>
            <p class="text-[10px] text-slate-400 mt-1">${c.calleynumero}</p>
        </div>
        `;
    });
    
    document.getElementById('modalClientesSimilares').classList.remove('hidden');
}

function seleccionarClienteSimilar(c) {
    document.getElementById('form_id_wisphub').value = c.id;
    document.getElementById('form_nombredelcliente').value = c.nombre;
    document.getElementById('form_telefono').value = c.telefono;
    document.getElementById('form_ip').value = c.ip;
    document.getElementById('form_calleynumero').value = c.calleynumero;
    document.getElementById('form_coordenadasoentrecalles').value = c.coordenadas;
    
    const badge = document.getElementById('badge_estado_wisphub');
    badge.innerText = c.estado;
    badge.className = "text-[11px] uppercase tracking-wider font-black px-2 py-1 rounded-lg border shadow-sm " + (c.estado.toLowerCase() === 'activo' ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300");
    
    document.getElementById('modalClientesSimilares').classList.add('hidden');
}

function abrirVistaGeneralAdmin() { document.getElementById('vistaAdminFiltros').classList.remove('hidden'); }
function cerrarVistaGeneralAdmin() { document.getElementById('vistaAdminFiltros').classList.add('hidden'); }
function abrirDashboard() { document.getElementById('vistaDashboardFiltros').classList.remove('hidden'); }
function cerrarDashboard() { document.getElementById('vistaDashboardFiltros').classList.add('hidden'); }
function abrirAuditoriaEliminados() { document.getElementById('vistaAuditoriaEliminados').classList.remove('hidden'); cargarAuditoria(); }
function cerrarAuditoriaEliminados() { document.getElementById('vistaAuditoriaEliminados').classList.add('hidden'); }

function cargarAuditoria() {
    google.script.run.withSuccessHandler(function(res) {
        if(res && res.headers) {
            document.getElementById('cargandoAuditoria').classList.add('hidden');
            let h = document.getElementById('tablaAuditoriaHeader');
            let b = document.getElementById('tablaAuditoriaBody');
            h.innerHTML = `<tr>${res.headers.map(x => `<th class="px-4 py-3">${x}</th>`).join('')}</tr>`;
            b.innerHTML = res.rows.map(row => `<tr>${row.map(cell => `<td class="px-4 py-2">${cell}</td>`).join('')}</tr>`).join('');
            document.getElementById('tablaAuditoria').classList.remove('hidden');
            document.getElementById('totalAuditoria').innerText = res.rows.length + " Registros";
        }
    }).obtenerAuditoriaEliminados();
}