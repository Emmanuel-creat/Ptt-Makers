# Installe Ptt-Makers pour l'utilisateur courant, sans droits administrateur.
$ErrorActionPreference = 'Stop'
$paquet = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dossier = Join-Path $env:LOCALAPPDATA 'Ptt-Makers'

Write-Host 'Installation de Ptt-Makers...'
New-Item -ItemType Directory -Force -Path $dossier | Out-Null
Copy-Item -Force (Join-Path $paquet 'application\index.html') $dossier
Copy-Item -Force (Join-Path $paquet 'icones\ptt-makers.ico') $dossier
$page = Join-Path $dossier 'index.html'
$adresse = ([System.Uri]$page).AbsoluteUri

# Ouvre l'atelier dans sa propre fenêtre (mode application) avec Edge ou Chrome.
$navigateurs = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$navigateur = $navigateurs | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$shell = New-Object -ComObject WScript.Shell
$emplacements = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('Programs')
)
foreach ($emplacement in $emplacements) {
  $raccourci = $shell.CreateShortcut((Join-Path $emplacement 'Ptt-Makers.lnk'))
  if ($navigateur) {
    $raccourci.TargetPath = $navigateur
    $raccourci.Arguments = "--app=`"$adresse`""
  } else {
    $raccourci.TargetPath = $page
  }
  $raccourci.WorkingDirectory = $dossier
  $raccourci.IconLocation = (Join-Path $dossier 'ptt-makers.ico') + ',0'
  $raccourci.Description = 'Ptt-Makers : atelier visuel de création logicielle'
  $raccourci.Save()
}

Write-Host ''
Write-Host 'C''est prêt ! Le raccourci Ptt-Makers est sur ton bureau et dans le menu Démarrer.'
Write-Host "Application installée dans : $dossier"
