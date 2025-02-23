from openai import OpenAI
from abc import ABC, abstractmethod
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIProvider(ABC):
    @abstractmethod
    def generate_completion(self, messages: list) -> str:
        pass

class DeepSeekProvider(AIProvider):
    def __init__(self, model_name: str = "deepseek-reasoner"):
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is not set")

        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.model = model_name

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
    def __init__(self, model_name: str = "gpt-4o-mini"):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")

        self.client = OpenAI(api_key=api_key)
        self.model = model_name

    def generate_completion(self, messages: list) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

def get_ai_provider(provider_name: str = "deepseek-r1") -> AIProvider:
    providers = {
        "deepseek-v3": ("deepseek-chat", DeepSeekProvider),
        "deepseek-r1": ("deepseek-reasoner", DeepSeekProvider),
        "gpt-4o-mini": ("gpt-4o-mini", OpenAIProvider),
        "o3-mini": ("o3-mini", OpenAIProvider)
    }

    if provider_name not in providers:
        raise ValueError(f"Unknown provider: {provider_name}")

    model_name, provider_class = providers[provider_name]
    return provider_class(model_name)