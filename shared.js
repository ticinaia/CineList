const API_KEY = "137645a15bec14eae77e0f109056e7e3";

let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let filmeSelecionado = null;
let notaSelecionada = 0;
let categoriaAtual = "";
let filtroAtual = "";
const cacheDuracoes = JSON.parse(localStorage.getItem("cache_duracoes") || "{}");
const cacheDuracoesSeries = JSON.parse(localStorage.getItem("cache_duracoes_series") || "{}");
let watchlistDragAtivo = false;
let watchlistDragInicioX = 0;
let watchlistScrollInicio = 0;

function obterListaBase(categoria) {
    return categoria === "WatchList"
        ? filmesSalvos.filter(f => f.watchlist === true)
        : filmesSalvos.filter(f => f.categoria === categoria);
}

function atualizarEstadoVazio(categoria, filtro, listaBase, listaFiltrada) {
    const vazio = document.getElementById("vazio");
    const feedback = document.getElementById("feedback-filtro");
    if (!vazio) return;

    if (feedback) feedback.classList.add("hidden");

    if (listaFiltrada.length > 0) {
        vazio.classList.add("hidden");
        return;
    }

    vazio.classList.remove("hidden");

    if (categoria === "Assistido" && filtro && listaBase.length > 0) {
        vazio.innerHTML = `
            <p>Nenhum título assistido corresponde a "${filtro}".</p>
            <button type="button" id="limpar-filtro-vazio">Limpar busca</button>
        `;

        if (feedback) {
            feedback.innerHTML = `
                <p>Seu filtro está ativo e não encontrou resultados entre os títulos assistidos.</p>
                <button type="button" id="limpar-filtro-feedback">Mostrar todos</button>
            `;
            feedback.classList.remove("hidden");
        }
    } else if (categoria === "WatchList" && filtro && listaBase.length > 0) {
        vazio.innerHTML = `
            <p>Nada da sua watchlist combina com "${filtro}".</p>
            <button type="button" id="limpar-filtro-vazio">Limpar busca</button>
        `;
    } else if (categoria === "WatchList") {
        vazio.innerHTML = `
            <p>Sua watchlist está vazia.</p>
            <a href="index.html">Adicionar filmes</a> ou <a href="series.html">Adicionar séries</a>
        `;
    } else if (categoria === "Assistido") {
        vazio.innerHTML = `
            <p>Nenhum título assistido ainda.</p>
            <a href="index.html">Adicionar filmes</a> ou <a href="series.html">Adicionar séries</a>
        `;
    }

    document.getElementById("limpar-filtro-vazio")?.addEventListener("click", limparFiltroLocal);
    document.getElementById("limpar-filtro-feedback")?.addEventListener("click", limparFiltroLocal);
}

function atualizarControlesCarousel() {
    if (categoriaAtual !== "WatchList") return;
    const container = document.getElementById("lista-filmes");
    const prev = document.getElementById("watchlist-prev");
    const next = document.getElementById("watchlist-next");
    const progress = document.getElementById("watchlist-progress-bar");
    if (!container || !prev || !next) return;

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    prev.disabled = container.scrollLeft <= 4;
    next.disabled = container.scrollLeft >= maxScroll - 4;

    if (progress) {
        const proporcao = maxScroll <= 0 ? 1 : Math.min(1, container.scrollLeft / maxScroll);
        progress.style.transform = `scaleX(${Math.max(0.08, proporcao)})`;
    }
}

function atualizarCarouselWatchlist() {
    if (categoriaAtual !== "WatchList") return;
    const container = document.getElementById("lista-filmes");
    if (!container) return;
    container.classList.add("watchlist-carousel");
    atualizarControlesCarousel();
}

function rolarWatchlist(direcao) {
    const container = document.getElementById("lista-filmes");
    if (!container) return;
    const card = container.querySelector(".movie");
    const distancia = card ? card.offsetWidth + 20 : 240;
    container.scrollBy({ left: direcao * distancia * 1.2, behavior: "smooth" });
    setTimeout(atualizarControlesCarousel, 250);
}

function iniciarInteracaoCarousel() {
    if (categoriaAtual !== "WatchList") return;
    const container = document.getElementById("lista-filmes");
    if (!container || container.dataset.carouselBound === "true") return;

    container.dataset.carouselBound = "true";

    container.addEventListener("mousedown", (e) => {
        watchlistDragAtivo = true;
        watchlistDragInicioX = e.pageX - container.offsetLeft;
        watchlistScrollInicio = container.scrollLeft;
        container.classList.add("is-dragging");
    });

    window.addEventListener("mouseup", () => {
        watchlistDragAtivo = false;
        container.classList.remove("is-dragging");
    });

    container.addEventListener("mouseleave", () => {
        watchlistDragAtivo = false;
        container.classList.remove("is-dragging");
    });

    container.addEventListener("mousemove", (e) => {
        if (!watchlistDragAtivo) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - watchlistDragInicioX) * 1.2;
        container.scrollLeft = watchlistScrollInicio - walk;
        atualizarControlesCarousel();
    });

    container.addEventListener("wheel", (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        container.scrollBy({ left: e.deltaY * 0.8, behavior: "auto" });
        atualizarControlesCarousel();
    }, { passive: false });
}

function limparFiltroLocal() {
    const buscador = document.getElementById("buscador");
    if (buscador) buscador.value = "";
    filtroAtual = "";
    renderizarLista(categoriaAtual, "");
}

// ---- RENDER ----
function renderizarLista(categoria, filtro = "") {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    filtroAtual = filtro;
    const listaBase = obterListaBase(categoria);

    const lista = filmesSalvos.filter(f => {
        const categoriaOk = categoria === "WatchList"
            ? f.watchlist === true
            : f.categoria === categoria;
        const filtroOk = filtro === "" || (f.titulo || "").toLowerCase().includes(filtro.toLowerCase());
        return categoriaOk && filtroOk;
    });

    const container = document.getElementById("lista-filmes");
    const vazio = document.getElementById("vazio");
    const contador = document.getElementById("contador");

    container.innerHTML = "";
    container.classList.toggle("watchlist-carousel", categoria === "WatchList");

    if (lista.length === 0) {
        atualizarEstadoVazio(categoria, filtro, listaBase, lista);
        if (contador) contador.innerText = 0;
        atualizarCardsSecundarios(categoria);
        atualizarControlesCarousel();
        return;
    }

    if (vazio) vazio.classList.add("hidden");
    document.getElementById("feedback-filtro")?.classList.add("hidden");
    if (contador) contador.innerText = lista.length;

    lista.forEach(filme => {
        const poster = filme.imagem
            ? `https://image.tmdb.org/t/p/w500${filme.imagem}`
            : "https://via.placeholder.com/250x350?text=Sem+Imagem";

        const estrelas = "★".repeat(filme.nota || 0) + "☆".repeat(5 - (filme.nota || 0));
        const badgeTipo = filme.tipo === "serie"
            ? `<span class="badge-tipo badge-serie">Série</span>`
            : `<span class="badge-tipo badge-filme">Filme</span>`;

        const card = criarCardMidia({
            item: {
                poster_path: filme.imagem,
                title: filme.titulo
            },
            tipo: filme.tipo === "serie" ? "serie" : "filme",
            salvo: filme,
            ano: estrelas,
            notaTexto: "",
            onActivate: () => abrirModal(filme)
        });

        const status = card.querySelector(".status");
        if (status) status.textContent = filme.categoria;
        const nota = card.querySelector(".nota-tmdb");
        if (nota) nota.remove();
        container.appendChild(card);
    });

    atualizarCardsSecundarios(categoria);
    atualizarCarouselWatchlist();
    iniciarInteracaoCarousel();
}

function atualizarCardsSecundarios(categoria) {
    const lista = obterListaBase(categoria);

    const total = lista.length;
    const media = total > 0
        ? (lista.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;
    const melhor = total > 0 ? Math.max(...lista.map(f => f.nota || 0)) : "—";

    const el = (id) => document.getElementById(id);
    if (el("card-total"))  el("card-total").innerText  = total;
    if (el("card-media"))  el("card-media").innerText  = media;
    if (el("card-melhor")) el("card-melhor").innerText = melhor;
    if (categoria === "Assistido") calcularHorasAssistidos(lista);
}

async function buscarDuracaoFilme(tmdbId) {
    if (cacheDuracoes[tmdbId] !== undefined) return cacheDuracoes[tmdbId];

    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}`);
        const data = await res.json();
        const min = data.runtime || 0;
        cacheDuracoes[tmdbId] = min;
        localStorage.setItem("cache_duracoes", JSON.stringify(cacheDuracoes));
        return min;
    } catch {
        return 0;
    }
}

async function buscarDuracaoSerie(tmdbId) {
    if (cacheDuracoesSeries[tmdbId] !== undefined) return cacheDuracoesSeries[tmdbId];

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=pt-BR`);
        const data = await res.json();
        const runtimeMedio = Array.isArray(data.episode_run_time) ? (data.episode_run_time[0] || 0) : 0;
        const episodios = data.number_of_episodes || 0;
        const minutos = runtimeMedio * episodios;
        cacheDuracoesSeries[tmdbId] = minutos;
        localStorage.setItem("cache_duracoes_series", JSON.stringify(cacheDuracoesSeries));
        return minutos;
    } catch {
        return 0;
    }
}

async function calcularHorasAssistidos(lista) {
    const elHoras = document.getElementById("card-horas");
    if (!elHoras) return;

    const minutosCache = lista.reduce((acc, item) => {
        if (item.tipo === "serie") return acc + (cacheDuracoesSeries[item.id] || 0);
        return acc + (cacheDuracoes[item.id] || 0);
    }, 0);
    elHoras.innerText = formatarHoras(minutosCache);

    const semCache = lista.filter(item => {
        if (!item.id) return false;
        return item.tipo === "serie"
            ? cacheDuracoesSeries[item.id] === undefined
            : cacheDuracoes[item.id] === undefined;
    });
    if (semCache.length === 0) return;

    const lote = 5;
    for (let i = 0; i < semCache.length; i += lote) {
        const grupo = semCache.slice(i, i + lote);
        await Promise.all(grupo.map(item => item.tipo === "serie"
            ? buscarDuracaoSerie(item.id)
            : buscarDuracaoFilme(item.id)
        ));

        const totalMin = lista.reduce((acc, item) => {
            if (item.tipo === "serie") return acc + (cacheDuracoesSeries[item.id] || 0);
            return acc + (cacheDuracoes[item.id] || 0);
        }, 0);
        elHoras.innerText = formatarHoras(totalMin);
    }
}

function formatarHoras(minutos) {
    if (!minutos || minutos === 0) return "—";
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
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
    atualizarVisualCategoriaSelect();
    document.getElementById("watchlist").checked = filme.watchlist || false;

    window.atualizarEstrelas(document.querySelector(".rating"), notaSelecionada);

    abrirModalAcessivel("modal");
}

function fecharModal() {
    fecharModalAcessivel("modal");
    filmeSelecionado = null;
}

function configurarAvaliacaoModal() {
    window.ativarEstrelas(document.querySelector(".rating"), (nota) => {
        notaSelecionada = nota;
        window.atualizarEstrelas(document.querySelector(".rating"), notaSelecionada);
    });
}

function salvar() {
    if (!filmeSelecionado) return;

    const index = filmesSalvos.findIndex(f => f.id === filmeSelecionado.id && f.tipo === filmeSelecionado.tipo);
    if (index < 0) return;

    filmesSalvos[index].nota = notaSelecionada;
    filmesSalvos[index].categoria = document.getElementById("categoriaFilme").value;
    filmesSalvos[index].watchlist = document.getElementById("watchlist").checked;

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    mostrarToast("Salvo!");
    fecharModal();
    renderizarLista(categoriaAtual);
}

function remover() {
    if (!filmeSelecionado) return;
    if (!confirm(`Remover "${filmeSelecionado.titulo}" da lista?`)) return;

    filmesSalvos = filmesSalvos.filter(f => !(f.id === filmeSelecionado.id && f.tipo === filmeSelecionado.tipo));
    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));

    mostrarToast("Removido.");
    fecharModal();
    renderizarLista(categoriaAtual);
}

function ativarFiltroLocal() {
    const buscador = document.getElementById("buscador");
    if (!buscador) return;
    buscador.addEventListener("input", () => {
        renderizarLista(categoriaAtual, buscador.value);
    });
}

function inicializarPagina(categoria) {
    categoriaAtual = categoria;
    renderizarLista(categoria);
    configurarAvaliacaoModal();
    ativarFiltroLocal();
    ativarVisualCategoriaSelect();

    document.getElementById("fecharModal").addEventListener("click", fecharModal);
    document.getElementById("salvar").addEventListener("click", salvar);

    const btnRemover = document.getElementById("remover");
    if (btnRemover) btnRemover.addEventListener("click", remover);

    document.getElementById("modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("modal")) fecharModal();
    });

    document.getElementById("watchlist-prev")?.addEventListener("click", () => rolarWatchlist(-1));
    document.getElementById("watchlist-next")?.addEventListener("click", () => rolarWatchlist(1));
    document.getElementById("lista-filmes")?.addEventListener("scroll", atualizarControlesCarousel, { passive: true });
    window.addEventListener("resize", atualizarControlesCarousel);
}
