/**
 * companies.js - функции для страницы компаний
 * 
 * Этот файл содержит функциональность, связанную с отображением списка компаний,
 * фильтрацией, поиском и взаимодействием с API для получения данных о компаниях.
 */

// Глобальные переменные для хранения состояния
let currentPage = 1;
let totalPages = 1;
let companiesPerPage = 12;
let currentFilters = {};
let currentCompanies = [];

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация страницы компаний
    initCompaniesPage();
});

/**
 * Инициализация страницы компаний
 */
function initCompaniesPage() {
    // Загружаем список компаний
    loadCompanies();
    
    // Инициализация формы поиска
    const searchForm = document.getElementById('companies-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            currentPage = 1; // Сбрасываем на первую страницу
            loadCompanies();
        });
    }
    
    // Инициализация фильтров
    const applyFiltersButton = document.getElementById('apply-filters');
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', function() {
            currentPage = 1; // Сбрасываем на первую страницу
            loadCompanies();
        });
    }
    
    // Обработка модального окна
    setupModalHandlers();
}

/**
 * Загрузка списка компаний с применением фильтров и поиска
 */
async function loadCompanies() {
    try {
        // Показываем индикатор загрузки
        const companiesContainer = document.getElementById('companies-container');
        companiesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка компаний...</div>';
        
        // Получаем параметры поиска и фильтрации
        const search = document.getElementById('company-search')?.value || '';
        const industry = document.getElementById('filter-industry')?.value || '';
        const size = document.getElementById('filter-size')?.value || '';
        
        // Формируем параметры запроса
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (industry) params.append('industry', industry);
        if (size) params.append('size', size);
        params.append('page', currentPage);
        params.append('per_page', companiesPerPage);
        
        // Запрашиваем компании через API
        let url = `${API_BASE_URL}/companies?${params.toString()}`;
        const response = await fetch(API.getCorsProxyUrl(url));
        
        // Обрабатываем ответ
        const data = await response.json();
        
        // Сохраняем полученные данные
        currentCompanies = data.companies || [];
        totalPages = data.pagination?.total_pages || 1;
        
        // Отображаем компании
        displayCompanies(currentCompanies);
        
        // Обновляем пагинацию
        updatePagination();
        
    } catch (error) {
        console.error('Error loading companies:', error);
        const companiesContainer = document.getElementById('companies-container');
        companiesContainer.innerHTML = '<div class="error-message">Произошла ошибка при загрузке компаний. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Отображение списка компаний
 */
function displayCompanies(companies) {
    const companiesContainer = document.getElementById('companies-container');
    
    // Очищаем контейнер
    companiesContainer.innerHTML = '';
    
    if (!companies || companies.length === 0) {
        companiesContainer.innerHTML = '<div class="no-results">Компании не найдены. Попробуйте изменить параметры поиска.</div>';
        return;
    }
    
    // Создаем контейнер для карточек
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'company-cards-grid';
    
    // Создаем HTML для каждой компании
    companies.forEach(company => {
        const companyCard = document.createElement('div');
        companyCard.className = 'company-card';
        companyCard.dataset.companyId = company.id;
        
        // Определяем количество открытых вакансий в компании
        const jobsCount = company.jobs_count || 0;
        
        companyCard.innerHTML = `
            <div class="company-card-header">
                <img src="${company.logo || 'img/company-placeholder.png'}" alt="${company.name}" class="company-logo">
            </div>
            <div class="company-card-body">
                <h3>${company.name}</h3>
                <p class="company-industry">${company.industry || 'Разные отрасли'}</p>
                <p class="company-location"><i class="fas fa-map-marker-alt"></i> ${company.location || 'Разные города'}</p>
                <p class="company-size"><i class="fas fa-users"></i> ${formatCompanySize(company.size)}</p>
                <p class="company-jobs-count"><i class="fas fa-briefcase"></i> ${jobsCount} ${declOfNum(jobsCount, ['вакансия', 'вакансии', 'вакансий'])}</p>
            </div>
            <div class="company-card-footer">
                <button class="btn view-company-btn" data-company-id="${company.id}">Подробнее</button>
            </div>
        `;
        
        cardsGrid.appendChild(companyCard);
        
        // Добавляем обработчик события для кнопки просмотра деталей
        const viewButton = companyCard.querySelector('.view-company-btn');
        viewButton.addEventListener('click', function() {
            viewCompanyDetails(company.id);
        });
    });
    
    companiesContainer.appendChild(cardsGrid);
}

/**
 * Обновление пагинации
 */
function updatePagination() {
    const paginationContainer = document.getElementById('companies-pagination');
    
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
    loadCompanies();
    
    // Прокручиваем страницу вверх
    window.scrollTo({
        top: document.querySelector('.companies-list').offsetTop - 100,
        behavior: 'smooth'
    });
}

/**
 * Просмотр деталей конкретной компании
 */
async function viewCompanyDetails(companyId) {
    try {
        // Показываем модальное окно
        const modal = document.getElementById('company-details-modal');
        const detailsContainer = document.getElementById('company-details-container');
        
        modal.style.display = 'block';
        detailsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка информации...</div>';
        
        // Проверяем, есть ли компания в текущем списке
        let companyDetails = currentCompanies.find(company => company.id == companyId);
        
        // Если нет, запрашиваем через API
        if (!companyDetails) {
            const url = `${API_BASE_URL}/companies/${companyId}`;
            const response = await fetch(API.getCorsProxyUrl(url));
            const data = await response.json();
            companyDetails = data.company;
        }
        
        if (!companyDetails) {
            detailsContainer.innerHTML = '<div class="error-message">Информация о компании не найдена.</div>';
            return;
        }
        
        // Запрашиваем вакансии компании
        const jobsUrl = `${API_BASE_URL}/jobs?company_id=${companyId}`;
        const jobsResponse = await fetch(API.getCorsProxyUrl(jobsUrl));
        const jobsData = await jobsResponse.json();
        const companyJobs = jobsData.jobs || [];
        
        // Формируем HTML с деталями компании
        detailsContainer.innerHTML = `
            <div class="company-details-header">
                <img src="${companyDetails.logo || 'img/company-placeholder.png'}" alt="${companyDetails.name}" class="company-logo">
                <div class="company-details-title">
                    <h2>${companyDetails.name}</h2>
                    <p class="company-industry">${companyDetails.industry || 'Разные отрасли'}</p>
                </div>
            </div>
            
            <div class="company-details-info">
                <div class="company-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${companyDetails.location || 'Разные города'}</span>
                </div>
                <div class="company-info-item">
                    <i class="fas fa-users"></i>
                    <span>${formatCompanySize(companyDetails.size)}</span>
                </div>
                <div class="company-info-item">
                    <i class="fas fa-globe"></i>
                    <span><a href="${companyDetails.website}" target="_blank">${companyDetails.website || 'Веб-сайт недоступен'}</a></span>
                </div>
            </div>
            
            <div class="company-details-section">
                <h3>О компании</h3>
                <div class="company-description">${companyDetails.description || 'Информация отсутствует'}</div>
            </div>
            
            <div class="company-details-section">
                <h3>Открытые вакансии</h3>
                <div class="company-jobs">
                    ${companyJobs.length > 0 
                        ? `<ul class="company-jobs-list">
                            ${companyJobs.map(job => `
                                <li class="company-job-item">
                                    <a href="jobs.html?id=${job.id}" class="company-job-link">
                                        <div class="company-job-title">${job.title}</div>
                                        <div class="company-job-location"><i class="fas fa-map-marker-alt"></i> ${job.location}</div>
                                        <div class="company-job-date">Опубликовано: ${formatDate(job.published_at)}</div>
                                    </a>
                                </li>
                            `).join('')}
                           </ul>` 
                        : '<div class="no-jobs">Нет открытых вакансий</div>'
                    }
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error viewing company details:', error);
        const detailsContainer = document.getElementById('company-details-container');
        detailsContainer.innerHTML = '<div class="error-message">Произошла ошибка при загрузке информации о компании. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Настройка обработчиков для модального окна
 */
function setupModalHandlers() {
    const modal = document.getElementById('company-details-modal');
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
 * Форматирование размера компании
 */
function formatCompanySize(size) {
    if (!size) return 'Размер не указан';
    
    switch (size) {
        case 'small':
            return 'Малый (до 50 человек)';
        case 'medium':
            return 'Средний (50-500 человек)';
        case 'large':
            return 'Крупный (более 500 человек)';
        default:
            return size;
    }
}

/**
 * Форматирование даты
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Функция для склонения слов в зависимости от числа
 */
function declOfNum(number, words) {
    return words[(number % 100 > 4 && number % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][(number % 10 < 5) ? number % 10 : 5]];
}
