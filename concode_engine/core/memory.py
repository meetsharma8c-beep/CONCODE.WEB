"""
concode_engine/core/memory.py
==============================
Context Window Manager and KV-Cache Optimizer for local GGUF models.
"""

from typing import List, Dict, Any

class ContextMemoryManager:
    def __init__(self, max_tokens: int = 16384, max_history_turns: int = 15):
        self.max_tokens = max_tokens
        self.max_history_turns = max_history_turns
        self.history: List[Dict[str, str]] = []

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_history_turns * 2:
            self.history = self.history[-self.max_history_turns * 2:]

    def get_formatted_prompt(self, system_prompt: str, current_input: str) -> str:
        prompt_parts = [f"<system>\n{system_prompt}\n</system>\n"]
        for msg in self.history:
            role = msg["role"]
            content = msg["content"]
            prompt_parts.append(f"<{role}>\n{content}\n</{role}>\n")
        prompt_parts.append(f"<user>\n{current_input}\n</user>\n<assistant>\n")
        return "".join(prompt_parts)

    def clear(self):
        self.history.clear()
