"""
concode_engine/ui/system_tray.py
================================
Desktop System Tray Controller.
"""

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.ui.tray")

class SystemTrayController:
    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        logger.info("System Tray Controller initialized.")

    def run(self):
        logger.info("Desktop System Tray active.")
