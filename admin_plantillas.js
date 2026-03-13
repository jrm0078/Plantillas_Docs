const API_PLANTILLAS = './api_plantillas.php';

let plantillaEnEdicion = null;

document.addEventListener('DOMContentLoaded', function () {
    cargarPlantillas();
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
                        <td>${plantilla.tabla_origen || ''}</td>
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
                document.getElementById('tabla_origen').value = data.data.tabla_origen || '';
                document.getElementById('campo_clave').value = data.data.campo_clave || '';
                document.getElementById('sql_consulta').value = data.data.sql_consulta || '';
                document.getElementById('contenido').value = data.data.contenido || '';
                document.getElementById('estado').checked = data.data.estado == 1;
                
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
    const cod = document.getElementById('cod_plantilla').value;
    
    if (!cod || !document.getElementById('nombre').value) {
        mostrarAlerta('Codigo y nombre son requeridos', 'warning');
        return;
    }
    
    const datos = {
        cod_plantilla: cod,
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        tipo_documento: document.getElementById('tipo_documento').value,
        tabla_origen: document.getElementById('tabla_origen').value,
        campo_clave: document.getElementById('campo_clave').value,
        sql_consulta: document.getElementById('sql_consulta').value,
        contenido: document.getElementById('contenido').value,
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
    document.getElementById('tabla_origen').value = '';
    document.getElementById('campo_clave').value = '';
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
