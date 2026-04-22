const fs = require('fs');
const f = 'api/FlowExecutor.php';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
    '// [FIX] Tăng từ 5 phút lên 15 phút — giảm tải worker khi có nhiều subscriber chờ condition\r\n                        $nextScheduledAt = date(\'Y-m-d H:i:s\', strtotime(\'+15 minutes\'));',
    '// [FIX Event-Driven Wakeup] Thay vì poll liên tục 15 phút làm nghẽn DB, set chờ +24 hours. Tracker/Webhook sẽ chủ động Wakeup nhánh này khi Khách tương tác.\r\n                        $nextScheduledAt = date(\'Y-m-d H:i:s\', strtotime(\'+24 hours\'));'
);
c = c.replace(
    '// [FIX] Tăng từ 5 phút lên 15 phút — giảm tải worker khi có nhiều subscriber chờ condition\n                        $nextScheduledAt = date(\'Y-m-d H:i:s\', strtotime(\'+15 minutes\'));',
    '// [FIX Event-Driven Wakeup] Thay vì poll liên tục 15 phút làm nghẽn DB, set chờ +24 hours. Tracker/Webhook sẽ chủ động Wakeup nhánh này khi Khách tương tác.\n                        $nextScheduledAt = date(\'Y-m-d H:i:s\', strtotime(\'+24 hours\'));'
);

// Short-circuit ZNS
c = c.replace(
    'if ($hasEmailError && in_array($condType, [\'opened\', \'clicked\'])) {',
    'if (($hasEmailError && in_array($condType, [\'opened\', \'clicked\'])) || (isset($hasZnsError) && $hasZnsError && strpos($condType, \'zns_\') === 0)) {'
);

fs.writeFileSync(f, c, 'utf8');
console.log("Patched FlowExecutor.php");
