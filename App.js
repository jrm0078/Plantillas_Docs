let plantilla = localStorage.getItem("plantilla");

let formulario = document.getElementById("formulario");
let titulo = document.getElementById("titulo");
let documento = document.getElementById("documento");

if(plantilla === "presupuesto"){
  titulo.innerText = "Formulario Presupuesto";

  formulario.innerHTML = `
    <div class="row">
      <div class="col-md-6 mb-3">
        <label class="form-label fw-bold">Cliente</label>
        <input type="text" id="cliente" class="form-control" placeholder="Nombre del cliente">
      </div>

      <div class="col-md-6 mb-3">
        <label class="form-label fw-bold">Número de Presupuesto</label>
        <input type="text" id="numPresupuesto" class="form-control" placeholder="PRE-001">
      </div>
    </div>

    <div class="row">
      <div class="col-md-6 mb-3">
        <label class="form-label fw-bold">Fecha</label>
        <input type="date" id="fecha" class="form-control">
      </div>

      <div class="col-md-6 mb-3">
        <label class="form-label fw-bold">Validez (días)</label>
        <input type="number" id="validez" class="form-control" value="30">
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-bold">Descripción del Servicio</label>
      <textarea id="descripcion" class="form-control" rows="3" placeholder="Detalle el servicio o producto..."></textarea>
    </div>

    <div class="row">
      <div class="col-md-4 mb-3">
        <label class="form-label fw-bold">Cantidad</label>
        <input type="number" id="cantidad" class="form-control" value="1">
      </div>

      <div class="col-md-4 mb-3">
        <label class="form-label fw-bold">Precio Unitario</label>
        <input type="number" id="precioUnitario" class="form-control" placeholder="0.00" step="0.01">
      </div>

      <div class="col-md-4 mb-3">
        <label class="form-label fw-bold">Descuento (%)</label>
        <input type="number" id="descuento" class="form-control" value="0">
      </div>
    </div>
  `;

  activarActualizacionAutomatica();
  generarDocumento();
}


function activarActualizacionAutomatica(){
  let inputs = document.querySelectorAll("#formulario input, #formulario textarea");

  inputs.forEach(input => {
    input.addEventListener("input", generarDocumento);
  });
}


function generarDocumento(){

if(plantilla === "presupuesto"){

  let cliente = document.getElementById("cliente").value || "";
  let numPresupuesto = document.getElementById("numPresupuesto").value || "";
  let fecha = document.getElementById("fecha").value || "";
  let validez = document.getElementById("validez").value || "";
  let descripcion = document.getElementById("descripcion").value || "";

  let cantidad = parseFloat(document.getElementById("cantidad").value) || 0;
  let precioUnitario = parseFloat(document.getElementById("precioUnitario").value) || 0;
  let descuento = parseFloat(document.getElementById("descuento").value) || 0;

  let subtotal = cantidad * precioUnitario;
  let descuentoTotal = (subtotal * descuento)/100;
  let total = subtotal - descuentoTotal;

  documento.innerHTML = `
    <div class="doc-header">
      <h1 class="doc-title">PRESUPUESTO</h1>
      <p class="doc-subtitle">Nº ${numPresupuesto}</p>
    </div>

    <div class="doc-row">
      <div class="doc-field">
        <div class="doc-label">Cliente</div>
        <div class="doc-value">${cliente}</div>
      </div>

      <div class="doc-field">
        <div class="doc-label">Fecha</div>
        <div class="doc-value">${fecha}</div>
      </div>
    </div>

    <div class="doc-field mb-3">
      <div class="doc-label">Validez</div>
      <div class="doc-value">${validez} días desde la emisión</div>
    </div>

    <hr>

    <div style="margin:20px 0;padding:15px;background:#f8f9fa;border-left:4px solid #667eea;">
      <div class="doc-label mb-2">Descripción</div>
      <div class="doc-value">${descripcion}</div>
    </div>

    <table class="w-100" style="margin-top:20px;">
      <tr style="background:#667eea;color:white;">
        <th class="p-2" style="text-align:left;">Concepto</th>
        <th class="p-2" style="text-align:center;">Cantidad</th>
        <th class="p-2" style="text-align:center;">P.U.</th>
        <th class="p-2" style="text-align:right;">Subtotal</th>
      </tr>

      <tr style="border-bottom:1px solid #e0e0e0;">
        <td class="p-2">${descripcion}</td>
        <td class="p-2" style="text-align:center;">${cantidad}</td>
        <td class="p-2" style="text-align:center;">${precioUnitario.toFixed(2)} €</td>
        <td class="p-2" style="text-align:right;">${subtotal.toFixed(2)} €</td>
      </tr>

      <tr style="background:#f8f9fa;font-weight:bold;">
        <td colspan="3" class="p-2" style="text-align:right;">Descuento (${descuento}%):</td>
        <td class="p-2" style="text-align:right;">-${descuentoTotal.toFixed(2)} €</td>
      </tr>

      <tr style="background:#667eea;color:white;font-size:1.1rem;font-weight:bold;">
        <td colspan="3" class="p-2" style="text-align:right;">TOTAL:</td>
        <td class="p-2" style="text-align:right;">${total.toFixed(2)} €</td>
      </tr>
    </table>
  `;
}

}


function descargarPDF(){
  html2pdf().from(documento).save("documento.pdf");
}