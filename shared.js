// shared.js — lógica compartilhada entre assistidos, watchlist e assistindo

const API_KEY = "137645a15bec14eae77e0f109056e7e3";

let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let filmeSelecionado = null;
let notaSelecionada = 0;
let categoriaAtual = "";

// ---- CONTADORES DO MENU ----
function atualizarMenu() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];

    const counts = {
        todos: filmesSalvos.length,
        assistidos: filmesSalvos.filter(f => f.categoria === "Assistido").length,
        watchlist: filmesSalvos.filter(f => f.categoria === "Quero ver").length,
        assistindo: filmesSalvos.filter(f => f.categoria === "Assistindo").length,
    };

    const el = (id) => document.getElementById(id);
    if (el("nav-todos"))      el("nav-todos").innerText      = counts.todos;
    if (el("nav-assistidos")) el("nav-assistidos").innerText = counts.assistidos;
    if (el("nav-watchlist"))  el("nav-watchlist").innerText  = counts.watchlist;
    if (el("nav-assistindo")) el("nav-assistindo").innerText = counts.assistindo;
}

// ---- RENDER ----
function renderizarLista(categoria, filtro = "") {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];

    const lista = filmesSalvos.filter(f => {
        const categoriaOk = f.categoria === categoria;
        const filtroOk = filtro === "" || f.titulo.toLowerCase().includes(filtro.toLowerCase());
        return categoriaOk && filtroOk;
    });

    const container = document.getElementById("lista-filmes");
    const vazio = document.getElementById("vazio");
    const contador = document.getElementById("contador");

    container.innerHTML = "";

    if (lista.length === 0) {
        vazio.classList.remove("hidden");
        contador.innerText = 0;
        atualizarCardsSecundarios(categoria);
        return;
    }

    vazio.classList.add("hidden");
    contador.innerText = lista.length;

    lista.forEach(filme => {
        const poster = filme.imagem
            ? `https://image.tmdb.org/t/p/w500${filme.imagem}`
            : "https://via.placeholder.com/250x350?text=Sem+Imagem";

        const estrelas = "★".repeat(filme.nota || 0) + "☆".repeat(5 - (filme.nota || 0));

        const div = document.createElement("div");
        div.classList.add("movie");
        div.innerHTML = `
            <img src="${poster}" alt="${filme.titulo}">
            <div class="info">
                <h3 class="nome">${filme.titulo}</h3>
                <span class="diretor">${estrelas}</span>
                <span class="status">${filme.categoria}</span>
            </div>
        `;

        div.addEventListener("click", () => abrirModal(filme));
        container.appendChild(div);
    });

    atualizarCardsSecundarios(categoria);
}

function atualizarCardsSecundarios(categoria) {
    const lista = filmesSalvos.filter(f => f.categoria === categoria);
    const total = lista.length;
    const media = total > 0
        ? (lista.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;
    const melhor = total > 0 ? Math.max(...lista.map(f => f.nota || 0)) : "—";

    const el = (id) => document.getElementById(id);
    if (el("card-total"))  el("card-total").innerText  = total;
    if (el("card-media"))  el("card-media").innerText  = media;
    if (el("card-melhor")) el("card-melhor").innerText = melhor;
}

// ---- MODAL ----
function abrirModal(filme) {
    filmeSelecionado = filme;
    notaSelecionada = filme.nota || 0;

    document.getElementById("tituloFilme").innerText = filme.titulo;

    const poster = filme.imagem
        ? `https://image.tmdb.org/t/p/w500${filme.imagem}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";

    document.getElementById("posterDetalhe").src = poster;
    document.getElementById("descricaoFilme").innerText = filme.descricao || "";
    document.getElementById("suaNota").innerText = filme.nota
        ? "⭐ Sua nota: " + filme.nota
        : "Sem nota";

    document.getElementById("categoriaFilme").value = filme.categoria || categoriaAtual;

    // preenche estrelas
    document.querySelectorAll(".rating span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
    });

    document.getElementById("modal").classList.add("active");
}

function fecharModal() {
    document.getElementById("modal").classList.remove("active");
    filmeSelecionado = null;
}

// ---- ESTRELAS ----
function ativarEstrelas() {
    document.querySelectorAll(".rating span").forEach(star => {
        star.addEventListener("click", () => {
            notaSelecionada = Number(star.dataset.value);
            document.querySelectorAll(".rating span").forEach(s => {
                s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
            });
        });
    });
}

// ---- SALVAR ----
function salvar() {
    if (!filmeSelecionado) return;

    const index = filmesSalvos.findIndex(f => f.id === filmeSelecionado.id);
    if (index < 0) return;

    filmesSalvos[index].nota = notaSelecionada;
    filmesSalvos[index].categoria = document.getElementById("categoriaFilme").value;

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));

    mostrarToast("Filme atualizado!");
    fecharModal();
    renderizarLista(categoriaAtual);
    atualizarMenu();
}

// ---- REMOVER ----
function remover() {
    if (!filmeSelecionado) return;
    if (!confirm(`Remover "${filmeSelecionado.titulo}" da lista?`)) return;

    filmesSalvos = filmesSalvos.filter(f => f.id !== filmeSelecionado.id);
    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));

    mostrarToast("Filme removido.");
    fecharModal();
    renderizarLista(categoriaAtual);
    atualizarMenu();
}

// ---- TOAST ----
function mostrarToast(mensagem) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    toast.innerText = mensagem;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---- FILTRO LOCAL ----
function ativarFiltroLocal() {
    const buscador = document.getElementById("buscador");
    if (!buscador) return;
    buscador.addEventListener("input", () => {
        renderizarLista(categoriaAtual, buscador.value);
    });
}

// ---- INICIALIZAR ----
// chamado em cada página com a categoria correspondente
function inicializarPagina(categoria) {
    categoriaAtual = categoria;

    atualizarMenu();
    renderizarLista(categoria);
    ativarEstrelas();
    ativarFiltroLocal();

    document.getElementById("fecharModal").addEventListener("click", fecharModal);
    document.getElementById("salvar").addEventListener("click", salvar);
    document.getElementById("remover").addEventListener("click", remover);

    document.getElementById("modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("modal")) fecharModal();
    });
}