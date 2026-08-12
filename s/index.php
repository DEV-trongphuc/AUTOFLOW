<?php
// /s/index.php — Dynamic SEO Renderer for Public Surveys
$slug = $_GET['slug'] ?? '';
if (empty($slug)) {
    if (file_exists('../index.html')) {
        echo file_get_contents('../index.html');
    } else {
        echo "Survey not found";
    }
    exit;
}

try {
    // Connect to database (supports both cPanel mail_api/ and local api/ structure)
    if (file_exists('../mail_api/db_connect.php')) {
        require_once '../mail_api/db_connect.php';
    } else {
        require_once '../api/db_connect.php';
    }
    
    // Override JSON Content-Type header set by db_connect.php
    header("Content-Type: text/html; charset=UTF-8");
    
    // Fetch survey title and metadata
    $stmt = $pdo->prepare("SELECT name, cover_style, settings_json FROM surveys WHERE slug = ?");
    $stmt->execute([$slug]);
    $survey = $stmt->fetch(PDO::FETCH_ASSOC);

    // Read index.html template
    $html = '';
    if (file_exists('../index.html')) {
        $html = file_get_contents('../index.html');
    } else {
        $html = "Survey not found";
    }

    if ($survey) {
        $surveyName = htmlspecialchars($survey['name'], ENT_QUOTES, 'UTF-8');
        
        // Parse cover style for description and cover image
        $coverStyle = json_decode($survey['cover_style'] ?? '{}', true);
        
        $desc = isset($coverStyle['coverDescription']) ? $coverStyle['coverDescription'] : '';
        if (empty($desc)) {
            $desc = "Khảo sát ý kiến khách hàng - IDEAS Monthly Workshop.";
        }
        $surveyDesc = htmlspecialchars($desc, ENT_QUOTES, 'UTF-8');
        
        $imageUrl = '';
        if (isset($coverStyle['coverImageUrl']) && !empty($coverStyle['coverImageUrl'])) {
            $imageUrl = $coverStyle['coverImageUrl'];
        } else if (isset($coverStyle['logoUrl']) && !empty($coverStyle['logoUrl'])) {
            $imageUrl = $coverStyle['logoUrl'];
        } else {
            $imageUrl = 'https://automation.ideas.edu.vn/imgs/ICON.png';
        }
        $surveyImage = htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8');

        // Replace template title <title>DOMATION - Digital AI Automation</title>
        $patternTitle = '/<title>.*?<\/title>/i';
        $replacementTitle = "<title>{$surveyName}</title>";
        $html = preg_replace($patternTitle, $replacementTitle, $html);

        // Inject Open Graph / Twitter Cards SEO tags into <head>
        $seoMeta = "\n";
        $seoMeta .= "  <!-- Dynamic OG SEO Tags -->\n";
        $seoMeta .= "  <meta name=\"description\" content=\"{$surveyDesc}\" />\n";
        $seoMeta .= "  <meta property=\"og:title\" content=\"{$surveyName}\" />\n";
        $seoMeta .= "  <meta property=\"og:description\" content=\"{$surveyDesc}\" />\n";
        $seoMeta .= "  <meta property=\"og:image\" content=\"{$surveyImage}\" />\n";
        $seoMeta .= "  <meta property=\"og:type\" content=\"website\" />\n";
        $seoMeta .= "  <meta property=\"og:url\" content=\"https://{$_SERVER['HTTP_HOST']}/s/{$slug}\" />\n";
        $seoMeta .= "  <meta name=\"twitter:card\" content=\"summary_large_image\" />\n";
        $seoMeta .= "  <meta name=\"twitter:title\" content=\"{$surveyName}\" />\n";
        $seoMeta .= "  <meta name=\"twitter:description\" content=\"{$surveyDesc}\" />\n";
        $seoMeta .= "  <meta name=\"twitter:image\" content=\"{$surveyImage}\" />\n";
        
        $html = str_replace('<head>', '<head>' . $seoMeta, $html);
    }
    
    echo $html;
} catch (Exception $e) {
    header("Content-Type: text/html; charset=UTF-8");
    if (file_exists('../index.html')) {
        echo file_get_contents('../index.html');
    } else {
        echo "Error: " . $e->getMessage();
    }
}
