/**
 * API Status - Инструмент для проверки статуса API
 * 
 * Включает две части:
 * 1. ApiStatus - общий объект для проверки статуса API из любой страницы сайта
 * 2. Интерактивный инструмент детальной проверки API на странице api-status.html
 */

// Объект для работы с проверкой статуса API
const ApiStatus = {
    // Состояния соединения
    connectionStatus: {
        UNKNOWN: 'unknown',
        CHECKING: 'checking',
        CONNECTED: 'connected',
        ERROR: 'error',
        TIMEOUT: 'timeout'
    },

    // Текущий статус соединения
    currentStatus: 'unknown',

    // Время последней проверки
    lastCheck: null,

    // Кэшированный результат проверки статуса
    cachedStatus: null,

    // Время жизни кэша в миллисекундах (5 минут)
    cacheTTL: 5 * 60 * 1000,

    // Таймаут для проверки в миллисекундах (5 секунд)
    checkTimeout: 5000,
    
    // Слушатели событий изменения статуса
    statusChangeListeners: [],
    
    // Запланированная задача проверки
    checkInterval: null,
    
    // История изменений статуса
    statusHistory: [],

    // URL для проверки API
    getCheckUrl() {
        return `${API_BASE_URL || 'http://89.35.130.223:25063'}/ping`;
    },    // Проверка статуса API
    async checkApiStatus(forceCheck = false) {
        // Если уже проверяем, вернем текущий статус
        if (this.currentStatus === this.connectionStatus.CHECKING) {
            return this.currentStatus;
        }

        // Используем кэш, если не истек и не требуется принудительная проверка
        const now = Date.now();
        if (!forceCheck && this.lastCheck && this.cachedStatus && 
            (now - this.lastCheck < this.cacheTTL)) {
            return this.cachedStatus;
        }

        // Сохраняем предыдущий статус для проверки изменений
        const previousStatus = this.currentStatus;
        
        // Меняем статус на "проверяем"
        this.currentStatus = this.connectionStatus.CHECKING;
        this.updateStatusDisplay();

        try {
            const url = this.getCheckUrl();
            const proxyUrl = this.getCorsProxyUrl(url);
            const proxyType = localStorage.getItem('searhJob_corsProxy') || 'allorigins';
            
            console.log('Checking API status via proxy:', proxyType, proxyUrl);
            
            // Используем Promise.race для ограничения времени выполнения запроса
            const response = await Promise.race([
                fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), this.checkTimeout)
                )
            ]);

            // Обработка результата
            if (response.ok) {
                let data;
                const responseClone = response.clone();
                try {
                    data = await response.json();
                    
                    // Обработка ответа от разных прокси
                    if (proxyType === 'allorigins' && data && data.contents) {
                        try {
                            data = JSON.parse(data.contents);
                        } catch (e) {
                            console.log('Error parsing allorigins contents:', e);
                            // Если не удалось распарсить как JSON, возможно это текстовый ответ
                            data = { status: 'ok', message: data.contents };
                        }
                    }
                    
                    // Проверяем валидность ответа
                    if (data && (data.status === 'ok' || data.timestamp)) {
                        this.currentStatus = this.connectionStatus.CONNECTED;
                        console.log('API connection successful:', data);
                    } else {
                        // Получили ответ, но нет нужных полей
                        const textResponse = await responseClone.text();
                        console.log('Invalid API response:', textResponse);
                        this.currentStatus = this.connectionStatus.ERROR;
                    }
                } catch (e) {
                    console.error('Error processing API response:', e);
                    const textResponse = await responseClone.text();
                    console.log('Raw API response:', textResponse);
                    
                    // Попытка обработать текстовый ответ
                    if (textResponse && textResponse.includes('"status":"ok"')) {
                        this.currentStatus = this.connectionStatus.CONNECTED;
                    } else {
                        this.currentStatus = this.connectionStatus.ERROR; 
                    }
                }
            } else {
                this.currentStatus = this.connectionStatus.ERROR;
                console.error('API connection failed:', response.status);
            }
        } catch (error) {
            // Обработка ошибок
            if (error.message === 'Timeout') {
                this.currentStatus = this.connectionStatus.TIMEOUT;
                console.error('API connection timeout');
            } else {
                this.currentStatus = this.connectionStatus.ERROR;
                console.error('API connection error:', error);
            }
        }

        // Обновляем время проверки и кэшированный статус
        this.lastCheck = Date.now();
        this.cachedStatus = this.currentStatus;
        
        // Обновляем отображение статуса
        this.updateStatusDisplay();
        
        // Если статус изменился, отправляем уведомление
        if (previousStatus !== this.currentStatus) {
            // Добавляем запись в историю
            this.addStatusHistoryEntry(previousStatus, this.currentStatus);
            
            // Отправляем уведомление
            this.notifyStatusChange(previousStatus, this.currentStatus);
        }

        return this.currentStatus;
    },
    
    // Добавление записи в историю
    addStatusHistoryEntry(oldStatus, newStatus) {
        this.statusHistory.push({
            timestamp: Date.now(),
            oldStatus: oldStatus,
            newStatus: newStatus
        });
        
        // Ограничиваем историю 20 записями
        if (this.statusHistory.length > 20) {
            this.statusHistory.shift();
        }
    },
    
    // Подписка на изменения статуса
    subscribeToStatusChanges(callback) {
        if (typeof callback === 'function') {
            this.statusChangeListeners.push(callback);
            return true;
        }
        return false;
    },
    
    // Отписка от изменений статуса
    unsubscribeFromStatusChanges(callback) {
        const index = this.statusChangeListeners.indexOf(callback);
        if (index !== -1) {
            this.statusChangeListeners.splice(index, 1);
            return true;
        }
        return false;
    },
    
    // Отправка уведомления об изменении статуса
    notifyStatusChange(oldStatus, newStatus) {
        const eventData = {
            timestamp: Date.now(),
            oldStatus: oldStatus,
            newStatus: newStatus
        };
        
        // Вызываем все зарегистрированные обработчики
        this.statusChangeListeners.forEach(callback => {
            try {
                callback(eventData);
            } catch (e) {
                console.error('Error in API status change listener:', e);
            }
        });
        
        // Если подключение восстановилось, показываем уведомление
        if (oldStatus !== this.connectionStatus.CONNECTED && 
            newStatus === this.connectionStatus.CONNECTED) {
            this.showNotification('Соединение восстановлено', 'Соединение с API успешно восстановлено.', 'success');
        }
        
        // Если подключение потеряно, показываем уведомление
        if (oldStatus === this.connectionStatus.CONNECTED && 
            (newStatus === this.connectionStatus.ERROR || 
             newStatus === this.connectionStatus.TIMEOUT)) {
            this.showNotification('Потеряно соединение с API', 'Возникли проблемы при подключении к API.', 'error');
        }
    },
    
    // Показ уведомления в интерфейсе
    showNotification(title, message, type = 'info') {
        // Проверка поддержки уведомлений браузером
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { 
                body: message,
                icon: '../images/logo.png'
            });
        } else {
            // Fallback для браузеров без поддержки уведомлений
            this.showToast(title, message, type);
        }
    },
    
    // Показ всплывающего уведомления
    showToast(title, message, type = 'info') {
        // Создаем HTML для уведомления
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `api-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${title}</strong>
                <button type="button" class="close-toast">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        // Добавляем на страницу
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            // Если контейнера нет, создаем его
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
            container.appendChild(toast);
        } else {
            toastContainer.appendChild(toast);
        }
        
        // Удаляем через 5 секунд
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.classList.add('toast-hide');
                setTimeout(() => {
                    toastElement.remove();
                }, 500);
            }
        }, 5000);
        
        // Обработчик для закрытия
        toast.querySelector('.close-toast').addEventListener('click', () => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                toast.remove();
            }, 500);
        });
    },
    
    // Запуск автоматической проверки статуса
    startAutoCheck(intervalMs = 60000) { // По умолчанию каждую минуту
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(() => {
            this.checkApiStatus();
        }, intervalMs);
        
        return this.checkInterval;
    },
    
    // Остановка автоматической проверки
    stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            return true;
        }
        return false;
    },
    
    // Запрос разрешения на показ уведомлений
    requestNotificationPermission() {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    },
      // Метод getCorsProxyUrl для получения URL с учетом CORS-прокси
    getCorsProxyUrl(url) {
        // Используем window.API если он существует
        if (window.API && typeof window.API.getCorsProxyUrl === 'function') {
            return window.API.getCorsProxyUrl(url);
        }
        
        // Резервная реализация
        // По умолчанию используем allorigins, т.к. он работает стабильнее
        const proxyType = localStorage.getItem('searhJob_corsProxy') || 'allorigins';
        switch (proxyType) {
            case 'corsproxy':
                return `https://corsproxy.io/?${encodeURIComponent(url)}`;
            case 'allorigins':
                return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            case 'corsanywhere':
                return `https://cors-anywhere.herokuapp.com/${url}`;
            case 'direct':
                return url;
            default:
                // По умолчанию используем allorigins
                return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        }
    },

    // Обновление отображения статуса в интерфейсе
    updateStatusDisplay() {
        // Найти все элементы с классом api-status и обновить их
        const statusElements = document.querySelectorAll('.api-status');
        if (statusElements.length > 0) {
            statusElements.forEach(element => {
                // Очищаем все классы статуса
                element.classList.remove('unknown', 'checking', 'connected', 'error', 'timeout');
                // Добавляем текущий класс статуса
                element.classList.add(this.currentStatus);
                
                // Обновляем иконку и текст в зависимости от статуса
                let icon, text, color;
                switch (this.currentStatus) {
                    case this.connectionStatus.CONNECTED:
                        icon = '<i class="fas fa-check-circle"></i>';
                        text = 'API доступен';
                        color = 'text-success';
                        break;
                    case this.connectionStatus.CHECKING:
                        icon = '<i class="fas fa-spinner fa-spin"></i>';
                        text = 'Проверка соединения...';
                        color = 'text-warning';
                        break;
                    case this.connectionStatus.ERROR:
                        icon = '<i class="fas fa-times-circle"></i>';
                        text = 'Ошибка соединения';
                        color = 'text-danger';
                        break;
                    case this.connectionStatus.TIMEOUT:
                        icon = '<i class="fas fa-clock"></i>';
                        text = 'Таймаут соединения';
                        color = 'text-danger';
                        break;
                    default:
                        icon = '<i class="fas fa-question-circle"></i>';
                        text = 'Статус неизвестен';
                        color = 'text-secondary';
                }
                
                element.innerHTML = `${icon} <span class="${color}">${text}</span>`;
            });
        }
    },

    // Встроить индикатор статуса API в указанный контейнер
    injectStatusIndicator(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            // Создаем индикатор
            const statusWrapper = document.createElement('div');
            statusWrapper.className = 'api-status-wrapper';
            
            const statusElement = document.createElement('div');
            statusElement.className = 'api-status unknown';
            statusElement.innerHTML = '<i class="fas fa-question-circle"></i> <span class="text-secondary">Статус неизвестен</span>';
            
            // Добавляем в контейнер
            statusWrapper.appendChild(statusElement);
            container.appendChild(statusWrapper);
            
            // Добавляем обработчик для обновления статуса при клике
            statusElement.addEventListener('click', () => {
                this.checkApiStatus(true); // Принудительная проверка
            });
            
            // Выполняем первичную проверку
            this.checkApiStatus();
        }
    }
};

// Автоматическая инициализация при загрузке скрипта
document.addEventListener('DOMContentLoaded', () => {
    // Запрашиваем разрешение на уведомления
    ApiStatus.requestNotificationPermission();
    
    // Проверяем статус API
    ApiStatus.checkApiStatus();
    
    // Добавляем индикатор в шапку, если там есть контейнер
    if (document.getElementById('api-status-container')) {
        ApiStatus.injectStatusIndicator('api-status-container');
    }
    
    // Запускаем автоматическую проверку статуса (каждые 60 секунд)
    ApiStatus.startAutoCheck(60000);
    
    // Добавляем стили для уведомлений, если их еще нет
    if (!document.querySelector('#api-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'api-toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 15px;
                right: 15px;
                max-width: 300px;
                z-index: 9999;
            }
            
            .api-toast {
                background: white;
                border-radius: 4px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                overflow: hidden;
                animation: toast-in 0.5s ease-in-out;
            }
            
            .api-toast.toast-hide {
                animation: toast-out 0.5s ease-in-out forwards;
            }
            
            .toast-header {
                padding: 8px 10px;
                background: #f8f9fa;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e9ecef;
            }
            
            .toast-body {
                padding: 10px;
            }
            
            .close-toast {
                border: none;
                background: transparent;
                font-size: 18px;
                cursor: pointer;
                color: #6c757d;
            }
            
            .api-toast.info .toast-header {
                background: #cce5ff;
                color: #004085;
            }
            
            .api-toast.success .toast-header {
                background: #d4edda;
                color: #155724;
            }
            
            .api-toast.warning .toast-header {
                background: #fff3cd;
                color: #856404;
            }
            
            .api-toast.error .toast-header {
                background: #f8d7da;
                color: #721c24;
            }
            
            @keyframes toast-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes toast-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
});

// Код для страницы api-status.html
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
    const proxySelector = document.getElementById('proxy-selector');
    
    // Если эта страница API Status, заполняем дополнительную информацию
    if (statusDiv && responseOutput) {
        // API URL
        const apiUrl = 'http://89.35.130.223:25063';
        if (apiUrlElement) apiUrlElement.textContent = apiUrl;
        
        // Доступные прокси
        const proxies = [
            { id: 'corsproxy', name: 'CORS Proxy', url: 'https://corsproxy.io/' },
            { id: 'allorigins', name: 'All Origins', url: 'https://api.allorigins.win/' },
            { id: 'corsanywhere', name: 'CORS Anywhere', url: 'https://cors-anywhere.herokuapp.com/' },
        ];
        
        // Создаем селектор прокси
        if (proxySelector) {
            proxies.forEach(proxy => {
                const option = document.createElement('option');
                option.value = proxy.id;
                option.textContent = proxy.name;
                proxySelector.appendChild(option);
            });
            
            // Добавляем опцию "Прямое подключение"
            const directOption = document.createElement('option');
            directOption.value = 'direct';
            directOption.textContent = 'Прямое подключение';
            proxySelector.appendChild(directOption);
            
            // Устанавливаем текущее значение
            const currentProxy = localStorage.getItem('searhJob_corsProxy') || 'direct';
            proxySelector.value = currentProxy;
            
            // Обработчик изменения прокси
            proxySelector.addEventListener('change', () => {
                const selectedProxy = proxySelector.value;
                localStorage.setItem('searhJob_corsProxy', selectedProxy);
                
                // Обновляем статус с новым прокси
                ApiStatus.checkApiStatus(true);
            });
        }
        
        // Список эндпоинтов для проверки
        const endpoints = [
            { path: 'ping', method: 'GET', name: 'Пинг-тест' },
            { path: 'api/v1/jobs', method: 'GET', name: 'Вакансии' },
            { path: 'api/v1/companies', method: 'GET', name: 'Компании' },
            { path: 'api/v1/status', method: 'GET', name: 'Статус API' }
        ];
        
        // Установка статуса
        function setStatus(message, type = 'info') {
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.className = `status ${type}`;
            }
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
                    const result = await checkUrl(`${apiUrl}/ping`, proxy.id);
                    
                    if (result.success) {
                        // Нашли работающий прокси
                        if (corsProxyElement) corsProxyElement.textContent = `${proxy.name} (${proxy.url})`;
                        if (responseTimeElement) responseTimeElement.textContent = `${result.responseTime} мс`;
                        if (httpStatusElement) httpStatusElement.textContent = `${result.status} ${result.statusText}`;
                        
                        if (responseOutput) {
                            responseOutput.textContent = typeof result.data === 'object' 
                                ? JSON.stringify(result.data, null, 2) 
                                : result.data;
                        }
                        
                        setStatus(`API доступен через прокси ${proxy.name}`, 'success');
                        
                        // Запоминаем рабочий прокси для последующих запросов
                        localStorage.setItem('working_proxy', proxy.id);
                        localStorage.setItem('searhJob_corsProxy', proxy.id);
                        return result;
                    }
                } catch (error) {
                    console.log(`Прокси ${proxy.name} недоступен:`, error);
                }
            }
            
            // Ни один прокси не сработал
            setStatus('API не доступен через известные прокси', 'error');
            if (corsProxyElement) corsProxyElement.textContent = 'Недоступен';
            if (responseTimeElement) responseTimeElement.textContent = '—';
            if (httpStatusElement) httpStatusElement.textContent = '—';
            
            if (responseOutput) {
                responseOutput.textContent = 'Не удалось подключиться к API через доступные прокси. Возможны следующие причины:\n\n1. Сервер API не работает\n2. Проблемы с сетевым подключением\n3. Все прокси-сервисы недоступны';
            }
            
            return null;
        }
        
        // Проверка всех эндпоинтов
        async function checkAllEndpoints() {
            if (!endpointsCard || !endpointsList) return;
            
            setStatus('Проверка доступности эндпоинтов...', 'loading');
            endpointsCard.style.display = 'block';
            endpointsList.innerHTML = '';
            
            const workingProxyId = localStorage.getItem('searhJob_corsProxy') || 'direct';
            
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
        if (checkStatusButton) checkStatusButton.addEventListener('click', checkAllProxies);
        if (checkEndpointsButton) checkEndpointsButton.addEventListener('click', checkAllEndpoints);
        
        // Проверяем статус при загрузке страницы
        checkAllProxies();
    }
});
