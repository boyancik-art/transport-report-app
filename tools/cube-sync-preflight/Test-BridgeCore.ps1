. "$PSScriptRoot\Bridge.Core.ps1"
function Assert-Equal($Actual,$Expected) { if ($Actual -cne $Expected) { throw "Assertion failed: $Actual != $Expected" } }
Assert-Equal (Get-BridgeDate 46266) '2026-09-01'
Assert-Equal (Get-BridgeDate '03.09.2026') '2026-09-03'
Assert-Equal (Get-BridgeText ([double]198004777436562)) '198004777436562'
Assert-Equal (Get-BridgeNumber '1 234,56') ([decimal]1234.56)
$failed=$false; try { Get-BridgeNumber 'NaN' } catch { $failed=$true }; Assert-Equal $failed $true
$failed=$false; try { Get-BridgeText ([double]1980047774365620) } catch { $failed=$true }; Assert-Equal $failed $true
$failed=$false; try { Get-BridgeDate '31.02.2026' } catch { $failed=$true }; Assert-Equal $failed $true
$row=@{date='2026-09-01';route='R1';group='G';op='O';sale='S';addressId='A';customerId='C';employee='E';business='B'}
$summary=Get-BridgeSummary @($row,$row) '2026-09-01' '2026-09-03'
Assert-Equal $summary.rowsInPeriod 2
Assert-Equal $summary.dailyCounts.Count 3
Assert-Equal $summary.dailyCounts[1].rows 0
Assert-Equal $summary.candidateKeyCollisionGroups 1
Assert-Equal $summary.coverageConfirmed $false
$empty=Get-BridgeSummary @() '2026-08-01' '2026-09-03'
Assert-Equal $empty.dailyCounts.Count 34
Assert-Equal $empty.rowsTotal 0
Assert-Equal $empty.datesWithoutRows.Count 34
Assert-Equal $empty.candidateKeyCollisionGroups 0
Write-Host 'Core tests passed.'
