#!/bin/sh
# Installe Ptt-Makers pour l'utilisateur courant et pose un raccourci sur le bureau.
set -e
paquet=$(cd "$(dirname "$0")" && pwd)
dossier="$HOME/.local/share/ptt-makers"
mkdir -p "$dossier" "$HOME/.local/share/applications"
cp "$paquet/application/index.html" "$paquet/icones/ptt-makers.png" "$dossier/"

# Ouvre l'atelier dans sa propre fenêtre avec Chromium, Chrome ou Edge, sinon avec le navigateur par défaut.
commande="xdg-open \"file://$dossier/index.html\""
for navigateur in chromium chromium-browser google-chrome google-chrome-stable microsoft-edge brave-browser; do
  if command -v "$navigateur" >/dev/null 2>&1; then
    commande="$navigateur --app=\"file://$dossier/index.html\""
    break
  fi
done

lanceur="$HOME/.local/share/applications/ptt-makers.desktop"
cat > "$lanceur" <<FIN
[Desktop Entry]
Type=Application
Name=Ptt-Makers
Comment=Atelier visuel de création logicielle
Exec=$commande
Icon=$dossier/ptt-makers.png
Terminal=false
Categories=Development;Education;
FIN
chmod +x "$lanceur"

bureau=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")
if [ -d "$bureau" ]; then
  cp "$lanceur" "$bureau/ptt-makers.desktop"
  chmod +x "$bureau/ptt-makers.desktop"
  gio set "$bureau/ptt-makers.desktop" metadata::trusted true 2>/dev/null || true
fi
echo "C'est prêt ! Ptt-Makers est sur ton bureau et dans le menu des applications."
