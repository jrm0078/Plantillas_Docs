// GENERADOR DE DOCUMENTOS CON PLANTILLAS
const API_BASE = './';
const API_PLANTILLAS = API_BASE + 'api_plantillas.php';

let plantillaActual = null;
let datosFormulario = {};

// Esperar a que jQuery esté disponible
function esperarJQuery() {
    if (typeof jQuery !== 'undefined') {
        return Promise.resolve();
    }
    return new Promise(resolve => {
        setTimeout(() => esperarJQuery().then(resolve), 100);
    });
}

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', function () {
    esperarJQuery().then(() => {
        cargarPlantillasDisponibles();
        inicializarEditor();
    });
});

// INICIALIZAR TINYMCE
function inicializarEditor() {
    tinymce.init({
        selector: '#documento-editor',
        height: 600,
        readonly: false,
        menubar: 'file edit view insert format tools',
        plugins: 'advlist autolink lists link image charmap anchor searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking table',
        toolbar: 'undo redo | styleselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | fullscreen | table',
        branding: false,
        valid_elements: '*[*]',
        extended_valid_elements: '*[*]',
        setup: function (editor) {
            // Setup adicional si se necesita en el futuro
        }
    });
}

// CARGAR PLANTILLAS
function cargarPlantillasDisponibles() {
    fetch(API_PLANTILLAS + '?action=listar_activas')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('selectPlantilla');
                data.data.forEach(plantilla => {
                    const option = document.createElement('option');
                    option.value = plantilla.cod_plantilla;
                    option.textContent = `${plantilla.nombre} - ${plantilla.descripcion || ''}`;
                    select.appendChild(option);
                });

                // Inicializar Select2 después de cargar
                $(select).select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: '-- Seleccionar una plantilla --',
                    allowClear: true,
                    language: {
                        noResults: function () {
                            return 'No se encontraron resultados';
                        }
                    }
                });
            } else {
                mostrarAlerta('Error al cargar plantillas: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error de conexión', 'danger');
        });
}

// CARGAR PLANTILLA SELECCIONADA
function cargarPlantilla() {
    const cod = document.getElementById('selectPlantilla').value;

    if (!cod) {
        limpiar();
        return;
    }

    fetch(API_PLANTILLAS + '?action=obtener&cod=' + cod)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                plantillaActual = data.data;
                
                // Cargar clientes disponibles
                cargarClientes();
                
                // Mostrar solo el selector de cliente
                document.getElementById('filtroSection').style.display = 'block';
                document.getElementById('formularioSection').style.display = 'none';
                document.getElementById('editorSection').style.display = 'none';
                
                mostrarAlerta('Plantilla ' + plantillaActual.nombre + ' seleccionada', 'success');
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar la plantilla', 'danger');
        });
}

// CARGAR CLIENTES
function cargarClientes() {
    fetch(API_PLANTILLAS + '?action=clientes')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('selectCliente');
                select.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
                
                data.data.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.id;
                    option.textContent = cliente.nombre + ' (' + cliente.nif + ')';
                    select.appendChild(option);
                });
                
                // Inicializar Select2
                if ($(select).hasClass('select2-hidden-accessible')) {
                    $(select).select2('destroy');
                }
                $(select).select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: '-- Seleccionar cliente --',
                    allowClear: true
                });
            } else {
                mostrarAlerta('Error al cargar clientes: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error de conexión', 'danger');
        });
}

// APLICAR FILTRO Y OBTENER DATOS
function aplicarFiltro() {
    const idCliente = document.getElementById('selectCliente').value;
    
    if (!idCliente) {
        mostrarAlerta('Selecciona un cliente', 'warning');
        return;
    }
    
    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }
    
    fetch(API_PLANTILLAS + '?action=obtener_datos&cod=' + plantillaActual.cod_plantilla + '&filtro=' + idCliente)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Guardar datos del cliente
                datosFormulario = data.data;
                
                // Reemplazar variables en la plantilla
                let contenido = plantillaActual.contenido;
                
                // Reemplazar cada campo de la BD con sus equivalentes en todas las plantillas
                if (data.data.nombre) {
                    contenido = contenido.replaceAll('-nombre-', data.data.nombre);
                    contenido = contenido.replaceAll('-cliente-', data.data.nombre);
                }
                if (data.data.nif) {
                    contenido = contenido.replaceAll('-dni-', data.data.nif);
                }
                if (data.data.email) {
                    contenido = contenido.replaceAll('-email-', data.data.email);
                }
                if (data.data.telefono) {
                    contenido = contenido.replaceAll('-telefono-', data.data.telefono);
                }
                if (data.data.direccion) {
                    contenido = contenido.replaceAll('-domicilio-', data.data.direccion);
                }
                if (data.data.provincia) {
                    contenido = contenido.replaceAll('-provincia-', data.data.provincia);
                }
                if (data.data.edad) {
                    contenido = contenido.replaceAll('-edad-', data.data.edad);
                }
                if (data.data.ciudad) {
                    contenido = contenido.replaceAll('-ciudad-', data.data.ciudad);
                }
                if (data.data.cif) {
                    contenido = contenido.replaceAll('-cif-', data.data.cif);
                }
                
                // Cargar en el editor
                if (tinymce.activeEditor) {
                    tinymce.activeEditor.setContent(contenido);
                }
                
                // Mostrar el editor y mantener visible el selector de cliente
                document.getElementById('filtroSection').style.display = 'block';
                document.getElementById('formularioSection').style.display = 'none';
                document.getElementById('editorSection').style.display = 'block';
                
                mostrarAlerta('Documento cargado correctamente', 'success');
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al obtener datos', 'danger');
        });
}

// MOSTRAR FORMULARIO DINÁMICO

function mostrarFormularioDinamico() {
    const container = document.getElementById('formularioDinamico');
    container.innerHTML = '';

    if (!plantillaActual.variables || plantillaActual.variables.length === 0) {
        mostrarAlerta('Esta plantilla no tienen campos configurados', 'warning');
        return;
    }

    plantillaActual.variables.forEach(variable => {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `
            <div class="col-md-${variable.tipo === 'textarea' ? '12' : '6'} campo-dinamico">
                <label>
                    ${variable.etiqueta}
                    ${variable.requerido ? '<span class="badge-requerido">*</span>' : ''}
                </label>
                ${crearCampoInput(variable)}
            </div>
        `;
        container.appendChild(div);
    });

    // Inicializar Select2 en los select dinámicos
    setTimeout(function () {
        const selectDinamicos = $('#formularioDinamico').find('select');
        selectDinamicos.each(function () {
            // Destruir Select2 anterior si existe
            if ($(this).hasClass('select2-hidden-accessible')) {
                $(this).select2('destroy');
            }
            // Inicializar Select2 nuevo
            $(this).select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: '-- Seleccionar --',
                allowClear: true,
                language: {
                    noResults: function () {
                        return 'No se encontraron resultados';
                    }
                }
            });
        });
    }, 200);

    document.getElementById('formularioSection').style.display = 'block';
    document.getElementById('editorSection').style.display = 'block';
}

// CREAR CAMPO DE INPUT DINÁMICO
function crearCampoInput(variable) {
    const id = 'var_' + variable.nombre_variable;

    switch (variable.tipo) {
        case 'textarea':
            return `<textarea id="${id}" class="form-control" placeholder="${variable.etiqueta}"></textarea>`;

        case 'number':
            return `<input type="number" id="${id}" class="form-control" placeholder="${variable.etiqueta}">`;

        case 'date':
            return `<input type="date" id="${id}" class="form-control">`;

        case 'email':
            return `<input type="email" id="${id}" class="form-control" placeholder="${variable.etiqueta}">`;

        case 'select':
            return `<select id="${id}" class="form-control">
                        <option value="">-- Seleccionar --</option>
                    </select>`;

        default:
            return `<input type="text" id="${id}" class="form-control" placeholder="${variable.etiqueta}">`;
    }
}

// GENERAR DOCUMENTO

function generarDocumento() {
    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    // Recopilar datos del formulario
    datosFormulario = {};
    plantillaActual.variables.forEach(variable => {
        const inputId = 'var_' + variable.nombre_variable;
        const input = document.getElementById(inputId);
        if (input) {
            datosFormulario[variable.nombre_variable] = input.value;
        }
    });

    // Llamar API para reemplazar variables
    fetch(API_PLANTILLAS + '?action=reemplazar&cod=' + plantillaActual.cod_plantilla, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosFormulario)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Cargar contenido reemplazado en TinyMCE
                if (tinymce.activeEditor) {
                    tinymce.activeEditor.setContent(data.data.contenido);
                }
                mostrarAlerta('Documento generado correctamente', 'success');
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al generar documento', 'danger');
        });
}

// DESCARGAR PDF

function descargarPDF() {

    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }

    const nombreArchivo = plantillaActual ? plantillaActual.nombre : 'documento';
    const contenido = tinymce.activeEditor.getContent();

    const container = document.createElement("div");

    container.innerHTML = contenido;

    container.style.background = "#ffffff";
    container.style.padding = "10px";
    container.style.width = "190mm"; 
    container.style.margin = "0 auto";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "12px";
    container.style.lineHeight = "1.6";
    container.style.boxSizing = "border-box";
    container.style.minHeight = "297mm";

    document.body.appendChild(container);

    const options = {
        margin: 8,
        filename: nombreArchivo + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },
        jsPDF: {
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        }
    };

    html2pdf()
        .set(options)
        .from(container)
        .save()
        .then(() => {
            document.body.removeChild(container);
            mostrarAlerta('PDF descargado correctamente', 'success');
        })
        .catch((error) => {
            console.error(error);
            document.body.removeChild(container);
            mostrarAlerta('Error al descargar PDF', 'danger');
        });
}


// IMPRIMIR DOCUMENTO

function imprimirDocumento() {
    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }

    const contenido = tinymce.activeEditor.getContent();
    const ventana = window.open('', '', 'height=600,width=800');
    ventana.document.write('<html><head><title>Imprimir Documento</title>');
    ventana.document.write('<style>body { padding: 20px; font-family: Arial, sans-serif; }</style>');
    ventana.document.write('</head><body>');
    ventana.document.write(contenido);
    ventana.document.write('</body></html>');
    ventana.document.close();
    ventana.print();
}

// GUARDAR DOCUMENTO

function guardarDocumento() {
    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }

    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    const contenidoFinal = tinymce.activeEditor.getContent();

    const datos = {
        cod_plantilla: plantillaActual.cod_plantilla,
        id_cliente: null,
        contenido_final: contenidoFinal,
        datos: datosFormulario
    };

    fetch(API_PLANTILLAS + '?action=guardar_documento', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarAlerta('Documento guardado correctamente', 'success');
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al guardar documento', 'danger');
        });
}

// NUEVO DOCUMENTO

function nuevoDocumento() {
    document.getElementById('selectPlantilla').value = '';
    limpiar();
}

// LIMPIAR

function limpiar() {
    document.getElementById('selectCliente').value = '';
    document.getElementById('formularioDinamico').innerHTML = '';
    document.getElementById('filtroSection').style.display = 'none';
    document.getElementById('formularioSection').style.display = 'none';
    document.getElementById('editorSection').style.display = 'none';

    if (tinymce.activeEditor) {
        tinymce.activeEditor.setContent('');
    }

    plantillaActual = null;
    datosFormulario = {};
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

    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);

    setTimeout(() => {
        const alerta = document.getElementById(alertId);
        if (alerta) alerta.remove();
    }, 4000);
}
