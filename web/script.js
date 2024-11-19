// script.js

eel.expose(closeWindow);
function closeWindow() {
    window.close();
}

document.addEventListener('DOMContentLoaded', function() {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const contentArea = document.querySelector('.content-area');
    
    hamburgerButton.addEventListener('click', function(event) {
        event.stopPropagation();
        
        // Если меню открыто
        if (this.classList.contains('active')) {
            // Проверяем, был ли клик по span элементу или его содержимому
            const targetSpan = event.target.closest('span[data-block]');
            if (targetSpan) {
                const blockId = targetSpan.getAttribute('data-block');
                if (blockId) {
                    showBlock(blockId);
                    closeMenu();
                }
            }
        } else {
            // Если меню закрыто, открываем его
            openMenu();
        }
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', function(event) {
        if (hamburgerButton.classList.contains('active') &&
            !hamburgerButton.contains(event.target)) {
            closeMenu();
        }
    });

    // Инициализация редактора узлов
    const editor = document.querySelector('.node-editor');
    if (!editor) {
        console.warn('Node editor not found in DOM');
    }

    // Инициализация начального состояния
    updateNodeEditor();
});

async function openMenu() {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const contentArea = document.querySelector('.content-area');
    
    hamburgerButton.classList.add('active');
    contentArea.classList.add('expanded');
    
    // Обновляем текст кнопок напрямую
    const menuItems = [
        { span: hamburgerButton.querySelector('span[data-block="block1"]'), text: "Text Generator" },
        { span: hamburgerButton.querySelector('span[data-block="block2"]'), text: "Async Tasks" },
        { span: hamburgerButton.querySelector('span[data-block="block3"]'), text: "Settings" }
    ];

    menuItems.forEach(item => {
        if (item.span) {
            item.span.textContent = item.text;
        }
    });
}

function closeMenu() {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const contentArea = document.querySelector('.content-area');
    
    hamburgerButton.classList.add('closing');
    contentArea.classList.remove('expanded');
    
    // Очищаем текст кнопок
    hamburgerButton.querySelectorAll('span').forEach(span => {
        span.textContent = '';
    });

    setTimeout(() => {
        hamburgerButton.classList.remove('active', 'closing');
    }, 50);
}

function createTypingText(text) {
    const container = document.createElement('span');
    container.className = 'typing-text-container';
    container.textContent = text;
    return container;
}

function animateTypingSequentially(containers) {
    let delay = 300;
    
    containers.forEach((container, index) => {
        setTimeout(() => {
            container.classList.add('typing-animation');
        }, delay + (index * 500));
    });
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
    document.querySelectorAll('.hamburger-button span').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.hamburger-button span[data-block="${blockId}"]`);
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
    showAlert('This feature is not available in this version.', 'info');
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

class HistoryManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
    }

    push(state) {
        try {
            // Создаем глубокую копию состояния
            const stateCopy = this.deepClone(state);

            // Удаляем все состояния после текущего индекса
            this.history = this.history.slice(0, this.currentIndex + 1);
            this.history.push(stateCopy);
            this.currentIndex++;

            // Обновляем состояние кнопок
            updateUndoRedoButtons();
        } catch (error) {
            console.error('Error pushing state to history:', error);
        }
    }

    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            return this.deepClone(this.history[this.currentIndex]);
        }
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            return this.deepClone(this.history[this.currentIndex]);
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    // Безопасное глубокое клонирование
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Error cloning state:', error);
            return null;
        }
    }
}

// Обновленные функции для undo/redo
function undoAction() {
    const previousState = historyManager.undo();
    if (previousState) {
        try {
            documentStructure = previousState;
            renderTree();
            selectNode(null); // Сбрасываем выбранный узел
            updateUndoRedoButtons();
        } catch (error) {
            console.error('Error in undo action:', error);
        }
    }
}

function redoAction() {
    const nextState = historyManager.redo();
    if (nextState) {
        try {
            documentStructure = nextState;
            renderTree();
            selectNode(null); // Сбрасываем выбранный узел
            updateUndoRedoButtons();
        } catch (error) {
            console.error('Error in redo action:', error);
        }
    }
}

// Обновление состояния кнопок
function updateUndoRedoButtons() {
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    
    if (undoButton && redoButton) {
        undoButton.disabled = !historyManager.canUndo();
        redoButton.disabled = !historyManager.canRedo();
    }
}

let historyManager = new HistoryManager();

class DocumentNode {
    constructor(id, title, type = 'section', children = []) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.children = children;
    }
}

// Предустановленные пресеты для разных типов документов
// const documentPresets = {
//     report: {
//         sections: ['Основная часть'],
//         required: ['titlePage', 'tableOfContents', 'introduction', 'conclusion', 'references']
//     },
//     presentation: {
//         sections: ['Основные положения', 'Аргументация'],
//         required: ['titlePage', 'introduction', 'conclusion']
//     },
//     coursework: {
//         sections: ['Теоретическая часть', 'Практическая часть', 'Анализ результатов'],
//         required: ['titlePage', 'tableOfContents', 'introduction', 'conclusion', 'references']
//     },
//     project: {
//         sections: ['Описание проекта', 'Планирование', 'Реализация', 'Оценка результатов'],
//         required: ['titlePage', 'tableOfContents', 'introduction', 'conclusion']
//     },
//     custom: {
//         sections: ['Раздел 1'],
//         required: ['titlePage']
//     }
// };
const documentPresets = {
    report: {
        structure: new DocumentNode('root', 'Реферат', 'root', [
            new DocumentNode('intro', 'Введение', 'section'),
            new DocumentNode('main', 'Основная часть', 'section', [
                new DocumentNode('chapter1', 'Глава 1', 'subsection'),
                new DocumentNode('chapter2', 'Глава 2', 'subsection')
            ]),
            new DocumentNode('conclusion', 'Заключение', 'section')
        ]),
        required: ['titlePage', 'tableOfContents', 'introduction', 'conclusion', 'references']
    },
    presentation: {
        sections: ['Основные положения', 'Аргументация'],
        structure: new DocumentNode('root', 'Доклад', 'root', [
            new DocumentNode('main', 'Основные положения', 'section', [
                new DocumentNode('chapter1', 'Глава 1', 'subsection'),
                new DocumentNode('chapter2', 'Глава 2', 'subsection'),
                new DocumentNode('chapter3', 'Глава 3', 'subsection')
            ]),
            new DocumentNode('conclusion', 'Аргументация', 'section')
        ]),
        required: ['titlePage', 'introduction', 'conclusion']
    },
    coursework: {
        structure: new DocumentNode('root', 'Курсовая работа', 'root', [
            new DocumentNode('titlePage', 'Титульный лист', 'section'),
            new DocumentNode('intro', 'Введение', 'section'),
            new DocumentNode('theoreticalPart', 'Теоретическая часть', 'section', [
                new DocumentNode('subsection1', 'Подраздел 1', 'subsection'),
                new DocumentNode('subsection2', 'Подраздел 2', 'subsection')
            ]),
            new DocumentNode('practicalPart', 'Практическая часть', 'section'),
            new DocumentNode('conclusion', 'Заключение', 'section'),
            new DocumentNode('references', 'Список литературы', 'section')
        ]),
        required: ['titlePage', 'tableOfContents', 'introduction', 'conclusion', 'references']
    },
    project: {
        structure: new DocumentNode('root', 'Проект', 'root', [
            new DocumentNode('titlePage', 'Титульный лист', 'section'),
            new DocumentNode('introduction', 'Введение', 'section'),
            new DocumentNode('description', 'Описание проекта', 'section'),
            new DocumentNode('planning', 'Планирование', 'section'),
            new DocumentNode('implementation', 'Реализация', 'section'),
            new DocumentNode('evaluation', 'Оценка результатов', 'section'),
            new DocumentNode('conclusion', 'Заключение', 'section'),
            new DocumentNode('references', 'Список литературы', 'section')
        ]),
        required: ['titlePage', 'introduction', 'conclusion', 'references']
    },
    custom: {
        structure: new DocumentNode('root', 'Свой документ', 'root', [
            new DocumentNode('section1', 'Раздел 1', 'section'),
            new DocumentNode('section2', 'Раздел 2', 'section')
        ]),
        required: ['titlePage'] // Здесь вы можете настроить необходимые элементы
    }
};

function updatePresetFields() {
    const documentType = document.getElementById('documentType').value;
    const preset = documentPresets[documentType];

    // Загрузка структуры документа
    loadDocumentStructure(documentType);
}

function addSection(sectionName = '') {
    const mainSections = document.getElementById('mainSections');
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-item';
    
    sectionDiv.innerHTML = `
        <input type="text" class="section-name" 
               value="${sectionName}" 
               placeholder="Название раздела">
    `;
    
    mainSections.appendChild(sectionDiv);
}

function removeSection() {
    const mainSections = document.getElementById('mainSections');
    if (mainSections.lastChild) {
        mainSections.removeChild(mainSections.lastChild);
    }
}

async function generateDocument() {
    const documentType = document.getElementById('documentType').value;
    const theme = document.getElementById('docTheme').value;
    
    if (!theme) {
        showAlert('Пожалуйста, введите тему документа', 'error');
        return;
    }

    // Собираем структуру документа
    const structure = {
        type: documentType,
        theme: theme,
        titlePage: document.getElementById('titlePage').checked,
        tableOfContents: document.getElementById('tableOfContents').checked,
        introduction: document.getElementById('introduction').checked,
        conclusion: document.getElementById('conclusion').checked,
        references: document.getElementById('references').checked,
        sections: Array.from(document.querySelectorAll('.section-name'))
                      .map(input => input.value)
                      .filter(name => name.trim() !== '')
    };

    try {
        const result = await eel.generate_text(structure)();
        if (result.success) {
            document.getElementById('generatedText').value = result.text;
            showAlert('Текст успешно сгенерирован!', 'success');
        } else {
            showAlert(result.message || 'Ошибка при генерации текста', 'error');
        }
    } catch (error) {
        showAlert('Произошла ошибка при генерации текста: ' + error.message, 'error');
    }
}

async function exportDocument() {
    const generatedText = document.getElementById('generatedText').value;
    if (!generatedText) {
        showAlert('Сначала сгенерируйте текст', 'error');
        return;
    }

    // Собираем полную структуру документа
    const structure = {
        type: document.getElementById('documentType').value,
        theme: document.getElementById('docTheme').value,
        titlePage: document.getElementById('titlePage').checked,
        tableOfContents: document.getElementById('tableOfContents').checked,
        introduction: document.getElementById('introduction').checked,
        conclusion: document.getElementById('conclusion').checked,
        references: document.getElementById('references').checked,
        sections: Array.from(document.querySelectorAll('.section-name'))
                      .map(input => input.value)
                      .filter(name => name.trim() !== ''),
        content: generatedText
    };

    try {
        const result = await eel.export_document(structure)();
        if (result.success) {
            showAlert('Документ успешно экспортирован!', 'success');
        } else {
            showAlert(result.message || 'Ошибка при экспорте документа', 'error');
        }
    } catch (error) {
        showAlert('Произошла ошибка при экспорте документа: ' + error.message, 'error');
    }
}

function populateEditor(structure) {
    const sectionList = document.querySelector('.section-list');
    sectionList.innerHTML = '';
    
    structure.sections.forEach((section, index) => {
        const sectionElement = createSectionElement(section, index);
        sectionList.appendChild(sectionElement);
    });
}

function createSectionElement(sectionName, index) {
    const div = document.createElement('div');
    div.className = 'section-item';
    div.innerHTML = `
        <input type="text" value="${sectionName}" class="section-input">
        <button onclick="removeSection(${index})">Удалить</button>
        <button onclick="moveSectionUp(${index})">↑</button>
        <button onclick="moveSectionDown(${index})">↓</button>
    `;
    return div;
}

function addNewSection() {
    const sectionList = document.querySelector('.section-list');
    const newSection = createSectionElement('Новый раздел', sectionList.children.length);
    sectionList.appendChild(newSection);
}

function removeSection(index) {
    const sections = document.querySelectorAll('.section-item');
    if (sections[index]) {
        sections[index].remove();
    }
}

function moveSectionUp(index) {
    const sections = document.querySelectorAll('.section-item');
    if (index > 0) {
        const section = sections[index];
        const previousSection = sections[index - 1];
        section.parentNode.insertBefore(section, previousSection);
    }
}

function moveSectionDown(index) {
    const sections = document.querySelectorAll('.section-item');
    if (index < sections.length - 1) {
        const section = sections[index];
        const nextSection = sections[index + 1];
        section.parentNode.insertBefore(nextSection, section);
    }
}

let documentStructure = null;
let selectedNode = null;

function initializeTree() {
    documentStructure = new DocumentNode('root', 'Документ', 'root', []);
    renderTree();
}

function renderTree() {
    const treeContainer = document.getElementById('documentTree');
    treeContainer.innerHTML = '';
    if (documentStructure) {
        renderNode(documentStructure, treeContainer);
    } else {
        treeContainer.innerHTML = '<p>Структура документа пуста</p>';
    }
    updateUndoRedoButtons();
}

function renderNode(node, container, level = 0) {
    if (!node) {
        console.error('Attempting to render null node');
        return;
    }

    // Пропускаем рендеринг корневого узла
    if (node.type === 'root') {
        node.children.forEach(child => renderNode(child, container, level));
        return;
    }

    // Создаем элемент узла
    let nodeElement = document.createElement('div');
    nodeElement.className = `tree-node ${node.type}`;
    nodeElement.setAttribute('data-node-id', node.id);
    nodeElement.setAttribute('data-level', level);
    
    nodeElement.setAttribute('draggable', 'true');
    nodeElement.setAttribute('data-node-id', node.id);
    nodeElement.addEventListener('dragstart', handleDragStart);
    nodeElement.addEventListener('dragover', handleDragOver);
    nodeElement.addEventListener('dragleave', handleDragLeave);
    nodeElement.addEventListener('drop', handleDrop);

    // Создаем контейнер для содержимого узла
    const nodeContent = document.createElement('div');
    nodeContent.className = 'tree-node-content';

    // Добавляем отступ в зависимости от уровня вложенности
    nodeContent.style.paddingLeft = `${level * 20}px`;

    // Функция для преобразования уровня в римские цифры
    function toRoman(num) {
        const romanNumerals = {
            1: 'I',
            2: 'II',
            3: 'III',
            4: 'IV',
            5: 'V',
            // добавьте больше, если нужно
        };
        return romanNumerals[num] || '';
    }

    // Создаем индикатор уровня
    const levelIndicator = document.createElement('div');
    levelIndicator.className = 'level-indicator';
    // Устанавливаем текст индикатора как римскую цифру
    levelIndicator.textContent = toRoman(level);

    // // Создаем индикатор уровня
    // const levelIndicator = document.createElement('div');
    // levelIndicator.className = 'level-indicator';
    // // Меняем цвет индикатора в зависимости от уровня
    // levelIndicator.style.backgroundColor = `var(--level-${level}-color, var(--accent-color))`;

    // Создаем контейнер для иконок и кнопок
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'node-controls';

    // Добавляем кнопку сворачивания/разворачивания для узлов с дочерними элементами
    if (node.children && node.children.length > 0) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-button';
        toggleButton.innerHTML = '▼';
        toggleButton.onclick = (e) => {
            e.stopPropagation();
            const childrenContainer = nodeElement.querySelector('.tree-node-children');
            const isCollapsed = toggleButton.innerHTML === '▶';
            
            toggleButton.innerHTML = isCollapsed ? '▼' : '▶';
            childrenContainer.style.display = isCollapsed ? 'block' : 'none';
            nodeElement.classList.toggle('collapsed', !isCollapsed);
        };
        controlsContainer.appendChild(toggleButton);
    }

    // Добавляем иконку в зависимости от типа узла
    const icon = document.createElement('span');
    icon.className = 'tree-node-icon';
    // Выбираем иконку в зависимости от типа и уровня
    if (node.type === 'section') {
        icon.innerHTML = level === 0 ? '📑' : '📋';
    } else if (node.type === 'subsection') {
        icon.innerHTML = '📄';
    } else {
        icon.innerHTML = '📝';
    }
    controlsContainer.appendChild(icon);

    // Создаем контейнер для заголовка
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';

    // Добавляем заголовок
    const title = document.createElement('span');
    title.className = 'tree-node-title';
    title.textContent = node.title;
    titleContainer.appendChild(title);

    // Если узел имеет значение, добавляем поле ввода
    if (node.type === 'characteristics' || node.type === 'text' || node.type === 'select') {
        const input = document.createElement(node.type === 'select' ? 'select' : 'input');
        input.className = 'node-input';
        input.type = node.type === 'text' ? 'text' : undefined;
        input.value = node.value || '';
        input.onchange = (e) => {
            e.stopPropagation();
            node.value = e.target.value;
        };

        if (node.type === 'select' && node.options) {
            node.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                input.appendChild(optionElement);
            });
        }
        titleContainer.appendChild(input);
    }

    // Собираем все элементы вместе
    nodeContent.appendChild(levelIndicator);
    nodeContent.appendChild(controlsContainer);
    nodeContent.appendChild(titleContainer);
    nodeElement.appendChild(nodeContent);

    // Добавляем обработчик клика для выбора узла
    nodeElement.onclick = (e) => {
        e.stopPropagation();
        try {
            selectNode(node);
        } catch (error) {
            console.error('Error selecting node:', error);
        }
    };

    // Добавляем контейнер для дочерних элементов
    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-node-children';
        // Рекурсивно рендерим дочерние элементы
        node.children.forEach(child => renderNode(child, childrenContainer, level + 1));
        nodeElement.appendChild(childrenContainer);
    }

    // Добавляем узел в контейнер
    container.appendChild(nodeElement);

    // Добавляем всплывающие подсказки
    nodeElement.title = `Тип: ${node.type}\nУровень: ${level}`;
}

function selectNode(node) {
    if (!node) return;

    const previousSelected = document.querySelector('.tree-node.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
    if (nodeElement) {
        nodeElement.classList.add('selected');
    }

    selectedNode = node;
    
    try {
        updateNodeEditor();
    } catch (error) {
        console.error('Error updating node editor:', error);
    }
}

function updateNodeEditor() {
    const titleInput = document.getElementById('nodeTitle');
    const typeSelect = document.getElementById('nodeType');
    const valueInput = document.getElementById('nodeValue');

    // Проверяем существование элементов перед использованием
    if (!titleInput) {
        console.error('Required editor elements not found');
        return;
    }

    if (selectedNode) {
        // Устанавливаем значение и включаем поле
        titleInput.value = selectedNode.title || '';
        titleInput.disabled = false;

        // Если есть typeSelect, обновляем его
        if (typeSelect) {
            typeSelect.value = selectedNode.type || 'section';
            typeSelect.disabled = false;
        }

        // Если есть valueInput, обновляем его
        if (valueInput) {
            valueInput.value = selectedNode.value || '';
            valueInput.style.display = (selectedNode.type === 'text' || selectedNode.type === 'select') ? 'block' : 'none';
            valueInput.disabled = false;
        }
    } else {
        // Если узел не выбран, очищаем и отключаем поля
        titleInput.value = '';
        titleInput.disabled = true;

        if (typeSelect) {
            typeSelect.value = 'section';
            typeSelect.disabled = true;
        }

        if (valueInput) {
            valueInput.value = '';
            valueInput.disabled = true;
        }
    }
}

function addNode() {
    const newId = 'node_' + Date.now();
    let newNode;
    let parent;

    if (!selectedNode) {
        // Если нет выбранного узла, добавляем section в корень
        newNode = new DocumentNode(newId, 'Новый раздел', 'section');
        documentStructure.children.push(newNode);
    } else {
        // Определяем уровень вложенности
        const level = getNodeLevel(documentStructure, selectedNode.id);
        
        // Спрашиваем пользователя, куда добавить новый элемент
        showAddNodeDialog(level).then(position => {
            switch(position) {
                case 'inside':
                    // Добавляем внутрь выбранного узла
                    newNode = new DocumentNode(
                        newId, 
                        'Новый элемент', 
                        level === 0 ? 'subsection' : 'subsection'
                    );
                    selectedNode.children.push(newNode);
                    break;

                case 'after':
                    // Добавляем после выбранного узла на том же уровне
                    parent = findParentNode(documentStructure, selectedNode.id);
                    if (parent) {
                        newNode = new DocumentNode(
                            newId, 
                            'Новый элемент', 
                            level === 1 ? 'section' : 'subsection'
                        );
                        const index = parent.children.indexOf(selectedNode);
                        parent.children.splice(index + 1, 0, newNode);
                    }
                    break;

                case 'before':
                    // Добавляем перед выбранным узлом на том же уровне
                    parent = findParentNode(documentStructure, selectedNode.id);
                    if (parent) {
                        newNode = new DocumentNode(
                            newId, 
                            'Новый элемент', 
                            level === 1 ? 'section' : 'subsection'
                        );
                        const index = parent.children.indexOf(selectedNode);
                        parent.children.splice(index, 0, newNode);
                    }
                    break;
            }

            if (newNode) {
                historyManager.push(documentStructure);
                renderTree();
                selectNode(newNode);
            }
        });
    }
}

// Функция для определения уровня вложенности узла
function getNodeLevel(root, nodeId, level = 0) {
    if (root.id === nodeId) return level;
    
    for (const child of root.children) {
        const foundLevel = getNodeLevel(child, nodeId, level + 1);
        if (foundLevel !== -1) return foundLevel;
    }
    
    return -1;
}

// Функция для отображения диалога выбора позиции нового узла
function showAddNodeDialog(level) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'add-node-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Добавить элемент</h3>
                <button onclick="this.closest('.add-node-dialog').dataset.position='inside'">
                    Внутрь выбранного элемента
                </button>
                <button onclick="this.closest('.add-node-dialog').dataset.position='before'">
                    Перед выбранным элементом
                </button>
                <button onclick="this.closest('.add-node-dialog').dataset.position='after'">
                    После выбранного элемента
                </button>
                <button onclick="this.closest('.add-node-dialog').remove()">
                    Отмена
                </button>
            </div>
        `;

        dialog.addEventListener('click', (e) => {
            const position = dialog.dataset.position;
            if (position) {
                dialog.remove();
                resolve(position);
            }
        });

        document.body.appendChild(dialog);
    });
}

function deleteSelectedNode() {
    if (!selectedNode) return;
    
    // Запрещаем удаление корневого узла
    if (selectedNode.id === 'root') return;
    
    // Если у section есть подразделы, запрещаем удаление
    if (selectedNode.type === 'section' && selectedNode.children.length > 0) {
        showAlert('Нельзя удалить раздел, содержащий подразделы', 'error');
        return;
    }

    const parent = findParentNode(documentStructure, selectedNode.id);
    if (parent) {
        parent.children = parent.children.filter(node => node.id !== selectedNode.id);
        selectedNode = null;
        historyManager.push(documentStructure);
        renderTree();
        updateNodeEditor();
    }
}

function findParentNode(root, nodeId) {
    for (const child of root.children) {
        if (child.id === nodeId) return root;
        const found = findParentNode(child, nodeId);
        if (found) return found;
    }
    return null;
}

function updateNodeTitle() {
    if (selectedNode) {
        selectedNode.title = document.getElementById('nodeTitle').value;
        historyManager.push(documentStructure);
        renderTree();
        selectNode(selectedNode);
    }
}

// function updateNodeType() {
//     if (selectedNode) {
//         const newType = document.getElementById('nodeType').value;
//         selectedNode.type = newType;
//         renderTree();
//     }
// }

function handleDragStart(e) {
    const nodeElement = e.target.closest('.tree-node');
    if (!nodeElement) return;

    // Создаем копию элемента для отображения при перетаскивании
    const dragGhost = nodeElement.cloneNode(true);
    dragGhost.classList.add('drag-ghost');
    dragGhost.style.position = 'absolute';
    dragGhost.style.opacity = '0.8';
    dragGhost.style.pointerEvents = 'none';
    
    // Скрываем ghost элемент изначально
    dragGhost.style.top = '-1000px';
    document.body.appendChild(dragGhost);

    // Устанавливаем ghost элемент как изображение при перетаскивании
    e.dataTransfer.setDragImage(dragGhost, 0, 0);
    e.dataTransfer.setData('text/plain', nodeElement.getAttribute('data-node-id'));

    // Добавляем класс dragging к оригинальному элементу
    nodeElement.classList.add('dragging');

    // Удаляем ghost элемент после начала перетаскивания
    requestAnimationFrame(() => {
        document.body.removeChild(dragGhost);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const targetNode = e.target.closest('.tree-node');
    const treeContainer = document.querySelector('.document-tree');

    // Проверяем, что мы внутри контейнера дерева
    if (!targetNode || !treeContainer.contains(targetNode)) {
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        return;
    }

    const draggingNode = document.querySelector('.dragging');
    if (draggingNode === targetNode) return;

    // Удаляем все предыдущие индикаторы
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());

    // Получаем размеры и позицию целевого узла
    const rect = targetNode.getBoundingClientRect();
    const treeRect = treeContainer.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Создаем индикатор
    let indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    // Базовые стили для индикатора
    indicator.style.left = `${rect.left - treeRect.left}px`;
    indicator.style.width = `${rect.width}px`;

    // Определяем позицию и текст индикатора
    let indicatorPosition;
    if (y < height * 0.25) {
        // Вставка перед
        indicatorPosition = {
            top: rect.top - treeRect.top - 2,
            text: 'Вставить перед'
        };
    } else if (y > height * 0.75) {
        // Вставка после
        indicatorPosition = {
            top: rect.bottom - treeRect.top,
            text: 'Вставить после'
        };
    } else {
        // Вставка внутрь
        indicatorPosition = {
            top: rect.top - treeRect.top + height / 2,
            text: 'Вставить внутрь'
        };
    }

    // Применяем позицию
    indicator.style.top = `${indicatorPosition.top}px`;
    indicator.textContent = indicatorPosition.text;

    // Проверяем границы контейнера
    const containerRect = treeContainer.getBoundingClientRect();
    const indicatorRect = {
        top: indicatorPosition.top,
        bottom: indicatorPosition.top + 4 // высота индикатора
    };

    // Корректируем позицию, если выходит за границы
    if (indicatorRect.bottom > containerRect.height) {
        indicator.style.top = `${containerRect.height - 4}px`;
    }
    if (indicatorRect.top < 0) {
        indicator.style.top = '0px';
    }

    // Добавляем дополнительные атрибуты для стилизации
    indicator.setAttribute('data-position', indicatorPosition.text.toLowerCase());

    // Добавляем индикатор в контейнер дерева
    treeContainer.appendChild(indicator);

    // Добавляем класс для подсветки целевого узла
    targetNode.classList.add('drag-target');

    // Удаляем класс drag-target у всех остальных узлов
    document.querySelectorAll('.tree-node.drag-target').forEach(node => {
        if (node !== targetNode) {
            node.classList.remove('drag-target');
        }
    });
}

function handleDragLeave(e) {
    const targetNode = e.target.closest('.tree-node');
    if (targetNode) {
        targetNode.classList.remove('drag-target');
    }
    const indicator = document.querySelector('.drop-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetNode = e.target.closest('.tree-node');
    if (!targetNode) return;

    const draggedNodeId = e.dataTransfer.getData('text/plain');
    const targetNodeId = targetNode.getAttribute('data-node-id');

    if (draggedNodeId === targetNodeId) return;

    const rect = targetNode.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) {
        moveNodeBefore(draggedNodeId, targetNodeId);
    } else if (y > height * 0.75) {
        moveNodeAfter(draggedNodeId, targetNodeId);
    } else {
        moveNodeInside(draggedNodeId, targetNodeId);
    }

    // Удаляем индикатор
    const indicator = document.querySelector('.drop-indicator');
    if (indicator) indicator.remove();

    historyManager.push(documentStructure);
    renderTree();
}

function moveNode(draggedNodeId, dropTargetId) {
    const draggedNode = findNodeById(documentStructure, draggedNodeId);
    const dropTarget = findNodeById(documentStructure, dropTargetId);

    if (draggedNode && dropTarget) {
        // Удаляем узел из его текущего положения
        removeNodeFromParent(documentStructure, draggedNodeId);

        // Добавляем узел к новому родителю
        dropTarget.children.push(draggedNode);

        // Перерисовываем дерево
        historyManager.push(documentStructure);
        renderTree();
    }
}

function findNodeById(node, id) {
    if (node.id === id) return node;
    for (let child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return null;
}

function moveNodeBefore(draggedId, targetId) {
    const draggedNode = findNodeById(documentStructure, draggedId);
    const targetNode = findNodeById(documentStructure, targetId);
    const targetParent = findParentNode(documentStructure, targetId);

    if (!draggedNode || !targetNode || !targetParent) return;

    removeNodeFromParent(documentStructure, draggedId);
    const targetIndex = targetParent.children.indexOf(targetNode);
    targetParent.children.splice(targetIndex, 0, draggedNode);
}

function moveNodeAfter(draggedId, targetId) {
    const draggedNode = findNodeById(documentStructure, draggedId);
    const targetNode = findNodeById(documentStructure, targetId);
    const targetParent = findParentNode(documentStructure, targetId);

    if (!draggedNode || !targetNode || !targetParent) return;

    removeNodeFromParent(documentStructure, draggedId);
    const targetIndex = targetParent.children.indexOf(targetNode);
    targetParent.children.splice(targetIndex + 1, 0, draggedNode);
}

function moveNodeInside(draggedId, targetId) {
    const draggedNode = findNodeById(documentStructure, draggedId);
    const targetNode = findNodeById(documentStructure, targetId);

    if (!draggedNode || !targetNode) return;

    removeNodeFromParent(documentStructure, draggedId);
    if (!targetNode.children) targetNode.children = [];
    targetNode.children.push(draggedNode);
}

function removeNodeFromParent(node, idToRemove) {
    node.children = node.children.filter(child => {
        if (child.id === idToRemove) return false;
        removeNodeFromParent(child, idToRemove);
        return true;
    });
}

function canMoveNode(draggedNodeId, dropTargetId) {
    const dropTarget = findNodeById(documentStructure, dropTargetId);
    while (dropTarget) {
        if (dropTarget.id === draggedNodeId) return false;
        dropTarget = findNodeById(documentStructure, dropTarget.parentId);
    }
    return true;
}

function saveStructure() {
    const documentType = document.getElementById('documentType').value;

    const structure = {
        type: documentType,
        structure: documentStructure,
        required: documentPresets[documentType].required
    };

    eel.save_document_structure(documentType, structure)().then(result => {
        if (result.success) {
            showAlert('Структура документа сохранена', 'success');
        } else {
            showAlert(result.message, 'error');
        }
    });

    // closeEditor();
}

function closeEditor() {
    document.getElementById('structureEditor').classList.remove('active');
    document.getElementById('structureEditorOverlay').classList.remove('active');
}

// Инициализация дерева при открытии редактора
function openStructureEditor() {
    initializeTree();
    loadDocumentStructure(document.getElementById('documentType').value);
    document.getElementById('structureEditor').classList.add('active');
    document.getElementById('structureEditorOverlay').classList.add('active');
    historyManager = new HistoryManager(); // Создаем новый экземпляр
    historyManager.push(documentStructure); // Добавляем начальное состояние
    updateUndoRedoButtons();
}

// Добавляем обработчик для кнопки редактирования структуры
document.addEventListener('DOMContentLoaded', function() {
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.addEventListener('click', openStructureEditor);
    }
});

function exportStructure() {
    const documentType = document.getElementById('documentType').value;
    eel.load_document_structure(documentType)().then(result => {
        if (result.success) {
            const blob = new Blob([JSON.stringify(result.structure, null, 2)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${documentType}_structure.json`;
            a.click();
        } else {
            showAlert('Ошибка при экспорте структуры', 'error');
        }
    });
}

function importStructure(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedStructure = JSON.parse(e.target.result);
            const documentType = importedStructure.type;

            eel.save_document_structure(documentType, importedStructure)().then(result => {
                if (result.success) {
                    document.getElementById('documentType').value = documentType;
                    updatePresetFields();
                    showAlert('Структура документа успешно импортирована', 'success');
                } else {
                    showAlert(result.message, 'error');
                }
            });
        } catch (error) {
            showAlert('Ошибка при импорте структуры', 'error');
        }
    };

    reader.readAsText(file);
}

function loadDocumentStructure(documentType) {
    eel.load_document_structure(documentType)().then(result => {
        if (result.success) {
            documentStructure = result.structure.structure;
            documentPresets[documentType].required = result.structure.required;
            renderTree();
        } else {
            // Если структура не найдена, используем базовую
            initializeTree();
        }
    });
}

document.getElementById('documentType').addEventListener('change', updatePresetFields);

document.addEventListener('keydown', function(e) {
    // Проверяем, открыт ли редактор структуры
    const structureEditor = document.getElementById('structureEditor');
    if (structureEditor && structureEditor.classList.contains('active')) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undoAction();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redoAction();
        }
    }
});