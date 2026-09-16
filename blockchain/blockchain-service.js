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

app.use(cors());

app.use(express.json());

const PORT = 3000;


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
// ABI
// =====================================================

const rutaABI = path.join(
    __dirname,
    'build',
    'contracts',
    'RegistroOperaciones.json'
);

const archivoContrato = JSON.parse(
    fs.readFileSync(rutaABI, 'utf8')
);

const ABI = archivoContrato.abi;


// =====================================================
// INSTANCIA DEL CONTRATO
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
    (req, res) => {

        res.json({

            estado: true,

            mensaje:
                'Blockchain Service funcionando correctamente'

        });

    }
);


// =====================================================
// REGISTRAR OPERACIÓN EN BLOCKCHAIN
// =====================================================

app.post(
    '/api/blockchain/registrar/',
    async (req, res) => {

        try {

            console.log(
                '\n========================================'
            );

            console.log(
                'OPERACIÓN RECIBIDA DESDE DJANGO'
            );

            console.log(
                '========================================'
            );


            // =========================================
            // RECIBIR DATOS
            // =========================================

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


            // =========================================
            // GENERAR HASH SHA256
            // =========================================

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
                '\nHash SHA256 generado:'
            );

            console.log(
                hashOperacion
            );


            // =========================================
            // VERIFICAR GANACHE
            // =========================================

            const conectado =
                await web3.eth.net.isListening();


            console.log(
                '\nGanache conectado:',
                conectado
            );


            // =========================================
            // OBTENER CUENTA
            // =========================================

            const cuentas =
                await web3.eth.getAccounts();


            if (
                !cuentas ||
                cuentas.length === 0
            ) {

                throw new Error(
                    'No se encontraron cuentas disponibles en Ganache'
                );

            }


            const cuenta =
                cuentas[0];


            console.log(
                'Cuenta Blockchain:',
                cuenta
            );


            // =========================================
            // REGISTRAR EN SMART CONTRACT
            // =========================================

            console.log(
                '\nEnviando operación a Blockchain...'
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

                        from: cuenta,

                        gas: '500000'

                    });


            // =========================================
            // CONVERTIR BLOCK NUMBER
            // =========================================

            // Web3.js puede devolver blockNumber
            // como BigInt, por ejemplo: 8n.
            //
            // JSON no puede serializar BigInt.
            //
            // Por eso lo convertimos a String.

            const blockNumber =
                resultado.blockNumber !== undefined &&
                resultado.blockNumber !== null

                    ? resultado.blockNumber.toString()

                    : null;


            // =========================================
            // RESULTADO
            // =========================================

            console.log(
                '\n========================================'
            );

            console.log(
                'OPERACIÓN REGISTRADA EN BLOCKCHAIN'
            );

            console.log(
                '========================================'
            );


            console.log(
                'Hash SHA256:',
                hashOperacion
            );


            console.log(
                'Transaction Hash:',
                resultado.transactionHash
            );


            console.log(
                'Bloque:',
                blockNumber
            );


            console.log(
                'Cuenta Blockchain:',
                cuenta
            );


            // =========================================
            // RESPUESTA A DJANGO
            // =========================================

            return res.json({

                estado: true,

                mensaje:
                    'Operación registrada correctamente en Blockchain',

                hashOperacion:
                    hashOperacion,

                transactionHash:
                    resultado.transactionHash,

                blockNumber:
                    blockNumber,

                cuentaBlockchain:
                    cuenta

            });


        } catch (error) {


            console.error(
                '\nERROR BLOCKCHAIN:'
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
// INICIAR SERVICIO
// =====================================================

async function iniciar() {

    try {

        console.log(
            '========================================'
        );

        console.log(
            'INICIANDO BLOCKCHAIN SERVICE'
        );

        console.log(
            '========================================'
        );


        // =========================================
        // VERIFICAR CONEXIÓN CON GANACHE
        // =========================================

        const conectado =
            await web3.eth.net.isListening();


        console.log(
            'Ganache conectado:',
            conectado
        );


        // =========================================
        // OBTENER CUENTAS
        // =========================================

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


        // =========================================
        // INICIAR SERVIDOR
        // =========================================

        
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


app.listen(

            PORT,

            () => {

                console.log(
                    '\n========================================'
                );

                console.log(
                    'BLOCKCHAIN SERVICE EJECUTÁNDOSE'
                );

                console.log(
                    '========================================'
                );

                console.log(
                    `Servidor: http://127.0.0.1:${PORT}`
                );

                console.log(
                    'Esperando operaciones desde Django...'
                );

            }

        );


    } catch (error) {

        console.error(
            'Error al iniciar Blockchain Service:',
            error
        );

    }

}


iniciar();