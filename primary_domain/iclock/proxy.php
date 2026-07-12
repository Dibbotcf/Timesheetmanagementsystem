<?php
// ZKTeco ADMS proxy
// Device pushes to tcfbd.com/iclock/* → this forwards to hrm.tcfbd.com/iclock/*
$target = 'https://hrm.tcfbd.com' . $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$body   = file_get_contents('php://input');

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_FOLLOWLOCATION => false,
]);
if ($body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/plain']);
}
$response = curl_exec($ch);
$code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($code ?: 200);
header('Content-Type: text/plain');
echo $response ?: 'OK';
