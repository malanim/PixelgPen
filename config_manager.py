import configparser
import os

class ConfigManager:
    def __init__(self):
        self.config = configparser.ConfigParser()
        self.config_file = 'settings.ini'
        
        # Создаем конфиг файл с настройками по умолчанию, если он не существует
        if not os.path.exists(self.config_file):
            self.create_default_config()
        else:
            self.config.read(self.config_file)

    def create_default_config(self):
        self.config['Window'] = {
            'width': '800',
            'height': '600',
            'browser': 'chrome'
        }
        self.config['Appearance'] = {
            'theme': 'light'
        }
        self.save_config()

    def get_theme(self):
        try:
            return self.config.get('Appearance', 'theme')
        except (configparser.Error, KeyError):
            return 'light'

    def set_theme(self, theme):
        if 'Appearance' not in self.config:
            self.config['Appearance'] = {}
        self.config['Appearance']['theme'] = theme
        self.save_config()
        return True

    def get_browser(self):
        try:
            return self.config.get('Window', 'browser')
        except (configparser.Error, KeyError):
            return 'chrome'
    
    def set_browser(self, browser):
        self.config['Window']['browser'] = browser
        self.save_config()
        return True

    def save_config(self):
        with open(self.config_file, 'w') as configfile:
            self.config.write(configfile)

    def get_window_size(self):
        try:
            width = self.config.getint('Window', 'width')
            height = self.config.getint('Window', 'height')
            return width, height
        except (configparser.Error, KeyError, ValueError):
            # В случае ошибки возвращаем значения по умолчанию
            return 800, 600

    def set_window_size(self, width, height):
        self.config['Window']['width'] = str(width)
        self.config['Window']['height'] = str(height)
        self.save_config()
        return True