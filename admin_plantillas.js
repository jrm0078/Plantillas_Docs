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
        language_url: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/langs/es.js',
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
        estado: document.getElementById('estado').checked ? 1 : 0
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
