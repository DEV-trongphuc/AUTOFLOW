import os

files_to_fix = [
    r"e:\AUTOFLOW\AUTOMATION_FLOW\components\audience\tabs\ListsTab.tsx",
    r"e:\AUTOFLOW\AUTOMATION_FLOW\components\audience\tabs\ContactsTab.tsx",
    r"e:\AUTOFLOW\AUTOMATION_FLOW\components\audience\tabs\SegmentsTab.tsx"
]

mapping = {
    "T?n danh s?ch": "Tên danh sách",
    "Ngu?n (Source)": "Nguồn (Source)",
    "Ng?y t?o": "Ngày tạo",
    "S? lu?ng": "Số lượng",
    "Thao t?c": "Thao tác",
    "Kh?ng t?m th?y": "Không tìm thấy",
    "T?ch danh s?ch": "Tách danh sách",
    "Ch?nh s?a c?u h?nh": "Chỉnh sửa cấu hình",
    "D?n d?p danh s?ch": "Dọn dẹp danh sách",
    "X?a danh s?ch": "Xóa danh sách",
    "B? ch?n t?t c?": "Bỏ chọn tất cả",
    "?? ch?n": "Đã chọn",
    "danh s?ch": "danh sách",
    "G?p danh s?ch": "Gộp danh sách",
    "X?a nhanh": "Xóa nhanh",
    "H?y ch?n": "Hủy chọn",
    "Tn": "Tên",
    "S? di?n tho?i": "Số điện thoại",
    "Cng ty": "Công ty",
    "Tr?ng thi": "Trạng thái",
    "Ho?t d?ng g?n nh?t": "Hoạt động gần nhất",
    "Di?m Lead": "Điểm Lead",
    "Ngy tham gia": "Ngày tham gia",
    "Da ch?n": "Đã chọn",
    "lin h?": "liên hệ",
    "B? ch?n": "Bỏ chọn",
    "Ch?n t?t c?": "Chọn tất cả",
    "Khng tm th?y": "Không tìm thấy",
    "Tn phn khc": "Tên phân khúc",
    "Di?u ki?n l?c": "Điều kiện lọc",
    "D?ng b?": "Đồng bộ",
    "K?t qu?": "Kết quả",
    "Thao tc": "Thao tác",
    "phn khc": "phân khúc",
    "Xa nhanh": "Xóa nhanh",
    "Tn danh sch": "Tên danh sách",
    "Ngun (Source)": "Nguồn (Source)",
    "Ngy t?o": "Ngày tạo",
    "S l??ng": "Số lượng"
}

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    for k, v in mapping.items():
        content = content.replace(k, v)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")
