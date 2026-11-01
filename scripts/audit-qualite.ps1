# Script d'audit de qualite et preparation des rapports SonarQube
# Usage : .\scripts\audit-qualite.ps1 [-RunSonarScanner]

param(
    [switch]$RunSonarScanner = $false
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      LANCEMENT DE L'AUDIT QUALITE kEur IA (SonarQube)     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. AUDIT BACKEND
Write-Host "[1/3] Audit Backend (Python 3.13 / Django)..." -ForegroundColor Yellow
$BackendDir = Join-Path $Root "backend"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (Test-Path $PythonExe) {
    Push-Location $BackendDir
    Write-Host "  -> Verification Ruff..." -ForegroundColor Gray
    & $PythonExe -m ruff check .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Ruff : 0 erreur de style ou de securite." -ForegroundColor Green
    } else {
        Write-Host "  [ATTENTION] Ruff a detecte des points a corriger." -ForegroundColor Red
    }

    Write-Host "  -> Execution des tests & generation de la couverture (coverage.xml)..." -ForegroundColor Gray
    & $PythonExe -m coverage run -m pytest -q
    & $PythonExe -m coverage xml
    if (Test-Path (Join-Path $BackendDir "coverage.xml")) {
        Write-Host "  [OK] Rapport Cobertura genere : backend/coverage.xml" -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "  [ERREUR] Environnement virtuel introuvable dans backend/.venv" -ForegroundColor Red
}

Write-Host ""

# 2. AUDIT FRONTEND
Write-Host "[2/3] Audit Frontend (Next.js / TypeScript / ESLint)..." -ForegroundColor Yellow
$FrontendDir = Join-Path $Root "frontend"

if (Test-Path $FrontendDir) {
    Push-Location $FrontendDir
    Write-Host "  -> Verification TypeScript (typecheck)..." -ForegroundColor Gray
    npm run typecheck
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] TypeScript : 0 erreur de types." -ForegroundColor Green
    }

    Write-Host "  -> Verification ESLint..." -ForegroundColor Gray
    npm run lint
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] ESLint : conforme." -ForegroundColor Green
    }

    Write-Host "  -> Execution des tests unitaires & couverture (lcov.info)..." -ForegroundColor Gray
    npm run test:coverage
    if (Test-Path (Join-Path $FrontendDir "coverage/lcov.info")) {
        Write-Host "  [OK] Rapport LCOV genere : frontend/coverage/lcov.info" -ForegroundColor Green
    }
    Pop-Location
}

Write-Host ""

# 3. VERIFICATION DE SONARQUBE
Write-Host "[3/3] Analyse SonarQube..." -ForegroundColor Yellow
$SonarProperties = Join-Path $Root "sonar-project.properties"

if (Test-Path $SonarProperties) {
    Write-Host "  [OK] Fichier de configuration detecte : sonar-project.properties" -ForegroundColor Green
}

# Verifier si un serveur SonarQube local tourne (ex: localhost:9000)
$SonarAvailable = $false
try {
    $res = Invoke-WebRequest -Uri "http://localhost:9000/api/system/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($res.StatusCode -eq 200) {
        $SonarAvailable = $true
    }
} catch {}

if ($SonarAvailable) {
    Write-Host "  [OK] Serveur SonarQube detecte sur http://localhost:9000" -ForegroundColor Green
    if ($RunSonarScanner -or ($env:SONAR_TOKEN -ne $null)) {
        Write-Host "  -> Lancement du scanner SonarQube..." -ForegroundColor Cyan
        npx --yes @sonar/scan
    } else {
        Write-Host "  -> Pour envoyer les resultats a SonarQube :" -ForegroundColor Gray
        Write-Host "     npx @sonar/scan" -ForegroundColor White
    }
} else {
    Write-Host "  -> L'extension SonarQube (SonarLint) dans votre editeur analyse maintenant directement votre code en temps reel !" -ForegroundColor Green
    Write-Host "     Elle utilise les regles configurees dans .vscode/settings.json et sonar-project.properties." -ForegroundColor Gray
    Write-Host "     (Si vous utilisez un serveur SonarQube local sur port 9000, lancez-le pour un tableau de bord complet)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                   AUDIT QUALITE TERMINE                  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

