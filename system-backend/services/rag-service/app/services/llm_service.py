import os
import logging
from collections.abc import Iterator

from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._client = None
        self._api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY", "")
        logger.info(f"GROQ_API_KEY loaded: {'YES' if self._api_key else 'NO (empty or missing)'}")
        if self._api_key:
            try:
                from groq import AsyncGroq

                self._client = AsyncGroq(api_key=self._api_key)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self._client = None

    def generate_stream(self, system_prompt: str, user_message: str) -> Iterator[str]:
        if self._client is None:
            text = self._fallback_answer(system_prompt, user_message)
            for token in text.split(" "):
                yield token + " "
            return

        import asyncio

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        response = loop.run_until_complete(
            self._client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_completion_tokens=512,
                top_p=0.9,
                stream=True,
            )
        )

        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _fallback_answer(self, system_prompt: str, user_message: str) -> str:
        context_start = system_prompt.find("=== OPERATIONAL CONTEXT ===")
        context = system_prompt[context_start:] if context_start >= 0 else ""
        if "No recent operational events match this query." in context:
            return (
                "I could not find relevant recent operational events for that question."
            )
        lines = [line for line in context.splitlines() if line.startswith("[")]
        summary = "\n".join(lines[:4]) if lines else "Context is available but sparse."
        return f"Here is what I found from recent operations:\n{summary}"
