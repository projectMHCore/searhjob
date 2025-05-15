/**
 * Основной JavaScript файл для функциональности фронтенда SearhJob
 * 
 * Этот файл содержит базовую функциональность сайта,
 * включая обработку UI-элементов, поиска и навигации.
 */

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Инициализация приложения
function initApp() {
    // Проверка авторизации пользователя
    checkAuthStatus();
    
    // Инициализация обработчиков форм
    initFormHandlers();
    
    // Инициализация навигации
    initNavigation();
    
    // Инициализация индикатора статуса API
    initApiStatusIndicator();
    
    // Загрузка данных в зависимости от текущей страницы
    loadPageData();
}

// Функция для проверки статуса авторизации
async function checkAuthStatus() {
    try {
        // Проверяем, доступен ли объект AuthAPI
        if (typeof AuthAPI === 'undefined') {
            console.warn('AuthAPI не определен. Пропускаем проверку авторизации.');
            return;
        }
        
        // Проверяем, авторизован ли пользователь
        if (AuthAPI.isAuthenticated()) {
            const user = AuthAPI.getCurrentUser();
            if (user) {
                updateUIForAuthenticatedUser(user);
            } else {
                // Если не удалось получить данные пользователя, выходим из системы
                AuthAPI.logout();
                updateUIForAnonymousUser();
            }
        } else {
            updateUIForAnonymousUser();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateUIForAnonymousUser();
    }
}

// Обновление UI для авторизованного пользователя
function updateUIForAuthenticatedUser(user) {
    // Находим элементы профиля и авторизации
    const profileNavItems = document.querySelectorAll('.nav-profile');
    const authNavItems = document.querySelectorAll('.auth-nav');
    
    // Показываем элементы профиля
    profileNavItems.forEach(item => {
        item.style.display = 'list-item';
    });
    
    // Скрываем элементы авторизации
    authNavItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Если нужно показать информацию о пользователе в UI
    const userNameElements = document.querySelectorAll('.user-name');
    if (userNameElements.length > 0 && user.firstName) {
        userNameElements.forEach(el => {
            el.textContent = user.firstName;
        });
    }
    
    // Сохраняем данные пользователя в localStorage для быстрого доступа
    localStorage.setItem('searhJob_userData', JSON.stringify({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
    }));
}

// Обновление UI для неавторизованного пользователя
function updateUIForAnonymousUser() {
    // Находим элементы профиля и авторизации
    const profileNavItems = document.querySelectorAll('.nav-profile');
    const authNavItems = document.querySelectorAll('.auth-nav');
    
    // Скрываем элементы профиля
    profileNavItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Показываем элементы авторизации
    authNavItems.forEach(item => {
        item.style.display = 'list-item';
    });
    
    // Удаляем данные пользователя из localStorage
    localStorage.removeItem('searhJob_userData');
}

// Получение инициалов пользователя
function getInitials(firstName, lastName) {
    let initials = '';
    
    if (firstName) {
        initials += firstName.charAt(0).toUpperCase();
    }
    
    if (lastName) {
        initials += lastName.charAt(0).toUpperCase();
    }
    
    return initials || 'U';
}

// Инициализация обработчиков форм
function initFormHandlers() {
    // Форма поиска на главной странице
    const mainSearchForm = document.getElementById('search-form');
    if (mainSearchForm) {
        mainSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Получаем значения из полей
            const keywords = document.getElementById('search-keywords').value.trim();
            const location = document.getElementById('search-location').value.trim();
            
            // Строим URL для перехода на страницу результатов поиска
            let searchUrl = 'jobs.html?';
            
            if (keywords) {
                searchUrl += `q=${encodeURIComponent(keywords)}`;
            }
            
            if (location) {
                searchUrl += `${keywords ? '&' : ''}location=${encodeURIComponent(location)}`;
            }
            
            // Переходим на страницу результатов поиска
            window.location.href = searchUrl;
        });
    }
    
    // Форма авторизации
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Получаем данные формы
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            // Показываем индикатор загрузки
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Вход...';
            
            try {
                // Выполняем запрос на авторизацию
                const user = await AuthAPI.login(email, password);
                
                // Обновляем UI
                updateUIForAuthenticatedUser(user);
                
                // Показываем сообщение об успехе
                showMessage('success', 'Вход выполнен успешно!');
                
                // Перенаправляем на главную страницу или профиль
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } catch (error) {
                console.error('Login error:', error);
                showMessage('error', 'Ошибка входа. Проверьте email и пароль.');
                
                // Восстанавливаем кнопку
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Получаем данные формы
            const firstName = document.getElementById('register-firstName').value;
            const lastName = document.getElementById('register-lastName').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            // Показываем индикатор загрузки
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Регистрация...';
            
            try {
                // Выполняем запрос на регистрацию
                const userData = {
                    firstName,
                    lastName,
                    email,
                    password
                };
                
                const user = await AuthAPI.register(userData);
                
                // Обновляем UI
                updateUIForAuthenticatedUser(user);
                
                // Показываем сообщение об успехе
                showMessage('success', 'Регистрация выполнена успешно!');
                
                // Перенаправляем на главную страницу или профиль
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('error', 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.');
                
                // Восстанавливаем кнопку
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Кнопка выхода из системы
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', async function(event) {
            event.preventDefault();
            
            try {
                await AuthAPI.logout();
                updateUIForAnonymousUser();
                
                // Перенаправляем на главную страницу
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                showMessage('error', 'Ошибка при выходе из системы.');
            }
        });
    });
}

// Показать сообщение пользователю
function showMessage(type, message) {
    // Проверяем, существует ли контейнер для сообщений
    let messageContainer = document.querySelector('.message-container');
    
    if (!messageContainer) {
        // Если контейнера нет, создаем его
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '9999';
        document.body.appendChild(messageContainer);
    }
    
    // Создаем сообщение
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type === 'error' ? 'danger' : type}`;
    messageElement.textContent = message;
    messageElement.style.marginBottom = '10px';
    messageElement.style.minWidth = '250px';
    
    // Добавляем сообщение в контейнер
    messageContainer.appendChild(messageElement);
    
    // Удаляем сообщение через 5 секунд
    setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            messageContainer.removeChild(messageElement);
        }, 500);
    }, 5000);
}

// Инициализация навигации
function initNavigation() {
    // Подсветка активного пункта меню
    highlightActiveMenuItem();
    
    // Добавление плавной прокрутки для якорных ссылок
    initSmoothScroll();
}

// Подсветка активного пункта меню
function highlightActiveMenuItem() {
    // Получаем текущий путь страницы
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // Находим все ссылки в навигации
    const navLinks = document.querySelectorAll('nav a');
    
    // Перебираем ссылки
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Если ссылка соответствует текущей странице, добавляем класс 'active'
        if (href === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Инициализация плавной прокрутки
function initSmoothScroll() {
    // Обработка якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(event) {
            const targetId = this.getAttribute('href');
            
            // Проверяем, что ссылка указывает на существующий элемент
            if (targetId !== '#' && document.querySelector(targetId)) {
                event.preventDefault();
                
                // Плавно прокручиваем до целевого элемента
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Загрузка данных в зависимости от текущей страницы
function loadPageData() {
    // Получаем текущий путь страницы
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPath) {
        case 'index.html':
            loadHomePageData();
            break;
        case 'jobs.html':
            loadJobsPage();
            break;
        case 'job-details.html':
            loadJobDetailsPage();
            break;
        case 'companies.html':
            loadCompaniesPage();
            break;
        case 'company-details.html':
            loadCompanyDetailsPage();
            break;
        case 'profile.html':
            loadUserProfilePage();
            break;
    }
}

// Загрузка данных для главной страницы
async function loadHomePageData() {
    try {
        // Проверяем, доступны ли API объекты
        if (typeof JobsAPI === 'undefined' || typeof CompaniesAPI === 'undefined') {
            console.warn('API объекты не определены. Загрузка данных невозможна.');
            return;
        }
        
        // Находим контейнер для популярных вакансий
        const featuredJobsContainer = document.getElementById('featured-jobs');
        if (featuredJobsContainer) {
            // Загружаем популярные вакансии
            try {
                const jobs = await JobsAPI.getAllJobs(1, 3);
                if (jobs && jobs.length > 0) {
                    // Очищаем контейнер
                    featuredJobsContainer.innerHTML = '';
                    
                    // Добавляем вакансии на страницу
                    jobs.forEach(job => {
                        featuredJobsContainer.appendChild(createJobCard(job));
                    });
                }
            } catch (error) {
                console.error('Error loading featured jobs:', error);
            }
        }
        
        // Находим контейнер для лучших компаний
        const topCompaniesContainer = document.getElementById('top-companies');
        if (topCompaniesContainer) {
            // Загружаем лучшие компании
            try {
                const companies = await CompaniesAPI.getAllCompanies(1, 3);
                if (companies && companies.length > 0) {
                    // Очищаем контейнер
                    topCompaniesContainer.innerHTML = '';
                    
                    // Добавляем компании на страницу
                    companies.forEach(company => {
                        topCompaniesContainer.appendChild(createCompanyCard(company));
                    });
                }
            } catch (error) {
                console.error('Error loading top companies:', error);
            }
        }
    } catch (error) {
        console.error('Error loading home page data:', error);
    }
}

// Создание карточки вакансии
function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card animate-fade-in';
    
    // Определяем статус вакансии
    let statusBadge = '';
    if (job.isUrgent) {
        statusBadge = '<span class="badge badge-warning">Срочная</span>';
    } else if (job.isNew) {
        statusBadge = '<span class="badge badge-success">Новая</span>';
    } else if (job.isRemote) {
        statusBadge = '<span class="badge badge-primary">Удаленно</span>';
    }
    
    // Форматируем зарплату
    let salaryText = 'По договоренности';
    if (job.minSalary && job.maxSalary) {
        salaryText = `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()} ₽`;
    } else if (job.minSalary) {
        salaryText = `от ${job.minSalary.toLocaleString()} ₽`;
    } else if (job.maxSalary) {
        salaryText = `до ${job.maxSalary.toLocaleString()} ₽`;
    }
    
    // Создаем HTML для карточки вакансии
    jobCard.innerHTML = `
        <div class="job-header">
            <div>
                <h3 class="job-title">${job.title}</h3>
                <p class="job-company">${job.company.name || 'Компания'}</p>
            </div>
            <div class="job-logo">
                ${statusBadge}
            </div>
        </div>
        <p class="job-location"><i class="fas fa-map-marker-alt"></i> ${job.location || 'Не указано'}</p>
        <p class="job-salary">${salaryText}</p>
        <p class="job-description">${job.description ? job.description.substring(0, 150) + '...' : 'Описание отсутствует'}</p>
        <div class="job-tags">
            ${job.skills ? job.skills.map(skill => `<span class="tag">${skill}</span>`).join('') : ''}
        </div>
        <div class="card-actions">
            <a href="job-details.html?id=${job.id}" class="btn">Подробнее</a>
            <button class="btn btn-outline favorite-btn" data-id="${job.id}">
                <i class="far fa-bookmark"></i>
            </button>
        </div>
    `;
    
    // Добавляем обработчик для кнопки "Избранное"
    const favoriteBtn = jobCard.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function() {
        toggleFavoriteJob(job.id, this);
    });
    
    return jobCard;
}

// Создание карточки компании
function createCompanyCard(company) {
    const companyCard = document.createElement('div');
    companyCard.className = 'company-card animate-fade-in';
    
    // Определяем иконку отрасли
    let industryIcon = 'building';
    switch (company.industry) {
        case 'IT':
        case 'Информационные технологии':
            industryIcon = 'laptop-code';
            break;
        case 'Finance':
        case 'Финансы':
            industryIcon = 'coins';
            break;
        case 'Healthcare':
        case 'Здравоохранение':
            industryIcon = 'heartbeat';
            break;
        case 'Education':
        case 'Образование':
            industryIcon = 'graduation-cap';
            break;
        case 'Marketing':
        case 'Маркетинг':
            industryIcon = 'chart-line';
            break;
    }
    
    // Создаем HTML для карточки компании
    companyCard.innerHTML = `
        <div class="company-header">
            <div>
                <h3 class="company-name">${company.name}</h3>
                <p class="company-industry">${company.industry || 'Не указана'}</p>
            </div>
            <div class="company-logo" style="background-color: #f0f0f0; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 5px;">
                <i class="fas fa-${industryIcon}" style="font-size: 24px; color: #0056b3;"></i>
            </div>
        </div>
        <p class="company-location"><i class="fas fa-map-marker-alt"></i> ${company.location || 'Не указано'}</p>
        <p class="company-size">${company.size || 'Не указан'} сотрудников</p>
        <p class="company-description">${company.description ? company.description.substring(0, 150) + '...' : 'Описание отсутствует'}</p>
        <div class="company-tags">
            ${company.tags ? company.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
        </div>
        <div class="card-actions">
            <a href="company-details.html?id=${company.id}" class="btn">Подробнее</a>
            <a href="jobs.html?company=${company.id}" class="btn btn-outline">${company.jobCount || 0} вакансий</a>
        </div>
    `;
    
    return companyCard;
}

// Функция для добавления/удаления вакансии в избранное
async function toggleFavoriteJob(jobId, button) {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!AuthAPI.isAuthenticated()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    const icon = button.querySelector('i');
    const isFavorite = icon.classList.contains('fas');
    
    try {
        if (isFavorite) {
            // Удаляем из избранного
            await JobsAPI.removeFromFavorites(jobId);
            icon.classList.replace('fas', 'far');
            showMessage('success', 'Вакансия удалена из избранного');
        } else {
            // Добавляем в избранное
            await JobsAPI.addToFavorites(jobId);
            icon.classList.replace('far', 'fas');
            showMessage('success', 'Вакансия добавлена в избранное');
        }
    } catch (error) {
        console.error('Error toggling favorite status:', error);
        showMessage('error', 'Ошибка при изменении статуса избранного');
    }
}

// Функция для инициализации индикатора статуса API
function initApiStatusIndicator() {
    // Проверяем, доступен ли объект ApiStatus
    if (typeof ApiStatus === 'undefined') {
        console.warn('ApiStatus не определен. Пропускаем инициализацию индикатора статуса API.');
        return;
    }
    
    // Находим контейнер для индикатора статуса API
    const container = document.getElementById('api-status-container');
    if (container) {
        // Внедряем индикатор статуса
        ApiStatus.injectStatusIndicator('api-status-container');
        
        // Запрашиваем разрешение на уведомления
        ApiStatus.requestNotificationPermission();
        
        // Запускаем автоматическую проверку статуса API (каждую минуту)
        ApiStatus.startAutoCheck(60000);
    } else {
        console.warn('Контейнер для индикатора статуса API не найден.');
    }
    
    // Подписываемся на изменения статуса API
    ApiStatus.subscribeToStatusChanges(handleApiStatusChange);
}

// Обработчик изменений статуса API
function handleApiStatusChange(event) {
    console.log('Статус API изменился:', event);
    
    // Обработка различных изменений статуса
    if (event.oldStatus !== ApiStatus.connectionStatus.CONNECTED && 
        event.newStatus === ApiStatus.connectionStatus.CONNECTED) {
        // API только что стал доступен - можно выполнить дополнительные действия, например:
        console.log('API стал доступен, обновляем данные...');
        loadPageData(); // Обновляем данные на странице
    }
    
    // Если API перестал быть доступным
    if (event.oldStatus === ApiStatus.connectionStatus.CONNECTED && 
        event.newStatus !== ApiStatus.connectionStatus.CONNECTED && 
        event.newStatus !== ApiStatus.connectionStatus.CHECKING) {
        console.warn('API стал недоступен');
        // Можно показать сообщение пользователю или предпринять другие действия
    }
}

// Здесь будут реализованы остальные функции для работы с страницами
// (loadJobsPage, loadJobDetailsPage и т.д.)

// Функция для загрузки страницы вакансий
function loadJobsPage() {
    // Будет реализована позже
}

// Функция для загрузки страницы деталей вакансии
function loadJobDetailsPage() {
    // Будет реализована позже
}

// Функция для загрузки страницы компаний
function loadCompaniesPage() {
    // Будет реализована позже
}

// Функция для загрузки страницы деталей компании
function loadCompanyDetailsPage() {
    // Будет реализована позже
}

// Функция для загрузки страницы профиля пользователя
function loadUserProfilePage() {
    // Будет реализована позже
}
