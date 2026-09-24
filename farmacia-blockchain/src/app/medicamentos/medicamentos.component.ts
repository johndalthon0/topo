import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-medicamentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './medicamentos.component.html',
  styleUrls: ['./medicamentos.component.css']
})
export class MedicamentosComponent implements OnInit {

  api = `${environment.apiUrl}/api/medicamentos/`;

  medicamentos: any[] = [];
  medicamentosFiltrados: any[] = [];

  mostrarModal = false;

  buscar = '';
  categoriaFiltro = '';

  stockTotal = 0;
  stockBajo = 0;
  porVencer = 0;

  id = 0;
  codigo = '';
  nombre = '';
  categoria = '';
  laboratorio = '';
  lote = '';
  fecha_vencimiento = '';
  precio_compra = 0;
  precio_venta = 0;
  stock = 0;
  stock_minimo = 0;
  descripcion = '';

  editando = false;

  paginaActual = 1;
  porPagina = 6;


  get esAdministrador(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return (sessionStorage.getItem('rol') || '') === 'Administrador';
  }

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}


  ngOnInit(): void {
    this.obtenerMedicamentos();
  }


  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(
        this.medicamentosFiltrados.length / this.porPagina
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
      this.medicamentosFiltrados.length
    );
  }


  get medicamentosPagina(): any[] {
    return this.medicamentosFiltrados.slice(
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


  abrirModal(): void {
    this.limpiarFormulario();
    this.mostrarModal = true;
  }


  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarFormulario();
  }


  limpiarFormulario(): void {

    this.id = 0;

    this.codigo = '';
    this.nombre = '';
    this.categoria = '';
    this.laboratorio = '';
    this.lote = '';
    this.fecha_vencimiento = '';

    this.precio_compra = 0;
    this.precio_venta = 0;

    this.stock = 0;
    this.stock_minimo = 0;

    this.descripcion = '';

    this.editando = false;
  }


  obtenerMedicamentos(): void {

    this.http
      .get<any[]>(this.api)
      .subscribe({

        next: (res) => {

          this.medicamentos =
            Array.isArray(res)
              ? res
              : [];

          this.filtrarMedicamentos();
          this.calcularEstadisticas();

        },

        error: (err) => {

          console.error(
            'Error al obtener medicamentos:',
            err
          );

          this.medicamentos = [];
          this.medicamentosFiltrados = [];

          this.calcularEstadisticas();
        }

      });
  }


  calcularEstadisticas(): void {

    this.stockTotal = 0;
    this.stockBajo = 0;
    this.porVencer = 0;

    this.medicamentos.forEach(
      (m: any) => {

        this.stockTotal +=
          Number(m.stock ?? 0);

        if (
          Number(m.stock ?? 0)
          <=
          Number(m.stock_minimo ?? 0)
        ) {
          this.stockBajo++;
        }

        if (
          this.estaPorVencer(m)
        ) {
          this.porVencer++;
        }
      }
    );
  }


  esStockBajo(
    m: any
  ): boolean {

    return (
      Number(m?.stock ?? 0)
      <=
      Number(m?.stock_minimo ?? 0)
    );
  }


  estaPorVencer(
    m: any
  ): boolean {

    if (
      !m?.fecha_vencimiento
    ) {
      return false;
    }

    const hoy = new Date();

    hoy.setHours(
      0,
      0,
      0,
      0
    );

    const fecha =
      this.crearFechaLocal(
        m.fecha_vencimiento
      );

    if (!fecha) {
      return false;
    }

    fecha.setHours(
      0,
      0,
      0,
      0
    );

    const diferencia =
      fecha.getTime()
      -
      hoy.getTime();

    const diasRestantes =
      Math.ceil(
        diferencia
        /
        (1000 * 60 * 60 * 24)
      );

    return (
      diasRestantes >= 0
      &&
      diasRestantes <= 30
    );
  }


  guardarMedicamento(): void {

    if (
      !this.codigo.trim()
      ||
      !this.nombre.trim()
    ) {

      alert(
        'Debe ingresar el código y el nombre del medicamento.'
      );

      return;
    }


    const datos = {

      codigo:
        this.codigo.trim(),

      nombre:
        this.nombre.trim(),

      categoria:
        this.categoria,

      laboratorio:
        this.laboratorio.trim(),

      lote:
        this.lote.trim(),

      fecha_vencimiento:
        this.fecha_vencimiento,

      precio_compra:
        Number(this.precio_compra),

      precio_venta:
        Number(this.precio_venta),

      stock:
        Number(this.stock),

      stock_minimo:
        Number(this.stock_minimo),

      descripcion:
        this.descripcion.trim()

    };


    if (
      this.editando
    ) {

      this.actualizarMedicamento(
        datos
      );

      return;
    }


    this.http
      .post(
        this.api,
        datos
      )
      .subscribe({

        next: () => {

          alert(
            'Medicamento registrado correctamente.'
          );

          this.cerrarModal();
          this.obtenerMedicamentos();
        },

        error: (err) => {

          console.error(err);

          alert(
            'No se pudo registrar el medicamento.'
          );
        }
      });
  }


  editarMedicamento(
    m: any
  ): void {

    this.editando = true;
    this.mostrarModal = true;

    this.id = m.id;

    this.codigo = m.codigo ?? '';
    this.nombre = m.nombre ?? '';
    this.categoria = m.categoria ?? '';
    this.laboratorio = m.laboratorio ?? '';
    this.lote = m.lote ?? '';
    this.fecha_vencimiento =
      m.fecha_vencimiento ?? '';

    this.precio_compra =
      Number(
        m.precio_compra ?? 0
      );

    this.precio_venta =
      Number(
        m.precio_venta ?? 0
      );

    this.stock =
      Number(
        m.stock ?? 0
      );

    this.stock_minimo =
      Number(
        m.stock_minimo ?? 0
      );

    this.descripcion =
      m.descripcion ?? '';
  }


  actualizarMedicamento(
    datos: any
  ): void {

    this.http
      .put(
        this.api
        +
        this.id
        +
        '/',
        datos
      )
      .subscribe({

        next: () => {

          alert(
            'Medicamento actualizado correctamente.'
          );

          this.cerrarModal();
          this.obtenerMedicamentos();
        },

        error: (err) => {

          console.error(err);

          alert(
            'No se pudo actualizar el medicamento.'
          );
        }
      });
  }


  eliminarMedicamento(
    id: number
  ): void {

    if (
      !confirm(
        '¿Desea eliminar este medicamento?'
      )
    ) {
      return;
    }

    this.http
      .delete(
        this.api
        +
        id
        +
        '/'
      )
      .subscribe({

        next: () => {

          alert(
            'Medicamento eliminado correctamente.'
          );

          this.obtenerMedicamentos();
        },

        error: (err) => {

          console.error(err);

          alert(
            'No se pudo eliminar el medicamento.'
          );
        }
      });
  }


  filtrarMedicamentos(): void {

    const texto =
      this.normalizarTexto(
        this.buscar
      );

    this.medicamentosFiltrados =
      this.medicamentos.filter(
        (m: any) => {

          const nombre =
            this.normalizarTexto(
              m.nombre
            );

          const codigo =
            this.normalizarTexto(
              m.codigo
            );

          const laboratorio =
            this.normalizarTexto(
              m.laboratorio
            );

          const coincideBusqueda =
            texto === ''
            ||
            nombre.includes(texto)
            ||
            codigo.includes(texto)
            ||
            laboratorio.includes(texto);

          const coincideCategoria =
            this.categoriaFiltro === ''
            ||
            m.categoria ===
              this.categoriaFiltro;

          return (
            coincideBusqueda
            &&
            coincideCategoria
          );
        }
      );

    this.paginaActual = 1;
  }


  claseCategoria(
    categoria: string
  ): string {

    const valor =
      this.normalizarTexto(
        categoria
      );

    if (
      valor.includes(
        'antibiotico'
      )
    ) {
      return 'cat-green';
    }

    if (
      valor.includes(
        'antiinflamatorio'
      )
      ||
      valor.includes(
        'gastrointestinal'
      )
    ) {
      return 'cat-purple';
    }

    if (
      valor.includes(
        'antialergico'
      )
      ||
      valor.includes(
        'cardiovascular'
      )
    ) {
      return 'cat-cyan';
    }

    if (
      valor.includes(
        'vitamina'
      )
    ) {
      return 'cat-orange';
    }

    return 'cat-blue';
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


  cambiarPorPagina(): void {
    this.paginaActual = 1;
  }


  private normalizarTexto(
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


  private crearFechaLocal(
    valor: string
  ): Date | null {

    if (!valor) {
      return null;
    }

    const partes =
      String(valor)
        .substring(
          0,
          10
        )
        .split('-');

    if (
      partes.length !== 3
    ) {
      return null;
    }

    const anio =
      Number(partes[0]);

    const mes =
      Number(partes[1]);

    const dia =
      Number(partes[2]);

    if (
      !anio
      ||
      !mes
      ||
      !dia
    ) {
      return null;
    }

    return new Date(
      anio,
      mes - 1,
      dia
    );
  }

}
