// GENERADOR DE DOCUMENTOS CON PLANTILLAS
const API_BASE = '../backend/api/';
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
        language: 'es',
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
                
                // Cargar filtros disponibles
                cargarFiltros(cod);
                
                // Mostrar solo el selector de filtros
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

// NUEVO: CARGAR FILTROS DINÁMICAMENTE
function cargarFiltros(cod_plantilla) {
    console.log('Cargando filtros para:', cod_plantilla);
    
    fetch(API_PLANTILLAS + '?action=obtener_filtros&cod=' + cod_plantilla)
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de filtros completa:', JSON.stringify(data, null, 2));
            
            if (data.success) {
                const container = document.getElementById('filtrosContainer');
                console.log('Contenedor encontrado:', container);
                
                container.innerHTML = ''; // Limpiar filtros anteriores
                
                // Crear select para cada filtro
                data.data.forEach(filtro => {
                    console.log('Procesando filtro:', filtro.nombre_filtro, 'Valores:', filtro.valores);
                    
                    const div = document.createElement('div');
                    div.className = 'col-md-6 mb-3';
                    
                    const label = document.createElement('label');
                    label.className = 'form-label fw-bold';
                    label.textContent = filtro.etiqueta + (filtro.requerido ? ' *' : '');
                    
                    const select = document.createElement('select');
                    select.id = 'filtro_' + filtro.nombre_filtro;
                    select.className = 'form-select filtro-select';
                    select.setAttribute('data-filtro', filtro.nombre_filtro);
                    
                    const optionDefault = document.createElement('option');
                    optionDefault.value = '';
                    optionDefault.textContent = '-- Seleccionar ' + filtro.etiqueta.toLowerCase() + ' --';
                    select.appendChild(optionDefault);
                    
                    // Agregar opciones del filtro
                    if (filtro.valores && filtro.valores.length > 0) {
                        console.log('Agregando ' + filtro.valores.length + ' valores a ' + filtro.nombre_filtro);
                        filtro.valores.forEach(valor => {
                            const option = document.createElement('option');
                            option.value = valor.id;
                            option.textContent = valor.valor;
                            select.appendChild(option);
                        });
                    } else {
                        console.warn('No hay valores para el filtro:', filtro.nombre_filtro);
                    }
                    
                    div.appendChild(label);
                    div.appendChild(select);
                    container.appendChild(div);
                });
                
                console.log('Filtros agregados, inicializando Select2');
                
                // Inicializar Select2 en todos los select de filtros
                setTimeout(() => {
                    $('.filtro-select').select2({
                        theme: 'bootstrap-5',
                        width: '100%'
                    });
                    console.log('Select2 inicializado');
                }, 100);
                
            } else {
                console.error('Error en respuesta:', data.error);
                mostrarAlerta('Error al cargar filtros: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error al cargar filtros:', error);
            mostrarAlerta('Error al cargar filtros', 'danger');
        });
}

// APLICAR FILTRO Y OBTENER DATOS
function aplicarFiltro() {
    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    // Recopilar valores de todos los filtros
    const filtros = {};
    let todosCompletos = true;
    
    document.querySelectorAll('.filtro-select').forEach(select => {
        const nombreFiltro = select.getAttribute('data-filtro');
        const valor = select.value;
        
        if (!valor) {
            todosCompletos = false;
        }
        filtros[nombreFiltro] = valor;
    });
    
    if (!todosCompletos || Object.values(filtros).some(v => v === '')) {
        mostrarAlerta('Completa todos los filtros requeridos', 'warning');
        return;
    }
    
    fetch(API_PLANTILLAS + '?action=obtener_datos_filtrados&cod=' + plantillaActual.cod_plantilla + '&filtros=' + encodeURIComponent(JSON.stringify(filtros)))
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Guardar datos del cliente/contrato/oferta
                datosFormulario = data.data;
                
                // Reemplazar variables en la plantilla - DINÁMICO
                let contenido = plantillaActual.contenido;
                
                // Reemplazar TODAS las variables encontradas en los datos
                if (data.data && typeof data.data === 'object') {
                    // Iterar sobre todas las propiedades del objeto data
                    for (let key in data.data) {
                        if (data.data.hasOwnProperty(key)) {
                            const value = data.data[key];
                            
                            // Reemplazar con guiones: -columna-
                            contenido = contenido.replaceAll('-' + key + '-', value || '');
                            
                            // Reemplazar con dobles llaves: {{columna}}
                            contenido = contenido.replaceAll('{{' + key + '}}', value || '');
                            
                            // Reemplazar con triple llave: {{{columna}}}
                            contenido = contenido.replaceAll('{{{' + key + '}}}', value || '');
                        }
                    }
                }
                
                // Cargar en el editor
                if (tinymce.activeEditor) {
                    tinymce.activeEditor.setContent(contenido);
                }
                
                // Mostrar el editor y mantener visible los filtros
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

    if (!document.getElementById('selectCliente').value) {
        mostrarAlerta('Selecciona un cliente primero', 'warning');
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

    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    // Verificar que hay filtros completos
    const filtros = {};
    let todosCompletos = true;
    
    document.querySelectorAll('.filtro-select').forEach(select => {
        const valor = select.value;
        if (!valor) {
            todosCompletos = false;
        }
    });
    
    if (!todosCompletos) {
        mostrarAlerta('Completa todos los filtros primero', 'warning');
        return;
    }

    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }

    const nombreArchivo = (plantillaActual ? plantillaActual.nombre : 'documento').replace(/\s+/g, '_');
    const contenidoEditor = tinymce.activeEditor.getContent();

    // Crear contenedor con el contenido
    const container = document.createElement("div");
    container.id = "pdf-export-container";
    container.style.padding = "15mm";
    container.style.backgroundColor = "#ffffff";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "12px";
    container.style.lineHeight = "1.5";
    container.style.color = "#333333";
    container.style.width = "800px";
    container.style.margin = "0";
    container.innerHTML = contenidoEditor;

    // Agregar al DOM temporalmente
    document.body.appendChild(container);

    // Usar html2canvas para convertir el contenedor a imagen
    html2canvas(container, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
    }).then((canvas) => {
        // Crear PDF con jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Obtener dimensiones del PDF
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular dimensiones de la imagen con márgenes
        const margin = 15; // 15mm de margen
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Convertir canvas a imagen
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Agregar primera página
        let yPosition = margin;
        pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);

        // Si hay contenido que no cabe, agregar páginas adicionales
        let heightLeft = imgHeight - (pageHeight - (margin * 2));
        yPosition = yPosition + imgHeight;

        while (heightLeft > 0) {
            pdf.addPage();
            yPosition = margin;
            pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            heightLeft -= (pageHeight - (margin * 2));
        }

        // Descargar el PDF
        pdf.save(nombreArchivo + '.pdf');
        mostrarAlerta('PDF descargado correctamente', 'success');

        // Limpiar
        document.body.removeChild(container);

    }).catch((error) => {
        console.error('Error al generar PDF:', error);
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        mostrarAlerta('Error al descargar PDF: ' + error.message, 'danger');
    });
}


// IMPRIMIR DOCUMENTO

function imprimirDocumento() {
    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    // Verificar que hay filtros completos
    let todosCompletos = true;
    document.querySelectorAll('.filtro-select').forEach(select => {
        if (!select.value) {
            todosCompletos = false;
        }
    });
    
    if (!todosCompletos) {
        mostrarAlerta('Completa todos los filtros primero', 'warning');
        return;
    }

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
    if (!plantillaActual) {
        mostrarAlerta('Selecciona una plantilla primero', 'warning');
        return;
    }

    // Verificar que hay filtros completos
    let todosCompletos = true;
    document.querySelectorAll('.filtro-select').forEach(select => {
        if (!select.value) {
            todosCompletos = false;
        }
    });
    
    if (!todosCompletos) {
        mostrarAlerta('Completa todos los filtros primero', 'warning');
        return;
    }

    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }

    const contenidoFinal = tinymce.activeEditor.getContent();
    
    // Validar que el contenido no esté vacío
    if (!contenidoFinal || contenidoFinal.trim() === '' || contenidoFinal === '<p></p>') {
        mostrarAlerta('El documento está vacío. Por favor genera un documento con datos válidos', 'warning');
        return;
    }

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
    // Limpiar filtros
    document.querySelectorAll('.filtro-select').forEach(select => {
        select.value = '';
    });
    
    document.getElementById('filtrosContainer').innerHTML = '';
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
