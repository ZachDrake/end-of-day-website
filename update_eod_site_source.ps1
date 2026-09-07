param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"

Write-Host "EOD website source update" -ForegroundColor Cyan
Write-Host "Root: $rootPath"
Write-Host ""

$replacements = @{
    "src\config\site.ts" = @(
        @{
            Old = 'region: "US EAST",'
            New = 'region: "CHICAGO, IL",'
        },
        @{
            Old = 'serverStateDetail: "SERVER COMING WITH EARLY ACCESS",'
            New = 'serverStateDetail: "100 PLAYER SERVER • CHICAGO • BISECTHOSTING",'
        },
        @{
            Old = 'title: "WARDOGS Community & US East Server | End of Day",'
            New = 'title: "WARDOGS Community Server | End of Day",'
        },
        @{
            Old = 'description: "Join End of Day, a US East WARDOGS community with its own server at launch. Teamwork, familiar names, active admins, and low drama."'
            New = 'description: "Join End of Day, a WARDOGS community with a 100-player server hosted in Chicago by BisectHosting. Teamwork, familiar names, active admins, and low drama."'
        }
    )

    "src\layouts\BaseLayout.astro" = @(
        @{
            Old = '"A US East WARDOGS community built around familiar names, teamwork, active admins, and low drama."'
            New = '"A WARDOGS community with a 100-player Chicago server, built around familiar names, teamwork, active admins, and low drama."'
        }
    )

    "src\pages\index.astro" = @(
        @{
            Old = '<strong>COMING WITH EARLY ACCESS</strong>'
            New = '<strong>100 PLAYER SERVER • CHICAGO</strong>'
        }
    )

    "src\pages\server.astro" = @(
        @{
            Old = 'title="End of Day WARDOGS Server | US EAST Community Server"'
            New = 'title="End of Day WARDOGS Server | Chicago Community Server"'
        },
        @{
            Old = 'description="End of Day is a US East WARDOGS community server coming with Early Access. Teamwork-focused, community-run, and backed by active admins."'
            New = 'description="End of Day is a 100-player WARDOGS community server hosted in Chicago by BisectHosting. Teamwork-focused, community-run, and backed by active admins."'
        },
        @{
            Old = '<strong>COMING WITH EARLY ACCESS</strong>'
            New = '<strong>SERVER SECURED</strong>'
        },
        @{
            Old = '<strong>US EAST</strong>'
            New = '<strong>CHICAGO, IL</strong>'
        },
        @{
            Old = 'Primary community region and intended server location.'
            New = 'Centrally hosted in Chicago for EOD players across the United States.'
        }
    )

    "src\pages\wardogs-community.astro" = @(
        @{
            Old = 'title="WARDOGS Community & US East Server | End of Day"'
            New = 'title="WARDOGS Community Server | End of Day"'
        },
        @{
            Old = 'description="Join End of Day, a US East WARDOGS community with its own community server at launch. Teamwork, familiar names, active admins, and low drama."'
            New = 'description="Join End of Day, a WARDOGS community with a 100-player server hosted in Chicago by BisectHosting. Teamwork, familiar names, active admins, and low drama."'
        },
        @{
            Old = 'End of Day is a US East WARDOGS community for players who want'
            New = 'End of Day is a WARDOGS community with a 100-player Chicago server for players who want'
        }
    )
}

$changedFiles = @()

foreach ($relativePath in $replacements.Keys) {
    $path = Join-Path $rootPath $relativePath

    if (-not (Test-Path $path)) {
        Write-Warning "File not found: $relativePath"
        continue
    }

    $content = Get-Content $path -Raw -Encoding UTF8
    $original = $content
    $applied = 0

    foreach ($replacement in $replacements[$relativePath]) {
        if ($content.Contains($replacement.Old)) {
            $content = $content.Replace($replacement.Old, $replacement.New)
            $applied++
        }
        else {
            Write-Warning "Expected text not found in $relativePath : $($replacement.Old)"
        }
    }

    # Catch any remaining plain-text US EAST / US East references in known source files.
    $content = $content.Replace("US EAST", "CHICAGO, IL")
    $content = $content.Replace("US East", "Chicago")

    if ($content -ne $original) {
        $backup = "$path.bak-$timestamp"
        Copy-Item $path $backup
        Set-Content $path $content -Encoding UTF8 -NoNewline
        $changedFiles += $relativePath
        Write-Host "UPDATED  $relativePath ($applied targeted replacements)" -ForegroundColor Green
        Write-Host "BACKUP   $backup" -ForegroundColor DarkGray
    }
    else {
        Write-Host "NO CHANGE $relativePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Checking source for stale wording..." -ForegroundColor Cyan

$patterns = @(
    "US EAST",
    "US East",
    "COMING WITH EARLY ACCESS",
    "SERVER COMING WITH EARLY ACCESS",
    "upcoming server"
)

$stale = Get-ChildItem (Join-Path $rootPath "src") -Recurse -File |
    Where-Object { $_.Name -notlike "*.bak-*" } |
    Select-String -Pattern $patterns -SimpleMatch

if ($stale) {
    Write-Host ""
    Write-Warning "Some stale wording still remains:"
    $stale | ForEach-Object {
        Write-Host "$($_.Path):$($_.LineNumber): $($_.Line.Trim())"
    }
}
else {
    Write-Host "No stale US East / pre-launch wording found in src." -ForegroundColor Green
}

Write-Host ""
Write-Host "Changed source files: $($changedFiles.Count)" -ForegroundColor Cyan
$changedFiles | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run build"
Write-Host '  Get-ChildItem .\dist -Recurse -File | Where-Object { $_.Name -notlike "*.bak-*" } | Select-String -Pattern "US EAST|US East"'
Write-Host ""
Write-Host "Also check for placeholder URLs:" -ForegroundColor Cyan
Write-Host '  Get-ChildItem . -Recurse -File | Where-Object { $_.FullName -notmatch "\\node_modules\\|\\dist\\" } | Select-String -Pattern "example.com"'
