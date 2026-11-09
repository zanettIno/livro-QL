# Livro-QL – Meu Catálogo de Livros (GraphQL)

<img src="catalogo-web/assets/logo.png" alt="Logo Livro-QL" width="160">

App para registrar livros, autores e o progresso de leitura. O backend usa **FastAPI + Strawberry GraphQL**, organizado com **repository pattern**. O front-end é **HTML + JavaScript puro em módulos**.

## Estrutura

```
schema.graphql            # Parte 1 – schema em SDL
catalogo-api/             # Parte 2 – backend
  main.py                 # camada GraphQL: tipos, Query, Mutation, FastAPI + CORS
  services.py             # regras de negócio, validações, seed e montagem das dependências
  repositories.py         # contratos (Protocol) e repositórios em memória
  models.py               # enum ReadingStatus e registros de domínio
  requirements.txt
catalogo-web/             # Parte 3 – front-end
  index.html
  js/
    api.js                # gql(), queries/mutations e fragment BookFields
    ui.js                 # renderização da tela (sem chamadas à API)
    main.js               # estado, eventos e ligação api <-> ui
  assets/logo.png
RESPOSTAS.md              # Perguntas de reflexão (Parte 1) e análise (Parte 4)
```

## Arquitetura (backend)

```
main.py (resolvers)  →  services.py (regras)  →  repositories.py (dados)
```

- **Resolvers** (`main.py`): os tipos Strawberry com os resolvers nas classes (`Author.books`, `Author.bookCount`, `Book.author`). Eles só repassam a chamada para os services.
- **Services** (`services.py`): concentram as validações e as regras de negócio, por exemplo "só avalia livro lido".
- **Repositories** (`repositories.py`): só guardam e buscam dados. Os contratos são `Protocol`s, e a implementação atual usa um `dict` em memória. Para usar um banco de dados, basta criar outra classe com os mesmos métodos, como `SqliteBookRepository`, e trocá-la em `create_services()`. Nenhum resolver muda.

## Como rodar

```bash
cd catalogo-api
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Linux/macOS:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

- **Front-end:** <http://localhost:8000/>. O FastAPI serve a pasta `catalogo-web`.
- **GraphiQL:** <http://localhost:8000/graphql>

> O front usa `<script type="module">`, e módulos ES não carregam abrindo o `index.html` direto do disco (`file://`). Por isso o FastAPI serve a pasta. Outra opção é rodar `python -m http.server 5500` dentro de `catalogo-web`, com a API ligada.

Os dados ficam em memória: o seed tem 4 autores e 7 livros, e tudo volta ao estado inicial quando o servidor reinicia.

## Funcionalidades

- **Queries:** `books(status, search)`, `book(id)`, `authors`, `stats`
- **Mutations:** `addAuthor`, `addBook`, `updateBookStatus`, `rateBook`, `deleteBook`
- **Enum** `ReadingStatus` com `@strawberry.enum`
- **Resolvers nas classes:** `Author.books`, `Author.bookCount`, `Book.author` (calculados na hora)
- **Validações** (todas retornam erro GraphQL):
  - título vazio
  - ano no futuro
  - páginas < 1
  - autor inexistente
  - nota fora de 1–5
  - avaliar um livro que não está `FINISHED`
  - id inexistente em `updateBookStatus` ou `deleteBook`
- **Regra extra:** um livro que sai de `FINISHED` perde a nota, porque só se avalia o que foi lido.
- **Front-end** (identidade visual do Livro-QL):
  - painel de estatísticas
  - filtros por status
  - busca por título
  - cadastro de livro com seletor de autores
  - troca de status por `<select>`
  - nota habilitada só para livros lidos
  - exclusão com `confirm`
  - estados de carregamento, erro e lista vazia

**Desafio extra escolhido:** **JavaScript separado em módulos** (`api.js`, `ui.js`, `main.js`) com `type="module"`. Também foram usados **fragments** (`BookFields`) e **debounce** de 300 ms na busca.

## Exemplos

```graphql
query {
  books(status: FINISHED, search: "dom") {
    title
    rating
    author { name }
  }
  stats { totalBooks finishedBooks averageRating totalPagesRead }
  authors { name bookCount }
}
```

```graphql
mutation {
  rateBook(id: 1, rating: 9) { id rating }
}
# → "Nota inválida (9): a nota deve estar entre 1 e 5."
```
