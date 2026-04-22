const fs = require('fs');

let file = 'api/webhook.php';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('// [EVENT-DRIVEN WAKEUP] Wake up any workflows')) {
    // We'll append it just before the `                } // Allowed events` or at the end of the processing block.
    // Let's find: `$msgEvents = ['user_send_text', 'user_send_image'`
    // Wait, let's just append it right after the HOLIDAY SCENARIO CHECK finishes.
    content = content.replace(
        "                                    if ($holidayTriggered) break;",
        `                                    if ($holidayTriggered) break;
                                }
                            }
                            
                            // [EVENT-DRIVEN WAKEUP] Wake up any workflows waiting for this Zalo interaction
                            try {
                                $stmtMainWakeup = $pdo->prepare("SELECT id FROM subscribers WHERE zalo_user_id = ? LIMIT 1");
                                $stmtMainWakeup->execute([$zaloUserId]);
                                $mainIdWakeup = $stmtMainWakeup->fetchColumn();
                                if ($mainIdWakeup) {
                                    require_once 'trigger_helper.php';
                                    wakeupWaitingSubscribers($pdo, $mainIdWakeup);
                                }
                            } catch (Exception $e) {}`
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched webhook.php");
}
