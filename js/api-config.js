/**
 * Конфигурация API для fronntend
 * Этот файл должен быть размещен в папке js/
 */

// Базовый URL для API запросов
const API_BASE_URL = 'http://89.35.130.223:25063/api';

// Настройки для запросов
const API_CONFIG = {
    // Включить CORS запросы
    withCredentials: true,
    // Заголовки для запросов
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Экспорт конфигурации
export { API_BASE_URL, API_CONFIG };
