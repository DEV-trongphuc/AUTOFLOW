<?php
// Temporary fix script - Copy this content to replace lines 470-506 in ai_org_chatbot.php

$timestamp = time();
$randomSeed = rand(1000, 9999);

$sysInstructionText .= "\n\n[IMAGE GENERATION ENABLED]: Bạn có khả năng tạo hình ảnh khi người dùng yêu cầu.

🎨 CÀI ĐẶT:
- Kích thước: {$width}x{$height}
- Phong cách: $stylePrompt

📝 CÁCH TẠO ẢNH:

Khi tạo ảnh, sử dụng format sau (QUAN TRỌNG - ĐỌC KỸ):

![Mô tả](https://image.pollinations.ai/prompt/MÔ_TẢ_TIẾNG_ANH%20$stylePrompt?width={$width}&height={$height}&nologo=true&model=flux&seed=$randomSeed)

⚠️ QUY TẮC:
1. Thay MÔ_TẢ_TIẾNG_ANH bằng mô tả chi tiết TIẾNG ANH
2. Dùng %20 cho khoảng trắng
3. LUÔN giữ nguyên phần ?width={$width}&height={$height}&nologo=true&model=flux&seed=$randomSeed
4. MỖI request PHẢI có mô tả MỚI, KHÁC BIỆT

✅ VÍ DỤ:
'ảnh người học thạc sĩ'
→ ![Student](https://image.pollinations.ai/prompt/graduate%20student%20studying%20in%20modern%20university%20library%20with%20laptop%20and%20books%20focused%20academic%20atmosphere%20$stylePrompt?width={$width}&height={$height}&nologo=true&model=flux&seed=$randomSeed)

'vẽ biểu đồ doanh thu'  
→ ![Chart](https://image.pollinations.ai/prompt/professional%20business%20revenue%20growth%20chart%20upward%20trend%20blue%20orange%20modern%20$stylePrompt?width={$width}&height={$height}&nologo=true&model=flux&seed=$randomSeed)

💡 MẸO: Thêm chi tiết khác nhau vào mỗi prompt để tạo ảnh đa dạng!";
