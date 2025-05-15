<?php
// Скрипт для автоматического обновления frontend для работы с GitHub Pages
// Запустите этот скрипт перед коммитом, чтобы обновить API.js

// Путь к файлу API.js
$apiFilePath = __DIR__ . '/js/api.js';

if (!file_exists($apiFilePath)) {
    echo "Ошибка: Файл $apiFilePath не найден!\n";
    exit(1);
}

// Чтение содержимого файла
$content = file_get_contents($apiFilePath);

// Замена базового URL API для работы на GitHub Pages
$originalContent = $content;
$content = preg_replace(
    '/const API_BASE_URL = \'http:\/\/89\.35\.130\.223:25063\';/m', 
    'const API_BASE_URL = \'http://89.35.130.223:25063\'; // Базовый URL API на сервере', 
    $content
);

// Обновляем логику для GitHub Pages
$githubPagesCheck = <<<'EOT'
// Для GitHub Pages: если мы запущены на GitHub Pages - используем другой URL
if (window.location.hostname.includes('github.io')) {
    // Проверка, запущены ли мы на GitHub Pages
    console.log('Detected GitHub Pages environment, using remote API URL');
    // API_BASE_URL остается прежним, но будет использоваться CORS Proxy
}
EOT;

// Заменяем блок проверки GitHub Pages, если он существует
if (strpos($content, 'window.location.hostname.includes(\'github.io\')') !== false) {
    $content = preg_replace(
        '/\/\/ Для GitHub Pages.*?}/s',
        $githubPagesCheck, 
        $content
    );
} else {
    // Если блока нет, добавляем его после определения API_BASE_URL
    $content = preg_replace(
        '/const API_BASE_URL = .*?;.*?\n/s',
        "$0\n$githubPagesCheck\n", 
        $content
    );
}

// Обновляем функцию getCorsProxyUrl для более надежной работы с GitHub Pages
$corsProxyFunction = <<<'EOT'
// Функция для выбора способа обхода CORS
getCorsProxyUrl(url) {
    // Если мы на GitHub Pages, всегда используем CORS прокси
    if (window.location.hostname.includes('github.io')) {
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    
    // Получаем из localStorage предпочтительный способ обхода CORS
    const proxyType = localStorage.getItem('searhJob_corsProxy') || 'direct';
    switch (proxyType) {
        case 'corsproxy':
            return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        case 'allorigins':
            return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        case 'direct':
        default:
            return url;
    }
},
EOT;

// Заменяем функцию getCorsProxyUrl, если она существует
if (strpos($content, 'getCorsProxyUrl') !== false) {
    $content = preg_replace(
        '/getCorsProxyUrl\(url\) {.*?},/s',
        $corsProxyFunction, 
        $content
    );
}

// Записываем обновленное содержимое в файл, если были изменения
if ($content !== $originalContent) {
    file_put_contents($apiFilePath, $content);
    echo "API.js успешно обновлен для работы с GitHub Pages.\n";
} else {
    echo "Изменения не требуются, файл API.js уже настроен для GitHub Pages.\n";
}

echo "Файлы готовы для коммита в GitHub!\n";
