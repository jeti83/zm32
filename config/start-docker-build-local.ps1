# start-docker-build-local.ps1
# Lokaler Test-Start (Entwicklung/Branch-Test) - oeffnet localhost statt Laborserver

# Step 1: Images neu bauen
docker-compose -f docker-compose-prod.yml --env-file .env build

# Step 2: Laufende Container stoppen
docker-compose -f docker-compose-prod.yml --env-file .env down

# Step 3: Container neu starten
docker-compose -f docker-compose-prod.yml --env-file .env up --force-recreate -d

# Warten bis die Container hochgefahren sind
Start-Sleep -Seconds 10

# Browser mit lokalem Host oeffnen
Start-Process "https://localhost:4444"

# Terminal offen halten bis Enter oder Esc gedrueckt wird
Write-Host "`nIBA laeuft. Druecke Enter oder Esc zum Schliessen..."
do {
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} while ($key.VirtualKeyCode -ne 13 -and $key.VirtualKeyCode -ne 27)
