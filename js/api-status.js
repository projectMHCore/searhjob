/**
 * API Status - Инструмент для проверки статуса API
 */
document.addEventListener('DOMContentLoaded', () => {
    // Элементы интерфейса
    const statusDiv = document.getElementById('status');
    const responseOutput = document.getElementById('response');
    const apiUrlElement = document.getElementById('api-url');
    const responseTimeElement = document.getElementById('response-time');
    const httpStatusElement = document.getElementById('http-status');
    const corsProxyElement = document.getElementById('cors-proxy');
    const checkStatusButton = document.getElementById('check-status');
    const checkEndpointsButton = document.getElementById('check-endpoints');
    const endpointsCard = document.getElementById('endpoints-card');
    const endpointsList = document.getElementById('endpoints-list');
    
    // API URL
    const apiUrl = 'http://89.35.130.223:25063';
    apiUrlElement.textContent = apiUrl;
    
    // Доступные прокси
    const proxies = [
        { id: 'corsproxy', name: 'CORS Proxy', url: 'https://corsproxy.io/' },
        { id: 'allorigins', name: 'All Origins', url: 'https://api.allorigins.win/' },
        { id: 'corsanywhere', name: 'CORS Anywhere', url: 'https://cors-anywhere.herokuapp.com/' },
    ];
    
    // Список эндпоинтов для проверки
    const endpoints = [
        { path: 'api/v1/jobs', method: 'GET', name: 'Вакансии' },
        { path: 'api/v1/companies', method: 'GET', name: 'Компании' },
        { path: 'api/v1/status', method: 'GET', name: 'Статус API' }
    ];
    
    // Установка статуса
    function setStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }
    
    // Функция для проверки URL через прокси
    async function checkUrl(url, proxyId = 'corsproxy') {
        let proxyUrl;
        
        switch (proxyId) {
            case 'corsproxy':
                proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                break;
            case 'allorigins':
                proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                break;
            case 'corsanywhere':
                proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                break;
            default:
                proxyUrl = url;
        }
        
        const startTime = Date.now();
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const endTime = Date.now();
        
        let data;
        const responseClone = response.clone();
        
        try {
            if (response.headers.get('content-type')?.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        } catch (e) {
            data = await responseClone.text();
        }
        
        // Обработка для AllOrigins
        if (proxyId === 'allorigins' && typeof data === 'object' && data.contents) {
            try {
                data = JSON.parse(data.contents);
            } catch (e) {
                data = data.contents;
            }
        }
        
        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: data,
            responseTime: endTime - startTime,
            proxyId: proxyId
        };
    }
    
    // Проверка всех доступных прокси
    async function checkAllProxies() {
        setStatus('Проверка доступности API через различные прокси...', 'loading');
        
        for (const proxy of proxies) {
            try {
                const result = await checkUrl(`${apiUrl}/api/v1/status`, proxy.id);
                
                if (result.success) {
                    // Нашли работающий прокси
                    corsProxyElement.textContent = `${proxy.name} (${proxy.url})`;
                    responseTimeElement.textContent = `${result.responseTime} мс`;
                    httpStatusElement.textContent = `${result.status} ${result.statusText}`;
                    
                    responseOutput.textContent = typeof result.data === 'object' 
                        ? JSON.stringify(result.data, null, 2) 
                        : result.data;
                    
                    setStatus(`API доступен через прокси ${proxy.name}`, 'success');
                    
                    // Запоминаем рабочий прокси для последующих запросов
                    localStorage.setItem('working_proxy', proxy.id);
                    return result;
                }
            } catch (error) {
                console.log(`Прокси ${proxy.name} недоступен:`, error);
            }
        }
        
        // Ни один прокси не сработал
        setStatus('API не доступен через известные прокси', 'error');
        corsProxyElement.textContent = 'Недоступен';
        responseTimeElement.textContent = '—';
        httpStatusElement.textContent = '—';
        responseOutput.textContent = 'Не удалось подключиться к API через доступные прокси. Возможны следующие причины:\n\n1. Сервер API не работает\n2. Проблемы с сетевым подключением\n3. Все прокси-сервисы недоступны';
        
        return null;
    }
    
    // Проверка всех эндпоинтов
    async function checkAllEndpoints() {
        setStatus('Проверка доступности эндпоинтов...', 'loading');
        endpointsCard.style.display = 'block';
        endpointsList.innerHTML = '';
        
        const workingProxyId = localStorage.getItem('working_proxy') || 'corsproxy';
        
        for (const endpoint of endpoints) {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const statusCell = document.createElement('td');
            const timeCell = document.createElement('td');
            
            nameCell.textContent = `${endpoint.method} /${endpoint.path}`;
            statusCell.textContent = 'Проверка...';
            timeCell.textContent = '—';
            
            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(timeCell);
            endpointsList.appendChild(row);
            
            try {
                const result = await checkUrl(`${apiUrl}/${endpoint.path}`, workingProxyId);
                
                if (result.success) {
                    statusCell.textContent = `✅ ${result.status} ${result.statusText}`;
                    timeCell.textContent = `${result.responseTime} мс`;
                } else {
                    statusCell.textContent = `❌ ${result.status} ${result.statusText}`;
                    timeCell.textContent = `${result.responseTime} мс`;
                }
            } catch (error) {
                statusCell.textContent = `❌ Ошибка: ${error.message}`;
                timeCell.textContent = '—';
            }
        }
        
        setStatus('Проверка эндпоинтов завершена', 'info');
    }
    
    // Привязка обработчиков событий
    checkStatusButton.addEventListener('click', checkAllProxies);
    checkEndpointsButton.addEventListener('click', checkAllEndpoints);
    
    // Проверяем статус при загрузке страницы
    checkAllProxies();
});
