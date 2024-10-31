import sys

# Предотвращение создания файлов кэша
sys.dont_write_bytecode = True

import os
import configparser
import appdirs # Требуется установка: pip install appdirs

from version import VersionInfo

class ConfigManager:
    def __init__(self):
        """
        Инициализирует объект ConfigManager.
        Загружает существующий конфигурационный файл или создает новый с настройками по умолчанию.
        """
        self.version_info = VersionInfo()
        self.config = configparser.ConfigParser()
        
        # Получаем путь к директории для пользовательских данных
        app_name = "PixelgPen"  # Имя вашего приложения
        app_author = "Malanim Software"  # Имя вашей компании
        
        # Получаем директорию для конфигурационных файлов
        config_dir = appdirs.user_config_dir(app_name, app_author)
        
        # Создаем директорию, если она не существует
        os.makedirs(config_dir, exist_ok=True)
        
        # Полный путь к файлу конфигурации
        self.config_file = os.path.join(config_dir, 'settings.ini')
        
        # Создаем конфиг файл с настройками по умолчанию, если он не существует
        if not os.path.exists(self.config_file):
            self.create_default_config()
        else:
            try:
                self.config.read(self.config_file)
            except Exception as e:
                print(f"Error reading config file: {e}")
                self.create_default_config()

    def create_default_config(self):
        """
        Создает конфигурационный файл с настройками по умолчанию.
        Устанавливает начальные значения для размера окна, браузера и темы.
        """
        self.config['Window'] = {
            'width': '1600',
            'height': '920',
            'browser': 'chrome'
        }
        self.config['Appearance'] = {
            'theme': 'light'
        }
        self.config['UI'] = {
            'last_active_block': 'block1'
        }
        self.save_config()

    def save_config(self):
        """
        Сохраняет текущие настройки в конфигурационный файл.
        """
        try:
            with open(self.config_file, 'w', encoding='utf-8') as configfile:
                self.config.write(configfile)
        except Exception as e:
            print(f"Error saving config file: {e}")

    def get_theme(self):
        """
        Возвращает текущую тему приложения.
        :return: строка с названием темы ('light', 'dark' и т.д.)
        """
        try:
            return self.config.get('Appearance', 'theme')
        except (configparser.Error, KeyError):
            return 'light'

    def set_theme(self, theme):
        """
        Устанавливает новую тему приложения.
        :param theme: строка с названием темы
        :return: True в случае успешного сохранения
        """
        if 'Appearance' not in self.config:
            self.config['Appearance'] = {}
        self.config['Appearance']['theme'] = theme
        self.save_config()
        return True

    def get_browser(self):
        """
        Возвращает предпочтительный браузер для приложения.
        :return: строка с названием браузера
        """
        try:
            return self.config.get('Window', 'browser')
        except (configparser.Error, KeyError):
            return 'chrome'
    
    def set_browser(self, browser):
        """
        Устанавливает предпочтительный браузер.
        :param browser: строка с названием браузера
        :return: True в случае успешного сохранения
        """
        self.config['Window']['browser'] = browser
        self.save_config()
        return True

    def get_window_size(self):
        """
        Возвращает текущий размер окна приложения.
        :return: кортеж (ширина, высота)
        """
        try:
            width = self.config.getint('Window', 'width')
            height = self.config.getint('Window', 'height')
            return width, height
        except (configparser.Error, KeyError, ValueError):
            # В случае ошибки возвращаем значения по умолчанию
            return 800, 600

    def set_window_size(self, width, height):
        """
        Устанавливает новый размер окна приложения.
        :param width: ширина окна в пикселях
        :param height: высота окна в пикселях
        :return: True в случае успешного сохранения
        """
        self.config['Window']['width'] = str(width)
        self.config['Window']['height'] = str(height)
        self.save_config()
        return True
    
    def get_last_active_block(self):
        """
        Возвращает ID последнего активного блока.
        """
        try:
            return self.config.get('UI', 'last_active_block')
        except (configparser.Error, KeyError):
            return 'block1'  # По умолчанию возвращаем первый блок

    def set_last_active_block(self, block_id):
        """
        Сохраняет ID последнего активного блока.
        """
        if 'UI' not in self.config:
            self.config['UI'] = {}
        self.config['UI']['last_active_block'] = block_id
        self.save_config()
    
    def get_version(self):
        """
        Возвращает текущую версию приложения.
        """
        return self.version_info.get_version_string()
    
    def update_app_version(self):
        """
        Устанавливает новую версию.
        """
        if not getattr(sys, 'frozen', False):
            self.version_info.update_version()
    
    def delete_config(self):
        """
        Удаляет файл конфигурации.
        """
        try:
            if os.path.exists(self.config_file):
                os.remove(self.config_file)
                return True
            else:
                return False
        except Exception as e:
            print(f"Error deleting config file: {e}")
            return False