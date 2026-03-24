<?php
// api/debug_click_stats.php - Debug why clicks are not showing in UI
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "========================================\n";
echo "CLICK STATS DEBUG\n";
echo "========================================\n\n";

// 1. Check total clicks in database
echo "1. Total clicks in subscriber_activity:\n";
try {
    $stmt = $pdo->query("
        SELECT 
            flow_id,
            campaign_id,
            COUNT(*) as total_clicks,
            COUNT(DISTINCT subscriber_id) as unique_users,
            MIN(created_at) as first_click,
            MAX(created_at) as last_click
        FROM subscriber_activity 
        WHERE type = 'click_link'
        GROUP BY flow_id, campaign_id
        ORDER BY total_clicks DESC
    ");
    $clickStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($clickStats)) {
        echo "  ❌ NO CLICKS FOUND in subscriber_activity!\n\n";
    } else {
        echo "  Found clicks in " . count($clickStats) . " flows/campaigns:\n\n";
        foreach ($clickStats as $stat) {
            $source = $stat['flow_id'] ? "Flow: {$stat['flow_id']}" : "Campaign: {$stat['campaign_id']}";
            echo "  $source\n";
            echo "    Total Clicks: {$stat['total_clicks']}\n";
            echo "    Unique Users: {$stat['unique_users']}\n";
            echo "    First Click: {$stat['first_click']}\n";
            echo "    Last Click: {$stat['last_click']}\n\n";
        }
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n\n";
}

// 2. Check click details
echo "2. Recent click events (last 10):\n";
try {
    $stmt = $pdo->query("
        SELECT 
            sa.id,
            sa.subscriber_id,
            sa.flow_id,
            sa.campaign_id,
            sa.reference_id,
            sa.details,
            sa.created_at,
            s.email
        FROM subscriber_activity sa
        LEFT JOIN subscribers s ON sa.subscriber_id = s.id
        WHERE sa.type = 'click_link'
        ORDER BY sa.created_at DESC
        LIMIT 10
    ");
    $clicks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($clicks)) {
        echo "  ❌ NO CLICK EVENTS FOUND!\n\n";
    } else {
        foreach ($clicks as $click) {
            echo "  Click ID: {$click['id']}\n";
            echo "    Email: {$click['email']}\n";
            echo "    Flow ID: " . ($click['flow_id'] ?: 'N/A') . "\n";
            echo "    Campaign ID: " . ($click['campaign_id'] ?: 'N/A') . "\n";
            echo "    Step ID: " . ($click['reference_id'] ?: 'N/A') . "\n";
            echo "    URL: {$click['details']}\n";
            echo "    Time: {$click['created_at']}\n\n";
        }
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n\n";
}

// 3. Test click_summary endpoint for each flow
echo "3. Testing click_summary endpoint for active flows:\n";
try {
    $stmt = $pdo->query("SELECT id, name, status FROM flows WHERE status = 'active' LIMIT 5");
    $flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($flows as $flow) {
        echo "  Flow: {$flow['name']} (ID: {$flow['id']})\n";

        // Simulate API call
        $stmt2 = $pdo->prepare("
            SELECT sa.details, COUNT(*) as total_clicks, COUNT(DISTINCT sa.subscriber_id) as unique_clicks 
            FROM subscriber_activity sa
            WHERE sa.flow_id = ? AND sa.type = 'click_link'
            GROUP BY sa.details 
            ORDER BY total_clicks DESC
        ");
        $stmt2->execute([$flow['id']]);
        $links = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        if (empty($links)) {
            echo "    ⚠ No clicks found for this flow\n\n";
        } else {
            echo "    ✓ Found " . count($links) . " unique links:\n";
            foreach ($links as $link) {
                $url = str_replace('Clicked link: ', '', $link['details']);
                echo "      - $url: {$link['total_clicks']} clicks ({$link['unique_clicks']} unique)\n";
            }
            echo "\n";
        }
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n\n";
}

// 4. Check campaigns
echo "4. Testing click_summary for campaigns:\n";
try {
    $stmt = $pdo->query("SELECT id, name, status FROM campaigns WHERE status IN ('sent', 'sending') LIMIT 5");
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($campaigns as $campaign) {
        echo "  Campaign: {$campaign['name']} (ID: {$campaign['id']})\n";

        $stmt2 = $pdo->prepare("
            SELECT sa.details, COUNT(*) as total_clicks, COUNT(DISTINCT sa.subscriber_id) as unique_clicks 
            FROM subscriber_activity sa
            WHERE sa.campaign_id = ? AND sa.type = 'click_link'
            GROUP BY sa.details 
            ORDER BY total_clicks DESC
        ");
        $stmt2->execute([$campaign['id']]);
        $links = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        if (empty($links)) {
            echo "    ⚠ No clicks found for this campaign\n\n";
        } else {
            echo "    ✓ Found " . count($links) . " unique links:\n";
            foreach ($links as $link) {
                $url = str_replace('Clicked link: ', '', $link['details']);
                echo "      - $url: {$link['total_clicks']} clicks ({$link['unique_clicks']} unique)\n";
            }
            echo "\n";
        }
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n\n";
}

// 5. Check if clicks have proper flow_id/campaign_id
echo "5. Checking data integrity:\n";
try {
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN flow_id IS NULL AND campaign_id IS NULL THEN 1 END) as orphaned,
            COUNT(CASE WHEN flow_id IS NOT NULL THEN 1 END) as with_flow,
            COUNT(CASE WHEN campaign_id IS NOT NULL THEN 1 END) as with_campaign
        FROM subscriber_activity
        WHERE type = 'click_link'
    ");
    $integrity = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "  Total click events: {$integrity['total']}\n";
    echo "  With flow_id: {$integrity['with_flow']}\n";
    echo "  With campaign_id: {$integrity['with_campaign']}\n";
    echo "  Orphaned (no flow/campaign): {$integrity['orphaned']}\n\n";

    if ($integrity['orphaned'] > 0) {
        echo "  ⚠ WARNING: {$integrity['orphaned']} clicks have no flow_id or campaign_id!\n";
        echo "  These clicks won't show in UI.\n\n";
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n\n";
}

echo "========================================\n";
echo "END OF DEBUG REPORT\n";
echo "========================================\n";
echo "</pre>";
?>