// =====================================================
// DESPLIEGUE DEL CONTRATO EN LA TESTNET SEPOLIA
// =====================================================
//
// Uso:
//   1. Crea una cuenta en Infura o Alchemy y copia tu URL RPC de Sepolia.
//   2. Crea una wallet (ej. MetaMask), copia su clave privada y consigue
//      ETH de prueba en un faucet de Sepolia (ej. sepoliafaucet.com).
//   3. Ejecuta:
//        WEB3_PROVIDER_URL="https://sepolia.infura.io/v3/TU_API_KEY" \
//        PRIVATE_KEY="tu_clave_privada" \
//        node deploy-sepolia.js
//   4. Copia la "DIRECCIÓN DEL CONTRATO" que imprime al final y úsala como
//      variable de entorno CONTRACT_ADDRESS al desplegar server.js.
//
// IMPORTANTE: nunca compartas ni subas a git tu clave privada. Pásala
// siempre como variable de entorno, nunca escrita en el código.

const { Web3 } = require('web3');
const path = require('path');

const WEB3_PROVIDER_URL = process.env.WEB3_PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!WEB3_PROVIDER_URL || !PRIVATE_KEY) {
    console.error('ERROR: define WEB3_PROVIDER_URL y PRIVATE_KEY como variables de entorno.');
    process.exit(1);
}

const artifact = require(
    path.join(__dirname, 'build', 'contracts', 'RegistroOperaciones.json')
);

async function main() {
    const web3 = new Web3(WEB3_PROVIDER_URL);

    const cuenta = web3.eth.accounts.privateKeyToAccount(
        PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
    );
    web3.eth.accounts.wallet.add(cuenta);

    console.log('Cuenta desplegadora:', cuenta.address);

    const balance = await web3.eth.getBalance(cuenta.address);
    console.log('Balance (wei):', balance.toString());

    if (BigInt(balance) === 0n) {
        console.error('ERROR: la cuenta no tiene fondos de prueba. Usa un faucet de Sepolia.');
        process.exit(1);
    }

    console.log('Desplegando RegistroOperaciones.sol en Sepolia...');

    const contrato = new web3.eth.Contract(artifact.abi);

    const desplegado = await contrato
        .deploy({ data: artifact.bytecode })
        .send({ from: cuenta.address, gas: 3000000 });

    console.log('');
    console.log('==========================================');
    console.log('CONTRATO DESPLEGADO CORRECTAMENTE');
    console.log('==========================================');
    console.log('DIRECCIÓN DEL CONTRATO:', desplegado.options.address);
    console.log('');
    console.log('Usa esta dirección como CONTRACT_ADDRESS en el despliegue de server.js.');
}

main().catch((error) => {
    console.error('ERROR AL DESPLEGAR:', error.message);
    process.exit(1);
});
