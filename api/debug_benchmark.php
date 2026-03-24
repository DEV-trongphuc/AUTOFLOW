<?php
// api/debug_benchmark.php
// Script to test database query performance for high-volume scenarios
require_once 'db_connect.php';

echo "<h1>System Scalability Benchmark</h1>";
echo "<p>Testing database performance for common high-volume queries...</p>";

$start = microtime(true);
$limit = 500;

// Test 1: Active Subscriber Fetch (Worker Fetch)
$sql = "SELECT s.id FROM subscribers s 
        WHERE s.status IN ('active', 'lead', 'customer') 
        AND s.id NOT IN (SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = 'BENCHMARK_TEST')
        LIMIT $limit";
$pdo->query($sql);
$t1 = microtime(true) - $start;
echo "<li>Fetching $limit Active Subscribers for Enrollment: <strong>" . round($t1, 4) . "s</strong> (Target: < 0.05s)</li>";

// Test 2: Activity Lookup (Latest Open)
$start = microtime(true);
$sql = "SELECT id FROM subscriber_activity WHERE subscriber_id = 'BENCHMARK_ID' AND type = 'open_email' ORDER BY created_at DESC LIMIT 1";
$pdo->query($sql);
$t2 = microtime(true) - $start;
echo "<li>checking 'Has User Opened Recently': <strong>" . round($t2, 4) . "s</strong> (Target: < 0.01s)</li>";

// Test 3: Campaign Exclusion Check (Batch of 500)
$start = microtime(true);
$ids = [];
for ($i = 0; $i < 500; $i++)
    $ids[] = uniqid();
$chunk = implode("','", $ids);
$sql = "SELECT subscriber_id FROM subscriber_activity WHERE type='receive_email' AND campaign_id = 'BENCHMARK_CAMP' AND subscriber_id IN ('$chunk')";
$pdo->query($sql);
$t3 = microtime(true) - $start;
echo "<li>Checking Exclusion for 500 users: <strong>" . round($t3, 4) . "s</strong> (Target: < 0.05s)</li>";

echo "</ul>";
echo "<h3>Recommendations:</h3>";
if ($t1 > 0.05)
    echo "<p style='color:red'>WARNING: Subscriber enrollment query is slow. Ensure 'status' index is active.</p>";
if ($t2 > 0.01)
    echo "<p style='color:red'>WARNING: Activity lookup is slow. Run 'database_optimization_500k.sql'.</p>";
if ($t1 < 0.05 && $t2 < 0.01 && $t3 < 0.05)
    echo "<p style='color:green'>SUCCESS: Database is performing well for high concurrency.</p>";
