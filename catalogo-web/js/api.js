// api.js – comunicação com a API GraphQL (sem nada de DOM aqui)

// Para Android Emulator use http://10.0.2.2:8000/graphql; para celular, o IP do PC.
export const API_URL = "http://localhost:8000/graphql";

// Fragment reaproveitado em todas as operações que devolvem Book
const BOOK_FIELDS = `
  fragment BookFields on Book {
    id title year pages status rating
    author { id name }
  }`;

const AUTHOR_FIELDS = `
  fragment AuthorFields on Author {
    id name country bookCount
  }`;

// Uma única requisição traz tudo que a tela precisa: livros, autores e estatísticas
const CATALOG_Q = `
  query Catalog($status: ReadingStatus, $search: String) {
    books(status: $status, search: $search) { ...BookFields }
    authors { ...AuthorFields }
    stats { totalBooks finishedBooks averageRating totalPagesRead }
  }
  ${BOOK_FIELDS}
  ${AUTHOR_FIELDS}`;

const ADD_AUTHOR_M = `
  mutation AddAuthor($input: AuthorInput!) {
    addAuthor(input: $input) { ...AuthorFields }
  }
  ${AUTHOR_FIELDS}`;

const UPDATE_AUTHOR_M = `
  mutation UpdateAuthor($id: ID!, $input: AuthorInput!) {
    updateAuthor(id: $id, input: $input) { ...AuthorFields }
  }
  ${AUTHOR_FIELDS}`;

const DELETE_AUTHOR_M = `mutation DeleteAuthor($id: ID!) { deleteAuthor(id: $id) }`;

const ADD_BOOK_M = `
  mutation AddBook($input: BookInput!) {
    addBook(input: $input) { ...BookFields }
  }
  ${BOOK_FIELDS}`;

const UPDATE_STATUS_M = `
  mutation UpdateStatus($id: ID!, $status: ReadingStatus!) {
    updateBookStatus(id: $id, status: $status) { ...BookFields }
  }
  ${BOOK_FIELDS}`;

const RATE_M = `
  mutation Rate($id: ID!, $rating: Int!) {
    rateBook(id: $id, rating: $rating) { ...BookFields }
  }
  ${BOOK_FIELDS}`;

const DELETE_M = `mutation Delete($id: ID!) { deleteBook(id: $id) }`;

// Função genérica: toda chamada GraphQL é um POST com { query, variables }
export async function gql(query, variables = {}) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_URL}. O servidor está rodando?`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  // GraphQL responde 200 mesmo com erro: é preciso checar "errors"
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

// Operações usadas pela tela
export const fetchCatalog = (filters) => gql(CATALOG_Q, filters);

// CRUD de autores
export const addAuthor = (input) => gql(ADD_AUTHOR_M, { input });

export const updateAuthor = (id, input) => gql(UPDATE_AUTHOR_M, { id, input });

export const deleteAuthor = (id) => gql(DELETE_AUTHOR_M, { id });

export const addBook = (input) => gql(ADD_BOOK_M, { input });

export const updateBookStatus = (id, status) => gql(UPDATE_STATUS_M, { id, status });

export const rateBook = (id, rating) => gql(RATE_M, { id, rating });

export const deleteBook = (id) => gql(DELETE_M, { id });
