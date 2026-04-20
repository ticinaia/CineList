// ============================================================
//  CHAVES DE API
// ============================================================
const TMDB_API_KEY   = "137645a15bec14eae77e0f109056e7e3";
const TRAKT_API_KEY  = "d300e7cdf7313b498d7ced71ea867b5c817912984e5c64015ce90443762803f1";

// ============================================================
//  ESTADO GLOBAL
// ============================================================
const modal    = document.getElementById("modal");
const abrirBtn = document.getElementById("adicionarModal");
const fecharBtn= document.getElementById("fecharModal");
const buscador = document.getElementById("buscador");

let filmeSelecionado  = null;
let filmesSalvos      = JSON.parse(localStorage.getItem("filmes")) || [];
let filmesAtuais      = [];
let notaSelecionada   = 0;
const tipoAtivo       = "filme";

const temSugestaoPendente = (() => {
    try {
        const sugestao = JSON.parse(localStorage.getItem("sugestao_busca") || "null");
        return sugestao?.tipo === "filme";
    } catch { return false; }
})();

// Gêneros
let mapaGeneros      = {};
let filtroGeneroAtivo = null;

// Temporadas
let temporadasModal  = {};
let temporadaAtiva   = 1;
let totalTemporadas  = 0;

// ============================================================
//  GÊNEROS
// ============================================================
async function carregarGeneros() {
    try {
        const endpoint = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=pt-BR`;
        const res  = await fetch(endpoint);
        const data = await res.json();
        mapaGeneros = {};
        data.genres.forEach(g => { mapaGeneros[g.id] = g.name; });
        renderizarBotoesFiltro(data.genres);
    } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
    }
}

function renderizarBotoesFiltro(generosApi) {
    const container = document.querySelector(".filtros");
    if (!container) return;
    container.innerHTML = "";

    const todos = document.createElement("div");
    todos.classList.add("categoria");
    todos.innerHTML = `<a href="" class="filtro-ativo" data-id="">Todos</a>`;
    container.appendChild(todos);

    generosApi.forEach(g => {
        const div = document.createElement("div");
        div.classList.add("categoria");
        div.innerHTML = `<a href="" data-id="${g.id}">${g.name}</a>`;
        container.appendChild(div);
    });

    ativarFiltros();
}

function ativarFiltros() {
    document.querySelectorAll(".filtros .categoria a").forEach(botao => {
        botao.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".filtros .categoria a").forEach(b => b.classList.remove("filtro-ativo"));
            botao.classList.add("filtro-ativo");
            const idStr = botao.dataset.id;
            if (!idStr) {
                filtroGeneroAtivo = null;
                renderizarFilmes(filmesAtuais);
                return;
            }
            filtroGeneroAtivo = Number(idStr);
            aplicarFiltroGenero();
        });
    });
}

function aplicarFiltroGenero() {
    if (!filtroGeneroAtivo) { renderizarFilmes(filmesAtuais); return; }
    const filtrados = filmesAtuais.filter(f => Array.isArray(f.genre_ids) && f.genre_ids.includes(filtroGeneroAtivo));
    renderizarFilmes(filtrados);
    if (filtrados.length === 0) {
        mostrarToast(`Nenhum resultado para "${mapaGeneros[filtroGeneroAtivo] || "esse gênero"}".`);
    }
}

// ============================================================
//  MODAL ABRIR / FECHAR
// ============================================================
abrirBtn.addEventListener("click", () => {
    filmeSelecionado = null;
    limparModal();
    modal.classList.add("active");
});

fecharBtn.addEventListener("click", () => modal.classList.remove("active"));

modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
});

function limparModal() {
    document.getElementById("tituloFilme").innerText = "Adicionar filme";
    document.getElementById("posterDetalhe").src = "";
    document.getElementById("descricaoFilme").innerText = "";
    document.getElementById("notaGeral").innerText = "";
    document.getElementById("suaNota").innerText = "";
    document.getElementById("infoExtra").innerText = "";
    document.getElementById("categoriaFilme").value = "Favorito";
    document.getElementById("watchlist").checked = false;
    notaSelecionada = 0;
    document.querySelectorAll(".rating span").forEach(s => s.classList.remove("active"));
    const secaoSeries = document.getElementById("secao-series");
    if (secaoSeries) secaoSeries.style.display = "none";
    temporadasModal = {};
    temporadaAtiva  = 1;
    totalTemporadas = 0;
}

// ============================================================
//  BUSCA
// ============================================================
let timeout;

buscador.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => buscarItens(buscador.value.trim()), 400);
});

document.getElementById("buscar").addEventListener("click", () => {
    buscarItens(buscador.value.trim());
});

async function buscarItens(query) {
    if (query.length < 3) return;
    try {
        const endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;
        const res  = await fetch(endpoint);
        const data = await res.json();
        filmesAtuais = data.results || [];
        filtroGeneroAtivo ? aplicarFiltroGenero() : renderizarFilmes(filmesAtuais);
    } catch (err) {
        console.error("Erro ao buscar:", err);
        mostrarToast("Erro ao buscar. Verifique sua conexão.");
    }
}

async function processarSugestaoPendente() {
    const sugestaoRaw = localStorage.getItem("sugestao_busca");
    if (!sugestaoRaw) return;

    let sugestao;
    try { sugestao = JSON.parse(sugestaoRaw); }
    catch { localStorage.removeItem("sugestao_busca"); return; }

    if (sugestao.tipo !== "filme") return;

    try {
        let item = sugestao.item;
        if (!item || item.id !== sugestao.id) {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${sugestao.id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
            item = await res.json();
        }
        if (!item || item.success === false || !item.id) throw new Error("Filme não encontrado");

        filmesAtuais = [item];
        filtroGeneroAtivo = null;
        renderizarFilmes(filmesAtuais);
        abrirModalFilme(item);
    } catch (err) {
        console.error("Erro ao abrir sugestão:", err);
        mostrarToast("Não foi possível abrir essa sugestão.");
    } finally {
        localStorage.removeItem("sugestao_busca");
    }
}

// ============================================================
//  RENDER CARDS (busca / filtro)
// ============================================================
function renderizarFilmes(lista) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Nenhum resultado encontrado.</p>`;
        atualizarContador();
        return;
    }

    lista.forEach(item => {
        container.appendChild(criarCard(item, "filme"));
    });

    atualizarContador();
}

// ============================================================
//  MODAL FILME
// ============================================================
function abrirModalFilme(filme) {
    filmeSelecionado = { ...filme, tipo: "filme" };
    const secaoSeries = document.getElementById("secao-series");
    if (secaoSeries) secaoSeries.style.display = "none";

    const generosTexto = (filme.genre_ids || []).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ");
    document.getElementById("tituloFilme").innerText = filme.title;
    document.getElementById("posterDetalhe").src = filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    document.getElementById("descricaoFilme").innerText = filme.overview || "Sem descrição disponível";
    document.getElementById("notaGeral").innerText = "⭐ Nota geral: " + (filme.vote_average?.toFixed(1) || "0");
    document.getElementById("infoExtra").innerText  = generosTexto ? "🎬 " + generosTexto : "";

    const salvo = filmesSalvos.find(f => f.id === filme.id && f.tipo === "filme");
    document.getElementById("suaNota").innerText = salvo?.nota ? "⭐ Sua nota: " + salvo.nota : "Você ainda não avaliou";
    notaSelecionada = salvo?.nota || 0;
    document.querySelectorAll(".rating span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
    });
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";

    ativarEstrelas();
    modal.classList.add("active");
}

// ============================================================
//  MODAL SÉRIE
// ============================================================
async function abrirModalSerie(serie) {
    filmeSelecionado = { ...serie, tipo: "serie" };
    temporadasModal = {};
    temporadaAtiva  = 1;

    const generosTexto = (serie.genre_ids || []).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ");
    document.getElementById("tituloFilme").innerText = serie.name || serie.title;
    document.getElementById("posterDetalhe").src = serie.poster_path
        ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    document.getElementById("descricaoFilme").innerText = serie.overview || "Sem descrição disponível";
    document.getElementById("notaGeral").innerText = "⭐ Nota geral: " + (serie.vote_average?.toFixed(1) || "0");
    document.getElementById("infoExtra").innerText  = generosTexto ? "📺 " + generosTexto : "";

    const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
    document.getElementById("suaNota").innerText = salvo?.nota ? "⭐ Sua nota: " + salvo.nota : "Você ainda não avaliou";
    notaSelecionada = salvo?.nota || 0;
    document.querySelectorAll(".rating span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
    });
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";

    const secaoSeries = document.getElementById("secao-series");
    if (secaoSeries) secaoSeries.style.display = "block";

    mostrarToast("Carregando temporadas...");

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const detalhes = await res.json();
        totalTemporadas = detalhes.number_of_seasons || 1;

        if (salvo?.temporadas) {
            salvo.temporadas.forEach(t => { temporadasModal[t.numero] = t; });
        }

        renderizarAbasTemporadas(serie.id);
        await carregarTemporada(serie.id, 1);
    } catch (err) {
        console.error("Erro ao carregar série:", err);
        mostrarToast("Erro ao carregar temporadas.");
    }

    ativarEstrelas();
    modal.classList.add("active");
}

// ============================================================
//  TEMPORADAS
// ============================================================
function renderizarAbasTemporadas(serieId) {
    const tabs = document.getElementById("seasons-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    for (let i = 1; i <= totalTemporadas; i++) {
        const btn = document.createElement("button");
        btn.classList.add("s-tab");
        if (i === temporadaAtiva) btn.classList.add("active");
        btn.innerText = `T${i}`;
        btn.addEventListener("click", () => trocarTemporada(serieId, i));
        tabs.appendChild(btn);
    }
}

async function trocarTemporada(serieId, numero) {
    temporadaAtiva = numero;
    document.querySelectorAll(".s-tab").forEach((btn, idx) => {
        btn.classList.toggle("active", idx + 1 === numero);
    });
    await carregarTemporada(serieId, numero);
}

async function carregarTemporada(serieId, numero) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;
    lista.innerHTML = `<p style="font-size:13px; color:var(--muted);">Carregando episódios...</p>`;

    try {
        const res  = await fetch(`https://api.themoviedb.org/3/tv/${serieId}/season/${numero}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const data = await res.json();
        const episodios = data.episodes || [];

        if (!temporadasModal[numero]) {
            temporadasModal[numero] = {
                numero, nota: 0,
                episodios: episodios.map(ep => ({ numero: ep.episode_number, nome: ep.name, nota: 0 }))
            };
        } else {
            episodios.forEach(ep => {
                const existe = temporadasModal[numero].episodios.find(e => e.numero === ep.episode_number);
                if (!existe) temporadasModal[numero].episodios.push({ numero: ep.episode_number, nome: ep.name, nota: 0 });
            });
        }

        renderizarEpisodios(numero);
    } catch (err) {
        lista.innerHTML = `<p style="font-size:13px; color:var(--muted);">Erro ao carregar episódios.</p>`;
    }
}

function renderizarEpisodios(numTemporada) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;
    const t = temporadasModal[numTemporada];
    if (!t) return;

    lista.innerHTML = "";
    t.episodios.forEach(ep => {
        const row = document.createElement("div");
        row.classList.add("ep-row");
        row.innerHTML = `
            <div class="ep-info">
                <span class="ep-num">E${ep.numero}</span>
                <span class="ep-nome">${ep.nome || "Episódio " + ep.numero}</span>
            </div>
            <div class="ep-stars" data-temporada="${numTemporada}" data-ep="${ep.numero}">
                ${[1,2,3,4,5].map(i => `<span class="ep-star${i <= ep.nota ? ' active' : ''}" data-val="${i}">★</span>`).join("")}
            </div>
        `;
        lista.appendChild(row);
    });

    lista.querySelectorAll(".ep-stars").forEach(container => {
        const numT  = Number(container.dataset.temporada);
        const numEp = Number(container.dataset.ep);
        container.querySelectorAll(".ep-star").forEach(star => {
            star.addEventListener("click", () => {
                const val = Number(star.dataset.val);
                const ep  = temporadasModal[numT]?.episodios.find(e => e.numero === numEp);
                if (ep) ep.nota = val;
                container.querySelectorAll(".ep-star").forEach(s => {
                    s.classList.toggle("active", Number(s.dataset.val) <= val);
                });
                atualizarMediaTemporada(numT);
            });
        });
    });

    atualizarMediaTemporada(numTemporada);
}

function atualizarMediaTemporada(numTemporada) {
    const t = temporadasModal[numTemporada];
    if (!t) return;
    const notadas = t.episodios.filter(e => e.nota > 0);
    const media   = notadas.length ? (notadas.reduce((a, e) => a + e.nota, 0) / notadas.length).toFixed(1) : "—";
    const el = document.getElementById("media-temporada");
    if (el) el.innerText = `Média dos episódios da T${numTemporada}: ${media} ★`;
}

// ============================================================
//  ESTRELAS GERAL
// ============================================================
function ativarEstrelas() {
    document.querySelectorAll(".rating span").forEach(star => {
        star.onclick = () => {
            notaSelecionada = Number(star.dataset.value);
            document.querySelectorAll(".rating span").forEach(s => {
                s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
            });
            if (filmeSelecionado?.tipo === "serie" && temporadasModal[temporadaAtiva]) {
                temporadasModal[temporadaAtiva].nota = notaSelecionada;
            }
        };
    });
}

ativarEstrelas();

// ============================================================
//  SALVAR
// ============================================================
document.getElementById("salvar").addEventListener("click", () => {
    if (!filmeSelecionado) {
        mostrarToast("Pesquise e selecione um item antes de salvar.");
        return;
    }

    const categoria = document.getElementById("categoriaFilme").value;
    const watchlist = document.getElementById("watchlist").checked;
    const index     = filmesSalvos.findIndex(f => f.id === filmeSelecionado.id && f.tipo === filmeSelecionado.tipo);

    const obj = {
        id:       filmeSelecionado.id,
        tipo:     filmeSelecionado.tipo || "filme",
        titulo:   filmeSelecionado.title || filmeSelecionado.name,
        imagem:   filmeSelecionado.poster_path,
        descricao:filmeSelecionado.overview || "",
        generoIds:filmeSelecionado.genre_ids || [],
        nota:     notaSelecionada,
        categoria,
        watchlist,
    };

    if (filmeSelecionado.tipo === "serie") {
        obj.temporadas = Object.values(temporadasModal);
    }

    if (index >= 0) filmesSalvos[index] = obj;
    else filmesSalvos.push(obj);

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    atualizarCards();
    if (typeof atualizarNavCounts === "function") atualizarNavCounts();
    mostrarToast("Salvo com sucesso!");
    modal.classList.remove("active");

    if (filmesAtuais.length > 0) {
        renderizarFilmes(filtroGeneroAtivo
            ? filmesAtuais.filter(f => f.genre_ids?.includes(filtroGeneroAtivo))
            : filmesAtuais
        );
    } else {
        carregarHome();
    }
});

// ============================================================
//  CARDS STATS
// ============================================================
function atualizarCards() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const soFilmes  = filmesSalvos.filter(f => f.tipo !== "serie");
    const total     = soFilmes.length;
    const assistidos= soFilmes.filter(f => f.categoria === "Assistido").length;
    const media     = total > 0
        ? (soFilmes.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;
    const h2s = document.querySelectorAll(".card h2");
    if (h2s[0]) h2s[0].innerText = total;
    if (h2s[1]) h2s[1].innerText = assistidos;
    if (h2s[2]) h2s[2].innerText = media;
}

// ============================================================
//  CONTADOR
// ============================================================
function atualizarContador() {
    const el = document.getElementById("contador");
    if (el) el.innerText = document.querySelectorAll(".movie").length;
}

// ============================================================
//  TOAST
// ============================================================
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

// ============================================================
//  CRIAR CARD (reutilizável)
// ============================================================
function criarCard(item, tipo) {
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    const titulo = item.title || item.name || "Sem título";
    const ano    = (item.release_date || item.first_air_date || "").slice(0, 4) || "—";
    const nota   = item.vote_average?.toFixed(1) || "0";
    const salvo  = filmesSalvos.find(f => f.id === item.id && f.tipo === tipo);
    const badgeStatus = salvo ? `<span class="status">${salvo.categoria}</span>` : "";

    const div = document.createElement("div");
    div.classList.add("movie");
    div.innerHTML = `
        <img src="${poster}" alt="${titulo}">
        ${badgeStatus}
        <span class="badge-tipo ${tipo === 'filme' ? 'badge-filme' : 'badge-serie'}">${tipo === 'filme' ? 'Filme' : 'Série'}</span>
        <div class="info">
            <h3 class="nome">${titulo}</h3>
            <span class="diretor">${ano}</span>
            <span class="nota-tmdb">⭐ ${nota}</span>
        </div>
    `;
    div.addEventListener("click", () => tipo === "filme" ? abrirModalFilme(item) : abrirModalSerie(item));
    return div;
}

// ============================================================
//  HELPER: cria seção com título + grid de cards
// ============================================================
function criarSecao(titulo, emoji, items, tipo, container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "width:100%; margin-bottom:36px;";
    wrap.innerHTML = `
        <h3 style="font-family:'DM Serif Display',serif; font-size:18px; font-weight:400;
                   color:var(--muted); margin-bottom:12px;">${emoji} ${titulo}</h3>
    `;
    const row = document.createElement("div");
    row.style.cssText = "display:flex; flex-wrap:wrap; gap:20px; width:100%;";
    items.forEach(item => row.appendChild(criarCard(item, tipo)));
    wrap.appendChild(row);
    container.appendChild(wrap);
}

// ============================================================
//  TRAKT — buscar trending e enriquecer com dados do TMDB
// ============================================================
async function buscarTrendingTrakt(tipo = "movies") {
    const endpoint = tipo === "movies"
        ? "https://api.trakt.tv/movies/trending?limit=8"
        : "https://api.trakt.tv/shows/trending?limit=8";

    const res  = await fetch(endpoint, {
        headers: {
            "Content-Type":    "application/json",
            "trakt-api-version": "2",
            "trakt-api-key":   TRAKT_API_KEY
        }
    });

    if (!res.ok) throw new Error(`Trakt retornou ${res.status}`);
    const data = await res.json();

    // data = [{ watchers, movie: { title, ids: { tmdb } } }, ...]
    const tmdbTipo = tipo === "movies" ? "movie" : "tv";
    const chave    = tipo === "movies" ? "movie" : "show";

    const enriched = await Promise.all(
        data.map(async entry => {
            const tmdbId = entry[chave]?.ids?.tmdb;
            if (!tmdbId) return null;
            try {
                const r = await fetch(
                    `https://api.themoviedb.org/3/${tmdbTipo}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`
                );
                const item = await r.json();
                if (item?.success === false || !item?.id) return null;
                // Normalizar séries para ter campo title
                if (tmdbTipo === "tv") item.title = item.name;
                return item;
            } catch { return null; }
        })
    );

    return enriched.filter(Boolean);
}

// ============================================================
//  HOME — TMDB Populares + Trakt Trending
// ============================================================
async function carregarHome() {
    const container = document.querySelector(".filmes");
    if (!container) return;
    container.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Carregando...</p>`;

    // Buscar tudo em paralelo
    const [
        resFilmes,
        resSeries,
        trendingFilmes,
        trendingSeries
    ] = await Promise.allSettled([
        fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`).then(r => r.json()),
        fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`).then(r => r.json()),
        buscarTrendingTrakt("movies"),
        buscarTrendingTrakt("shows")
    ]);

    container.innerHTML = "";

    // ── TMDB Populares ──────────────────────────────────────
    if (resFilmes.status === "fulfilled") {
        const filmes = (resFilmes.value.results || []).slice(0, 6);
        if (filmes.length) criarSecao("Filmes populares", "🎬", filmes, "filme", container);
    }

    if (resSeries.status === "fulfilled") {
        const series = (resSeries.value.results || []).slice(0, 6);
        if (series.length) criarSecao("Séries populares", "📺", series, "serie", container);
    }

    // ── Trakt Trending ──────────────────────────────────────
    const divTraktTitulo = document.createElement("div");
    divTraktTitulo.style.cssText = "width:100%; margin:8px 0 4px;";
    divTraktTitulo.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <h2 style="font-family:'DM Serif Display',serif; font-size:22px; font-weight:400; margin:0;">
                🔥 Em alta agora
            </h2>
            <span style="font-size:11px; background:var(--gold); color:var(--ink);
                         padding:2px 8px; border-radius:999px; font-weight:600; letter-spacing:.5px;">
                via Trakt
            </span>
        </div>
        <p style="color:var(--muted); font-size:13px; margin:0 0 16px;">
            Os títulos mais assistidos no momento pela comunidade Trakt.
        </p>
    `;
    container.appendChild(divTraktTitulo);

    if (trendingFilmes.status === "fulfilled" && trendingFilmes.value.length) {
        criarSecao("Filmes em alta", "🎬", trendingFilmes.value, "filme", container);
    } else {
        const err = document.createElement("p");
        err.style.cssText = "color:var(--muted); font-size:13px; margin-bottom:16px;";
        err.innerText = "Não foi possível carregar filmes em alta do Trakt.";
        container.appendChild(err);
    }

    if (trendingSeries.status === "fulfilled" && trendingSeries.value.length) {
        criarSecao("Séries em alta", "📺", trendingSeries.value, "serie", container);
    } else {
        const err = document.createElement("p");
        err.style.cssText = "color:var(--muted); font-size:13px; margin-bottom:16px;";
        err.innerText = "Não foi possível carregar séries em alta do Trakt.";
        container.appendChild(err);
    }
}

// ============================================================
//  INICIALIZAR
// ============================================================
atualizarCards();
carregarGeneros().then(() => processarSugestaoPendente());

if (!temSugestaoPendente) {
    carregarHome();
}