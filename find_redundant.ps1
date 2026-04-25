$lines = Get-Content e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql
$table = ""
foreach ($line in $lines) {
    if ($line -match "CREATE TABLE ``([^``]+)``") {
        $table = $matches[1]
    }
    if ($line -match "ALTER TABLE ``([^``]+)``") {
        $table = $matches[1]
    }
    if ($line -match "ADD KEY ``([^``]+)`` \(([^)]+)\)") {
        $keyName = $matches[1]
        $cols = $matches[2] -replace '``', '' -replace '"', '' -replace "'", '' -replace " ", ""
        Write-Output "$table | $keyName | $cols"
    }
}
