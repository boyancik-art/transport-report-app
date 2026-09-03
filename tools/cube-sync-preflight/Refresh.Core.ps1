Set-StrictMode -Version Latest
function Get-TargetRefreshState($Native, $Queries) {
    $busy=$false; $unknown=$false; $stamp=$null; $queryStates=@()
    try { $busy=[bool]$Native.Refreshing } catch { $unknown=$true }
    try { $stamp=([datetime]$Native.RefreshDate).ToUniversalTime().ToString('o') } catch {}
    foreach($query in $Queries) {
        try { $qBusy=[bool]$query.Refreshing; $busy=$busy -or $qBusy; $queryStates += $qBusy }
        catch { $unknown=$true; $queryStates += 'unavailable' }
    }
    return [ordered]@{refreshing=$busy;stateUnavailable=$unknown;refreshDate=$stamp;linkedQueryStates=$queryStates}
}
function Test-TargetRefreshCompleted($State, $Before, [datetime]$Started) {
    if($State.refreshing -or $State.stateUnavailable -or -not $State.refreshDate) { return $false }
    $after=[datetime]::Parse($State.refreshDate).ToUniversalTime()
    if($after -lt $Started.ToUniversalTime().AddSeconds(-2)) { return $false }
    if($Before -and $after -le [datetime]::Parse($Before).ToUniversalTime()) { return $false }
    return $true
}
