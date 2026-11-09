"""Camada GraphQL: tipos, Query, Mutation e a aplicação FastAPI.

Fluxo: resolvers (aqui) -> services (regras) -> repositories (dados).
"""

from pathlib import Path
from typing import Optional

import strawberry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from strawberry.fastapi import GraphQLRouter

from models import AuthorRecord, BookRecord, ReadingStatus
from services import Services, StatsData, create_services

# Criado uma vez: os dados em memória vivem enquanto o servidor estiver rodando
SERVICES: Services = create_services()


# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------
@strawberry.type
class Author:
    id: strawberry.ID
    name: str
    country: Optional[str] = None

    @staticmethod
    def from_record(r: AuthorRecord) -> "Author":
        return Author(id=strawberry.ID(r.id), name=r.name, country=r.country)

    @strawberry.field
    def books(self) -> list["Book"]:
        # Resolver: só executa se o cliente pedir o campo "books"
        return [Book.from_record(b) for b in SERVICES.authors.books_of(self.id)]

    @strawberry.field
    def book_count(self) -> int:
        return SERVICES.authors.book_count_of(self.id)


@strawberry.type
class Book:
    id: strawberry.ID
    title: str
    year: int
    pages: int
    status: ReadingStatus
    rating: Optional[int] = None
    # Private: guardado no objeto, mas não aparece no schema
    author_id: strawberry.Private[str] = ""

    @staticmethod
    def from_record(r: BookRecord) -> "Book":
        return Book(
            id=strawberry.ID(r.id),
            title=r.title,
            year=r.year,
            pages=r.pages,
            status=r.status,
            rating=r.rating,
            author_id=r.author_id,
        )

    @strawberry.field
    def author(self) -> Author:
        return Author.from_record(SERVICES.authors.get(self.author_id))


@strawberry.type
class Stats:
    total_books: int
    finished_books: int
    average_rating: Optional[float]
    total_pages_read: int

    @staticmethod
    def from_data(d: StatsData) -> "Stats":
        return Stats(
            total_books=d.total_books,
            finished_books=d.finished_books,
            average_rating=d.average_rating,
            total_pages_read=d.total_pages_read,
        )


@strawberry.input
class AuthorInput:
    name: str
    country: Optional[str] = None


@strawberry.input
class BookInput:
    title: str
    year: int
    pages: int
    author_id: strawberry.ID


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
@strawberry.type
class Query:
    @strawberry.field
    def books(
        self,
        status: Optional[ReadingStatus] = None,
        search: Optional[str] = None,
    ) -> list[Book]:
        return [Book.from_record(b) for b in SERVICES.books.list(status=status, search=search)]

    @strawberry.field
    def book(self, id: strawberry.ID) -> Optional[Book]:
        record = SERVICES.books.get(id)
        return Book.from_record(record) if record else None

    @strawberry.field
    def authors(self) -> list[Author]:
        return [Author.from_record(a) for a in SERVICES.authors.list()]

    @strawberry.field
    def author(self, id: strawberry.ID) -> Optional[Author]:
        record = SERVICES.authors.get(id)
        return Author.from_record(record) if record else None

    @strawberry.field
    def stats(self) -> Stats:
        return Stats.from_data(SERVICES.stats.compute())


# ---------------------------------------------------------------------------
# Mutation (validações ficam nos services)
# ---------------------------------------------------------------------------
@strawberry.type
class Mutation:
    @strawberry.mutation
    def add_author(self, input: AuthorInput) -> Author:
        return Author.from_record(SERVICES.authors.add(input.name, input.country))

    @strawberry.mutation
    def update_author(self, id: strawberry.ID, input: AuthorInput) -> Author:
        return Author.from_record(SERVICES.authors.update(id, input.name, input.country))

    @strawberry.mutation
    def delete_author(self, id: strawberry.ID) -> bool:
        return SERVICES.authors.delete(id)

    @strawberry.mutation
    def add_book(self, input: BookInput) -> Book:
        record = SERVICES.books.add(input.title, input.year, input.pages, str(input.author_id))
        return Book.from_record(record)

    @strawberry.mutation
    def update_book_status(self, id: strawberry.ID, status: ReadingStatus) -> Book:
        return Book.from_record(SERVICES.books.update_status(id, status))

    @strawberry.mutation
    def rate_book(self, id: strawberry.ID, rating: int) -> Book:
        return Book.from_record(SERVICES.books.rate(id, rating))

    @strawberry.mutation
    def delete_book(self, id: strawberry.ID) -> bool:
        return SERVICES.books.delete(id)


# ---------------------------------------------------------------------------
# Aplicação
# ---------------------------------------------------------------------------
schema = strawberry.Schema(query=Query, mutation=Mutation)

app = FastAPI(title="Livro-QL – Nosso Catálogo de Livros (GraphQL)")

# CORS liberado para o front-end (aberto via arquivo ou outro servidor) acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(GraphQLRouter(schema), prefix="/graphql")

# Serve o front-end em http://localhost:8000/ (módulos JS precisam de HTTP, não de file://).
# Montado por último para não sobrepor a rota /graphql.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "catalogo-web"
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
