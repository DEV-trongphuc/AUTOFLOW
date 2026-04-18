<?php
// Ultra-fast sync using LOAD DATA INFILE
// This is the FASTEST way to import data into MySQL

function ultraFastSync($pdo, $integration)
{
    $config = json_decode($integration['config'], true);
    $spreadsheetId = $config['spreadsheetId'];
    $sheetName = $config['sheetName'] ?? 'Sheet1';
    $targetListId = $config['targetListId'];
    $mapping = $config['mapping'];

    $startTime = microtime(true);

    // 1. Download CSV
    $csvUrl = "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/gviz/tq?tqx=out:csv&sheet=" . urlencode($sheetName);
    $tempCsv = tempnam(sys_get_temp_dir(), 'import_');

    $fp = fopen($tempCsv, 'w+');
    $ch = curl_init($csvUrl);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_exec($ch);
    curl_close($ch);
    fclose($fp);

    // 2. Parse and prepare data for LOAD DATA
    $handle = fopen($tempCsv, 'r');
    $headers = fgetcsv($handle);

    // Map column indices
    $colIndices = [];
    foreach ($mapping as $sysField => $sheetCol) {
        $idx = array_search($sheetCol, $headers);
        if ($idx !== false) {
            $colIndices[$sysField] = $idx;
        }
    }

    // 3. Create temporary import file with proper format
    $importFile = tempnam(sys_get_temp_dir(), 'load_');
    $importFp = fopen($importFile, 'w');

    $newCount = 0;
    while (($row = fgetcsv($handle)) !== FALSE) {
        if (!isset($row[$colIndices['email']]))
            continue;

        $email = trim($row[$colIndices['email']]);
        if (empty($email) || strpos($email, '@') === false)
            continue;

        $id = uniqid();
        $firstName = isset($colIndices['firstName']) ? $row[$colIndices['firstName']] : '';
        $lastName = isset($colIndices['lastName']) ? $row[$colIndices['lastName']] : '';
        $phone = isset($colIndices['phoneNumber']) ? $row[$colIndices['phoneNumber']] : '';
        $source = 'Google Sheets';

        // Write to import file (tab-separated)
        fputcsv($importFp, [$id, $email, $firstName, $lastName, $phone, $source, 'active'], "\t");
        $newCount++;
    }

    fclose($handle);
    fclose($importFp);
    unlink($tempCsv);

    // 4. Use LOAD DATA INFILE (FASTEST METHOD)
    try {
        $pdo->exec("SET autocommit=0");
        $pdo->exec("SET unique_checks=0");
        $pdo->exec("SET foreign_key_checks=0");

        // Create temp table
        $pdo->exec("CREATE TEMPORARY TABLE temp_import (
            id VARCHAR(36),
            email VARCHAR(191),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone_number VARCHAR(50),
            source VARCHAR(100),
            status VARCHAR(50)
        )");

        // LOAD DATA - Ultra fast!
        $escapedPath = str_replace('\\', '/', $importFile);
        $pdo->exec("LOAD DATA LOCAL INFILE '$escapedPath'
            INTO TABLE temp_import
            FIELDS TERMINATED BY '\t'
            LINES TERMINATED BY '\n'
            (id, email, first_name, last_name, phone_number, source, status)");

        // Insert from temp table (handles duplicates)
        $pdo->exec("INSERT INTO subscribers (id, email, first_name, last_name, phone_number, source, status, joined_at)
            SELECT id, email, first_name, last_name, phone_number, source, status, NOW()
            FROM temp_import
            ON DUPLICATE KEY UPDATE
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                phone_number = VALUES(phone_number)");

        // Link to list
        $pdo->exec("INSERT IGNORE INTO subscriber_lists (list_id, subscriber_id)
            SELECT '$targetListId', id FROM temp_import");

        $pdo->exec("DROP TEMPORARY TABLE temp_import");
        $pdo->exec("COMMIT");

        $pdo->exec("SET unique_checks=1");
        $pdo->exec("SET foreign_key_checks=1");

        unlink($importFile);

        $endTime = microtime(true);
        $executionTime = round($endTime - $startTime, 2);
        $speed = round($newCount / $executionTime, 0);

        return "Synced $newCount rows in {$executionTime}s. Speed: {$speed} rows/s (LOAD DATA INFILE)";

    } catch (Exception $e) {
        return "Error: " . $e->getMessage();
    }
}

// Test
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT * FROM integrations WHERE type = 'google_sheets' LIMIT 1");
$integration = $stmt->fetch();

if ($integration) {
    echo ultraFastSync($pdo, $integration);
}
