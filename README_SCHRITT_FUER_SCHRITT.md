# Gebrueder Pesch Bestellsystem - GitHub + Server

## Wichtig

Lade bei GitHub den Inhalt dieses Ordners hoch, nicht den Ordner selbst.

Richtig:

- `api/index.py`
- `app.py`
- `static/index.html`
- `static/style.css`
- `static/app.js`
- `bestellsystem.db`
- `requirements.txt`
- `pyproject.toml`
- `vercel.json`

Falsch:

- `gebrueder-pesch-bestellsystem/api/index.py`

## Schritt 1: ZIP entpacken

ZIP entpacken und den entpackten Ordner öffnen.

## Schritt 2: GitHub-Repository vorbereiten

Entweder ein neues Repository erstellen oder im alten Repository die alten
Dateien entfernen.

## Schritt 3: Dateien hochladen

In GitHub `Add file` -> `Upload files` wählen.

Dann alle Dateien und Ordner aus dem entpackten Ordner markieren:

- `api`
- `static`
- `uploads`
- `order_images`
- `orders`
- `time_exports`
- `app.py`
- `index.html`
- `settings.json`
- `bestellsystem.db`
- `requirements.txt`
- `pyproject.toml`
- `vercel.json`
- `.gitignore`
- `README.md`
- `README_SCHRITT_FUER_SCHRITT.md`

Danach `Commit changes` klicken.

## Schritt 4: Lokal oder auf dem Server starten

```bash
python3 app.py
```

Standardadresse:

```text
http://127.0.0.1:8000
```

Wenn du einen anderen Port brauchst:

```bash
PORT=8080 python3 app.py
```

## Schritt 5: Auf dem Server öffentlich erreichbar machen

Empfohlen:

- Python-App intern auf `127.0.0.1:8000` laufen lassen
- Nginx oder Apache als Reverse Proxy davor setzen
- HTTPS aktivieren
- optional zusätzlichen Passwortschutz am Server setzen

## Vercel optional

Die Struktur enthält wie beim Opa-Peters-System:

- `api/index.py`
- `pyproject.toml`
- `vercel.json`

Damit ist die Struktur Vercel-freundlich. Für dauerhaft gespeicherte Daten ist
ein eigener Server mit SQLite aber sinnvoller als Serverless.
