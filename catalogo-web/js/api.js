// api.js – comunicação com a API GraphQL (sem nada de DOM aqui)

// Para Android Emulator use http://10.0.2.2:8000/graphql; para celular, o IP do PC.
export const API_URL = "http://localhost:8000/graphql";

// Fragment reaproveitado em todas as operações que devolvem Book
const BOOK_FIELDS = `
  fragment BookFields on Book {
    id title year pages status rating
    author { id name }
  }`;

const STATS_FIELDS = `stats { totalBooks finishedBooks averageRating totalPagesRead }`;

// Uma única requisição traz livros + estatísticas (+ autores no carregamento inicial)
const BOOKS_Q = `
  query Books($status: ReadingStatus, $search: String) {
    books(status: $status, search: $search) { ...BookFields }
    ${STATS_FIELDS}
  }
  ${BOOK_FIELDS}`;

const INITIAL_Q = `
  query Initial($status: ReadingStatus, $search: String) {
    books(status: $status, search: $search) { ...BookFields }
    authors { id name }
    ${STATS_FIELDS}
  }
  ${BOOK_FIELDS}`;

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
export const fetchCatalog = (filters, { withAuthors = false } = {}) =>
  gql(withAuthors ? INITIAL_Q : BOOKS_Q, filters);

export const addBook = (input) => gql(ADD_BOOK_M, { input });

export const updateBookStatus = (id, status) => gql(UPDATE_STATUS_M, { id, status });

export const rateBook = (id, rating) => gql(RATE_M, { id, rating });

export const deleteBook = (id) => gql(DELETE_M, { id });
