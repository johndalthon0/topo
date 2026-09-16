import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {

  // =====================================================
  // API
  // =====================================================

  api =
    'http://127.0.0.1:8000/api/medicamentos/';

  apiDashboardCompras =
    'http://127.0.0.1:8000/api/compras/dashboard/';

  apiDashboardVentas =
    'http://127.0.0.1:8000/api/ventas/dashboard/';


  // =====================================================
  // INTERFAZ
  // =====================================================

  fechaActual = '';

  pestanaActiva =
    'resumen';

  textoBusqueda =
    '';


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  paginaActual = 1;

  porPagina = 8;


  // =====================================================
  // MOVIMIENTOS
  // =====================================================

  movimientos: any[] = [];

  movimientosFiltrados: any[] = [];

  entradas: any[] = [];

  salidas: any[] = [];


  // =====================================================
  // DETALLE
  // =====================================================

  detalleMovimiento: any = null;

  mostrarDetalle = false;


  // =====================================================
  // MEDICAMENTOS
  // =====================================================

  medicamentos: any[] = [];

  stockBajoLista: any[] = [];

  porVencerLista: any[] = [];


  // =====================================================
  // TARJETAS SUPERIORES
  // =====================================================

  totalProductos = 0;

  entradasHoy = 0;

  totalUnidadesEntradasHoy = 0;

  salidasHoy = 0;

  totalUnidadesSalidasHoy = 0;

  stockBajo = 0;

  porVencer = 0;


  // =====================================================
  // TARJETAS INFERIORES
  // =====================================================

  valorInventario = 0;

  ultimaEntradaFecha =
    'Sin registros';

  ultimaEntradaMedicamento =
    '-';

  ultimaSalidaFecha =
    'Sin registros';

  ultimaSalidaMedicamento =
    '-';


  constructor(
    private http: HttpClient
  ) {}


  ngOnInit(): void {

    this.actualizarFecha();

    this.obtenerResumen();

    this.cargarDashboardCompras();

    this.cargarDashboardVentas();

  }


  // =====================================================
  // FECHA
  // =====================================================

  actualizarFecha(): void {

    const hoy =
      new Date();

    this.fechaActual =
      hoy.toLocaleDateString(
        'es-BO',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }
      );

  }


  // =====================================================
  // PESTAÑAS
  // =====================================================

  cambiarPestana(
    pestana: string
  ): void {

    this.pestanaActiva =
      pestana;

    this.paginaActual = 1;

  }


  // =====================================================
  // COMPRAS / ENTRADAS
  // =====================================================

  cargarDashboardCompras(): void {

    this.http
      .get<any>(
        this.apiDashboardCompras
      )
      .subscribe({

        next: (res) => {

          console.log(
            'DASHBOARD COMPRAS:',
            res
          );


          this.entradasHoy =
            Number(
              res.entradasHoy
            )
            ||
            0;


          this.totalUnidadesEntradasHoy =
            Number(
              res.totalUnidadesHoy
            )
            ||
            0;


          this.entradas =
            Array.isArray(
              res.movimientos
            )
              ? res.movimientos
              : [];


          if (
            res.ultimaEntrada
          ) {

            this.ultimaEntradaFecha =
              res.ultimaEntrada.fecha
              ||
              'Sin registros';


            this.ultimaEntradaMedicamento =
              (
                res.ultimaEntrada.medicamento
                ||
                '-'
              )
              +
              ' ('
              +
              (
                res.ultimaEntrada.cantidad
                ||
                0
              )
              +
              ' uds)';

          }


          this.actualizarMovimientos();

        },

        error: (err) => {

          console.error(
            'ERROR DASHBOARD COMPRAS:',
            err
          );

        }

      });

  }


  // =====================================================
  // VENTAS / SALIDAS
  // =====================================================

  cargarDashboardVentas(): void {

    this.http
      .get<any>(
        this.apiDashboardVentas
      )
      .subscribe({

        next: (res) => {

          console.log(
            'DASHBOARD VENTAS:',
            res
          );


          this.salidasHoy =
            Number(
              res.salidasHoy
            )
            ||
            0;


          this.totalUnidadesSalidasHoy =
            Number(
              res.totalUnidadesHoy
            )
            ||
            0;


          if (
            res.ultimaSalida
          ) {

            this.ultimaSalidaFecha =
              res.ultimaSalida.fecha
              ||
              'Sin registros';


            this.ultimaSalidaMedicamento =
              (
                res.ultimaSalida.medicamento
                ||
                '-'
              )
              +
              ' ('
              +
              (
                res.ultimaSalida.cantidad
                ||
                0
              )
              +
              ' uds)';

          }


          this.salidas =
            Array.isArray(
              res.salidas
            )
              ? res.salidas
              : [];


          this.actualizarMovimientos();

        },

        error: (err) => {

          console.error(
            'ERROR DASHBOARD VENTAS:',
            err
          );

        }

      });

  }


  // =====================================================
  // UNIR MOVIMIENTOS
  // =====================================================

  actualizarMovimientos(): void {

    const entradasNormalizadas =
      this.entradas.map(
        (
          m: any
        ) => ({

          ...m,

          tipo:
            'Entrada'

        })
      );


    const salidasNormalizadas =
      this.salidas.map(
        (
          m: any
        ) => ({

          ...m,

          tipo:
            'Salida'

        })
      );


    this.movimientos = [

      ...entradasNormalizadas,

      ...salidasNormalizadas

    ];


    this.movimientos.sort(
      (
        a: any,
        b: any
      ) => {

        return (
          this.convertirFecha(
            b.fecha
          )
          -
          this.convertirFecha(
            a.fecha
          )
        );

      }
    );


    this.filtrarMovimientos();

  }


  // =====================================================
  // FILTRO
  // =====================================================

  filtrarMovimientos(): void {

    const texto =
      this.normalizarTexto(
        this.textoBusqueda
      );


    this.movimientosFiltrados =
      this.movimientos.filter(
        (
          movimiento:
          any
        ) => {

          if (
            texto === ''
          ) {

            return true;

          }


          return [

            movimiento.medicamento,

            movimiento.lote,

            movimiento.usuario,

            movimiento.tipo,

            movimiento.fecha

          ].some(
            (
              valor
            ) => {

              return (
                this.normalizarTexto(
                  valor
                )
                .includes(
                  texto
                )
              );

            }
          );

        }
      );


    this.paginaActual = 1;

  }


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  get totalPaginas(): number {

    return Math.max(

      1,

      Math.ceil(
        this.movimientosFiltrados.length
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

      this.movimientosFiltrados.length

    );

  }


  get movimientosPagina(): any[] {

    return this.movimientosFiltrados.slice(

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
        ) => (
          i
          +
          1
        )
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
      this.paginaActual
      -
      1
    );

  }


  paginaSiguiente(): void {

    this.irPagina(
      this.paginaActual
      +
      1
    );

  }


  cambiarCantidadPagina(): void {

    this.paginaActual = 1;

  }


  // =====================================================
  // CONVERTIR FECHA
  // =====================================================

  convertirFecha(
    fecha: any
  ): number {

    if (
      !fecha
    ) {

      return 0;

    }


    const texto =
      String(
        fecha
      );


    if (
      texto.includes(
        '/'
      )
    ) {

      const partes =
        texto.split(
          '/'
        );


      if (
        partes.length
        ===
        3
      ) {

        const dia =
          Number(
            partes[0]
          );

        const mes =
          Number(
            partes[1]
          )
          -
          1;

        const anio =
          Number(
            partes[2]
          );


        return new Date(
          anio,
          mes,
          dia
        ).getTime();

      }

    }


    if (
      texto.includes(
        '-'
      )
    ) {

      const partes =
        texto.split(
          '-'
        );


      if (
        partes.length >= 3
      ) {

        const anio =
          Number(
            partes[0]
          );

        const mes =
          Number(
            partes[1]
          )
          -
          1;

        const dia =
          Number(
            partes[2]
              .substring(
                0,
                2
              )
          );


        return new Date(
          anio,
          mes,
          dia
        ).getTime();

      }

    }


    return 0;

  }


  // =====================================================
  // RESUMEN DE MEDICAMENTOS
  // =====================================================

  obtenerResumen(): void {

    this.http
      .get<any[]>(
        this.api
      )
      .subscribe({

        next: (res) => {

          console.log(
            'MEDICAMENTOS:',
            res
          );


          this.medicamentos =
            Array.isArray(
              res
            )
              ? res
              : [];


          this.totalProductos =
            this.medicamentos.length;


          this.stockBajo = 0;

          this.porVencer = 0;

          this.valorInventario = 0;

          this.stockBajoLista = [];

          this.porVencerLista = [];


          const hoy =
            new Date();


          hoy.setHours(
            0,
            0,
            0,
            0
          );


          this.medicamentos.forEach(
            (
              m:
              any
            ) => {

              const stock =
                Number(
                  m.stock
                )
                ||
                0;


              const precio =
                Number(
                  m.precio_compra
                )
                ||
                0;


              this.valorInventario +=
                stock
                *
                precio;


              const stockMinimo =
                Number(
                  m.stock_minimo
                )
                ||
                0;


              if (
                stock
                <=
                stockMinimo
              ) {

                this.stockBajo++;

                this.stockBajoLista.push(
                  m
                );

              }


              if (
                m.fecha_vencimiento
              ) {

                const fechaVencimiento =
                  this.crearFechaLocal(
                    m.fecha_vencimiento
                  );


                if (
                  fechaVencimiento
                ) {

                  fechaVencimiento.setHours(
                    0,
                    0,
                    0,
                    0
                  );


                  const diferencia =
                    fechaVencimiento
                      .getTime()
                    -
                    hoy
                      .getTime();


                  const dias =
                    Math.ceil(
                      diferencia
                      /
                      (
                        1000
                        *
                        60
                        *
                        60
                        *
                        24
                      )
                    );


                  if (
                    dias >= 0
                    &&
                    dias <= 30
                  ) {

                    this.porVencer++;

                    this.porVencerLista.push(
                      m
                    );

                  }

                }

              }

            }
          );

        },

        error: (err) => {

          console.error(
            'ERROR MEDICAMENTOS:',
            err
          );

        }

      });

  }


  // =====================================================
  // VER DETALLE DE MOVIMIENTO
  // =====================================================

  verMovimiento(
    movimiento: any
  ): void {

    if (
      movimiento.tipo
      ===
      'Entrada'
    ) {

      this.http
        .get<any>(
          'http://127.0.0.1:8000/api/compras/detalle/'
          +
          movimiento.id
          +
          '/'
        )
        .subscribe({

          next: (res) => {

            console.log(
              'DETALLE ENTRADA:',
              res
            );


            this.detalleMovimiento = {

              ...res,

              tipo:
                'Entrada'

            };


            this.mostrarDetalle = true;

          },

          error: (err) => {

            console.error(
              'Error detalle entrada:',
              err
            );

          }

        });


      return;

    }


    if (
      movimiento.tipo
      ===
      'Salida'
    ) {

      this.http
        .get<any>(
          'http://127.0.0.1:8000/api/ventas/'
          +
          movimiento.id
          +
          '/'
        )
        .subscribe({

          next: (res) => {

            console.log(
              'DETALLE SALIDA:',
              res
            );


            this.detalleMovimiento = {

              ...res.venta,

              tipo:
                'Salida',

              detalles:
                res.venta?.detalles
                ||
                []

            };


            this.mostrarDetalle = true;

          },

          error: (err) => {

            console.error(
              'Error detalle salida:',
              err
            );

          }

        });

    }

  }


  // =====================================================
  // CERRAR DETALLE
  // =====================================================

  cerrarDetalle(): void {

    this.mostrarDetalle =
      false;

    this.detalleMovimiento =
      null;

  }


  // =====================================================
  // AUXILIARES
  // =====================================================

  private normalizarTexto(
    valor: any
  ): string {

    return String(
      valor
      ??
      ''
    )
      .toLowerCase()
      .trim()
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );

  }


  private crearFechaLocal(
    valor: string
  ): Date | null {

    if (
      !valor
    ) {

      return null;

    }


    const partes =
      String(
        valor
      )
        .substring(
          0,
          10
        )
        .split(
          '-'
        );


    if (
      partes.length
      !==
      3
    ) {

      return null;

    }


    const anio =
      Number(
        partes[0]
      );

    const mes =
      Number(
        partes[1]
      );

    const dia =
      Number(
        partes[2]
      );


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
