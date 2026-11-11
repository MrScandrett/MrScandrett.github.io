param([switch]$CheckOnly, [switch]$PortableNode)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = $PSScriptRoot
$runtime = Join-Path $root 'runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
function Get-VerifiedArchive([string[]]$Urls, [string]$Destination, [string]$ExpectedHash) {
  if ((Test-Path $Destination) -and (Get-FileHash -Algorithm SHA256 $Destination).Hash.ToLowerInvariant() -eq $ExpectedHash.ToLowerInvariant()) { return }
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  foreach ($url in $Urls) {
    try {
      Write-Host "Downloading $url"
      if ($curl) { & $curl.Source --fail --silent --show-error --location --connect-timeout 15 --max-time 120 --output $Destination $url; if ($LASTEXITCODE -ne 0) { throw 'Download failed.' } }
      else { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $Destination -TimeoutSec 120 }
      $actual = (Get-FileHash -Algorithm SHA256 $Destination).Hash.ToLowerInvariant()
      if ($actual -eq $ExpectedHash.ToLowerInvariant()) { return }
      Write-Host "This mirror returned an unexpected file ($(Get-Item $Destination | Select-Object -ExpandProperty Length) bytes, SHA-256 $actual); it will not be executed."
    } catch { Write-Host ('Download attempt failed: ' + $_.Exception.Message) }
    if (Test-Path $Destination) { Remove-Item $Destination -Force }
  }
  throw 'No download source returned the verified archive. The file was not executed. Check the internet connection or ask IT to allow the publisher downloads.'
}
Write-Host 'This companion uses portable tools inside its own folder. No Git, npm install, admin setup, USB driver change, or firmware update is performed.'
if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { throw 'This automatic package targets Windows x64. On Windows ARM, ask IT to provide compatible Node.js and NBC/NXC, then use the repository companion.' }
$node = $null
$existing = Get-Command node.exe -ErrorAction SilentlyContinue
if ($existing -and !$PortableNode) {
  try { $major = [int](& $existing.Source -p 'process.versions.node.split(String.fromCharCode(46))[0]'); if ($major -ge 24) { $node = $existing.Source } } catch { }
}
$portable = Join-Path $runtime 'node\node.exe'
if (!$node -and (Test-Path $portable)) { $node = $portable }
if (!$node) {
  Write-Host 'Preparing portable Node.js 24 from nodejs.org (SHA-256 verified).'
  $sums = (Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -TimeoutSec 60).Content
  $match = [regex]::Match($sums, '(?m)^([a-f0-9]{64})\s+(node-(v24\.\d+\.\d+)-win-x64\.zip)\s*$')
  if (!$match.Success) { throw 'Could not find the official Windows x64 Node.js 24 checksum. No runtime was installed.' }
  $archive = Join-Path $runtime 'node-download.zip'
  Get-VerifiedArchive ('https://nodejs.org/dist/' + $match.Groups[3].Value + '/' + $match.Groups[2].Value) $archive $match.Groups[1].Value
  $unpack = Join-Path $runtime 'node-unpack'
  if (Test-Path $unpack) { Remove-Item $unpack -Recurse -Force }
  Expand-Archive -LiteralPath $archive -DestinationPath $unpack
  $exe = Get-ChildItem -LiteralPath $unpack -Filter node.exe -File -Recurse | Select-Object -First 1
  if (!$exe) { throw 'Verified Node.js archive did not contain node.exe.' }
  $nodeFolder = Join-Path $runtime 'node'
  if (Test-Path $nodeFolder) { Remove-Item $nodeFolder -Recurse -Force }
  Move-Item -LiteralPath $exe.Directory.FullName -Destination $nodeFolder
  Remove-Item $unpack -Recurse -Force
  $node = Join-Path $nodeFolder 'node.exe'
}
$nbc = $env:NXT_NBC
if (!$nbc) {
  $nbc = Join-Path $runtime 'nbc\nbc.exe'
  $expectedExe = '91fbaf196da52dc360ddf6a7d5cc2bc6a85b65a7512a9b38b3e313c990992a54'
  if (!(Test-Path $nbc) -or (Get-FileHash -Algorithm SHA256 $nbc).Hash.ToLowerInvariant() -ne $expectedExe) {
    Write-Host 'Preparing the official NBC/NXC 1.2.1 r4 Windows compiler (SHA-256 verified).'
    $archive = Join-Path $runtime 'nbc-download.zip'
    Get-VerifiedArchive @('https://downloads.sourceforge.net/project/bricxcc/NBC_NXC/NBC%20release%201.2.1%20r4/nbc-1.2.1.r4.zip', 'https://netix.dl.sourceforge.net/project/bricxcc/NBC_NXC/NBC%20release%201.2.1%20r4/nbc-1.2.1.r4.zip', 'https://phoenixnap.dl.sourceforge.net/project/bricxcc/NBC_NXC/NBC%20release%201.2.1%20r4/nbc-1.2.1.r4.zip') $archive '963f50d431308b64e36f4251d26fdf43690aa8a436a2d2a5a2db6325af985c51'
    $folder = Join-Path $runtime 'nbc'
    if (Test-Path $folder) { Remove-Item $folder -Recurse -Force }
    Expand-Archive -LiteralPath $archive -DestinationPath $folder
    if (!(Test-Path $nbc) -or (Get-FileHash -Algorithm SHA256 $nbc).Hash.ToLowerInvariant() -ne $expectedExe) { throw 'NBC executable checksum mismatch. It was not executed.' }
  }
}
if (!(Test-Path -LiteralPath $nbc)) { throw 'NXT_NBC does not point to an existing compiler executable.' }
$env:NXT_NBC = (Resolve-Path -LiteralPath $nbc).Path
$bridge = Join-Path $root 'nxt-compiler.mjs'
if (!(Test-Path $bridge)) { throw 'nxt-compiler.mjs is missing. Extract the entire Windows companion ZIP first.' }
Write-Host 'Testing the compiler with a tone program and all 12 starter projects. No NXT connection is needed.'
& $node $bridge --self-test
if ($LASTEXITCODE -ne 0) { throw 'Compiler self-test failed. The companion will not claim to be ready. Copy the diagnostics above for troubleshooting.' }
if ($CheckOnly) { Write-Host 'Windows companion checks passed.'; exit 0 }
Write-Host ''
Write-Host 'READY. Leave this window open. Return to NXT Robot Lab and press Check compiler, then Compile .rxe locally.' -ForegroundColor Green
Write-Host 'Close this window to stop the companion. Nothing starts motors automatically.'
& $node $bridge
if ($LASTEXITCODE -ne 0) { throw 'The compiler companion stopped with an error.' }
