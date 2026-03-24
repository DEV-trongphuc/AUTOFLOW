#!/usr/bin/env php
<?php
/**
 * Performance Test Script for list_conversations API
 * 
 * Usage: php test_api_performance.php
 * 
 * This script tests the optimized API endpoint and compares performance
 */

// Configuration
$API_BASE_URL = 'https://automation.ideas.edu.vn/mail_api/ai_chatbot.php';
$PROPERTY_ID = 'ce71ea2e-d841-4e0f-b3ad-332297cde330';

// Test scenarios
$testCases = [
    [
        'name' => 'Web conversations (default)',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'web',
            'is_group' => '0',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'Zalo conversations',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'zalo',
            'is_group' => '0',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'Meta conversations',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'meta',
            'is_group' => '0',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'Org conversations',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'org',
            'is_group' => '0',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'All conversations (slower)',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'all',
            'is_group' => '0',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'With search filter',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'web',
            'search' => 'test',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'With date filter',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'web',
            'from_date' => '2026-01-01',
            'page' => '1',
            'limit' => '10'
        ]
    ],
    [
        'name' => 'Large limit (50 items)',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'web',
            'page' => '1',
            'limit' => '50'
        ]
    ],
    [
        'name' => 'Page 5 (offset test)',
        'params' => [
            'action' => 'list_conversations',
            'property_id' => $PROPERTY_ID,
            'source' => 'web',
            'page' => '5',
            'limit' => '10'
        ]
    ]
];

// Color output helpers
function colorize($text, $color)
{
    $colors = [
        'green' => "\033[32m",
        'red' => "\033[31m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'reset' => "\033[0m"
    ];
    return $colors[$color] . $text . $colors['reset'];
}

function performanceRating($time)
{
    if ($time < 0.3)
        return colorize('EXCELLENT', 'green');
    if ($time < 0.5)
        return colorize('GOOD', 'blue');
    if ($time < 1.0)
        return colorize('ACCEPTABLE', 'yellow');
    return colorize('SLOW', 'red');
}

// Test function
function testAPI($url, $params, $testName)
{
    $fullUrl = $url . '?' . http_build_query($params);

    echo "\n" . str_repeat('=', 80) . "\n";
    echo colorize("Testing: $testName", 'blue') . "\n";
    echo str_repeat('=', 80) . "\n";
    echo "URL: $fullUrl\n";

    // Warm up (first request might be slower due to cold cache)
    file_get_contents($fullUrl);

    // Run test 3 times and get average
    $times = [];
    $results = [];

    for ($i = 0; $i < 3; $i++) {
        $start = microtime(true);
        $response = file_get_contents($fullUrl);
        $end = microtime(true);

        $time = $end - $start;
        $times[] = $time;

        if ($i === 0) {
            $results['response'] = json_decode($response, true);
        }
    }

    $avgTime = array_sum($times) / count($times);
    $minTime = min($times);
    $maxTime = max($times);

    echo "\n📊 Performance Metrics:\n";
    echo "  Average Time: " . colorize(number_format($avgTime, 3) . 's', 'blue') . " - " . performanceRating($avgTime) . "\n";
    echo "  Min Time:     " . colorize(number_format($minTime, 3) . 's', 'green') . "\n";
    echo "  Max Time:     " . colorize(number_format($maxTime, 3) . 's', 'yellow') . "\n";

    if (isset($results['response']['success']) && $results['response']['success']) {
        $data = $results['response']['data'] ?? [];
        $pagination = $results['response']['pagination'] ?? [];

        echo "\n📦 Response Data:\n";
        echo "  Success:      " . colorize('✓', 'green') . "\n";
        echo "  Items:        " . count($data) . "\n";
        echo "  Total Items:  " . ($pagination['total_items'] ?? 'N/A') . "\n";
        echo "  Total Pages:  " . ($pagination['total_pages'] ?? 'N/A') . "\n";
        echo "  Current Page: " . ($pagination['current_page'] ?? 'N/A') . "\n";

        if (!empty($data)) {
            $firstItem = $data[0];
            echo "\n📝 Sample Item:\n";
            echo "  ID:           " . ($firstItem['id'] ?? 'N/A') . "\n";
            echo "  Source:       " . ($firstItem['source'] ?? 'N/A') . "\n";
            echo "  Name:         " . ($firstItem['first_name'] ?? 'N/A') . "\n";
            echo "  Last Message: " . substr($firstItem['last_message'] ?? '', 0, 50) . "...\n";
        }
    } else {
        echo "\n❌ Error: " . colorize($results['response']['message'] ?? 'Unknown error', 'red') . "\n";
    }

    return [
        'name' => $testName,
        'avg_time' => $avgTime,
        'min_time' => $minTime,
        'max_time' => $maxTime,
        'success' => $results['response']['success'] ?? false,
        'item_count' => count($results['response']['data'] ?? [])
    ];
}

// Run all tests
echo colorize("\n🚀 API Performance Test Suite\n", 'green');
echo colorize("Testing URL: $API_BASE_URL\n", 'blue');
echo colorize("Property ID: $PROPERTY_ID\n\n", 'blue');

$allResults = [];

foreach ($testCases as $testCase) {
    $result = testAPI($API_BASE_URL, $testCase['params'], $testCase['name']);
    $allResults[] = $result;
    sleep(1); // Avoid overwhelming the server
}

// Summary
echo "\n\n" . str_repeat('=', 80) . "\n";
echo colorize("📊 PERFORMANCE SUMMARY", 'green') . "\n";
echo str_repeat('=', 80) . "\n\n";

printf(
    "%-40s | %10s | %10s | %10s | %8s\n",
    "Test Case",
    "Avg Time",
    "Min Time",
    "Max Time",
    "Status"
);
echo str_repeat('-', 80) . "\n";

foreach ($allResults as $result) {
    $status = $result['success'] ? colorize('✓', 'green') : colorize('✗', 'red');
    $avgColor = $result['avg_time'] < 0.5 ? 'green' : ($result['avg_time'] < 1.0 ? 'yellow' : 'red');

    printf(
        "%-40s | %10s | %10s | %10s | %8s\n",
        substr($result['name'], 0, 40),
        colorize(number_format($result['avg_time'], 3) . 's', $avgColor),
        number_format($result['min_time'], 3) . 's',
        number_format($result['max_time'], 3) . 's',
        $status
    );
}

echo "\n";

// Overall statistics
$avgTimes = array_column($allResults, 'avg_time');
$overallAvg = array_sum($avgTimes) / count($avgTimes);
$fastestTest = $allResults[array_search(min($avgTimes), $avgTimes)];
$slowestTest = $allResults[array_search(max($avgTimes), $avgTimes)];

echo "📈 Overall Statistics:\n";
echo "  Average Response Time: " . colorize(number_format($overallAvg, 3) . 's', 'blue') . "\n";
echo "  Fastest Test:          " . colorize($fastestTest['name'], 'green') . " (" . number_format($fastestTest['avg_time'], 3) . "s)\n";
echo "  Slowest Test:          " . colorize($slowestTest['name'], 'red') . " (" . number_format($slowestTest['avg_time'], 3) . "s)\n";

// Performance verdict
echo "\n🎯 Performance Verdict:\n";
if ($overallAvg < 0.5) {
    echo colorize("  ✓ EXCELLENT - API is well optimized!", 'green') . "\n";
} elseif ($overallAvg < 1.0) {
    echo colorize("  ✓ GOOD - API performance is acceptable", 'blue') . "\n";
} elseif ($overallAvg < 2.0) {
    echo colorize("  ⚠ ACCEPTABLE - Consider further optimization", 'yellow') . "\n";
} else {
    echo colorize("  ✗ NEEDS IMPROVEMENT - API is too slow", 'red') . "\n";
}

echo "\n" . str_repeat('=', 80) . "\n";
echo colorize("Test completed!\n", 'green');
echo str_repeat('=', 80) . "\n\n";

// Recommendations
echo "💡 Recommendations:\n";
echo "  1. If average time > 1s: Check database indexes\n";
echo "  2. If 'all' source is slow: Use specific source filters when possible\n";
echo "  3. Monitor slow query log: SET GLOBAL slow_query_log = 'ON'\n";
echo "  4. Consider adding Redis caching for frequently accessed data\n";
echo "  5. Run ANALYZE TABLE to update MySQL statistics\n\n";
