# IBA – Änderungsprotokoll

Dieses Dokument wird mit jeder Entwicklungssitzung ergänzt.
Alle Änderungen erfolgen auf dem Branch `optimierungen` und werden erst nach
Freigabe durch den Ursprungsautor in `main` gemergt.

---

## Sitzung vom 26.05.2026

### Branch: `optimierungen`

---

### 1. Docker-Startup-Optimierung (Backend)

**Problem:**
Nach jedem Docker- oder Server-Neustart dauerte es bis zu 5 Minuten, bis die IBA
nutzbar war.

**Ursache:**
`backend/entrypoint.sh` führte bei **jedem** Container-Start die komplette
Doctrine-Migrations-Maschinerie aus (`migrations:diff` → `migrations:migrate` →
`schema:update --force`) – unabhängig davon, ob die Datenbank bereits korrekt
eingerichtet war. Jeder dieser Schritte kostete 30–90 Sekunden.

**Geänderte Dateien:**
- `backend/entrypoint.sh`
- `backend/opcache.ini` *(neu)*
- `Dockerfile-backend`

**Was sich geändert hat:**

| Situation | Vorher | Nachher |
|---|---|---|
| Leere DB (Erststart) | migrations:diff + migrate + schema:update | doctrine:schema:create (direkt, schnell) |
| DB bereits vorhanden, Schema ok | Volle Migration trotzdem | `schema:validate` → alles überspringen |
| DB vorhanden, Schema veraltet | Volle Migration | `schema:update --force` (gezielt) |
| Immer | cache:clear + cache:warmup | unverändert |

Zusätzlich: `opcache.ini` mit Produktions-Einstellungen eingeführt
(`validate_timestamps=0`, `enable_cli=1`, Preloading via `config/preload.php`).
Das beschleunigt alle Symfony-Konsolenbefehle beim Start.

**Erwartete Verbesserung:** Normalstart (DB läuft bereits) von ~5 Minuten auf ~1–2 Minuten.

---

### 2. iPad-Bugfix: Suchfeld in der Toolbar (Frontend)

**Problem:**
Auf Apple-Tablets (Safari) war das Lupen-Symbol / Suchfeld oben rechts nicht
sichtbar – es befand sich außerhalb des Anzeigebereichs.

**Ursache:**
Die CSS-Klassen `.input-wrapper` und `.input-wrapper-cancel-btn` nutzten
`position: fixed`. Angular Materials `<mat-sidenav-container>` setzt intern
CSS-Transforms ein (für die Seitenleisten-Animation). Laut CSS-Spezifikation
verliert `position: fixed` seine Viewport-Bindung, sobald ein Elternelement
einen Transform hat – das Element wird dann relativ zum transformierten
Elternelement positioniert. Auf dem iPad führte das zu einem Versatz außerhalb
des sichtbaren Bereichs.

Zusätzlich verursachte `width: 100vw` mit `margin-left: -10px` am
`mat-sidenav-container` einen horizontalen Scroll-Überlauf.

**Geänderte Dateien:**
- `frontend/src/styles.css`
- `frontend/src/app/data-grid-bestellungen/data-grid-bestellungen.component.html`
- `frontend/src/app/data-grid-artikel/data-grid-artikel.component.html`
- `frontend/src/app/departments/department-grid/department-grid.component.html`
- `frontend/src/app/herstellers/hersteller-grid/hersteller-grid.component.html`
- `frontend/src/app/lieferants/lieferant-grid/lieferant-grid.component.html`
- `frontend/src/app/personal/personal-grid/personal-grid.component.html`

**Was sich geändert hat:**
- `position: fixed` durch `margin-left: auto` ersetzt → Suchfeld ist jetzt
  innerhalb des normalen Toolbar-Flexbox-Layouts rechtsbündig verankert
- Neue CSS-Klasse `.search-toolbar`: kompakte Suchleiste (48px) unterhalb der
  Navigation, klar sichtbar und auf Touchscreens gut tippbar
- `width: 100vw` + `margin-left: -10px` → `width: 100%` + `overflow-x: hidden`
- Hardcoded `color: white` auf dem Such-Icon entfernt; Angular Material Theme
  übernimmt die Farbe automatisch

---

### 3. iPad-Bugfix: Doppeltipp-Zoom in Safari deaktivieren (Frontend)

**Problem:**
Bei schnellem Doppeltippen auf dem iPad zoomte Safari automatisch in die Seite
hinein – störend bei der Bedienung im Dentallabor-Alltag.

**Geänderte Dateien:**
- `frontend/src/index.html`
- `frontend/src/styles.css`

**Was sich geändert hat:**
- `index.html`: Viewport-Meta-Tag um `maximum-scale=1` erweitert
- `styles.css`: `touch-action: manipulation` auf `body` gesetzt

`touch-action: manipulation` deaktiviert den Doppeltipp-Zoom zuverlässig,
lässt aber Pinch-to-Zoom (zwei Finger) weiterhin zu. Beide Maßnahmen zusammen
greifen auch wenn Safari den Viewport-Meta-Tag ignoriert (was Apple seit iOS 10
bei `user-scalable=no` tut).

---

### 4. Validierung: Anzahl-Pflichtfeld mit Fehlermeldungen (Frontend + Backend)

**Problem:**
Bestellungen konnten ohne Anzahl-Angabe (leer) oder mit Anzahl `0` gespeichert
werden. Das führte dazu, dass der PDF-Export eine 0-Byte-Datei erzeugte, da
Gesamtpreise mit 0 multipliziert wurden.

**Geänderte Dateien:**
- `frontend/src/app/shared/float_validator.ts`
- `frontend/src/app/data-grid-bestellungen/bestellung-edit-component/bestellung-edit-component.component.ts`
- `frontend/src/app/data-grid-bestellungen/bestellung-edit-component/bestellung-edit-component.component.html`
- `backend/src/Forms/BestellungFormType.php`
- `backend/src/Business/Export/BestellungExportHelper.php`

**Was sich geändert hat:**

*Frontend:*
- Neuer `positiveNumberValidator` in `float_validator.ts`:
  - Leerfeld → Fehler „Anzahl ist erforderlich."
  - Wert `0` oder negativ → Fehler „Anzahl muss größer als 0 sein."
- `amount`-Feld im Formular nutzt jetzt `[floatValidator, positiveNumberValidator]`
- Template zeigt drei spezifische Fehlermeldungen je nach Fehlerart
- Das Formular lässt sich erst speichern, wenn Anzahl valide ist

*Backend (Absicherung):*
- `BestellungFormType`: `NotBlank` + `Regex`-Constraint auf das `amount`-Feld
  (erlaubt nur positive Zahlen, auch mit Komma: z.B. `1,5`)
- `BestellungExportHelper.getAmountNumber()`: behandelt Komma-Dezimalzahlen
  korrekt (`"1,5"` → `1.5`); fällt bei `0` oder leerem Wert auf `1.0` zurück
  statt eine leere PDF zu erzeugen (Sicherheitsnetz für Altdaten)

---

### 5. Lokale Entwicklungsumgebung eingerichtet

**Ziel:**
Die IBA lokal (zu Hause) testbar machen, ohne den Laborserver zu berühren.

**Neue Dateien:**
- `start-docker-build-local.bat` + `config/start-docker-build-local.ps1` *(neu)*
- `docker-compose.local-override.yml` *(neu, optional)*
- `frontend/ssl/server.crt` + `frontend/ssl/server.key` *(lokal generiert, gitignored)*

**Was sich geändert hat:**
- Lokaler Starter per Doppelklick: baut Images, startet Container, öffnet
  automatisch `https://localhost:4444` im Browser. Terminal bleibt offen bis
  Enter oder Esc gedrückt wird.
- `docker-compose-prod.yml`: Datenbank-Port von `3306` auf `3307` geändert,
  um Konflikt mit lokalem Windows-MySQL-Dienst zu vermeiden. Der interne
  Docker-Netzwerkverkehr zwischen `symfony` und `database` ist davon unberührt.
  **Hinweis für den Laborserver:** DB-GUI-Tools müssen auf Port 3307 umgestellt werden.
- `docker-compose.local-override.yml`: optionaler Override für direkten
  DB-Zugriff per GUI-Tool (z.B. HeidiSQL, TablePlus) – mappt Port 3307 nach außen.
- `frontend/.gitignore`: `/ssl/` ausgeschlossen (selbstsignierte Zertifikate
  gehören nicht ins Repo und müssen lokal neu generiert werden).

**Verbindungsdaten für DB-GUI-Tool (lokal):**

| Feld | Wert |
|---|---|
| Host | `localhost` |
| Port | `3307` |
| Benutzer | `zm_32` |
| Passwort | `zm_32123456` |
| Datenbank | `zm_32` |

---

### 6. Build-Fixes für lokalen Docker-Build

Beim ersten lokalen Start traten mehrere Build-Fehler auf, die behoben wurden:

**TypeScript-Fehler (`TS5103`):**
- `frontend/tsconfig.json`: `"ignoreDeprecations": "6.0"` war ungültig
  (TypeScript 6 existiert noch nicht). Stattdessen die zwei veralteten Optionen
  direkt behoben: `downlevelIteration` entfernt, `moduleResolution` von `"node"`
  auf `"bundler"` geändert. Kein `ignoreDeprecations` mehr nötig.

**GrumPHP Permission-Fehler:**
- `Dockerfile-backend`: GrumPHP läuft als Composer-Plugin auch bei `--no-scripts`
  und versuchte Git-Hooks in den Container zu schreiben (Permission denied).
  Fix: `composer config allow-plugins.phpro/grumphp false` wird jetzt als `root`
  vor dem User-Wechsel zu `www-data` ausgeführt.

**Port-Konflikt 3306:**
- Docker Compose addiert Ports aus Override-Dateien statt sie zu ersetzen –
  daher wurde der Port direkt in `docker-compose-prod.yml` geändert (siehe Punkt 5).

---

*Protokoll erstellt: 26.05.2026, 20:00 Uhr*
*Zuletzt aktualisiert: 27.05.2026*
*Erstellt mit Unterstützung von Claude (Anthropic)*
