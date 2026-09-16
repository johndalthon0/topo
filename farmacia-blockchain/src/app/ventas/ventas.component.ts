import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';


@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.css']
})
export class VentasComponent implements OnInit {


  // =========================================
  // API
  // =========================================

  api =
    'http://127.0.0.1:8000/api/ventas/';

  apiMedicamentos =
    'http://127.0.0.1:8000/api/medicamentos/';


  // =========================================
  // VENTAS
  // =========================================

  ventas: any[] = [];

  ventasFiltradas: any[] = [];

  busqueda = '';


  // =========================================
  // PAGINACIÓN
  // =========================================

  paginaActual = 1;

  porPagina = 8;



  // =========================================
  // ESTADÍSTICAS
  // =========================================

  totalVentas = 0;

  ventasHoy = 0;

  totalDia = 0;

  productosVendidos = 0;


  // =========================================
  // MEDICAMENTOS
  // =========================================

  medicamentos: any[] = [];


  // =========================================
  // MODAL NUEVA / CORREGIR VENTA
  // =========================================

  mostrarNuevaVenta = false;

  modoCorreccion = false;

  ventaOrigen: any = null;


  cliente = '';

  observacion = '';


  // =========================================
  // PRODUCTO SELECCIONADO
  // =========================================

  medicamentoSeleccionado = '';
  busquedaMedicamentoVenta = '';
  mostrarResultadosMedicamentoVenta = false;

  cantidad = 1;

  precioVenta = 0;


  // =========================================
  // DETALLE DE LA VENTA
  // =========================================

  detalleVenta: any[] = [];

  totalVenta = 0;


  // =========================================
  // MODAL DETALLE
  // =========================================

  mostrarDetalle = false;

  detalleVentaSeleccionada: any = null;


  // =========================================
  // MODAL ANULACIÓN
  // =========================================

  mostrarAnulacion = false;

  ventaParaAnular: any = null;

  motivoAnulacion = '';

  anulandoVenta = false;


  // =========================================
  // GUARDANDO
  // =========================================

  guardandoVenta = false;


  constructor(
    private http: HttpClient
  ) {}


  // =========================================
  // INICIO
  // =========================================

  ngOnInit(): void {

    this.listarVentas();

    this.listarMedicamentos();

  }


  // =========================================
  // LISTAR VENTAS
  // =========================================

  listarVentas(): void {

    this.http
      .get<any[]>(this.api)
      .subscribe({

        next: (res) => {

          console.log(
            'VENTAS RECIBIDAS:',
            res
          );

          this.ventas = res;

          this.ventasFiltradas = [
            ...res
          ];

          this.paginaActual = 1;

          if (
            this.busqueda.trim() !== ''
          ) {

            this.buscarVentas();

          }

          this.calcularEstadisticas();

        },

        error: (err) => {

          console.error(
            'Error al cargar ventas:',
            err
          );

        }

      });

  }


  // =========================================
  // LISTAR MEDICAMENTOS
  // =========================================

  listarMedicamentos(): void {

    this.http
      .get<any[]>(
        this.apiMedicamentos
      )
      .subscribe({

        next: (res) => {

          this.medicamentos = res;

        },

        error: (err) => {

          console.error(
            'Error al cargar medicamentos:',
            err
          );

        }

      });

  }


  // =========================================
  // CALCULAR ESTADÍSTICAS
  // =========================================

  calcularEstadisticas(): void {

    this.totalVentas = 0;

    this.ventasHoy = 0;

    this.totalDia = 0;

    this.productosVendidos = 0;


    const hoy = new Date();

    const anioHoy =
      hoy.getFullYear();

    const mesHoy =
      hoy.getMonth() + 1;

    const diaHoy =
      hoy.getDate();


    this.ventas.forEach(
      (venta: any) => {


        // Las anuladas quedan en el historial,
        // pero ya no cuentan como ventas reales.
        if (
          this.esVentaAnulada(
            venta
          )
        ) {

          return;

        }


        this.totalVentas++;


        if (
          venta.detalle
          &&
          Array.isArray(
            venta.detalle
          )
        ) {

          venta.detalle.forEach(
            (detalle: any) => {

              this.productosVendidos +=
                Number(
                  detalle.cantidad || 0
                );

            }
          );

        }


        if (!venta.fecha) {

          return;

        }


        let anioVenta = 0;

        let mesVenta = 0;

        let diaVenta = 0;


        if (
          typeof venta.fecha ===
            'string'
          &&
          /^\d{4}-\d{2}-\d{2}$/
            .test(
              venta.fecha
            )
        ) {

          const partes =
            venta.fecha.split('-');

          anioVenta =
            Number(
              partes[0]
            );

          mesVenta =
            Number(
              partes[1]
            );

          diaVenta =
            Number(
              partes[2]
            );

        }
        else {

          const fechaVenta =
            new Date(
              venta.fecha
            );

          if (
            !isNaN(
              fechaVenta.getTime()
            )
          ) {

            anioVenta =
              fechaVenta.getFullYear();

            mesVenta =
              fechaVenta.getMonth()
              + 1;

            diaVenta =
              fechaVenta.getDate();

          }

        }


        if (
          anioVenta === anioHoy
          &&
          mesVenta === mesHoy
          &&
          diaVenta === diaHoy
        ) {

          this.ventasHoy++;

          this.totalDia +=
            Number(
              venta.total || 0
            );

        }

      }
    );

  }


  // =========================================
  // BUSCAR VENTAS
  // =========================================

  buscarVentas(): void {

    this.paginaActual = 1;

    const texto =
      this.normalizarTexto(
        this.busqueda
      );


    if (texto === '') {

      this.ventasFiltradas = [
        ...this.ventas
      ];

      return;

    }


    this.ventasFiltradas =
      this.ventas.filter(
        (venta: any) => {

          const valores = [

            venta.id,

            venta.numero_venta,

            venta.cliente,

            venta.fecha,

            venta.usuario,

            venta.total,

            venta.estado

          ];


          return valores.some(
            valor =>
              this
                .normalizarTexto(
                  valor
                )
                .includes(
                  texto
                )
          );

        }
      );

  }


  // =========================================
  // PAGINACIÓN
  // =========================================

  get totalPaginas(): number {

    return Math.max(

      1,

      Math.ceil(
        this.ventasFiltradas.length
        /
        this.porPagina
      )

    );

  }


  get indiceInicio(): number {

    return (
      (
        this.paginaActual
        -
        1
      )
      *
      this.porPagina
    );

  }


  get indiceFin(): number {

    return Math.min(

      this.indiceInicio
      +
      this.porPagina,

      this.ventasFiltradas.length

    );

  }


  get ventasPagina(): any[] {

    return this.ventasFiltradas.slice(

      this.indiceInicio,

      this.indiceFin

    );

  }


  get paginasVisibles(): number[] {

    const total =
      this.totalPaginas;


    if (
      total <= 5
    ) {

      return Array.from(
        {
          length:
            total
        },
        (
          _,
          i
        ) =>
          i + 1
      );

    }


    let inicio =
      Math.max(
        1,
        this.paginaActual - 2
      );


    let fin =
      Math.min(
        total,
        inicio + 4
      );


    if (
      fin - inicio < 4
    ) {

      inicio =
        Math.max(
          1,
          fin - 4
        );

    }


    const paginas:
      number[] = [];


    for (
      let i = inicio;
      i <= fin;
      i++
    ) {

      paginas.push(
        i
      );

    }


    return paginas;

  }


  irPagina(
    pagina: number
  ): void {

    if (
      pagina < 1
      ||
      pagina > this.totalPaginas
    ) {

      return;

    }


    this.paginaActual =
      pagina;

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


  // =========================================
  // NORMALIZAR TEXTO
  // =========================================

  normalizarTexto(
    valor: any
  ): string {

    return String(
      valor ?? ''
    )
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );

  }


  // =========================================
  // SABER SI ESTÁ ANULADA
  // =========================================

  esVentaAnulada(
    venta: any
  ): boolean {

    return (
      String(
        venta?.estado || ''
      )
        .toUpperCase()
        .trim()
      ===
      'ANULADA'
    );

  }


  // =========================================
  // ABRIR NUEVA VENTA
  // =========================================

  abrirNuevaVenta(): void {

    this.modoCorreccion = false;

    this.ventaOrigen = null;

    this.limpiarFormularioVenta();

    this.mostrarNuevaVenta = true;

  }


  // =========================================
  // CERRAR NUEVA VENTA
  // =========================================

  cerrarNuevaVenta(): void {

    this.mostrarNuevaVenta = false;

    this.modoCorreccion = false;

    this.ventaOrigen = null;

    this.limpiarFormularioVenta();

  }


  // =========================================
  // LIMPIAR FORMULARIO
  // =========================================

  limpiarFormularioVenta(): void {

    this.cliente = '';

    this.observacion = '';

    this.medicamentoSeleccionado = '';

    this.cantidad = 1;

    this.precioVenta = 0;

    this.detalleVenta = [];

    this.totalVenta = 0;

  }


  // =========================================
  // AGREGAR PRODUCTO
  // =========================================


  get medicamentosBuscadosVenta(): any[] {
    const q = this.busquedaMedicamentoVenta.trim().toLowerCase();
    const base = this.medicamentos || [];
    if (!q) return base.slice(0, 10);
    return base.filter((m: any) => {
      const nombre = String(m?.nombre || '').toLowerCase();
      const codigo = String(m?.codigo || '').toLowerCase();
      return nombre.includes(q) || codigo.includes(q);
    }).slice(0, 12);
  }

  seleccionarMedicamentoVenta(m: any): void {
    this.medicamentoSeleccionado = String(m.id);
    this.busquedaMedicamentoVenta = m.codigo ? `${m.nombre} - ${m.codigo}` : m.nombre;
    this.mostrarResultadosMedicamentoVenta = false;
    if (Number(m?.precio_venta) > 0) this.precioVenta = Number(m.precio_venta);
  }

  alEscribirMedicamentoVenta(): void {
    this.medicamentoSeleccionado = '';
    this.mostrarResultadosMedicamentoVenta = true;
  }

  agregarProductoVenta(): void {

    if (
      this.medicamentoSeleccionado === ''
    ) {

      alert(
        'Seleccione un medicamento'
      );

      return;

    }


    if (
      Number(
        this.cantidad
      ) <= 0
    ) {

      alert(
        'La cantidad debe ser mayor a 0'
      );

      return;

    }


    if (
      Number(
        this.precioVenta
      ) <= 0
    ) {

      alert(
        'Ingrese el precio de venta'
      );

      return;

    }


    const medicamento =
      this.medicamentos.find(

        m =>
          String(m.id)
          ===
          String(
            this.medicamentoSeleccionado
          )

      );


    if (!medicamento) {

      alert(
        'Medicamento no encontrado'
      );

      return;

    }


    const cantidadSolicitada =
      Number(
        this.cantidad
      );


    const yaAgregado =
      this.detalleVenta
        .filter(
          item =>
            String(
              item.medicamentoId
            )
            ===
            String(
              medicamento.id
            )
        )
        .reduce(
          (
            suma: number,
            item: any
          ) =>
            suma
            +
            Number(
              item.cantidad || 0
            ),
          0
        );


    const stockDisponible =
      Number(
        medicamento.stock || 0
      );


    if (
      yaAgregado
      +
      cantidadSolicitada
      >
      stockDisponible
    ) {

      alert(
        'Stock insuficiente. Disponible: '
        +
        stockDisponible
      );

      return;

    }


    const subtotal =

      cantidadSolicitada

      *

      Number(
        this.precioVenta
      );


    this.detalleVenta.push({

      medicamentoId:
        medicamento.id,

      medicamento:
        medicamento.nombre,

      cantidad:
        cantidadSolicitada,

      precio:
        Number(
          this.precioVenta
        ),

      subtotal:
        subtotal

    });


    this.recalcularTotal();


    this.medicamentoSeleccionado = '';

    this.cantidad = 1;

    this.precioVenta = 0;

  }


  // =========================================
  // ELIMINAR PRODUCTO
  // =========================================

  eliminarProductoVenta(
    index: number
  ): void {

    this.detalleVenta.splice(
      index,
      1
    );

    this.recalcularTotal();

  }


  // =========================================
  // RECALCULAR TOTAL
  // =========================================

  recalcularTotal(): void {

    this.totalVenta =
      this.detalleVenta.reduce(

        (
          suma: number,
          item: any
        ) =>

          suma
          +
          Number(
            item.subtotal || 0
          ),

        0

      );

  }


  // =========================================
  // OBTENER USUARIO ACTUAL
  // =========================================

  obtenerUsuarioActual(): any {

    const usuarioGuardado =
      sessionStorage.getItem('usuario');


    if (!usuarioGuardado) {

      return null;

    }


    try {

      return JSON.parse(
        usuarioGuardado
      );

    }
    catch (error) {

      console.error(
        'Error al leer usuario:',
        error
      );

      return null;

    }

  }


  // =========================================
  // GUARDAR VENTA / CORRECCIÓN
  // =========================================

  guardarVenta(): void {

    if (
      this.cliente.trim() === ''
    ) {

      alert(
        'Ingrese el nombre del cliente'
      );

      return;

    }


    if (
      this.detalleVenta.length === 0
    ) {

      alert(
        'Agregue al menos un medicamento'
      );

      return;

    }


    const usuarioActual =
      this.obtenerUsuarioActual();


    /*
      El administrador puede registrar ventas aunque el objeto
      de sesión no esté guardado en localStorage/sessionStorage.

      Si existe un usuario con ID, se envía al backend.
      Si no existe, el backend registra la operación como
      "Administrador", manteniendo el historial y la trazabilidad.
    */


    const numeroVenta =
      'VTA-'
      +
      Date.now();


    const detalle =
      this.detalleVenta.map(

        item => ({

          medicamento:
            item.medicamentoId,

          cantidad:
            Number(
              item.cantidad
            ),

          precio_venta:
            Number(
              item.precio
            ),

          subtotal:
            Number(
              item.subtotal
            )

        })

      );


    const datosVenta: any = {

      numero_venta:
        numeroVenta,

      cliente:
        this.cliente,

      total:
        Number(
          this.totalVenta
        ),

      estado:
        'COMPLETADA',

      observacion:
        this.observacion,

      detalle:
        detalle

    };


    /*
      Solo enviamos usuario_id cuando realmente existe.
      Si no existe, Django manejará la venta como Administrador.
    */
    if (
      usuarioActual
      &&
      usuarioActual.id
    ) {

      datosVenta.usuario_id =
        usuarioActual.id;

    }


    if (
      this.modoCorreccion
      &&
      this.ventaOrigen?.id
    ) {

      datosVenta.venta_origen_id =
        this.ventaOrigen.id;

    }


    console.log(
      'VENTA QUE SE ENVIARÁ A DJANGO:',
      datosVenta
    );


    this.guardandoVenta = true;


    this.http
      .post<any>(

        this.api
        +
        'registrar/',

        datosVenta

      )
      .subscribe({

        next: (res) => {

          this.guardandoVenta = false;


          if (res.estado) {

            alert(
              '✅ '
              +
              res.mensaje
            );


            this.cerrarNuevaVenta();

            this.listarVentas();

            this.listarMedicamentos();

          }
          else {

            alert(
              '❌ '
              +
              (
                res.mensaje
                ||
                'No se pudo registrar la venta'
              )
            );

          }

        },

        error: (err) => {

          this.guardandoVenta = false;

          console.error(
            'Error al guardar venta:',
            err
          );


          alert(
            '❌ '
            +
            (
              err?.error?.mensaje
              ||
              'Error al guardar la venta'
            )
          );

        }

      });

  }


  // =========================================
  // VER VENTA
  // =========================================

  verVenta(
    id: number
  ): void {

    const venta =
      this.ventas.find(
        v =>
          v.id === id
      );


    if (!venta) {

      alert(
        'No se encontró la venta'
      );

      return;

    }


    this.detalleVentaSeleccionada =
      venta;

    this.mostrarDetalle = true;

  }


  // =========================================
  // CERRAR DETALLE
  // =========================================

  cerrarDetalle(): void {

    this.mostrarDetalle = false;

    this.detalleVentaSeleccionada = null;

  }


  // =========================================
  // TOTAL DEL DETALLE
  // =========================================

  calcularTotalDetalle(): number {

    if (
      !this
        .detalleVentaSeleccionada
        ?.detalle
      ||
      this
        .detalleVentaSeleccionada
        .detalle.length === 0
    ) {

      return 0;

    }


    return this
      .detalleVentaSeleccionada
      .detalle
      .reduce(

        (
          suma: number,
          item: any
        ) =>

          suma
          +
          Number(
            item.subtotal || 0
          ),

        0

      );

  }


  // =========================================
  // ABRIR MODAL ANULACIÓN
  // =========================================

  abrirAnulacion(
    venta: any
  ): void {

    if (
      this.esVentaAnulada(
        venta
      )
    ) {

      alert(
        'La venta ya está anulada'
      );

      return;

    }


    this.ventaParaAnular =
      venta;

    this.motivoAnulacion = '';

    this.mostrarAnulacion =
      true;

  }


  // =========================================
  // CERRAR MODAL ANULACIÓN
  // =========================================

  cerrarAnulacion(): void {

    if (
      this.anulandoVenta
    ) {

      return;

    }


    this.mostrarAnulacion =
      false;

    this.ventaParaAnular =
      null;

    this.motivoAnulacion = '';

  }


  // =========================================
  // CONFIRMAR ANULACIÓN
  // =========================================

  confirmarAnulacion(): void {

    if (
      !this.ventaParaAnular?.id
    ) {

      return;

    }


    const motivo =
      this.motivoAnulacion
        .trim();


    if (motivo === '') {

      alert(
        'Debe escribir el motivo de la anulación'
      );

      return;

    }


    if (
      motivo.length < 5
    ) {

      alert(
        'Escriba un motivo más claro'
      );

      return;

    }


    const usuarioActual =
      this.obtenerUsuarioActual();


    const usuarioNombre =
      usuarioActual?.nombre
      ||
      'Administrador';


    this.anulandoVenta =
      true;


    this.http
      .post<any>(

        this.api
        +
        'anular/'
        +
        this.ventaParaAnular.id
        +
        '/',

        {
          motivo:
            motivo,

          usuario:
            usuarioNombre
        }

      )
      .subscribe({

        next: (res) => {

          this.anulandoVenta =
            false;


          if (res.estado) {

            alert(
              '✅ Venta anulada correctamente. El stock fue devuelto.'
            );


            this.cerrarAnulacion();

            this.listarVentas();

            this.listarMedicamentos();

          }
          else {

            alert(
              '❌ '
              +
              (
                res.mensaje
                ||
                'No se pudo anular la venta'
              )
            );

          }

        },

        error: (err) => {

          this.anulandoVenta =
            false;


          console.error(
            'Error al anular venta:',
            err
          );


          alert(
            '❌ '
            +
            (
              err?.error?.mensaje
              ||
              'Error al anular la venta'
            )
          );

        }

      });

  }


  // =========================================
  // CORREGIR VENTA
  // =========================================

  corregirVenta(
    venta: any
  ): void {

    if (
      !this.esVentaAnulada(
        venta
      )
    ) {

      alert(
        'Primero debe anular la venta'
      );

      return;

    }


    if (
      venta.puede_corregir ===
      false
    ) {

      alert(
        'Esta venta ya tiene una corrección activa'
      );

      return;

    }


    this.modoCorreccion =
      true;

    this.ventaOrigen =
      venta;


    this.cliente =
      venta.cliente
      ||
      'Consumidor Final';


    this.observacion =
      venta.observacion
      ||
      'Corrección de '
      +
      venta.numero_venta;


    this.detalleVenta =
      (
        venta.detalle
        ||
        []
      )
      .map(

        (detalle: any) => ({

          medicamentoId:
            detalle.medicamento_id,

          medicamento:
            detalle.medicamento,

          cantidad:
            Number(
              detalle.cantidad
            ),

          precio:
            Number(
              detalle.precio_venta
              ??
              detalle.precio
              ??
              0
            ),

          subtotal:
            Number(
              detalle.subtotal
              ||
              0
            )

        })

      );


    this.recalcularTotal();


    this.medicamentoSeleccionado =
      '';

    this.cantidad = 1;

    this.precioVenta = 0;


    this.mostrarNuevaVenta =
      true;

  }

}
