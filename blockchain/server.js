const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');


// =====================================================
// CONFIGURACIÓN
// =====================================================

const app = express();

const PORT = 3000;

app.use(cors());

app.use(express.json());


// =====================================================
// CONEXIÓN CON GANACHE
// =====================================================

const web3 = new Web3(
    'http://127.0.0.1:7545'
);


// =====================================================
// SMART CONTRACT
// =====================================================

const CONTRACT_ADDRESS =
    '0x7eF074B4208Cb6150aFf71967D867c7B467f72Fe';


// =====================================================
// CARGAR ABI
// =====================================================

const rutaABI = path.join(
    __dirname,
    'build',
    'contracts',
    'RegistroOperaciones.json'
);


if (!fs.existsSync(rutaABI)) {

    console.error(
        'ERROR: No se encontró el archivo RegistroOperaciones.json'
    );

    process.exit(1);
}


const archivoContrato =
    JSON.parse(
        fs.readFileSync(
            rutaABI,
            'utf8'
        )
    );


const ABI =
    archivoContrato.abi;


// =====================================================
// INSTANCIA DEL SMART CONTRACT
// =====================================================

const contrato =
    new web3.eth.Contract(
        ABI,
        CONTRACT_ADDRESS
    );


// =====================================================
// GENERAR HASH SHA256
// =====================================================

function generarHash(datos) {

    const contenido =
        JSON.stringify(datos);

    return crypto
        .createHash('sha256')
        .update(contenido)
        .digest('hex');

}


// =====================================================
// RUTA DE PRUEBA
// =====================================================

app.get(
    '/',
    async (req, res) => {

        try {

            const conectado =
                await web3.eth.net.isListening();

            const cuentas =
                await web3.eth.getAccounts();

            res.json({

                estado: true,

                mensaje:
                    'Servicio Blockchain funcionando correctamente',

                ganache:
                    conectado,

                cuentas:
                    cuentas.length,

                contrato:
                    CONTRACT_ADDRESS

            });

        } catch (error) {

            res.status(500).json({

                estado: false,

                mensaje:
                    'Servicio Blockchain iniciado, pero Ganache no está disponible',

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// REGISTRAR OPERACIÓN
// =====================================================

app.post(
    '/api/blockchain/registrar/',
    async (req, res) => {

        try {

            console.log('');
            console.log(
                '=========================================='
            );
            console.log(
                'NUEVA OPERACIÓN BLOCKCHAIN'
            );
            console.log(
                '=========================================='
            );


            // =================================================
            // DATOS RECIBIDOS
            // =================================================

            const {

                tipoOperacion,

                referencia,

                usuario,

                datosOperacion

            } = req.body;


            console.log(
                'Tipo:',
                tipoOperacion
            );

            console.log(
                'Referencia:',
                referencia
            );

            console.log(
                'Usuario:',
                usuario
            );


            // =================================================
            // VALIDAR
            // =================================================

            if (
                !tipoOperacion ||
                !referencia ||
                !usuario
            ) {

                return res.status(400).json({

                    estado: false,

                    mensaje:
                        'Faltan datos para registrar la operación'

                });

            }


            // =================================================
            // GENERAR HASH
            // =================================================

            const hashOperacion =
                generarHash({

                    tipoOperacion,

                    referencia,

                    usuario,

                    datosOperacion,

                    fecha:
                        new Date().toISOString()

                });


            console.log(
                'Hash generado:',
                hashOperacion
            );


            // =================================================
            // VERIFICAR GANACHE
            // =================================================

            const conectado =
                await web3.eth.net.isListening();


            if (!conectado) {

                throw new Error(
                    'Ganache no está conectado'
                );

            }


            // =================================================
            // OBTENER CUENTA
            // =================================================

            const cuentas =
                await web3.eth.getAccounts();


            if (
                !cuentas ||
                cuentas.length === 0
            ) {

                throw new Error(
                    'No existen cuentas disponibles en Ganache'
                );

            }


            const cuenta =
                cuentas[0];


            console.log(
                'Cuenta Blockchain:',
                cuenta
            );


            // =================================================
            // REGISTRAR EN SMART CONTRACT
            // =================================================

            console.log(
                'Registrando operación en Smart Contract...'
            );


            const resultado =

                await contrato.methods

                    .registrarOperacion(

                        hashOperacion,

                        tipoOperacion,

                        referencia,

                        usuario

                    )

                    .send({

                        from:
                            cuenta,

                        gas:
                            '500000'

                    });


            // =================================================
            // DATOS DE TRANSACCIÓN
            // =================================================

            const transactionHash =
                resultado.transactionHash;


            const blockNumber =
                resultado.blockNumber !== undefined &&
                resultado.blockNumber !== null

                    ? resultado.blockNumber.toString()

                    : null;


            // =================================================
            // RESPUESTA
            // =================================================

            console.log(
                '=========================================='
            );

            console.log(
                'OPERACIÓN REGISTRADA CORRECTAMENTE'
            );

            console.log(
                '=========================================='
            );

            console.log(
                'Hash:',
                hashOperacion
            );

            console.log(
                'Transaction:',
                transactionHash
            );

            console.log(
                'Bloque:',
                blockNumber
            );


            return res.json({

                estado: true,

                mensaje:
                    'Operación registrada correctamente en Blockchain',

                hashOperacion:
                    hashOperacion,

                transactionHash:
                    transactionHash,

                blockNumber:
                    blockNumber,

                cuentaBlockchain:
                    cuenta

            });


        } catch (error) {

            console.error('');

            console.error(
                '=========================================='
            );

            console.error(
                'ERROR BLOCKCHAIN'
            );

            console.error(
                '=========================================='
            );

            console.error(
                error
            );


            return res.status(500).json({

                estado: false,

                mensaje:
                    'Error al registrar operación en Blockchain',

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// CANTIDAD DE OPERACIONES
// =====================================================

app.get(
    '/api/blockchain/cantidad/',
    async (req, res) => {

        try {

            const cantidad =
                await contrato.methods
                    .obtenerCantidadOperaciones()
                    .call();


            return res.json({

                estado: true,

                cantidad:
                    cantidad.toString()

            });

        } catch (error) {

            return res.status(500).json({

                estado: false,

                mensaje:
                    'No se pudo obtener la cantidad de operaciones',

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// OBTENER OPERACIÓN
// =====================================================

app.get(
    '/api/blockchain/operacion/:id/',
    async (req, res) => {

        try {

            const id =
                req.params.id;


            const operacion =
                await contrato.methods
                    .obtenerOperacion(id)
                    .call();


            return res.json({

                estado: true,

                operacion: {

                    id:
                        operacion[0].toString(),

                    hashOperacion:
                        operacion[1],

                    tipoOperacion:
                        operacion[2],

                    referencia:
                        operacion[3],

                    usuario:
                        operacion[4],

                    fecha:
                        operacion[5].toString(),

                    registrador:
                        operacion[6]

                }

            });


        } catch (error) {

            return res.status(500).json({

                estado: false,

                mensaje:
                    'No se pudo obtener la operación',

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// INICIAR SERVIDOR
// =====================================================

async function iniciar() {

    try {

        console.log('');
        console.log(
            '=========================================='
        );

        console.log(
            'INICIANDO SERVICIO BLOCKCHAIN'
        );

        console.log(
            '=========================================='
        );


        const conectado =
            await web3.eth.net.isListening();


        console.log(
            'Ganache conectado:',
            conectado
        );


        const cuentas =
            await web3.eth.getAccounts();


        console.log(
            'Cuentas disponibles:',
            cuentas.length
        );


        if (
            !cuentas ||
            cuentas.length === 0
        ) {

            throw new Error(
                'No existen cuentas disponibles en Ganache'
            );

        }


        console.log(
            'Cuenta utilizada:',
            cuentas[0]
        );


        app.listen(
            PORT,
            () => {

                console.log('');
                console.log(
                    '=========================================='
                );

                console.log(
                    'BLOCKCHAIN SERVICE EJECUTÁNDOSE'
                );

                console.log(
                    '=========================================='
                );

                console.log(
                    `Servidor: http://127.0.0.1:${PORT}`
                );

                console.log(
                    'Ganache: http://127.0.0.1:7545'
                );

                console.log(
                    'Smart Contract:',
                    CONTRACT_ADDRESS
                );

            }
        );


    } catch (error) {

        console.error(
            'ERROR AL INICIAR BLOCKCHAIN:'
        );

        console.error(
            error
        );

    }

}


iniciar();