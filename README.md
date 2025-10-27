# Cykelevent Resultathantering

En fullständig webapp för att hantera resultat från cykelevent med flera serier, automatisk dublettdetektering och flexibla poängsystem.

## Funktioner

✅ **10+ olika serier** - Hantera obegränsat antal serier med olika poängsystem
✅ **CSV/Excel import** - Ladda upp resultat från tidtagningssystem
✅ **Automatisk matchning** - Smart algoritm som matchar deltagare via namn, klubb och UCI-ID
✅ **Dublettdetektering** - Hitta och slå samman dubbletter med Levenshtein distance
✅ **Individuell & lagpoäng** - Räkna poäng både per person och per klubb
✅ **Komplett databas** - Lagra e-post och telefonnummer för nyhetsbrev
✅ **Visualiseringar** - Serietabeller med realtidsuppdatering
✅ **Export** - Exportera data till CSV för nyhetsbrev och rapporter

## Teknisk Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Databas**: PostgreSQL
- **ORM**: Prisma
- **Deployment**: Vercel (rekommenderat) eller egen server

## Installation

### 1. Förberedelser

Installera följande om du inte redan har dem:
- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 14+ (https://www.postgresql.org/download/)

### 2. Klona projektet

```bash
cd cycling-results-app
```

### 3. Installera dependencies

```bash
npm install
```

### 4. Skapa databas

Skapa en PostgreSQL-databas:

```bash
# Logga in i PostgreSQL
psql -U postgres

# Skapa databas
CREATE DATABASE cycling_results;

# Avsluta
\q
```

### 5. Konfigurera miljövariabler

Kopiera exempel-filen och uppdatera med dina uppgifter:

```bash
cp .env.example .env
```

Redigera `.env` och uppdatera `DATABASE_URL`:

```
DATABASE_URL="postgresql://postgres:dittlösenord@localhost:5432/cycling_results?schema=public"
```

### 6. Kör databasmigrering

```bash
npx prisma db push
```

### 7. Starta utvecklingsserver

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare!

## Användning

### Importera resultat

1. Förbered en CSV-fil med följande kolumner (svenska eller engelska):
   - Förnamn / FirstName
   - Efternamn / LastName
   - Klubb / Club
   - Klass / Class
   - Placering / Position
   - UCI-ID (valfritt)
   - E-post (valfritt)
   - Telefon (valfritt)

2. Klicka på "Importera CSV/Excel"
3. Välj serie och ange eventnamn
4. Systemet matchar automatiskt deltagare och beräknar poäng

### Hantera dubbletter

1. Gå till "Deltagare"-fliken
2. Klicka "Visa dubbletter"
3. Granska förslagen (baserat på likhet i namn, klubb, UCI-ID)
4. Klicka "Behåll denna" för att slå samman dubbletter

### Skapa ny serie

1. Klicka "Ny Serie"
2. Ange namn och beskrivning
3. Välj poängsystem (Enduro, DH Kval, DH Race, Övriga)
4. Aktivera "Lagbaserad" för klubbpoäng

### Exportera data

- **Nyhetsbrevslista**: Exporterar alla deltagare med e-post
- **Serietabell**: Exporterar aktuell serieställning
- **Deltagare**: Exporterar komplett deltagarlista

## Poängsystem

Applikationen stödjer följande fördefinierade poängsystem:

- **ENDURO**: 500 poäng för 1:a plats (63 positioner)
- **DH_KVAL**: 100 poäng för 1:a plats (24 positioner)
- **DH_RACE**: 420 poäng för 1:a plats (63 positioner)
- **OTHERS**: 250 poäng för 1:a plats (53 positioner)
- **CUSTOM**: Egna poängsystem (framtida funktion)

## Databas-administration

Öppna Prisma Studio för visuell databashantering:

```bash
npm run db:studio
```

Detta öppnar ett webgränssnitt där du kan:
- Visa alla tabeller
- Editera data direkt
- Köra queries
- Exportera data

## Deployment

### Vercel (Rekommenderat)

1. Skapa konto på [vercel.com](https://vercel.com)
2. Installera Vercel CLI: `npm i -g vercel`
3. Länka projekt: `vercel link`
4. Sätt miljövariabel: `vercel env add DATABASE_URL`
5. Deploya: `vercel --prod`

### Egen server

1. Bygg projektet: `npm run build`
2. Starta: `npm start`
3. Använd en process manager som PM2: `pm2 start npm --name "cycling-app" -- start`

## Felsökning

### Databas-anslutning fungerar inte

Kontrollera att:
- PostgreSQL är igång: `sudo service postgresql status`
- Lösenordet är korrekt i `.env`
- Databasen finns: `psql -U postgres -l`

### Import fungerar inte

Kontrollera att:
- CSV-filen har rätt format (komma eller semikolon som separator)
- Kolumnnamnen stämmer (se lista ovan)
- Serie-ID är korrekt (hämtas från serie-listan)

### Dubbletter hittas inte

Justera tröskelvärdet:
```typescript
// I pages/api/riders/duplicates.ts
const similarityThreshold = 0.7; // Lägre = mer dubbletter hittas
```

## Utveckling

### API Routes

- `/api/riders` - CRUD för deltagare
- `/api/riders/duplicates` - Hitta och slå samman dubbletter
- `/api/series` - CRUD för serier
- `/api/import` - Importera resultat från CSV
- `/api/standings` - Hämta och beräkna serietabeller
- `/api/export` - Exportera data

### Databasschema

Se `prisma/schema.prisma` för fullständigt schema.

Viktiga tabeller:
- `Rider` - Deltagare med kontaktinfo
- `Series` - Serier med poängsystem
- `Event` - Event inom serier
- `Result` - Enskilda resultat
- `Standing` - Beräknade serietabeller
- `TeamStanding` - Klubbpoäng

## Support

För frågor eller problem, kontakta utvecklaren eller skapa en issue.

## Licens

Proprietary - Alla rättigheter förbehållna.
