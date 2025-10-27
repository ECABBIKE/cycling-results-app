#!/bin/bash

echo "🚴 Cykelevent Resultathantering - Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js är inte installerat. Installera från https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL verkar inte vara installerat"
    echo "   Installera från https://www.postgresql.org/download/"
    echo ""
    read -p "Vill du fortsätta ändå? (j/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Jj]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "📦 Installerar dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation misslyckades"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "🔧 Skapar .env fil..."
    cp .env.example .env
    echo "✅ .env skapad"
    echo ""
    echo "⚠️  OBS: Du måste uppdatera DATABASE_URL i .env filen!"
    echo "   Öppna .env och ändra lösenordet till ditt PostgreSQL-lösenord"
    echo ""
    read -p "Tryck Enter när du har uppdaterat .env..." 
fi

# Ask if user wants to create database
echo ""
read -p "Vill du att vi ska försöka skapa databasen? (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    echo ""
    echo "Ange PostgreSQL användarnamn (vanligtvis 'postgres'):"
    read PG_USER
    
    echo "Skapar databas 'cycling_results'..."
    psql -U "$PG_USER" -c "CREATE DATABASE cycling_results;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Databas skapad"
    else
        echo "ℹ️  Databas kanske redan finns, fortsätter..."
    fi
fi

# Run Prisma migration
echo ""
echo "🗄️  Konfigurerar databas..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Databas-konfiguration misslyckades"
    echo "   Kontrollera DATABASE_URL i .env filen"
    exit 1
fi

echo ""
echo "✅ Setup klar!"
echo ""
echo "📝 Nästa steg:"
echo "   1. Kör 'npm run dev' för att starta utvecklingsservern"
echo "   2. Öppna http://localhost:3000 i din webbläsare"
echo "   3. Skapa din första serie och importera resultat!"
echo ""
echo "📚 Mer information finns i README.md"
echo ""
