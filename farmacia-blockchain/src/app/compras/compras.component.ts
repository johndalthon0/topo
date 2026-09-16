import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.css']
})
export class ComprasComponent implements OnInit {

  // =====================================================
  // API
  // =====================================================

  api = 'http://127.0.0.1:8000/api/compras/';
  apiMedicamentos = 'http://127.0.0.1:8000/api/medicamentos/';

  // =====================================================
  // DATOS
  // =====================================================

  compras: any[] = [];
  comprasFiltradas: any[] = [];
  medicamentos: any[] = [];

  // =====================================================
  // BUSCADOR
  // =====================================================

  textoBusqueda = '';

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  paginaActual = 1;
  porPagina = 8;

  // =====================================================
  // TARJETAS
  // =====================================================

  totalCompras = 0;
  comprasHoy = 0;
  totalProveedores = 0;
  totalDinero = 0;

  // =====================================================
  // MODAL NUEVA COMPRA / CORRECCIÓN
  // =====================================================

  mostrarModal = false;
  modoCorreccion = false;
  compraOrigenId: number | null = null;
  facturaOrigen = '';

  proveedor = '';
  factura = '';
  observacion = '';

  medicamento = '';
  busquedaMedicamento = '';
  mostrarResultadosMedicamento = false;
  cantidad = 1;
  precioCompra = 0;

  detalleCompra: any[] = [];
  totalCompra = 0;

  // =====================================================
  // MODAL ANULACIÓN
  // =====================================================

  mostrarModalAnular = false;
  compraParaAnular: any = null;
  motivoAnulacion = '';
  procesandoAnulacion = false;

  // =====================================================
  // MODAL DETALLE
  // =====================================================

  mostrarModalDetalle = false;
  detalleSeleccionado: any = null;
  cargandoDetalle = false;

  constructor(private http: HttpClient) {}

  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {
    this.listarCompras();
    this.listarMedicamentos();
  }

  // =====================================================
  // LISTAR COMPRAS
  // =====================================================

  listarCompras(): void {
    this.http.get<any[]>(this.api).subscribe({
      next: (res) => {
        this.compras = Array.isArray(res) ? res : [];
        this.comprasFiltradas = [...this.compras];
        this.paginaActual = 1;

        if (this.textoBusqueda.trim() !== '') {
          this.buscarCompras();
        }

        this.calcularEstadisticas();
      },
      error: (err) => {
        console.error('Error al cargar compras:', err);
      }
    });
  }

  // =====================================================
  // BUSCAR COMPRAS
  // =====================================================

  buscarCompras(): void {
    const texto = this.normalizarTexto(this.textoBusqueda);

    this.paginaActual = 1;

    if (texto === '') {
      this.comprasFiltradas = [...this.compras];
      return;
    }

    this.comprasFiltradas = this.compras.filter((compra: any) => {
      const fecha = this.normalizarTexto(compra.fecha);
      const factura = this.normalizarTexto(compra.factura);
      const proveedor = this.normalizarTexto(compra.proveedor);
      const total = this.normalizarTexto(compra.total);
      const estado = this.normalizarTexto(compra.estado || 'RECIBIDA');
      const motivo = this.normalizarTexto(compra.motivo_anulacion);

      return (
        fecha.includes(texto) ||
        factura.includes(texto) ||
        proveedor.includes(texto) ||
        total.includes(texto) ||
        estado.includes(texto) ||
        motivo.includes(texto)
      );
    });
  }

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(
        this.comprasFiltradas.length / this.porPagina
      )
    );
  }

  get indiceInicio(): number {
    return (
      (this.paginaActual - 1)
      *
      this.porPagina
    );
  }

  get indiceFin(): number {
    return Math.min(
      this.indiceInicio + this.porPagina,
      this.comprasFiltradas.length
    );
  }

  get comprasPagina(): any[] {
    return this.comprasFiltradas.slice(
      this.indiceInicio,
      this.indiceFin
    );
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;

    if (total <= 5) {
      return Array.from(
        { length: total },
        (_, i) => i + 1
      );
    }

    let inicio = Math.max(
      1,
      this.paginaActual - 2
    );

    let fin = Math.min(
      total,
      inicio + 4
    );

    if (fin - inicio < 4) {
      inicio = Math.max(
        1,
        fin - 4
      );
    }

    const paginas: number[] = [];

    for (
      let i = inicio;
      i <= fin;
      i++
    ) {
      paginas.push(i);
    }

    return paginas;
  }

  irPagina(pagina: number): void {
    if (
      pagina < 1
      ||
      pagina > this.totalPaginas
    ) {
      return;
    }

    this.paginaActual = pagina;
  }

  paginaAnterior(): void {
    this.irPagina(
      this.paginaActual - 1
    );
  }

  paginaSiguiente(): void {
    this.irPagina(
      this.paginaActual + 1
    );
  }


  normalizarTexto(valor: any): string {
    return String(valor ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.comprasFiltradas = [...this.compras];
    this.paginaActual = 1;
  }

  // =====================================================
  // ESTADÍSTICAS
  // =====================================================

  calcularEstadisticas(): void {
    this.totalCompras = this.compras.length;
    this.comprasHoy = 0;
    this.totalDinero = 0;

    const proveedores = new Set<string>();
    const hoy = new Date();
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth() + 1;
    const diaHoy = hoy.getDate();

    this.compras.forEach((compra: any) => {
      const anulada = this.normalizarTexto(compra.estado) === 'anulada';

      // Las compras anuladas se mantienen en el historial,
      // pero no se incluyen en los valores económicos activos.
      if (!anulada) {
        this.totalDinero += Number(compra.total || 0);

        if (compra.proveedor !== null && compra.proveedor !== undefined) {
          const nombreProveedor = String(compra.proveedor).trim().toLowerCase();
          if (nombreProveedor !== '') {
            proveedores.add(nombreProveedor);
          }
        }
      }

      if (!compra.fecha || anulada) {
        return;
      }

      let anioCompra = 0;
      let mesCompra = 0;
      let diaCompra = 0;

      if (
        typeof compra.fecha === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(compra.fecha)
      ) {
        const partes = compra.fecha.split('-');
        anioCompra = Number(partes[0]);
        mesCompra = Number(partes[1]);
        diaCompra = Number(partes[2]);
      } else {
        const fechaCompra = new Date(compra.fecha);
        if (!isNaN(fechaCompra.getTime())) {
          anioCompra = fechaCompra.getFullYear();
          mesCompra = fechaCompra.getMonth() + 1;
          diaCompra = fechaCompra.getDate();
        }
      }

      if (
        anioCompra === anioHoy &&
        mesCompra === mesHoy &&
        diaCompra === diaHoy
      ) {
        this.comprasHoy++;
      }
    });

    this.totalProveedores = proveedores.size;
  }

  // =====================================================
  // MEDICAMENTOS
  // =====================================================

  listarMedicamentos(): void {
    this.http.get<any[]>(this.apiMedicamentos).subscribe({
      next: (res) => {
        this.medicamentos = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('Error al cargar medicamentos:', err);
      }
    });
  }

  // =====================================================
  // NUEVA COMPRA
  // =====================================================

  abrirModal(): void {
    this.limpiarFormularioCompra();
    this.modoCorreccion = false;
    this.compraOrigenId = null;
    this.facturaOrigen = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarFormularioCompra();
  }

  limpiarFormularioCompra(): void {
    this.proveedor = '';
    this.factura = '';
    this.observacion = '';
    this.medicamento = '';
    this.busquedaMedicamento = '';
    this.mostrarResultadosMedicamento = false;
    this.cantidad = 1;
    this.precioCompra = 0;
    this.totalCompra = 0;
    this.detalleCompra = [];
    this.modoCorreccion = false;
    this.compraOrigenId = null;
    this.facturaOrigen = '';
  }


  get medicamentosBuscados(): any[] {
    const q = this.busquedaMedicamento.trim().toLowerCase();
    if (!q) return this.medicamentos.slice(0, 10);
    return this.medicamentos.filter((m: any) => {
      const nombre = String(m?.nombre || '').toLowerCase();
      const codigo = String(m?.codigo || '').toLowerCase();
      return nombre.includes(q) || codigo.includes(q);
    }).slice(0, 12);
  }

  seleccionarMedicamentoBuscado(m: any): void {
    this.medicamento = String(m.id);

    this.busquedaMedicamento = m.codigo
      ? `${m.nombre} - ${m.codigo}`
      : m.nombre;

    // Carga automáticamente el precio de compra guardado del medicamento.
    // El campo permanece editable por si el proveedor ofrece un precio diferente.
    this.precioCompra = Number(m.precio_compra ?? 0);

    this.cantidad = 1;
    this.mostrarResultadosMedicamento = false;
  }

  alEscribirMedicamento(): void {
    this.medicamento = '';
    this.mostrarResultadosMedicamento = true;
  }

  // =====================================================
  // AGREGAR PRODUCTO
  // =====================================================

  agregarProducto(): void {
    if (this.medicamento === '') {
      alert('Seleccione un medicamento');
      return;
    }

    if (this.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (this.precioCompra <= 0) {
      alert('Ingrese el precio de compra');
      return;
    }

    const medicamentoEncontrado = this.medicamentos.find(
      (m: any) => String(m.id) === String(this.medicamento)
    );

    if (!medicamentoEncontrado) {
      alert('Medicamento no encontrado');
      return;
    }

    const subtotal = Number(this.cantidad) * Number(this.precioCompra);

    this.detalleCompra.push({
      medicamento: medicamentoEncontrado.id,
      nombreMedicamento: medicamentoEncontrado.nombre,
      cantidad: Number(this.cantidad),
      precio_compra: Number(this.precioCompra),
      subtotal
    });

    this.recalcularTotalCompra();

    this.medicamento = '';
    this.busquedaMedicamento = '';
    this.mostrarResultadosMedicamento = false;
    this.cantidad = 1;
    this.precioCompra = 0;
  }

  eliminarProducto(index: number): void {
    this.detalleCompra.splice(index, 1);
    this.recalcularTotalCompra();
  }

  recalcularTotalCompra(): void {
    this.totalCompra = this.detalleCompra.reduce(
      (total: number, item: any) => total + Number(item.subtotal || 0),
      0
    );
  }

  // =====================================================
  // GUARDAR COMPRA / CORRECCIÓN
  // =====================================================

  guardarCompra(): void {
    if (this.proveedor.trim() === '') {
      alert('Ingrese el proveedor');
      return;
    }

    if (this.factura.trim() === '') {
      alert(
        this.modoCorreccion
          ? 'Ingrese la nueva factura para la compra corregida'
          : 'Ingrese la factura'
      );
      return;
    }

    if (this.detalleCompra.length === 0) {
      alert('Agregue al menos un medicamento');
      return;
    }

    const compra: any = {
      proveedor: this.proveedor,
      factura: this.factura,
      observacion: this.observacion,
      total: Number(this.totalCompra),
      detalle: this.detalleCompra,
      usuario: 'Administrador'
    };

    if (this.modoCorreccion && this.compraOrigenId) {
      compra.compra_origen_id = this.compraOrigenId;
    }

    this.http.post<any>(this.api + 'registrar/', compra).subscribe({
      next: (res) => {
        const mensaje =
          res?.mensaje ||
          (this.modoCorreccion
            ? 'Compra corregida registrada correctamente'
            : 'Compra registrada correctamente');

        alert('✅ ' + mensaje);
        this.cerrarModal();
        this.listarCompras();
      },
      error: (err) => {
        console.error('Error al registrar compra:', err);
        alert('❌ ' + this.obtenerMensajeError(err, 'Error al registrar la compra'));
      }
    });
  }

  // =====================================================
  // VER DETALLE
  // =====================================================

  verCompra(compra: any): void {
    this.mostrarModalDetalle = true;
    this.cargandoDetalle = true;
    this.detalleSeleccionado = null;

    this.http.get<any>(this.api + 'detalle/' + compra.id + '/').subscribe({
      next: (res) => {
        this.detalleSeleccionado = res;
        this.cargandoDetalle = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.cargandoDetalle = false;
        this.mostrarModalDetalle = false;
        alert('❌ ' + this.obtenerMensajeError(err, 'No se pudo cargar el detalle'));
      }
    });
  }

  cerrarDetalle(): void {
    this.mostrarModalDetalle = false;
    this.detalleSeleccionado = null;
    this.cargandoDetalle = false;
  }

  // =====================================================
  // ANULAR COMPRA
  // =====================================================

  puedeAnular(compra: any): boolean {
    if (typeof compra?.puede_anular === 'boolean') {
      return compra.puede_anular;
    }

    return this.normalizarTexto(compra?.estado) !== 'anulada';
  }

  abrirAnulacion(compra: any): void {
    if (!this.puedeAnular(compra)) {
      alert('Esta compra ya se encuentra anulada');
      return;
    }

    this.compraParaAnular = compra;
    this.motivoAnulacion = '';
    this.mostrarModalAnular = true;
  }

  cerrarAnulacion(): void {
    if (this.procesandoAnulacion) {
      return;
    }

    this.mostrarModalAnular = false;
    this.compraParaAnular = null;
    this.motivoAnulacion = '';
  }

  confirmarAnulacion(): void {
    if (!this.compraParaAnular) {
      return;
    }

    const motivo = this.motivoAnulacion.trim();

    if (motivo === '') {
      alert('Debe indicar el motivo de la anulación');
      return;
    }

    if (motivo.length < 5) {
      alert('El motivo debe tener al menos 5 caracteres');
      return;
    }

    this.procesandoAnulacion = true;

    const datos = {
      motivo,
      usuario: 'Administrador'
    };

    this.http
      .post<any>(this.api + 'anular/' + this.compraParaAnular.id + '/', datos)
      .subscribe({
        next: (res) => {
          this.procesandoAnulacion = false;

          alert(
            '✅ ' +
            (res?.mensaje || 'Compra anulada correctamente') +
            '\nEl stock fue revertido y la anulación quedó registrada.'
          );

          this.cerrarAnulacion();
          this.listarCompras();
        },
        error: (err) => {
          this.procesandoAnulacion = false;
          console.error('Error al anular compra:', err);
          alert('❌ ' + this.obtenerMensajeError(err, 'No se pudo anular la compra'));
        }
      });
  }

  // =====================================================
  // CORREGIR COMPRA ANULADA
  // =====================================================

  puedeCorregir(compra: any): boolean {
    if (typeof compra?.puede_corregir === 'boolean') {
      return compra.puede_corregir;
    }

    return (
      this.normalizarTexto(compra?.estado) === 'anulada' &&
      !compra?.correccion_id
    );
  }

  corregirCompra(compra: any): void {
    if (!this.puedeCorregir(compra)) {
      if (this.normalizarTexto(compra?.estado) !== 'anulada') {
        alert('Primero debe anular la compra para poder corregirla');
      } else {
        alert('Esta compra ya tiene una corrección registrada');
      }
      return;
    }

    this.http.get<any>(this.api + 'detalle/' + compra.id + '/').subscribe({
      next: (detalle) => {
        this.limpiarFormularioCompra();

        this.modoCorreccion = true;
        this.compraOrigenId = compra.id;
        this.facturaOrigen = compra.factura;

        this.proveedor = detalle.proveedor || compra.proveedor || '';
        this.factura = '';
        this.observacion = detalle.observacion || '';

        const detalles = Array.isArray(detalle.detalle) ? detalle.detalle : [];

        this.detalleCompra = detalles.map((d: any) => {
          let medicamentoId = d.medicamento_id;

          if (!medicamentoId) {
            const encontrado = this.medicamentos.find(
              (m: any) =>
                this.normalizarTexto(m.nombre) ===
                this.normalizarTexto(d.medicamento)
            );

            medicamentoId = encontrado?.id || '';
          }

          const precio = Number(d.precio_compra ?? d.precio ?? 0);
          const cantidad = Number(d.cantidad || 0);

          return {
            medicamento: medicamentoId,
            nombreMedicamento: d.medicamento,
            cantidad,
            precio_compra: precio,
            subtotal: Number(d.subtotal ?? cantidad * precio)
          };
        });

        this.recalcularTotalCompra();
        this.mostrarModal = true;
      },
      error: (err) => {
        console.error('Error al preparar corrección:', err);
        alert('❌ ' + this.obtenerMensajeError(err, 'No se pudo cargar la compra para corregirla'));
      }
    });
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  obtenerMensajeError(error: any, mensajePorDefecto: string): string {
    return (
      error?.error?.mensaje ||
      error?.error?.error ||
      error?.message ||
      mensajePorDefecto
    );
  }
}
