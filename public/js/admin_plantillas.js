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
    
    // Evento para actualizar referencia de columnas cuando cambia el SQL
    const sqlTextarea = document.getElementById('sql_consulta');
    if (sqlTextarea) {
        sqlTextarea.addEventListener('input', function() {
            actualizarReferenciaColumnas();
        });
        // Actualizar columnas al cargar la página (en caso de que haya SQL precargado)
        actualizarReferenciaColumnas();
    }
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
    
    // Actualizar referencia de columnas (vacía al principio)
    setTimeout(() => {
        actualizarReferenciaColumnas();
    }, 100);
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
                
                // Actualizar previsualización con TinyMCE
                // Esperar a que TinyMCE esté listo
                setTimeout(() => {
                    if (tinymce.get('previsualizacion')) {
                        tinymce.get('previsualizacion').setContent(decodificarHTML(data.data.contenido || ''));
                    }
                }, 500);
                
                // Actualizar referencia de columnas disponibles
                setTimeout(() => {
                    actualizarReferenciaColumnas();
                }, 300);
                
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
                            configHtml = '';
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
                            <td><button type="button" class="btn btn-sm btn-danger" onclick="eliminarFilaFiltro('${rowId}')"><i class="fas fa-trash"></i></button></td>
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
    
    // Los errores se mantienen visibles hasta que el usuario los cierre manualmente
    // El resto de alertas desaparecen después de 5 segundos
    if (tipo !== 'danger') {
        setTimeout(() => {
            const alerta = document.getElementById(alertId);
            if (alerta) alerta.remove();
        }, 5000);
    }
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
            html = '';
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
        } 
        else if (['text', 'number', 'date'].includes(tipo)) {
            // Sin configuración especial para estos tipos
        }
        
        filtros.push(filtro);
    });
    
    return filtros;
}

// ========== FUNCIONES PARA PARSEAR SQL Y MOSTRAR COLUMNAS ==========

/**
 * Extrae los nombres de columnas (incluyendo aliases) de una consulta SQL SELECT
 * @param {string} sql - Consulta SQL
 * @returns {Object} {columnas: Array, esSelectAsterisco: boolean, tabla: string}
 */
function extraerColumnasSQL(sql) {
    if (!sql || sql.trim() === '') {
        return {columnas: [], esSelectAsterisco: false, tabla: ''};
    }
    
    try {
        // Limpiar whitespace
        let sqlLimpio = sql.trim();
        
        // Remover comentarios SQL de una línea (-- comentario)
        sqlLimpio = sqlLimpio.replace(/--[^\n]*/g, '');
        
        // Remover comentarios SQL multilínea (/* comentario */)
        sqlLimpio = sqlLimpio.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Expresión regular para extraer la sección SELECT ... FROM
        const regexSelect = /SELECT\s+(.*?)\s+FROM\s+(\w+)/is;
        const matchSelect = sqlLimpio.match(regexSelect);
        
        if (!matchSelect || !matchSelect[1]) {
            return {columnas: [], esSelectAsterisco: false, tabla: ''};
        }
        
        const selectPart = matchSelect[1].trim();
        const tabla = matchSelect[2].trim();
        
        // Si es SELECT *, retornar indicador de asterisco
        if (selectPart === '*') {
            return {columnas: [], esSelectAsterisco: true, tabla: tabla};
        }
        
        // Separar por comas (manteniendo cuidado con comas dentro de paréntesis o funciones)
        const columnasRaw = selectPart.split(',').map(s => s.trim());
        
        const columnas = [];
        
        columnasRaw.forEach(col => {
            if (!col) return;
            
            // Remover funciones de agregación comunes
            col = col.replace(/^(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|CONCAT|UPPER|LOWER|COALESCE|IFNULL|DATE_FORMAT|DATE|YEAR|MONTH|DAY|IF|CASE[\s\S]*?END)\s*\(/i, '');
            
            // Remover paréntesis de funciones que quedan
            col = col.replace(/[()]/g, '');
            
            // Detectar alias: "nombre AS alias" o "nombre alias"
            // Patrón: palabra palabra o palabra AS palabra
            const regexAlias = /^(.+?)\s+(?:AS\s+)?(\w+)$/i;
            const matchAlias = col.match(regexAlias);
            
            let nombre = col;
            
            if (matchAlias && matchAlias[1].trim() !== matchAlias[2].trim()) {
                // Hay un alias
                nombre = matchAlias[2].trim();
            } else {
                // No hay alias, extraer el último identificador
                // Remover paréntesis residuales
                nombre = col.split(/[\s\(\)]+/).filter(p => p).pop() || col;
                
                // Si tiene tabla.columna, tomar solo columna
                if (nombre.includes('.')) {
                    nombre = nombre.split('.').pop();
                }
            }
            
            // Limpiar backticks y comillas
            nombre = nombre.replace(/[`"']/g, '');
            
            if (nombre && nombre.length > 0) {
                columnas.push({
                    nombre: nombre,
                    tipo: 'column'
                });
            }
        });
        
        return {columnas: columnas, esSelectAsterisco: false, tabla: ''};
        
    } catch (e) {
        console.error('Error al parsear SQL:', e);
        return {columnas: [], esSelectAsterisco: false, tabla: ''};
    }
}

/**
 * Actualiza la sección de referencia de columnas basada en el SQL ingresado
 */
function actualizarReferenciaColumnas() {
    const sql = document.getElementById('sql_consulta')?.value || '';
    const resultado = extraerColumnasSQL(sql);
    
    // Obtener el contenedor de referencia
    const refDiv = document.getElementById('referenciaColumnas');
    if (!refDiv) {
        console.warn('referenciaColumnas element not found');
        return;
    }
    
    // Si no hay resultado válido
    if (!resultado || (resultado.columnas.length === 0 && !resultado.esSelectAsterisco)) {
        return;
    }
    
    // Si es SELECT *, consultar la tabla real
    if (resultado.esSelectAsterisco) {
        fetch(API_PLANTILLAS + '?action=obtener_columnas_tabla&tabla=' + resultado.tabla)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.columnas) {
                    // Convertir a formato esperado
                    const columnasObj = data.columnas.map(col => ({
                        nombre: col,
                        tipo: 'column'
                    }));
                    mostrarColumnasEnPanel(refDiv, columnasObj);
                } else {
                    mostrarColumnasEnPanel(refDiv, []);
                }
            })
            .catch(error => {
                console.error('Error al obtener columnas:', error);
                mostrarColumnasEnPanel(refDiv, []);
            });
        return;
    }
    
    // Si hay columnas extraídas, mostrarlas
    if (resultado.columnas.length > 0) {
        mostrarColumnasEnPanel(refDiv, resultado.columnas);
    }
}

/**
 * Muestra las columnas en el panel de referencia
 */
function mostrarColumnasEnPanel(refDiv, columnas) {
    if (!refDiv) return;
    
    // Construir HTML para las columnas
    let columnasHTML = '';
    
    if (columnas.length > 0) {
        columnasHTML = `
            <div class="mb-3">
                <h6 class="fw-bold text-primary"><i class="fas fa-columns"></i> Columnas Disponibles en tu Consulta SQL</h6>
                <div class="d-flex flex-wrap gap-2">
        `;
        
        columnas.forEach(col => {
            columnasHTML += `
                <span class="badge bg-info" style="font-size: 0.85rem; cursor: pointer;" title="Click para copiar" onclick="copiarColumna('${col.nombre}')">
                    [[${col.nombre}]]
                </span>
            `;
        });
        
        columnasHTML += `
                </div>
            </div>
        `;
    } else {
        columnasHTML = `
            <div class="alert alert-warning">
                <strong>No se pudieron extraer las columnas</strong><br>
                <small>Verifica que la tabla exista y la sintaxis SQL sea correcta.</small>
            </div>
        `;
    }
    
    // Actualizar el contenido del card-body
    const cardBody = refDiv.querySelector('.card-body');
    
    if (cardBody) {
        cardBody.innerHTML = `
            <h5 class="mb-3"><i class="fas fa-database"></i> Referencia de Columnas Disponibles</h5>
            ${columnasHTML}
            <p class="text-muted mb-0"><small>Para usar estas columnas en tu plantilla HTML, usa el formato <code>[[nombre_columna]]</code> (ejemplo: <code>[[numero_presupuesto]]</code>, <code>[[descripcion]]</code>). Haz click en cualquier columna arriba para copiarla automáticamente.</small></p>
        `;
        
        // Abrir automáticamente el panel
        const refCollapse = new bootstrap.Collapse(refDiv, { toggle: false });
        refCollapse.show();
    } else {
        // Intentar con .card como fallback
        const card = refDiv.querySelector('.card');
        if (card) {
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="mb-3"><i class="fas fa-database"></i> Referencia de Columnas Disponibles</h5>
                    ${columnasHTML}
                    <p class="text-muted mb-0"><small>Para usar estas columnas en tu plantilla HTML, usa el formato <code>[[nombre_columna]]</code> (ejemplo: <code>[[numero_presupuesto]]</code>, <code>[[descripcion]]</code>). Haz click en cualquier columna arriba para copiarla automáticamente.</small></p>
                </div>
            `;
            const refCollapse = new bootstrap.Collapse(refDiv, { toggle: false });
            refCollapse.show();
        }
    }
}

/**
 * Copia el texto de una columna al portapapeles
 */
function copiarColumna(nombre) {
    const texto = `[[${nombre}]]`;
    navigator.clipboard.writeText(texto).then(() => {
        // Mostrar feedback visual
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            Variable "<code>[[${nombre}]]</code>" copiada a portapapeles
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
}
