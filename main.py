import sys

# Предотвращение создания файлов кэша
sys.dont_write_bytecode = True

import os
import eel # Эта библиотека требует установки: pip install eel
import asyncio # Эта библиотека требует установки: pip install asyncio
import threading
import time
from config_manager import ConfigManager

if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Создаем экземпляр менеджера конфигурации
try:
    config = ConfigManager()
except Exception as e:
    print(f"Error initializing ConfigManager: {e}")
    sys.exit(1)

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

close_event = threading.Event()

def show_notification(message, type='info', duration=6000):
    """
    Показывает уведомление через JavaScript интерфейс
    :param message: текст уведомления
    :param type: тип уведомления ('info', 'success', 'error')
    :param duration: продолжительность показа в миллисекундах
    """
    eel.showAlert(message, type, duration)()

@eel.expose
def long_running_task(task_id):
    def run_task():

        print(f"Starting task {task_id}")
        show_notification(f"Задача {task_id} запущена", "info", 2000)
        
        time.sleep(3)

        print(f"Finished task {task_id}")
        show_notification(f"Задача {task_id} завершена", "success", 2000)

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

@eel.expose
def get_app_version():
    return config.get_version()

# Передаем текущие настройки в JavaScript
@eel.expose
def get_current_settings():
    try:
        width, height = config.get_window_size()
        browser = config.get_browser()
        theme = config.get_theme()
        version = config.get_version()
        return width, height, browser, theme, version
    except Exception as e:
        print(f"Error getting settings: {e}")
        return 1600, 920, 'chrome', 'light', '0.0.0-dev'  # значения по умолчанию

@eel.expose
def set_browser(browser):
    return config.set_browser(browser)

@eel.expose
def get_last_active_block():
    return config.get_last_active_block()

@eel.expose
def set_last_active_block(block_id):
    config.set_last_active_block(block_id)

@eel.expose
def delete_configuration():
    result = config.delete_config()
    if result:
        show_notification("Конфигурация успешно удалена. Приложение будет закрыто.", "success", 5000)
        # Добавляем небольшую задержку, чтобы уведомление успело отобразиться
        time.sleep(6)
        close_application()
        return True
    else:
        show_notification("Не удалось удалить конфигурацию.", "error", 5000)
        return False

@eel.expose
def close_application():
    """
    Закрывает приложение
    """
    try:
        eel.closeWindow()()  # Вызов JavaScript функции для закрытия окна
        close_event.set()
        return True
    except Exception as e:
        print(f"Error closing application: {e}")
        return False

''' --- Генератор текста начало --- '''
text_generator = None

@eel.expose
def generate_text(prompt):
    global text_generator
    if text_generator is None:
        from text_generator import TextGenerator
        text_generator = TextGenerator()
    
    async def async_generate():
        result, provider = await text_generator.generate_text_fastest(prompt)
        return result, provider

    return asyncio.run(async_generate())

@eel.expose
def get_available_providers():
    global text_generator
    if text_generator is None:
        from text_generator import TextGenerator
        text_generator = TextGenerator()
    return text_generator.get_available_providers()

@eel.expose
def rate_response_negative(provider_name):
    global text_generator
    if text_generator is None:
        from text_generator import TextGenerator
        text_generator = TextGenerator()
    
    success = text_generator.move_provider_to_end(provider_name)
    if success:
        return True, "Provider moved to end of list"
    return False, "Failed to move provider"
''' --- Генератор текста конец --- '''

# Обработка запуска и закрытия веб-приложения
if __name__ == '__main__':
    config.update_app_version()

    # Получаем размеры окна из конфигурации
    window_width, window_height = config.get_window_size()
    browser = config.get_browser()
    
    # Путь к файлу иконки относительно exe файла
    icon_path = resource_path(os.path.join('assets', 'favicon.ico'))
    
    try:
        # Запускаем приложение с заданными размерами окна и иконкой
        eel.start('main.html', 
                mode=browser,
                size=(window_width, window_height),
                icon_path=icon_path,
                block=False)
        
        # Применяем тему при запуске
        eel.applyTheme(config.get_theme())()
        
        # Основной цикл приложения
        while not close_event.is_set():
            eel.sleep(1.0)
    except Exception as e:
        print(f"Application error: {e}")
    finally:
        # Выполняем необходимые действия перед закрытием
        print("Closing application...")
        sys.exit(0)