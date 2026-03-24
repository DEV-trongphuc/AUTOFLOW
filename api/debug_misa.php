<?php
// Debug script for MISA sync issues
require_once 'db_connect.php';

echo "=== MISA SYNC DEBUG TOOL ===\n\n";

// 1. Check recent MISA subscribers
echo "1. RECENT MISA SUBSCRIBERS (Last 5):\n";
echo str_repeat("-", 80) . "\n";

$stmt = $pdo->query("
    SELECT id, email, first_name, phone_number, notes, source, updated_at 
    FROM subscribers 
    WHERE source = 'MISA CRM' 
    ORDER BY updated_at DESC 
    LIMIT 5
");

$subscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($subscribers as $sub) {
    echo "ID: {$sub['id']}\n";
    echo "Email: {$sub['email']}\n";
    echo "Name: {$sub['first_name']}\n";
    echo "Phone: " . ($sub['phone_number'] ?: '[EMPTY]') . "\n";
    echo "Notes Length: " . strlen($sub['notes']) . " chars\n";
    echo "Updated: {$sub['updated_at']}\n";
    echo str_repeat("-", 80) . "\n";
}

// 2. Check MISA integration config
echo "\n2. MISA INTEGRATION CONFIG:\n";
echo str_repeat("-", 80) . "\n";

$stmt = $pdo->query("SELECT id, name, config, status, last_sync_at FROM integrations WHERE type = 'misa'");
$integrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($integrations as $int) {
    echo "Integration ID: {$int['id']}\n";
    echo "Name: {$int['name']}\n";
    echo "Status: {$int['status']}\n";
    echo "Last Sync: {$int['last_sync_at']}\n";

    $config = json_decode($int['config'], true);
    echo "Mapping:\n";
    foreach ($config['mapping'] as $sysField => $misaField) {
        echo "  - {$sysField} => {$misaField}\n";
    }
    echo str_repeat("-", 80) . "\n";
}

// 3. Test MISA API connection and field detection
echo "\n3. TESTING MISA API CONNECTION:\n";
echo str_repeat("-", 80) . "\n";

if (!empty($integrations)) {
    $config = json_decode($integrations[0]['config'], true);

    require_once 'misa_helper.php';
    $misa = new MisaHelper($config['clientId'], $config['clientSecret'], $config['endpoint'] ?? '');

    echo "Fetching 1 contact from MISA...\n";
    $result = $misa->getContacts(0, 1);

    if ($result['success'] && !empty($result['data'])) {
        $contact = $result['data'][0];
        echo "\nSample Contact Fields (after normalization):\n";

        // Show all fields
        foreach ($contact as $key => $value) {
            $displayValue = is_array($value) ? json_encode($value) : $value;
            if (strlen($displayValue) > 100) {
                $displayValue = substr($displayValue, 0, 100) . '...';
            }
            echo "  - {$key}: {$displayValue}\n";
        }

        // Check specific mapped fields
        echo "\nMAPPED FIELD VALUES:\n";
        foreach ($config['mapping'] as $sysField => $misaField) {
            $value = $contact[$misaField] ?? '[NOT FOUND]';
            if (is_array($value))
                $value = json_encode($value);
            if (strlen($value) > 100)
                $value = substr($value, 0, 100) . '...';
            echo "  - {$sysField} ({$misaField}): {$value}\n";
        }
    } else {
        echo "ERROR: " . ($result['message'] ?? 'Unknown error') . "\n";
    }
}

// 4. Check for phone number in database
echo "\n\n4. PHONE NUMBER ANALYSIS:\n";
echo str_repeat("-", 80) . "\n";

$stmt = $pdo->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN phone_number IS NOT NULL AND phone_number != '' THEN 1 ELSE 0 END) as with_phone,
        SUM(CASE WHEN phone_number IS NULL OR phone_number = '' THEN 1 ELSE 0 END) as without_phone
    FROM subscribers 
    WHERE source = 'MISA CRM'
");

$stats = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Total MISA subscribers: {$stats['total']}\n";
echo "With phone number: {$stats['with_phone']}\n";
echo "Without phone number: {$stats['without_phone']}\n";

// 5. Show sample of subscribers WITH phone numbers
echo "\n\n5. SAMPLE SUBSCRIBERS WITH PHONE:\n";
echo str_repeat("-", 80) . "\n";

$stmt = $pdo->query("
    SELECT email, first_name, phone_number 
    FROM subscribers 
    WHERE source = 'MISA CRM' 
    AND phone_number IS NOT NULL 
    AND phone_number != '' 
    LIMIT 3
");

$withPhone = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($withPhone as $sub) {
    echo "Email: {$sub['email']}\n";
    echo "Name: {$sub['first_name']}\n";
    echo "Phone: {$sub['phone_number']}\n";
    echo str_repeat("-", 40) . "\n";
}

echo "\n=== DEBUG COMPLETE ===\n";
?>