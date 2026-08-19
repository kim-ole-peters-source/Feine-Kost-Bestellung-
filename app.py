#!/usr/bin/env python3
# Gebrueder Pesch Bestellsystem
# Start: python3 app.py, dann http://127.0.0.1:8000 oeffnen

import json
import base64
import imaplib
import mimetypes
import os
import re
import shutil
import sqlite3
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email import policy
from email.header import decode_header, make_header
from email.parser import BytesParser
from email.utils import parsedate_to_datetime
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
ASSET_VERSION = "2026-08-19-mail-crawler"
MAX_JSON_BYTES = int(os.environ.get("MAX_JSON_BYTES", str(60 * 1024 * 1024)))
MAX_MAIL_ATTACHMENT_BYTES = int(os.environ.get("MAX_MAIL_ATTACHMENT_BYTES", str(12 * 1024 * 1024)))
OPENAI_INVOICE_MODEL = os.environ.get("OPENAI_INVOICE_MODEL", "gpt-4.1-mini")
OPENAI_RESPONSES_URL = os.environ.get("OPENAI_RESPONSES_URL", "https://api.openai.com/v1/responses")

ALLOWED_STORAGE_KEYS = {
    "orders",
    "artikeldaten",
    "customItems",
    "deletedItems",
    "haendlerListe",
    "invoices",
    "notifyEmails",
}

DEFAULT_STORAGE_VALUES = {
    "orders": [],
    "artikeldaten": {},
    "customItems": [],
    "deletedItems": [],
    "haendlerListe": [],
    "invoices": [],
    "notifyEmails": [],
}

PRIVATE_STORAGE_VALUES = {
    "invoiceMailAccounts": [],
}

ALL_STORAGE_VALUES = {
    **DEFAULT_STORAGE_VALUES,
    **PRIVATE_STORAGE_VALUES,
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
        for key, value in ALL_STORAGE_VALUES.items():
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


def load_private_storage_value(key):
    if key not in PRIVATE_STORAGE_VALUES:
        return None
    with db_connect() as con:
        row = con.execute("SELECT value FROM kv_store WHERE key = ?", (key,)).fetchone()
    if not row:
        return PRIVATE_STORAGE_VALUES.get(key)
    try:
        return json.loads(row["value"])
    except json.JSONDecodeError:
        return PRIVATE_STORAGE_VALUES.get(key)


def save_private_storage_value(key, value):
    if key not in PRIVATE_STORAGE_VALUES:
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
            (key, "set-private", utc_now()),
        )
    return True


def decode_mime_header(value):
    if not value:
        return ""
    try:
        return str(make_header(decode_header(str(value))))
    except Exception:
        return str(value)


def safe_int(value, default, minimum=None, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    if minimum is not None:
        parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def make_mail_account_id():
    return "mail" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")


def load_invoice_mail_accounts():
    accounts = load_private_storage_value("invoiceMailAccounts")
    return accounts if isinstance(accounts, list) else []


def save_invoice_mail_accounts(accounts):
    return save_private_storage_value("invoiceMailAccounts", accounts)


def public_mail_account(account):
    return {
        "id": account.get("id"),
        "label": account.get("label") or account.get("email") or account.get("username") or "Postfach",
        "email": account.get("email") or "",
        "host": account.get("host") or "",
        "port": account.get("port") or 993,
        "username": account.get("username") or "",
        "folder": account.get("folder") or "INBOX",
        "use_ssl": account.get("use_ssl", True),
        "days_back": account.get("days_back") or 30,
        "max_messages": account.get("max_messages") or 25,
        "password_set": bool(account.get("password")),
        "last_crawled_at": account.get("last_crawled_at") or "",
        "last_found_count": account.get("last_found_count") or 0,
        "last_error": account.get("last_error") or "",
    }


def normalize_mail_account(payload, existing=None):
    existing = existing or {}
    use_ssl = bool(payload.get("use_ssl", existing.get("use_ssl", True)))
    port_default = 993 if use_ssl else 143
    account = {
        "id": str(payload.get("id") or existing.get("id") or make_mail_account_id()),
        "label": str(payload.get("label") or existing.get("label") or "").strip(),
        "email": str(payload.get("email") or existing.get("email") or "").strip(),
        "host": str(payload.get("host") or existing.get("host") or "").strip(),
        "port": safe_int(payload.get("port", existing.get("port", port_default)), port_default, 1, 65535),
        "username": str(payload.get("username") or existing.get("username") or "").strip(),
        "password": str(payload.get("password") or existing.get("password") or ""),
        "folder": str(payload.get("folder") or existing.get("folder") or "INBOX").strip() or "INBOX",
        "use_ssl": use_ssl,
        "days_back": safe_int(payload.get("days_back", existing.get("days_back", 30)), 30, 1, 365),
        "max_messages": safe_int(payload.get("max_messages", existing.get("max_messages", 25)), 25, 1, 100),
        "last_crawled_at": existing.get("last_crawled_at") or "",
        "last_found_count": existing.get("last_found_count") or 0,
        "last_error": existing.get("last_error") or "",
    }
    if not account["label"]:
        account["label"] = account["email"] or account["username"] or "Postfach"
    errors = []
    if not account["email"]:
        errors.append("E-Mail-Adresse fehlt.")
    if not account["host"]:
        errors.append("IMAP-Server fehlt.")
    if not account["username"]:
        errors.append("Benutzername fehlt.")
    if not account["password"]:
        errors.append("Passwort/App-Passwort fehlt.")
    return account, errors


def supported_invoice_attachment(part, filename):
    content_type = (part.get_content_type() or "").lower()
    lower_name = (filename or "").lower()
    if content_type in {"application/pdf", "image/jpeg", "image/png", "image/webp"}:
        return True
    return lower_name.endswith((".pdf", ".jpg", ".jpeg", ".png", ".webp"))


def attachment_file_from_part(part, filename, uid, index):
    payload = part.get_payload(decode=True)
    if not payload:
        return None, "Leerer Anhang uebersprungen."
    if len(payload) > MAX_MAIL_ATTACHMENT_BYTES:
        return None, f"{filename} ist groesser als erlaubt und wurde uebersprungen."
    content_type = part.get_content_type() or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    data = base64.b64encode(payload).decode("ascii")
    return {
        "name": filename or f"rechnung-{uid.decode('ascii', errors='ignore')}-{index}.pdf",
        "type": content_type,
        "size": len(payload),
        "dataUrl": f"data:{content_type};base64,{data}",
    }, ""


def message_date_iso(msg):
    raw = msg.get("Date")
    if not raw:
        return ""
    try:
        parsed = parsedate_to_datetime(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec="seconds")
    except Exception:
        return ""


def extract_invoice_attachments(msg, uid):
    files = []
    skipped = []
    for index, part in enumerate(msg.iter_attachments(), start=1):
        filename = decode_mime_header(part.get_filename()) or f"anhang-{index}"
        if not supported_invoice_attachment(part, filename):
            skipped.append(f"{filename}: kein PDF/Bild")
            continue
        file_info, warning = attachment_file_from_part(part, filename, uid, index)
        if warning:
            skipped.append(warning)
        if file_info:
            files.append(file_info)
    return files, skipped


def invoice_signature_from_extracted(extracted):
    supplier = re.sub(r"\s+", " ", str(extracted.get("supplier") or "").strip().lower())
    number = re.sub(r"\s+", "", str(extracted.get("invoice_number") or "").strip().lower())
    if supplier and number:
        return f"{supplier}|{number}"
    gross = str(extracted.get("gross_amount") or "")
    date = str(extracted.get("invoice_date") or "")
    return f"{supplier}|{date}|{gross}" if supplier and (date or gross) else ""


def crawl_invoice_mail_account(account, known_signatures=None):
    if not os.environ.get("OPENAI_API_KEY"):
        return {
            "ok": False,
            "status": 503,
            "error": "OPENAI_API_KEY ist auf dem Server noch nicht hinterlegt.",
        }
    if not account.get("password"):
        return {"ok": False, "status": 400, "error": "Fuer dieses Postfach ist kein Passwort hinterlegt."}

    known = set(known_signatures or [])
    invoices = []
    errors = []
    skipped_attachments = []
    checked_messages = 0
    checked_attachments = 0
    duplicates = 0
    mail = None

    try:
        if account.get("use_ssl", True):
            mail = imaplib.IMAP4_SSL(account["host"], int(account.get("port") or 993), timeout=30)
        else:
            mail = imaplib.IMAP4(account["host"], int(account.get("port") or 143), timeout=30)
        mail.login(account["username"], account["password"])
        status, _ = mail.select(account.get("folder") or "INBOX", readonly=True)
        if status != "OK":
            return {"ok": False, "status": 502, "error": "Postfachordner konnte nicht geoeffnet werden."}

        since = (datetime.now(timezone.utc) - timedelta(days=safe_int(account.get("days_back"), 30, 1, 365))).strftime("%d-%b-%Y")
        status, data = mail.uid("SEARCH", None, "SINCE", since)
        if status != "OK":
            return {"ok": False, "status": 502, "error": "IMAP-Suche im Postfach fehlgeschlagen."}

        uids = (data[0] or b"").split()
        uids = uids[-safe_int(account.get("max_messages"), 25, 1, 100):]
        for uid in reversed(uids):
            checked_messages += 1
            status, msg_data = mail.uid("FETCH", uid, "(RFC822)")
            if status != "OK" or not msg_data:
                errors.append(f"E-Mail UID {uid.decode('ascii', errors='ignore')} konnte nicht geladen werden.")
                continue
            raw = next((part[1] for part in msg_data if isinstance(part, tuple) and part[1]), None)
            if not raw:
                continue
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            subject = decode_mime_header(msg.get("Subject"))
            sender = decode_mime_header(msg.get("From"))
            mail_meta = {
                "account_id": account.get("id"),
                "account_label": account.get("label") or account.get("email"),
                "uid": uid.decode("ascii", errors="ignore"),
                "subject": subject,
                "from": sender,
                "date": message_date_iso(msg),
            }
            files, skipped = extract_invoice_attachments(msg, uid)
            skipped_attachments.extend(skipped)
            for file_info in files:
                checked_attachments += 1
                result = call_openai_invoice_extraction([file_info])
                if not result.get("ok"):
                    detail = result.get("detail") or result.get("error") or "KI-Auslesung fehlgeschlagen."
                    errors.append(f"{file_info.get('name')}: {detail}")
                    continue
                extracted = result["invoice"]
                signature = invoice_signature_from_extracted(extracted)
                if signature and signature in known:
                    duplicates += 1
                    continue
                if signature:
                    known.add(signature)
                invoices.append({
                    "invoice": extracted,
                    "files": [file_info],
                    "mail": mail_meta,
                    "model": result.get("model"),
                })
    except imaplib.IMAP4.error as exc:
        return {"ok": False, "status": 502, "error": "IMAP-Anmeldung oder Zugriff fehlgeschlagen.", "detail": str(exc)}
    except Exception as exc:
        return {"ok": False, "status": 502, "error": "Postfach-Crawling fehlgeschlagen.", "detail": str(exc)}
    finally:
        if mail is not None:
            try:
                mail.logout()
            except Exception:
                pass

    return {
        "ok": True,
        "status": 200,
        "checked_messages": checked_messages,
        "checked_attachments": checked_attachments,
        "found_count": len(invoices),
        "duplicates": duplicates,
        "skipped_attachments": skipped_attachments[:20],
        "errors": errors[:20],
        "invoices": invoices,
    }


INVOICE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "supplier",
        "invoice_number",
        "invoice_date",
        "due_date",
        "currency",
        "net_amount",
        "tax_amount",
        "gross_amount",
        "tax_rate",
        "items",
        "warnings",
        "confidence",
    ],
    "properties": {
        "supplier": {"type": "string"},
        "invoice_number": {"type": "string"},
        "invoice_date": {"type": "string", "description": "YYYY-MM-DD or empty string"},
        "due_date": {"type": "string", "description": "YYYY-MM-DD or empty string"},
        "currency": {"type": "string"},
        "net_amount": {"type": "number"},
        "tax_amount": {"type": "number"},
        "gross_amount": {"type": "number"},
        "tax_rate": {"type": "number"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "quantity", "unit", "net_amount", "tax_rate", "gross_amount", "article_number"],
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "number"},
                    "unit": {"type": "string"},
                    "net_amount": {"type": "number"},
                    "tax_rate": {"type": "number"},
                    "gross_amount": {"type": "number"},
                    "article_number": {"type": "string"},
                },
            },
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
        "confidence": {
            "type": "object",
            "additionalProperties": False,
            "required": ["overall", "invoice_number", "amounts", "items"],
            "properties": {
                "overall": {"type": "number"},
                "invoice_number": {"type": "number"},
                "amounts": {"type": "number"},
                "items": {"type": "number"},
            },
        },
    },
}


def extract_text_from_openai_response(data):
    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    parts = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                parts.append(content["text"])
    return "\n".join(parts).strip()


def parse_json_output(text):
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    return json.loads(cleaned)


def normalize_data_url(file_info):
    data_url = str(file_info.get("dataUrl") or file_info.get("data_url") or "")
    if not data_url.startswith("data:") or ";base64," not in data_url:
        return ""
    return data_url


def build_openai_invoice_content(files):
    content = [
        {
            "type": "input_text",
            "text": (
                "Du bist eine sehr genaue Rechnungserfassung fuer eine deutsche Feinkost-Firma. "
                "Lies die angehaengte Eingangsrechnung vollstaendig aus. "
                "Extrahiere Lieferant, Rechnungsnummer, Rechnungsdatum, Faelligkeit, Netto, Steuer/Vorsteuer, Brutto, "
                "Steuersatz und alle Produktpositionen. Gib Datumswerte als YYYY-MM-DD aus. "
                "Wenn ein Wert nicht sicher erkennbar ist, nutze leere Strings oder 0 und schreibe eine kurze Warnung. "
                "Rechne keine frei erfundenen Werte hinzu; uebernehme nur erkennbare Rechnungsdaten."
            ),
        }
    ]
    skipped = []
    for file_info in files:
        data_url = normalize_data_url(file_info)
        name = str(file_info.get("name") or "rechnung")
        content_type = str(file_info.get("type") or "")
        lower_name = name.lower()
        if not data_url:
            skipped.append(name)
            continue
        if content_type.startswith("image/"):
            content.append({"type": "input_image", "image_url": data_url, "detail": "high"})
        elif content_type == "application/pdf" or lower_name.endswith(".pdf"):
            content.append({"type": "input_file", "filename": name, "file_data": data_url})
        else:
            skipped.append(name)
    return content, skipped


def call_openai_invoice_extraction(files):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "ok": False,
            "status": 503,
            "error": "OPENAI_API_KEY ist auf dem Server noch nicht hinterlegt.",
        }

    content, skipped = build_openai_invoice_content(files)
    if len(content) <= 1:
        return {
            "ok": False,
            "status": 400,
            "error": "Bitte mindestens eine PDF- oder Bild-Rechnung hochladen.",
        }

    payload = {
        "model": OPENAI_INVOICE_MODEL,
        "input": [{"role": "user", "content": content}],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "invoice_extraction",
                "strict": True,
                "schema": INVOICE_SCHEMA,
            }
        },
        "temperature": 0,
        "store": False,
    }

    request = urllib.request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": 502, "error": "KI-Auslesung fehlgeschlagen.", "detail": detail[:1200]}
    except Exception as exc:
        return {"ok": False, "status": 502, "error": "KI-Auslesung fehlgeschlagen.", "detail": str(exc)}

    text = extract_text_from_openai_response(data)
    try:
        extracted = parse_json_output(text)
    except Exception:
        return {
            "ok": False,
            "status": 502,
            "error": "Die KI-Antwort konnte nicht als Rechnungsdaten gelesen werden.",
            "detail": text[:1200],
        }
    if skipped:
        extracted.setdefault("warnings", []).append("Nicht unterstuetzte Datei(en) uebersprungen: " + ", ".join(skipped))
    return {"ok": True, "status": 200, "invoice": extracted, "model": OPENAI_INVOICE_MODEL}


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

        if path == "/api/ai/status":
            return self._send_json(
                {
                    "invoice_ai_enabled": bool(os.environ.get("OPENAI_API_KEY")),
                    "invoice_model": OPENAI_INVOICE_MODEL,
                },
                send_body=send_body,
            )

        if path == "/api/invoice-mail/accounts":
            accounts = [public_mail_account(account) for account in load_invoice_mail_accounts()]
            return self._send_json({"ok": True, "accounts": accounts}, send_body=send_body)

        if path.startswith("/api/storage/"):
            key = path.removeprefix("/api/storage/")
            if key not in ALLOWED_STORAGE_KEYS:
                return self._send_json({"error": "unknown key"}, status=404, send_body=send_body)
            return self._send_json({"key": key, "value": load_storage_value(key)}, send_body=send_body)

        return self._send_text(404, "Not found", send_body=send_body)

    def _handle_write(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/invoices/extract":
            return self._handle_invoice_extract()
        if path == "/api/invoice-mail/accounts":
            return self._handle_invoice_mail_account_save()
        if path == "/api/invoice-mail/accounts/delete":
            return self._handle_invoice_mail_account_delete()
        if path == "/api/invoice-mail/crawl":
            return self._handle_invoice_mail_crawl()

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

    def _read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            length = 0
        if length > MAX_JSON_BYTES:
            return None, {"error": "payload too large"}, 413

        raw = self.rfile.read(length)
        try:
            value = json.loads(raw.decode("utf-8") if raw else "null")
        except json.JSONDecodeError:
            return None, {"error": "invalid json"}, 400
        return value, None, 200

    def _handle_invoice_extract(self):
        value, error, status = self._read_json_body()
        if error:
            return self._send_json(error, status=status)
        files = value.get("files") if isinstance(value, dict) else None
        if not isinstance(files, list):
            return self._send_json({"error": "files missing"}, status=400)
        result = call_openai_invoice_extraction(files)
        if not result.get("ok"):
            payload = {"error": result.get("error") or "KI-Auslesung fehlgeschlagen."}
            if result.get("detail"):
                payload["detail"] = result["detail"]
            return self._send_json(payload, status=result.get("status", 502))
        return self._send_json({"ok": True, "invoice": result["invoice"], "model": result["model"]})

    def _handle_invoice_mail_account_save(self):
        value, error, status = self._read_json_body()
        if error:
            return self._send_json(error, status=status)
        if not isinstance(value, dict):
            return self._send_json({"error": "invalid json"}, status=400)

        accounts = load_invoice_mail_accounts()
        account_id = str(value.get("id") or "")
        existing = next((acc for acc in accounts if acc.get("id") == account_id), None)
        account, errors = normalize_mail_account(value, existing)
        if errors:
            return self._send_json({"error": " ".join(errors)}, status=400)

        if existing:
            accounts = [account if acc.get("id") == account["id"] else acc for acc in accounts]
        else:
            accounts.append(account)
        save_invoice_mail_accounts(accounts)
        return self._send_json({"ok": True, "accounts": [public_mail_account(acc) for acc in accounts]})

    def _handle_invoice_mail_account_delete(self):
        value, error, status = self._read_json_body()
        if error:
            return self._send_json(error, status=status)
        account_id = str(value.get("id") or "") if isinstance(value, dict) else ""
        if not account_id:
            return self._send_json({"error": "id missing"}, status=400)
        accounts = [acc for acc in load_invoice_mail_accounts() if acc.get("id") != account_id]
        save_invoice_mail_accounts(accounts)
        return self._send_json({"ok": True, "accounts": [public_mail_account(acc) for acc in accounts]})

    def _handle_invoice_mail_crawl(self):
        value, error, status = self._read_json_body()
        if error:
            return self._send_json(error, status=status)
        if not isinstance(value, dict):
            return self._send_json({"error": "invalid json"}, status=400)
        account_id = str(value.get("account_id") or value.get("accountId") or "")
        accounts = load_invoice_mail_accounts()
        account = next((acc for acc in accounts if acc.get("id") == account_id), None)
        if not account:
            return self._send_json({"error": "Postfach nicht gefunden."}, status=404)

        known = value.get("known_signatures") or value.get("knownSignatures") or []
        if not isinstance(known, list):
            known = []
        result = crawl_invoice_mail_account(account, known_signatures=known)
        account["last_crawled_at"] = utc_now()
        account["last_found_count"] = result.get("found_count", 0) if result.get("ok") else 0
        account["last_error"] = "" if result.get("ok") else (result.get("error") or "Crawling fehlgeschlagen.")
        save_invoice_mail_accounts(accounts)

        if not result.get("ok"):
            payload = {"error": result.get("error") or "Postfach-Crawling fehlgeschlagen."}
            if result.get("detail"):
                payload["detail"] = result["detail"]
            payload["accounts"] = [public_mail_account(acc) for acc in accounts]
            return self._send_json(payload, status=result.get("status", 502))
        result["accounts"] = [public_mail_account(acc) for acc in accounts]
        return self._send_json(result)

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
