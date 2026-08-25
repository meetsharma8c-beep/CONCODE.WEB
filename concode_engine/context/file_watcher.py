"""
concode_engine/context/file_watcher.py
=======================================
Real-Time Project Directory Indexer & File System Watcher.
"""

import os
import logging
from typing import Callable

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.file_watcher")

class ProjectIndexer:
    def __init__(self, project_path: str, vector_store=None):
        self.project_path = project_path
        self.vector_store = vector_store

    def index_all(self, extensions=(".py", ".js", ".ts", ".html", ".css", ".json")):
        """Scans workspace files and adds to local vector index."""
        if not os.path.exists(self.project_path):
            return

        count = 0
        for root, dirs, files in os.walk(self.project_path):
            # Skip hidden and node_modules
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "node_modules"]
            for file in files:
                if file.endswith(extensions):
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        rel_path = os.path.relpath(full_path, self.project_path)
                        if self.vector_store:
                            self.vector_store.add_document(rel_path, content, {"path": rel_path})
                        count += 1
                    except Exception:
                        pass
        logger.info(f"ProjectIndexer: Indexed {count} workspace files into vector store.")
