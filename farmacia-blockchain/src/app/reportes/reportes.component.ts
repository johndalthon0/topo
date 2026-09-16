import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {

  constructor(
    private http: HttpClient
  ) {}

  // =====================================================
  // API
  // =====================================================

  api =
    'http://127.0.0.1:8000/api/reportes/';


  // =====================================================
  // FILTROS
  // =====================================================

  fechaInicio = '';
  fechaFin = '';
  textoBuscar = '';
  moduloSeleccionado = '';
  usuarioSeleccionado = '';


  // =====================================================
  // TARJETAS
  // =====================================================

  gastoCompras = 0;
  ingresoVentas = 0;
  ganancia = 0;
  valorInventario = 0;
  totalMedicamentos = 0;
  totalCompras = 0;
  totalVentas = 0;
  totalAnulados = 0;


  // =====================================================
  // LISTAS
  // =====================================================

  compras: any[] = [];
  ventas: any[] = [];
  medicamentos: any[] = [];
  usuarios: string[] = [];


  // =====================================================
  // REPORTES UNIFICADOS
  // =====================================================

  reportes: any[] = [];
  reportesFiltrados: any[] = [];
  reportesPaginados: any[] = [];


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  paginaActual = 1;
  registrosPorPagina = 10;
  totalPaginas = 1;


  // =====================================================
  // ESTADO DE CARGA
  // =====================================================

  cargando = false;
  exportando = false;


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {
    this.recargarDatos();
  }


  // =====================================================
  // RECARGAR DATOS
  // =====================================================

  recargarDatos(): void {

    this.cargando = true;

    let pendientes = 3;

    const finalizar = () => {

      pendientes--;

      if (pendientes <= 0) {

        this.construirReportes();
        this.actualizarUsuarios();
        this.buscarReportes(false);
        this.cargando = false;
      }
    };

    this.http
      .get<any[]>(this.api + 'compras/')
      .subscribe({
        next: (respuesta) => {
          this.compras = Array.isArray(respuesta)
            ? respuesta.map(c => this.normalizarCompra(c))
            : [];
          finalizar();
        },
        error: (error) => {
          console.error('Error al cargar compras:', error);
          this.compras = [];
          finalizar();
        }
      });

    this.http
      .get<any[]>(this.api + 'ventas/')
      .subscribe({
        next: (respuesta) => {
          this.ventas = Array.isArray(respuesta)
            ? respuesta.map(v => this.normalizarVenta(v))
            : [];
          finalizar();
        },
        error: (error) => {
          console.error('Error al cargar ventas:', error);
          this.ventas = [];
          finalizar();
        }
      });

    this.http
      .get<any[]>(this.api + 'medicamentos/')
      .subscribe({
        next: (respuesta) => {
          this.medicamentos = Array.isArray(respuesta)
            ? respuesta.map(m => this.normalizarMedicamento(m))
            : [];
          finalizar();
        },
        error: (error) => {
          console.error('Error al cargar medicamentos:', error);
          this.medicamentos = [];
          finalizar();
        }
      });
  }


  // =====================================================
  // NORMALIZAR COMPRA
  // =====================================================

  normalizarCompra(compra: any): any {

    return {
      ...compra,
      usuario:
        compra.usuario ||
        compra.anulado_por ||
        'Administrador',
      factura:
        compra.factura ||
        compra.numero_factura ||
        'Sin factura',
      proveedor:
        compra.proveedor ||
        'Sin proveedor',
      fecha:
        this.obtenerFecha(compra),
      total:
        Number(compra.total || 0),
      estado:
        compra.estado ||
        'RECIBIDA',
      referencia:
        compra.factura ||
        compra.referencia ||
        'Sin referencia',
      motivo_anulacion:
        compra.motivo_anulacion || '',
      compra_origen_factura:
        compra.compra_origen_factura || '',
      tipo_registro:
        compra.tipo_registro ||
        (
          compra.compra_origen_id
            ? 'CORRECCION_COMPRA'
            : 'COMPRA'
        )
    };
  }


  // =====================================================
  // NORMALIZAR VENTA
  // =====================================================

  normalizarVenta(venta: any): any {

    return {
      ...venta,
      usuario:
        venta.usuario ||
        'Administrador',
      numero_venta:
        venta.numero_venta ||
        venta.factura ||
        'Sin número',
      cliente:
        venta.cliente ||
        'Consumidor Final',
      fecha:
        this.obtenerFecha(venta),
      total:
        Number(venta.total || 0),
      estado:
        venta.estado ||
        'COMPLETADA',
      referencia:
        venta.numero_venta ||
        venta.referencia ||
        'Sin referencia',
      motivo_anulacion:
        venta.motivo_anulacion || '',
      venta_origen_numero:
        venta.venta_origen_numero || '',
      tipo_registro:
        venta.tipo_registro ||
        (
          venta.venta_origen_id
            ? 'CORRECCION_VENTA'
            : 'VENTA'
        )
    };
  }


  // =====================================================
  // NORMALIZAR MEDICAMENTO
  // =====================================================

  normalizarMedicamento(
    medicamento: any
  ): any {

    const precio =
      Number(
        medicamento.precio_compra ||
        medicamento.precio ||
        0
      );

    const stock =
      Number(
        medicamento.stock ||
        medicamento.stock_actual ||
        0
      );

    return {
      ...medicamento,
      nombre:
        medicamento.nombre ||
        medicamento.nombre_medicamento ||
        'Sin nombre',
      precio_compra: precio,
      stock: stock,
      valor_inventario:
        Number(
          medicamento.valor_inventario ||
          (precio * stock)
        ),
      fecha_registro:
        medicamento.fecha_registro ||
        medicamento.fecha_creacion ||
        medicamento.created_at ||
        ''
    };
  }


  // =====================================================
  // OBTENER FECHA
  // =====================================================

  obtenerFecha(
    registro: any
  ): string {

    const fecha =
      registro.fecha ||
      registro.fecha_compra ||
      registro.fecha_venta ||
      registro.fecha_registro ||
      registro.fecha_creacion ||
      registro.created_at ||
      '';

    if (!fecha) {
      return '';
    }

    return String(fecha).substring(0, 10);
  }


  // =====================================================
  // CONSTRUIR REPORTES UNIFICADOS
  // =====================================================

  construirReportes(): void {

    const lista: any[] = [];

    this.compras.forEach(
      (compra: any) => {

        const anulada =
          this.esAnulado(compra.estado);

        const corregida =
          compra.tipo_registro ===
          'CORRECCION_COMPRA';

        lista.push({
          id: `C-${compra.id}`,
          usuario: compra.usuario,
          accion:
            anulada
              ? 'Compra anulada'
              : (
                  corregida
                    ? 'Compra corregida'
                    : 'Registró compra'
                ),
          modulo: 'Compras',
          referencia: compra.factura,
          referencia_origen:
            compra.compra_origen_factura || '',
          descripcion:
            compra.proveedor || '',
          monto:
            Number(compra.total || 0),
          fecha: compra.fecha,
          estado: compra.estado,
          motivo:
            compra.motivo_anulacion || '',
          anulado: anulada,
          corregido: corregida,
          tipo: 'compra',
          valor_inventario: 0
        });
      }
    );

    this.ventas.forEach(
      (venta: any) => {

        const anulada =
          this.esAnulado(venta.estado);

        const corregida =
          venta.tipo_registro ===
          'CORRECCION_VENTA';

        lista.push({
          id: `V-${venta.id}`,
          usuario: venta.usuario,
          accion:
            anulada
              ? 'Venta anulada'
              : (
                  corregida
                    ? 'Venta corregida'
                    : 'Registró venta'
                ),
          modulo: 'Ventas',
          referencia:
            venta.numero_venta,
          referencia_origen:
            venta.venta_origen_numero || '',
          descripcion:
            venta.cliente || '',
          monto:
            Number(venta.total || 0),
          fecha: venta.fecha,
          estado: venta.estado,
          motivo:
            venta.motivo_anulacion || '',
          anulado: anulada,
          corregido: corregida,
          tipo: 'venta',
          valor_inventario: 0
        });
      }
    );

    this.medicamentos.forEach(
      (medicamento: any) => {

        lista.push({
          id: `M-${medicamento.id}`,
          usuario: 'Administrador',
          accion: 'Medicamento registrado',
          modulo: 'Medicamentos',
          referencia: medicamento.nombre,
          referencia_origen: '',
          descripcion:
            `Stock: ${medicamento.stock}`,
          monto:
            Number(
              medicamento.precio_compra || 0
            ),
          fecha:
            medicamento.fecha_registro || '',
          estado: 'Correcto',
          motivo: '',
          anulado: false,
          corregido: false,
          tipo: 'medicamento',
          valor_inventario:
            Number(
              medicamento.valor_inventario || 0
            )
        });
      }
    );

    lista.sort(
      (a: any, b: any) => {

        const fechaA =
          String(a.fecha || '');

        const fechaB =
          String(b.fecha || '');

        return fechaB.localeCompare(fechaA);
      }
    );

    this.reportes = lista;
    this.reportesFiltrados = [...lista];
  }


  // =====================================================
  // ACTUALIZAR USUARIOS
  // =====================================================

  actualizarUsuarios(): void {

    const usuarios = new Set<string>();

    this.reportes.forEach(
      (reporte: any) => {

        if (reporte.usuario) {
          usuarios.add(reporte.usuario);
        }
      }
    );

    this.usuarios =
      Array.from(usuarios).sort();
  }


  // =====================================================
  // FILTRAR REPORTES
  // =====================================================

  buscarReportes(
    reiniciarPagina: boolean = true
  ): void {

    const texto =
      this.normalizarTexto(
        this.textoBuscar
      );

    this.reportesFiltrados =
      this.reportes.filter(
        (reporte: any) => {

          const fecha =
            String(reporte.fecha || '');

          const coincideFechaInicio =
            this.fechaInicio === '' ||
            fecha === '' ||
            fecha >= this.fechaInicio;

          const coincideFechaFin =
            this.fechaFin === '' ||
            fecha === '' ||
            fecha <= this.fechaFin;

          const coincideModulo =
            this.moduloSeleccionado === '' ||
            reporte.modulo ===
            this.moduloSeleccionado ||
            (
              this.moduloSeleccionado ===
              'Inventario' &&
              reporte.modulo ===
              'Medicamentos'
            );

          const coincideUsuario =
            this.usuarioSeleccionado === '' ||
            reporte.usuario ===
            this.usuarioSeleccionado;

          const campos = [
            reporte.usuario,
            reporte.accion,
            reporte.modulo,
            reporte.referencia,
            reporte.referencia_origen,
            reporte.descripcion,
            reporte.estado,
            reporte.motivo,
            reporte.monto
          ];

          const coincideTexto =
            texto === '' ||
            campos.some(
              campo =>
                this.normalizarTexto(campo)
                  .includes(texto)
            );

          return (
            coincideFechaInicio &&
            coincideFechaFin &&
            coincideModulo &&
            coincideUsuario &&
            coincideTexto
          );
        }
      );

    if (reiniciarPagina) {
      this.paginaActual = 1;
    }

    this.calcularTarjetas();
    this.actualizarPaginacion();
  }


  // =====================================================
  // LIMPIAR FILTROS
  // =====================================================

  limpiarFiltros(): void {

    this.fechaInicio = '';
    this.fechaFin = '';
    this.textoBuscar = '';
    this.moduloSeleccionado = '';
    this.usuarioSeleccionado = '';
    this.paginaActual = 1;

    this.buscarReportes(false);
  }


  // =====================================================
  // CALCULAR TARJETAS
  // =====================================================

  calcularTarjetas(): void {

    const comprasValidas =
      this.reportesFiltrados.filter(
        (r: any) =>
          r.modulo === 'Compras' &&
          !r.anulado
      );

    const ventasValidas =
      this.reportesFiltrados.filter(
        (r: any) =>
          r.modulo === 'Ventas' &&
          !r.anulado
      );

    const medicamentos =
      this.reportesFiltrados.filter(
        (r: any) =>
          r.modulo === 'Medicamentos'
      );

    this.gastoCompras =
      comprasValidas.reduce(
        (total: number, r: any) =>
          total + Number(r.monto || 0),
        0
      );

    this.ingresoVentas =
      ventasValidas.reduce(
        (total: number, r: any) =>
          total + Number(r.monto || 0),
        0
      );

    this.ganancia =
      this.ingresoVentas -
      this.gastoCompras;

    this.valorInventario =
      medicamentos.reduce(
        (total: number, r: any) =>
          total +
          Number(r.valor_inventario || 0),
        0
      );

    this.totalCompras =
      comprasValidas.length;

    this.totalVentas =
      ventasValidas.length;

    this.totalMedicamentos =
      medicamentos.length;

    this.totalAnulados =
      this.reportesFiltrados.filter(
        (r: any) => r.anulado
      ).length;
  }


  // =====================================================
  // ESTADO ANULADO
  // =====================================================

  esAnulado(
    estado: any
  ): boolean {

    return String(
      estado || ''
    )
      .trim()
      .toUpperCase() ===
      'ANULADA';
  }


  // =====================================================
  // NORMALIZAR TEXTO
  // =====================================================

  normalizarTexto(
    valor: any
  ): string {

    return String(valor ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );
  }


  // =====================================================
  // CLASES VISUALES
  // =====================================================

  claseModulo(
    modulo: string
  ): string {

    switch (modulo) {
      case 'Compras':
        return 'modulo-compras';
      case 'Ventas':
        return 'modulo-ventas';
      case 'Medicamentos':
        return 'modulo-medicamentos';
      default:
        return 'modulo-inventario';
    }
  }


  claseAccion(
    reporte: any
  ): string {

    if (reporte.anulado) {
      return 'anulada';
    }

    if (reporte.corregido) {
      return 'corregida';
    }

    return reporte.tipo;
  }


  claseEstado(
    estado: string
  ): string {

    const texto =
      String(estado || '')
        .toUpperCase();

    if (texto === 'ANULADA') {
      return 'anulada-estado';
    }

    if (
      texto === 'COMPLETADA' ||
      texto === 'RECIBIDA'
    ) {
      return 'verificado';
    }

    if (texto === 'CORRECTO') {
      return 'correcto';
    }

    return 'pendiente';
  }


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  actualizarPaginacion(): void {

    const total =
      this.reportesFiltrados.length;

    this.totalPaginas =
      Math.max(
        1,
        Math.ceil(
          total /
          this.registrosPorPagina
        )
      );

    if (
      this.paginaActual >
      this.totalPaginas
    ) {
      this.paginaActual =
        this.totalPaginas;
    }

    const inicio =
      (
        this.paginaActual - 1
      ) *
      this.registrosPorPagina;

    const fin =
      inicio +
      this.registrosPorPagina;

    this.reportesPaginados =
      this.reportesFiltrados.slice(
        inicio,
        fin
      );
  }


  cambiarPagina(
    pagina: number
  ): void {

    if (
      pagina >= 1 &&
      pagina <= this.totalPaginas
    ) {

      this.paginaActual = pagina;
      this.actualizarPaginacion();
    }
  }


  paginaAnterior(): void {

    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.actualizarPaginacion();
    }
  }


  paginaSiguiente(): void {

    if (
      this.paginaActual <
      this.totalPaginas
    ) {
      this.paginaActual++;
      this.actualizarPaginacion();
    }
  }


  get paginasVisibles(): number[] {

    const paginas: number[] = [];

    const inicio =
      Math.max(
        1,
        this.paginaActual - 2
      );

    const fin =
      Math.min(
        this.totalPaginas,
        inicio + 4
      );

    for (
      let i = inicio;
      i <= fin;
      i++
    ) {
      paginas.push(i);
    }

    return paginas;
  }


  // =====================================================
  // EXPORTAR PDF
  // =====================================================

  exportarPDF(): void {

    if (this.exportando) {
      return;
    }

    this.exportando = true;

    const datos = {
      tipo_reporte:
        this.moduloSeleccionado ||
        'General',
      fecha_inicio:
        this.fechaInicio || null,
      fecha_fin:
        this.fechaFin || null
    };

    this.http.post(
      this.api + 'exportar-pdf/',
      datos,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (archivo: Blob) => {

        this.exportando = false;
        this.descargarArchivo(
          archivo,
          'reporte-farmacia.pdf'
        );
      },

      error: (error) => {

        this.exportando = false;

        console.error(
          'Error al generar PDF:',
          error
        );

        alert(
          'No se pudo generar el PDF.'
        );
      }
    });
  }


  // =====================================================
  // EXPORTAR EXCEL
  // =====================================================

  exportarExcel(): void {

    if (this.exportando) {
      return;
    }

    this.exportando = true;

    const datos = {
      tipo_reporte:
        this.moduloSeleccionado ||
        'General',
      fecha_inicio:
        this.fechaInicio || null,
      fecha_fin:
        this.fechaFin || null
    };

    this.http.post(
      this.api + 'exportar-excel/',
      datos,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: (archivo: Blob) => {

        this.exportando = false;
        this.descargarArchivo(
          archivo,
          'reporte-farmacia.xlsx'
        );
      },

      error: (error) => {

        this.exportando = false;

        console.error(
          'Error al generar Excel:',
          error
        );

        alert(
          'No se pudo generar el Excel.'
        );
      }
    });
  }


  // =====================================================
  // DESCARGAR ARCHIVO
  // =====================================================

  descargarArchivo(
    archivo: Blob,
    nombre: string
  ): void {

    const url =
      window.URL.createObjectURL(
        archivo
      );

    const enlace =
      document.createElement('a');

    enlace.href = url;
    enlace.download = nombre;
    enlace.click();

    window.URL.revokeObjectURL(url);
  }

}
