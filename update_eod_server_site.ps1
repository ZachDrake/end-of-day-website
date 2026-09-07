param(
    [string]$Path = ".\index.html"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
    throw "Could not find $Path. Run this from the EOD website folder or pass -Path to index.html."
}

$fullPath = (Resolve-Path -LiteralPath $Path).Path
$backupPath = "$fullPath.bak-2026-09-07"
Copy-Item -LiteralPath $fullPath -Destination $backupPath -Force

$html = Get-Content -LiteralPath $fullPath -Raw
$original = $html

$replacements = @(
    @(
        '<span>US EAST</span>',
        '<span>CHICAGO, IL</span>'
    ),
    @(
        'A WARDOGS home server for players who want teamwork, good fights, active admins, and a community worth coming back to.',
        'A 100-player WARDOGS community server hosted in Chicago by BisectHosting, built for teamwork, good fights, active admins, and familiar names.'
    ),
    @(
        '<div class="hero-side-note"><span>01</span><strong>COMMUNITY FIRST.</strong><p>THE SERVER IS COMING.</p></div>',
        '<div class="hero-side-note"><span>01</span><strong>COMMUNITY FIRST.</strong><p>100 PLAYERS. CHICAGO HOSTED.</p></div>'
    ),
    @(
        '<div><span class="pulse"></span><span>PRE-LAUNCH</span></div>',
        '<div><span class="pulse"></span><span>SERVER SECURED</span></div>'
    ),
    @(
        '<strong>COMING WITH EARLY ACCESS</strong>',
        '<strong>100 PLAYERS • CHICAGO • BISECTHOSTING</strong>'
    ),
    @(
        'WARDOGS launches September 10. End of Day doesn''t have to. Join the Discord now so launch day starts with familiar names instead of a server full of strangers.',
        'WARDOGS launches September 10, and the End of Day server is already secured: 100 player slots, hosted by BisectHosting in Chicago. Join the Discord now so launch day starts with familiar names instead of a server full of strangers.'
    ),
    @(
        'Get into the community before the server opens.',
        'Get into the community before launch day.'
    ),
    @(
        'Be one of the people everybody recognizes when the server opens.',
        'Be one of the people everybody recognizes when the server goes live.'
    ),
    @(
        '<div class="intel-status"><span class="pulse"></span>PRE-LAUNCH</div>',
        '<div class="intel-status"><span class="pulse"></span>SERVER SECURED</div>'
    ),
    @(
        '<h3>END OF DAY | COMMUNITY SERVER</h3>',
        '<h3>END OF DAY | US | COMMUNITY</h3>'
    ),
    @(
        '<div><small>REGION</small><strong>US EAST</strong></div>',
        '<div><small>LOCATION</small><strong>CHICAGO, IL</strong></div>'
    ),
    @(
        '<div><small>LANGUAGE</small><strong>ENGLISH</strong></div>',
        '<div><small>CAPACITY</small><strong>100 PLAYERS</strong></div>'
    ),
    @(
        '<div><small>ADMIN TEAM</small><strong>ACTIVE</strong></div>',
        '<div><small>HOST</small><strong>BISECTHOSTING</strong></div>'
    ),
    @(
        '<strong>SERVER GOES LIVE WITH EARLY ACCESS</strong>',
        '<strong>100-PLAYER SERVER READY FOR EARLY ACCESS</strong>'
    ),
    @(
        'Live player count, current map, queue, and join information can slot into this panel once the dedicated-server interface is confirmed.',
        'Hosted in Chicago by BisectHosting. Connection details, player count, current map, and queue information will be added as WARDOGS server tooling allows.'
    ),
    @(
        '<button disabled class="button button-disabled">CONNECT — SOON</button>',
        '<button disabled class="button button-disabled">CONNECT — SEPT 10</button>'
    ),
    @(
        'The community is forming now. The game server itself comes next.',
        'The community is forming now. The 100-player Chicago server is secured and ready for launch.'
    ),
    @(
        'Not yet. The End of Day server is coming online with WARDOGS Early Access.',
        'Not yet. The End of Day 100-player server is secured in Chicago and will open with WARDOGS Early Access.'
    )
)

$changed = 0
foreach ($pair in $replacements) {
    $old = $pair[0]
    $new = $pair[1]
    if ($html.Contains($old)) {
        $html = $html.Replace($old, $new)
        $changed++
        Write-Host "Updated: $old"
    }
}

# Hard requirement from the site update: no US EAST references anywhere.
$html = $html -replace '(?i)US\s+EAST', 'CHICAGO, IL'

Set-Content -LiteralPath $fullPath -Value $html -Encoding utf8

$remaining = Select-String -LiteralPath $fullPath -Pattern 'US\s+EAST' -CaseSensitive:$false
if ($remaining) {
    Write-Warning "US EAST still appears in the file. Review these matches:"
    $remaining | ForEach-Object { Write-Warning $_.Line }
} else {
    Write-Host "Verified: no US EAST references remain."
}

if ($html -eq $original) {
    Write-Warning "No known copy blocks matched. The backup was still created at: $backupPath"
} else {
    Write-Host "Done. $changed targeted copy blocks updated."
    Write-Host "Backup: $backupPath"
    Write-Host "Updated: $fullPath"
}
