#!/usr/bin/env python3
# Gebrueder Pesch Bestellsystem
# Start: python3 app.py, dann http://127.0.0.1:8000 oeffnen

import json
import mimetypes
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# Vercel ist serverless: Schreibzugriff ist dort nur unter /tmp verlaesslich.
# Lokal bleibt alles im Projektordner, wie beim Opa-Peters-System.
IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))
DATA_DIR = Path(os.environ.get("DATA_DIR") or ("/tmp/gebrueder-pesch-bestellsystem" if IS_VERCEL else BASE_DIR))
DB_PATH = DATA_DIR / "bestellsystem.db"
UPLOAD_DIR = DATA_DIR / "uploads"
ORDER_DIR = DATA_DIR / "orders"
ORDER_IMAGE_DIR = DATA_DIR / "order_images"
TIME_EXPORT_DIR = DATA_DIR / "time_exports"
SETTINGS_PATH = DATA_DIR / "settings.json"

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
APP_NAME = "Gebrueder Pesch Bestellsystem"
APP_SHORT_NAME = "Pesch Bestellung"
THEME_COLOR = "#233a52"
ASSET_VERSION = "2026-08-10-opa-style"
MAX_JSON_BYTES = int(os.environ.get("MAX_JSON_BYTES", str(60 * 1024 * 1024)))

ALLOWED_STORAGE_KEYS = {
    "orders",
    "artikeldaten",
    "customItems",
    "deletedItems",
    "haendlerListe",
    "notifyEmails",
}

DEFAULT_STORAGE_VALUES = {
    "orders": [],
    "artikeldaten": {},
    "customItems": [],
    "deletedItems": [],
    "haendlerListe": [],
    "notifyEmails": [],
}

mimetypes.add_type("text/html; charset=utf-8", ".html")
mimetypes.add_type("text/css; charset=utf-8", ".css")
mimetypes.add_type("application/javascript; charset=utf-8", ".js")
mimetypes.add_type("application/json; charset=utf-8", ".json")
mimetypes.add_type("image/png", ".png")


def ensure_data_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ORDER_DIR.mkdir(parents=True, exist_ok=True)
    ORDER_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    TIME_EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    for name in ["settings.json", "bestellsystem.db"]:
        src = BASE_DIR / name
        dst = DATA_DIR / name
        if src.exists() and not dst.exists() and src.resolve() != dst.resolve():
            try:
                shutil.copy2(src, dst)
            except Exception:
                pass


def db_connect():
    ensure_data_dirs()
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    ensure_data_dirs()
    with db_connect() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS storage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                action TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        for key, value in DEFAULT_STORAGE_VALUES.items():
            con.execute(
                """
                INSERT OR IGNORE INTO kv_store (key, value, updated_at)
                VALUES (?, ?, ?)
                """,
                (key, json.dumps(value, ensure_ascii=False), utc_now()),
            )


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_storage_value(key):
    if key not in ALLOWED_STORAGE_KEYS:
        return None
    with db_connect() as con:
        row = con.execute("SELECT value FROM kv_store WHERE key = ?", (key,)).fetchone()
    if not row:
        return DEFAULT_STORAGE_VALUES.get(key)
    try:
        return json.loads(row["value"])
    except json.JSONDecodeError:
        return DEFAULT_STORAGE_VALUES.get(key)


def save_storage_value(key, value):
    if key not in ALLOWED_STORAGE_KEYS:
        return False
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    with db_connect() as con:
        con.execute(
            """
            INSERT INTO kv_store (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, encoded, utc_now()),
        )
        con.execute(
            "INSERT INTO storage_log (key, action, created_at) VALUES (?, ?, ?)",
            (key, "set", utc_now()),
        )
    return True


class App(BaseHTTPRequestHandler):
    server_version = "GebruederPeschBestellsystem/1.0"

    def log_message(self, fmt, *args):
        if os.environ.get("QUIET_LOGS"):
            return
        super().log_message(fmt, *args)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "same-origin")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self):
        self._handle_get(send_body=False)

    def do_GET(self):
        self._handle_get(send_body=True)

    def do_PUT(self):
        self._handle_write()

    def do_POST(self):
        self._handle_write()

    def _handle_get(self, send_body=True):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path in ("/", "/index.html", "/bestellsystem.html"):
            return self._serve_file(STATIC_DIR / "index.html", send_body=send_body, cache=False)

        if path == "/healthz":
            return self._send_json({"ok": True}, send_body=send_body)

        if path == "/manifest.json":
            return self._serve_manifest(send_body=send_body)

        if path == "/service-worker.js":
            return self._serve_file(STATIC_DIR / "service-worker.js", send_body=send_body, cache=False)

        if path.startswith("/static/"):
            requested = (STATIC_DIR / path.removeprefix("/static/")).resolve()
            return self._serve_file(requested, send_body=send_body)

        if path == "/api/storage":
            return self._send_json({"keys": sorted(ALLOWED_STORAGE_KEYS)}, send_body=send_body)

        if path.startswith("/api/storage/"):
            key = path.removeprefix("/api/storage/")
            if key not in ALLOWED_STORAGE_KEYS:
                return self._send_json({"error": "unknown key"}, status=404, send_body=send_body)
            return self._send_json({"key": key, "value": load_storage_value(key)}, send_body=send_body)

        return self._send_text(404, "Not found", send_body=send_body)

    def _handle_write(self):
        path = unquote(urlparse(self.path).path)
        if not path.startswith("/api/storage/"):
            return self._send_text(405, "Method not allowed")

        key = path.removeprefix("/api/storage/")
        if key not in ALLOWED_STORAGE_KEYS:
            return self._send_json({"error": "unknown key"}, status=404)

        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            length = 0
        if length > MAX_JSON_BYTES:
            return self._send_json({"error": "payload too large"}, status=413)

        raw = self.rfile.read(length)
        try:
            value = json.loads(raw.decode("utf-8") if raw else "null")
        except json.JSONDecodeError:
            return self._send_json({"error": "invalid json"}, status=400)

        save_storage_value(key, value)
        return self._send_json({"ok": True, "key": key})

    def _serve_file(self, file_path, send_body=True, cache=True):
        file_path = Path(file_path).resolve()
        try:
            file_path.relative_to(STATIC_DIR)
        except ValueError:
            return self._send_text(403, "Forbidden", send_body=send_body)

        if not file_path.is_file():
            return self._send_text(404, "Not found", send_body=send_body)

        data = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "public, max-age=3600" if cache else "no-cache")
        self.end_headers()
        if send_body:
            self.wfile.write(data)

    def _serve_manifest(self, send_body=True):
        manifest = {
            "name": APP_NAME,
            "short_name": APP_SHORT_NAME,
            "start_url": "/",
            "scope": "/",
            "display": "standalone",
            "background_color": "#f6f4ef",
            "theme_color": THEME_COLOR,
            "icons": [
                {"src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
                {"src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
            ],
        }
        return self._send_json(manifest, content_type="application/manifest+json; charset=utf-8", send_body=send_body)

    def _send_json(self, data, status=200, content_type="application/json; charset=utf-8", send_body=True):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if send_body:
            self.wfile.write(raw)

    def _send_text(self, status, text, send_body=True):
        raw = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if send_body:
            self.wfile.write(raw)


def run():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), App)
    print(f"{APP_NAME} laeuft auf http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
