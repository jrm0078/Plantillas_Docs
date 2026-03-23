const API_PLANTILLAS = '../backend/api/api_plantillas.php';

let plantillaEnEdicion = null;

// DECODIFICAR ENTIDADES HTML
function decodificarHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

// INICIALIZAR TINYMCE PARA PREVISUALIZACIÓN
function inicializarTinyMCEPreview() {
    tinymce.init({
        selector: '#previsualizacion',
        height: 550,
        readonly: false,
        language: 'es',
        menubar: 'file edit view insert format tools',
        plugins: 'advlist autolink lists link image charmap anchor searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking table',
        toolbar: 'undo redo | styleselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | fullscreen | table',
        branding: false,
        valid_elements: '*[*]',
        extended_valid_elements: '*[*]',
        entity_encoding: 'raw',
        setup: function (editor) {
            editor.on('change', function() {
                actualizarDesdePreview();
            });
        }
    });
}

// ACTUALIZAR PREVISUALIZACION EN VIVO
function actualizarPreview() {
    const contenido = document.getElementById('contenido').value;
    
    if (tinymce.get('previsualizacion')) {
        tinymce.get('previsualizacion').setContent(contenido);
    }
}

// ACTUALIZAR HTML DESDE LA PREVISUALIZACIÓN
function actualizarDesdePreview() {
    if (tinymce.get('previsualizacion')) {
        const htmlContenido = tinymce.get('previsualizacion').getContent();
        document.getElementById('contenido').value = htmlContenido;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    cargarPlantillas();
    inicializarTinyMCEPreview();
    
    // Evento para actualizar previsualización en vivo desde el HTML
    document.getElementById('contenido').addEventListener('input', function() {
        actualizarPreview();
    });
});

// CARGAR TABLA DE PLANTILLAS
function cargarPlantillas() {
    fetch(API_PLANTILLAS + '?action=listar')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('cuerpoTabla');
                tbody.innerHTML = '';
                
                data.data.forEach(plantilla => {
                    const estado = plantilla.estado == 1 ? 'Activa' : 'Inactiva';
                    const fila = document.createElement('tr');
                    fila.innerHTML = `
                        <td>${plantilla.cod_plantilla}</td>
                        <td>${plantilla.nombre}</td>
                        <td>${plantilla.descripcion || ''}</td>
                        <td>${plantilla.tipo_documento || ''}</td>
                        <td>${estado}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="abrirFormularioEditar('${plantilla.cod_plantilla}')">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarPlantilla('${plantilla.cod_plantilla}')">Eliminar</button>
                        </td>
                    `;
                    tbody.appendChild(fila);
                });
            } else {
                mostrarAlerta('Error al cargar plantillas: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error de conexion', 'danger');
        });
}

// ABRIR FORMULARIO PARA NUEVA PLANTILLA
function abrirFormularioNueva() {
    plantillaEnEdicion = null;
    document.getElementById('tituloFormulario').textContent = 'Nueva Plantilla';
    document.getElementById('cod_plantilla').disabled = false;
    limpiarFormulario();
    ocultarTabla();
    document.getElementById('btnCrearTabla').style.display = 'none';
}

// ABRIR FORMULARIO PARA EDITAR
function abrirFormularioEditar(cod) {
    fetch(API_PLANTILLAS + '?action=obtener_completa&cod=' + cod)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                plantillaEnEdicion = cod;
                document.getElementById('tituloFormulario').textContent = 'Editar Plantilla';
                document.getElementById('cod_plantilla').disabled = true;
                
                document.getElementById('cod_plantilla').value = data.data.cod_plantilla;
                document.getElementById('nombre').value = data.data.nombre;
                document.getElementById('descripcion').value = data.data.descripcion || '';
                document.getElementById('tipo_documento').value = data.data.tipo_documento || '';
                document.getElementById('sql_consulta').value = data.data.sql_consulta || 'SELECT * FROM clientes WHERE id = [[id]]';
                document.getElementById('contenido').value = decodificarHTML(data.data.contenido || '');
                document.getElementById('estado').checked = data.data.estado == 1;
                
                // NUEVA: Cargar Variables
                const bodyVariables = document.getElementById('bodyVariables');
                bodyVariables.innerHTML = '';
                
                if (data.data.variables && data.data.variables.length > 0) {
                    data.data.variables.forEach(variable => {
                        const rowId = 'var_' + Date.now() + Math.random();
                        const row = document.createElement('tr');
                        row.id = rowId;
                        row.innerHTML = `
                            <td><input type="text" class="form-control form-control-sm" value="${variable.nombre_variable}"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${variable.etiqueta}"></td>
                            <td>
                                <select class="form-control form-control-sm">
                                    <option value="text" ${variable.tipo === 'text' ? 'selected' : ''}>Texto</option>
                                    <option value="email" ${variable.tipo === 'email' ? 'selected' : ''}>Email</option>
                                    <option value="number" ${variable.tipo === 'number' ? 'selected' : ''}>Número</option>
                                    <option value="date" ${variable.tipo === 'date' ? 'selected' : ''}>Fecha</option>
                                    <option value="textarea" ${variable.tipo === 'textarea' ? 'selected' : ''}>Texto largo</option>
                                </select>
                            </td>
                            <td><input type="checkbox" class="form-check-input" ${variable.requerido === 1 ? 'checked' : ''}></td>
                            <td><input type="number" class="form-control form-control-sm" value="${variable.orden || 1}" min="1"></td>
                            <td><button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaVariable('${rowId}')">Eliminar</button></td>
                        `;
                        bodyVariables.appendChild(row);
                    });
                }
                
                // NUEVA: Cargar Filtros
                const bodyFiltros = document.getElementById('bodyFiltros');
                bodyFiltros.innerHTML = '';
                
                if (data.data.filtros && data.data.filtros.length > 0) {
                    data.data.filtros.forEach(filtro => {
                        const rowId = 'filt_' + Date.now() + Math.random();
                        const row = document.createElement('tr');
                        row.id = rowId;
                        row.className = 'filtro-row';
                        
                        const tipo = filtro.tipo_filtro || 'select_table';
                        
                        let configHtml = '';
                        if (tipo === 'select_table') {
                            configHtml = `
                                <input type="text" class="form-control form-control-sm mb-1 filtro-tabla" value="${filtro.tabla_datos || ''}">
                                <input type="text" class="form-control form-control-sm mb-1 filtro-campo-clave" value="${filtro.campo_clave || 'id'}">
                                <input type="text" class="form-control form-control-sm filtro-campo-valor" value="${filtro.campo_valor || 'nombre'}">
                            `;
                        } else if (tipo === 'select_sql') {
                            configHtml = `
                                <textarea class="form-control form-control-sm filtro-sql-query" rows="2">${filtro.sql_query || ''}</textarea>
                            `;
                        } else if (['text', 'number', 'date'].includes(tipo)) {
                            configHtml = `
                                <select class="form-control form-control-sm filtro-operador">
                                    <option value="=" ${filtro.operador === '=' ? 'selected' : ''}>=</option>
                                    <option value="LIKE" ${filtro.operador === 'LIKE' ? 'selected' : ''}>LIKE</option>
                                    <option value=">" ${filtro.operador === '>' ? 'selected' : ''}>&gt;</option>
                                    <option value="<" ${filtro.operador === '<' ? 'selected' : ''}>&lt;</option>
                                    <option value=">=" ${filtro.operador === '>=' ? 'selected' : ''}>&gt;=</option>
                                    <option value="<=" ${filtro.operador === '<=' ? 'selected' : ''}>&lt;=</option>
                                </select>
                            `;
                        }
                        
                        row.innerHTML = `
                            <td><input type="text" class="form-control form-control-sm filtro-nombre" value="${filtro.nombre_filtro}"></td>
                            <td><input type="text" class="form-control form-control-sm filtro-etiqueta" value="${filtro.etiqueta}"></td>
                            <td>
                                <select class="form-control form-control-sm filtro-tipo" onchange="actualizarConfiguracionFiltro('${rowId}')">
                                    <option value="select_table" ${tipo === 'select_table' ? 'selected' : ''}>SELECT Tabla</option>
                                    <option value="select_sql" ${tipo === 'select_sql' ? 'selected' : ''}>SELECT SQL</option>
                                    <option value="text" ${tipo === 'text' ? 'selected' : ''}>Texto</option>
                                    <option value="number" ${tipo === 'number' ? 'selected' : ''}>Número</option>
                                    <option value="date" ${tipo === 'date' ? 'selected' : ''}>Fecha</option>
                                </select>
                            </td>
                            <td id="config-${rowId}">${configHtml}</td>
                            <td><input type="number" class="form-control form-control-sm filtro-orden" value="${filtro.orden || 1}" min="1"></td>
                            <td><input type="checkbox" class="form-check-input filtro-requerido" ${filtro.requerido === 1 ? 'checked' : ''}></td>
                            <td><button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaFiltro('${rowId}')">Eliminar</button></td>
                        `;
                        bodyFiltros.appendChild(row);
                    });
                }
                
                ocultarTabla();
                document.getElementById('btnCrearTabla').style.display = 'none';
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar plantilla', 'danger');
        });
}

// GUARDAR PLANTILLA
function guardarPlantilla() {
    const cod = document.getElementById('cod_plantilla').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const contenido = document.getElementById('contenido').value.trim();
    const sql_consulta = document.getElementById('sql_consulta').value.trim();
    
    // Validaciones
    if (!cod) {
        mostrarAlerta('El código de plantilla es obligatorio', 'warning');
        document.getElementById('cod_plantilla').focus();
        return;
    }
    
    if (!nombre) {
        mostrarAlerta('El nombre de plantilla es obligatorio', 'warning');
        document.getElementById('nombre').focus();
        return;
    }
    
    if (!contenido) {
        mostrarAlerta('El contenido HTML de la plantilla es obligatorio', 'warning');
        document.getElementById('contenido').focus();
        return;
    }
    
    if (!sql_consulta) {
        mostrarAlerta('La sentencia SQL es obligatoria', 'warning');
        document.getElementById('sql_consulta').focus();
        return;
    }
    
    // Validar que el código no contenga espacios
    if (cod.includes(' ')) {
        mostrarAlerta('El código de plantilla no puede contener espacios', 'warning');
        document.getElementById('cod_plantilla').focus();
        return;
    }
    
    // Validar que el nombre tenga mínimo 3 caracteres
    if (nombre.length < 3) {
        mostrarAlerta('El nombre debe tener mínimo 3 caracteres', 'warning');
        document.getElementById('nombre').focus();
        return;
    }
    
    // Validar que sql_consulta contenga ? (opcional - puede tener o no parámetros)
    // if (!sql_consulta.includes('?')) {
    //     mostrarAlerta('La sentencia SQL debe contener ? como parámetro', 'warning');
    //     document.getElementById('sql_consulta').focus();
    //     return;
    // }
    
    const datos = {
        cod_plantilla: cod,
        nombre: nombre,
        descripcion: document.getElementById('descripcion').value,
        tipo_documento: document.getElementById('tipo_documento').value,
        sql_consulta: sql_consulta,
        contenido: contenido,
        estado: document.getElementById('estado').checked ? 1 : 0,
        variables: obtenerVariables(),
        filtros: obtenerFiltros()
    };
    
    const action = plantillaEnEdicion ? 'editar&cod=' + plantillaEnEdicion : 'crear';
    
    fetch(API_PLANTILLAS + '?action=' + action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarAlerta(data.message, 'success');
                limpiarFormulario();
                mostrarTabla();
                cargarPlantillas();
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al guardar plantilla', 'danger');
        });
}

// ELIMINAR PLANTILLA
function eliminarPlantilla(cod) {
    if (!confirm('Confirma que quiere eliminar esta plantilla?')) {
        return;
    }
    
    fetch(API_PLANTILLAS + '?action=eliminar&cod=' + cod, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarAlerta('Plantilla eliminada correctamente', 'success');
                cargarPlantillas();
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al eliminar plantilla', 'danger');
        });
}

// LIMPIAR FORMULARIO
function limpiarFormulario() {
    document.getElementById('cod_plantilla').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('descripcion').value = '';
    document.getElementById('tipo_documento').value = '';
    document.getElementById('sql_consulta').value = '';
    document.getElementById('contenido').value = '';
    document.getElementById('estado').checked = true;
    
    plantillaEnEdicion = null;
}

// CANCELAR EDICION
function cancelarFormulario() {
    limpiarFormulario();
    mostrarTabla();
}

// MOSTRAR/OCULTAR TABLA
function ocultarTabla() {
    document.getElementById('tablaPantillas').style.display = 'none';
    document.getElementById('formularioSection').style.display = 'block';
}

function mostrarTabla() {
    document.getElementById('tablaPantillas').style.display = 'block';
    document.getElementById('formularioSection').style.display = 'none';
    document.getElementById('btnCrearTabla').style.display = 'block';
}

// MOSTRAR ALERTAS
function mostrarAlerta(mensaje, tipo) {
    const alertId = 'alert-' + Date.now();
    const alertDiv = document.createElement('div');
    alertDiv.id = alertId;
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.getElementById('alertaContainer').appendChild(alertDiv);
    
    setTimeout(() => {
        const alerta = document.getElementById(alertId);
        if (alerta) alerta.remove();
    }, 4000);
}

// ========== FUNCIONES PARA VARIABLES ==========
function agregarFilaVariable() {
    const tbody = document.getElementById('bodyVariables');
    const fila = document.createElement('tr');
    const rowId = 'var-' + Date.now();
    
    fila.id = rowId;
    fila.innerHTML = `
        <td><input type="text" class="form-control form-control-sm var-nombre" placeholder="nombre_variable" required></td>
        <td><input type="text" class="form-control form-control-sm var-etiqueta" placeholder="Etiqueta visible" required></td>
        <td>
            <select class="form-select form-select-sm var-tipo" required>
                <option value="text">Texto</option>
                <option value="email">Email</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
                <option value="textarea">Área de texto</option>
            </select>
        </td>
        <td>
            <input type="checkbox" class="form-check-input var-requerido" checked>
        </td>
        <td><input type="number" class="form-control form-control-sm var-orden" value="1" min="1" required></td>
        <td>
            <button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaVariable('${rowId}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(fila);
}

function eliminarFilaVariable(rowId) {
    const fila = document.getElementById(rowId);
    if (fila) fila.remove();
}

function obtenerVariables() {
    const variables = [];
    const filas = document.querySelectorAll('#bodyVariables tr');
    
    filas.forEach((fila, index) => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length < 5) return; // Skip si no tiene suficientes celdas
        
        // Celda 0: nombre, Celda 1: etiqueta, Celda 2: tipo, Celda 3: requerido, Celda 4: orden
        const nombre = celdas[0].querySelector('input')?.value.trim() || '';
        const etiqueta = celdas[1].querySelector('input')?.value.trim() || '';
        const tipo = celdas[2].querySelector('select')?.value || celdas[2].querySelector('input')?.value || 'text';
        const requerido = celdas[3].querySelector('input[type="checkbox"]')?.checked ? 1 : 0;
        const orden = parseInt(celdas[4].querySelector('input')?.value) || (index + 1);
        
        if (nombre && etiqueta) {
            variables.push({
                nombre_variable: nombre,
                etiqueta: etiqueta,
                tipo: tipo,
                requerido: requerido,
                orden: orden
            });
        }
    });
    
    return variables;
}

// ========== FUNCIONES PARA FILTROS ==========
function agregarFilaFiltro() {
    const tbody = document.getElementById('bodyFiltros');
    const fila = document.createElement('tr');
    const rowId = 'filtro-' + Date.now();
    
    fila.id = rowId;
    fila.className = 'filtro-row';
    fila.innerHTML = `
        <td><input type="text" class="form-control form-control-sm filtro-nombre" placeholder="año, departamento, etc." required></td>
        <td><input type="text" class="form-control form-control-sm filtro-etiqueta" placeholder="Etiqueta visible" required></td>
        <td>
            <select class="form-control form-control-sm filtro-tipo" onchange="actualizarConfiguracionFiltro('${rowId}')">
                <option value="select_table">SELECT Tabla</option>
                <option value="select_sql">SELECT SQL</option>
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
            </select>
        </td>
        <td id="config-${rowId}">
            <!-- Configuración inicial para select_table -->
            <div class="config-select-table">
                <input type="text" class="form-control form-control-sm mb-1 filtro-tabla" placeholder="Tabla: años, departamentos" required>
                <input type="text" class="form-control form-control-sm mb-1 filtro-campo-clave" placeholder="Clave: id" value="id">
                <input type="text" class="form-control form-control-sm filtro-campo-valor" placeholder="Valor: nombre">
            </div>
        </td>
        <td><input type="number" class="form-control form-control-sm filtro-orden" value="1" min="1" required></td>
        <td>
            <input type="checkbox" class="form-check-input filtro-requerido" checked>
        </td>
        <td>
            <button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaFiltro('${rowId}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(fila);
}

function actualizarConfiguracionFiltro(rowId) {
    const fila = document.getElementById(rowId);
    const tipo = fila.querySelector('.filtro-tipo').value;
    const configDiv = document.getElementById('config-' + rowId);
    
    let html = '';
    
    switch(tipo) {
        case 'select_table':
            html = `
                <input type="text" class="form-control form-control-sm mb-1 filtro-tabla" placeholder="Tabla: años, departamentos">
                <input type="text" class="form-control form-control-sm mb-1 filtro-campo-clave" placeholder="Clave: id" value="id">
                <input type="text" class="form-control form-control-sm filtro-campo-valor" placeholder="Valor: nombre">
            `;
            break;
        case 'select_sql':
            html = `
                <textarea class="form-control form-control-sm filtro-sql-query" placeholder="SELECT id, nombre FROM tabla WHERE..." rows="2" required></textarea>
                <small class="text-muted d-block mt-1">Usa [[nombre_filtro]] para parámetros dinámicos</small>
            `;
            break;
        case 'text':
        case 'number':
        case 'date':
            html = `
                <small class="text-muted d-block">Operador especificado en SQL del filtro</small>
            `;
            break;
    }
    
    configDiv.innerHTML = html;
}

function eliminarFilaFiltro(rowId) {
    const fila = document.getElementById(rowId);
    if (fila) fila.remove();
}

function obtenerFiltros() {
    const filtros = [];
    const filas = document.querySelectorAll('#bodyFiltros tr');
    
    filas.forEach((fila, index) => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length < 7) return;
        
        const nombre = celdas[0].querySelector('input')?.value.trim() || '';
        const etiqueta = celdas[1].querySelector('input')?.value.trim() || '';
        const tipo = celdas[2].querySelector('select')?.value || 'select_table';
        const orden = parseInt(celdas[4].querySelector('input')?.value) || (index + 1);
        const requerido = celdas[5].querySelector('input[type="checkbox"]')?.checked ? 1 : 0;
        
        if (!nombre || !etiqueta) return;
        
        const filtro = {
            nombre_filtro: nombre,
            etiqueta: etiqueta,
            tipo_filtro: tipo,
            orden: orden,
            requerido: requerido
        };
        
        // Recolectar configuración según tipo
        const configDiv = celdas[3];
        
        if (tipo === 'select_table') {
            const tabla = configDiv.querySelector('.filtro-tabla')?.value.trim() || '';
            const campoClave = configDiv.querySelector('.filtro-campo-clave')?.value.trim() || 'id';
            const campoValor = configDiv.querySelector('.filtro-campo-valor')?.value.trim() || 'nombre';
            
            if (!tabla) return;
            
            filtro.tabla_datos = tabla;
            filtro.campo_clave = campoClave;
            filtro.campo_valor = campoValor;
        } 
        else if (tipo === 'select_sql') {
            const sqlQuery = configDiv.querySelector('.filtro-sql-query')?.value.trim() || '';
            if (!sqlQuery) return;
            
            filtro.sql_query = sqlQuery;
            filtro.campo_clave = 'id';  // Por defecto
            filtro.campo_valor = 'nombre';
        } 
        else if (['text', 'number', 'date'].includes(tipo)) {
            // Operador especificado en SQL
        }
        
        filtros.push(filtro);
    });
    
    return filtros;
}
