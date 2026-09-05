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
- Mehrfachanlage von Artikeln im Geschäftsführungs-Backend
- CSV-Import für Artikel inklusive herunterladbarer Muster-CSV
- Rechnungen & Controlling mit Rechnungsupload
- KI-Auslesung von Rechnungen per OpenAI API
- Rechnungspostfächer per IMAP hinzufügen und nach Rechnungen crawlen
- Backend Produktion: mehrere Einzelbestellungen aus einer Woche auswählen,
  als Sammelbestellung anzeigen und als A4-PDF drucken
- Backend Produktion: Bemerkungen aus Bestellungen werden in der digitalen
  Sammlung und in der A4-PDF automatisch als rote Hinweisboxen angezeigt
- Bestellbereich Laden: Eingangskontrolle für Freitagsbestellungen mit
  angekommen/nicht-geliefert Status je Produkt
- Nicht gelieferte Freitagsprodukte werden automatisch in die aktuelle
  Freitagsbestellung übernommen und bleiben im Shop als bestellt markiert

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

## KI-Auslesung fuer Rechnungen

Die Rechnungs-KI liest PDF- oder Bildrechnungen serverseitig aus. Der
API-Schluessel wird nicht im Browser gespeichert, sondern als Umgebungsvariable
auf dem Server hinterlegt:

```bash
OPENAI_API_KEY=sk-... python3 app.py
```

Optional kann das Modell gewechselt werden:

```bash
OPENAI_INVOICE_MODEL=gpt-4.1-mini python3 app.py
```

Beim Hosting auf `intern.opapetersfeinekost.de` muss `OPENAI_API_KEY` im
Hosting-/Server-Panel als geheime Umgebungsvariable eingetragen werden. Danach
kann im Bereich `Backend Geschaeftsfuehrung` unter `Rechnungen & Controlling`
eine Rechnung hochgeladen und mit `Mit KI auslesen` automatisch vorerfasst
werden.

## Rechnungspostfaecher crawlen

Im Bereich `Backend Geschaeftsfuehrung` -> `Rechnungen & Controlling` koennen
IMAP-Postfaecher hinterlegt werden. Pro Postfach werden gespeichert:

- Anzeigename
- E-Mail-Adresse
- IMAP-Server und Port
- Benutzername
- Passwort oder App-Passwort
- Ordner, Suchzeitraum und maximale Anzahl Mails pro Lauf

Mit `Postfach durchsuchen` werden PDF- und Bildanhaenge aus den gefundenen
Mails per OpenAI als Rechnungen ausgelesen. Neue Rechnungen werden danach unten
in der normalen Rechnungsliste abgelegt, so als waeren sie manuell hochgeladen
worden. Nach jedem Lauf erscheint ein Popup mit Anzahl, Haendler,
Rechnungsnummer und Betrag.

Wichtig: Viele Anbieter, zum Beispiel Gmail oder Microsoft 365, erlauben IMAP
nur mit aktiviertem IMAP-Zugriff und einem App-Passwort. Die Postfachdaten
werden serverseitig in `bestellsystem.db` gespeichert und nicht als normale
Browser-Konfiguration ausgeliefert.

## Mehrere Artikel anlegen

Im Geschäftsführungs-Backend unter `Artikelstammdaten` gibt es drei neue
Möglichkeiten:

- `+ Mehrere Artikel` - mehrere Artikel direkt in einer Tabelle eintragen
- `Muster-CSV` - Beispielvorlage herunterladen
- `CSV importieren` - mehrere Artikel aus einer CSV-Datei übernehmen

Die CSV kann mit Semikolon oder Komma getrennt sein. Unterstützte Spalten:

```text
artikelname;kategorie;bereich;einheit;ve;haendler;rhythmus
```

`bereich` kann `Laden` oder `Produktion` sein. `rhythmus` kann `beide`,
`freitag` oder `monat` sein.

## Produktions-Wochenauswahl drucken

Im `Backend Produktion` unter `Freitags-Sammlung` können einzelne
Wochenbestellungen per Checkbox ausgewählt werden. Danach stehen oberhalb der
Liste diese Aktionen bereit:

- `Sichtbare auswählen` - alle gerade sichtbaren Einzelbestellungen übernehmen
- `Auswahl anzeigen` - gesammelte Bestellung direkt im Browser prüfen
- `A4-PDF drucken` - ausgewählte Bestellungen als A4-Sammelbestellung ausgeben

Die Monats-Sammlung bleibt unverändert.

Bemerkungen aus dem Textfeld einer Bestellung erscheinen automatisch direkt
unter dem Button `Sammlung als PDF` und werden auch in die A4-PDF übernommen.
Das gilt auch, wenn die Bestellung keine direkten Produktionsartikel enthält
und nur aus einer Bemerkung besteht.

## Eingangskontrolle Laden

Im Bestellbereich `Laden` erscheint oberhalb der Artikelsuche der ausklappbare
Reiter `Eingangskontrolle`. Dort werden Produkte aus Freitagsbestellungen
angezeigt, deren Wareneingang noch nicht bestätigt wurde.

- Grüner Haken: Produkt ist angekommen und verschwindet aus der
  `Bereits bestellt`-Markierung.
- Rotes Kreuz: Produkt ist noch nicht geliefert und bleibt als bestellt
  markiert.
- Beim ersten Laden nach diesem Update werden vorhandene Freitagsprodukte aus
  den letzten 35 Tagen automatisch in die Eingangskontrolle übernommen.
- Sobald ein altes Produkt per rotem Kreuz als `nicht geliefert` markiert wird,
  wird es automatisch in die aktuelle Freitagsbestellung übernommen.

Der Bestellstatus `erledigt` im Backend beendet damit nicht mehr automatisch
die Laden-Markierung. Entscheidend ist die Eingangskontrolle pro Produkt.

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
