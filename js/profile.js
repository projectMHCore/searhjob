/**
 * profile.js - функции для страницы профиля пользователя
 * 
 * Этот файл содержит функциональность, связанную с отображением и редактированием
 * профиля пользователя, его сохраненных вакансий, откликов и резюме.
 */

// Глобальные переменные
let currentUser = null;
let userResume = null;

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация страницы профиля
    initProfilePage();
});

/**
 * Инициализация страницы профиля
 */
async function initProfilePage() {
    // Проверка авторизации
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotAuthenticatedUI();
            return;
        }
        
        // Получаем данные пользователя
        const userData = await getUserData(token);
        if (!userData) {
            showNotAuthenticatedUI();
            return;
        }
        
        // Сохраняем данные пользователя
        currentUser = userData;
        
        // Показываем интерфейс для авторизованного пользователя
        showAuthenticatedUI();
        
        // Заполняем данные профиля
        populateProfileData();
        
        // Настраиваем табы
        setupTabs();
        
        // Настраиваем формы
        setupForms();
        
        // Настраиваем резюме
        setupResume();
        
        // Загружаем сохраненные вакансии и отклики
        loadSavedJobs();
        loadApplications();
        
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showNotAuthenticatedUI();
    }
}

/**
 * Получение данных пользователя
 */
async function getUserData(token) {
    try {
        const url = `${API_BASE_URL}/users/profile`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.user;
        
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Показать интерфейс для неавторизованных пользователей
 */
function showNotAuthenticatedUI() {
    document.getElementById('not-authenticated').style.display = 'block';
    document.getElementById('authenticated').style.display = 'none';
}

/**
 * Показать интерфейс для авторизованных пользователей
 */
function showAuthenticatedUI() {
    document.getElementById('not-authenticated').style.display = 'none';
    document.getElementById('authenticated').style.display = 'block';
}

/**
 * Заполнение данных профиля из объекта пользователя
 */
function populateProfileData() {
    if (!currentUser) return;
    
    // Заполняем основную информацию
    document.getElementById('profile-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profile-email').textContent = currentUser.email;
    
    if (currentUser.avatar) {
        document.getElementById('profile-avatar').src = currentUser.avatar;
    }
    
    // Заполняем форму
    document.getElementById('profile-firstName').value = currentUser.firstName || '';
    document.getElementById('profile-lastName').value = currentUser.lastName || '';
    document.getElementById('profile-emailInput').value = currentUser.email || '';
    document.getElementById('profile-phone').value = currentUser.phone || '';
    document.getElementById('profile-location').value = currentUser.location || '';
}

/**
 * Настройка табов на странице профиля
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Удаляем активный класс со всех табов
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс на текущий таб
            this.classList.add('active');
            
            // Скрываем все содержимое табов
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Показываем содержимое выбранного таба
            const tabId = this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Настройка форм на странице профиля
 */
function setupForms() {
    // Форма профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await updateProfile();
        });
    }
    
    // Форма смены пароля
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await updatePassword();
        });
    }
}

/**
 * Обновление профиля пользователя
 */
async function updateProfile() {
    try {
        const firstName = document.getElementById('profile-firstName').value;
        const lastName = document.getElementById('profile-lastName').value;
        const phone = document.getElementById('profile-phone').value;
        const location = document.getElementById('profile-location').value;
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#profile-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
        
        // Отправляем запрос на обновление данных
        const url = `${API_BASE_URL}/users/profile/update`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName,
                lastName,
                phone,
                location
            })
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        
        if (data.success) {
            // Обновляем данные пользователя
            currentUser = data.user || currentUser;
            
            // Обновляем отображение данных
            populateProfileData();
            
            // Показываем сообщение об успехе
            alert('Профиль успешно обновлен!');
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось обновить профиль'}`);
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Произошла ошибка при обновлении профиля. Пожалуйста, попробуйте позже.');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#profile-form button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить изменения';
    }
}

/**
 * Обновление пароля пользователя
 */
async function updatePassword() {
    try {
        const currentPassword = document.getElementById('profile-currentPassword').value;
        const newPassword = document.getElementById('profile-newPassword').value;
        const confirmPassword = document.getElementById('profile-confirmPassword').value;
        
        // Проверяем, совпадают ли пароли
        if (newPassword !== confirmPassword) {
            alert('Новый пароль и подтверждение не совпадают!');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#password-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Изменение...';
        
        // Отправляем запрос на обновление пароля
        const url = `${API_BASE_URL}/users/password/update`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        
        if (data.success) {
            // Очищаем форму
            document.getElementById('password-form').reset();
            
            // Показываем сообщение об успехе
            alert('Пароль успешно изменен!');
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось изменить пароль'}`);
        }
        
    } catch (error) {
        console.error('Error updating password:', error);
        alert('Произошла ошибка при изменении пароля. Пожалуйста, попробуйте позже.');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#password-form button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Изменить пароль';
    }
}

/**
 * Настройка раздела резюме
 */
async function setupResume() {
    try {
        // Проверяем наличие резюме у пользователя
        await loadUserResume();
        
        // Настраиваем кнопки
        document.getElementById('create-resume-btn')?.addEventListener('click', function() {
            showResumeForm();
        });
        
        document.getElementById('edit-resume-btn')?.addEventListener('click', function() {
            showResumeForm(userResume);
        });
        
        document.getElementById('cancel-resume-btn')?.addEventListener('click', function() {
            hideResumeForm();
        });
        
        // Настраиваем форму резюме
        const resumeForm = document.getElementById('resume-form');
        if (resumeForm) {
            resumeForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                await saveResume();
            });
        }
        
        // Настраиваем кнопки добавления образования и опыта работы
        document.getElementById('add-education-btn')?.addEventListener('click', function() {
            addEducationBlock();
        });
        
        document.getElementById('add-experience-btn')?.addEventListener('click', function() {
            addExperienceBlock();
        });
        
        // Настраиваем кнопку скачивания резюме
        document.getElementById('download-resume-btn')?.addEventListener('click', function() {
            downloadResume();
        });
        
    } catch (error) {
        console.error('Error setting up resume:', error);
    }
}

/**
 * Загрузка резюме пользователя
 */
async function loadUserResume() {
    try {
        const url = `${API_BASE_URL}/resume`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                // У пользователя нет резюме
                userResume = null;
                showNoResumeUI();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        userResume = data.resume;
        
        if (userResume) {
            // Показываем резюме
            showResumeViewUI();
        } else {
            showNoResumeUI();
        }
        
    } catch (error) {
        console.error('Error loading resume:', error);
        showNoResumeUI();
    }
}

/**
 * Показать UI для создания резюме
 */
function showNoResumeUI() {
    document.getElementById('no-resume').style.display = 'block';
    document.getElementById('resume-form').style.display = 'none';
    document.getElementById('resume-view').style.display = 'none';
}

/**
 * Показать форму резюме
 */
function showResumeForm(resumeData = null) {
    document.getElementById('no-resume').style.display = 'none';
    document.getElementById('resume-form').style.display = 'block';
    document.getElementById('resume-view').style.display = 'none';
    
    // Очищаем форму
    document.getElementById('resume-form').reset();
    document.getElementById('education-container').innerHTML = '';
    document.getElementById('experience-container').innerHTML = '';
    
    // Если передано резюме, заполняем форму его данными
    if (resumeData) {
        document.getElementById('resume-title').value = resumeData.title || '';
        document.getElementById('resume-profession').value = resumeData.profession || '';
        document.getElementById('resume-experience').value = resumeData.experience || 'no-exp';
        document.getElementById('resume-salary').value = resumeData.salary || '';
        document.getElementById('resume-currency').value = resumeData.currency || 'RUB';
        document.getElementById('resume-about').value = resumeData.about || '';
        document.getElementById('resume-skills').value = resumeData.skills?.join(', ') || '';
        
        // Добавляем блоки образования
        if (resumeData.education && resumeData.education.length > 0) {
            resumeData.education.forEach(edu => {
                addEducationBlock(edu);
            });
        } else {
            // Добавляем пустой блок образования
            addEducationBlock();
        }
        
        // Добавляем блоки опыта работы
        if (resumeData.experience_items && resumeData.experience_items.length > 0) {
            resumeData.experience_items.forEach(exp => {
                addExperienceBlock(exp);
            });
        } else {
            // Добавляем пустой блок опыта работы
            addExperienceBlock();
        }
    } else {
        // Добавляем пустые блоки
        addEducationBlock();
        addExperienceBlock();
    }
}

/**
 * Показать просмотр резюме
 */
function showResumeViewUI() {
    if (!userResume) return;
    
    document.getElementById('no-resume').style.display = 'none';
    document.getElementById('resume-form').style.display = 'none';
    document.getElementById('resume-view').style.display = 'block';
    
    const resumeContent = document.getElementById('resume-content');
    
    // Форматируем опыт работы
    const experience = formatExperienceText(userResume.experience);
    
    // Форматируем зарплату
    const salary = formatSalary(userResume.salary, userResume.currency);
    
    // Формируем HTML резюме
    let html = `
        <div class="resume-header">
            <h2>${userResume.title}</h2>
            <div class="resume-info">
                <p><strong>Профессия:</strong> ${userResume.profession}</p>
                ${experience ? `<p><strong>Опыт работы:</strong> ${experience}</p>` : ''}
                ${salary ? `<p><strong>Желаемая зарплата:</strong> ${salary}</p>` : ''}
            </div>
        </div>
        
        <div class="resume-section">
            <h3>О себе</h3>
            <div class="resume-about">${userResume.about || 'Информация не указана'}</div>
        </div>
    `;
    
    // Добавляем образование
    if (userResume.education && userResume.education.length > 0) {
        html += `
            <div class="resume-section">
                <h3>Образование</h3>
                <div class="resume-education">
                    <ul>
        `;
        
        userResume.education.forEach(edu => {
            html += `
                <li>
                    <div class="education-item">
                        <div class="education-period">${edu.start_year} - ${edu.end_year || 'по настоящее время'}</div>
                        <div class="education-info">
                            <h4>${edu.institution}</h4>
                            <p>${edu.faculty || ''} ${edu.specialization ? `, ${edu.specialization}` : ''}</p>
                            ${edu.degree ? `<p>Степень: ${edu.degree}</p>` : ''}
                        </div>
                    </div>
                </li>
            `;
        });
        
        html += `
                    </ul>
                </div>
            </div>
        `;
    }
    
    // Добавляем опыт работы
    if (userResume.experience_items && userResume.experience_items.length > 0) {
        html += `
            <div class="resume-section">
                <h3>Опыт работы</h3>
                <div class="resume-work-experience">
                    <ul>
        `;
        
        userResume.experience_items.forEach(exp => {
            const startDate = formatMonthYear(exp.start_date);
            const endDate = exp.current ? 'по настоящее время' : formatMonthYear(exp.end_date);
            
            html += `
                <li>
                    <div class="experience-item">
                        <div class="experience-period">${startDate} - ${endDate}</div>
                        <div class="experience-info">
                            <h4>${exp.position}</h4>
                            <p class="company-name">${exp.company}</p>
                            ${exp.location ? `<p class="company-location">${exp.location}</p>` : ''}
                            <div class="experience-description">${exp.description || ''}</div>
                        </div>
                    </div>
                </li>
            `;
        });
        
        html += `
                    </ul>
                </div>
            </div>
        `;
    }
    
    // Добавляем навыки
    if (userResume.skills && userResume.skills.length > 0) {
        html += `
            <div class="resume-section">
                <h3>Навыки</h3>
                <div class="resume-skills">
                    <div class="skills-list">
                        ${userResume.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Контактная информация
    html += `
        <div class="resume-section">
            <h3>Контактная информация</h3>
            <div class="resume-contacts">
                <p><strong>Email:</strong> ${currentUser.email}</p>
                ${currentUser.phone ? `<p><strong>Телефон:</strong> ${currentUser.phone}</p>` : ''}
                ${currentUser.location ? `<p><strong>Город:</strong> ${currentUser.location}</p>` : ''}
            </div>
        </div>
    `;
    
    resumeContent.innerHTML = html;
}

/**
 * Скрыть форму резюме
 */
function hideResumeForm() {
    if (userResume) {
        showResumeViewUI();
    } else {
        showNoResumeUI();
    }
}

/**
 * Добавление блока образования в форму
 */
function addEducationBlock(educationData = null) {
    const container = document.getElementById('education-container');
    const blockId = `education-block-${Date.now()}`;
    
    const block = document.createElement('div');
    block.className = 'education-block';
    block.id = blockId;
    
    block.innerHTML = `
        <div class="education-header">
            <h4>Учебное заведение</h4>
            <button type="button" class="remove-block-btn" data-block-id="${blockId}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="form-group">
            <label>Название учебного заведения</label>
            <input type="text" name="education_institution[]" value="${educationData?.institution || ''}" required>
        </div>
        <div class="form-group">
            <label>Факультет</label>
            <input type="text" name="education_faculty[]" value="${educationData?.faculty || ''}">
        </div>
        <div class="form-group">
            <label>Специализация</label>
            <input type="text" name="education_specialization[]" value="${educationData?.specialization || ''}">
        </div>
        <div class="form-group">
            <label>Степень/Квалификация</label>
            <input type="text" name="education_degree[]" value="${educationData?.degree || ''}">
        </div>
        <div class="form-row">
            <div class="form-group half">
                <label>Год начала</label>
                <input type="number" name="education_start_year[]" min="1950" max="2030" value="${educationData?.start_year || ''}" required>
            </div>
            <div class="form-group half">
                <label>Год окончания</label>
                <input type="number" name="education_end_year[]" min="1950" max="2030" value="${educationData?.end_year || ''}">
                <div class="checkbox-group">
                    <input type="checkbox" name="education_current[]" id="education-current-${blockId}" ${!educationData?.end_year ? 'checked' : ''}>
                    <label for="education-current-${blockId}">По настоящее время</label>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(block);
    
    // Добавляем обработчик для кнопки удаления
    block.querySelector('.remove-block-btn').addEventListener('click', function() {
        const blockId = this.dataset.blockId;
        const blockToRemove = document.getElementById(blockId);
        if (blockToRemove) {
            blockToRemove.remove();
        }
    });
}

/**
 * Добавление блока опыта работы в форму
 */
function addExperienceBlock(experienceData = null) {
    const container = document.getElementById('experience-container');
    const blockId = `experience-block-${Date.now()}`;
    
    const block = document.createElement('div');
    block.className = 'experience-block';
    block.id = blockId;
    
    // Подготовка дат для полей ввода
    let startDate = '';
    let endDate = '';
    
    if (experienceData) {
        if (experienceData.start_date) {
            startDate = experienceData.start_date.substring(0, 7); // формат YYYY-MM
        }
        
        if (experienceData.end_date) {
            endDate = experienceData.end_date.substring(0, 7); // формат YYYY-MM
        }
    }
    
    block.innerHTML = `
        <div class="experience-header">
            <h4>Место работы</h4>
            <button type="button" class="remove-block-btn" data-block-id="${blockId}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="form-group">
            <label>Название компании</label>
            <input type="text" name="experience_company[]" value="${experienceData?.company || ''}" required>
        </div>
        <div class="form-group">
            <label>Должность</label>
            <input type="text" name="experience_position[]" value="${experienceData?.position || ''}" required>
        </div>
        <div class="form-group">
            <label>Местоположение</label>
            <input type="text" name="experience_location[]" value="${experienceData?.location || ''}">
        </div>
        <div class="form-row">
            <div class="form-group half">
                <label>Дата начала</label>
                <input type="month" name="experience_start_date[]" value="${startDate}" required>
            </div>
            <div class="form-group half">
                <label>Дата окончания</label>
                <input type="month" name="experience_end_date[]" value="${endDate}" ${experienceData?.current ? 'disabled' : ''}>
                <div class="checkbox-group">
                    <input type="checkbox" name="experience_current[]" id="experience-current-${blockId}" ${experienceData?.current ? 'checked' : ''}>
                    <label for="experience-current-${blockId}">По настоящее время</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>Описание обязанностей и достижений</label>
            <textarea name="experience_description[]" rows="3">${experienceData?.description || ''}</textarea>
        </div>
    `;
    
    container.appendChild(block);
    
    // Добавляем обработчик для кнопки удаления
    block.querySelector('.remove-block-btn').addEventListener('click', function() {
        const blockId = this.dataset.blockId;
        const blockToRemove = document.getElementById(blockId);
        if (blockToRemove) {
            blockToRemove.remove();
        }
    });
    
    // Добавляем обработчик для чекбокса "По настоящее время"
    const currentCheckbox = block.querySelector(`#experience-current-${blockId}`);
    const endDateInput = block.querySelector('input[name="experience_end_date[]"]');
    
    currentCheckbox.addEventListener('change', function() {
        if (this.checked) {
            endDateInput.disabled = true;
            endDateInput.value = '';
        } else {
            endDateInput.disabled = false;
        }
    });
}

/**
 * Сохранение резюме
 */
async function saveResume() {
    try {
        // Собираем данные из формы
        const title = document.getElementById('resume-title').value;
        const profession = document.getElementById('resume-profession').value;
        const experience = document.getElementById('resume-experience').value;
        const salary = document.getElementById('resume-salary').value;
        const currency = document.getElementById('resume-currency').value;
        const about = document.getElementById('resume-about').value;
        
        // Получаем навыки и разбиваем их на массив
        const skillsInput = document.getElementById('resume-skills').value;
        const skills = skillsInput.split(',').map(skill => skill.trim()).filter(skill => skill);
        
        // Собираем данные об образовании
        const educationData = [];
        const educationBlocks = document.querySelectorAll('.education-block');
        
        educationBlocks.forEach(block => {
            const institution = block.querySelector('input[name="education_institution[]"]').value;
            
            // Пропускаем пустые блоки
            if (!institution) return;
            
            const facultyInput = block.querySelector('input[name="education_faculty[]"]');
            const specializationInput = block.querySelector('input[name="education_specialization[]"]');
            const degreeInput = block.querySelector('input[name="education_degree[]"]');
            const startYearInput = block.querySelector('input[name="education_start_year[]"]');
            const endYearInput = block.querySelector('input[name="education_end_year[]"]');
            const currentCheckbox = block.querySelector('input[type="checkbox"]');
            
            educationData.push({
                institution,
                faculty: facultyInput ? facultyInput.value : '',
                specialization: specializationInput ? specializationInput.value : '',
                degree: degreeInput ? degreeInput.value : '',
                start_year: startYearInput ? startYearInput.value : '',
                end_year: currentCheckbox && currentCheckbox.checked ? null : (endYearInput ? endYearInput.value : '')
            });
        });
        
        // Собираем данные об опыте работы
        const experienceItems = [];
        const experienceBlocks = document.querySelectorAll('.experience-block');
        
        experienceBlocks.forEach(block => {
            const company = block.querySelector('input[name="experience_company[]"]').value;
            const position = block.querySelector('input[name="experience_position[]"]').value;
            
            // Пропускаем пустые блоки
            if (!company || !position) return;
            
            const locationInput = block.querySelector('input[name="experience_location[]"]');
            const startDateInput = block.querySelector('input[name="experience_start_date[]"]');
            const endDateInput = block.querySelector('input[name="experience_end_date[]"]');
            const currentCheckbox = block.querySelector('input[name="experience_current[]"]');
            const descriptionInput = block.querySelector('textarea[name="experience_description[]"]');
            
            experienceItems.push({
                company,
                position,
                location: locationInput ? locationInput.value : '',
                start_date: startDateInput ? `${startDateInput.value}-01` : '', // Добавляем день к формату YYYY-MM
                end_date: currentCheckbox && currentCheckbox.checked ? null : (endDateInput ? `${endDateInput.value}-01` : ''), // Добавляем день к формату YYYY-MM
                current: currentCheckbox ? currentCheckbox.checked : false,
                description: descriptionInput ? descriptionInput.value : ''
            });
        });
        
        // Собираем все данные в один объект
        const resumeData = {
            title,
            profession,
            experience,
            salary: salary ? parseFloat(salary) : null,
            currency,
            about,
            skills,
            education: educationData,
            experience_items: experienceItems
        };
        
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#resume-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
        
        // Отправляем запрос на сохранение или обновление резюме
        const method = userResume ? 'PUT' : 'POST';
        const url = `${API_BASE_URL}/resume${userResume ? `/${userResume.id}` : ''}`;
        
        const response = await fetch(API.getCorsProxyUrl(url), {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resumeData)
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        
        if (data.success) {
            // Обновляем резюме пользователя
            userResume = data.resume;
            
            // Показываем резюме
            showResumeViewUI();
            
            // Показываем сообщение об успехе
            alert('Резюме успешно сохранено!');
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось сохранить резюме'}`);
        }
        
    } catch (error) {
        console.error('Error saving resume:', error);
        alert('Произошла ошибка при сохранении резюме. Пожалуйста, попробуйте позже.');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#resume-form button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить резюме';
    }
}

/**
 * Загрузка сохраненных вакансий
 */
async function loadSavedJobs() {
    try {
        const container = document.getElementById('saved-jobs-container');
        
        // Показываем индикатор загрузки
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка сохраненных вакансий...</div>';
        
        // Загружаем данные
        const url = `${API_BASE_URL}/saved-jobs`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        const savedJobs = data.jobs || [];
        
        if (savedJobs.length === 0) {
            container.innerHTML = '<div class="no-items-message">У вас нет сохраненных вакансий.</div>';
            return;
        }
        
        // Отображаем вакансии
        container.innerHTML = '';
        savedJobs.forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'saved-job-card';
            jobCard.dataset.jobId = job.id;
            
            const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
            
            jobCard.innerHTML = `
                <div class="saved-job-info">
                    <h3 class="job-title">
                        <a href="jobs.html?id=${job.id}" class="job-link">${job.title}</a>
                    </h3>
                    <p class="company-name">${job.company_name}</p>
                    <div class="job-details">
                        <span class="job-location"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                        ${salary ? `<span class="job-salary"><i class="fas fa-money-bill-wave"></i> ${salary}</span>` : ''}
                    </div>
                </div>
                <div class="saved-job-actions">
                    <button class="btn small view-job-btn" data-job-id="${job.id}">Просмотреть</button>
                    <button class="btn small secondary remove-saved-btn" data-job-id="${job.id}">Удалить</button>
                </div>
            `;
            
            container.appendChild(jobCard);
            
            // Добавляем обработчик для кнопки просмотра
            jobCard.querySelector('.view-job-btn').addEventListener('click', function() {
                window.location.href = `jobs.html?id=${job.id}`;
            });
            
            // Добавляем обработчик для кнопки удаления
            jobCard.querySelector('.remove-saved-btn').addEventListener('click', async function() {
                const jobId = this.dataset.jobId;
                await removeSavedJob(jobId);
            });
        });
        
    } catch (error) {
        console.error('Error loading saved jobs:', error);
        document.getElementById('saved-jobs-container').innerHTML = '<div class="error-message">Произошла ошибка при загрузке сохраненных вакансий. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Удаление сохраненной вакансии
 */
async function removeSavedJob(jobId) {
    try {
        // Спрашиваем подтверждение
        const confirmed = confirm('Вы уверены, что хотите удалить эту вакансию из сохраненных?');
        if (!confirmed) return;
        
        // Отправляем запрос на удаление
        const url = `${API_BASE_URL}/saved-jobs/remove/${jobId}`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        
        if (data.success) {
            // Удаляем карточку вакансии из DOM
            const jobCard = document.querySelector(`.saved-job-card[data-job-id="${jobId}"]`);
            if (jobCard) {
                jobCard.remove();
            }
            
            // Проверяем, остались ли еще вакансии
            const container = document.getElementById('saved-jobs-container');
            if (!container.querySelector('.saved-job-card')) {
                container.innerHTML = '<div class="no-items-message">У вас нет сохраненных вакансий.</div>';
            }
        } else {
            alert(`Ошибка: ${data.message || 'Не удалось удалить вакансию из сохраненных'}`);
        }
        
    } catch (error) {
        console.error('Error removing saved job:', error);
        alert('Произошла ошибка при удалении вакансии из сохраненных. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Загрузка откликов на вакансии
 */
async function loadApplications() {
    try {
        const container = document.getElementById('applications-container');
        
        // Показываем индикатор загрузки
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Загрузка откликов на вакансии...</div>';
        
        // Загружаем данные
        const url = `${API_BASE_URL}/applications`;
        const response = await fetch(API.getCorsProxyUrl(url), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Обрабатываем ответ
        const data = await response.json();
        const applications = data.applications || [];
        
        if (applications.length === 0) {
            container.innerHTML = '<div class="no-items-message">У вас нет откликов на вакансии.</div>';
            return;
        }
        
        // Отображаем отклики
        container.innerHTML = '';
        applications.forEach(application => {
            const applicationCard = document.createElement('div');
            applicationCard.className = 'application-card';
            
            // Определяем статус отклика
            let statusClass = '';
            let statusText = '';
            
            switch (application.status) {
                case 'pending':
                    statusClass = 'status-pending';
                    statusText = 'На рассмотрении';
                    break;
                case 'viewed':
                    statusClass = 'status-viewed';
                    statusText = 'Просмотрено';
                    break;
                case 'invited':
                    statusClass = 'status-invited';
                    statusText = 'Приглашение на интервью';
                    break;
                case 'rejected':
                    statusClass = 'status-rejected';
                    statusText = 'Отклонено';
                    break;
                default:
                    statusClass = 'status-other';
                    statusText = application.status || 'Неизвестно';
            }
            
            // Форматируем дату подачи заявки
            const applicationDate = new Date(application.created_at);
            const formattedDate = new Intl.DateTimeFormat('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(applicationDate);
            
            applicationCard.innerHTML = `
                <div class="application-header">
                    <h3 class="job-title">${application.job_title}</h3>
                    <span class="application-status ${statusClass}">${statusText}</span>
                </div>
                <div class="application-company">
                    <span class="company-name">${application.company_name}</span>
                </div>
                <div class="application-details">
                    <div class="application-date">
                        <i class="fas fa-calendar-alt"></i> Отклик отправлен: ${formattedDate}
                    </div>
                </div>
                <div class="application-actions">
                    <button class="btn small view-job-btn" data-job-id="${application.job_id}">Посмотреть вакансию</button>
                </div>
            `;
            
            container.appendChild(applicationCard);
            
            // Добавляем обработчик для кнопки просмотра вакансии
            applicationCard.querySelector('.view-job-btn').addEventListener('click', function() {
                window.location.href = `jobs.html?id=${application.job_id}`;
            });
        });
        
    } catch (error) {
        console.error('Error loading applications:', error);
        document.getElementById('applications-container').innerHTML = '<div class="error-message">Произошла ошибка при загрузке откликов на вакансии. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Скачивание резюме в формате PDF
 * В реальном проекте здесь будет запрос к API для генерации PDF
 */
function downloadResume() {
    alert('Функция скачивания резюме в формате PDF будет доступна в ближайшее время.');
}

/**
 * Вспомогательная функция для форматирования опыта работы
 */
function formatExperienceText(experience) {
    switch (experience) {
        case 'no-exp':
            return 'Без опыта';
        case '1-3':
            return '1-3 года';
        case '3-6':
            return '3-6 лет';
        case '6+':
            return 'Более 6 лет';
        default:
            return experience;
    }
}

/**
 * Форматирование даты (месяц и год)
 */
function formatMonthYear(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long'
    }).format(date);
}

/**
 * Функция для форматирования зарплаты
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
