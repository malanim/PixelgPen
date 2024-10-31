import configparser
import os

class ConfigManager:
    def __init__(self):
        """
        Инициализирует объект ConfigManager.
        Загружает существующий конфигурационный файл или создает новый с настройками по умолчанию.
        """
        self.config = configparser.ConfigParser()
        self.config_file = 'settings.ini'
        
        # Создаем конфиг файл с настройками по умолчанию, если он не существует
        if not os.path.exists(self.config_file):
            self.create_default_config()
        else:
            self.config.read(self.config_file)

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
        self.save_config()

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

    def save_config(self):
        """
        Сохраняет текущие настройки в конфигурационный файл.
        """
        with open(self.config_file, 'w') as configfile:
            self.config.write(configfile)

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