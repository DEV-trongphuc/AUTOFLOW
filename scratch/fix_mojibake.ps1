
$filePath = "e:\AUTOFLOW\AUTOMATION_FLOW\components\web-tracking\conversations\ConversationsTab.tsx"
$content = Get-Content $filePath -Encoding UTF8

$content[1183] = '                title="Xóa liên hệ vĩnh viễn?",'
$content[1186] = '                confirmLabel="Xóa vĩnh viễn",'
$content[1190] = '                            Bạn sắp xóa liên hệ này khỏi hệ thống hoàn toàn.'
$content[1193] = '                            🔞 Toàn bộ lịch sử, tag và dữ liệu của liên hệ này sẽ bị xóa vĩnh viễn, không thể khôi phục.'

$content | Set-Content $filePath -Encoding UTF8
Write-Host "Replacement complete."
