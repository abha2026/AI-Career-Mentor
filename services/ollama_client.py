import aiohttp
import json
from aiocache import cached

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"

@cached(ttl=3600)  # cache for 1 hour
async def ask_llm(prompt: str) -> str:
    """Send prompt to Ollama and return full response (cached)."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                OLLAMA_URL, json={"model": MODEL, "prompt": prompt, "stream": False}
            ) as resp:
                data = await resp.json()
                return data.get("response", "")
    except Exception as e:
        return f"LLM error: {e}"

async def stream_llm(prompt: str):
    """Stream Ollama output line by line."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            OLLAMA_URL, json={"model": MODEL, "prompt": prompt, "stream": True}
        ) as resp:
            async for line in resp.content:
                if not line.strip():
                    continue
                try:
                    event = json.loads(line.decode("utf-8"))
                    token = event.get("response", "")
                    if token:
                        yield token
                except json.JSONDecodeError:
                    continue
