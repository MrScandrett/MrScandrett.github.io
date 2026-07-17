param(
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoDir = Join-Path $root "update-repo"
$snapshotsDir = Join-Path $repoDir "snapshots"
$changelogPath = Join-Path $repoDir "CHANGELOG.md"

if (!(Test-Path $repoDir)) {
    New-Item -ItemType Directory -Path $repoDir | Out-Null
}
if (!(Test-Path $snapshotsDir)) {
    New-Item -ItemType Directory -Path $snapshotsDir | Out-Null
}
if (!(Test-Path $changelogPath)) {
    "# Major Update Changelog`n" | Set-Content -Path $changelogPath -Encoding UTF8
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeTitle = ($Title.ToLower() -replace "[^a-z0-9]+", "_").Trim("_")
$snapshotName = "${timestamp}_${safeTitle}"
$zipPath = Join-Path $snapshotsDir "$snapshotName.zip"

$stagingDir = Join-Path $env:TEMP "thomas_snapshot_$snapshotName"
if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$items = Get-ChildItem -Path $root -Force
foreach ($item in $items) {
    if ($item.Name -eq "update-repo") { continue }
    Copy-Item -Path $item.FullName -Destination $stagingDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force
Remove-Item -Recurse -Force $stagingDir

$dateHeader = Get-Date -Format "yyyy-MM-dd"
$entry = "- $timestamp | $Title"
if ($Notes -ne "") {
    $entry = "$entry | $Notes"
}

$current = Get-Content -Path $changelogPath -Raw
if ($current -notmatch "## $dateHeader") {
    Add-Content -Path $changelogPath -Value "`n## $dateHeader"
}
Add-Content -Path $changelogPath -Value $entry

Write-Host "Snapshot created: $zipPath"
Write-Host "Snapshot id: $snapshotName"
