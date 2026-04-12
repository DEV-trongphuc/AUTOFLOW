
import sys

file_path = r'e:\AUTOFLOW\AUTOMATION_FLOW\components\web-tracking\conversations\ConversationsTab.tsx'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

mapping = {
    1184: '                title="Xóa liên hệ vĩnh viễn?",\n',
    1187: '                confirmLabel="Xóa vĩnh viễn",\n',
    1191: '                            Bạn sắp xóa liên hệ này khỏi hệ thống hoàn toàn.\n',
    1194: '                            🔞 Toàn bộ lịch sử, tag và dữ liệu của liên hệ này sẽ bị xóa vĩnh viễn, không thể khôi phục.\n'
}

# Note: Python uses 0-indexed, so line 1184 is index 1183
for line_num, content in mapping.items():
    if line_num - 1 < len(lines):
        lines[line_num - 1] = content

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Replacement complete.")
