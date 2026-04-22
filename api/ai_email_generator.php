<?php
// api/ai_email_generator.php — AI Email Block Generator
// Calls Gemini to produce a valid EmailBlock[] JSON structure
// compatible with MailFlow Pro's email builder canvas.

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
  exit;

// Support running from /mail_api/ or /api/ — find db_connect & chat_gemini
$_base = __DIR__;
if (!file_exists($_base . '/db_connect.php')) {
  $_base = dirname(__DIR__) . '/api';
}
require_once $_base . '/db_connect.php';
require_once $_base . '/auth_middleware.php';
require_once $_base . '/chat_gemini.php';

// [SECURITY] Require authenticated workspace session — uses workspace Gemini API quota
if (empty($GLOBALS['current_admin_id']) && empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// ── Fetch Gemini API key from system_settings (Cấu hình Trí tuệ Nhân tạo) ──
function getGeminiKey($pdo)
{
  // Lấy từ bảng system_settings — cùng nơi lưu khi dùng trang "Cấu hình AI"
  $stmt = $pdo->prepare("SELECT `value` FROM system_settings WHERE workspace_id = 0 AND `key` = 'gemini_api_key' LIMIT 1");
  $stmt->execute();
  $val = $stmt->fetchColumn();
  if (!empty($val))
    return $val;

  // Fallback: biến môi trường server
  return getenv('GEMINI_API_KEY') ?: '';
}

// ── Main handler ──────────────────────────────────────────────────────────
try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
  }

  $body = json_decode(file_get_contents('php://input'), true);
  $prompt = trim($body['prompt'] ?? '');
  $existing = $body['existing_blocks'] ?? null;   // current blocks for redesign
  $bodyStyle = $body['body_style'] ?? null;
  $improveContent = (bool) ($body['improve_content'] ?? true); // whether to rewrite content

  if (empty($prompt)) {
    echo json_encode(['success' => false, 'message' => 'Prompt không được để trống.']);
    exit;
  }

  $apiKey = getGeminiKey($pdo);
  if (empty($apiKey)) {
    echo json_encode(['success' => false, 'message' => 'Chưa cấu hình Gemini API Key.']);
    exit;
  }

  // ── Build system prompt ───────────────────────────────────────────────
  $systemPrompt = <<<SYSTEM
Bạn là một Senior Email Designer AI, chuyên thiết kế email marketing chuẩn quốc tế, tương thích cao với Gmail, Outlook, Apple Mail.

Nhiệm vụ: Tạo `EmailBlock[]` JSON hoàn chỉnh từ yêu cầu người dùng.

=== CẤU TRÚC DỮ LIỆU ===
Mỗi EmailBlock:
{
  "id": "<unique_string>",
  "type": "<block_type>",
  "content": "<html_or_empty>",
  "style": { ...EmailBlockStyle },
  "children": [...EmailBlock]  // chỉ cho section/row/column
}
Block types: section, row, column, text, image, button, spacer, divider, social, video, quote, timeline, review, countdown, check_list, table, footer

=== CẤU TRÚC LAYOUT BẮT BUỘC ===
  section → row → column → (content blocks)

Section: children = Row[]
Row: children = Column[]; noStack=true chỉ khi cần giữ layout ngang trên mobile
Column width:
  - 1 cột: "100%"
  - 2 cột: "50%" mỗi cột
  - 3 cột: "33.33%" mỗi cột
  - 1/3 + 2/3: "33.33%" và "66.67%"

=== CHUẨN SIZING & SPACING ===
SECTION padding:
  - Hero/Banner: paddingTop/Bottom "48px", paddingLeft/Right "32px"
  - Nội dung chính: paddingTop/Bottom "32px", paddingLeft/Right "32px"
  - Footer: paddingTop/Bottom "24px", paddingLeft/Right "32px"
  - Section nhỏ/divider: paddingTop/Bottom "16px"

TYPOGRAPHY (trong HTML content của text block):
  - H1 hero: font-size 32px-40px, font-weight 800, letter-spacing -0.5px
  - H2 section title: font-size 24px-28px, font-weight 700
  - H3 sub-title: font-size 18px-20px, font-weight 600
  - Body text: font-size 15px-16px, line-height 1.6, font-weight 400
  - Caption/small: font-size 12px-13px, color nhạt hơn
  - Luôn dùng font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

BUTTON style:
  - contentBackgroundColor: màu brand chính
  - color: "#ffffff" (trắng)
  - paddingTop/Bottom: "14px"
  - paddingLeft/Right: "32px"
  - borderRadius: "8px"
  - textAlign: "center"
  - fontSize trong content HTML: "15px", font-weight "700"

SPACER: dùng height "8px", "16px", "24px", "32px" tùy ngữ cảnh

IMAGE: content là URL. Thêm style borderRadius "8px" nếu muốn bo góc

DIVIDER: dùng giữa các section khác nhau, color "#e2e8f0"

=== QUY TẮC MÀU SẮC ===
CONTRAST bắt buộc:
  - Nền tối (hex bắt đầu bằng #1, #0, #2, #3 hoặc độ sáng <60): text PHẢI trắng (#ffffff hoặc #f1f5f9)
  - Nền sáng (#f, #e): text PHẢI tối (#1e293b, #0f172a)
  - Button trên nền tối: dùng màu sáng (brand color, amber, white) với chữ trắng
  - Không bao giờ dùng text cùng màu với background

BRAND COLORS:
  - Nếu email gốc có màu brand → ƯU TIÊN sử dụng màu đó, có thể điều chỉnh sắc độ nếu cần hài hòa hơn
  - Màu accent/CTA: dùng màu đậm nhất, nổi bật nhất của brand
  - Màu nền section: xen kẽ giữa trắng (#ffffff) và cực nhạt (#f8fafc, #fafafa) để tạo nhịp
  - Tránh dùng quá 3 màu chính trong 1 email

=== TIÊU CHUẨN REDESIGN ===
Khi redesign từ email gốc:
  1. PHÂN TÍCH màu brand từ buttons, headers, links trong email gốc
  2. ƯU TIÊN dùng lại màu brand, có thể điều chỉnh nhẹ để đẹp hơn
  3. CHUẨN HÓA padding/spacing theo bảng trên
  4. CẢI THIỆN typography: size, weight, line-height
  5. XEN KẼ background: section trắng — section ngầu đục — lặp lại
  6. CTA button: luôn nổi bật, đúng màu brand, padding đủ lớn

=== YÊU CẦU OUTPUT ===
- Trả về CHỈ JSON thuần túy (không markdown, không giải thích)
- JSON parse được bằng json_decode
- ID unique: "s1","r1","c1","t1","b1" v.v.
- Đủ sections: header/hero, content sections, CTA, footer
- Footer: unsubscribe placeholder, màu tối hoặc xám
- Minimum 4 sections, maximum 10 sections
SYSTEM;

  // ── Extract brand colors from existing blocks ────────────────────────
  function extractBrandColors($blocks, &$colors = [])
  {
    if (!is_array($blocks))
      return;
    foreach ($blocks as $block) {
      $style = $block['style'] ?? [];
      // Collect non-white, non-transparent colors
      $colorFields = ['backgroundColor', 'contentBackgroundColor', 'color', 'borderColor'];
      foreach ($colorFields as $f) {
        if (!empty($style[$f])) {
          $c = strtolower(trim($style[$f]));
          if ($c !== '#ffffff' && $c !== '#fff' && $c !== 'transparent' && $c !== '' && strpos($c, '#') === 0) {
            $colors[$c] = ($colors[$c] ?? 0) + 1;
          }
        }
      }
      // Scan HTML content for color styles
      if (!empty($block['content'])) {
        preg_match_all('/color:\s*(#[0-9a-fA-F]{3,6})/', $block['content'], $m);
        foreach ($m[1] as $c) {
          $c = strtolower($c);
          if ($c !== '#ffffff' && $c !== '#fff')
            $colors[$c] = ($colors[$c] ?? 0) + 1;
        }
        preg_match_all('/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/', $block['content'], $m);
        foreach ($m[1] as $c) {
          $c = strtolower($c);
          $colors[$c] = ($colors[$c] ?? 0) + 1;
        }
      }
      if (!empty($block['children']))
        extractBrandColors($block['children'], $colors);
    }
  }

  // ── Build user message ────────────────────────────────────────────────
  $userMsg = $prompt;
  if ($existing) {
    $existingJson = json_encode($existing, JSON_UNESCAPED_UNICODE);

    // Extract and inject brand color hint
    $brandColors = [];
    extractBrandColors($existing, $brandColors);
    arsort($brandColors);
    $topColors = array_slice(array_keys($brandColors), 0, 5);
    $brandHint = !empty($topColors)
      ? "\n\nMÀU BRAND PHÁT HIỆN TỪ EMAIL GỐC (ưu tiên sử dụng): " . implode(', ', $topColors)
      : '';

    if ($improveContent) {
      $userMsg .= "\n\nYÊU CẦU REDESIGN: Cải thiện toàn bộ layout, spacing, typography VÀ cải thiện nội dung văn bản cho hay hơn.";
    } else {
      $userMsg .= "\n\nYÊU CẦU REDESIGN: Chỉ cải thiện layout, spacing, typography, màu sắc. GIỮ NGUYÊN nội dung văn bản.";
    }
    $userMsg .= $brandHint;
    $userMsg .= "\n\nEmail gốc cần redesign:\n" . $existingJson;
  }

  $contents = [
    ['role' => 'user', 'parts' => [['text' => $userMsg]]]
  ];

  // ── Call Gemini ───────────────────────────────────────────────────────
  $raw = generateResponse(
    $contents,
    $systemPrompt,
    $apiKey,
    'gemini-3-flash-preview',
    1.1,
    60000
  );

  // ── Clean & parse JSON ────────────────────────────────────────────────
  // Strip markdown fences if Gemini wraps the JSON
  $cleaned = trim($raw);
  $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned);
  $cleaned = preg_replace('/\s*```$/', '', $cleaned);
  $cleaned = trim($cleaned);

  $blocks = json_decode($cleaned, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    // Try to extract JSON array from the response
    if (preg_match('/\[[\s\S]*\]/m', $cleaned, $m)) {
      $blocks = json_decode($m[0], true);
    }
  }

  if (!is_array($blocks) || empty($blocks)) {
    echo json_encode([
      'success' => false,
      'message' => 'AI không trả về cấu trúc block hợp lệ. Hãy thử lại với prompt rõ hơn.',
      'raw' => substr($raw, 0, 500) // debug snippet
    ]);
    exit;
  }

  // ── Ensure all blocks have required fields ────────────────────────────
  function sanitizeBlock(&$block)
  {
    if (!isset($block['id']))
      $block['id'] = uniqid('b_');
    if (!isset($block['type']))
      $block['type'] = 'text';
    if (!isset($block['content']))
      $block['content'] = '';
    if (!isset($block['style']))
      $block['style'] = new stdClass();
    if (isset($block['children']) && is_array($block['children'])) {
      foreach ($block['children'] as &$child) {
        sanitizeBlock($child);
      }
    }
  }
  foreach ($blocks as &$block) {
    sanitizeBlock($block);
  }

  echo json_encode([
    'success' => true,
    'data' => $blocks,
    'message' => 'Đã tạo email thành công!'
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => 'Lỗi AI: ' . $e->getMessage()
  ]);
}
