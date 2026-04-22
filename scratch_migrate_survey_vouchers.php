<?php
require_once 'db_connect.php';

try {
    // 1. Add source tracking to voucher_claims
    $pdo->exec("ALTER TABLE `voucher_claims` 
        ADD COLUMN IF NOT EXISTS `source_channel` varchar(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS `source_id` varchar(100) DEFAULT NULL");
    echo "Added source tracking to voucher_claims.\n";

    // 2. Add claimed tracking to voucher_codes
    $pdo->exec("ALTER TABLE `voucher_codes` 
        ADD COLUMN IF NOT EXISTS `claimed_source` varchar(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS `claimed_source_id` varchar(100) DEFAULT NULL");
    echo "Added claimed tracking to voucher_codes.\n";

    // 3. Add claimed_voucher_code to survey_responses
    $pdo->exec("ALTER TABLE `survey_responses` 
        ADD COLUMN IF NOT EXISTS `claimed_voucher_code` varchar(100) DEFAULT NULL");
    echo "Added claimed_voucher_code to survey_responses.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
