# demo-remota.ps1 — Levanta backend, frontend y el tunel de Cloudflare para la demo.
# Uso:  .\demo-remota.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path -LiteralPath "$root\backend") -or -not (Test-Path -LiteralPath "$root\project")) {
  Write-Host "No se encontraron las carpetas backend/ y project/ junto a $root" -ForegroundColor Red
  exit 1
}
if (-not (Get-Command 'cloudflared' -ErrorAction SilentlyContinue)) {
  Write-Host "No se encontro 'cloudflared' en el PATH." -ForegroundColor Red
  exit 1
}

Write-Host "Levantando backend (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\backend'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "Levantando frontend (puerto 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\project'; npm run dev"

Start-Sleep -Seconds 5
Write-Host "Abriendo tunel de Cloudflare..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cloudflared tunnel --url http://localhost:5173"

Write-Host ""
Write-Host "Listo. En la ventana del tunel aparecera una URL https://xxxx.trycloudflare.com; comparte esa." -ForegroundColor Green
Write-Host "Para mostrar evidencias: pon esa URL + /api en backend\.env (PUBLIC_API_URL) y reinicia el backend." -ForegroundColor Yellow
