/**
 * Конфигурация API для frontend
 * Этот файл должен быть размещен в папке js/
 */

// Базовый URL для API запросов
const API_BASE_URL = 'http://89.35.130.223:25063/api';

// Поддержка GitHub Pages
if (window.location.hostname.includes('github.io')) {
    console.log('Detected GitHub Pages environment');
}

// Настройки для запросов
const API_CONFIG = {
    // CORS настройки
    withCredentials: false, // установлено false для работы с CORS-прокси
    // Заголовки для запросов
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    // Функция для получения URL с учетом CORS-прокси
    getCorsProxyUrl: function(url) {
        // Если мы на GitHub Pages, используем CORS прокси
        if (window.location.hostname.includes('github.io')) {
            return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }
        return url;
    }
};

// Включаем автоматическое добавление авторизационного заголовка
const token = localStorage.getItem('token');
if (token) {
    API_CONFIG.headers['Authorization'] = `Bearer ${token}`;
}

// Экспорт конфигурации
export { API_BASE_URL, API_CONFIG };
