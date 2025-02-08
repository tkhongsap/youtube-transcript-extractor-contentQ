from openai import OpenAI
from abc import ABC, abstractmethod
import os
import json

class AIProvider(ABC):
    @abstractmethod
    def generate_completion(self, messages: list) -> str:
        pass

class DeepSeekProvider(AIProvider):
    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ.get("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )
        self.model = "deepseek-chat"

    def generate_completion(self, messages: list) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"DeepSeek API error: {str(e)}")

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"  # Using the latest model as specified

    def generate_completion(self, messages: list) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

def get_ai_provider(provider_name: str = "deepseek") -> AIProvider:
    if provider_name.lower() == "openai":
        return OpenAIProvider()
    return DeepSeekProvider()  # Default to DeepSeek
