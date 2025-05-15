<?php
/**
 * Улучшенный API прокси для обхода CORS ограничений
 * Создан для тестирования API на удаленном сервере
 */

// Устанавливаем заголовки CORS для всех запросов
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Для OPTIONS запросов сразу возвращаем OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Настройки
$remoteApiUrl = 'http://89.35.130.223:25063'; // URL удаленного API

// Параметры
$debug = isset($_GET['debug']) && $_GET['debug'] === '1';
$endpoint = isset($_GET['endpoint']) ? trim($_GET['endpoint'], '/') : '';

// Если установлен параметр ?info=1, показываем информацию о прокси
if (isset($_GET['info']) && $_GET['info'] === '1') {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'active',
        'proxy_version' => '1.1',
        'remote_api' => $remoteApiUrl,
        'usage' => [
            'base_url' => 'http://example.com/api_proxy.php',
            'endpoints' => [
                'GET /api_proxy.php?endpoint=jobs',
                'GET /api_proxy.php?endpoint=companies',
                'POST /api_proxy.php?endpoint=auth/login (с телом запроса)',
            ],
            'options' => [
                'debug' => 'Добавьте &debug=1 для отладки',
                'info' => 'Добавьте &info=1 для этой информации',
            ]
        ],
        'server_info' => [
            'time' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// Если эндпоинт не указан
if (empty($endpoint)) {
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'No endpoint specified',
        'message' => 'Please specify an endpoint using ?endpoint=path/to/resource',
        'help' => 'Add ?info=1 for usage information'
    ], JSON_PRETTY_PRINT);
    exit();
}

// Формируем полный URL API
$fullApiUrl = rtrim($remoteApiUrl, '/') . '/' . $endpoint;

// Получаем метод запроса
$method = $_SERVER['REQUEST_METHOD'];

// Получаем заголовки запроса
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'connection' && strtolower($name) !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

// Добавляем заголовок Accept, если его нет
$hasAccept = false;
foreach ($headers as $header) {
    if (stripos($header, 'Accept:') === 0) {
        $hasAccept = true;
        break;
    }
}
if (!$hasAccept) {
    $headers[] = 'Accept: application/json';
}

// Получаем тело запроса
$requestBody = file_get_contents('php://input');

// Если включен режим отладки, показываем детали запроса
if ($debug) {
    header('Content-Type: application/json');
    echo json_encode([
        'debug' => true,
        'request' => [
            'method' => $method,
            'url' => $fullApiUrl,
            'headers' => $headers,
            'body' => !empty($requestBody) ? json_decode($requestBody) : null
        ],
        'info' => 'This is a debug view. The actual request will not be executed.'
    ], JSON_PRETTY_PRINT);
    exit();
}

// Инициализируем cURL
$ch = curl_init($fullApiUrl);

// Настраиваем параметры запроса
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Если есть тело запроса, добавляем его
if (!empty($requestBody) && ($method === 'POST' || $method === 'PUT' || $method === 'PATCH')) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
}

// Выполняем запрос
$response = curl_exec($ch);
$error = curl_error($ch);
$info = curl_getinfo($ch);
$headerSize = $info['header_size'];

// Проверяем на ошибки
if ($error) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'cURL error: ' . $error,
        'code' => curl_errno($ch),
        'url' => $fullApiUrl
    ], JSON_PRETTY_PRINT);
    curl_close($ch);
    exit();
}

// Разделяем заголовки и тело ответа
$headerText = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

// Устанавливаем код статуса
http_response_code($info['http_code']);

// Обрабатываем заголовки
$headerLines = explode("\r\n", $headerText);
foreach ($headerLines as $line) {
    if (strpos($line, ':') !== false) {
        list($headerName, $headerValue) = explode(':', $line, 2);
        $headerName = trim($headerName);
        $headerValue = trim($headerValue);
        
        // Не передаем некоторые заголовки, которые могут вызвать проблемы
        $skipHeaders = ['transfer-encoding', 'content-encoding', 'content-length'];
        if (!in_array(strtolower($headerName), $skipHeaders)) {
            header($headerName . ': ' . $headerValue);
        }
    }
}

// Закрываем соединение cURL
curl_close($ch);

// Выводим тело ответа
echo $body;
