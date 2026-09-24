# FARMACOR / FARMACOL

Sistema de gestión de farmacia con trazabilidad de operaciones (compras y
ventas) ancladas en blockchain.

## Arquitectura

El sistema son **4 piezas** que se comunican por HTTP:

| Pieza | Tecnología | Carpeta | Puerto local |
|---|---|---|---|
| Base de datos | MySQL / MariaDB | — | 3306 |
| Backend | Django 4.2 + DRF | [`backend/`](backend/) | 8000 |
| Puente Blockchain | Node.js + Express + Web3 | [`blockchain/`](blockchain/) | 3000 (+ nodo de prueba en 7545) |
| Frontend | Angular 19 (SSR) | [`farmacia-blockchain/`](farmacia-blockchain/) | 4200 |

Flujo: **Angular → Django → (MySQL y/o puente Blockchain) → nodo blockchain de prueba**.
El frontend nunca llama directo al puente blockchain; siempre pasa por Django.

---

## 1. Ejecutar en local

### 1.1 Base de datos (MySQL)

Con XAMPP: arranca MySQL desde el panel de control (o
`C:\xampp\mysql\bin\mysqld.exe`) y crea la base si no existe:

```
mysql -u root -e "CREATE DATABASE IF NOT EXISTS farmacia_db;"
```

### 1.2 Backend (Django)

```bash
cd backend
python -m venv venv
./venv/Scripts/pip install -r requirements.txt
./venv/Scripts/python manage.py migrate
./venv/Scripts/python manage.py runserver 127.0.0.1:8000
```

Sin variables de entorno, usa por defecto MySQL local (`root` sin
contraseña, host `127.0.0.1:3306`, BD `farmacia_db`) y el puente blockchain
en `http://127.0.0.1:3000`.

Para crear el primer usuario (queda como Administrador automáticamente):

```bash
curl -X POST http://127.0.0.1:8000/api/usuarios-sistema/registro/ \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Administrador","usuario":"admin","correo":"admin@farmacor.local","password":"Admin123"}'
```

### 1.3 Puente Blockchain (Node + nodo de prueba local)

```bash
cd blockchain
npm install
npx ganache --deterministic --port 7545   # deja esto corriendo en una terminal
node server.js                            # en otra terminal
```

`CONTRACT_ADDRESS` ya viene fijo en `server.js` porque el nodo determinista
(`--deterministic`) siempre genera las mismas cuentas, así que el contrato
siempre despliega en la misma dirección. Si por algún motivo no coincide
(ej. cambiaste el contrato), vuelve a desplegarlo:

```bash
node -e "
const {Web3}=require('web3');
const a=require('./build/contracts/RegistroOperaciones.json');
(async()=>{
  const web3=new Web3('http://127.0.0.1:7545');
  const [from]=await web3.eth.getAccounts();
  const c=new web3.eth.Contract(a.abi);
  const d=await c.deploy({data:a.bytecode}).send({from,gas:3000000});
  console.log('CONTRACT_ADDRESS=', d.options.address);
})();
"
```

y actualiza `CONTRACT_ADDRESS` en `server.js` con el valor que imprima.

### 1.4 Frontend (Angular)

```bash
cd farmacia-blockchain
npm install
npx ng serve --port 4200
```

Abre `http://localhost:4200`.

---

## 2. Desplegar en la nube (gratis, sin wallets)

Arquitectura recomendada, todo en capas gratuitas y **sin wallets ni claves
privadas**: en vez de una testnet pública (Sepolia), se despliega un nodo de
prueba propio (`blockchain/testnet-node/`) — es el mismo Ganache que usas en
local, con cuentas de prueba que se generan solas siempre igual (modo
determinista), envuelto para poder correr 24/7 en Render.

| Pieza | Proveedor | Por qué |
|---|---|---|
| Frontend | **Vercel** | Detecta Angular automáticamente, capa gratuita generosa |
| Backend Django | **Render** (Web Service, free) | Deploy directo desde GitHub, gratis (se duerme tras inactividad) |
| Puente Blockchain | **Render** (otro Web Service, free) | Igual que el backend |
| Nodo blockchain de prueba | **Render** (otro Web Service, free) | `blockchain/testnet-node/`, sin wallets ni fondos externos |
| Base de datos | **Aiven** (MySQL free tier) | MySQL gestionado, siempre gratis, sin tarjeta |

> ¿Y si más adelante quieres una testnet pública real (Sepolia)? Queda como
> alternativa opcional: `blockchain/deploy-sepolia.js` ya está preparado
> para eso, pero requiere wallet + Infura/Alchemy + faucet. No es necesario
> para que el sistema funcione.

> **Limitación del nodo propio en el free tier**: si el servicio de Render
> se duerme por inactividad y se reinicia, el historial de operaciones
> registradas se pierde (vive en memoria, no hay disco persistente gratis).
> Las cuentas y la dirección del contrato siguen siendo las mismas siempre
> (modo determinista), así que el sistema vuelve a funcionar apenas
> despierta — solo se resetean los registros ya hechos.

### 2.0 Requisito previo: repo en GitHub

Ya resuelto: el remoto `origin` apunta a tu propio repositorio.

### 2.1 Base de datos — Aiven (MySQL)

1. Crea cuenta gratis en https://aiven.io/free-mysql-database (no pide tarjeta).
2. Crea un servicio MySQL free tier (1 GB).
3. En "Overview" copia: host, puerto, usuario, password y nombre de la BD.
4. Guarda esos datos: los usarás como variables de entorno del backend
   (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
   Aiven exige TLS, así que también pon `DB_USE_SSL=True`.

> Nota: el free tier de Aiven se apaga tras un período de inactividad
> (te avisa por correo); se reactiva desde el panel.

### 2.2 Nodo blockchain de prueba — Render

1. En Render (https://render.com, cuenta gratis con GitHub), "New Web
   Service" → conecta tu repo → **Root Directory**: `blockchain/testnet-node`.
2. Build command: `npm install`. Start command: `node server.js`
   (o deja que use el `Procfile` incluido).
3. Plan: **Free**. No necesita ninguna variable de entorno.
4. Espera el deploy y copia la URL pública (ej.
   `https://farmacol-testnet-node.onrender.com`).
5. Verifica que responde: abre esa URL en el navegador, debe mostrar
   `{"estado":true,"mensaje":"Nodo blockchain de prueba activo"}`.

### 2.3 Puente Blockchain — Render

1. "New Web Service" → mismo repo → **Root Directory**: `blockchain`.
2. Build command: `npm install`. Start command: `node server.js`.
3. Plan: **Free**. Variables de entorno:
   - `WEB3_PROVIDER_URL` = la URL del paso 2.2 (el nodo de prueba)
   - (no hace falta `CONTRACT_ADDRESS` ni `PRIVATE_KEY`: ya vienen con un
     valor por defecto correcto)
4. Copia la URL pública que te da Render (ej. `https://farmacol-blockchain.onrender.com`).
5. Verifica: abre esa URL, debe mostrar `"ganache": true` y la dirección del contrato.

### 2.4 Backend — Render

1. "New Web Service" → mismo repo → **Root Directory**: `backend`.
2. Build command: `pip install -r requirements.txt`.
   Start command: (usa el `Procfile` incluido, o pon manualmente)
   `gunicorn farmacia_backend.wsgi:application --bind 0.0.0.0:$PORT`.
3. Plan: **Free**. Variables de entorno (ver `backend/.env.example`):
   - `PYTHON_VERSION` = `3.12.11` (fija la versión de Python de Render)
   - `DJANGO_SECRET_KEY` (genera una nueva, no la de desarrollo)
   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS` = el dominio que te dé Render (sin `https://`)
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_USE_SSL=True` (de Aiven, paso 2.1)
   - `BLOCKCHAIN_SERVICE_URL` = la URL de Render del paso 2.3
   - `DJANGO_CORS_ALLOWED_ORIGINS` y `DJANGO_CSRF_TRUSTED_ORIGINS` = la URL de Vercel (paso 2.5) — puedes volver a este paso después de tener esa URL.
4. Copia la URL pública (ej. `https://farmacol-backend.onrender.com`).
5. Crea el primer usuario (queda como Administrador) contra el backend ya
   en la nube, igual que en local pero con esa URL:
   ```bash
   curl -X POST https://farmacol-backend.onrender.com/api/usuarios-sistema/registro/ \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Administrador","usuario":"admin","correo":"admin@farmacor.local","password":"Admin123"}'
   ```

### 2.5 Frontend — Vercel

1. Antes de importar: edita `farmacia-blockchain/src/environments/environment.prod.ts`
   y pon la URL real del backend del paso 2.4 en `apiUrl`. Haz commit y push.
2. En Vercel, "Add New Project" → importa el repo → Root Directory:
   `farmacia-blockchain`. Vercel detecta Angular automáticamente.
3. Deploy. Copia la URL pública (ej. `https://farmacol.vercel.app`).
4. Vuelve al paso 2.4 en Render y actualiza `DJANGO_CORS_ALLOWED_ORIGINS` /
   `DJANGO_CSRF_TRUSTED_ORIGINS` con esta URL, y reinicia el servicio.

### 2.6 Verificación final

- `https://tu-backend.onrender.com/admin/` responde (Django).
- `https://tu-blockchain-service.onrender.com/` responde `estado: true`.
- `https://tu-testnet-node.onrender.com/` responde `estado: true`.
- `https://tu-frontend.vercel.app` carga el login y puedes iniciar sesión.
- Una compra o venta nueva genera un registro en Blockchain (visible en el
  módulo "Blockchain" del panel).

---

## Variables de entorno — resumen

| Servicio | Archivo de ejemplo |
|---|---|
| Backend Django | [`backend/.env.example`](backend/.env.example) |
| Puente Blockchain | [`blockchain/.env.example`](blockchain/.env.example) |
| Frontend Angular | [`farmacia-blockchain/src/environments/environment.prod.ts`](farmacia-blockchain/src/environments/environment.prod.ts) (se define en el código, no en `.env`, porque Angular resuelve esto en tiempo de build) |
