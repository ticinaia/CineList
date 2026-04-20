// ============================================================
//  CHAVES DE API
// ============================================================
const TMDB_API_KEY  = "137645a15bec14eae77e0f109056e7e3";
const TRAKT_API_KEY = "d300e7cdf7313b498d7ced71ea867b5c817912984e5c64015ce90443762803f1";

// ============================================================
//  ESTADO GLOBAL
// ============================================================
let tipoSug    = "filme";
let mapaGeneros = {};

// ============================================================
//  TIPO TOGGLE
// ============================================================
function setTipoSug(tipo) {
    tipoSug = tipo;
    document.getElementById("btn-filmes-sug").classList.toggle("active", tipo === "filme");
    document.getElementById("btn-series-sug").classList.toggle("active", tipo === "serie");
    iniciar();
}

// ============================================================
//  GÊNEROS
// ============================================================
async function carregarMapaGeneros() {
    try {
        const [resFilme, resSerie] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=pt-BR`),
            fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}&language=pt-BR`)
        ]);
        const dataFilme = await resFilme.json();
        const dataSerie = await resSerie.json();
        [...dataFilme.genres, ...dataSerie.genres].forEach(g => { mapaGeneros[g.id] = g.name; });
    } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
    }
}

// ============================================================
//  ANÁLISE DO HISTÓRICO
// ============================================================
function analisarGenerosPreferidos(tipo) {
    const todos     = JSON.parse(localStorage.getItem("filmes")) || [];
    const filtrados = tipo === "filme"
        ? todos.filter(f => f.tipo !== "serie")
        : todos.filter(f => f.tipo === "serie");

    const contagem = {};
    filtrados.forEach(item => {
        (item.generoIds || []).forEach(id => {
            contagem[id] = (contagem[id] || 0) + 1;
        });
    });

    return Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ id: Number(id), nome: mapaGeneros[id] || "Desconhecido", count }));
}

// ============================================================
//  RENDER GÊNEROS FAVORITOS
// ============================================================
function renderizarGenerosFavoritos(generos) {
    const el = document.getElementById("generos-favoritos");
    if (!el) return;

    if (generos.length === 0) {
        el.innerHTML = `
            <div class="vazio">
                <p>Você ainda não tem itens salvos suficientes para gerar sugestões.</p>
                <a href="index.html">Adicionar filmes</a> ou <a href="series.html">Adicionar séries</a>
            </div>`;
        return;
    }

    el.innerHTML = `
        <p style="font-size:13px; color:var(--muted); margin-bottom:10px;">
            Baseado nos seus gêneros favoritos:
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${generos.map(g => `
                <span style="
                    background:var(--gold); color:var(--ink);
                    padding:4px 14px; border-radius:999px;
                    font-size:13px; font-weight:500;
                ">${g.nome} <span style="opacity:0.6; font-size:11px;">${g.count}x</span></span>
            `).join("")}
        </div>
    `;
}

// ============================================================
//  HELPER: navegação ao clicar num card de sugestão
// ============================================================
function aoClicarSugestao(item, tipo) {
    return async () => {
        const pagina  = tipo === "filme" ? "index.html" : "series.html";
        const payload = { id: item.id, titulo: item.title || item.name, tipo, item };

        if (tipo === "serie") {
            try {
                const [resDetalhes, resTemporada1] = await Promise.all([
                    fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&language=pt-BR`),
                    fetch(`https://api.themoviedb.org/3/tv/${item.id}/season/1?api_key=${TMDB_API_KEY}&language=pt-BR`)
                ]);
                if (resDetalhes.ok) {
                    const d = await resDetalhes.json();
                    if (d?.success !== false) payload.detalhes = d;
                }
                if (resTemporada1.ok) {
                    const t = await resTemporada1.json();
                    if (t?.success !== false) payload.temporada1 = t;
                }
            } catch (err) {
                console.error("Erro ao pré-carregar série:", err);
            }
        }

        localStorage.setItem("sugestao_busca", JSON.stringify(payload));
        window.location.href = pagina;
    };
}

// ============================================================
//  HELPER: criar card visual
// ============================================================
function criarCardSugestao(item, tipo) {
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    const titulo = item.title || item.name || "Sem título";
    const ano    = (item.release_date || item.first_air_date || "").slice(0, 4) || "—";
    const nota   = item.vote_average?.toFixed(1) || "0";

    const div = document.createElement("div");
    div.classList.add("movie");
    div.innerHTML = `
        <img src="${poster}" alt="${titulo}">
        <span class="badge-tipo ${tipo === 'filme' ? 'badge-filme' : 'badge-serie'}">${tipo === 'filme' ? 'Filme' : 'Série'}</span>
        <div class="info">
            <h3 class="nome">${titulo}</h3>
            <span class="diretor">${ano}</span>
            <span class="nota-tmdb">⭐ ${nota}</span>
        </div>
    `;
    div.addEventListener("click", aoClicarSugestao(item, tipo));
    return div;
}

// ============================================================
//  SEÇÃO 1 — SUGESTÕES TMDB (por gênero favorito)
// ============================================================
async function buscarSugestoesTMDB(generos, tipo) {
    const secao = document.getElementById("secao-sugestoes");
    if (!secao) return;

    if (generos.length === 0) { secao.innerHTML = ""; return; }

    secao.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Buscando sugestões personalizadas...</p>`;

    const todosSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const idsSalvos   = new Set(todosSalvos.map(f => f.id));
    const endpoint    = tipo === "filme" ? "discover/movie" : "discover/tv";

    try {
        const promises = generos.map(g =>
            fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${g.id}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=100&page=1`)
                .then(r => r.json())
                .then(data => ({ genero: g, resultados: data.results || [] }))
        );

        const resultados = await Promise.all(promises);
        secao.innerHTML  = "";

        // Título da seção TMDB
        const tituloTmdb = document.createElement("div");
        tituloTmdb.style.cssText = "width:100%; margin-bottom:20px;";
        tituloTmdb.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                <h2 style="font-family:'DM Serif Display',serif; font-size:22px; font-weight:400; margin:0;">
                    🎯 Sugestões para você
                </h2>
                <span style="font-size:11px; background:#01b4e4; color:#fff;
                             padding:2px 8px; border-radius:999px; font-weight:600; letter-spacing:.5px;">
                    via TMDB
                </span>
            </div>
            <p style="color:var(--muted); font-size:13px; margin:0;">
                Baseado nos seus gêneros favoritos.
            </p>
        `;
        secao.appendChild(tituloTmdb);

        resultados.forEach(({ genero, resultados: lista }) => {
            const novos = lista.filter(item => !idsSalvos.has(item.id)).slice(0, 6);
            if (novos.length === 0) return;

            const bloco = document.createElement("div");
            bloco.style.marginBottom = "32px";
            bloco.innerHTML = `
                <h3 style="font-family:'DM Serif Display',serif; font-size:18px; font-weight:400;
                           color:var(--muted); margin-bottom:14px;">
                    Porque você curte <span style="color:var(--gold)">${genero.nome}</span>
                </h3>
                <div class="filmes" id="sug-tmdb-${genero.id}"></div>
            `;
            secao.appendChild(bloco);

            const container = document.getElementById(`sug-tmdb-${genero.id}`);
            novos.forEach(item => container.appendChild(criarCardSugestao(item, tipo)));
        });

    } catch (err) {
        console.error("Erro ao buscar sugestões TMDB:", err);
        secao.innerHTML = `<p style="color:var(--muted); font-size:14px;">Erro ao carregar sugestões.</p>`;
    }
}

// ============================================================
//  SEÇÃO 2 — TRENDING TRAKT (recomendações da comunidade)
// ============================================================
async function buscarTrendingTrakt(tipo) {
    const traktTipo = tipo === "filme" ? "movies" : "shows";
    const chave     = tipo === "filme" ? "movie" : "show";
    const tmdbTipo  = tipo === "filme" ? "movie" : "tv";

    const res = await fetch(`https://api.trakt.tv/${traktTipo}/trending?limit=12`, {
        headers: {
            "Content-Type":      "application/json",
            "trakt-api-version": "2",
            "trakt-api-key":     TRAKT_API_KEY
        }
    });

    if (!res.ok) throw new Error(`Trakt ${res.status}`);
    const data = await res.json();

    const todosSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const idsSalvos   = new Set(todosSalvos.map(f => f.id));

    const enriched = await Promise.all(
        data.map(async entry => {
            const tmdbId = entry[chave]?.ids?.tmdb;
            if (!tmdbId) return null;
            try {
                const r    = await fetch(`https://api.themoviedb.org/3/${tmdbTipo}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
                const item = await r.json();
                if (!item?.id || item?.success === false) return null;
                if (tmdbTipo === "tv") item.title = item.name;
                return { item, watchers: entry.watchers };
            } catch { return null; }
        })
    );

    return enriched
        .filter(Boolean)
        .filter(e => !idsSalvos.has(e.item.id)) // excluir já salvos
        .map(e => e.item);
}

async function renderizarSecaoTrakt(tipo) {
    const secaoTrakt = document.getElementById("secao-trakt");
    if (!secaoTrakt) return;

    secaoTrakt.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <h2 style="font-family:'DM Serif Display',serif; font-size:22px; font-weight:400; margin:0;">
                🔥 Em alta na comunidade
            </h2>
            <span style="font-size:11px; background:var(--gold); color:var(--ink);
                         padding:2px 8px; border-radius:999px; font-weight:600; letter-spacing:.5px;">
                via Trakt
            </span>
        </div>
        <p style="color:var(--muted); font-size:13px; margin:0 0 20px;">
            Os ${tipo === "filme" ? "filmes" : "séries"} mais assistidos agora pela comunidade Trakt — que você ainda não tem na lista.
        </p>
        <div id="trakt-loading" style="color:var(--muted); font-size:14px; padding:10px 0;">
            Carregando trending...
        </div>
    `;

    try {
        const items = await buscarTrendingTrakt(tipo);

        const loading = document.getElementById("trakt-loading");
        if (loading) loading.remove();

        if (items.length === 0) {
            secaoTrakt.innerHTML += `<p style="color:var(--muted); font-size:14px;">
                Nenhum título novo para mostrar no momento.
            </p>`;
            return;
        }

        const row = document.createElement("div");
        row.classList.add("filmes");
        items.slice(0, 8).forEach(item => row.appendChild(criarCardSugestao(item, tipo)));
        secaoTrakt.appendChild(row);

    } catch (err) {
        console.error("Erro Trakt:", err);
        secaoTrakt.innerHTML += `<p style="color:var(--muted); font-size:14px;">
            Não foi possível carregar o trending do Trakt agora.
        </p>`;
    }
}

// ============================================================
//  INICIAR (chamado ao trocar tipo ou na carga inicial)
// ============================================================
async function iniciar() {
    await carregarMapaGeneros();

    // Seção TMDB roda em paralelo com Trakt
    const generos = analisarGenerosPreferidos(tipoSug);
    renderizarGenerosFavoritos(generos);

    await Promise.allSettled([
        buscarSugestoesTMDB(generos, tipoSug),
        renderizarSecaoTrakt(tipoSug)
    ]);
}

iniciar();