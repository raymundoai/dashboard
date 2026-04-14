PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stores (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  store_type TEXT NOT NULL,
  ecommerce_name TEXT,
  marker_tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tiny_id INTEGER,
  store_code TEXT NOT NULL,
  order_number TEXT NOT NULL,
  numero_ecommerce TEXT,
  ecommerce_name TEXT,
  order_date TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  situacao_id INTEGER,
  situacao TEXT,
  total REAL,
  subtotal REAL,
  shipping REAL,
  discount REAL,
  markers_text TEXT,
  payment_method TEXT,
  shipping_method_code TEXT,
  shipping_method_label TEXT,
  customer_code TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_document TEXT,
  customer_city TEXT,
  customer_state TEXT,
  has_ecommerce_link INTEGER NOT NULL DEFAULT 0,
  has_known_marker INTEGER NOT NULL DEFAULT 0,
  flag_missing_link_and_marker INTEGER NOT NULL DEFAULT 0,
  flag_open_over_2_days INTEGER NOT NULL DEFAULT 0,
  exclude_from_revenue INTEGER NOT NULL DEFAULT 0,
  operational_checked_at TEXT,
  raw_payload TEXT,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (store_code, order_number, order_date),
  FOREIGN KEY (store_code) REFERENCES stores(code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tiny_unique
  ON orders(tiny_id)
  WHERE tiny_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_store_date
  ON orders(store_code, order_date);

CREATE INDEX IF NOT EXISTS idx_orders_store_situacao
  ON orders(store_code, situacao);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  sku TEXT,
  product_id TEXT,
  product_name TEXT,
  quantity REAL,
  unit_price REAL,
  revenue REAL,
  raw_payload TEXT,
  UNIQUE (order_id, line_number),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_sku
  ON order_items(sku);

CREATE TABLE IF NOT EXISTS operational_watch_orders (
  tiny_id INTEGER PRIMARY KEY,
  order_number TEXT,
  order_date TEXT,
  created_at TEXT,
  customer_name TEXT,
  situacao TEXT,
  numero_ecommerce TEXT,
  ecommerce_name TEXT,
  markers_text TEXT,
  issue_missing_link_marker INTEGER NOT NULL DEFAULT 0,
  issue_open_over_2_days INTEGER NOT NULL DEFAULT 0,
  active_issue INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_operational_watch_active
  ON operational_watch_orders(active_issue, order_date);

CREATE INDEX IF NOT EXISTS idx_operational_watch_issue_missing
  ON operational_watch_orders(issue_missing_link_marker);

CREATE INDEX IF NOT EXISTS idx_operational_watch_issue_open
  ON operational_watch_orders(issue_open_over_2_days);

CREATE TABLE IF NOT EXISTS revenue_targets_monthly (
  store_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_revenue REAL,
  realized_revenue REAL,
  source_file TEXT,
  loaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_code, year, month),
  FOREIGN KEY (store_code) REFERENCES stores(code)
);

CREATE INDEX IF NOT EXISTS idx_revenue_targets_monthly_range
  ON revenue_targets_monthly(store_code, year, month);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_code TEXT NOT NULL,
  mode TEXT NOT NULL,
  requested_from TEXT,
  requested_to TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  orders_found INTEGER NOT NULL DEFAULT 0,
  orders_synced INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  FOREIGN KEY (store_code) REFERENCES stores(code)
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_store_started
  ON sync_runs(store_code, started_at DESC);

CREATE TABLE IF NOT EXISTS ga4_daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'all',
    sessions INTEGER,
    users INTEGER,
    new_users INTEGER,
    engaged_sessions INTEGER,
    add_to_cart INTEGER,
    checkouts INTEGER,
    purchases INTEGER,
    revenue REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ga4_daily_source_date
    ON ga4_daily_metrics(source, date);

CREATE TABLE IF NOT EXISTS sync_state (
  store_code TEXT PRIMARY KEY,
  last_success_at TEXT,
  last_order_date TEXT,
  last_run_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_code) REFERENCES stores(code),
  FOREIGN KEY (last_run_id) REFERENCES sync_runs(id)
);

CREATE TABLE IF NOT EXISTS monthly_aggregates (
    store_code       TEXT    NOT NULL,
    year             INTEGER NOT NULL,
    month            INTEGER NOT NULL,
    total_revenue    REAL    NOT NULL DEFAULT 0.0,
    order_count      INTEGER NOT NULL DEFAULT 0,
    avg_ticket       REAL    NOT NULL DEFAULT 0.0,
    unique_customers INTEGER NOT NULL DEFAULT 0,
    computed_at      TEXT    NOT NULL,
    PRIMARY KEY (store_code, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_aggregates_store_year
    ON monthly_aggregates(store_code, year);
