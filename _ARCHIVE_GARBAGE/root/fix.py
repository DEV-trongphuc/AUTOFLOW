import re
import os

path = r'e:\AUTOFLOW\AUTOMATION_FLOW\components\settings\ZaloOAManager.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'Qu?n ly k?t n?i OA': 'Quản lý kết nối OA',
    'Qu?n l? k?t n?i OA': 'Quản lý kết nối OA',
    'Hu?ng d?n': 'Hướng dẫn',
    'K?t n?i ngay': 'Kết nối ngay',
    'K?t n?i Zalo OA thnh cng!': 'Kết nối Zalo OA thành công!',
    'L?i khi t?i danh sch OA': 'Lỗi khi tải danh sách OA',
    'Dang m? c?a s? dang nh?p Zalo...': 'Đang mở cửa sổ đăng nhập Zalo...',
    'L?i khi t?o URL k?t n?i': 'Lỗi khi tạo URL kết nối',
    'L?i k?t n?i API': 'Lỗi kết nối API',
    'L?i khi t?o URL authorize': 'Lỗi khi tạo URL authorize',
    'Da lm m?i token thnh cng!': 'Đã làm mới token thành công!',
    'L?i khi refresh token': 'Lỗi khi refresh token',
    'Da c?p nh?t H?n m?c v Ch?t lu?ng': 'Đã cập nhật Hạn mức và Chất lượng',
    'Ng?t k?t n?i Zalo OA?': 'Ngắt kết nối Zalo OA?',
    'B?n c ch?c ch?n mu?n ng?t k?t n?i': 'Bạn có chắc chắn muốn ngắt kết nối',
    'M?i chi?n d?ch v t? d?ng ha lin quan d?n OA': 'Mọi chiến dịch và tự động hóa liên quan đến OA',
    'ny s? b? ?nh hu?ng': 'này sẽ bị ảnh hưởng',
    'L?i khi xa OA': 'Lỗi khi xóa OA',
    'S?n sng k?t n?i?': 'Sẵn sàng kết nối?',
    'K?t n?i Zalo Official Account c?a b?n ngay hm nay d? b?t d?u khai thc s?c m?nh c?a thng bo ZNS t? d?ng.': 'Kết nối Zalo Official Account của bạn ngay hôm nay để bắt đầu khai thác sức mạnh của thông báo ZNS tự động.',
    'K?t n?i ngay 1 ch?m': 'Kết nối ngay 1 chạm',
    'H?t h?n k?t n?i': 'Hết hạn kết nối',
    'Token da h?t h?n. Vui lng authorize l?i d? ti?p t?c s? d?ng d?ch v?.': 'Token đã hết hạn. Vui lòng authorize lại để tiếp tục sử dụng dịch vụ.',
    'C?p nh?t quy?n/Authorize l?i': 'Cập nhật quyền/Authorize lại',
    'Kch ho?t ngay': 'Kích hoạt ngay',
    'Ng?t k?t n?i': 'Ngắt kết nối',
    
    # Also fix the blue -> orange
    'from-blue-500 to-blue-600': 'from-orange-500 to-orange-600',
    'shadow-blue-500/20': 'shadow-orange-500/20',
    'ring-blue-50': 'ring-orange-50',
    'bg-blue-600': 'bg-orange-600',
    'bg-blue-50/50': 'bg-orange-50/50',
    'bg-blue-50/30': 'bg-orange-50/30',
    'text-blue-500': 'text-orange-500',
    'text-blue-600': 'text-orange-600',
    'hover:bg-blue-700': 'hover:bg-orange-700',
    'bg-blue-50': 'bg-orange-50',
    'border-blue-200': 'border-orange-200',
    'from-blue-600 to-indigo-600': 'from-orange-500 to-orange-600',
    'hover:from-blue-700 hover:to-indigo-700': 'hover:from-orange-600 hover:to-orange-700',
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
