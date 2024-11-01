// script.js

eel.expose(closeWindow);
function closeWindow() {
    window.close();
}

// Функция для вызова дополнительной задачи
async function startTask(taskId) {
    try {
        const result = await new Promise((resolve) => {
            eel.long_running_task(taskId)(resolve);
        });
        
        // Добавляем результат в textarea
        const resultsArea = document.getElementById('results');
        resultsArea.value += result + '\n';
        // Автоматическая прокрутка вниз
        resultsArea.scrollTop = resultsArea.scrollHeight;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Функция для обновления результатов из Python
eel.expose(updateResult);
function updateResult(result) {
    const resultsArea = document.getElementById('results');
    resultsArea.value += result + '\n';
    resultsArea.scrollTop = resultsArea.scrollHeight;
}

// Функция очистки результатов
function clearResults() {
    document.getElementById('results').value = '';
}

// Функция для переключения блоков контента
function showBlock(blockId) {
    // Скрываем все блоки
    document.querySelectorAll('.content-block').forEach(block => {
        block.classList.remove('active');
    });
    
    // Показываем выбранный блок
    document.getElementById(blockId).classList.add('active');
    
    // Обновляем активную кнопку меню
    document.querySelectorAll('.menu-button').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.menu-button[onclick*="${blockId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Если открыт блок настроек, загружаем текущие настройки
    if (blockId === 'settings') {
        loadSettings();
    }

    // Сохраняем последний активный блок
    eel.set_last_active_block(blockId);
}

async function loadLastActiveBlock() {
    const lastActiveBlock = await eel.get_last_active_block()();
    showBlock(lastActiveBlock);
}

// Функция для изменения размера окна
eel.expose(resizeWindow);
function resizeWindow(width, height) {
    try {
        window.resizeTo(width, height);
    } catch (error) {
        console.error('Error resizing window:', error);
    }
}

// Функция для сохранения настроек
async function saveSettings() {
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const newBrowser = document.getElementById('browser').value;

    try {
        // Получаем текущий браузер из настроек
        const [currentWidth, currentHeight, currentBrowser] = await eel.get_current_settings()();
        
        // Проверяем, изменился ли браузер
        const browserChanged = newBrowser !== currentBrowser;
        
        // Сохраняем настройки браузера
        await eel.set_browser(newBrowser)();
        
        let message = 'Настройки сохранены!';
        
        if (browserChanged) {
            if (currentBrowser === 'chrome' && newBrowser !== 'chrome') {
                message += '\nВнимание: при использовании браузера, отличного от Chrome, изменение размера окна будет недоступно.';
            } else if (currentBrowser !== 'chrome' && newBrowser === 'chrome') {
                message += '\nТеперь вы можете изменять размер окна.';
            }
            message += '\nИзменение браузера вступит в силу после перезапуска приложения.';
        }
        
        // Применяем изменение размера только для Chrome
        if (newBrowser === 'chrome') {
            const result = await eel.set_window_size(width, height)();
            if (result) {
                message += '\nНовый размер окна будет применен при следующем запуске.';
            } else {
                message += '\nНе удалось применить настройки размера окна.';
            }
        }
        
        showAlert(message, 'success');
        loadSettings(); // Перезагружаем настройки, чтобы обновить состояние полей ввода
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        showAlert('Произошла ошибка при сохранении настроек.', 'error');
    }
}

// Функция для изменения темы
function onThemeChange() {
    const theme = document.getElementById('theme').value;
    eel.set_theme(theme)();
}

// Функция для применения темы
eel.expose(applyTheme);
function applyTheme(theme) {
    document.body.className = theme + '-theme';
    if (window.notificationManager) {
        window.notificationManager.setTheme(theme); // Устанавливаем тему для уведомлений
    }
}

// Функция для загрузки настроек
async function loadSettings() {
    const [width, height, browser, theme, version] = await eel.get_current_settings()();
    document.getElementById('width').value = width;
    document.getElementById('height').value = height;
    document.getElementById('browser').value = browser;
    document.getElementById('theme').value = theme;
    document.getElementById('app-version').textContent = version;
    
    // Применяем тему
    applyTheme(theme);
    
    // Отключаем поля ввода размеров, если браузер не Chrome
    const isChrome = browser === 'chrome';
    document.getElementById('width').disabled = !isChrome;
    document.getElementById('height').disabled = !isChrome;
}

// Добавьте эту функцию для обработки изменения браузера
function onBrowserChange() {
    const browser = document.getElementById('browser').value;
    const isChrome = browser === 'chrome';
    document.getElementById('width').disabled = !isChrome;
    document.getElementById('height').disabled = !isChrome;
}

// Загружаем настройки при загрузке страницы, если открыт блок настроек
document.addEventListener('DOMContentLoaded', function() {
    loadLastActiveBlock();
});

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications-container');
        this.notifications = [];
        this.maxNotifications = 5;
        this.currentTheme = 'default';
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.notifications.forEach(notification => {
            this.updateNotificationTheme(notification);
        });
    }

    updateNotificationTheme(notification) {
        notification.classList.remove('light-theme', 'dark-theme', 'warm-theme', 'cold-theme', 'vivid-theme');
        notification.classList.add(`${this.currentTheme}-theme`);
    }

    show(message, type = 'info', duration = 6000) {
        if (!this.container) {
            console.error('Notifications container not found!');
            return;
        }
    
        const wrapper = document.createElement('div');
        wrapper.className = 'notification-wrapper';
        wrapper.style.top = '0';
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} ${this.currentTheme}-theme`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        // Создаем точку-индикатор
        const indicator = document.createElement('span');
        indicator.className = `notification-indicator ${type}-indicator`;
        
        // Создаем элемент для текста
        const textSpan = document.createElement('span');
        textSpan.className = 'notification-text';
        textSpan.textContent = message;
        
        content.appendChild(indicator);
        content.appendChild(textSpan);
        
        const closeButton = document.createElement('span');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '✕';
        closeButton.onclick = () => this.remove(wrapper);
        
        notification.appendChild(content);
        notification.appendChild(closeButton);
        wrapper.appendChild(notification);
        
        // Добавляем свойство для хранения таймера
        wrapper.timeoutId = null;
        
        // Добавляем обработчики событий мыши
        wrapper.addEventListener('mouseenter', () => {
            // Очищаем таймер при наведении
            if (wrapper.timeoutId) {
                clearTimeout(wrapper.timeoutId);
                wrapper.timeoutId = null;
            }
            notification.classList.add('hovered');
        });
        
        wrapper.addEventListener('mouseleave', () => {
            notification.classList.remove('hovered');
            // Запускаем новый таймер при уходе курсора
            if (duration > 0) {
                wrapper.timeoutId = setTimeout(() => {
                    if (this.notifications.includes(wrapper)) {
                        this.remove(wrapper);
                    }
                }, duration);
            }
        });

        this.container.appendChild(wrapper);
        this.notifications.push(wrapper);
    
        // Ограничение количества уведомлений
        if (this.notifications.length > this.maxNotifications) {
            this.remove(this.notifications[0]);
        }
    
        // Обновляем позиции всех уведомлений
        this.updatePositions();
    
        // Анимация появления
        wrapper.style.transform = 'translateX(100%)';
        requestAnimationFrame(() => {
            wrapper.style.transform = 'translateX(0)';
        });
    
        // Автоматическое удаление (начальный таймер)
        if (duration > 0) {
            wrapper.timeoutId = setTimeout(() => {
                if (this.notifications.includes(wrapper)) {
                    this.remove(wrapper);
                }
            }, duration);
        }
    }

    remove(wrapper) {
        // При удалении очищаем таймер, если он существует
        if (wrapper.timeoutId) {
            clearTimeout(wrapper.timeoutId);
            wrapper.timeoutId = null;
        }

        const index = this.notifications.indexOf(wrapper);
        if (index > -1) {
            this.notifications.splice(index, 1);
            wrapper.style.transform = 'translateX(100%)';
            wrapper.style.opacity = '0';

            setTimeout(() => {
                wrapper.remove();
                this.updatePositions();
            }, 300);
        }
    }

    updatePositions() {
        let currentOffset = 0;
        this.notifications.forEach((wrapper) => {
            // Сначала устанавливаем позицию в начальную точку
            wrapper.style.top = currentOffset + 'px';
            
            // Получаем реальную высоту элемента, включая margin
            const rect = wrapper.getBoundingClientRect();
            const height = rect.height;
            
            // Увеличиваем смещение на высоту текущего уведомления плюс отступ
            currentOffset += height + 10; // 10px - отступ между уведомлениями
        });
    }
}

// Создаем глобальный экземпляр менеджера уведомлений
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager = new NotificationManager();
});

// Функция для применения темы
eel.expose(applyTheme);
function applyTheme(theme) {
    document.body.className = theme + '-theme';
    if (window.notificationManager) {
        window.notificationManager.setTheme(theme);
    }
    // Добавляем класс темы к диалогу подтверждения
    document.getElementById('confirm-overlay').className = `confirm-overlay ${theme}-theme`;
}

// Заменяем стандартный alert на кастомный
eel.expose(showAlert);
function showAlert(message, type = 'info', duration = 5000) {
    if (window.notificationManager) {
        window.notificationManager.show(message, type, duration);
    } else {
        console.error('NotificationManager not initialized');
    }
}

// Обновляем функцию deleteConfiguration
async function deleteConfiguration() {
    const confirmed = await showConfirm("Вы уверены, что хотите удалить конфигурацию? Это действие нельзя отменить.");
    if (confirmed) {
        try {
            const result = await eel.delete_configuration()();
            if (result) {
                console.log("Конфигурация успешно удалена");
            }
        } catch (error) {
            console.error('Ошибка при удалении конфигурации:', error);
            showAlert('Произошла ошибка при удалении конфигурации.', 'error');
        }
    }
}

class ConfirmDialog {
    constructor() {
        this.overlay = document.getElementById('confirm-overlay');
        this.messageElement = document.getElementById('confirm-message');
        this.yesButton = document.getElementById('confirm-yes');
        this.noButton = document.getElementById('confirm-no');
    }

    show(message) {
        return new Promise((resolve) => {
            this.messageElement.textContent = message;
            this.overlay.style.display = 'flex';

            const handleYes = () => {
                this.hide();
                resolve(true);
            };

            const handleNo = () => {
                this.hide();
                resolve(false);
            };

            // Удаляем предыдущие обработчики событий
            this.yesButton.removeEventListener('click', handleYes);
            this.noButton.removeEventListener('click', handleNo);

            // Добавляем новые обработчики событий
            this.yesButton.addEventListener('click', handleYes);
            this.noButton.addEventListener('click', handleNo);
        });
    }

    hide() {
        this.overlay.style.display = 'none';
    }
}

// Создаем глобальный экземпляр диалога подтверждения
let confirmDialog;
document.addEventListener('DOMContentLoaded', function() {
    confirmDialog = new ConfirmDialog();
});

// Функция для показа диалога подтверждения
async function showConfirm(message) {
    if (!confirmDialog) {
        confirmDialog = new ConfirmDialog();
    }
    return await confirmDialog.show(message);
}

// Добавляем глобальную переменную для хранения последнего использованного провайдера
let lastUsedProvider = null;

// Обновляем функцию generateText
async function generateText() {
    const prompt = document.getElementById('prompt').value.trim();
    if (!prompt) {
        showAlert('Пожалуйста, введите запрос', 'error');
        return;
    }

    const generateButton = document.getElementById('generateButton');
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';

    try {
        const [result, provider] = await eel.generate_text(prompt)();
        document.getElementById('generatedText').value = result;
        lastUsedProvider = provider; // Сохраняем провайдера
        showAlert(`Текст успешно сгенерирован с помощью ${provider}!`, 'success');
        // Показываем кнопки оценки
        document.getElementById('ratingButtons').style.display = 'block';
    } catch (error) {
        showAlert('Что-то пошло нетак..', 'error');
        console.error(error);
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Text';
    }
}

// Функция для отрицательной оценки
async function rateNegative() {
    if (lastUsedProvider) {
        const [success, message] = await eel.rate_response_negative(lastUsedProvider)();
        if (success) {
            showAlert(`Провайдер ${lastUsedProvider} перемещен в конец списка`, 'info');
        } else {
            showAlert('Не удалось обновить рейтинг провайдера', 'error');
        }
    }
    // Скрываем кнопки оценки
    document.getElementById('ratingButtons').style.display = 'none';
}

// Функция для положительной оценки
function ratePositive() {
    // Просто скрываем кнопки оценки, так как положительный провайдер 
    // уже переместился в начало списка после успешной генерации
    document.getElementById('ratingButtons').style.display = 'none';
    showAlert('Спасибо за оценку!', 'success');
}

async function loadProviders() {
    const providers = await eel.get_available_providers()();
    console.log("Available providers:", providers);
    // Здесь вы можете добавить код для отображения списка провайдеров в интерфейсе, если это необходимо
}

document.addEventListener('DOMContentLoaded', function() {
    const block1 = document.getElementById('block1');
    if (block1) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    loadProviders();
                }
            });
        });
        
        observer.observe(block1, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Если блок активен при загрузке
        if (block1.classList.contains('active')) {
            loadProviders();
        }
    }
});

// Вызываем эту функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', loadProviders);