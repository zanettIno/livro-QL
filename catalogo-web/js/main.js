// main.js – estado da tela e ligação entre eventos, API e UI

import * as api from "./api.js";
import * as ui from "./ui.js";

const filters = { status: null, search: null };
let editingAuthor = null; // autor sendo editado no CRUD (ou null)
let lastAuthors = [];

// Executa uma ação e mostra qualquer erro (HTTP ou "errors" do GraphQL) na tela
async function run(action) {
  try {
    await action();
  } catch (err) {
    ui.setStatus("Erro: " + err.message, true);
  }
}

// ---------------------------------------------------------------------------
// Livros
// ---------------------------------------------------------------------------
const bookHandlers = {
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

// ---------------------------------------------------------------------------
// Autores (CRUD)
// ---------------------------------------------------------------------------
const authorHandlers = {
  onEdit: (author) => {
    editingAuthor = author;
    ui.setAuthorFormMode(author);
    renderAuthors();
  },
  onDelete: (author) => {
    if (!confirm(`Excluir o autor "${author.name}"?`)) return;
    run(async () => {
      await api.deleteAuthor(author.id);
      if (editingAuthor?.id === author.id) cancelAuthorEdit();
      await load();
    });
  },
};

function renderAuthors() {
  ui.renderAuthorSelect(lastAuthors);
  ui.renderAuthorList(lastAuthors, { ...authorHandlers, editingId: editingAuthor?.id });
}

function cancelAuthorEdit() {
  editingAuthor = null;
  ui.setAuthorFormMode(null);
  renderAuthors();
}

ui.$("author-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const input = ui.readAuthorForm();
    if (editingAuthor) await api.updateAuthor(editingAuthor.id, input);
    else await api.addAuthor(input);
    editingAuthor = null;
    ui.setAuthorFormMode(null);
    await load();
  });
};
ui.$("author-cancel").onclick = cancelAuthorEdit;

// ---------------------------------------------------------------------------
// Carregamento: uma única query traz livros, autores e estatísticas
// ---------------------------------------------------------------------------
async function load() {
  ui.setStatus("Carregando...");
  const data = await api.fetchCatalog(filters);
  lastAuthors = data.authors;
  renderAuthors();
  ui.renderStats(data.stats);
  ui.renderBooks(data.books, {
    ...bookHandlers,
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

run(load);
