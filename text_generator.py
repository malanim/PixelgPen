# text_generator.py
import sys
sys.dont_write_bytecode = True

import asyncio # Эта библиотека требует установки: pip install asyncio
import g4f # Эта библиотека требует установки: pip install g4f[all]
from g4f.Provider import __all__ as all_providers
import json
import os
import time
import tempfile

class TextGenerator:
    def __init__(self):
        self.providers = {}
        self.working_providers = []
        self.cache_file = os.path.join(
            tempfile.gettempdir(),
            'pixelgpen_provider_cache.json'
        )
        self.load_providers()
        self.load_cache()

    def load_providers(self):
        """Загрузка всех доступных провайдеров"""
        for provider_name in all_providers:
            provider = getattr(g4f.Provider, provider_name)
            if provider.working:
                self.providers[provider_name.lower()] = provider

    def load_cache(self):
        """Загрузка кэша успешных провайдеров"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    cache_data = json.load(f)
                    # Проверяем актуальность кэша (например, 24 часа)
                    if time.time() - cache_data.get('timestamp', 0) < 86400:
                        cached_providers = cache_data.get('providers', [])
                        # Восстанавливаем провайдеров из кэша
                        self.working_providers = [
                            self.providers[name.lower()]
                            for name in cached_providers
                            if name.lower() in self.providers
                        ]
            
            # Если кэш пуст или устарел, используем все доступные провайдеры
            if not self.working_providers:
                self.working_providers = list(self.providers.values())
        except Exception as e:
            print(f"Error loading cache: {e}")
            self.working_providers = list(self.providers.values())

    def save_cache(self):
        """Сохранение кэша успешных провайдеров"""
        try:
            cache_data = {
                'timestamp': time.time(),
                'providers': [provider.__name__ for provider in self.working_providers]
            }
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f)
        except Exception as e:
            print(f"Error saving cache: {e}")

    async def generate_text_async(self, prompt, provider, timeout=10):
        try:
            response = await asyncio.wait_for(
                g4f.ChatCompletion.create_async(
                    model=g4f.models.gpt_35_turbo,
                    provider=provider,
                    messages=[{"role": "user", "content": prompt}],
                ),
                timeout=timeout
            )
            return response, provider.__name__
        except asyncio.TimeoutError:
            print(f"Timeout with provider {provider.__name__}")
            return None, provider.__name__
        except Exception as e:
            print(f"Error with provider {provider.__name__}: {str(e)}")
            return None, provider.__name__

    async def generate_text_fastest(self, prompt, max_providers=5, timeout=30):
        providers_to_try = self.working_providers[:max_providers]
        
        # Создаем задачи явно с помощью asyncio.create_task
        tasks = [
            asyncio.create_task(self.generate_text_async(prompt, provider))
            for provider in providers_to_try
        ]

        try:
            done, pending = await asyncio.wait(
                tasks,
                timeout=timeout,
                return_when=asyncio.FIRST_COMPLETED
            )

            # Отменяем оставшиеся задачи
            for task in pending:
                task.cancel()

            # Проверяем результаты выполненных задач
            for task in done:
                try:
                    result, provider_name = await task
                    if result:
                        # Перемещаем успешного провайдера в начало списка
                        provider = next(p for p in self.working_providers if p.__name__ == provider_name)
                        self.working_providers.remove(provider)
                        self.working_providers.insert(0, provider)
                        self.save_cache()
                        return result, provider_name
                except Exception as e:
                    print(f"Task error: {e}")
                    continue

            # Если ни одна из начальных задач не успешна, пробуем оставшихся провайдеров
            remaining_providers = self.working_providers[max_providers:]
            if remaining_providers:
                return await self.generate_text_fastest(prompt, max_providers=len(remaining_providers), timeout=timeout)

        except asyncio.TimeoutError:
            print("Overall timeout reached")
        except Exception as e:
            print(f"Error in generate_text_fastest: {e}")

        return "All providers failed or timeout reached", "None"

    def get_available_providers(self):
        return list(self.providers.keys())
    
    def move_provider_to_end(self, provider_name):
        """Перемещает провайдера в конец списка"""
        try:
            provider = next(p for p in self.working_providers if p.__name__ == provider_name)
            self.working_providers.remove(provider)
            self.working_providers.append(provider)
            self.save_cache()
            return True
        except Exception as e:
            print(f"Error moving provider to end: {e}")
            return False