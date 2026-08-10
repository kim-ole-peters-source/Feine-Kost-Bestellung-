# Gebrueder Pesch Bestellsystem

Server- und GitHub-Struktur nach dem Vorbild des Opa-Peters-Bestellsystems.

## Struktur

- `app.py` - Python-Server und API
- `api/index.py` - Vercel-kompatibler Einstiegspunkt
- `static/index.html` - App-Oberfläche
- `static/style.css` - ausgelagertes Design
- `static/app.js` - ausgelagerte Programmlogik
- `static/icons/` - Logo und App-Icons
- `bestellsystem.db` - SQLite-Datenbank
- `uploads/`, `order_images/`, `orders/`, `time_exports/` - Serverordner wie beim Referenzsystem
- `requirements.txt`, `pyproject.toml`, `vercel.json` - Deployment-Dateien

## Was geändert wurde

Die ursprüngliche Einzeldatei `bestellsystem.html` wurde in eine
serverfähige Projektstruktur überführt. Die Bestellfunktionen bleiben gleich:

- Rollen/PINs
- Laden- und Produktionsbestellungen
- Freitags- und Monatsbestellungen
- Warenkorb mit lokaler Zwischenspeicherung
- Fotoanhänge
- Sammlungen mit Zeitraum-Navigation
- PDF-Export im Browser
- Status, Bearbeiten, Löschen und Chat je Bestellung
- Artikelstammdaten, Händler und E-Mail-Empfänger

Der wichtigste technische Unterschied:

- Vorher: Speicherung direkt in Firebase aus dem Browser
- Jetzt: Speicherung über `app.py` in `bestellsystem.db`

## Lokal starten

```bash
python3 app.py
```

Dann öffnen:

```text
http://127.0.0.1:8000
```

Optional mit anderem Port:

```bash
PORT=8080 python3 app.py
```

## GitHub hochladen

Den Inhalt dieses Ordners direkt in das Repository hochladen. Die Dateien
müssen auf oberster Ebene liegen, also zum Beispiel:

- `api/index.py`
- `app.py`
- `static/app.js`
- `static/style.css`
- `static/index.html`
- `bestellsystem.db`
- `requirements.txt`
- `pyproject.toml`
- `vercel.json`

## Serverbetrieb

Auf dem Server:

```bash
git clone <dein-repository>
cd <dein-repository>
python3 app.py
```

Für Dauerbetrieb am besten mit `systemd`, `supervisord` oder einem ähnlichen
Prozessmanager starten und Nginx/Apache als Reverse Proxy davor setzen.

## Sicherheit

Diese Version speichert Bestellungen serverseitig in SQLite. Die PIN-Prüfung
liegt weiterhin im Browser, damit die Bedienung unverändert bleibt. Für echten
Produktivbetrieb sollte zusätzlich ein Server- oder Proxy-Login eingerichtet
werden.
