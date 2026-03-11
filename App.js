// URL base de API 
const API_BASE = './';

let presupuestoActual = null;
let editor = null;
document.addEventListener('DOMContentLoaded', function() {
    inicializarEditor();
    cargarListaPresupuestos();
    establecerFechaActual();
    configurarEventosFormulario();
});

// Inicializar TinyMCE
function inicializarEditor() {
    tinymce.init({
        selector: '#documento-editor',
        height: 600,
        menubar: 'file edit view insert format tools table help',
        plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking save table directionality emoticons template paste textpattern',
        toolbar: 'undo redo | styleselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview fullscreen | table charmap emoticons',
        style_formats: [
            { title: 'Encabezado 1', format: 'h1' },
            { title: 'Encabezado 2', format: 'h2' },
            { title: 'Encabezado 3', format: 'h3' },
            { title: 'Párrafo', format: 'p' },
        ],
        font_formats: 'Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; AkrutiSans Medium=Akruti Sans Medium;Calibri=calibri,sans-serif;Cambria=cambria,georgia,serif;',
        paste_as_text: false,
        branding: false,
        license_key: 'gpl'
    });
}

// Cargar lista de presupuestos
function cargarListaPresupuestos() {
    fetch(API_BASE + 'api_presupuestos.php?action=listar')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('selectPresupuesto');
                data.data.forEach(presupuesto => {
                    const option = document.createElement('option');
                    option.value = presupuesto.id;
                    option.textContent = `${presupuesto.num_presupuesto} - ${presupuesto.cliente}`;
                    select.appendChild(option);
                });
            } else {
                console.error('Error:', data.error);
                mostrarAlerta('Error al cargar presupuestos: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error de conexión con el servidor', 'danger');
        });
}

// Cargar presupuesto seleccionado
function cargarPresupuesto() {
    const id = document.getElementById('selectPresupuesto').value;
    
    if (!id) {
        limpiarFormulario();
        return;
    }
    
    fetch(API_BASE + 'api_presupuestos.php?action=obtener&id=' + id)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                presupuestoActual = data.data;
                rellenarFormulario(data.data);
                generarDocumento();
            } else {
                mostrarAlerta('Error: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar el presupuesto', 'danger');
        });
}

// Rellenar el formulario con datos del presupuesto
function rellenarFormulario(data) {
    document.getElementById('cliente').value = data.cliente || '';
    document.getElementById('numPresupuesto').value = data.num_presupuesto || '';
    document.getElementById('fecha').value = data.fecha || '';
    document.getElementById('validez').value = data.validez || 30;
    document.getElementById('descripcion').value = data.descripcion || '';
    document.getElementById('cantidad').value = data.cantidad || 1;
    document.getElementById('precioUnitario').value = data.precio_unitario || '';
    document.getElementById('descuento').value = data.descuento || 0;
}

// Limpiar formulario
function limpiarFormulario() {
    document.getElementById('formulario').querySelectorAll('input, textarea').forEach(input => {
        if (input.type === 'number' && (input.id === 'cantidad' || input.id === 'validez')) {
            input.value = input.id === 'cantidad' ? 1 : 30;
        } else if (input.id === 'descuento') {
            input.value = 0;
        } else {
            input.value = '';
        }
    });
    presupuestoActual = null;
    if (tinymce.activeEditor) {
        tinymce.activeEditor.setContent('');
    }
}

// Nuevo presupuesto
function nuevoPresupuesto() {
    document.getElementById('selectPresupuesto').value = '';
    limpiarFormulario();
    establecerFechaActual();
}

// Establecer fecha actual
function establecerFechaActual() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;
}

// Configurar eventos del formulario
function configurarEventosFormulario() {
    const inputs = document.querySelectorAll('#formulario input, #formulario textarea');
    inputs.forEach(input => {
        input.addEventListener('change', generarDocumento);
        input.addEventListener('input', generarDocumento);
    });
}

// Generar documento automáticamente
function generarDocumento() {
    const cliente = document.getElementById('cliente').value || '';
    const numPresupuesto = document.getElementById('numPresupuesto').value || '';
    const fecha = document.getElementById('fecha').value || '';
    const validez = document.getElementById('validez').value || 30;
    const descripcion = document.getElementById('descripcion').value || '';
    
    const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
    const precioUnitario = parseFloat(document.getElementById('precioUnitario').value) || 0;
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    
    const subtotal = cantidad * precioUnitario;
    const descuentoTotal = (subtotal * descuento) / 100;
    const total = subtotal - descuentoTotal;
    
    const html = `
        <div class="doc-header">
            <h1 class="doc-title">PRESUPUESTO</h1>
            <p class="doc-subtitle">Nº ${numPresupuesto}</p>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:20px;">
            <div>
                <div style="font-weight:600; color:#667eea; font-size:0.85rem; text-transform:uppercase; margin-bottom:3px;">Cliente</div>
                <div style="color:#333; font-size:0.95rem;">${cliente}</div>
            </div>
            <div>
                <div style="font-weight:600; color:#667eea; font-size:0.85rem; text-transform:uppercase; margin-bottom:3px;">Fecha</div>
                <div style="color:#333; font-size:0.95rem;">${fecha}</div>
            </div>
        </div>
        
        <div style="margin-bottom:15px;">
            <div style="font-weight:600; color:#667eea; font-size:0.85rem; text-transform:uppercase; margin-bottom:3px;">Validez</div>
            <div style="color:#333; font-size:0.95rem;">${validez} días desde la emisión</div>
        </div>
        
        <hr style="border:0; border-top:1px solid #e0e0e0; margin:20px 0;">
        
        <div style="margin:20px 0; padding:15px; background:#f8f9fa; border-left:4px solid #667eea;">
            <div style="font-weight:600; color:#667eea; font-size:0.85rem; text-transform:uppercase; margin-bottom:10px;">Descripción</div>
            <div style="color:#333; font-size:0.95rem;">${descripcion}</div>
        </div>
        
        <table style="width:100%; margin-top:20px; border-collapse:collapse;">
            <tr style="background:#667eea; color:white;">
                <th style="padding:12px; text-align:left; border:1px solid #667eea;">Concepto</th>
                <th style="padding:12px; text-align:center; border:1px solid #667eea;">Cantidad</th>
                <th style="padding:12px; text-align:center; border:1px solid #667eea;">P.U.</th>
                <th style="padding:12px; text-align:right; border:1px solid #667eea;">Subtotal</th>
            </tr>
            
            <tr style="border-bottom:1px solid #e0e0e0;">
                <td style="padding:12px; border:1px solid #e0e0e0;">${descripcion}</td>
                <td style="padding:12px; text-align:center; border:1px solid #e0e0e0;">${cantidad}</td>
                <td style="padding:12px; text-align:center; border:1px solid #e0e0e0;">${precioUnitario.toFixed(2)} €</td>
                <td style="padding:12px; text-align:right; border:1px solid #e0e0e0;">${subtotal.toFixed(2)} €</td>
            </tr>
            
            <tr style="background:#f8f9fa; font-weight:bold;">
                <td colspan="3" style="padding:12px; text-align:right; border:1px solid #e0e0e0;">Descuento (${descuento}%):</td>
                <td style="padding:12px; text-align:right; border:1px solid #e0e0e0;">-${descuentoTotal.toFixed(2)} €</td>
            </tr>
            
            <tr style="background:#667eea; color:white; font-size:1.1rem; font-weight:bold;">
                <td colspan="3" style="padding:12px; text-align:right; border:1px solid #667eea;">TOTAL:</td>
                <td style="padding:12px; text-align:right; border:1px solid #667eea;">${total.toFixed(2)} €</td>
            </tr>
        </table>
    `;
    
    if (tinymce.activeEditor) {
        tinymce.activeEditor.setContent(html);
    }
}

// Guardar presupuesto en BD
function guardarPresupuesto() {
    const data = {
        id: presupuestoActual ? presupuestoActual.id : null,
        cliente: document.getElementById('cliente').value,
        num_presupuesto: document.getElementById('numPresupuesto').value,
        fecha: document.getElementById('fecha').value,
        validez: document.getElementById('validez').value,
        descripcion: document.getElementById('descripcion').value,
        cantidad: document.getElementById('cantidad').value,
        precio_unitario: document.getElementById('precioUnitario').value,
        descuento: document.getElementById('descuento').value
    };
    
    if (!data.cliente || !data.num_presupuesto || !data.fecha) {
        mostrarAlerta('Por favor completa los campos: Cliente, Número de Presupuesto y Fecha', 'warning');
        return;
    }
    
    fetch(API_BASE + 'api_presupuestos.php?action=guardar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarAlerta(data.message, 'success');
            if (!presupuestoActual) {
                // Si es nuevo, recargamos la lista
                document.getElementById('selectPresupuesto').innerHTML = '<option value="">-- Seleccionar un presupuesto --</option>';
                cargarListaPresupuestos();
            }
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarAlerta('Error al guardar el presupuesto', 'danger');
    });
}

// Descargar PDF
function descargarPDF() {
    if (!tinymce.activeEditor) {
        mostrarAlerta('Por favor espera a que se cargue el editor', 'warning');
        return;
    }
    
    const contenido = tinymce.activeEditor.getContent();
    const elemento = document.createElement('div');
    elemento.innerHTML = contenido;
    elemento.style.padding = '20px';
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `presupuesto_${document.getElementById('numPresupuesto').value || 'documento'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(elemento).save();
    mostrarAlerta('PDF descargado correctamente', 'success');
}

// Imprimir documento
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

// Copiar al portapapeles
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

// Mostrar alertas
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
    
    // Insertar al inicio del contenedor
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    // Auto-desaparecer después de 4 segundos
    setTimeout(() => {
        const alerta = document.getElementById(alertId);
        if (alerta) alerta.remove();
    }, 4000);
}