"""Services: regras de negócio e validações. Usam os repositórios pelo contrato."""

from dataclasses import dataclass
from datetime import date
from typing import Optional

from models import AuthorRecord, BookRecord, ReadingStatus
from repositories import (
    AuthorRepository,
    BookRepository,
    InMemoryAuthorRepository,
    InMemoryBookRepository,
)


# ValueError vira um item em "errors" na resposta GraphQL (HTTP 200)
class ValidationError(ValueError):
    pass


class NotFoundError(ValueError):
    pass


class AuthorService:
    def __init__(self, authors: AuthorRepository, books: BookRepository) -> None:
        self.authors = authors
        self.books = books

    def list(self) -> list[AuthorRecord]:
        return self.authors.find_all()

    def get(self, id: str) -> Optional[AuthorRecord]:
        return self.authors.find_by_id(id)

    def books_of(self, author_id: str) -> list[BookRecord]:
        return self.books.find_by_author_id(author_id)

    def book_count_of(self, author_id: str) -> int:
        # Calculado na hora: nunca fica dessincronizado da lista de livros
        return self.books.count_by_author_id(author_id)

    # --- CRUD ---------------------------------------------------------------
    def add(self, name: str, country: Optional[str]) -> AuthorRecord:
        clean_name, clean_country = self._validate(name, country)
        return self.authors.create(clean_name, clean_country)

    def update(self, id: str, name: str, country: Optional[str]) -> AuthorRecord:
        self._get_or_fail(id)
        clean_name, clean_country = self._validate(name, country, ignore_id=str(id))
        return self.authors.update(id, name=clean_name, country=clean_country)

    def delete(self, id: str) -> bool:
        author = self._get_or_fail(id)
        # Não deixa livro "órfão": o autor só sai se não tiver livros
        count = self.books.count_by_author_id(id)
        if count:
            raise ValidationError(
                f'Não é possível excluir "{author.name}": ainda há {count} livro(s) desse autor. '
                "Exclua os livros primeiro."
            )
        return self.authors.delete(id)

    def _validate(
        self, name: str, country: Optional[str], ignore_id: Optional[str] = None
    ) -> tuple[str, Optional[str]]:
        clean_name = name.strip()
        if not clean_name:
            raise ValidationError("O nome do autor não pode ser vazio.")
        duplicate = any(
            a.name.casefold() == clean_name.casefold() and a.id != ignore_id
            for a in self.authors.find_all()
        )
        if duplicate:
            raise ValidationError(f'Já existe um autor chamado "{clean_name}".')
        clean_country = country.strip() if country and country.strip() else None
        return clean_name, clean_country

    def _get_or_fail(self, id: str) -> AuthorRecord:
        author = self.authors.find_by_id(id)
        if author is None:
            raise NotFoundError(f"Autor {id} não encontrado.")
        return author


class BookService:
    def __init__(self, books: BookRepository, authors: AuthorRepository) -> None:
        self.books = books
        self.authors = authors

    def list(
        self, status: Optional[ReadingStatus] = None, search: Optional[str] = None
    ) -> list[BookRecord]:
        return self.books.find_all(status=status, search=search)

    def get(self, id: str) -> Optional[BookRecord]:
        return self.books.find_by_id(id)

    def add(self, title: str, year: int, pages: int, author_id: str) -> BookRecord:
        if not title.strip():
            raise ValidationError("O título não pode ser vazio.")
        current_year = date.today().year
        if year > current_year:
            raise ValidationError(
                f"O ano ({year}) não pode ser maior que o ano atual ({current_year})."
            )
        if pages < 1:
            raise ValidationError("O livro precisa ter pelo menos 1 página.")
        if not self.authors.exists(author_id):
            raise NotFoundError(f"Autor {author_id} não encontrado.")

        return self.books.create(
            BookRecord(
                id="",  # gerado pelo repositório
                title=title.strip(),
                year=year,
                pages=pages,
                status=ReadingStatus.WANT_TO_READ,
                author_id=str(author_id),
            )
        )

    def update_status(self, id: str, status: ReadingStatus) -> BookRecord:
        self._get_or_fail(id)
        changes: dict = {"status": status}
        # Só se avalia o que foi lido: ao sair de FINISHED, a nota é descartada
        if status != ReadingStatus.FINISHED:
            changes["rating"] = None
        return self.books.update(id, **changes)

    def rate(self, id: str, rating: int) -> BookRecord:
        if not 1 <= rating <= 5:
            raise ValidationError(f"Nota inválida ({rating}): a nota deve estar entre 1 e 5.")
        book = self._get_or_fail(id)
        if book.status != ReadingStatus.FINISHED:
            raise ValidationError(
                f'Só é possível avaliar livros lidos (FINISHED). "{book.title}" está como {book.status.value}.'
            )
        return self.books.update(id, rating=rating)

    def delete(self, id: str) -> bool:
        self._get_or_fail(id)
        return self.books.delete(id)

    def _get_or_fail(self, id: str) -> BookRecord:
        book = self.books.find_by_id(id)
        if book is None:
            raise NotFoundError(f"Livro {id} não encontrado.")
        return book


@dataclass
class StatsData:
    total_books: int
    finished_books: int
    average_rating: Optional[float]
    total_pages_read: int


class StatsService:
    def __init__(self, books: BookRepository) -> None:
        self.books = books

    def compute(self) -> StatsData:
        books = self.books.find_all()
        finished = [b for b in books if b.status == ReadingStatus.FINISHED]
        ratings = [b.rating for b in books if b.rating is not None]
        return StatsData(
            total_books=len(books),
            finished_books=len(finished),
            average_rating=round(sum(ratings) / len(ratings), 2) if ratings else None,
            total_pages_read=sum(b.pages for b in finished),
        )


# ---------------------------------------------------------------------------
# Seed e composição das dependências
# ---------------------------------------------------------------------------
SEED_AUTHORS = [
    ("Machado de Assis", "Brasil"),
    ("Clarice Lispector", "Brasil"),
    ("George Orwell", "Reino Unido"),
    ("Miguel de Cervantes", "Espanha"),
    ("The Author", "Brasil")
]

SEED_BOOKS = [
    ("Dom Casmurro", 1899, 256, ReadingStatus.FINISHED, 5, "1"),
    ("Memórias Póstumas de Brás Cubas", 1881, 208, ReadingStatus.READING, None, "1"),
    ("A Hora da Estrela", 1977, 88, ReadingStatus.FINISHED, 4, "2"),
    ("A Paixão Segundo G.H.", 1964, 176, ReadingStatus.WANT_TO_READ, None, "2"),
    ("1984", 1949, 328, ReadingStatus.FINISHED, None, "3"),
    ("A Revolução dos Bichos", 1945, 152, ReadingStatus.WANT_TO_READ, None, "3"),
    ("Dom Quixote", 1605, 1056, ReadingStatus.READING, None, "4"),
]


@dataclass
class Services:
    authors: AuthorService
    books: BookService
    stats: StatsService


def create_services() -> Services:
    """Único lugar que sabe qual implementação de repositório está em uso."""
    author_repo = InMemoryAuthorRepository(SEED_AUTHORS)
    book_repo = InMemoryBookRepository(
        BookRecord(id="", title=t, year=y, pages=p, status=s, rating=r, author_id=a)
        for t, y, p, s, r, a in SEED_BOOKS
    )
    return Services(
        authors=AuthorService(author_repo, book_repo),
        books=BookService(book_repo, author_repo),
        stats=StatsService(book_repo),
    )
