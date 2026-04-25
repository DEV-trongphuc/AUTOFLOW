$lines = Get-Content e:\AUTOFLOW\AUTOMATION_FLOW\api\parsed_indexes.txt
$indexes = @{}

foreach ($line in $lines) {
    if ($line -match "([^|]+)\|([^|]+)\|(.*)") {
        $table = $matches[1].Trim()
        $idxName = $matches[2].Trim()
        $cols = $matches[3].Trim() -replace '`', ''
        if (-not $indexes.ContainsKey($table)) {
            $indexes[$table] = @()
        }
        $indexes[$table] += [PSCustomObject]@{Name=$idxName; Cols=$cols}
    }
}

foreach ($table in $indexes.Keys) {
    $tableIndexes = $indexes[$table]
    for ($i = 0; $i -lt $tableIndexes.Count; $i++) {
        for ($j = 0; $j -lt $tableIndexes.Count; $j++) {
            if ($i -eq $j) { continue }
            $idx1 = $tableIndexes[$i]
            $idx2 = $tableIndexes[$j]
            
            $cols1 = $idx1.Cols -split ','
            $cols2 = $idx2.Cols -split ','
            
            # Check if cols1 is a strict prefix of cols2
            if ($cols1.Count -le $cols2.Count) {
                $isPrefix = $true
                for ($k = 0; $k -lt $cols1.Count; $k++) {
                    if ($cols1[$k] -ne $cols2[$k]) {
                        $isPrefix = $false
                        break
                    }
                }
                if ($isPrefix) {
                    Write-Output "Table: $table -> Index '$($idx1.Name)' ($($idx1.Cols)) is REDUNDANT because of '$($idx2.Name)' ($($idx2.Cols))"
                }
            }
        }
    }
}
