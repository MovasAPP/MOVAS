@echo off
setlocal
cd /d "%~dp0"
set EAS_NO_VCS=1
title MOVA$ - Build iOS
echo.
echo MOVA$ - Build iOS pelo EAS
echo Modo sem Git ativado.
echo Verificando Node e npm...
node --version
npm --version
echo.
echo Iniciando o EAS. A primeira execucao pode baixar o CLI.
echo Esta janela vai permanecer aberta ao final.
echo.
call npx --yes eas-cli@latest build --platform ios --profile production
set "BUILD_RESULT=%ERRORLEVEL%"
echo.
if "%BUILD_RESULT%"=="0" (
  echo O EAS terminou sem erro.
) else (
  echo O comando terminou com codigo %BUILD_RESULT%.
  echo Tire uma foto desta janela e envie aqui para eu identificar o erro.
)
echo.
pause
