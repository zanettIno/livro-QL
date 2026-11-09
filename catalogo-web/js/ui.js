// ui.js – só desenha a tela. Não chama a API: avisa o main.js por callbacks.

export const STATUS_LABELS = { WANT_TO_READ: "Quero ler", READING: "Lendo", FINISHED: "Lido" };

export const $ = (id) => document.getElementById(id);

export function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.className = isError ? "error" : "";
}

export function renderStats(s) {
  $("st-total").textContent = s.totalBooks;
  $("st-finished").textContent = s.finishedBooks;
  $("st-rating").textContent = s.averageRating == null ? "—" : s.averageRating.toFixed(1) + " ★";
  $("st-pages").textContent = s.totalPagesRead.toLocaleString("pt-BR");
}

// Seletor de autor do formulário de livro (mantém a escolha atual, se ainda existir)
export function renderAuthorSelect(authors) {
  const sel = $("author");
  const current = sel.value;
  sel.length = 1; // mantém só o placeholder
  for (const a of authors) sel.add(new Option(a.name, a.id));
  sel.value = authors.some((a) => a.id === current) ? current : "";
}

/**
 * Lista do CRUD de autores.
 * handlers: { editingId, onEdit(author), onDelete(author) }
 */
export function renderAuthorList(authors, { editingId, onEdit, onDelete }) {
  $("authors-count").textContent = `(${authors.length})`;
  const list = $("author-list");
  list.innerHTML = "";
  for (const a of authors) {
    const li = el("li", a.id === editingId ? "editing" : null);
    const books = a.bookCount === 1 ? "1 livro" : `${a.bookCount} livros`;
    const info = el("span", "info", [a.country, books].filter(Boolean).join(" · "));

    const edit = el("button", null, "Editar");
    edit.onclick = () => onEdit(a);
    const del = el("button", null, "Excluir");
    del.onclick = () => onDelete(a);
    const actions = el("span", "actions");
    actions.append(edit, del);

    li.append(el("span", "name", a.name), info, actions);
    list.appendChild(li);
  }
}

export function readAuthorForm() {
  return { name: $("author-name").value, country: $("author-country").value || null };
}

// Alterna o formulário de autor entre "adicionar" e "editar"
export function setAuthorFormMode(author) {
  const editing = Boolean(author);
  $("author-form").classList.toggle("editing", editing);
  $("author-name").value = author?.name ?? "";
  $("author-country").value = author?.country ?? "";
  $("author-submit").textContent = editing ? "Salvar alterações" : "Adicionar autor";
  $("author-cancel").hidden = !editing;
  if (editing) {
    $("authors-card").open = true;
    $("author-name").focus();
  }
}

export function readBookForm() {
  return {
    title: $("title").value,
    year: Number($("year").value),
    pages: Number($("pages").value),
    authorId: $("author").value,
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function makeSelect(options, value) {
  const sel = document.createElement("select");
  for (const [val, label] of options) sel.add(new Option(label, val));
  sel.value = value;
  return sel;
}

function renderEmpty(list, hasFilters) {
  const li = el("li", "empty");
  const img = el("img");
  img.src = "assets/logo.png";
  img.alt = "";
  const msg = el(
    "div",
    null,
    hasFilters
      ? "Nenhum livro encontrado com esses filtros."
      : "Nenhum livro cadastrado ainda. Adicione o primeiro acima!"
  );
  li.append(img, msg);
  list.appendChild(li);
}

/**
 * Desenha a lista de livros.
 * handlers: { onStatusChange(book, status), onRate(book, rating), onDelete(book) }
 */
export function renderBooks(books, { hasFilters, onStatusChange, onRate, onDelete }) {
  const list = $("list");
  list.innerHTML = "";
  if (!books.length) return renderEmpty(list, hasFilters);

  for (const b of books) {
    const li = el("li", b.status);

    const info = el("div", "info");
    const meta = el("div", "meta");
    const stars = b.rating ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating) : "";
    meta.append(
      el("span", "pill " + b.status, STATUS_LABELS[b.status]),
      el("span", null, [b.author.name, b.year, b.pages + " páginas"].join(" · ")),
      el("span", "stars", stars)
    );
    info.append(el("div", "title", b.title), meta);

    // Alterar status
    const statusSel = makeSelect(Object.entries(STATUS_LABELS), b.status);
    statusSel.title = "Status de leitura";
    statusSel.onchange = () => onStatusChange(b, statusSel.value);

    // Nota: só habilitada em livros lidos
    const ratingOpts = [["", "Nota"], ...[1, 2, 3, 4, 5].map((n) => [String(n), "★".repeat(n)])];
    const ratingSel = makeSelect(ratingOpts, b.rating ? String(b.rating) : "");
    const finished = b.status === "FINISHED";
    ratingSel.disabled = !finished;
    ratingSel.title = finished ? "Avaliar de 1 a 5" : "Só é possível avaliar livros lidos";
    ratingSel.onchange = () => ratingSel.value && onRate(b, Number(ratingSel.value));

    const del = el("button", "del", "Excluir");
    del.onclick = () => onDelete(b);

    li.append(info, statusSel, ratingSel, del);
    list.appendChild(li);
  }
}
