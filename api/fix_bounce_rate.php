<?php
// api/fix_bounce_rate.php - Recalculate bounce rate based on interactions
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "=== BOUNCE RATE MIGRATION ===\n\n";

try {
    $pdo->beginTransaction();

    // Get all sessions
    $stmt = $pdo->query("SELECT id, page_count, is_bounce FROM web_sessions");
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Total sessions to process: " . count($sessions) . "\n\n";

    $updated = 0;
    $unchanged = 0;

    foreach ($sessions as $session) {
        $sessionId = $session['id'];
        $pageCount = $session['page_count'];
        $oldBounce = $session['is_bounce'];

        // Check if session has meaningful interactions (click, scroll, form)
        $stmtEvents = $pdo->prepare("
            SELECT COUNT(*) 
            FROM web_events 
            WHERE session_id = ? 
            AND event_type IN ('click', 'scroll', 'form')
        ");
        $stmtEvents->execute([$sessionId]);
        $hasInteraction = $stmtEvents->fetchColumn() > 0;

        // Calculate correct bounce status
        // NOT bounce if: multiple pages OR has interactions
        $correctBounce = ($pageCount > 1 || $hasInteraction) ? 0 : 1;

        // Update
        $pdo->prepare("UPDATE web_sessions SET is_bounce = ? WHERE id = ?")
            ->execute([$correctBounce, $sessionId]);

        if ($correctBounce != $oldBounce) {
            $updated++;
        } else {
            $unchanged++;
        }

        // Progress indicator
        if (($updated + $unchanged) % 100 == 0) {
            echo "Processed: " . ($updated + $unchanged) . " sessions...\n";
        }
    }

    $pdo->commit();

    echo "\n=== MIGRATION COMPLETE ===\n";
    echo "Updated: $updated sessions\n";
    echo "Unchanged: $unchanged sessions\n";
    echo "Total: " . ($updated + $unchanged) . " sessions\n\n";

    // Show before/after stats
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_sessions,
            SUM(is_bounce) as bounced_sessions,
            ROUND(SUM(is_bounce) / COUNT(*) * 100, 2) as bounce_rate
        FROM web_sessions
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "NEW BOUNCE RATE STATS:\n";
    echo "Total Sessions: " . number_format($stats['total_sessions']) . "\n";
    echo "Bounced Sessions: " . number_format($stats['bounced_sessions']) . "\n";
    echo "Bounce Rate: {$stats['bounce_rate']}%\n";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "\n[ERROR] " . $e->getMessage() . "\n";
}
?>