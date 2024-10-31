# version.py
import sys

# Предотвращение создания файлов кэша
sys.dont_write_bytecode = True

# Импорт основных библиотек
import os
import datetime
import platform

class VersionInfo:
    def __init__(self):
        self.version = self._get_version()

    def _get_version(self):
        if getattr(sys, 'frozen', False):
            # Если приложение скомпилировано (запущено из exe)
            base_path = sys._MEIPASS
        else:
            # Если приложение запущено из исходного кода
            base_path = os.path.dirname(os.path.abspath(__file__))

        version_file = os.path.join(base_path, 'version.txt')
        
        try:
            with open(version_file, 'r') as f:
                return f.read().strip()
        except FileNotFoundError:
            return "0.0.0.0"  # Версия по умолчанию

    def get_version_string(self):
        return self.version

    def update_version(self):
        if not getattr(sys, 'frozen', False):
            # Обновляем версию только если приложение не скомпилировано
            major, minor, patch, build = self.version.split('.')
            build = str(int(build) + 1)  # Увеличиваем номер сборки
            new_version = f"{major}.{minor}.{patch}.{build}"
            with open('version.txt', 'w') as f:
                f.write(new_version)
            self.version = new_version