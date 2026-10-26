@echo off
chcp 65001 >nul
title ERB Visita Virtual 3D
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias ^(so na primeira vez^), aguarde...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando a visita virtual em http://127.0.0.1:5173/
echo O navegador abre sozinho. Feche esta janela ^(ou Ctrl+C^) para encerrar o servidor.
echo.
call npm run dev -- --open
pause
