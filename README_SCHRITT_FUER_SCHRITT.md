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

## OpenAI fuer Rechnungen aktivieren

Auf dem Server muss der OpenAI-Schluessel als Umgebungsvariable fuer den
Dienst gesetzt werden:

```text
OPENAI_API_KEY=sk-...
```

Danach den Dienst neu starten.

## Rechnungspostfaecher einrichten

Nach dem Einloggen als Geschäftsführung:

1. `Rechnungen & Controlling` öffnen.
2. Unter `Rechnungspostfächer` IMAP-Daten eintragen.
3. `+ Postfach speichern` klicken.
4. Neben dem Postfach `Postfach durchsuchen` klicken.
5. Nach dem Crawling das Ergebnis-Popup prüfen.

Gefundene Rechnungen landen automatisch unten in der normalen Rechnungsliste.

Bei Gmail, Outlook oder Microsoft 365 wird oft ein App-Passwort benötigt.
IMAP muss beim Anbieter freigeschaltet sein.

## Artikel mehrfach anlegen

Nach dem Einloggen als Geschäftsführung:

1. `Artikelstammdaten` öffnen.
2. Für manuelle Mehrfachanlage `+ Mehrere Artikel` klicken.
3. Für CSV-Import zuerst `Muster-CSV` herunterladen und ausfüllen.
4. Danach `CSV importieren` klicken und die ausgefüllte Datei auswählen.

CSV-Spalten:

```text
artikelname;kategorie;bereich;einheit;ve;haendler;rhythmus
```

Erlaubte Werte:

- `bereich`: `Laden` oder `Produktion`
- `rhythmus`: `beide`, `freitag` oder `monat`

## Produktions-Wochenauswahl drucken

Nach dem Einloggen als Backend Produktion:

1. `Freitags-Sammlung` öffnen.
2. In der Liste unten die gewünschten Einzelbestellungen anhaken.
3. Optional `Sichtbare auswählen` nutzen, wenn alle sichtbaren Bestellungen in
   die Sammlung sollen.
4. `Auswahl anzeigen` klicken, um die gesammelte Bestellung zu prüfen.
5. `A4-PDF drucken` klicken, um die ausgewählten Bestellungen als A4-PDF zu
   erstellen.

Bemerkungen aus dem Textfeld einer Bestellung werden im Backend Produktion
direkt unter `Sammlung als PDF` als rote Hinweisbox angezeigt und automatisch
mit in die druckbare A4-PDF übernommen. Das gilt auch für Bestellungen, die
keine direkten Produktionsartikel enthalten und nur eine Bemerkung haben.

## Eingangskontrolle Laden

Im Bestellbereich Laden:

1. `Neue Bestellung` öffnen.
2. Unter `Freitagsbestellung` und `Monatsbestellung` erscheint der
   ausklappbare Reiter `Eingangskontrolle`.
3. Grüner Haken bedeutet: Produkt ist angekommen.
4. Rotes Kreuz bedeutet: Produkt ist noch nicht geliefert.

Erst der grüne Haken entfernt die `Bereits bestellt`-Markierung im Shop.
Vorhandene Freitagsprodukte aus den letzten 35 Tagen erscheinen nach dem
Update automatisch hier. Nicht gelieferte Freitagsprodukte bleiben markiert und
werden nach Klick auf das rote Kreuz automatisch in die aktuelle
Freitagsbestellung übernommen.

## Server-Update prüfen

Nach dem Hochladen bei GitHub auf dem Server:

```bash
cd /opt/gebrueder-pesch-bestellsystem
git config --global --add safe.directory /opt/gebrueder-pesch-bestellsystem
cp bestellsystem.db bestellsystem_backup_$(date +%Y-%m-%d_%H-%M).db
cp settings.json settings_backup_$(date +%Y-%m-%d_%H-%M).json
git pull
pip install -r requirements.txt
systemctl restart gebrueder-pesch-intern
curl -s http://127.0.0.1:8017/ | grep 2026-09-05-receipt-foldout
```

Wenn die letzte Zeile `2026-09-05-receipt-foldout` ausgibt, laeuft der neue
Stand auf dem Server.

## Vercel optional

Die Struktur enthält wie beim Opa-Peters-System:

- `api/index.py`
- `pyproject.toml`
- `vercel.json`

Damit ist die Struktur Vercel-freundlich. Für dauerhaft gespeicherte Daten ist
ein eigener Server mit SQLite aber sinnvoller als Serverless.
