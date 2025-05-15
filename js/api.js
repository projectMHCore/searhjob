/**
 * Основные функции для работы с API SearhJob
 * 
 * Этот файл содержит функции для взаимодействия с API сервера SearhJob,
 * включая получение вакансий, компаний, поиск и аутентификацию пользователей.
 */

// Базовый URL API
const API_BASE_URL = 'http://89.35.130.223:25063';

// Для GitHub Pages: если мы запущены на GitHub Pages - используем другой URL
if (window.location.hostname.includes('github.io')) {
    // Проверка, запущены ли мы на GitHub Pages
    console.log('Detected GitHub Pages environment, using remote API URL');
    // API_BASE_URL остается прежним
}

// Объект для хранения настроек API
const API = {
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
            case 'corsanywhere':
                return `https://cors-anywhere.herokuapp.com/${url}`;
            case 'local':
                return `/debug/api_proxy_v2.php?path=${url.replace(API_BASE_URL, '')}`;
            case 'direct':
            default:
                return url;
        }
    },
    
    // Обработка ответа от CORS прокси
    processProxyResponse(response, responseType) {
        const proxyType = localStorage.getItem('searhJob_corsProxy') || 'direct';
        
        if (proxyType === 'allorigins') {
            // AllOrigins оборачивает ответ в свой формат
            if (responseType === 'json') {
                return JSON.parse(response.contents);
            }
            return response.contents;
        }
        
        return response;
    },
    
    // Базовая функция для выполнения запросов к API
    async fetchData(endpoint, options = {}) {
        try {
            const url = API_BASE_URL + endpoint;
            const proxyUrl = this.getCorsProxyUrl(url);
            
            const fetchOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            };
            
            // Добавляем тело запроса, если метод не GET
            if (fetchOptions.method !== 'GET' && options.body) {
                fetchOptions.body = JSON.stringify(options.body);
            }
            
            const response = await fetch(proxyUrl, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            // Получаем данные в зависимости от типа ответа
            let data;
            const responseType = options.responseType || 'json';
            
            switch (responseType) {
                case 'json':
                    data = await response.json();
                    break;
                case 'text':
                    data = await response.text();
                    break;
                case 'blob':
                    data = await response.blob();
                    break;
                default:
                    data = await response.json();
            }
            
            return this.processProxyResponse(data, responseType);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// API для работы с вакансиями
const JobsAPI = {
    // Получить все вакансии
    async getAllJobs(page = 1, limit = 10) {
        return API.fetchData(`/jobs?page=${page}&limit=${limit}`);
    },
    
    // Получить вакансию по ID
    async getJobById(id) {
        return API.fetchData(`/jobs/${id}`);
    },
    
    // Поиск вакансий
    async searchJobs(query, location = '', page = 1, limit = 10) {
        let endpoint = `/jobs/search?q=${encodeURIComponent(query)}`;
        
        if (location) {
            endpoint += `&location=${encodeURIComponent(location)}`;
        }
        
        endpoint += `&page=${page}&limit=${limit}`;
        
        return API.fetchData(endpoint);
    },
    
    // Получить избранные вакансии (требует аутентификации)
    async getFavoriteJobs() {
        const token = AuthAPI.getToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData('/jobs/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    },
    
    // Добавить вакансию в избранное
    async addToFavorites(jobId) {
        const token = AuthAPI.getToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData('/jobs/favorites', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: { jobId }
        });
    },
    
    // Удалить вакансию из избранного
    async removeFromFavorites(jobId) {
        const token = AuthAPI.getToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData(`/jobs/favorites/${jobId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
};

// API для работы с компаниями
const CompaniesAPI = {
    // Получить все компании
    async getAllCompanies(page = 1, limit = 10) {
        return API.fetchData(`/companies?page=${page}&limit=${limit}`);
    },
    
    // Получить компанию по ID
    async getCompanyById(id) {
        return API.fetchData(`/companies/${id}`);
    },
    
    // Поиск компаний
    async searchCompanies(query, page = 1, limit = 10) {
        const endpoint = `/companies/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
        return API.fetchData(endpoint);
    },
    
    // Получить вакансии компании
    async getCompanyJobs(companyId, page = 1, limit = 10) {
        return API.fetchData(`/companies/${companyId}/jobs?page=${page}&limit=${limit}`);
    }
};

// API для аутентификации и работы с пользователями
const AuthAPI = {
    // Получить токен из localStorage
    getToken() {
        return localStorage.getItem('searhJob_authToken');
    },
    
    // Сохранить токен в localStorage
    saveToken(token) {
        localStorage.setItem('searhJob_authToken', token);
    },
    
    // Удалить токен из localStorage
    removeToken() {
        localStorage.removeItem('searhJob_authToken');
    },
    
    // Проверить, авторизован ли пользователь
    isAuthenticated() {
        return !!this.getToken();
    },
    
    // Авторизация пользователя
    async login(email, password) {
        try {
            const response = await API.fetchData('/auth/login', {
                method: 'POST',
                body: { email, password }
            });
            
            if (response.token) {
                this.saveToken(response.token);
                return response.user;
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },
    
    // Выход пользователя
    async logout() {
        try {
            if (this.isAuthenticated()) {
                await API.fetchData('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    }
                });
            }
        } finally {
            this.removeToken();
        }
    },
    
    // Регистрация пользователя
    async register(userData) {
        try {
            const response = await API.fetchData('/auth/register', {
                method: 'POST',
                body: userData
            });
            
            if (response.token) {
                this.saveToken(response.token);
                return response.user;
            } else {
                return response;
            }
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    },
    
    // Получить данные текущего пользователя
    async getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        try {
            return await API.fetchData('/auth/user', {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
        } catch (error) {
            // Если токен недействителен, выходим из системы
            if (error.message.includes('401')) {
                this.removeToken();
            }
            console.error('Failed to get user data:', error);
            throw error;
        }
    },
    
    // Обновить данные пользователя
    async updateUserProfile(profileData) {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData('/auth/user', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: profileData
        });
    }
};

// API для работы с резюме пользователей
const ResumeAPI = {
    // Получить резюме текущего пользователя
    async getUserResume() {
        const token = AuthAPI.getToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData('/resume', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    },
    
    // Создать или обновить резюме
    async updateResume(resumeData) {
        const token = AuthAPI.getToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }
        
        return API.fetchData('/resume', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: resumeData
        });
    }
};

// Экспортируем объекты API для использования в других файлах
// Для совместимости с разными способами импорта
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        API, 
        JobsAPI, 
        CompaniesAPI, 
        AuthAPI, 
        ResumeAPI 
    };
} else if (typeof window !== 'undefined') {
    // Добавляем объекты API в глобальный объект window
    window.API = API;
    window.JobsAPI = JobsAPI;
    window.CompaniesAPI = CompaniesAPI;
    window.AuthAPI = AuthAPI;
    window.ResumeAPI = ResumeAPI;
}
