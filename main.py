import sys
import os

# Предотвращение создания файлов кэша
sys.dont_write_bytecode = True

import eel # Эта библиотека требует установки: pip install eel
import threading
import time
from config_manager import ConfigManager

# Создаем экземпляр менеджера конфигурации
config = ConfigManager()

# Функция для получения корректного пути к ресурсам
def resource_path(relative_path):
    try:
        # PyInstaller создает временную папку и сохраняет путь в _MEIPASS
        base_path = sys._MEIPASS
    except AttributeError:
        # Если запускаем как обычный Python-скрипт
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)

# Инициализация Eel
eel.init('web')

@eel.expose
def long_running_task(task_id):
    def run_task():
        print(f"Starting task {task_id}")
        time.sleep(3)
        print(f"Finished task {task_id}")
        # Отправляем результат обратно в JavaScript
        eel.updateResult(f"Task {task_id} completed!")()
    
    # Запускаем задачу в отдельном потоке
    thread = threading.Thread(target=run_task)
    thread.start()
    return f"Task {task_id} started"

@eel.expose
def set_window_size(width, height):
    # Сохраняем новые размеры в конфигурации
    config.set_window_size(int(width), int(height))
    
    # Получаем текущий браузер из конфигурации
    current_browser = config.get_browser()
    
    if current_browser == 'chrome':
        try:
            # Пытаемся получить окно Chrome и изменить его размер
            # chrome_window = eel._start_args['chrome'].windows[0]
            # chrome_window.set_bounds({'width': int(width), 'height': int(height)})
            eel.resizeWindow(width, height)()
            return True
        except Exception as e:
            print(f"Error resizing Chrome window: {e}")
            return False
    else:
        # Для других браузеров не меняем размер окна
        return False

@eel.expose
def set_theme(theme):
    config.set_theme(theme)
    return True

# Передаем текущие настройки в JavaScript
@eel.expose
def get_current_settings():
    width, height = config.get_window_size()
    browser = config.get_browser()
    theme = config.get_theme()
    return width, height, browser, theme

@eel.expose
def set_browser(browser):
    return config.set_browser(browser)

# Запуск веб-приложения
if __name__ == '__main__':
    # Получаем размеры окна из конфигурации
    window_width, window_height = config.get_window_size()
    browser = config.get_browser()
    
    # Путь к файлу иконки относительно exe файла
    icon_path = resource_path(os.path.join('assets', 'favicon.ico'))
    
    # Запускаем приложение с заданными размерами окна и иконкой
    eel.start('main.html', 
            mode=browser,
            size=(window_width, window_height),
            icon_path=icon_path,
            block=False)
    
    # Применяем тему при запуске
    eel.applyTheme(config.get_theme())()
    
    while True:
        eel.sleep(1.0)