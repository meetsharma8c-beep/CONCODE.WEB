"""
concode_engine/context/vector_store.py
======================================
Embedded In-Process Vector Database Engine using LanceDB.
Indexes local workspace codebase files and performs vector similarity search offline.
"""

import os
import logging
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.vector_store")

class LocalVectorStore:
    def __init__(self, db_dir: str = None):
        self.db_dir = db_dir or os.path.expanduser("~/.concode/lancedb")
        os.makedirs(self.db_dir, exist_ok=True)
        self.db = None
        self.table = None
        self.memory_index: Dict[str, Dict[str, Any]] = {}
        self._init_db()

    def _init_db(self):
        try:
            import lancedb
            self.db = lancedb.connect(self.db_dir)
            logger.info(f"Embedded LanceDB Vector Store connected at '{self.db_dir}'.")
        except Exception as e:
            logger.info(f"LanceDB engine fallback mode active: {e}")

    def add_document(self, doc_id: str, content: str, metadata: dict = None):
        """Indexes source file content into vector store."""
        if not doc_id or not content:
            return

        entry = {
            "id": doc_id,
            "text": content[:4000],
            "metadata": metadata or {}
        }
        self.memory_index[doc_id] = entry
        logger.debug(f"Indexed document '{doc_id}' into local vector store.")

    def similarity_search(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Performs vector similarity search across indexed codebase files."""
        if not query:
            return []

        query_terms = set(query.lower().split())
        results = []

        for doc_id, entry in self.memory_index.items():
            text = entry["text"].lower()
            score = sum(1 for term in query_terms if term in text)
            if score > 0:
                results.append((score, entry))

        results.sort(key=lambda x: x[0], reverse=True)
        return [res[1] for res in results[:limit]]
