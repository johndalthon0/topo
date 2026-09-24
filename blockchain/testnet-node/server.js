// =====================================================
// NODO BLOCKCHAIN DE PRUEBA (siempre activo, sin wallets)
// =====================================================
//
// Es el mismo Ganache que se usa en local, pero envuelto en un
// pequeño servidor Express para poder desplegarlo como Web Service
// gratuito en Render:
//   - GET  /       y GET /health  -> health check (Render los necesita)
//   - POST /       -> JSON-RPC (lo que usa Web3/Truffle/Ganache)
//
// Con { wallet: { deterministic: true } } las cuentas y sus claves
// privadas son siempre las MISMAS en cada arranque, así que la dirección
// del contrato desplegado (ver ../server.js, CONTRACT_ADDRESS) también
// es siempre la misma sin necesidad de wallets externas ni de guardar
// nada manualmente.
//
// LIMITACIÓN: al ser el plan free de Render, este proceso puede
// reiniciarse tras inactividad. Como el nodo vive en memoria (no hay
// disco persistente en el free tier), al reiniciarse el historial de
// operaciones registradas se pierde (las cuentas y la dirección del
// contrato siguen siendo las mismas gracias al modo determinista).

const express = require('express');
const Ganache = require('ganache');

const PORT = process.env.PORT || 7545;

const app = express();
app.use(express.json({ limit: '5mb' }));

const provider = Ganache.provider({
    wallet: { deterministic: true },
    logging: { quiet: true },
    chain: { chainId: 1337 },
});

// =====================================================
// HEALTH CHECK (Render)
// =====================================================

app.get('/', (req, res) => {
    res.status(200).json({
        estado: true,
        mensaje: 'Nodo blockchain de prueba activo',
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

// =====================================================
// JSON-RPC (lo que usa Web3 en blockchain/server.js)
// =====================================================

app.post('/', async (req, res) => {

    const { id, method, params } = req.body || {};

    try {

        const result = await provider.request({
            method,
            params: params || [],
        });

        res.json({ jsonrpc: '2.0', id, result });

    } catch (error) {

        res.json({
            jsonrpc: '2.0',
            id,
            error: {
                code: error.code || -32000,
                message: error.message || 'Error en el nodo blockchain',
            },
        });

    }

});

app.listen(PORT, () => {
    console.log(`Nodo blockchain de prueba escuchando en el puerto ${PORT}`);
});
