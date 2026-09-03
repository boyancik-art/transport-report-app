. "$PSScriptRoot\Refresh.Core.ps1"
function Assert-Refresh($Actual,$Expected) { if($Actual -ne $Expected) { throw 'Refresh assertion failed' } }
$start=[datetime]::UtcNow.AddSeconds(-10)
$before=$start.AddDays(-1).ToString('o')
$native=[pscustomobject]@{Refreshing=$false;RefreshDate=[datetime]::UtcNow}
$query=[pscustomobject]@{Refreshing=$false}
$state=Get-TargetRefreshState $native @($query)
Assert-Refresh (Test-TargetRefreshCompleted $state $before $start) $true
$query.Refreshing=$true
Assert-Refresh (Test-TargetRefreshCompleted (Get-TargetRefreshState $native @($query)) $before $start) $false
$query.Refreshing=$false; $native.Refreshing=$true
Assert-Refresh (Test-TargetRefreshCompleted (Get-TargetRefreshState $native @($query)) $before $start) $false
$native.Refreshing=$false; $native.RefreshDate=[datetime]::Parse($before)
Assert-Refresh (Test-TargetRefreshCompleted (Get-TargetRefreshState $native @($query)) $before $start) $false
$native.RefreshDate=[datetime]::UtcNow
$same=$native.RefreshDate.ToUniversalTime().ToString('o')
Assert-Refresh (Test-TargetRefreshCompleted (Get-TargetRefreshState $native @()) $same $start) $false
$broken=[pscustomobject]@{}
Assert-Refresh (Test-TargetRefreshCompleted (Get-TargetRefreshState $broken @()) $before $start) $false
Write-Host 'Target refresh tests passed: async busy, stale, unchanged and unreadable states fail closed.'
