param(
    [Parameter(Mandatory = $true)]
    [string]$Snapshot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoDir = Join-Path $root "update-repo"
$snapshotsDir = Join-Path $repoDir "snapshots"
$zipPath = Join-Path $snapshotsDir "$Snapshot.zip"

if (!(Test-Path $zipPath)) {
    throw "Snapshot not found: $zipPath"
}

$extractDir = Join-Path $env:TEMP "thomas_restore_$Snapshot"
if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
}
New-Item -ItemType Directory -Path $extractDir | Out-Null

Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

# Remove current project files so rollback is complete.
$currentItems = Get-ChildItem -Path $root -Force
foreach ($item in $currentItems) {
    if ($item.Name -eq "update-repo") { continue }
    Remove-Item -Path $item.FullName -Recurse -Force
}

$snapshotItems = Get-ChildItem -Path $extractDir -Force
foreach ($item in $snapshotItems) {
    Copy-Item -Path $item.FullName -Destination $root -Recurse -Force
}

Remove-Item -Recurse -Force $extractDir
Write-Host "Rollback completed from snapshot: $Snapshot"
