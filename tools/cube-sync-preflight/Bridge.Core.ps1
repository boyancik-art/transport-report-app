Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Invariant = [Globalization.CultureInfo]::InvariantCulture
$script:Columns = [ordered]@{
    date='Дата документу'; route='ID Доставки'; group='ID групи (Операції)'
    op='Код операції'; warehouse='Склад відправника'; expeditor='Експедитор'
    customer='Контрагент'; address='Адреса доставки'; bottles='К-ть пляшок'
    places='Кількість місць'; weight='Вага'; sale='Код продажі'
    amount='Сума замовлення'; customerId='ID Контрагента'; addressId='ID Адреса доставки'
    pallets='Мат пал.'; settlement='Нас. пункт'; district='Район'; region='Область'
    business='Бізнес одиниця'; employee='EmployeeID'
}
function Write-BridgeJson([string]$Path, $Value) {
    $json = ConvertTo-Json -InputObject $Value -Depth 30
    [IO.File]::WriteAllText($Path, $json, [Text.UTF8Encoding]::new($false))
}
function Get-BridgeText($Value) {
    if ($null -eq $Value) { return '' }
    if ($Value -is [double] -or $Value -is [decimal] -or $Value -is [int] -or $Value -is [long]) {
        if ([double]::IsNaN([double]$Value) -or [double]::IsInfinity([double]$Value)) { throw 'Invalid numeric ID' }
        if ([math]::Abs([double]$Value) -ge 1e15 -or [math]::Truncate([double]$Value) -ne [double]$Value) {
            throw 'Numeric ID cannot be represented safely; source must use text'
        }
        return ([decimal]$Value).ToString('0', $script:Invariant)
    }
    return ([string]$Value).Trim()
}
function Get-BridgeNumber($Value) {
    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return [decimal]0 }
    $text = ([string]$Value).Trim().Replace([char]0xA0, [char]0x20).Replace(' ', '').Replace(',', '.')
    $number = [decimal]0
    if (-not [decimal]::TryParse($text, [Globalization.NumberStyles]::Float, $script:Invariant, [ref]$number)) {
        throw 'Invalid numeric measure'
    }
    return $number
}
function Get-BridgeDate($Value) {
    if ($Value -is [double] -or $Value -is [int] -or $Value -is [decimal]) {
        $date = [datetime]::FromOADate([double]$Value)
    } elseif ($Value -is [datetime]) { $date = $Value } else {
        $date = [datetime]::MinValue
        $formats = [string[]]@('yyyy-MM-dd','dd.MM.yyyy','d.M.yyyy','yyyy-MM-ddTHH:mm:ss','dd.MM.yyyy HH:mm:ss')
        if (-not [datetime]::TryParseExact(([string]$Value).Trim(), $formats, $script:Invariant,
                [Globalization.DateTimeStyles]::None, [ref]$date)) { throw 'Invalid document date' }
    }
    if ($date.Year -lt 2000 -or $date.Year -gt 2100) { throw 'Document date outside supported range' }
    return $date.ToString('yyyy-MM-dd', $script:Invariant)
}
function Get-BridgeIdentity($Row) {
    # A candidate, NOT an approved primary key. Collisions block activation.
    $parts = @($Row.date,$Row.route,$Row.group,$Row.op,$Row.sale,$Row.addressId,$Row.customerId,$Row.employee,$Row.business)
    return ConvertTo-Json -InputObject $parts -Compress
}
function Get-BridgeSummary($Rows, [string]$From, [string]$To) {
    $byDate = @{}; $keys = @{}; $routes = @{}; $points = @{}
    $outside = 0
    foreach ($r in $Rows) {
        if (-not $byDate.ContainsKey($r.date)) { $byDate[$r.date] = 0 }
        $byDate[$r.date]++
        if ($r.date -lt $From -or $r.date -gt $To) { $outside++; continue }
        $key = Get-BridgeIdentity $r
        if (-not $keys.ContainsKey($key)) { $keys[$key] = 0 }
        $keys[$key]++
        $routes[(ConvertTo-Json -InputObject @($r.date,$r.route) -Compress)] = $true
        $points[(ConvertTo-Json -InputObject @($r.date,$r.route,$r.addressId,$r.customerId) -Compress)] = $true
    }
    $days = @(); $emptyDays = @()
    for ($d = [datetime]::ParseExact($From,'yyyy-MM-dd',$script:Invariant); $d -le [datetime]::ParseExact($To,'yyyy-MM-dd',$script:Invariant); $d=$d.AddDays(1)) {
        $key = $d.ToString('yyyy-MM-dd'); $count = 0
        if ($byDate.ContainsKey($key)) { $count = $byDate[$key] }
        $days += [ordered]@{date=$key;rows=$count}
        if ($count -eq 0) { $emptyDays += $key }
    }
    $sorted = @($byDate.Keys | Sort-Object)
    $collisions = @($keys.Values | Where-Object { $_ -gt 1 })
    return [ordered]@{
        rowsTotal=@($Rows).Count; rowsInPeriod=(@($Rows).Count-$outside); rowsOutsidePeriod=$outside
        routesInPeriod=$routes.Count; pointsInPeriod=$points.Count
        minimumDate=$(if($sorted.Count){$sorted[0]}else{$null})
        maximumDate=$(if($sorted.Count){$sorted[-1]}else{$null})
        dailyCounts=$days; datesWithoutRows=$emptyDays
        candidateKeyCollisionGroups=$collisions.Count
        candidateKeyCollisionRows=($collisions | Measure-Object -Sum).Sum
        coverageConfirmed=$false
        coverageNote='Date coverage alone does not prove a complete Cube query; empty days require confirmation from the source.'
    }
}
