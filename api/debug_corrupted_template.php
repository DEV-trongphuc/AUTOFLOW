<?php
require_once 'db_connect.php';

$name = "Nâng tầm sự nghiệp cùng chương trình MBA Online Quốc tế";
echo "Searching for template: $name\n\n";

$stmt = $pdo->prepare("SELECT id, name, blocks, body_style, html_content FROM templates WHERE name LIKE ?");
$stmt->execute(["%$name%"]);
$templates = $stmt->fetchAll();

if (!$templates) {
    echo "No template found with that name.\n";
} else {
    foreach ($templates as $tpl) {
        echo "ID: " . $tpl['id'] . "\n";
        echo "Name: " . $tpl['name'] . "\n";
        echo "Blocks (Length): " . (isset($tpl['blocks']) ? strlen($tpl['blocks']) : 'NULL') . "\n";
        echo "Blocks Content Snippet: " . substr($tpl['blocks'], 0, 100) . "...\n";
        echo "Body Style (Length): " . (isset($tpl['body_style']) ? strlen($tpl['body_style']) : 'NULL') . "\n";
        echo "HTML Content (Length): " . (isset($tpl['html_content']) ? strlen($tpl['html_content']) : 'NULL') . "\n";
        echo "-----------------------------------\n";
    }
}
