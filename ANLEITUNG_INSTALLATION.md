# Schritt-fuer-Schritt-Anleitung

Diese Anleitung ist fuer Anfaenger geschrieben. Arbeite die Schritte der Reihe nach ab.

## 1. Was in der ZIP ist

Die ZIP enthaelt das Bestellsystem mit:

- Bestellfunktion fuer Laden und Produktion
- Backend Geschaeftsfuehrung
- Rechnungen & Controlling
- Rechnung hochladen
- KI-Auslesung fuer Rechnungen ueber OpenAI API

Die ZIP enthaelt absichtlich keine echte Datenbankdatei. Die Datei `bestellsystem.db` wird beim ersten Start automatisch erstellt. So landen keine echten Bestellungen oder Rechnungen auf GitHub.

## 2. Wichtig zum API-Schluessel

Der OpenAI API-Schluessel darf niemals in GitHub hochgeladen werden.

Der Schluessel muss spaeter auf dem Server als geheime Umgebungsvariable eingetragen werden:

```bash
OPENAI_API_KEY=dein_schluessel
```

Optional:

```bash
OPENAI_INVOICE_MODEL=gpt-4.1-mini
```

## 3. GitHub vorbereiten

1. Gehe auf https://github.com
2. Melde dich an.
3. Klicke oben rechts auf `+`.
4. Klicke auf `New repository`.
5. Repository-Name zum Beispiel:

```text
feine-kost-bestellung
```

6. Waehle `Private`, wenn der Code nicht oeffentlich sichtbar sein soll.
7. Klicke auf `Create repository`.

## 4. ZIP bei GitHub hochladen

1. Entpacke die ZIP auf deinem Computer.
2. Oeffne den entpackten Ordner.
3. Wichtig: Lade den Inhalt des Ordners hoch, nicht den Ordner als Unterordner.
4. In GitHub im neuen Repository auf `uploading an existing file` klicken.
5. Alle Dateien und Ordner aus dem entpackten Projekt hineinziehen.
6. Unten bei Commit-Nachricht schreiben:

```text
Bestellsystem mit Rechnungen und KI-Auslesung
```

7. Auf `Commit changes` klicken.

## 5. Empfohlene Server-Installation

Diese Variante ist fuer echten Betrieb empfohlen, weil die SQLite-Datenbank dauerhaft auf dem Server liegt.

Du brauchst:

- einen Linux-Server, zum Beispiel Ubuntu
- SSH-Zugang zum Server
- eine Domain: `inter.opapetersfeinekost.de`
- Zugriff auf die DNS-Einstellungen der Domain
- deinen OpenAI API-Schluessel

## 6. Auf den Server verbinden

Auf deinem Computer Terminal oeffnen und verbinden:

```bash
ssh benutzername@DEINE_SERVER_IP
```

Wenn dein Anbieter dir einen anderen SSH-Befehl gegeben hat, nutze den.

## 7. Server vorbereiten

Auf dem Server ausfuehren:

```bash
sudo apt update
sudo apt install -y python3 git nginx certbot python3-certbot-nginx
```

## 8. Projekt vom GitHub-Repository herunterladen

Ersetze `DEIN-GITHUB-LINK` durch den Link deines Repositorys.

Beispiel:

```bash
sudo mkdir -p /var/www/inter-opapeters
sudo chown -R $USER:$USER /var/www/inter-opapeters
git clone DEIN-GITHUB-LINK /var/www/inter-opapeters
```

Danach:

```bash
cd /var/www/inter-opapeters
```

## 9. Datenordner erstellen

Hier speichert das System spaeter Bestellungen, Rechnungen und Datenbank.

```bash
sudo mkdir -p /var/www/inter-opapeters-data
sudo chown -R www-data:www-data /var/www/inter-opapeters-data
```

## 10. OpenAI API-Schluessel eintragen

Den API-Schluessel bekommst du in deinem OpenAI-Konto unter:

https://platform.openai.com/api-keys

Der Schluessel sieht ungefaehr so aus:

```text
sk-...
```

## 11. Systemdienst anlegen

Datei oeffnen:

```bash
sudo nano /etc/systemd/system/feinekost.service
```

Diesen Inhalt einfuegen. Ersetze `HIER_DEIN_OPENAI_API_KEY` durch deinen echten Schluessel:

```ini
[Unit]
Description=Opa Peters Feine Kost Bestellsystem
After=network.target

[Service]
WorkingDirectory=/var/www/inter-opapeters
Environment=HOST=127.0.0.1
Environment=PORT=8000
Environment=DATA_DIR=/var/www/inter-opapeters-data
Environment=PYTHONDONTWRITEBYTECODE=1
Environment=OPENAI_API_KEY=HIER_DEIN_OPENAI_API_KEY
Environment=OPENAI_INVOICE_MODEL=gpt-4.1-mini
ExecStart=/usr/bin/python3 /var/www/inter-opapeters/app.py
Restart=always
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Speichern in nano:

1. `CTRL + O`
2. Enter
3. `CTRL + X`

Dann starten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable feinekost
sudo systemctl start feinekost
```

Pruefen:

```bash
sudo systemctl status feinekost
```

Wenn dort `active (running)` steht, laeuft das Programm.

## 12. Intern testen

Auf dem Server ausfuehren:

```bash
curl http://127.0.0.1:8000/healthz
```

Wenn alles gut ist, kommt:

```json
{"ok": true}
```

KI-Status testen:

```bash
curl http://127.0.0.1:8000/api/ai/status
```

Wenn der API-Schluessel richtig gesetzt ist, steht dort:

```json
{"invoice_ai_enabled": true, "invoice_model": "gpt-4.1-mini"}
```

## 13. Domain auf den Server zeigen lassen

Im DNS-Bereich deiner Domain einen A-Record setzen:

```text
Name: inter
Typ: A
Wert: DEINE_SERVER_IP
```

Es kann einige Minuten bis Stunden dauern, bis die Domain erreichbar ist.

## 14. Nginx fuer die Webseite einrichten

Datei anlegen:

```bash
sudo nano /etc/nginx/sites-available/inter-opapeters
```

Diesen Inhalt einfuegen:

```nginx
server {
    listen 80;
    server_name inter.opapetersfeinekost.de;

    client_max_body_size 80M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Speichern:

1. `CTRL + O`
2. Enter
3. `CTRL + X`

Aktivieren:

```bash
sudo ln -s /etc/nginx/sites-available/inter-opapeters /etc/nginx/sites-enabled/inter-opapeters
sudo nginx -t
sudo systemctl reload nginx
```

Wenn `nginx -t` keinen Fehler zeigt, ist es gut.

## 15. HTTPS aktivieren

Wenn die Domain schon auf den Server zeigt:

```bash
sudo certbot --nginx -d inter.opapetersfeinekost.de
```

Den Fragen folgen. Danach sollte die Seite unter HTTPS erreichbar sein:

```text
https://inter.opapetersfeinekost.de
```

## 16. Im Browser testen

1. Oeffne `https://inter.opapetersfeinekost.de`
2. Waehle `Backend Geschaeftsfuehrung`
3. Code eingeben: `3243`
4. Tab `Rechnungen & Controlling` oeffnen
5. Auf `+ Rechnung hochladen` klicken
6. PDF oder Bild auswaehlen
7. Auf `Mit KI auslesen` klicken
8. Felder pruefen
9. Rechnung speichern

## 17. Updates spaeter einspielen

Wenn du spaeter eine neue Version bei GitHub hochgeladen hast:

```bash
cd /var/www/inter-opapeters
git pull
sudo systemctl restart feinekost
```

## 18. Daten sichern

Die wichtige Datenbank liegt hier:

```text
/var/www/inter-opapeters-data/bestellsystem.db
```

Backup erstellen:

```bash
sudo cp /var/www/inter-opapeters-data/bestellsystem.db /var/www/inter-opapeters-data/bestellsystem-backup.db
```

Noch besser: Regelmaessig vom Server herunterladen.

## 19. Wenn etwas nicht klappt

Status ansehen:

```bash
sudo systemctl status feinekost
```

Live-Log ansehen:

```bash
sudo journalctl -u feinekost -f
```

Nginx pruefen:

```bash
sudo nginx -t
```

App neu starten:

```bash
sudo systemctl restart feinekost
```

## 20. Hinweis zu Vercel

Das Projekt enthaelt eine `vercel.json`, weil es technisch auch von GitHub zu Vercel importiert werden kann.

Wichtig: Fuer echten Betrieb mit Bestellungen und Rechnungen ist ein normaler Server besser. Bei Vercel ist lokaler SQLite-Speicher nicht dauerhaft sicher, weil Serverless-Dateisysteme nicht wie eine normale Festplatte funktionieren.

Wenn du trotzdem Vercel nutzt:

1. GitHub-Repository bei Vercel importieren
2. Environment Variable `OPENAI_API_KEY` setzen
3. Domain `inter.opapetersfeinekost.de` in Vercel verbinden
4. Fuer dauerhafte Daten spaeter eine echte externe Datenbank einplanen

