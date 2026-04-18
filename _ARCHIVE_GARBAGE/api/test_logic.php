<?php
// /tmp/test_logic.php
require_once 'f:\DOWNLOAD\copy-of-mailflow-pro (2) - Copy\copy-of-mailflow-pro3\copy-of-mailflow-pro\copy-of-mailflow-pro\api\flow_helpers.php';

// Mock PDO or skip DB parts if possible?
// evaluateAdvancedConditionGroup calls getRecentJourneyActions which needs PDO.

class MockPDO
{
    public function prepare($sql)
    {
        return new MockStmt();
    }
}
class MockStmt
{
    public function execute($params)
    {
    }
    public function fetchAll()
    {
        return [
            ['details' => 'clicked on https://example.com/promo'],
            ['details' => 'visited pricing page']
        ];
    }
}

$pdo = new MockPDO();
$subProfile = ['city' => 'Hanoi', 'tags' => 'vip,new'];
$subscriberId = '123';

$testConditions = [
    [
        'field' => 'city',
        'operator' => 'equals',
        'value' => 'Hanoi'
    ],
    [
        'field' => 'web_activity',
        'operator' => 'contains',
        'value' => 'promo'
    ]
];

// Note: evaluateAdvancedConditionGroup needs to find specialized logic for web_activity.
// It will call getRecentJourneyActions.

echo "Testing evaluateAdvancedConditionGroup...\n";
try {
    // We need to mock getRecentJourneyActions or ensure it returns what we want.
    // In flow_helpers.php, evaluateAdvancedConditionGroup has:
    // $actualVal = getRecentJourneyActions($pdo, $subscriberId, 30);

    $result = evaluateAdvancedConditionGroup($pdo, $subscriberId, $subProfile, $testConditions);
    echo "Result: " . ($result ? "TRUE" : "FALSE") . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>