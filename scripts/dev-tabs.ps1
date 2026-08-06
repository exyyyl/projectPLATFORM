# Запускает каждый сервис в отдельной вкладке Windows Terminal, чтобы логи
# db / backend / frontend не сливались в один поток.
#
# Точка входа: npm run dev:tabs (из корня проекта).
#
# Обратный слэш-кавычка перед `; обязателен: без экранирования PowerShell
# съест точку с запятой как свой разделитель команд, и wt получит только
# первую вкладку.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
  Write-Error 'Не найден Windows Terminal (wt). Установи его из Microsoft Store или запускай сервисы вручную: npm run docker:up / dev:backend / dev:frontend'
  exit 1
}

wt --window projectPLATFORM `
  new-tab --suppressApplicationTitle --title 'db' --tabColor '#2563eb' --startingDirectory $root powershell -NoExit -Command 'npm run docker:up' `
  `; new-tab --suppressApplicationTitle --title 'back' --tabColor '#16a34a' --startingDirectory $root powershell -NoExit -Command 'npm run dev:backend' `
  `; new-tab --suppressApplicationTitle --title 'front' --tabColor '#c026d3' --startingDirectory $root powershell -NoExit -Command 'npm run dev:frontend'
