# Gör ett MSIX-paket av G-vis för Microsoft Store. Körs i GitHub-bygget på Windows, efter Tauri-bygget.
# Paketet behöver inte signeras: Microsoft signerar det när det godkänns i Store.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$conf = Get-Content "$root\app\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$ver  = "$($conf.version).0"

$exe = Get-ChildItem "$root\app\src-tauri\target" -Recurse -Filter 'g-vis.exe' |
  Where-Object { $_.FullName -match '\\release\\g-vis\.exe$' } | Select-Object -First 1
if (-not $exe) { throw 'Hittade inte g-vis.exe efter bygget.' }

$lay = "$root\app\msix\layout"
if (Test-Path $lay) { Remove-Item $lay -Recurse -Force }
New-Item -ItemType Directory "$lay\Assets" | Out-Null
Copy-Item $exe.FullName "$lay\g-vis.exe"
$ic = "$root\app\src-tauri\icons"
Copy-Item "$ic\StoreLogo.png", "$ic\Square150x150Logo.png", "$ic\Square44x44Logo.png" "$lay\Assets\"
(Get-Content "$PSScriptRoot\AppxManifest.xml" -Raw).Replace('__VERSION__', $ver) |
  Set-Content "$lay\AppxManifest.xml" -Encoding utf8

$mk = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter 'makeappx.exe' |
  Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $mk) { throw 'Hittade inte makeappx.exe (Windows SDK).' }

$outDir = "$root\app\msix\out"
New-Item -ItemType Directory $outDir -Force | Out-Null
$out = "$outDir\G-vis_$($conf.version)_x64.msix"
& $mk.FullName pack /d $lay /p $out /o
if ($LASTEXITCODE -ne 0) { throw 'makeappx misslyckades.' }
Write-Host "MSIX klart: $out (version $ver)"
