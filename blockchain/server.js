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

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());


// =====================================================
// CONEXIÓN CON LA RED (Ganache local o testnet Sepolia
// vía Infura/Alchemy en la nube)
// =====================================================

const WEB3_PROVIDER_URL =
    process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:7545';

const web3 = new Web3(
    WEB3_PROVIDER_URL
);


// =====================================================
// CUENTA QUE FIRMA LAS TRANSACCIONES
// =====================================================
// En local (Ganache) las cuentas vienen "desbloqueadas" y se usa
// web3.eth.getAccounts(). En una red pública (Sepolia) no existen
// cuentas desbloqueadas: hay que firmar con una clave privada propia
// (variable de entorno PRIVATE_KEY, con fondos de un faucet de Sepolia).

const PRIVATE_KEY = process.env.PRIVATE_KEY || null;

let cuentaFirmante = null;

if (PRIVATE_KEY) {

    const cuenta =
        web3.eth.accounts.privateKeyToAccount(
            PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
        );

    web3.eth.accounts.wallet.add(cuenta);

    cuentaFirmante = cuenta.address;
}


// =====================================================
// SMART CONTRACT
// =====================================================

const CONTRACT_ADDRESS =
    process.env.CONTRACT_ADDRESS ||
    '0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab';


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
                cuentaFirmante
                    ? [cuentaFirmante]
                    : await web3.eth.getAccounts();

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

                hashOperacion: hashOperacionRecibido,

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
                (typeof hashOperacionRecibido === 'string' && /^[a-fA-F0-9]{64}$/.test(hashOperacionRecibido))
                    ? hashOperacionRecibido.toLowerCase()
                    : generarHash({
                        tipoOperacion,
                        referencia,
                        usuario,
                        datosOperacion
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
            // OBTENER CUENTA (firmante local vía PRIVATE_KEY, o
            // primera cuenta desbloqueada de Ganache)
            // =================================================

            let cuenta =
                cuentaFirmante;

            if (!cuenta) {

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

                cuenta = cuentas[0];

            }


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
// VERIFICAR HASH EN BLOCKCHAIN
// =====================================================

app.post(
    '/api/blockchain/verificar/',
    async (req, res) => {
        try {
            const { hashOperacion, referencia } = req.body || {};

            if (!hashOperacion) {
                return res.status(400).json({
                    estado: false,
                    encontrado: false,
                    mensaje: 'Debe enviar hashOperacion'
                });
            }

            const cantidadRaw = await contrato.methods
                .obtenerCantidadOperaciones()
                .call();

            const cantidad = Number(cantidadRaw);

            for (let i = cantidad - 1; i >= 0; i--) {
                const op = await contrato.methods
                    .obtenerOperacion(i)
                    .call();

                const hash = op[1];
                const ref = op[3];

                if (
                    String(hash).toLowerCase() === String(hashOperacion).toLowerCase()
                    && (!referencia || String(ref) === String(referencia))
                ) {
                    return res.json({
                        estado: true,
                        encontrado: true,
                        id: op[0].toString(),
                        hashOperacion: hash,
                        referencia: ref,
                        tipoOperacion: op[2],
                        usuario: op[4],
                        fecha: op[5].toString(),
                        registrador: op[6]
                    });
                }
            }

            return res.json({
                estado: true,
                encontrado: false,
                mensaje: 'El hash no fue encontrado en Blockchain'
            });

        } catch (error) {
            return res.status(500).json({
                estado: false,
                encontrado: false,
                mensaje: 'No se pudo verificar el hash en Blockchain',
                error: error.message
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
            'Red conectada:',
            conectado
        );


        let cuentaUsada =
            cuentaFirmante;

        if (!cuentaUsada) {

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

            cuentaUsada = cuentas[0];

        }


        console.log(
            'Cuenta utilizada:',
            cuentaUsada,
            cuentaFirmante ? '(firmante local vía PRIVATE_KEY)' : '(cuenta de Ganache)'
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
                    'Proveedor Web3:', WEB3_PROVIDER_URL
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