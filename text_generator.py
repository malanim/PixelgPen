# text_generator.py
import g4f

class TextGenerator:
    @staticmethod
    def generate(structure):
        try:
            prompt = f"Напиши {structure['type']} на тему '{structure['theme']}'. "
            
            # Добавляем информацию о структуре в промпт
            if structure['introduction']:
                prompt += "Включи введение. "
            if structure['conclusion']:
                prompt += "Включи заключение. "
            
            # Добавляем информацию о разделах
            if structure['sections']:
                prompt += "Раздели текст на следующие секции: " + ", ".join(structure['sections']) + ". "
            
            # Генерация текста с использованием g4f
            response = g4f.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
            )
            
            # Проверяем, является ли ответ строкой
            if isinstance(response, str):
                generated_text = response
            else:
                # Если ответ - объект, пытаемся извлечь текст
                generated_text = response.choices[0].message.content if hasattr(response, 'choices') else str(response)
            
            print("Type of response:", type(response))
            print("Response content:", response)
            
            return {
                "success": True,
                "text": generated_text
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Ошибка при генерации текста: {str(e)}"
            }