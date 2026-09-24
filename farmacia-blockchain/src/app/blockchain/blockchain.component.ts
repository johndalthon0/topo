import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface RegistroBlockchain {
  id: string | number;
  factura: string;
  hash: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  cuentaBlockchain: string | null;
  estado: string;
  operacion: string;
  referencia: string;
  usuario: string;
  fecha: string;
}

@Component({
  selector: 'app-blockchain',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './blockchain.component.html',
  styleUrls: ['./blockchain.component.css']
})
export class BlockchainComponent implements OnInit {

  // =====================================================
  // ENDPOINTS
  // =====================================================

  private blockchainUrl =
    `${environment.apiUrl}/api/ventas/blockchain/`;

  private comprasUrl =
    `${environment.apiUrl}/api/compras/`;

  private ventasUrl =
    `${environment.apiUrl}/api/ventas/`;


  // =====================================================
  // ESTADO
  // =====================================================

  blockchainConectada = false;

  cargando = true;

  error = '';


  // =====================================================
  // REGISTROS
  // =====================================================

  registros: RegistroBlockchain[] = [];

  buscar = '';


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  paginaActual = 1;

  registrosPorPagina = 8;


  // =====================================================
  // DETALLE
  // =====================================================

  registroSeleccionado:
    RegistroBlockchain | null = null;

  mostrarDetalle = false;


  constructor(
    private http: HttpClient
  ) {}


  ngOnInit(): void {

    this.cargarRegistros();

  }


  // =====================================================
  // CARGAR HISTORIAL COMPLETO
  // =====================================================

  cargarRegistros(): void {

    this.cargando = true;

    this.error = '';

    this.registros = [];

    this.paginaActual = 1;


    this.http
      .get<any[]>(
        this.blockchainUrl
      )
      .subscribe({

        next: (respuesta) => {

          console.log(
            'HISTORIAL BLOCKCHAIN:',
            respuesta
          );


          if (
            !Array.isArray(
              respuesta
            )
          ) {

            this.error =
              'El backend Blockchain devolvió una respuesta no válida.';

            this.cargando =
              false;

            return;

          }


          this.registros =
            respuesta.map(
              registro =>
                this.mapearRegistro(
                  registro
                )
            );


          this.ordenarRegistros();

          this.actualizarEstadoBlockchain();

          this.cargando =
            false;

        },


        error: (error) => {

          console.error(
            'ERROR AL CARGAR HISTORIAL BLOCKCHAIN:',
            error
          );


          this.cargarRegistrosRespaldo();

        }

      });

  }


  // =====================================================
  // MAPEAR RESPUESTA DEL BACKEND
  // =====================================================

  private mapearRegistro(
    registro: any
  ): RegistroBlockchain {

    return {

      id:
        registro.id
        ??
        '',

      factura:
        registro.factura
        ??
        '',

      hash:
        registro.hash
        ??
        registro.hash_operacion
        ??
        null,

      transactionHash:
        registro.transactionHash
        ??
        registro.transaction_hash
        ??
        null,

      blockNumber:
        registro.blockNumber
        ??
        registro.block_number
        ??
        null,

      cuentaBlockchain:
        registro.cuentaBlockchain
        ??
        registro.cuenta_blockchain
        ??
        null,

      estado:
        this.normalizarEstado(
          registro.estado
          ??
          registro.estado_blockchain
          ??
          'No registrado'
        ),

      operacion:
        this.normalizarOperacion(
          registro
        ),

      referencia:
        registro.referencia
        ??
        registro.factura
        ??
        '-',

      usuario:
        registro.usuario
        ??
        'Administrador',

      fecha:
        this.formatearFecha(
          registro.fecha
        )

    };

  }


  // =====================================================
  // NORMALIZAR OPERACIÓN
  // =====================================================

  private normalizarOperacion(
    registro: any
  ): string {

    const operacion =
      String(
        registro.operacion
        ??
        registro.tipo_operacion
        ??
        ''
      )
      .trim();


    const op =
      operacion.toLowerCase();


    if (
      op === 'compra'
    ) {

      return 'Compra original';

    }


    if (
      op === 'venta'
    ) {

      return 'Venta original';

    }


    if (
      op === 'anulación'
      ||
      op === 'anulacion'
    ) {

      if (
        this.esIdCompra(
          registro.id
        )
      ) {

        return 'Anulación de compra';

      }


      if (
        this.esIdVenta(
          registro.id
        )
      ) {

        return 'Anulación de venta';

      }

    }


    return (
      operacion
      ||
      'Operación'
    );

  }


  // =====================================================
  // NORMALIZAR ESTADO
  // =====================================================

  private normalizarEstado(
    estado: any
  ): string {

    const texto =
      String(
        estado
        ??
        ''
      )
      .trim();


    const mayuscula =
      texto.toUpperCase();


    if (
      mayuscula === 'VERIFICADO'
    ) {

      return 'Verificado';

    }


    if (
      mayuscula === 'ACTIVA'
      ||
      mayuscula === 'ACTIVO'
    ) {

      return 'Activa';

    }


    if (
      mayuscula === 'ANULADA'
      ||
      mayuscula === 'ANULADO'
    ) {

      return 'Anulada';

    }


    if (
      mayuscula === 'NO_REGISTRADO'
      ||
      mayuscula === 'NO REGISTRADO'
    ) {

      return 'No registrado';

    }


    return (
      texto
      ||
      'No registrado'
    );

  }


  // =====================================================
  // MODO RESPALDO
  // =====================================================

  private cargarRegistrosRespaldo(): void {

    this.http
      .get<any[]>(
        this.comprasUrl
      )
      .subscribe({

        next: (compras) => {

          const registrosCompras:
            RegistroBlockchain[] =
            compras.map(
              compra => ({

                id:
                  'C-'
                  +
                  compra.id,

                factura:
                  compra.factura
                  ||
                  '',

                hash:
                  compra.hash_operacion
                  ||
                  null,

                transactionHash:
                  compra.transaction_hash
                  ||
                  null,

                blockNumber:
                  compra.block_number
                  ??
                  null,

                cuentaBlockchain:
                  compra.cuenta_blockchain
                  ||
                  null,

                estado:
                  this.normalizarEstado(
                    compra.estado ===
                    'ANULADA'
                      ?
                      'ANULADA'
                      :
                      (
                        compra.estado_blockchain
                        ||
                        'No registrado'
                      )
                  ),

                operacion:
                  'Compra original',

                referencia:
                  `Compra #${compra.id} - Factura ${compra.factura || ''}`,

                usuario:
                  compra.usuario
                  ||
                  'Administrador',

                fecha:
                  this.formatearFecha(
                    compra.fecha
                  )

              })
            );


          this.cargarVentasRespaldo(
            registrosCompras
          );

        },


        error: () => {

          this.cargarVentasRespaldo(
            []
          );

        }

      });

  }


  private cargarVentasRespaldo(
    registrosCompras:
      RegistroBlockchain[]
  ): void {

    this.http
      .get<any[]>(
        this.ventasUrl
      )
      .subscribe({

        next: (ventas) => {

          const registrosVentas:
            RegistroBlockchain[] =
            ventas.map(
              venta => ({

                id:
                  'V-'
                  +
                  venta.id,

                factura:
                  venta.numero_venta
                  ||
                  '',

                hash:
                  venta.hash_operacion
                  ||
                  null,

                transactionHash:
                  venta.transaction_hash
                  ||
                  null,

                blockNumber:
                  venta.block_number
                  ??
                  null,

                cuentaBlockchain:
                  venta.cuenta_blockchain
                  ||
                  null,

                estado:
                  this.normalizarEstado(
                    venta.estado ===
                    'ANULADA'
                      ?
                      'ANULADA'
                      :
                      (
                        venta.estado_blockchain
                        ||
                        'No registrado'
                      )
                  ),

                operacion:
                  'Venta original',

                referencia:
                  `Venta #${venta.id} - ${venta.numero_venta || ''}`,

                usuario:
                  venta.usuario
                  ||
                  'Administrador',

                fecha:
                  this.formatearFecha(
                    venta.fecha
                  )

              })
            );


          this.registros = [

            ...registrosCompras,

            ...registrosVentas

          ];


          this.ordenarRegistros();

          this.actualizarEstadoBlockchain();


          this.error =
            'Se cargó el modo de compatibilidad. El historial completo requiere /api/ventas/blockchain/.';


          this.cargando =
            false;

        },


        error: (error) => {

          console.error(
            'ERROR AL CARGAR RESPALDO:',
            error
          );


          this.registros =
            registrosCompras;


          this.ordenarRegistros();

          this.actualizarEstadoBlockchain();

          this.cargando =
            false;


          if (
            this.registros.length === 0
          ) {

            this.error =
              'No se pudo conectar con Django.';

          }

        }

      });

  }


  // =====================================================
  // ORDENAR
  // =====================================================

  private ordenarRegistros(): void {

    this.registros.sort(
      (
        a,
        b
      ) => {

        const fechaA =
          this.convertirFecha(
            a.fecha
          );

        const fechaB =
          this.convertirFecha(
            b.fecha
          );


        if (
          fechaA !== fechaB
        ) {

          return (
            fechaB
            -
            fechaA
          );

        }


        return (
          this.obtenerNumeroId(
            b.id
          )
          -
          this.obtenerNumeroId(
            a.id
          )
        );

      }
    );

  }


  private actualizarEstadoBlockchain(): void {

    this.blockchainConectada =
      this.registros.some(
        registro =>
          registro.hash !== null
          &&
          registro.transactionHash !== null
          &&
          registro.blockNumber !== null
      );

  }


  // =====================================================
  // FECHA
  // =====================================================

  formatearFecha(
    fecha: any
  ): string {

    if (
      !fecha
    ) {

      return '-';

    }


    const texto =
      String(
        fecha
      );


    const fechaDate =
      new Date(
        texto
      );


    if (
      !isNaN(
        fechaDate.getTime()
      )
    ) {

      const dia =
        String(
          fechaDate.getDate()
        )
        .padStart(
          2,
          '0'
        );


      const mes =
        String(
          fechaDate.getMonth()
          +
          1
        )
        .padStart(
          2,
          '0'
        );


      const anio =
        fechaDate.getFullYear();


      if (
        texto.includes(
          'T'
        )
      ) {

        const hora =
          String(
            fechaDate.getHours()
          )
          .padStart(
            2,
            '0'
          );


        const minuto =
          String(
            fechaDate.getMinutes()
          )
          .padStart(
            2,
            '0'
          );


        return `${dia}/${mes}/${anio} ${hora}:${minuto}`;

      }


      return `${dia}/${mes}/${anio}`;

    }


    return texto;

  }


  convertirFecha(
    fecha: string
  ): number {

    if (
      !fecha
      ||
      fecha === '-'
    ) {

      return 0;

    }


    const expresion =
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/;


    const resultado =
      fecha.match(
        expresion
      );


    if (
      resultado
    ) {

      return new Date(

        Number(
          resultado[3]
        ),

        Number(
          resultado[2]
        )
        -
        1,

        Number(
          resultado[1]
        ),

        Number(
          resultado[4]
          ||
          0
        ),

        Number(
          resultado[5]
          ||
          0
        )

      ).getTime();

    }


    const timestamp =
      new Date(
        fecha
      )
      .getTime();


    return isNaN(
      timestamp
    )
      ?
      0
      :
      timestamp;

  }


  private obtenerNumeroId(
    id: string | number
  ): number {

    if (
      typeof id ===
      'number'
    ) {

      return id;

    }


    const coincidencias =
      String(
        id
      )
      .match(
        /(\d+)$/
      );


    return coincidencias
      ?
      Number(
        coincidencias[1]
      )
      :
      0;

  }


  // =====================================================
  // CLASIFICAR OPERACIONES
  // =====================================================

  private esIdCompra(
    id: any
  ): boolean {

    return String(
      id
      ??
      ''
    )
      .toUpperCase()
      .startsWith(
        'C-'
      );

  }


  private esIdVenta(
    id: any
  ): boolean {

    return String(
      id
      ??
      ''
    )
      .toUpperCase()
      .startsWith(
        'V-'
      );

  }


  esCompra(
    registro:
      RegistroBlockchain
  ): boolean {

    const op =
      registro.operacion
        .toLowerCase();


    return (
      this.esIdCompra(
        registro.id
      )
      ||
      op.includes(
        'compra'
      )
    );

  }


  esVenta(
    registro:
      RegistroBlockchain
  ): boolean {

    const op =
      registro.operacion
        .toLowerCase();


    return (
      this.esIdVenta(
        registro.id
      )
      ||
      op.includes(
        'venta'
      )
    );

  }


  esAnulacion(
    registro:
      RegistroBlockchain
  ): boolean {

    const op =
      registro.operacion
        .toLowerCase();


    return (
      op.includes(
        'anulación'
      )
      ||
      op.includes(
        'anulacion'
      )
    );

  }


  esCorreccion(
    registro:
      RegistroBlockchain
  ): boolean {

    const op =
      registro.operacion
        .toLowerCase();


    return (
      op.includes(
        'corregida'
      )
      ||
      op.includes(
        'corrección'
      )
      ||
      op.includes(
        'correccion'
      )
    );

  }


  iconoOperacion(
    registro:
      RegistroBlockchain
  ): string {

    if (
      this.esAnulacion(
        registro
      )
    ) {

      return '🚫';

    }


    if (
      this.esCorreccion(
        registro
      )
    ) {

      return '🔄';

    }


    if (
      this.esCompra(
        registro
      )
    ) {

      return '📥';

    }


    if (
      this.esVenta(
        registro
      )
    ) {

      return '📤';

    }


    return '🔗';

  }


  claseOperacion(
    registro:
      RegistroBlockchain
  ): string {

    if (
      this.esAnulacion(
        registro
      )
    ) {

      return 'anulacion';

    }


    if (
      this.esCorreccion(
        registro
      )
    ) {

      return 'correccion';

    }


    if (
      this.esCompra(
        registro
      )
    ) {

      return 'compra';

    }


    if (
      this.esVenta(
        registro
      )
    ) {

      return 'venta';

    }


    return 'otro';

  }


  claseEstado(
    estado: string
  ): string {

    const texto =
      String(
        estado
        ??
        ''
      )
      .toLowerCase()
      .trim();


    if (
      texto === 'verificado'
    ) {

      return 'estado-verificado';

    }


    if (
      texto === 'activa'
    ) {

      return 'estado-activa';

    }


    if (
      texto === 'anulada'
    ) {

      return 'estado-anulada';

    }


    return 'estado-no-registrado';

  }


  // =====================================================
  // BUSCADOR
  // =====================================================

  get registrosFiltrados():
    RegistroBlockchain[] {

    const texto =
      this.normalizarTexto(
        this.buscar
      );


    if (
      texto === ''
    ) {

      return this.registros;

    }


    return this.registros.filter(
      registro => {

        const valores = [

          registro.id,

          registro.hash,

          registro.transactionHash,

          registro.operacion,

          registro.referencia,

          registro.usuario,

          registro.estado,

          registro.factura,

          registro.blockNumber,

          registro.cuentaBlockchain

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


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  get totalPaginas(): number {

    return Math.max(

      1,

      Math.ceil(
        this.registrosFiltrados.length
        /
        this.registrosPorPagina
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
      this.registrosPorPagina
    );

  }


  get indiceFin(): number {

    return Math.min(

      this.indiceInicio
      +
      this.registrosPorPagina,

      this.registrosFiltrados.length

    );

  }


  get registrosPaginados():
    RegistroBlockchain[] {

    if (
      this.paginaActual >
      this.totalPaginas
    ) {

      this.paginaActual =
        this.totalPaginas;

    }


    return this.registrosFiltrados.slice(

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


  // =====================================================
  // ESTADÍSTICAS
  // =====================================================

  get totalRegistros(): number {

    return this.registros.length;

  }


  get registrosVerificados(): number {

    return this.registros.filter(
      registro =>
        registro.estado ===
        'Verificado'
        ||
        registro.estado ===
        'Activa'
    ).length;

  }


  get totalCompras(): number {

    return this.registros.filter(
      registro =>
        this.esCompra(
          registro
        )
        &&
        !this.esAnulacion(
          registro
        )
        &&
        !this.esCorreccion(
          registro
        )
    ).length;

  }


  get totalVentas(): number {

    return this.registros.filter(
      registro =>
        this.esVenta(
          registro
        )
        &&
        !this.esAnulacion(
          registro
        )
        &&
        !this.esCorreccion(
          registro
        )
    ).length;

  }


  get totalAnulaciones(): number {

    return this.registros.filter(
      registro =>
        this.esAnulacion(
          registro
        )
    ).length;

  }


  get totalCorrecciones(): number {

    return this.registros.filter(
      registro =>
        this.esCorreccion(
          registro
        )
    ).length;

  }


  get registrosNoRegistrados(): number {

    return this.registros.filter(
      registro =>
        registro.estado ===
        'No registrado'
    ).length;

  }


  // =====================================================
  // DETALLE
  // =====================================================

  verDetalle(
    registro:
      RegistroBlockchain
  ): void {

    this.registroSeleccionado =
      registro;

    this.mostrarDetalle =
      true;

  }


  cerrarDetalle(): void {

    this.mostrarDetalle =
      false;

    this.registroSeleccionado =
      null;

  }


  copiarHash(
    hash: string | null
  ): void {

    if (
      !hash
    ) {

      alert(
        'Este registro todavía no tiene Hash Blockchain.'
      );

      return;

    }


    navigator.clipboard
      .writeText(
        hash
      )
      .then(
        () => {

          alert(
            'Hash copiado correctamente'
          );

        }
      )
      .catch(
        () => {

          alert(
            'No se pudo copiar el Hash.'
          );

        }
      );

  }


  copiarTransactionHash(
    hash: string | null
  ): void {

    if (
      !hash
    ) {

      alert(
        'Este registro todavía no tiene Transaction Hash.'
      );

      return;

    }


    navigator.clipboard
      .writeText(
        hash
      )
      .then(
        () => {

          alert(
            'Transaction Hash copiado correctamente'
          );

        }
      )
      .catch(
        () => {

          alert(
            'No se pudo copiar el Transaction Hash.'
          );

        }
      );

  }


  recargar(): void {

    this.cargarRegistros();

  }

}
