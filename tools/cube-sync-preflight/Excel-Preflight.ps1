param([Parameter(Mandatory=$true)][string]$RunDirectory)
. "$PSScriptRoot\Bridge.Core.ps1"
. "$PSScriptRoot\Refresh.Core.ps1"
$config = Get-Content -LiteralPath "$PSScriptRoot\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$report = [ordered]@{version=$config.version;status='running';stage='open';startedAt=[datetime]::UtcNow.ToString('o');uploadedRows=0;productionWrites=0;refreshEvidence=@();warnings=@();events=@()}
$excel=$null; $book=$null; $ownsExcel=$false; $exitCode=1; $target=$null; $native=$null; $targetQueries=@()
function Save-Report { Write-BridgeJson (Join-Path $RunDirectory 'report.json') $report }
function Set-Stage([string]$Value) { $report.stage=$Value; Save-Report }
function Release-Com($Value) {
    if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
    }
}
function Log-Step([string]$Name, $Details=@{}) {
    $event=[ordered]@{at=[datetime]::UtcNow.ToString('o');event=$Name;details=$Details}
    $report.events += $event
    $report.lastEvent=$Name
    $line=ConvertTo-Json -InputObject $event -Depth 8 -Compress
    [IO.File]::AppendAllText((Join-Path $RunDirectory 'stages.jsonl'),$line+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
    Write-Host ($event.at+' '+$Name)
    Save-Report
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
    $excel.Visible=$true; $excel.DisplayAlerts=$true; $excel.EnableEvents=$false
    $excel.AutomationSecurity=3 # msoAutomationSecurityForceDisable; do not run workbook macros.
    $excel.AskToUpdateLinks=$false
    # UpdateLinks=0, ReadOnly=true. Never save changes back to the user's workbook.
    $book=$excel.Workbooks.Open($config.workbookPath,0,$true)
    Log-Step 'Workbook opened'
    if ($book.Date1904) { throw '1904 date system requires explicit mapping' }
    $report.connectionInventory=@()
    foreach ($connection in $book.Connections) {
        $refreshAll=$null
        try { $refreshAll=[bool]$connection.RefreshWithRefreshAll } catch {}
        $report.connectionInventory += [ordered]@{name=[string]$connection.Name;type=[int]$connection.Type;refreshWithRefreshAll=$refreshAll}
        Release-Com $connection
    }
    if ($report.connectionInventory.Count -eq 0) { throw 'No workbook connections: cannot verify Cube refresh' }
    $target=$book.Connections.Item($config.connectionName)
    Log-Step 'connection base found' @{type=[int]$target.Type}
    if($target.Type -eq 1) { $native=$target.OLEDBConnection }
    elseif($target.Type -eq 2) { $native=$target.ODBCConnection }
    else { throw 'Unsupported target connection type; refusing unverified refresh' }
    $kind='ODBC'; $olap=$false
    if($target.Type -eq 1) {
        $kind='OLEDB'
        try { $olap=[bool]$native.OLAP } catch {}
        if($olap) { $kind='OLAP' }
        else {
            # Inspect provider locally, never log connection strings or credentials.
            try { if(([string]$native.Connection) -match 'Microsoft.Mashup') { $kind='PowerQuery' } } catch {}
        }
    }
    foreach($sheet in $book.Worksheets) {
        # Excel exposes SQL/Power Query loads through both collections.
        $seen=@{}
        foreach($query in $sheet.QueryTables) {
            if([string]$query.WorkbookConnection.Name -eq $config.connectionName) {
                $targetQueries += $query; $seen[[string]$query.Name]=$true
            } else { Release-Com $query }
        }
        foreach($table in $sheet.ListObjects) {
            $query=$null
            try {
                $query=$table.QueryTable
                if($query -and [string]$query.WorkbookConnection.Name -eq $config.connectionName -and -not $seen.ContainsKey([string]$query.Name)) {
                    $targetQueries += $query; $seen[[string]$query.Name]=$true
                }
            } catch {}
            Release-Com $table
        }
        Release-Com $sheet
    }
    $report.targetKind=$kind; $report.targetQueryCount=$targetQueries.Count
    $report.interactiveExcel=$true
    $initial=Get-TargetRefreshState $native $targetQueries
    $report.evidenceBefore=$initial
    if($initial.refreshing) {
        Log-Step 'refresh state' @{phase='existing_base_refresh';note='Waiting only for base; no second refresh launched.'}
        $existingDeadline=[datetime]::UtcNow.AddSeconds([int]$config.refreshTimeoutSeconds)
        do {
            if([datetime]::UtcNow -ge $existingDeadline) { throw 'Existing base refresh timeout' }
            Start-Sleep -Seconds 2
            $initial=Get-TargetRefreshState $native $targetQueries
            Log-Step 'refresh state' $initial
        } while($initial.refreshing)
    }
    if($initial.stateUnavailable) { throw 'Cannot read target refreshing state' }
    $background=$false
    if(-not $olap) {
        try { $native.BackgroundQuery=$true; $background=[bool]$native.BackgroundQuery } catch {}
    }
    $report.backgroundQuery=$background
    $refreshStart=[datetime]::UtcNow
    $report.refreshStartedAt=$refreshStart.ToString('o')
    Set-Stage 'refresh'
    Log-Step 'refresh started' @{kind=$kind;background=$background;linkedQueries=$targetQueries.Count}
    Log-Step 'refresh state' @{phase='base.Refresh.enter';note='If COM blocks, parent watchdog keeps logging and enforces timeout. Check visible Excel for a prompt.'}
    # Specific connection only. No RefreshAll, global async wait or global CalculationState.
    $target.Refresh()
    Log-Step 'refresh state' @{phase='base.Refresh.returned'}
    $deadline=$refreshStart.AddSeconds([int]$config.refreshTimeoutSeconds)
    $stable=0
    Add-Type -AssemblyName System.Windows.Forms
    do {
        if([datetime]::UtcNow -ge $deadline) { throw 'Target refresh timeout or no successful refresh timestamp' }
        [Windows.Forms.Application]::DoEvents()
        $state=Get-TargetRefreshState $native $targetQueries
        Log-Step 'refresh state' $state
        if(Test-TargetRefreshCompleted $state $initial.refreshDate $refreshStart) { $stable++ } else { $stable=0 }
        if($stable -lt 3) { Start-Sleep -Seconds 2 }
    } while($stable -lt 3)
    $report.refreshEvidence=@($state)
    $report.refreshFinishedAt=[datetime]::UtcNow.ToString('o')
    $report.refreshConfirmed=$true
    Log-Step 'refresh completed' @{connection=$config.connectionName;refreshDate=$state.refreshDate}
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
            $cellValue=$values.GetValue($r,$columnIndex)
            if(-not [string]::IsNullOrWhiteSpace([string]$cellValue)){$hasData=$true;break}
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
    Log-Step 'data validated' @{rows=$rows.Count;periodRows=$report.source.rowsInPeriod;invalidRows=$invalidRows.Count}
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
    Log-Step 'error' @{stage=$report.stage;type=$report.errorType;hresult=$report.errorHResult}
} finally {
    $report.failedStage=$report.stage
    $report.stage='close_excel'; Save-Report
    try { if($null -ne $native) { $native.CancelRefresh() } } catch {}
    try { if($null -ne $excel) { $excel.DisplayAlerts=$false } } catch {}
    try { if($null -ne $book) { $book.Close($false) } } catch { $report.warnings += 'Workbook close failed.' }
    try { if($ownsExcel -and $null -ne $excel) { $excel.Quit() } } catch { $report.warnings += 'Owned Excel close failed; watchdog checks its process.' }
    foreach($query in $targetQueries) { Release-Com $query }
    Release-Com $native; Release-Com $target
    Release-Com $book; Release-Com $excel
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    $report.stage='finished'; $report.finishedAt=[datetime]::UtcNow.ToString('o'); Save-Report
}
exit $exitCode
