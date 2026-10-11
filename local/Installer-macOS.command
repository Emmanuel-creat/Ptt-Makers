#!/bin/sh
# Installe Ptt-Makers dans le dossier Applications de l'utilisateur et pose un raccourci sur le bureau.
set -e
paquet=$(cd "$(dirname "$0")" && pwd)
app="$HOME/Applications/Ptt-Makers.app"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$paquet/application/index.html" "$app/Contents/Resources/index.html"
cp "$paquet/icones/ptt-makers.icns" "$app/Contents/Resources/ptt-makers.icns"

cat > "$app/Contents/Info.plist" <<FIN
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Ptt-Makers</string>
  <key>CFBundleDisplayName</key><string>Ptt-Makers</string>
  <key>CFBundleIdentifier</key><string>io.github.emmanuel-creat.ptt-makers</string>
  <key>CFBundleExecutable</key><string>ptt-makers</string>
  <key>CFBundleIconFile</key><string>ptt-makers</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>VERSION</string>
</dict>
</plist>
FIN

cat > "$app/Contents/MacOS/ptt-makers" <<'FIN'
#!/bin/sh
# Ouvre l'atelier dans sa propre fenêtre avec Chrome ou Edge, sinon avec le navigateur par défaut.
page="file://$(cd "$(dirname "$0")/../Resources" && pwd)/index.html"
for navigateur in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium"; do
  if [ -d "/Applications/$navigateur.app" ]; then
    exec open -na "$navigateur" --args --app="$page"
  fi
done
exec open "$page"
FIN
chmod +x "$app/Contents/MacOS/ptt-makers"
ln -sfn "$app" "$HOME/Desktop/Ptt-Makers"
echo "C'est prêt ! Ptt-Makers est sur ton bureau et dans ton dossier Applications."
