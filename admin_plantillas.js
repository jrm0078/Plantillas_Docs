const API_PLANTILLAS = './api_plantillas.php';

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
                document.getElementById('tabla_origen').value = data.data.tabla_origen || 'clientes';
                document.getElementById('campo_clave').value = data.data.campo_clave || 'id';
                document.getElementById('sql_consulta').value = data.data.sql_consulta || 'SELECT * FROM clientes WHERE id = ?';
                document.getElementById('contenido').value = decodificarHTML(data.data.contenido || '');
                document.getElementById('estado').checked = data.data.estado == 1;
                
                // Actualizar previsualización con TinyMCE
                if (tinymce.get('previsualizacion')) {
                    tinymce.get('previsualizacion').setContent(decodificarHTML(data.data.contenido || ''));
                }
                
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
                        row.innerHTML = `
                            <td><input type="text" class="form-control form-control-sm" value="${filtro.nombre_filtro}"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${filtro.etiqueta}"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${filtro.tabla_datos}"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${filtro.campo_clave}"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${filtro.campo_valor}"></td>
                            <td><input type="number" class="form-control form-control-sm" value="${filtro.orden || 1}" min="1"></td>
                            <td><input type="checkbox" class="form-check-input" ${filtro.requerido === 1 ? 'checked' : ''}></td>
                            <td><button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaFiltro('${rowId}')">Eliminar</button></td>
                        `;
                        bodyFiltros.appendChild(row);
                    });
                }
                
                ocultarTabla();
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
    const tabla_origen = document.getElementById('tabla_origen').value.trim();
    const campo_clave = document.getElementById('campo_clave').value.trim();
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
    
    if (!tabla_origen) {
        mostrarAlerta('La tabla origen es obligatoria', 'warning');
        document.getElementById('tabla_origen').focus();
        return;
    }
    
    if (!campo_clave) {
        mostrarAlerta('El campo clave es obligatorio', 'warning');
        document.getElementById('campo_clave').focus();
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
    
    // Validar que sql_consulta contenga ?
    if (!sql_consulta.includes('?')) {
        mostrarAlerta('La sentencia SQL debe contener ? como parámetro', 'warning');
        document.getElementById('sql_consulta').focus();
        return;
    }
    
    const datos = {
        cod_plantilla: cod,
        nombre: nombre,
        descripcion: document.getElementById('descripcion').value,
        tipo_documento: document.getElementById('tipo_documento').value,
        tabla_origen: tabla_origen,
        campo_clave: campo_clave,
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
    document.getElementById('tabla_origen').value = 'clientes';
    document.getElementById('campo_clave').value = 'id';
    document.getElementById('sql_consulta').value = 'SELECT * FROM clientes WHERE id = ?';
    document.getElementById('contenido').value = '';
    document.getElementById('estado').checked = true;
    
    if (tinymce.get('previsualizacion')) {
        tinymce.get('previsualizacion').setContent('');
    }
    
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
        const nombre = fila.querySelector('.var-nombre').value.trim();
        const etiqueta = fila.querySelector('.var-etiqueta').value.trim();
        const tipo = fila.querySelector('.var-tipo').value;
        const requerido = fila.querySelector('.var-requerido').checked ? 1 : 0;
        const orden = parseInt(fila.querySelector('.var-orden').value) || (index + 1);
        
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
    fila.innerHTML = `
        <td><input type="text" class="form-control form-control-sm filtro-nombre" placeholder="año, departamento, etc." required></td>
        <td><input type="text" class="form-control form-control-sm filtro-etiqueta" placeholder="Etiqueta visible" required></td>
        <td><input type="text" class="form-control form-control-sm filtro-tabla" placeholder="años, departamentos, etc." required></td>
        <td><input type="text" class="form-control form-control-sm filtro-campo-clave" placeholder="generalmente id" value="id" required></td>
        <td><input type="text" class="form-control form-control-sm filtro-campo-valor" placeholder="campo a mostrar" value="nombre" required></td>
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

function eliminarFilaFiltro(rowId) {
    const fila = document.getElementById(rowId);
    if (fila) fila.remove();
}

function obtenerFiltros() {
    const filtros = [];
    const filas = document.querySelectorAll('#bodyFiltros tr');
    
    filas.forEach((fila, index) => {
        const nombre = fila.querySelector('.filtro-nombre').value.trim();
        const etiqueta = fila.querySelector('.filtro-etiqueta').value.trim();
        const tabla = fila.querySelector('.filtro-tabla').value.trim();
        const campoClave = fila.querySelector('.filtro-campo-clave').value.trim();
        const campoValor = fila.querySelector('.filtro-campo-valor').value.trim();
        const orden = parseInt(fila.querySelector('.filtro-orden').value) || (index + 1);
        const requerido = fila.querySelector('.filtro-requerido').checked ? 1 : 0;
        
        if (nombre && etiqueta && tabla) {
            filtros.push({
                nombre_filtro: nombre,
                etiqueta: etiqueta,
                tabla_datos: tabla,
                campo_clave: campoClave,
                campo_valor: campoValor,
                orden: orden,
                requerido: requerido
            });
        }
    });
    
    return filtros;
}
