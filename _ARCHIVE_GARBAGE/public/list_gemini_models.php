<?php
$apiKey = "AIzaSyDRbVHNrcHGa4GNsHjGpkBqsNikvOg0-v8";
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=" . $apiKey;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
