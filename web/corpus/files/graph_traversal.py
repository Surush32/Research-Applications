"""Graph traversal helpers used as a protected reference sample."""

from collections import deque
from typing import Dict, List, Set


class Graph:
    def __init__(self) -> None:
        self.adj: Dict[str, List[str]] = {}

    def add_edge(self, source: str, target: str) -> None:
        self.adj.setdefault(source, []).append(target)
        self.adj.setdefault(target, [])

    def neighbors(self, node: str) -> List[str]:
        return list(self.adj.get(node, []))


def bfs(graph: Graph, start: str) -> List[str]:
    visited: Set[str] = set()
    order: List[str] = []
    queue = deque([start])
    visited.add(start)

    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph.neighbors(node):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return order


def dfs(graph: Graph, start: str) -> List[str]:
    visited: Set[str] = set()
    order: List[str] = []

    def walk(node: str) -> None:
        visited.add(node)
        order.append(node)
        for nxt in graph.neighbors(node):
            if nxt not in visited:
                walk(nxt)

    walk(start)
    return order
