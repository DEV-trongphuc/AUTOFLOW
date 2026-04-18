<?php
header('Content-Type: text/plain');

$apiKey = "AQ.Ab8RN6LS2_g8GZqYqQGNMkV9jAcm10qYX0-tjgjMLp2D_GimWw";
$url = "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=" . $apiKey;

$payload = [
    "contents" => [
        [
            "role" => "user",
            "parts" => [
                ["text" => "Explain how AI works in a few words"]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

// Since it's a stream, we might want to see the raw output
echo "Connecting to: $url\n\n";

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo 'cURL Error: ' . curl_error($ch);
} else {
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "HTTP Status: $httpCode\n\n";
    echo "Response:\n";
    echo $response;
}

curl_close($ch);
?>