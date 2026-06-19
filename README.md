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

Variáveis mínimas de produção:

- `TINY_API_TOKEN`
- `TINY_DB_PATH=/app/db/dash_final.sqlite`
- `AUTH_SECRET`
- `AUTH_USER_1_NAME`
- `AUTH_USER_1_HASH`
- `AUTH_COOKIE_NAME=brew_session`
- `AUTH_TOKEN_EXPIRE_HOURS=168`
- `AUTH_SECURE_COOKIE=true`
- `GA4_PROPERTY_ID_BREW`
- `GA4_PROPERTY_ID_GROW`
- `GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/ga4-service-account.json` ou `GOOGLE_CREDENTIALS_B64`

Se houver mais usuários, configure também `AUTH_USER_2_NAME`, `AUTH_USER_2_HASH`,
`AUTH_USER_3_NAME` e `AUTH_USER_3_HASH`.

Variáveis recomendadas para sincronização:

- `TINY_SYNC_LOOKBACK_DAYS=60`
- `TINY_DETAIL_WORKERS=6`
- `TINY_MIN_REQUEST_INTERVAL=0.35`
- `TINY_API_RATE_LIMIT_RETRIES=3`
- `TINY_API_RATE_LIMIT_SLEEP=20`
- `TINY_EXCLUDED_SITUACOES=cancelado,em aberto`
- `TINY_EXCLUDED_REVENUE_MARKERS=racao,ração`

### Sincronização diária

O backend pode rodar uma rotina diária dentro do próprio serviço da API. Para
revisitar todos os pedidos de 2026 todas as noites, configure:

```env
DAILY_SYNC_ENABLED=true
DAILY_SYNC_TIME=05:00
DAILY_SYNC_TIMEZONE=America/Sao_Paulo
DAILY_SYNC_SOURCE=all
DAILY_SYNC_MODE=range
DAILY_SYNC_START_DATE=2026-01-01
DAILY_SYNC_RUN_ON_START=false
DAILY_SYNC_GA4_ENABLED=true
```

Nesse modo, a rotina roda diariamente de `2026-01-01` até o dia atual. Isso é
mais pesado do que o incremental, mas captura pedidos antigos editados em 2026.

Se preferir uma janela móvel, troque para:

```env
DAILY_SYNC_MODE=incremental
DAILY_SYNC_LOOKBACK_DAYS=180
```

O botão manual de sincronização do painel usa o mesmo bloqueio interno da rotina
diária. Se uma sincronização já estiver em andamento, a segunda execução falha
em vez de disputar o mesmo banco/API ao mesmo tempo.

Após mover o serviço no Easypanel, confira especialmente:

1. O volume persistente continua montado em `/app/db`.
2. `TINY_DB_PATH` aponta para um arquivo dentro desse volume.
3. `TINY_API_TOKEN` foi recriado nas variáveis do serviço.
4. As variáveis `AUTH_*` foram recriadas.
5. A credencial GA4 foi montada ou enviada via `GOOGLE_CREDENTIALS_B64`.

Se o serviço foi movido para um projeto novo sem o volume antigo, o banco SQLite
será recriado vazio. Nesse caso, depois de configurar as variáveis, rode um
backfill no container:

```bash
python manage_tiny_bi.py sync --source all --mode backfill --years 2024-2026
```

Para uma janela menor:

```bash
python manage_tiny_bi.py sync --source all --mode range --start 2026-01-01 --end 2026-06-30
```

Também é possível iniciar pela API autenticada:

```bash
POST /api/sync?source=all&mode=backfill&years=2024-2026
GET  /api/sync/status?job_id=<job_id>
```

## Testes

```bash
cd backend
pytest -q tests
```
