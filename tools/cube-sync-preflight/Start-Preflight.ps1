param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$mutex=New-Object Threading.Mutex($false,'Local\TransportReportCubePreflight')
$locked=$false; $worker=$null; $resultCode=1; $runDirectory=$null
function Stop-OwnedExcel([string]$Directory) {
    if(-not $Directory) { return }
    $ownerPath=Join-Path $Directory 'excel-owner.json'
    if(Test-Path -LiteralPath $ownerPath) {
        $owner=Get-Content -LiteralPath $ownerPath -Raw | ConvertFrom-Json
        $owned=Get-Process -Id $owner.pid -ErrorAction SilentlyContinue
        if($owned -and $owned.ProcessName -eq 'EXCEL' -and $owned.StartTime.ToUniversalTime().ToString('o') -eq $owner.startedAt) {
            Stop-Process -Id $owned.Id -Force
        }
    }
}
try {
    try { $locked=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked=$true }
    if(-not $locked) { throw 'Another preflight is already running.' }
    & "$PSScriptRoot\Test-BridgeCore.ps1"
    $config=Get-Content -LiteralPath "$PSScriptRoot\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    $root=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'TransportReportCubeBridge'
    $runDirectory=Join-Path $root ([datetime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
    [void][IO.Directory]::CreateDirectory($runDirectory)
    $acl=New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true,$false)
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $runDirectory -AclObject $acl
    Write-Host 'Refreshing Excel and validating source. No upload or database writes.'
    $arguments='-NoProfile -STA -ExecutionPolicy RemoteSigned -File "'+(Join-Path $PSScriptRoot 'Excel-Preflight.ps1')+'" -RunDirectory "'+$runDirectory+'"'
    $worker=Start-Process -FilePath "$PSHOME\powershell.exe" -ArgumentList $arguments -PassThru
    $deadline=[datetime]::UtcNow.AddSeconds([int]$config.timeoutSeconds)
    while(-not $worker.HasExited -and [datetime]::UtcNow -lt $deadline) { Start-Sleep -Seconds 2; $worker.Refresh() }
    if(-not $worker.HasExited) {
        Stop-Process -Id $worker.Id -Force
        $resultCode=124
    } else { $worker.WaitForExit(); $resultCode=$worker.ExitCode }
    # On timeout or a leaked COM reference, terminate only the recorded owned process with matching creation time.
    Stop-OwnedExcel $runDirectory
    $reportPath=Join-Path $runDirectory 'report.json'
    if(Test-Path -LiteralPath $reportPath) { $report=Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    else { $report=[pscustomobject]@{status='error';stage='worker_start';uploadedRows=0;productionWrites=0} }
    if($resultCode -ne 0) {
        $report.status='error'
        $report | Add-Member -NotePropertyName workerExitCode -NotePropertyValue $resultCode -Force
    }
    $report | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    # Share only diagnostics, NOT the workbook, encrypted payload or credentials.
    $zip=Join-Path $runDirectory 'Cube-preflight-report.zip'
    Compress-Archive -LiteralPath $reportPath -DestinationPath $zip
    [IO.File]::WriteAllText((Join-Path $root 'last-run.txt'),$reportPath,[Text.UTF8Encoding]::new($false))
    Write-Host ('Status: '+$report.status)
    Write-Host ('Report: '+$zip)
    Start-Process explorer.exe -ArgumentList ('/select,"'+$zip+'"')
} catch {
    Write-Host 'Preflight could not complete. No database operations were performed.'
    Write-Host ('Error type: '+$_.Exception.GetType().FullName)
    $resultCode=1
} finally {
    if($null -ne $worker) {
        try { if(-not $worker.HasExited) { Stop-Process -Id $worker.Id -Force } } catch {}
    }
    try { Stop-OwnedExcel $runDirectory } catch { Write-Host 'Could not close owned Excel. Check the preflight process before retrying.' }
    if($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
exit $resultCode
