"""
concode_engine/context/ast_parser.py
====================================
Local Source Code AST (Abstract Syntax Tree) Parser.
Locates function signatures, class definitions, method scopes, and imports.
"""

from __future__ import annotations
import ast
import os
import re
import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concode_engine.ast_parser")

@dataclass
class CodeScope:
    name: str
    kind: str  # "function" | "class" | "method"
    start_line: int
    end_line: int
    signature: str
    docstring: Optional[str]

class ASTContextParser:
    def __init__(self):
        pass

    def parse_python_file(self, file_path: str) -> List[CodeScope]:
        """Parses Python source file AST into code scope definitions."""
        if not os.path.exists(file_path):
            return []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                code_content = f.read()

            tree = ast.parse(code_content, filename=file_path)
            scopes: List[CodeScope] = []

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    args_list = [arg.arg for arg in node.args.args]
                    sig = f"def {node.name}({', '.join(args_list)})"
                    doc = ast.get_docstring(node)
                    scopes.append(CodeScope(
                        name=node.name,
                        kind="function",
                        start_line=node.lineno,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        signature=sig,
                        docstring=doc
                    ))
                elif isinstance(node, ast.ClassDef):
                    sig = f"class {node.name}"
                    doc = ast.get_docstring(node)
                    scopes.append(CodeScope(
                        name=node.name,
                        kind="class",
                        start_line=node.lineno,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        signature=sig,
                        docstring=doc
                    ))

            return scopes
        except Exception as e:
            logger.warn(f"AST Python parse exception in {file_path}: {e}")
            return []

    def parse_javascript_file(self, file_path: str) -> List[CodeScope]:
        """Regex-based AST symbol extractor for JavaScript / TypeScript files."""
        if not os.path.exists(file_path):
            return []

        scopes: List[CodeScope] = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            fn_regex = re.compile(r'^\s*(async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)')
            class_regex = re.compile(r'^\s*class\s+([a-zA-Z0-9_]+)')

            for idx, line in enumerate(lines, 1):
                fn_match = fn_regex.match(line)
                if fn_match:
                    name = fn_match.group(2)
                    args = fn_match.group(3)
                    scopes.append(CodeScope(
                        name=name,
                        kind="function",
                        start_line=idx,
                        end_line=idx + 20,
                        signature=f"function {name}({args})",
                        docstring=None
                    ))
                    continue

                cls_match = class_regex.match(line)
                if cls_match:
                    name = cls_match.group(1)
                    scopes.append(CodeScope(
                        name=name,
                        kind="class",
                        start_line=idx,
                        end_line=idx + 50,
                        signature=f"class {name}",
                        docstring=None
                    ))

            return scopes
        except Exception as e:
            logger.warn(f"AST JavaScript parse exception in {file_path}: {e}")
            return []
