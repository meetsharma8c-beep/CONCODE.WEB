"""
concode_engine/inference/quantization.py
========================================
Dynamic KV-Cache Quantization and Thread Tuning Helper.
"""

def optimize_thread_allocation(total_logical_cores: int) -> int:
    return max(1, int(total_logical_cores * 0.75))

def get_kv_cache_type(backend: str) -> str:
    if backend in ["METAL", "CUDA"]:
        return "q4_0"
    return "f16"
