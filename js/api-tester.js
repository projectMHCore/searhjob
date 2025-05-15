/**
 * API Tester - Инструмент для тестирования API
 */
document.addEventListener('DOMContentLoaded', () => {
    // Элементы интерфейса
    const apiUrlInput = document.getElementById('api-url');
    const endpointInput = document.getElementById('endpoint');
    const methodSelect = document.getElementById('method');
    const requestBodyTextarea = document.getElementById('request-body');
    const proxyServiceSelect = document.getElementById('proxy-service');
    const checkProxyButton = document.getElementById('check-proxy');
    const sendRequestButton = document.getElementById('send-request');
    const statusDiv = document.getElementById('status');
    const responseOutput = document.getElementById('response');

    // Сохраняем токен в localStorage
    let token = localStorage.getItem('api_token');
    
    // Установка статуса
    function setStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }
    
    // Функция для получения URL прокси
    function getProxyUrl(targetUrl) {
        const proxyService = proxyServiceSelect.value;
        
        switch (proxyService) {
            case 'corsproxy':
                return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            case 'allorigins':
                return `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            case 'corsanywhere':
                return `https://cors-anywhere.herokuapp.com/${targetUrl}`;
            case 'direct':
            default:
                return targetUrl;
        }
    }

    // Обработчик результата для разных прокси
    function handleProxyResponse(proxyService, data, response) {
        if (proxyService === 'allorigins') {
            // AllOrigins возвращает данные в свойстве contents
            try {
                return JSON.parse(data.contents);
            } catch (e) {
                return data.contents;
            }
        }
        return data;
    }

    // Функция для проверки прокси
    checkProxyButton.addEventListener('click', async () => {
        setStatus('Проверка прокси...', 'loading');
        
        try {
            const apiUrl = apiUrlInput.value.trim();
            // Используем простой эндпоинт для проверки
            const testUrl = `${apiUrl}/api/v1/status`;
            const proxyUrl = getProxyUrl(testUrl);
            const proxyService = proxyServiceSelect.value;
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            let data;
            const responseClone = response.clone();
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
            } catch (e) {
                data = await responseClone.text();
            }
            
            // Обработка результата в зависимости от прокси
            const result = handleProxyResponse(proxyService, data, response);
            
            responseOutput.innerHTML = JSON.stringify(result, null, 2);
            setStatus('Прокси работает', 'success');
        } catch (error) {
            responseOutput.innerHTML = `Ошибка прокси: ${error.message}`;
            setStatus(`Ошибка прокси: ${error.message}`, 'error');
        }
    });

    // Функция для отправки запроса
    sendRequestButton.addEventListener('click', async () => {
        setStatus('Отправка запроса...', 'loading');
        
        try {
            const apiUrl = apiUrlInput.value.trim();
            let endpoint = endpointInput.value.trim();
            const method = methodSelect.value;
            const requestBody = requestBodyTextarea.value.trim();
            const proxyService = proxyServiceSelect.value;
            
            // Формируем полный URL
            let fullUrl = apiUrl;
            
            // Убедимся, что эндпоинт начинается с /
            if (endpoint && !endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
            
            fullUrl += endpoint;
            
            const proxyUrl = getProxyUrl(fullUrl);
            
            // Настраиваем параметры запроса
            const options = {
                method: method,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };
            
            // Добавляем токен авторизации если он доступен
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Добавляем тело запроса для POST/PUT методов
            if ((method === 'POST' || method === 'PUT') && requestBody) {
                try {
                    // Проверяем, является ли тело запроса валидным JSON
                    JSON.parse(requestBody);
                    options.headers['Content-Type'] = 'application/json';
                    options.body = requestBody;
                } catch (e) {
                    // Если не JSON, отправляем как обычный текст
                    options.headers['Content-Type'] = 'text/plain';
                    options.body = requestBody;
                }
            }
            
            // Отправляем запрос
            const startTime = Date.now();
            const response = await fetch(proxyUrl, options);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            let data;
            const responseClone = response.clone();
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
            } catch (e) {
                data = await responseClone.text();
            }
            
            // Обработка результата в зависимости от прокси
            const result = handleProxyResponse(proxyService, data, response);
            
            if (typeof result === 'object') {
                responseOutput.innerHTML = JSON.stringify(result, null, 2);
            } else {
                responseOutput.innerHTML = result;
            }
            
            // Если в ответе есть токен - сохраняем его
            if (result && result.token) {
                token = result.token;
                localStorage.setItem('api_token', token);
            }
            
            if (response.ok) {
                setStatus(`Успех! ${method} ${endpoint} (${duration} мс)`, 'success');
            } else {
                setStatus(`Ошибка! HTTP ${response.status}: ${response.statusText} (${duration} мс)`, 'error');
            }
        } catch (error) {
            responseOutput.innerHTML = `Ошибка запроса: ${error.message}`;
            setStatus(`Ошибка запроса: ${error.message}`, 'error');
        }
    });

    // Функция для загрузки примеров
    window.loadExample = function(example) {
        switch (example) {
            case 'jobs':
                methodSelect.value = 'GET';
                endpointInput.value = 'api/v1/jobs';
                requestBodyTextarea.value = '';
                break;
            case 'companies':
                methodSelect.value = 'GET';
                endpointInput.value = 'api/v1/companies';
                requestBodyTextarea.value = '';
                break;
            case 'login':
                methodSelect.value = 'POST';
                endpointInput.value = 'api/v1/auth/login';
                requestBodyTextarea.value = JSON.stringify({
                    email: 'user@example.com',
                    password: 'password123'
                }, null, 2);
                break;
            case 'job-search':
                methodSelect.value = 'GET';
                endpointInput.value = 'api/v1/jobs/search?q=developer';
                requestBodyTextarea.value = '';
                break;
        }
    };

    // Выводим информацию о сохраненном токене при загрузке страницы
    if (token) {
        setStatus(`Авторизован (токен сохранен в localStorage)`, 'info');
    }
});
