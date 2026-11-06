$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$required = @{
    'README.md' = @('Phase 0')
    'docs/fitness_rpg_product_spec_v1.md' = @('## Product principles', '## Sources and limitations')
    'docs/README.md' = @('primary specification')
    'docs/ARCHITECTURE.md' = @('Repository inspection', 'Intended organization', 'Security and operations')
    'docs/DECISIONS.md' = @('ADR log', 'Reversible proposed rules', 'Open questions and gates')
    'docs/DATA_MODEL.md' = @('Minimum entities', 'Constraints and indexes', 'Transaction boundaries')
    'docs/WORKOUT_ENGINE.md' = @('Generation contract', 'Guided progression', 'Offline synchronization')
    'docs/RANKING_RULES.md' = @('XP ledger', 'Weekly overall rating', 'Duels, challenges and seasons')
    'docs/ACCEPTANCE_TESTS.md' = @('Test layers', 'Traceable acceptance scenarios', 'Evidence and phase exit')
    'docs/PHASE_PLAN.md' = @('Numbered changes', 'Seed strategy')
    'docs/PHASE0_REPORT.md' = @('Completed work', 'Verification', 'Remaining work')
    'docs/LOCAL_SETUP.md' = @('First run', 'Verification', 'Migrations, seeds and recovery')
    'docs/SECURITY.md' = @('Threats and implemented controls', 'Production deployment gate', 'Known limits')
    'docs/IPHONE_VALIDATION.md' = @('not performed', 'Real iPhone validation checklist')
    'docs/PHASE1_REPORT.md' = @('Completed work', 'Verification', 'Problems found and resolved', 'Remaining work')
    'docs/PHASE2_DATA_CONTRACT.md' = @('Phase 2 data contract', 'row-level security')
    'docs/PHASE2_REPORT.md' = @('Completed work', 'Verification', 'Problems found and resolved', 'Repository submissions', 'Remaining work')
}
$linkCount = 0
$sourceHash = (Get-FileHash -LiteralPath (Join-Path $projectRoot 'docs/fitness_rpg_product_spec_v1.md') -Algorithm SHA256).Hash
if ($sourceHash -ne 'EB58FA542FE0E70131A0FABBBA5661DDC6F73634BD5C76B653233C518084AA3D') { throw 'Primary specification fingerprint changed; review before proceeding.' }
foreach ($relativePath in ($required.Keys | Sort-Object)) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "Missing file: $relativePath" }
    $content = Get-Content -LiteralPath $fullPath -Raw
    foreach ($section in $required[$relativePath]) {
        if (-not $content.Contains($section)) { throw "Missing section '$section' in $relativePath" }
    }
    foreach ($match in [regex]::Matches($content, '\[[^\]]+\]\(([^)]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $target.StartsWith('#')) { continue }
        $localPath = ($target -split '#', 2)[0]
        $resolvedPath = Join-Path (Split-Path -Parent $fullPath) $localPath
        if (-not (Test-Path -LiteralPath $resolvedPath)) { throw "Broken link '$target' in $relativePath" }
        $linkCount++
    }
}
Write-Output "PASS: $($required.Count) required documents; required sections present; $linkCount local links resolve."
Write-Output 'Scope: documentation structure only. No application behavior was tested.'
