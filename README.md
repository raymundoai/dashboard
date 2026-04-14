# Dashboard Tiny

Dashboard operacional para Brew & Grow com:

- backend em `FastAPI`
- frontend em `React + Vite`
- persistência local em `SQLite`
- integrações com Tiny ERP e GA4

## Estrutura

- `backend/`: API, regras de negócio e testes
- `frontend/`: SPA do dashboard
- `Dockerfile`: build único para deploy
- `.env.example`: variáveis necessárias para rodar em produção

## Rodando localmente

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server.main:app --host 0.0.0.0 --port 8010
```

## Build de produção

```bash
docker build -t dashboard-tiny .
```

O container final sobe a API e serve o frontend já buildado na porta `8000`.

## Deploy no Easypanel

Recomendado:

- `App Service`
- source via GitHub
- builder via `Dockerfile`
- porta pública `8000`
- volume persistente montado em `/app/db`
- credencial GA4 montada em `/app/credentials/ga4-service-account.json`

Variáveis mínimas:

- `TINY_API_TOKEN`
- `TINY_DB_PATH=/app/db/dash_final.sqlite`
- `AUTH_SECRET`
- `AUTH_USER_1_NAME`
- `AUTH_USER_1_HASH`
- `GA4_PROPERTY_ID_BREW`
- `GA4_PROPERTY_ID_GROW`
- `GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/ga4-service-account.json`

## Testes

```bash
cd backend
pytest -q tests
```
