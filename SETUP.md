# Setup-Anleitung — Firebase Auth

Alle Code-Änderungen sind implementiert. Diese Anleitung beschreibt Konfiguration + bekannte Fallstricke.

---

## Problem: Dienstkontoschlüssel nicht erlaubt

Organisationsrichtlinie `iam.disableServiceAccountKeyCreation` verhindert Download von JSON-Keys.  
**Lösung:** Application Default Credentials (ADC) — kein JSON-Key nötig.

---

## Bekannte Fallstricke (bereits gefixt)

| Problem | Ursache | Fix |
|---------|---------|-----|
| `event.req.headers.get is not a function` | H3 v2 RC in `package.json` überschreibt Nuxts H3 | `h3` aus `package.json` entfernt |
| `event.req.text is not a function` | Gleiche Ursache — `readBody` nutzt Fetch-API statt Node.js | Gleicher Fix |
| `401 Missing token` auf `/` | Middleware blockierte auch Nuxt-Seitenrouten | Guard `!path.startsWith("/api/")` eingefügt |
| ADC im Docker nicht gefunden | Container hat keinen Zugriff auf Host-ADC-Datei | Volume-Mount + `GOOGLE_APPLICATION_CREDENTIALS` in `docker-compose.yml` |

---

## Lokales Setup

### Schritt 1: Firebase-Projekt erstellen

1. https://console.firebase.google.com öffnen
2. **Projekt hinzufügen** → gleiche GCP-Projekt-ID wie Cloud Run verwenden

### Schritt 2: Auth-Anbieter aktivieren

Firebase Console → **Authentifizierung** → **Jetzt starten** → **Anmeldemethode**:
- **E-Mail/Passwort** aktivieren
- **Google** aktivieren (Support-E-Mail eintragen)

### Schritt 3: Web-App registrieren → echte Config holen

Firebase Console → **Projekteinstellungen** (Zahnrad oben links) → Tab **Allgemein** → **Deine Apps** → **App hinzufügen** → Web (`</>`)

Den `firebaseConfig`-Block kopieren — diese 4 Werte werden benötigt:
```
apiKey           → NUXT_PUBLIC_FIREBASE_API_KEY
authDomain       → NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
projectId        → NUXT_PUBLIC_FIREBASE_PROJECT_ID
appId            → NUXT_PUBLIC_FIREBASE_APP_ID
```

### Schritt 4: Autorisierte Domains hinzufügen

Firebase Console → **Authentifizierung** → **Einstellungen** → **Autorisierte Domains**:
- `localhost` hinzufügen

### Schritt 5: ADC einrichten (kein JSON-Key nötig)

```sh
gcloud auth application-default login
gcloud config set project DEINE_PROJEKT_ID
```

### Schritt 6: `.env`-Datei befüllen

`.env.example` → `.env` kopieren, echte Werte eintragen:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/travelmanager

NUXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dein-projekt.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=dein-projekt-id
NUXT_PUBLIC_FIREBASE_APP_ID=1:999...:web:abc...

# FIREBASE_SERVICE_ACCOUNT weglassen — ADC wird verwendet
GOOGLE_CLOUD_PROJECT=dein-projekt-id
```

> ⚠️ `.env` niemals committen!

### Schritt 7: Starten

```sh
docker compose up --build
```

http://localhost:3000 öffnen

### Schritt 8: Prüfen

| Test | Erwartetes Ergebnis |
|------|---------------------|
| Unauthentifiziert öffnen | Weiterleitung zu `/register` |
| E-Mail+Passwort Registrierung | Postgres-Zeile erstellt, Weiterleitung zu `/trips` |
| DevTools → Netzwerk → `/api/trips` | Header `Authorization: Bearer ey...` sichtbar |
| Abmelden → wieder einloggen | Funktioniert |
| Google OAuth | Popup → Zustimmung → `/trips` |
| Inkognito als Nutzer B | Nur eigene Trips sichtbar |
| `PUT /api/trips/<Trip-ID von A>` als B | Gibt `403 Forbidden` zurück |

---

## Cloud Run Deployment

Kein JSON-Key nötig — Cloud Run Service Account übernimmt Identität automatisch via ADC.

### IAM-Rolle vergeben

```sh
gcloud projects add-iam-policy-binding DEIN_PROJECT_ID \
  --member="serviceAccount:DEIN_CLOUD_RUN_SA@DEIN_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.viewer"
```

Cloud Run SA-Email: `terraform/terraform.tfvars` → Wert von `cloud_run_service_account_id` + `@PROJEKT_ID.iam.gserviceaccount.com`

### Firebase-Vars in `terraform/terraform.tfvars` eintragen

```hcl
firebase_api_key      = "AIzaSy..."
firebase_auth_domain  = "dein-projekt.firebaseapp.com"
firebase_project_id   = "dein-projekt-id"
firebase_app_id       = "1:999...:web:abc..."
```

### Deployen

```sh
./scripts/deploy-cloud-run-paas.sh
```

Nach Deployment: Cloud Run URL zu Firebase **Autorisierten Domains** hinzufügen.

---

## Fehlerbehebung

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Application Default Credentials not found` | ADC nicht eingerichtet | `gcloud auth application-default login` |
| `Could not load the default credentials` | `GOOGLE_CLOUD_PROJECT` fehlt | In `.env` setzen |
| Firebase Popup blockiert | Browser blockiert Popups | Popup-Blocker für localhost deaktivieren |
| `401 Missing token` auf API-Route | Kein `Authorization`-Header | `useApiFetch` statt `$fetch` verwenden |
| `403 Forbidden` | Ownership-Check schlägt an | Korrekt — anderer Nutzer kann fremde Daten nicht ändern |