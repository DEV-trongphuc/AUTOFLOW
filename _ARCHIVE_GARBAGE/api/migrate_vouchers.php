<?php
require_once 'bootstrap.php';
initializeSystem($pdo);

echo "Starting DB Migration for Voucher Expirations...\n";

try {
    $pdo->exec("ALTER TABLE voucher_campaigns ADD COLUMN expiration_days INT NULL DEFAULT NULL");
    echo "Added expiration_days to voucher_campaigns.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column expiration_days already exists.\n";
    } else {
        echo "Error on voucher_campaigns: " . $e->getMessage() . "\n";
    }
}

try {
    $pdo->exec("ALTER TABLE voucher_codes ADD COLUMN expires_at DATETIME NULL DEFAULT NULL");
    echo "Added expires_at to voucher_codes.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column expires_at already exists.\n";
    } else {
        echo "Error on voucher_codes: " . $e->getMessage() . "\n";
    }
}

echo "Migration done.\n";
