import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  HttpClient
} from '@angular/common/http';

import {
  Router
} from '@angular/router';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {


  // =====================================================
  // API DJANGO
  // =====================================================

  private API =
    'http://127.0.0.1:8000/api';


  private API_MEDICAMENTOS =
    `${this.API}/medicamentos/`;


  private API_COMPRAS =
    `${this.API}/compras/`;


  private API_VENTAS =
    `${this.API}/ventas/`;


  private API_BLOCKCHAIN =
    `${this.API}/ventas/blockchain/`;


  // =====================================================
  // FECHA
  // =====================================================

  fechaActualizacion = '';


  // =====================================================
  // RESUMEN
  // =====================================================

  totalCompras = 0;

  totalVentas = 0;

  ganancia = 0;

  valorInventario = 0;

  totalMedicamentos = 0;

  stockBajo = 0;

  totalUsuarios = 0;


  // =====================================================
  // GRÁFICO
  // =====================================================

  ventasCompras: any[] = [];

  maxGrafico = 1;

  nivelesGrafico: number[] = [
    1,
    0.75,
    0.50,
    0.25,
    0
  ];


  // =====================================================
  // STOCK BAJO
  // =====================================================

  medicamentosStockBajo: any[] = [];


  // =====================================================
  // ACTIVIDADES
  // =====================================================

  actividades: any[] = [];


  // =====================================================
  // BLOCKCHAIN
  // =====================================================

  blockchain = {

    estado:
      'Sin registros',

    red:
      'Localhost',

    ultimoBloque:
      0,

    transacciones:
      0,

    seguridad:
      'Pendiente'

  };


  // =====================================================
  // ACCESOS RÁPIDOS
  // =====================================================

  accesosRapidos = [

    {
      titulo:
        'Registrar medicamento',

      descripcion:
        'Registrar un nuevo medicamento',

      icono:
        '💊'
    },

    {
      titulo:
        'Registrar compra',

      descripcion:
        'Registrar una nueva compra',

      icono:
        '🛒'
    },

    {
      titulo:
        'Registrar venta',

      descripcion:
        'Registrar una nueva venta',

      icono:
        '🧾'
    },

    {
      titulo:
        'Ver inventario',

      descripcion:
        'Consultar existencias actuales',

      icono:
        '📦'
    },

    {
      titulo:
        'Ver reportes',

      descripcion:
        'Consultar reportes del sistema',

      icono:
        '📊'
    }

  ];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {

    this.cargarDashboard();

  }


  // =====================================================
  // CARGAR DASHBOARD
  // =====================================================

  cargarDashboard(): void {

    this.fechaActualizacion =
      this.formatearFechaActualizacion(
        new Date()
      );


    this.cargarMedicamentos();

    this.cargarComprasVentas();

    this.cargarActividades();

    this.cargarUsuarios();

    this.cargarBlockchain();

  }


  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  irA(
    ruta: string
  ): void {

    this.router.navigate([
      ruta
    ]);

  }


  // =====================================================
  // OBTENER ARRAY
  // =====================================================

  private obtenerArray(
    respuesta: any
  ): any[] {

    if (
      Array.isArray(
        respuesta
      )
    ) {

      return respuesta;

    }


    if (
      respuesta
      &&
      Array.isArray(
        respuesta.results
      )
    ) {

      return respuesta.results;

    }


    return [];

  }


  // =====================================================
  // CONVERTIR A NÚMERO
  // =====================================================

  private numero(
    valor: any
  ): number {

    const numero =
      Number(valor);


    return isNaN(
      numero
    )
      ? 0
      : numero;

  }


  // =====================================================
  // OPERACIÓN ANULADA
  // =====================================================

  private esAnulada(
    registro: any
  ): boolean {

    return String(
      registro?.estado
      ??
      ''
    )
      .trim()
      .toUpperCase()
      ===
      'ANULADA';

  }


  // =====================================================
  // TOTAL COMPRA / VENTA
  // =====================================================

  private obtenerTotalCompra(
    compra: any
  ): number {

    return this.numero(

      compra.total
      ??
      compra.monto_total
      ??
      compra.total_compra
      ??
      compra.precio_total
      ??
      0

    );

  }


  private obtenerTotalVenta(
    venta: any
  ): number {

    return this.numero(

      venta.total
      ??
      venta.monto_total
      ??
      venta.total_venta
      ??
      venta.precio_total
      ??
      0

    );

  }


  // =====================================================
  // MEDICAMENTOS
  // =====================================================

  cargarMedicamentos(): void {

    this.http
      .get<any>(
        this.API_MEDICAMENTOS
      )
      .subscribe({


        next: (
          respuesta
        ) => {

          const medicamentos =
            this.obtenerArray(
              respuesta
            );


          this.totalMedicamentos =
            medicamentos.length;


          const medicamentosNormalizados =
            medicamentos.map(
              (
                medicamento:
                any
              ) => {


                const stockActual =
                  this.numero(

                    medicamento.stock_actual
                    ??
                    medicamento.stock
                    ??
                    medicamento.cantidad_stock
                    ??
                    medicamento.cantidad
                    ??
                    0

                  );


                const stockMinimo =
                  this.numero(

                    medicamento.stock_minimo
                    ??
                    medicamento.stockMinimo
                    ??
                    medicamento.minimo_stock
                    ??
                    medicamento.stock_min
                    ??
                    10

                  );


                const precioCompra =
                  this.numero(

                    medicamento.precio_compra
                    ??
                    medicamento.precio
                    ??
                    0

                  );


                return {

                  ...medicamento,

                  stock:
                    stockActual,

                  stock_actual:
                    stockActual,

                  stock_minimo:
                    stockMinimo,

                  precio_compra:
                    precioCompra

                };

              }
            );


          this.medicamentosStockBajo =
            medicamentosNormalizados.filter(
              (
                medicamento:
                any
              ) =>

                medicamento.stock
                <=
                medicamento.stock_minimo

            );


          this.stockBajo =
            this
              .medicamentosStockBajo
              .length;


          this.valorInventario =
            medicamentosNormalizados.reduce(
              (
                total:
                number,

                medicamento:
                any
              ) =>

                total
                +
                (
                  this.numero(
                    medicamento.stock
                  )
                  *
                  this.numero(
                    medicamento.precio_compra
                  )
                ),

              0

            );

        },


        error: (
          error
        ) => {

          console.error(
            'Error al cargar medicamentos:',
            error
          );


          this.totalMedicamentos =
            0;

          this.stockBajo =
            0;

          this.valorInventario =
            0;

          this.medicamentosStockBajo =
            [];

        }

      });

  }


  // =====================================================
  // COMPRAS Y VENTAS
  // =====================================================

  cargarComprasVentas(): void {

    this.http
      .get<any>(
        this.API_COMPRAS
      )
      .subscribe({


        next: (
          respuestaCompras
        ) => {

          const compras =
            this.obtenerArray(
              respuestaCompras
            );


          const comprasValidas =
            compras.filter(
              (
                compra:
                any
              ) =>

                !this.esAnulada(
                  compra
                )
            );


          this.totalCompras =
            comprasValidas.reduce(
              (
                total:
                number,

                compra:
                any
              ) =>

                total
                +
                this.obtenerTotalCompra(
                  compra
                ),

              0

            );


          this.http
            .get<any>(
              this.API_VENTAS
            )
            .subscribe({


              next: (
                respuestaVentas
              ) => {

                const ventas =
                  this.obtenerArray(
                    respuestaVentas
                  );


                const ventasValidas =
                  ventas.filter(
                    (
                      venta:
                      any
                    ) =>

                      !this.esAnulada(
                        venta
                      )
                  );


                this.totalVentas =
                  ventasValidas.reduce(
                    (
                      total:
                      number,

                      venta:
                      any
                    ) =>

                      total
                      +
                      this.obtenerTotalVenta(
                        venta
                      ),

                    0

                  );


                this.ganancia =
                  this.totalVentas
                  -
                  this.totalCompras;


                this.crearDatosGrafico(
                  comprasValidas,
                  ventasValidas
                );

              },


              error: (
                error
              ) => {

                console.error(
                  'Error al cargar ventas:',
                  error
                );


                this.totalVentas =
                  0;

                this.ganancia =
                  -this.totalCompras;

                this.ventasCompras =
                  [];

              }

            });

        },


        error: (
          error
        ) => {

          console.error(
            'Error al cargar compras:',
            error
          );


          this.totalCompras =
            0;

          this.ventasCompras =
            [];

        }

      });

  }


  // =====================================================
  // DATOS DEL GRÁFICO
  // =====================================================

  crearDatosGrafico(
    compras: any[],
    ventas: any[]
  ): void {


    const meses: {
      [key: string]: {
        mes: string;
        compras: number;
        ventas: number;
      }
    } = {};


    compras.forEach(
      (
        compra:
        any
      ) => {


        const fecha =
          this.crearFecha(
            compra.fecha
          );


        if (!fecha) {
          return;
        }


        const clave =
          this.obtenerClaveMes(
            fecha
          );


        if (!meses[clave]) {

          meses[clave] = {

            mes:
              clave,

            compras:
              0,

            ventas:
              0

          };

        }


        meses[
          clave
        ].compras +=
          this.obtenerTotalCompra(
            compra
          );

      }
    );


    ventas.forEach(
      (
        venta:
        any
      ) => {


        const fecha =
          this.crearFecha(
            venta.fecha
          );


        if (!fecha) {
          return;
        }


        const clave =
          this.obtenerClaveMes(
            fecha
          );


        if (!meses[clave]) {

          meses[clave] = {

            mes:
              clave,

            compras:
              0,

            ventas:
              0

          };

        }


        meses[
          clave
        ].ventas +=
          this.obtenerTotalVenta(
            venta
          );

      }
    );


    this.ventasCompras =
      Object.values(
        meses
      )
        .sort(
          (
            a,
            b
          ) =>

            a.mes.localeCompare(
              b.mes
            )
        )
        .slice(
          -6
        );


    if (
      this
        .ventasCompras
        .length
      ===
      0
    ) {

      this.maxGrafico =
        1;

      this.actualizarNivelesGrafico();

      return;

    }


    const valores:
      number[] = [];


    this.ventasCompras.forEach(
      (
        dato:
        any
      ) => {

        valores.push(
          this.numero(
            dato.compras
          )
        );

        valores.push(
          this.numero(
            dato.ventas
          )
        );

      }
    );


    this.maxGrafico =
      Math.max(
        ...valores,
        1
      );


    this.actualizarNivelesGrafico();

  }


  // =====================================================
  // ESCALA DEL GRÁFICO
  // =====================================================

  private actualizarNivelesGrafico(): void {


    const maximo =
      this.maxGrafico;


    const pasoBruto =
      maximo
      /
      4;


    const magnitud =
      Math.pow(
        10,
        Math.floor(
          Math.log10(
            Math.max(
              pasoBruto,
              1
            )
          )
        )
      );


    const paso =
      Math.ceil(
        pasoBruto
        /
        magnitud
      )
      *
      magnitud;


    const maxEscala =
      Math.max(
        paso
        *
        4,
        1
      );


    this.maxGrafico =
      maxEscala;


    this.nivelesGrafico = [

      maxEscala,

      maxEscala
      *
      0.75,

      maxEscala
      *
      0.50,

      maxEscala
      *
      0.25,

      0

    ];

  }


  obtenerAlturaBarra(
    valor: any
  ): number {


    const numero =
      this.numero(
        valor
      );


    if (
      numero <= 0
    ) {

      return 1;

    }


    return Math.min(
      100,
      (
        numero
        /
        Math.max(
          this.maxGrafico,
          1
        )
      )
      *
      100
    );

  }


  // =====================================================
  // ACTIVIDADES
  // =====================================================

  cargarActividades(): void {

    this.http
      .get<any>(
        this.API_COMPRAS
      )
      .subscribe({


        next: (
          respuestaCompras
        ) => {


          const compras =
            this.obtenerArray(
              respuestaCompras
            );


          this.http
            .get<any>(
              this.API_VENTAS
            )
            .subscribe({


              next: (
                respuestaVentas
              ) => {


                const ventas =
                  this.obtenerArray(
                    respuestaVentas
                  );


                const actividadesCompras =
                  compras.map(
                    (
                      compra:
                      any
                    ) => {


                      const anulada =
                        this.esAnulada(
                          compra
                        );


                      const corregida =
                        Boolean(
                          compra.compra_origen_id
                          ??
                          compra.compra_origen
                        );


                      return {

                        usuario:
                          compra.anulado_por
                          ??
                          compra.usuario_nombre
                          ??
                          compra.usuario
                          ??
                          'Administrador',

                        accion:
                          anulada
                            ? 'Anuló una compra'
                            : (
                                corregida
                                  ? 'Registró una compra corregida'
                                  : 'Registró una compra'
                              ),

                        modulo:
                          'Compras',

                        fecha:
                          compra.fecha_anulacion
                          ??
                          compra.fecha,

                        estado:
                          anulada
                            ? 'ANULADA'
                            : (
                                compra.estado
                                ??
                                'RECIBIDA'
                              )

                      };

                    }
                  );


                const actividadesVentas =
                  ventas.map(
                    (
                      venta:
                      any
                    ) => {


                      const anulada =
                        this.esAnulada(
                          venta
                        );


                      const corregida =
                        Boolean(
                          venta.venta_origen_id
                          ??
                          venta.venta_origen
                        );


                      return {

                        usuario:
                          venta.anulado_por
                          ??
                          venta.usuario_nombre
                          ??
                          venta.usuario
                          ??
                          'Administrador',

                        accion:
                          anulada
                            ? 'Anuló una venta'
                            : (
                                corregida
                                  ? 'Registró una venta corregida'
                                  : 'Registró una venta'
                              ),

                        modulo:
                          'Ventas',

                        fecha:
                          venta.fecha_anulacion
                          ??
                          venta.fecha,

                        estado:
                          anulada
                            ? 'ANULADA'
                            : (
                                venta.estado
                                ??
                                'COMPLETADA'
                              )

                      };

                    }
                  );


                this.actividades = [

                  ...actividadesCompras,

                  ...actividadesVentas

                ]
                  .sort(
                    (
                      a:
                      any,

                      b:
                      any
                    ) =>

                      this.obtenerTimestamp(
                        b.fecha
                      )
                      -
                      this.obtenerTimestamp(
                        a.fecha
                      )
                  )
                  .slice(
                    0,
                    6
                  );

              },


              error: (
                error
              ) => {

                console.error(
                  'Error al cargar actividades de ventas:',
                  error
                );


                this.actividades =
                  [];

              }

            });

        },


        error: (
          error
        ) => {

          console.error(
            'Error al cargar actividades de compras:',
            error
          );


          this.actividades =
            [];

        }

      });

  }


  // =====================================================
  // USUARIOS
  // =====================================================

  cargarUsuarios(): void {

    this.http
      .get<any>(
        `${this.API}/usuarios-sistema/`
      )
      .subscribe({


        next: (
          respuesta
        ) => {


          if (
            respuesta
            &&
            respuesta.estado
          ) {

            const usuarios =
              respuesta.usuarios
              ??
              [];


            this.totalUsuarios =
              usuarios.length;

          }
          else {

            this.totalUsuarios =
              0;

          }

        },


        error: (
          error
        ) => {

          console.error(
            'Error al cargar usuarios:',
            error
          );


          this.totalUsuarios =
            0;

        }

      });

  }


  // =====================================================
  // BLOCKCHAIN
  // =====================================================

  cargarBlockchain(): void {

    this.http
      .get<any>(
        this.API_BLOCKCHAIN
      )
      .subscribe({


        next: (
          respuesta
        ) => {


          const registros =
            this.obtenerArray(
              respuesta
            );


          const registrosEnCadena =
            registros.filter(
              (
                registro:
                any
              ) => {


                const hash =
                  registro.hash
                  ??
                  registro.hash_operacion;


                const transaccion =
                  registro.transactionHash
                  ??
                  registro.transaction_hash;


                const bloque =
                  registro.blockNumber
                  ??
                  registro.block_number;


                return Boolean(
                  hash
                  &&
                  transaccion
                  &&
                  bloque !== null
                  &&
                  bloque !== undefined
                );

              }
            );


          let ultimoBloque =
            0;


          registrosEnCadena.forEach(
            (
              registro:
              any
            ) => {


              const bloque =
                this.numero(

                  registro.blockNumber
                  ??
                  registro.block_number

                );


              if (
                bloque
                >
                ultimoBloque
              ) {

                ultimoBloque =
                  bloque;

              }

            }
          );


          const registrosIntegro =
            registros.filter(
              (
                registro:
                any
              ) => {


                const estado =
                  String(
                    registro.estado
                    ??
                    ''
                  )
                    .trim()
                    .toUpperCase();


                return (
                  estado ===
                  'VERIFICADO'
                  ||
                  estado ===
                  'ACTIVA'
                  ||
                  estado ===
                  'ANULADA'
                );

              }
            ).length;


          this.blockchain = {

            estado:
              registrosEnCadena.length
              >
              0
                ? 'Conectado'
                : 'Sin registros',

            red:
              'Localhost',

            ultimoBloque:
              ultimoBloque,

            transacciones:
              registrosEnCadena.length,

            seguridad:
              registrosIntegro
              >
              0
                ? 'Activa'
                : 'Pendiente'

          };

        },


        error: (
          error
        ) => {

          console.error(
            'Error al cargar Blockchain:',
            error
          );


          this.blockchain = {

            estado:
              'Sin conexión',

            red:
              'Localhost',

            ultimoBloque:
              0,

            transacciones:
              0,

            seguridad:
              'Pendiente'

          };

        }

      });

  }


  // =====================================================
  // STOCK
  // =====================================================

  obtenerEstadoStock(
    stockActual: number,
    stockMinimo: number
  ): string {


    const cantidad =
      this.numero(
        stockActual
      );


    const minimo =
      this.numero(
        stockMinimo
      );


    if (
      cantidad <= 0
    ) {

      return 'Agotado';

    }


    if (
      cantidad <= minimo
    ) {

      return 'Bajo';

    }


    return 'Disponible';

  }


  // =====================================================
  // ACCESOS RÁPIDOS
  // =====================================================

  ejecutarAcceso(
    titulo: string
  ): void {


    switch (
      titulo
    ) {


      case 'Registrar medicamento':

        this.irA(
          '/medicamentos'
        );

        break;


      case 'Registrar compra':

        this.irA(
          '/compras'
        );

        break;


      case 'Registrar venta':

        this.irA(
          '/ventas'
        );

        break;


      case 'Ver inventario':

        this.irA(
          '/inventario'
        );

        break;


      case 'Ver reportes':

        this.irA(
          '/reportes'
        );

        break;

    }

  }


  // =====================================================
  // FECHAS
  // =====================================================

  private crearFecha(
    valor: any
  ): Date | null {


    if (!valor) {

      return null;

    }


    const texto =
      String(
        valor
      );


    if (
      /^\d{4}-\d{2}-\d{2}$/
        .test(
          texto
        )
    ) {


      const partes =
        texto.split(
          '-'
        );


      return new Date(

        Number(
          partes[0]
        ),

        Number(
          partes[1]
        )
        -
        1,

        Number(
          partes[2]
        )

      );

    }


    const fecha =
      new Date(
        valor
      );


    return isNaN(
      fecha.getTime()
    )
      ? null
      : fecha;

  }


  private obtenerClaveMes(
    fecha: Date
  ): string {


    return (

      fecha.getFullYear()

      +

      '-'

      +

      String(
        fecha.getMonth()
        +
        1
      ).padStart(
        2,
        '0'
      )

    );

  }


  private obtenerTimestamp(
    valor: any
  ): number {


    const fecha =
      this.crearFecha(
        valor
      );


    return fecha
      ? fecha.getTime()
      : 0;

  }


  formatearFechaCorta(
    valor: any
  ): string {


    const fecha =
      this.crearFecha(
        valor
      );


    if (!fecha) {

      return '-';

    }


    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );


    const mes =
      String(
        fecha.getMonth()
        +
        1
      ).padStart(
        2,
        '0'
      );


    return (

      `${dia}/${mes}/${fecha.getFullYear()}`

    );

  }


  private formatearFechaActualizacion(
    fecha: Date
  ): string {


    const meses = [

      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'

    ];


    return (

      `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`

    );

  }


}
