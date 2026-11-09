// main.js – estado da tela e ligação entre eventos, API e UI

import * as api from "./api.js";
import * as ui from "./ui.js";

const filters = { status: null, search: null };

// Executa uma ação e mostra qualquer erro (HTTP ou "errors" do GraphQL) na tela
async function run(action) {
  try {
    await action();
  } catch (err) {
    ui.setStatus("Erro: " + err.message, true);
  }
}

const handlers = {
  onStatusChange: (book, status) =>
    run(async () => {
      await api.updateBookStatus(book.id, status);
      await load();
    }),
  onRate: (book, rating) =>
    run(async () => {
      await api.rateBook(book.id, rating);
      await load();
    }),
  onDelete: (book) => {
    if (!confirm(`Excluir "${book.title}" do catálogo?`)) return;
    run(async () => {
      await api.deleteBook(book.id);
      await load();
    });
  },
};

async function load({ withAuthors = false } = {}) {
  ui.setStatus("Carregando...");
  const data = await api.fetchCatalog(filters, { withAuthors });
  if (withAuthors) ui.renderAuthors(data.authors);
  ui.renderStats(data.stats);
  ui.renderBooks(data.books, {
    ...handlers,
    hasFilters: Boolean(filters.status || filters.search),
  });
  ui.setStatus("");
}

// Cadastro de livro
ui.$("year").max = new Date().getFullYear();
ui.$("form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    await api.addBook(ui.readBookForm());
    ui.$("form").reset();
    await load();
  });
};

// Filtro por status
const filterButtons = document.querySelectorAll(".filters button");
filterButtons.forEach((btn) => {
  btn.onclick = () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filters.status = btn.dataset.status || null;
    run(load);
  };
});

// Busca com debounce: só consulta 300 ms após o usuário parar de digitar
let searchTimer;
ui.$("search").oninput = (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.search = e.target.value.trim() || null;
    run(load);
  }, 300);
};

run(() => load({ withAuthors: true }));
