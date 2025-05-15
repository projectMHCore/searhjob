/**
 * jobs.js - функции для страницы вакансий
 * 
 * Этот файл содержит функциональность, связанную с отображением списка вакансий,
 * фильтрацией, поиском и взаимодействием с API для получения данных о вакансиях.
 */

// Глобальные переменные для хранения состояния
let currentPage = 1;
let totalPages = 1;
let jobsPerPage = 10;
let currentFilters = {};
let currentJobs = [];

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация страницы вакансий
    initJobsPage();
});

/**
 * Инициализация страницы вакансий
 */
function initJobsPage() {
    // Загружаем список вакансий
    loadJobs();
    
    // Инициализация формы поиска
    const searchForm = document.getElementById('jobs-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            currentPage = 1; // Сбрасываем на первую страницу
            loadJobs();
        });
    }
    
    // Инициализация фильтров
    const applyFiltersButton = document.getElementById('apply-filters');
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', function() {
            currentPage = 1; // Сбрасываем на первую страницу
            loadJobs();
        });
    }
    
    // Обработка модального окна
    setupModalHandlers();
}

/**
 * Загрузка списка вакансий с применением фильтров и поиска
 */
async function loadJobs() {
    try {
        // Показываем индикатор загрузки
        const jobsContainer = document.getElementById('jobs-container');
        jobsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка вакансий...</div>';
        
        // Получаем параметры поиска и фильтрации
        const keywords = document.getElementById('job-search-keywords')?.value || '';
        const location = document.getElementById('job-search-location')?.value || '';
        const experience = document.getElementById('filter-exp')?.value || '';
        const employmentType = document.getElementById('filter-emp')?.value || '';
        const minSalary = document.getElementById('filter-salary')?.value || '';
        
        // Формируем параметры запроса
        const params = new URLSearchParams();
        if (keywords) params.append('keywords', keywords);
        if (location) params.append('location', location);
        if (experience) params.append('experience', experience);
        if (employmentType) params.append('employment_type', employmentType);
        if (minSalary) params.append('min_salary', minSalary);
        params.append('page', currentPage);
        params.append('per_page', jobsPerPage);
        
        // Запрашиваем вакансии через API
        let url = `${API_BASE_URL}/jobs/search?${params.toString()}`;
        const response = await fetch(API.getCorsProxyUrl(url));
        
        // Обрабатываем ответ
        const data = await response.json();
        
        // Сохраняем полученные данные
        currentJobs = data.jobs || [];
        totalPages = data.pagination?.total_pages || 1;
        
        // Отображаем вакансии
        displayJobs(currentJobs);
        
        // Обновляем пагинацию
        updatePagination();
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        const jobsContainer = document.getElementById('jobs-container');
        jobsContainer.innerHTML = '<div class="error-message">Произошла ошибка при загрузке вакансий. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Отображение списка вакансий
 */
function displayJobs(jobs) {
    const jobsContainer = document.getElementById('jobs-container');
    
    // Очищаем контейнер
    jobsContainer.innerHTML = '';
    
    if (!jobs || jobs.length === 0) {
        jobsContainer.innerHTML = '<div class="no-results">Вакансии не найдены. Попробуйте изменить параметры поиска.</div>';
        return;
    }
    
    // Создаем HTML для каждой вакансии
    jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.dataset.jobId = job.id;
        
        // Форматируем дату публикации
        const publishDate = new Date(job.published_at);
        const publishedAgo = formatTimeAgo(publishDate);
        
        // Форматирование зарплаты
        const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
        
        jobCard.innerHTML = `
            <div class="job-card-header">
                <img src="${job.company_logo || 'img/company-placeholder.png'}" alt="${job.company_name}" class="company-logo">
                <div class="job-card-title">
                    <h3>${job.title}</h3>
                    <p class="company-name">${job.company_name}</p>
                </div>
            </div>
            <div class="job-card-body">
                <div class="job-details">
                    <p><i class="fas fa-map-marker-alt"></i> ${job.location}</p>
                    <p><i class="fas fa-clock"></i> ${job.employment_type}</p>
                    ${salary ? `<p><i class="fas fa-money-bill-wave"></i> ${salary}</p>` : ''}
                </div>
                <p class="job-description">${truncateText(job.description, 150)}</p>
            </div>
            <div class="job-card-footer">
                <span class="job-date">${publishedAgo}</span>
                <button class="btn view-job-btn" data-job-id="${job.id}">Подробнее</button>
            </div>
        `;
        
        jobsContainer.appendChild(jobCard);
        
        // Добавляем обработчик события для кнопки просмотра деталей
        const viewButton = jobCard.querySelector('.view-job-btn');
        viewButton.addEventListener('click', function() {
            viewJobDetails(job.id);
        });
    });
}

/**
 * Обновление пагинации
 */
function updatePagination() {
    const paginationContainer = document.getElementById('jobs-pagination');
    
    // Очищаем контейнер
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        return; // Не показываем пагинацию, если страница всего одна
    }
    
    // Определяем диапазон страниц для отображения
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Кнопка "Предыдущая страница"
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '&laquo; Назад';
        prevButton.addEventListener('click', function() {
            goToPage(currentPage - 1);
        });
        paginationContainer.appendChild(prevButton);
    }
    
    // Кнопки с номерами страниц
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = i === currentPage ? 'pagination-btn active' : 'pagination-btn';
        pageButton.textContent = i;
        pageButton.addEventListener('click', function() {
            goToPage(i);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // Кнопка "Следующая страница"
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = 'Вперед &raquo;';
        nextButton.addEventListener('click', function() {
            goToPage(currentPage + 1);
        });
        paginationContainer.appendChild(nextButton);
    }
}

/**
 * Переход на указанную страницу
 */
function goToPage(page) {
    if (page < 1 || page > totalPages) {
        return;
    }
    
    currentPage = page;
    loadJobs();
    
    // Прокручиваем страницу вверх
    window.scrollTo({
        top: document.querySelector('.jobs-list').offsetTop - 100,
        behavior: 'smooth'
    });
}

/**
 * Просмотр деталей конкретной вакансии
 */
async function viewJobDetails(jobId) {
    try {
        // Показываем модальное окно
        const modal = document.getElementById('job-details-modal');
        const detailsContainer = document.getElementById('job-details-container');
        
        modal.style.display = 'block';
        detailsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка информации...</div>';
        
        // Проверяем, есть ли вакансия в текущем списке
        let jobDetails = currentJobs.find(job => job.id == jobId);
        
        // Если нет, запрашиваем через API
        if (!jobDetails) {
            const url = `${API_BASE_URL}/jobs/${jobId}`;
            const response = await fetch(API.getCorsProxyUrl(url));
            const data = await response.json();
            jobDetails = data.job;
        }
        
        if (!jobDetails) {
            detailsContainer.innerHTML = '<div class="error-message">Информация о вакансии не найдена.</div>';
            return;
        }
        
        // Форматирование зарплаты
        const salary = formatSalary(jobDetails.salary_min, jobDetails.salary_max, jobDetails.currency);
        
        // Форматируем дату публикации
        const publishDate = new Date(jobDetails.published_at);
        const publishedFormatted = new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(publishDate);
        
        // Формируем HTML с деталями вакансии
        detailsContainer.innerHTML = `
            <div class="job-details-header">
                <img src="${jobDetails.company_logo || 'img/company-placeholder.png'}" alt="${jobDetails.company_name}" class="company-logo">
                <div class="job-details-title">
                    <h2>${jobDetails.title}</h2>
                    <p class="company-name">${jobDetails.company_name}</p>
                </div>
            </div>
            
            <div class="job-details-info">
                <div class="job-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${jobDetails.location}</span>
                </div>
                <div class="job-info-item">
                    <i class="fas fa-clock"></i>
                    <span>${jobDetails.employment_type}</span>
                </div>
                ${salary ? `
                <div class="job-info-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${salary}</span>
                </div>` : ''}
                <div class="job-info-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Опубликовано: ${publishedFormatted}</span>
                </div>
                ${jobDetails.experience ? `
                <div class="job-info-item">
                    <i class="fas fa-briefcase"></i>
                    <span>Требуемый опыт: ${jobDetails.experience}</span>
                </div>` : ''}
            </div>
            
            <div class="job-details-section">
                <h3>Описание вакансии</h3>
                <div class="job-description">${jobDetails.description}</div>
            </div>
            
            ${jobDetails.requirements ? `
            <div class="job-details-section">
                <h3>Требования</h3>
                <div class="job-requirements">${jobDetails.requirements}</div>
            </div>` : ''}
            
            ${jobDetails.benefits ? `
            <div class="job-details-section">
                <h3>Мы предлагаем</h3>
                <div class="job-benefits">${jobDetails.benefits}</div>
            </div>` : ''}
            
            <div class="job-details-footer">
                <button id="apply-job-btn" class="btn primary" data-job-id="${jobDetails.id}">Откликнуться на вакансию</button>
                <button id="save-job-btn" class="btn secondary" data-job-id="${jobDetails.id}">
                    <i class="far fa-bookmark"></i> Сохранить
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки "Откликнуться"
        const applyButton = document.getElementById('apply-job-btn');
        if (applyButton) {
            applyButton.addEventListener('click', function() {
                applyForJob(jobId);
            });
        }
        
        // Добавляем обработчик для кнопки "Сохранить"
        const saveButton = document.getElementById('save-job-btn');
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                saveJob(jobId);
            });
        }
        
    } catch (error) {
        console.error('Error viewing job details:', error);
        const detailsContainer = document.getElementById('job-details-container');
        detailsContainer.innerHTML = '<div class="error-message">Произошла ошибка при загрузке информации о вакансии. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Настройка обработчиков для модального окна
 */
function setupModalHandlers() {
    const modal = document.getElementById('job-details-modal');
    const closeBtn = modal.querySelector('.close');
    
    // Закрытие по клику на крестик
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Отклик на вакансию
 */
async function applyForJob(jobId) {
    try {
        // Проверяем, авторизован ли пользователь
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            alert('Для отклика на вакансию необходимо авторизоваться.');
            window.location.href = 'login.html';
            return;
        }
        
        // Запрашиваем данные формы отклика
        // В реальном проекте здесь можно показать форму для заполнения деталей отклика
        const confirmed = confirm('Вы уверены, что хотите откликнуться на эту вакансию?');
        if (!confirmed) {
            return;
        }
        
        // Отправляем запрос на API
        const url = `${API_BASE_URL}/applications/create/${jobId}`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Ваш отклик успешно отправлен!');
            // Закрываем модальное окно
            document.getElementById('job-details-modal').style.display = 'none';
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось отправить отклик'}`);
        }
        
    } catch (error) {
        console.error('Error applying for job:', error);
        alert('Произошла ошибка при отклике на вакансию. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Сохранение вакансии
 */
async function saveJob(jobId) {
    try {
        // Проверяем, авторизован ли пользователь
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            alert('Для сохранения вакансии необходимо авторизоваться.');
            window.location.href = 'login.html';
            return;
        }
        
        // Отправляем запрос на API
        const url = `${API_BASE_URL}/saved-jobs/add/${jobId}`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Вакансия сохранена!');
            
            // Обновляем кнопку
            const saveButton = document.getElementById('save-job-btn');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Сохранено';
                saveButton.disabled = true;
            }
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось сохранить вакансию'}`);
        }
        
    } catch (error) {
        console.error('Error saving job:', error);
        alert('Произошла ошибка при сохранении вакансии. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Проверка аутентификации пользователя
 */
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    return !!token;
}

/**
 * Вспомогательная функция для форматирования даты "сколько времени прошло"
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Только что';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} ${declOfNum(diffInMinutes, ['минуту', 'минуты', 'минут'])} назад`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} ${declOfNum(diffInHours, ['час', 'часа', 'часов'])} назад`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} ${declOfNum(diffInDays, ['день', 'дня', 'дней'])} назад`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} ${declOfNum(diffInMonths, ['месяц', 'месяца', 'месяцев'])} назад`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} ${declOfNum(diffInYears, ['год', 'года', 'лет'])} назад`;
}

/**
 * Функция для склонения слов в зависимости от числа
 */
function declOfNum(number, words) {
    return words[(number % 100 > 4 && number % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][(number % 10 < 5) ? number % 10 : 5]];
}

/**
 * Вспомогательная функция для форматирования зарплаты
 */
function formatSalary(min, max, currency) {
    if (!min && !max) {
        return '';
    }
    
    const currencySymbol = getCurrencySymbol(currency);
    
    if (min && max) {
        return `${formatNumber(min)}–${formatNumber(max)} ${currencySymbol}`;
    } else if (min) {
        return `от ${formatNumber(min)} ${currencySymbol}`;
    } else {
        return `до ${formatNumber(max)} ${currencySymbol}`;
    }
}

/**
 * Получение символа валюты
 */
function getCurrencySymbol(currency) {
    switch (currency) {
        case 'RUB':
            return '₽';
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        default:
            return currency || '₽';
    }
}

/**
 * Форматирование числа с разделителями
 */
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Обрезка текста до указанной длины
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}
