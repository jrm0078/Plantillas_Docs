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

document.addEventListener('DOMContentLoaded', function() {
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
        setup: function(editor) {
            // Setup adicional si se necesita en el futuro
        }
    });
}

// CARGAR PLANTILLAS
function cargarPlantillasDisponibles() {
    fetch(API_PLANTILLAS + '?action=listar')
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
                
                // Inicializar Select2 después de cargar las opciones
                $(select).select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: '-- Seleccionar una plantilla --',
                    allowClear: true,
                    language: {
                        noResults: function() {
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
                
                // Cargar directamente el contenido en el editor con campos entre guiones
                tinymce.activeEditor.setContent(plantillaActual.contenido);
                
                // Mostrar solo el editor
                document.getElementById('formularioSection').style.display = 'none';
                document.getElementById('editorSection').style.display = 'block';
                
                mostrarAlerta('Plantilla ' + plantillaActual.nombre + ' cargada', 'success');
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar la plantilla', 'danger');
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
    setTimeout(function() {
        const selectDinamicos = $('#formularioDinamico').find('select');
        selectDinamicos.each(function() {
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
                    noResults: function() {
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

    // Crear ventana nueva con el contenido para capturarlo
    const printWindow = window.open('', '', 'height=600,width=900');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; }
                html, body { 
                    background-color: white !important;
                    background: white !important;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 12px; 
                    line-height: 1.6;
                    padding: 30px;
                    background: white !important;
                    color: #000;
                }
                p { margin-bottom: 10px; }
                h1, h2, h3, h4 { margin: 15px 0 10px 0; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                td, th { border: 1px solid #999; padding: 8px; }
                th { background: #f0f0f0; }
                ul, ol { margin-left: 20px; margin-bottom: 10px; }
                li { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            ${contenido}
        </body>
        </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
        const element = printWindow.document.body;
        const options = {
            margin: 10,
            filename: nombreArchivo + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(options).from(element).save().then(() => {
            printWindow.close();
            mostrarAlerta('PDF descargado correctamente', 'success');
        }).catch((error) => {
            console.error('Error:', error);
            printWindow.close();
            mostrarAlerta('Error al descargar PDF', 'danger');
        });
    }, 500);
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

// COPIAR AL PORTAPAPELES

function copiarAlPortapapeles() {
    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }
    
    const contenido = tinymce.activeEditor.getContent();
    navigator.clipboard.writeText(contenido).then(() => {
        mostrarAlerta('Contenido copiado al portapapeles', 'success');
    }).catch(err => {
        mostrarAlerta('Error al copiar al portapapeles', 'danger');
    });
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
    document.getElementById('formularioDinamico').innerHTML = '';
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
