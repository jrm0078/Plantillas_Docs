// GENERADOR DE DOCUMENTOS CON PLANTILLAS

const API_BASE = './';
const API_PLANTILLAS = API_BASE + 'api_plantillas.php';

let plantillaActual = null;
let datosFormulario = {};
let editor = null;

// INICIALIZACIÓN

document.addEventListener('DOMContentLoaded', function() {
    cargarPlantillasDisponibles();
    inicializarEditor();
});

// INICIALIZAR TINYMCE
function inicializarEditor() {
    tinymce.init({
        selector: '#documento-editor',
        height: 600,
        readonly: false,
        menubar: 'file edit view insert format tools table help',
        plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking save table directionality emoticons template paste textpattern',
        toolbar: 'undo redo | styleselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview fullscreen | table charmap emoticons',
        branding: false,
        setup: function(editor) {
            editor.on('change input', function() {
                // Detectar cambios y actualizar campos calculados
                actualizarCamposCalculados();
            });
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
    
    const contenido = tinymce.activeEditor.getContent();
    const elemento = document.createElement('div');
    elemento.innerHTML = contenido;
    elemento.style.padding = '20px';
    
    const nombreArchivo = plantillaActual ? plantillaActual.nombre : 'documento';
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `${nombreArchivo}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(elemento).save();
    mostrarAlerta('PDF descargado correctamente', 'success');
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
    ventana.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">');
    ventana.document.write('<style>body { padding: 20px; } table { border-collapse: collapse; }</style>');
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
    const idCliente = document.getElementById('selectCliente').value || null;
    
    const datos = {
        cod_plantilla: plantillaActual.cod_plantilla,
        id_cliente: idCliente,
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

// ACTUALIZAR CAMPOS CALCULADOS AUTOMÁTICAMENTE

function actualizarCamposCalculados() {
    if (!tinymce.activeEditor || !plantillaActual) return;
    
    const contenido = tinymce.activeEditor.getContent();
    let nuevoContenido = contenido;
    
    // Extraer valores de los campos entre guiones usando expresiones regulares
    const extraerValor = (campo) => {
        // Patrón: -fieldname- seguido de números/texto hasta el siguiente -fieldname- o fin
        const patron = new RegExp(`-${campo}-([\\s\\S]*?)(?=-\\w+-|$)`);
        const match = contenido.match(patron);
        if (match && match[1]) {
            // Extraer solo el primer número encontrado después del campo
            const numMatch = match[1].match(/\\d+(\\.\\d+)?/);
            return numMatch ? parseFloat(numMatch[0]) : 0;
        }
        return 0;
    };
    
    // Cálculos específicos para presupuesto
    if (plantillaActual.cod_plantilla === 'presupuesto_1') {
        const cantidad = extraerValor('cantidad');
        const precio = extraerValor('precio_unitario');
        const descuento = extraerValor('descuento');
        
        // Calcular totales
        const total = cantidad * precio;
        const totalDescuento = total * (descuento / 100);
        const totalFinal = total - totalDescuento;
        
        // Reemplazar campos calculados con valores nuevos
        let contenidoTemp = nuevoContenido;
        contenidoTemp = contenidoTemp.replace(/-total-[\\s\\S]*?(?=-\\w+-|<\\/p>|-descuento-|$)/, `-total-${total.toFixed(2)}`);
        contenidoTemp = contenidoTemp.replace(/-descuento_total-[\\s\\S]*?(?=-\\w+-|<\\/p>|-total_final-|$)/, `-descuento_total-${totalDescuento.toFixed(2)}`);
        contenidoTemp = contenidoTemp.replace(/-total_final-[\\s\\S]*?(?=-\\w+-|<\\/p>|$)/, `-total_final-${totalFinal.toFixed(2)}`);
        
        nuevoContenido = contenidoTemp;
    }
}

// NUEVO DOCUMENTO

function nuevoDocumento() {
    document.getElementById('selectPlantilla').value = '';
    document.getElementById('selectCliente').value = '';
    limpiar();
}

// LIMPIAR

function limpiar() {
    document.getElementById('formularioDinamico').innerHTML = '';
    document.getElementById('formularioSection').style.display = 'none';
    document.getElementById('editorSection').style.display = 'none';
    document.getElementById('clienteSection').style.display = 'none';
    
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
