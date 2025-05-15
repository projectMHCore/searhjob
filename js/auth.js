/**
 * auth.js - функции для авторизации и регистрации пользователя
 * 
 * Этот файл содержит функциональность, связанную с аутентификацией и авторизацией пользователя,
 * включая логин, регистрацию и управление сессией.
 */

// Объект для работы с API аутентификации
const AuthAPI = {
    // Базовый URL API
    apiBaseUrl: 'http://89.35.130.223:25063',
    
    // Метод для входа в систему
    async login(email, password) {
        try {
            const url = `${this.apiBaseUrl}/auth/login`;
            const response = await fetch(API.getCorsProxyUrl(url), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка входа в систему');
            }
            
            const data = await response.json();
            
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return data.user;
            } else {
                throw new Error('Токен авторизации не получен');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    // Метод для регистрации нового пользователя
    async register(userData) {
        try {
            const url = `${this.apiBaseUrl}/auth/register`;
            const response = await fetch(API.getCorsProxyUrl(url), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка регистрации');
            }
            
            const data = await response.json();
            
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return data.user;
            } else {
                throw new Error('Токен авторизации не получен после регистрации');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },
    
    // Метод для выхода из системы
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Обновляем UI для неавторизованного пользователя
        if (typeof updateUIForAnonymousUser === 'function') {
            updateUIForAnonymousUser();
        }
    },
    
    // Проверка, авторизован ли пользователь
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },
    
    // Получение текущего пользователя
    getCurrentUser() {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                return JSON.parse(userJson);
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    },
    
    // Получение токена
    getToken() {
        return localStorage.getItem('token');
    },
    
    // Удаление токена
    removeToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    
    // Обновление данных пользователя
    updateUserData(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
    },
    
    // Проверка срока действия токена
    isTokenValid() {
        const token = this.getToken();
        if (!token) return false;
        
        // Здесь можно было бы проверить JWT токен на срок действия,
        // но для простоты будем считать, что если токен есть - то он действителен
        return true;
    }
};

// При загрузке DOM добавляем обработчики для форм авторизации и регистрации
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик формы входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const messageContainer = document.getElementById('login-message');
            
            // Показываем индикатор загрузки
            messageContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Выполняется вход...</div>';
            
            // Отключаем кнопку отправки
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            try {
                // Выполняем вход через API
                const user = await AuthAPI.login(email, password);
                
                // Показываем сообщение об успехе
                messageContainer.innerHTML = '<div class="success-message">Вход выполнен успешно! Перенаправление...</div>';
                
                // Получаем параметр redirect из URL, если он есть
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || 'index.html';
                
                // Перенаправляем после успешной авторизации
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
                
            } catch (error) {
                console.error('Login error:', error);
                messageContainer.innerHTML = `<div class="error-message">${error.message || 'Ошибка входа в систему. Проверьте email и пароль.'}</div>`;
                submitButton.disabled = false;
            }
        });
    }
    
    // Обработчик формы регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Получаем данные формы
            const firstName = document.getElementById('register-firstName').value;
            const lastName = document.getElementById('register-lastName').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirmPassword').value;
            const messageContainer = document.getElementById('register-message');
            
            // Проверяем совпадение паролей
            if (password !== confirmPassword) {
                messageContainer.innerHTML = '<div class="error-message">Пароли не совпадают</div>';
                return;
            }
            
            // Показываем индикатор загрузки
            messageContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Регистрация...</div>';
            
            // Отключаем кнопку отправки
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            try {
                // Выполняем регистрацию через API
                const userData = {
                    firstName,
                    lastName,
                    email,
                    password
                };
                
                const user = await AuthAPI.register(userData);
                
                // Показываем сообщение об успехе
                messageContainer.innerHTML = '<div class="success-message">Регистрация выполнена успешно! Перенаправление...</div>';
                
                // Перенаправляем после успешной регистрации
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
                
            } catch (error) {
                console.error('Registration error:', error);
                messageContainer.innerHTML = `<div class="error-message">${error.message || 'Ошибка регистрации. Возможно, такой пользователь уже существует.'}</div>`;
                submitButton.disabled = false;
            }
        });
    }
});
