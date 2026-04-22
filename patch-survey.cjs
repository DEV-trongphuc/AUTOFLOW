const fs = require('fs');
let file = 'api/survey_public.php';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('wakeupWaitingSubscribers')) {
    content = content.replace(
        "echo json_encode(['success' => true,",
        `// EVENT-DRIVEN WAKEUP FOR SURVEY CONDITIONS
        if (!empty($subscriberId)) {
            require_once 'trigger_helper.php';
            wakeupWaitingSubscribers($pdo, $subscriberId);
        }
        
        echo json_encode(['success' => true,`
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched survey_public.php");
}
