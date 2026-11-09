"""Repositórios: só guardam e buscam dados (sem regra de negócio).

Os Protocols definem o contrato. As classes InMemory* são a implementação atual.
Para usar um banco de dados, crie outra classe com os mesmos métodos
(ex.: SqliteBookRepository) e troque-a em services.create_services().
"""

from dataclasses import replace
from itertools import count
from typing import Iterable, Optional, Protocol

from models import AuthorRecord, BookRecord, ReadingStatus


# ---------------------------------------------------------------------------
# Contratos
# ---------------------------------------------------------------------------
class AuthorRepository(Protocol):
    def find_all(self) -> list[AuthorRecord]: ...
    def find_by_id(self, id: str) -> Optional[AuthorRecord]: ...
    def exists(self, id: str) -> bool: ...
    def create(self, name: str, country: Optional[str]) -> AuthorRecord: ...


class BookRepository(Protocol):
    def find_all(
        self, status: Optional[ReadingStatus] = None, search: Optional[str] = None
    ) -> list[BookRecord]: ...
    def find_by_id(self, id: str) -> Optional[BookRecord]: ...
    def find_by_author_id(self, author_id: str) -> list[BookRecord]: ...
    def count_by_author_id(self, author_id: str) -> int: ...
    def create(self, book: BookRecord) -> BookRecord: ...
    def update(self, id: str, **changes) -> Optional[BookRecord]: ...
    def delete(self, id: str) -> bool: ...


# ---------------------------------------------------------------------------
# Implementações em memória
# ---------------------------------------------------------------------------
class InMemoryAuthorRepository:
    def __init__(self, initial: Iterable[tuple[str, Optional[str]]] = ()) -> None:
        self._items: dict[str, AuthorRecord] = {}
        self._ids = count(1)
        for name, country in initial:
            self.create(name, country)

    def find_all(self) -> list[AuthorRecord]:
        return list(self._items.values())

    def find_by_id(self, id: str) -> Optional[AuthorRecord]:
        return self._items.get(str(id))

    def exists(self, id: str) -> bool:
        return str(id) in self._items

    def create(self, name: str, country: Optional[str]) -> AuthorRecord:
        author = AuthorRecord(id=str(next(self._ids)), name=name, country=country)
        self._items[author.id] = author
        return author


class InMemoryBookRepository:
    def __init__(self, initial: Iterable[BookRecord] = ()) -> None:
        self._items: dict[str, BookRecord] = {}
        self._ids = count(1)
        for book in initial:
            self.create(book)

    def find_all(
        self, status: Optional[ReadingStatus] = None, search: Optional[str] = None
    ) -> list[BookRecord]:
        items = list(self._items.values())
        if status is not None:
            items = [b for b in items if b.status == status]
        if search and search.strip():
            term = search.strip().casefold()
            items = [b for b in items if term in b.title.casefold()]
        return items

    def find_by_id(self, id: str) -> Optional[BookRecord]:
        return self._items.get(str(id))

    def find_by_author_id(self, author_id: str) -> list[BookRecord]:
        return [b for b in self._items.values() if b.author_id == str(author_id)]

    def count_by_author_id(self, author_id: str) -> int:
        return len(self.find_by_author_id(author_id))

    def create(self, book: BookRecord) -> BookRecord:
        # O repositório é quem gera o id
        saved = replace(book, id=str(next(self._ids)))
        self._items[saved.id] = saved
        return saved

    def update(self, id: str, **changes) -> Optional[BookRecord]:
        book = self.find_by_id(id)
        if book is None:
            return None
        updated = replace(book, **changes)
        self._items[updated.id] = updated
        return updated

    def delete(self, id: str) -> bool:
        return self._items.pop(str(id), None) is not None
