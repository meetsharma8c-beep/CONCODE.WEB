"""
concode_engine/core/hardware.py
================================
Hardware Auto-Detection and VRAM/Thread Allocation Engine.
Detects Apple Silicon Metal, NVIDIA CUDA, Vulkan, and CPU SIMD capabilities
to dynamically configure thread counts, memory layout, and GGML gpu_layers.
"""

from __future__ import annotations
import os
import platform
import psutil
import subprocess
import logging
from dataclasses import dataclass
from typing import Literal, Optional, Tuple, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.hardware")

BackendType = Literal["METAL", "CUDA", "VULKAN", "CPU"]

@dataclass
class HardwareSpec:
    backend: BackendType
    threads: int
    gpu_layers: int
    context_size: int
    total_ram_gb: float
    vram_allocated_gb: float
    device_name: str
    flash_attention: bool
    simd_instruction: str = "AVX2"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "backend": self.backend,
            "threads": self.threads,
            "gpu_layers": self.gpu_layers,
            "context_size": self.context_size,
            "total_ram_gb": self.total_ram_gb,
            "vram_allocated_gb": self.vram_allocated_gb,
            "device_name": self.device_name,
            "flash_attention": self.flash_attention,
            "simd_instruction": self.simd_instruction
        }

class HardwareManager:
    def __init__(self, context_size: int = 16384):
        self.context_size = context_size

    def detect_hardware(self) -> HardwareSpec:
        """
        Auto-detects host hardware acceleration capabilities.
        Prioritizes: Apple Silicon Metal > NVIDIA CUDA > Vulkan > CPU SIMD.
        """
        system = platform.system()
        machine = platform.machine()
        total_ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 2)
        logical_cores = os.cpu_count() or 4
        is_eco = os.environ.get("THERMAL_ECO_MODE", "true").lower() != "false"
        optimal_threads = min(4, max(1, int(logical_cores * 0.5))) if is_eco else max(1, int(logical_cores * 0.75))

        # 1. Check Apple Silicon Metal Unified Memory Architecture
        if system == "Darwin" and machine in ["arm64", "aarch64"]:
            logger.info("Hardware Auto-Detect: Apple Silicon Metal Unified RAM Architecture.")
            return HardwareSpec(
                backend="METAL",
                threads=optimal_threads,
                gpu_layers=99,  # Offload 100% of LLM layers into Apple Unified Memory
                context_size=self.context_size,
                total_ram_gb=total_ram_gb,
                vram_allocated_gb=total_ram_gb,
                device_name=f"Apple Silicon ({machine})",
                flash_attention=True,
                simd_instruction="ARM NEON / Metal Performance Shaders"
            )

        # 2. Check NVIDIA CUDA
        cuda_name, cuda_vram = self._check_nvidia_cuda()
        if cuda_name and cuda_vram > 0:
            # Dynamic layer allocation based on VRAM capacity
            if cuda_vram >= 24.0:
                gpu_layers = 99
            elif cuda_vram >= 16.0:
                gpu_layers = 48
            elif cuda_vram >= 12.0:
                gpu_layers = 36
            elif cuda_vram >= 8.0:
                gpu_layers = 24
            else:
                gpu_layers = 16

            logger.info(f"Hardware Auto-Detect: NVIDIA CUDA Detected ({cuda_name}, {cuda_vram:.2f}GB VRAM, {gpu_layers} layers offloaded).")
            return HardwareSpec(
                backend="CUDA",
                threads=optimal_threads,
                gpu_layers=gpu_layers,
                context_size=self.context_size,
                total_ram_gb=total_ram_gb,
                vram_allocated_gb=cuda_vram,
                device_name=cuda_name,
                flash_attention=True,
                simd_instruction="CUDA cuBLAS / Tensor Cores"
            )

        # 3. Check Vulkan Compute Engine
        vulkan_name = self._check_vulkan()
        if vulkan_name:
            logger.info(f"Hardware Auto-Detect: Vulkan Acceleration ({vulkan_name}).")
            return HardwareSpec(
                backend="VULKAN",
                threads=optimal_threads,
                gpu_layers=24,
                context_size=self.context_size,
                total_ram_gb=total_ram_gb,
                vram_allocated_gb=round(total_ram_gb * 0.5, 2),
                device_name=vulkan_name,
                flash_attention=False,
                simd_instruction="Vulkan Kompute / SPIR-V"
            )

        # 4. Fallback CPU SIMD Vector Acceleration
        simd_type = self._detect_cpu_simd()
        logger.info(f"Hardware Auto-Detect: CPU Fallback Engine ({simd_type}, {optimal_threads} Cores).")
        return HardwareSpec(
            backend="CPU",
            threads=optimal_threads,
            gpu_layers=0,
            context_size=self.context_size,
            total_ram_gb=total_ram_gb,
            vram_allocated_gb=0.0,
            device_name=f"Host CPU ({platform.processor() or machine})",
            flash_attention=False,
            simd_instruction=simd_type
        )

    def _check_nvidia_cuda(self) -> Tuple[Optional[str], float]:
        """Queries nvidia-smi for active GPU device name and VRAM capacity."""
        try:
            cmd = ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"]
            output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8").strip()
            if output:
                line = output.split("\n")[0]
                parts = line.split(",")
                if len(parts) >= 2:
                    name = parts[0].strip()
                    vram_gb = float(parts[1].strip()) / 1024.0
                    return name, round(vram_gb, 2)
        except Exception:
            pass
        return None, 0.0

    def _check_vulkan(self) -> Optional[str]:
        """Checks for vulkaninfo availability."""
        try:
            output = subprocess.check_output(["vulkaninfo", "--summary"], stderr=subprocess.DEVNULL).decode("utf-8")
            if "deviceName" in output:
                for line in output.split("\n"):
                    if "deviceName" in line:
                        return line.split("=")[-1].strip()
            return "Vulkan Compute Device"
        except Exception:
            return None

    def _detect_cpu_simd(self) -> str:
        """Determines CPU SIMD instruction set support."""
        machine = platform.machine().lower()
        if "arm" in machine or "aarch" in machine:
            return "ARM NEON SIMD"
        
        try:
            if platform.system() == "Linux":
                with open("/proc/cpuinfo", "r") as f:
                    content = f.read().lower()
                    if "avx512" in content:
                        return "AVX-512 Vector Engine"
                    elif "avx2" in content:
                        return "AVX2 SIMD Engine"
            elif platform.system() == "Darwin":
                output = subprocess.check_output(["sysctl", "-a"], stderr=subprocess.DEVNULL).decode("utf-8").lower()
                if "avx512" in output:
                    return "AVX-512 Vector Engine"
                elif "avx2" in output:
                    return "AVX2 SIMD Engine"
        except Exception:
            pass
        return "AVX2 / SSE4.2 SIMD"
