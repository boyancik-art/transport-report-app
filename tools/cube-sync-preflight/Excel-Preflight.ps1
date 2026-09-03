param([Parameter(Mandatory=$true)][string]$RunDirectory)
. "$PSScriptRoot\Bridge.Core.ps1"
$config = Get-Content -LiteralPath "$PSScriptRoot\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$report = [ordered]@{version=$config.version;status='running';stage='open';startedAt=[datetime]::UtcNow.ToString('o');uploadedRows=0;productionWrites=0;refreshEvidence=@();warnings=@()}
$excel=$null; $book=$null; $ownsExcel=$false; $exitCode=1
function Save-Report { Write-BridgeJson (Join-Path $RunDirectory 'report.json') $report }
function Set-Stage([string]$Value) { $report.stage=$Value; Save-Report }
function Release-Com($Value) {
    if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
    }
}
function Get-RefreshEvidence($Workbook) {
    $evidence = @()
    foreach ($sheet in $Workbook.Worksheets) {
        foreach ($query in $sheet.QueryTables) {
            try {
                $evidence += [ordered]@{kind='QueryTable';connection=[string]$query.WorkbookConnection.Name;refreshDate=([datetime]$query.RefreshDate).ToUniversalTime().ToString('o')}
            } catch { $evidence += [ordered]@{kind='QueryTable';connection='unresolved';refreshDate=$null} }
            finally { Release-Com $query }
        }
        Release-Com $sheet
    }
    foreach ($cache in $Workbook.PivotCaches()) {
        try {
            if ($cache.SourceType -eq 2) {
                $evidence += [ordered]@{kind='PivotCache';connection=[string]$cache.WorkbookConnection.Name;refreshDate=([datetime]$cache.RefreshDate).ToUniversalTime().ToString('o')}
            }
        } catch { $evidence += [ordered]@{kind='PivotCache';connection='unresolved';refreshDate=$null} }
        finally { Release-Com $cache }
    }
    return $evidence
}
try {
    if (-not (Test-Path -LiteralPath $config.workbookPath -PathType Leaf)) { throw 'Workbook not available' }
    # Never attach to an existing Excel session or close the user's Excel.
    $before = @(Get-Process EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class BridgeWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
}
'@
    $excel = New-Object -ComObject Excel.Application
    [uint32]$excelProcessId=0
    [void][BridgeWindow]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd,[ref]$excelProcessId)
    if (-not $excelProcessId -or $before -contains [int]$excelProcessId) { throw 'Excel instance ownership not proven' }
    $ownsExcel=$true
    $process=Get-Process -Id $excelProcessId
    Write-BridgeJson (Join-Path $RunDirectory 'excel-owner.json') @{pid=$excelProcessId;startedAt=$process.StartTime.ToUniversalTime().ToString('o')}
    $excel.Visible=$false; $excel.DisplayAlerts=$false; $excel.EnableEvents=$false
    $excel.AutomationSecurity=3 # msoAutomationSecurityForceDisable; do not run workbook macros.
    $excel.AskToUpdateLinks=$false
    # UpdateLinks=0, ReadOnly=true. Never save changes back to the user's workbook.
    $book=$excel.Workbooks.Open($config.workbookPath,0,$true)
    if ($book.Date1904) { throw '1904 date system requires explicit mapping' }
    $report.connectionInventory=@()
    foreach ($connection in $book.Connections) {
        $refreshAll=$null
        try { $refreshAll=[bool]$connection.RefreshWithRefreshAll } catch {}
        $report.connectionInventory += [ordered]@{name=[string]$connection.Name;type=[int]$connection.Type;refreshWithRefreshAll=$refreshAll}
        Release-Com $connection
    }
    if ($report.connectionInventory.Count -eq 0) { throw 'No workbook connections: cannot verify Cube refresh' }
    $report.evidenceBefore=@(Get-RefreshEvidence $book)
    Set-Stage 'refresh'
    $refreshStart=[datetime]::UtcNow
    $report.refreshStartedAt=$refreshStart.ToString('o'); Save-Report
    $book.RefreshAll()
    # This call blocks on pending OLEDB/OLAP queries. Parent watchdog bounds COM hangs.
    $excel.CalculateUntilAsyncQueriesDone()
    $stable=0; $unknown=@()
    while ($stable -lt 3) {
        $busy=($excel.CalculationState -ne 0)
        foreach ($connection in $book.Connections) {
            try {
                if ($connection.Type -eq 1) { if ($connection.OLEDBConnection.Refreshing) { $busy=$true } }
                elseif ($connection.Type -eq 2) { if ($connection.ODBCConnection.Refreshing) { $busy=$true } }
                else { $unknown += [string]$connection.Name }
            } catch { $unknown += [string]$connection.Name }
            finally { Release-Com $connection }
        }
        foreach ($sheet in $book.Worksheets) {
            foreach ($query in $sheet.QueryTables) {
                if ($query.Refreshing) { $busy=$true }
                Release-Com $query
            }
            Release-Com $sheet
        }
        if ($busy) { $stable=0 } else { $stable++ }
        Start-Sleep -Seconds 1
    }
    $excel.CalculateUntilAsyncQueriesDone()
    if ($excel.CalculationState -ne 0) { throw 'Calculation did not settle' }
    $report.refreshEvidence=@(Get-RefreshEvidence $book)
    $report.refreshFinishedAt=[datetime]::UtcNow.ToString('o')
    $report.unobservableConnections=@($unknown | Sort-Object -Unique)
    $notProven=@()
    foreach ($connection in $report.connectionInventory) {
        $matches=@($report.refreshEvidence | Where-Object {
            $_.connection -eq $connection.name -and $_.refreshDate -and
            [datetime]::Parse($_.refreshDate).ToUniversalTime() -ge $refreshStart.AddSeconds(-2)
        })
        if (-not $connection.refreshWithRefreshAll -or $matches.Count -eq 0) { $notProven += $connection.name }
    }
    $report.connectionsWithoutRefreshProof=$notProven
    $report.refreshConfirmed=($notProven.Count -eq 0 -and $report.unobservableConnections.Count -eq 0)
    Set-Stage 'read_source'
    # Select only a sheet with the exact import schema, never an arbitrary first sheet.
    $candidates=@()
    foreach ($sheet in $book.Worksheets) {
        $used=$sheet.UsedRange
        $columnCount=[int]$used.Columns.Count
        if ($columnCount -gt 512) { Release-Com $used; Release-Com $sheet; continue }
        $firstRow=[int]$used.Row; $firstColumn=[int]$used.Column
        $lastHeader=[math]::Min($firstRow+29,$firstRow+[int]$used.Rows.Count-1)
        for($hr=$firstRow;$hr -le $lastHeader;$hr++) {
            $headerRange=$sheet.Range($sheet.Cells.Item($hr,$firstColumn),$sheet.Cells.Item($hr,$firstColumn+$columnCount-1))
            $headers=$headerRange.Value2; Release-Com $headerRange
            $map=@{}
            for($c=1;$c -le $columnCount;$c++) {
                $value=$(if($columnCount -eq 1){$headers}else{$headers[1,$c]})
                $name=([string]$value).Trim()
                if($name) { if($map.ContainsKey($name)){$map[$name]=-1}else{$map[$name]=$c} }
            }
            $missing=@($script:Columns.Values | Where-Object { -not $map.ContainsKey($_) -or $map[$_] -eq -1 })
            if($missing.Count -eq 0) {
                $candidates += @{sheet=[string]$sheet.Name;headerRow=$hr;firstColumn=$firstColumn;columns=$columnCount;lastRow=($firstRow+[int]$used.Rows.Count-1);map=$map}
                break
            }
        }
        Release-Com $used; Release-Com $sheet
    }
    $preferred=@($candidates | Where-Object { $_.sheet -eq $config.preferredSheet })
    if($preferred.Count -eq 1) { $selection=$preferred[0] }
    elseif($candidates.Count -eq 1) { $selection=$candidates[0] }
    else { $report.candidateSheets=@($candidates | ForEach-Object {$_.sheet}); throw 'No unambiguous sheet with all import headers' }
    $report.sheet=$selection.sheet; $report.headers=@($selection.map.Keys | Sort-Object)
    $rowCount=$selection.lastRow-$selection.headerRow
    if($rowCount -lt 1 -or $rowCount -gt $config.maxRows) { throw 'Row count outside safe range' }
    $sheet=$book.Worksheets.Item($selection.sheet)
    $range=$sheet.Range($sheet.Cells.Item($selection.headerRow+1,$selection.firstColumn),$sheet.Cells.Item($selection.lastRow,$selection.firstColumn+$selection.columns-1))
    $values=$range.Value2; Release-Com $range; Release-Com $sheet
    $rows=New-Object 'Collections.Generic.List[object]'
    $invalidRows=New-Object 'Collections.Generic.List[int]'
    $numeric=@('bottles','places','weight','amount','pallets')
    for($r=1;$r -le $rowCount;$r++) {
        $hasData=$false
        foreach($field in $script:Columns.Keys) {
            $columnName=$script:Columns[$field]
            $columnIndex=$selection.map[$columnName]
            if(-not [string]::IsNullOrWhiteSpace([string]$values[$r,$columnIndex])){$hasData=$true;break}
        }
        if(-not $hasData) { continue }
        try {
            $row=[ordered]@{}; $raw=[ordered]@{}
            foreach($field in $script:Columns.Keys) {
                $header=$script:Columns[$field]; $columnIndex=$selection.map[$header]
                $value=$values[$r,$columnIndex]
                if($value -is [Runtime.InteropServices.ErrorWrapper] -or ($value -is [int] -and $value -lt -2146820000)) { throw 'Excel error cell' }
                if($field -eq 'date') { $row[$field]=Get-BridgeDate $value }
                elseif($numeric -contains $field) { $row[$field]=Get-BridgeNumber $value }
                else { $row[$field]=Get-BridgeText $value }
                $raw[$header]=$value
            }
            if(-not $row.route -or -not $row.addressId -or -not $row.customerId) { throw 'Required identity field empty' }
            $row.raw=$raw; $rows.Add($row)
        } catch { $invalidRows.Add($selection.headerRow+$r) }
    }
    $report.invalidRowCount=$invalidRows.Count
    $report.invalidRowNumbers=@($invalidRows | Select-Object -First 50)
    $report.source=Get-BridgeSummary $rows.ToArray() $config.periodFrom $config.periodTo
    if($invalidRows.Count -gt 0 -or $rows.Count -eq 0) { throw 'Source validation failed; no upload allowed' }
    Set-Stage 'payload_preparation'
    $periodRows=@($rows | Where-Object {$_.date -ge $config.periodFrom -and $_.date -le $config.periodTo})
    $payload=[ordered]@{schema_version=1;mode='PREFLIGHT_ONLY';start_date=$config.periodFrom;end_date=$config.periodTo;file_name='База.xlsx';rows=$periodRows}
    # Do not send to the current destructive endpoint. Payload remains DPAPI-encrypted on this PC.
    Add-Type -AssemblyName System.Security
    $json=ConvertTo-Json -InputObject $payload -Depth 20 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($json)
    $protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory 'payload.dpapi'),$protected)
    $hasher=[Security.Cryptography.SHA256]::Create()
    try { $report.payloadSha256=([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally {$hasher.Dispose()}
    [Array]::Clear($bytes,0,$bytes.Length); $json=$null
    $report.preparedRows=$periodRows.Count
    $report.status='needs_source_confirmation'
    $report.warnings += 'No writes or upload. Completeness and a stable unique source key must be approved before synchronization activation.'
    if(-not $report.refreshConfirmed) { $report.warnings += 'Excel refresh completion could not be fully proven for every connection; do not import cached data.' }
    $exitCode=0
} catch {
    $report.status='error'
    # Connection exceptions can contain credentials; never include the raw exception/connection string.
    $report.errorType=$_.Exception.GetType().FullName
    $report.errorHResult=$_.Exception.HResult
} finally {
    $report.failedStage=$report.stage
    $report.stage='close_excel'; Save-Report
    try { if($null -ne $book) { $book.Close($false) } } catch { $report.warnings += 'Workbook close failed.' }
    try { if($ownsExcel -and $null -ne $excel) { $excel.Quit() } } catch { $report.warnings += 'Owned Excel close failed; watchdog checks its process.' }
    Release-Com $book; Release-Com $excel
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    $report.stage='finished'; $report.finishedAt=[datetime]::UtcNow.ToString('o'); Save-Report
}
exit $exitCode
