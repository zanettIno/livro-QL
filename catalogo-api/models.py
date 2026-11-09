"""Modelos de domínio: o que os repositórios guardam."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional

import strawberry


@strawberry.enum
class ReadingStatus(Enum):
    WANT_TO_READ = "WANT_TO_READ"
    READING = "READING"
    FINISHED = "FINISHED"


@dataclass
class AuthorRecord:
    id: str
    name: str
    country: Optional[str] = None


@dataclass
class BookRecord:
    id: str
    title: str
    year: int
    pages: int
    status: ReadingStatus
    author_id: str
    rating: Optional[int] = None
