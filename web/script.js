// script.js

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
        
        alert(message);
        loadSettings(); // Перезагружаем настройки, чтобы обновить состояние полей ввода
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        alert('Произошла ошибка при сохранении настроек.');
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
}

// Функция для загрузки настроек
async function loadSettings() {
    const [width, height, browser, theme] = await eel.get_current_settings()();
    document.getElementById('width').value = width;
    document.getElementById('height').value = height;
    document.getElementById('browser').value = browser;
    document.getElementById('theme').value = theme;
    
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
    if (document.getElementById('settings').classList.contains('active')) {
        loadSettings();
    }
});