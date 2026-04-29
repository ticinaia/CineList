const API_KEY = "137645a15bec14eae77e0f109056e7e3";

const modal = document.getElementById("modal");
const abrirBtn = document.getElementById("adicionarModal");
const fecharBtn = document.getElementById("fecharModal");
const buscador = document.getElementById("buscador");

function veioDeSugestoes() {
    return sessionStorage.getItem("origem_modal_sugestao") === "sugestoes";
}

function limparOrigemSugestoes() {
    sessionStorage.removeItem("origem_modal_sugestao");
}

function voltarParaSugestoesSePreciso() {
    if (!veioDeSugestoes()) return false;
    limparOrigemSugestoes();
    window.location.href = "sugestoes.html";
    return true;
}

let serieSelecionada = null;
let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let seriesAtuais = [];
let notaGeral = 0;
const temSugestaoPendente = (() => {
    try {
        const sugestao = JSON.parse(localStorage.getItem("sugestao_busca") || "null");
        return sugestao?.tipo === "serie";
    } catch (err) {
        return false;
    }
})();

let mapaGeneros = {};
let filtroGeneroAtivo = null;
let resumoCardAtivo = null;

let temporadasModal = {};
let temporadaAtiva = 1;
let totalTemporadas = 0;
const cacheDuracoesSeries = JSON.parse(localStorage.getItem("cache_duracoes_series") || "{}");
const DURACAO_PADRAO_EPISODIO = 45;

function limparCacheDuracoesSeriesInvalidas() {
    let alterado = false;
    Object.keys(cacheDuracoesSeries).forEach((id) => {
        if ((cacheDuracoesSeries[id] || 0) <= 0) {
            delete cacheDuracoesSeries[id];
            alterado = true;
        }
    });

    if (alterado) {
        localStorage.setItem("cache_duracoes_series", JSON.stringify(cacheDuracoesSeries));
    }
}

limparCacheDuracoesSeriesInvalidas();

function recarregarFilmesSalvos() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
}

function normalizarSerie(serie) {
    return {
        ...serie,
        id: serie.id,
        name: serie.name || serie.title || serie.titulo || "Sem titulo",
        title: serie.title || serie.name || serie.titulo || "Sem titulo",
        poster_path: serie.poster_path || serie.imagem || "",
        overview: serie.overview || serie.descricao || "",
        genre_ids: serie.genre_ids || serie.generoIds || [],
        first_air_date: serie.first_air_date || "",
        vote_average: typeof serie.vote_average === "number" ? serie.vote_average : 0,
    };
}

function carregarSeriesSalvas() {
    recarregarFilmesSalvos();
    seriesAtuais = filmesSalvos
        .filter(f => f.tipo === "serie")
        .map(normalizarSerie);

    filtroGeneroAtivo = null;
    const filtroTodos = document.querySelector('.filtros .categoria a[data-id=""]');
    if (filtroTodos) {
        document.querySelectorAll(".filtros .categoria a").forEach(b => b.classList.remove("filtro-ativo"));
        filtroTodos.classList.add("filtro-ativo");
    }

    renderizarSeries(seriesAtuais);
}

function obterTemporadasSalvasOrdenadas() {
    return Object.values(temporadasModal).sort((a, b) => a.numero - b.numero);
}

function mostrarMensagemEpisodios(mensagem, tipo = "info") {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;

    const cor = tipo === "erro" ? "var(--gold)" : "var(--muted)";
    lista.innerHTML = `<p style="font-size:13px; color:${cor}; padding:8px 0;">${mensagem}</p>`;
}

function mostrarErroEpisodios(numero, mensagem) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;

    lista.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; padding:10px 0;">
            <p style="font-size:13px; color:var(--gold); margin:0;">${mensagem}</p>
            <button type="button" id="tentar-novamente-episodios" style="align-self:flex-start; background:transparent; border:1px solid var(--gold); color:var(--gold); border-radius:999px; padding:6px 12px; cursor:pointer;">
                Tentar novamente
            </button>
        </div>
    `;

    const botao = document.getElementById("tentar-novamente-episodios");
    if (botao) {
        botao.addEventListener("click", () => carregarTemporada(serieSelecionada?.id, numero));
    }
}

function atualizarResumoProgressoSerie() {
    const el = document.getElementById("progressoSerie");
    if (!el || !window.CineListState?.computeSeriesProgress) return;

    const progress = window.CineListState.computeSeriesProgress({
        temporadas: obterTemporadasSalvasOrdenadas(),
        totalTemporadas,
        totalEpisodios: obterTemporadasSalvasOrdenadas().reduce((acc, temporada) => {
            return acc + (Array.isArray(temporada.episodios) ? temporada.episodios.length : 0);
        }, 0)
    });

    if (!progress.totalEpisodes && !progress.totalSeasons) {
        el.innerText = "Marque episódios como vistos para acompanhar o progresso real.";
        return;
    }

    el.innerText = `Progresso da série: ${progress.percent}% • ${progress.watchedEpisodes}/${progress.totalEpisodes || progress.watchedEpisodes} episódios vistos`;
}

function renderizarTemporadasSalvasNoModal(serieId) {
    const temporadasSalvas = obterTemporadasSalvasOrdenadas();
    if (temporadasSalvas.length === 0) return false;

    totalTemporadas = temporadasSalvas.length;
    temporadaAtiva = temporadasSalvas[0].numero || 1;
    renderizarAbasTemporadas(serieId);
    atualizarEstrelasTemporada(temporadasModal[temporadaAtiva]?.nota || 0);

    const label = document.getElementById("label-nota-temporada");
    if (label) label.innerText = `Nota da temporada ${temporadaAtiva}`;

    renderizarEpisodios(temporadaAtiva);
    atualizarResumoProgressoSerie();
    return true;
}

function hidratarTemporadaPrefetch(temporadaData) {
    if (!temporadaData || !Array.isArray(temporadaData.episodes) || temporadaData.episodes.length === 0) {
        return false;
    }

    temporadasModal[1] = {
        numero: 1,
        nota: temporadasModal[1]?.nota || 0,
        episodios: temporadaData.episodes.map(ep => {
            const salvo = temporadasModal[1]?.episodios?.find(e => e.numero === ep.episode_number);
            return {
                numero: ep.episode_number,
                nome: ep.name,
                nota: salvo?.nota || 0
            };
        })
    };

    return true;
}


async function carregarGeneros() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=pt-BR`);
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
            if (!idStr) { filtroGeneroAtivo = null; renderizarSeries(seriesAtuais); return; }
            filtroGeneroAtivo = Number(idStr);
            aplicarFiltroGenero();
        });
    });
}

function aplicarFiltroGenero() {
    if (!filtroGeneroAtivo) { renderizarSeries(seriesAtuais); return; }
    const filtradas = seriesAtuais.filter(s => Array.isArray(normalizarSerie(s).genre_ids) && normalizarSerie(s).genre_ids.includes(filtroGeneroAtivo));
    renderizarSeries(filtradas);
    if (filtradas.length === 0) mostrarToast(`Nenhum resultado para "${mapaGeneros[filtroGeneroAtivo] || "esse gênero"}".`);
}

function atualizarCardsResumoAtivos() {
    document.querySelectorAll(".summary-card").forEach(card => {
        const ativo = card.dataset.summaryFilter === resumoCardAtivo;
        card.classList.toggle("is-active", ativo);
        card.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
}

function mostrarFeedbackCards(mensagem) {
    const feedback = document.getElementById("cards-feedback");
    if (!feedback) return;

    if (!mensagem) {
        feedback.classList.add("hidden");
        feedback.innerHTML = "";
        return;
    }

    feedback.innerHTML = `
        <p>${mensagem}</p>
        <button type="button" id="limpar-cards-feedback">Mostrar minhas séries</button>
    `;
    feedback.classList.remove("hidden");
    document.getElementById("limpar-cards-feedback")?.addEventListener("click", limparResumoCards);
}

function limparResumoCards() {
    resumoCardAtivo = null;
    atualizarCardsResumoAtivos();
    mostrarFeedbackCards("");
    const termo = buscador.value.trim();
    if (termo.length >= 3) {
        buscarSeries(termo);
        return;
    }
    carregarSeriesSalvas();
}

function limparFiltroGeneroVisual() {
    filtroGeneroAtivo = null;
    const filtroTodos = document.querySelector('.filtros .categoria a[data-id=""]');
    if (filtroTodos) {
        document.querySelectorAll(".filtros .categoria a").forEach(b => b.classList.remove("filtro-ativo"));
        filtroTodos.classList.add("filtro-ativo");
    }
}

function obterSeriesDoResumo(filtro) {
    const soSeries = filmesSalvos.filter(f => f.tipo === "serie");
    switch (filtro) {
        case "favoritas":
            return soSeries.filter(f => f.categoria === "Favorito");
        case "assistidas":
        case "horas":
            return soSeries.filter(f => f.categoria === "Assistido");
        case "avaliadas":
            return soSeries.filter(f => (f.nota || 0) > 0);
        case "total":
        default:
            return soSeries;
    }
}

function aplicarResumoCards(filtro) {
    recarregarFilmesSalvos();
    resumoCardAtivo = filtro;
    atualizarCardsResumoAtivos();
    limparFiltroGeneroVisual();
    buscador.value = "";

    const itens = obterSeriesDoResumo(filtro).map(normalizarSerie);
    const descricoes = {
        total: "Mostrando todas as séries salvas na sua biblioteca.",
        favoritas: "Mostrando as séries marcadas como favoritas.",
        assistidas: "Mostrando as séries que entram na contagem de assistidas.",
        avaliadas: "Mostrando as séries que entram no cálculo da média.",
        horas: "Mostrando as séries usadas no cálculo de horas assistidas."
    };

    seriesAtuais = itens;
    renderizarSeries(itens);
    mostrarFeedbackCards(descricoes[filtro] || "");
}

function configurarCardsResumo() {
    document.querySelectorAll(".summary-card").forEach(card => {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-pressed", "false");

        const ativar = () => aplicarResumoCards(card.dataset.summaryFilter);
        card.addEventListener("click", ativar);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                ativar();
            }
        });
    });
}


abrirBtn.addEventListener("click", () => {
    serieSelecionada = null;
    limparModal();
    abrirModalAcessivel("modal", abrirBtn);
});

fecharBtn.addEventListener("click", () => {
    fecharModalAcessivel("modal");
    if (!voltarParaSugestoesSePreciso()) {
        limparOrigemSugestoes();
    }
});
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        fecharModalAcessivel("modal");
        if (!voltarParaSugestoesSePreciso()) {
            limparOrigemSugestoes();
        }
    }
});

function limparModal() {
    document.getElementById("tituloFilme").innerText = "Adicionar série";
    document.getElementById("posterDetalhe").src = "";
    document.getElementById("descricaoFilme").innerText = "";
    document.getElementById("notaGeral").innerText = "";
    document.getElementById("suaNota").innerText = "";
    document.getElementById("infoExtra").innerText = "";
    document.getElementById("categoriaFilme").value = "Favorito";
    atualizarVisualCategoriaSelect();
    document.getElementById("watchlist").checked = false;
    notaGeral = 0;
    atualizarEstrelasGeral(0);
    atualizarEstrelasTemporada(0);
    document.getElementById("seasons-tabs").innerHTML = "";
    document.getElementById("episodios-lista").innerHTML = "";
    document.getElementById("media-temporada").innerText = "";
    const label = document.getElementById("label-nota-temporada");
    if (label) label.innerText = "Nota da temporada 1";
    temporadasModal = {};
    temporadaAtiva = 1;
    totalTemporadas = 0;
}


let timeout;
buscador.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => buscarSeries(buscador.value.trim()), 400);
});
document.getElementById("buscar").addEventListener("click", () => buscarSeries(buscador.value.trim()));

async function buscarSeries(query) {
    resumoCardAtivo = null;
    atualizarCardsResumoAtivos();
    mostrarFeedbackCards("");

    if (query.length === 0) {
        carregarSeriesSalvas();
        return;
    }
    if (query.length < 3) return;
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`);
        const data = await res.json();
        seriesAtuais = (data.results || []).map(normalizarSerie);
        filtroGeneroAtivo ? aplicarFiltroGenero() : renderizarSeries(seriesAtuais);
    } catch (err) {
        mostrarToast("Erro ao buscar. Verifique sua conexão.");
    }
}

async function processarSugestaoPendente() {
    const sugestaoRaw = localStorage.getItem("sugestao_busca");
    if (!sugestaoRaw) return;

    let sugestao;
    try {
        sugestao = JSON.parse(sugestaoRaw);
    } catch (err) {
        localStorage.removeItem("sugestao_busca");
        return;
    }

    if (sugestao.tipo !== "serie") return;

    try {
        let serie = sugestao.detalhes || sugestao.item;

        if (!serie || serie.id !== sugestao.id) {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${sugestao.id}?api_key=${API_KEY}&language=pt-BR`);
            serie = await res.json();
        }

        if (!serie || serie.success === false || !serie.id) {
            throw new Error("Série não encontrada");
        }

        if (sugestao.temporada1) {
            hidratarTemporadaPrefetch(sugestao.temporada1);
        }
        await abrirModalSerie(serie);
    } catch (err) {
        console.error("Erro ao abrir sugestão:", err);
        mostrarToast("Não foi possível abrir essa sugestão.");
    } finally {
        localStorage.removeItem("sugestao_busca");
    }
}


function renderizarSeries(lista) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Nenhuma série encontrada.</p>`;
        atualizarContador();
        return;
    }
    lista.forEach(item => {
        const serie = normalizarSerie(item);
        const generosTexto = (serie.genre_ids || []).slice(0, 2).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ") || "—";
        const ano = (serie.first_air_date || "").slice(0, 4) || "—";
        const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
        const card = criarCardMidia({
            item: serie,
            tipo: "serie",
            salvo,
            ano,
            generosTexto,
            notaTexto: `⭐ ${serie.vote_average?.toFixed(1) || "0"}`,
            onActivate: () => abrirModalSerie(serie)
        });
        container.appendChild(card);
    });
    atualizarContador();
}


async function abrirModalSerie(serie) {
    serie = normalizarSerie(serie);
    serieSelecionada = serie;
    const temporadasPrefetch = { ...temporadasModal };
    temporadasModal = {};
    temporadaAtiva = 1;
    notaGeral = 0;

    const generosTexto = (serie.genre_ids || []).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ");
    document.getElementById("tituloFilme").innerText = serie.name || serie.title;
    document.getElementById("posterDetalhe").src = serie.poster_path
        ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    document.getElementById("descricaoFilme").innerText = serie.overview || "Sem descrição disponível";
    document.getElementById("notaGeral").innerText = "⭐ Nota geral TMDB: " + (serie.vote_average?.toFixed(1) || "0");
    document.getElementById("infoExtra").innerText = generosTexto ? "📺 " + generosTexto : "";

    recarregarFilmesSalvos();
    const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
    notaGeral = salvo?.nota || 0;
    document.getElementById("suaNota").innerText = notaGeral ? "⭐ Sua nota geral: " + notaGeral : "Você ainda não avaliou";
    atualizarEstrelasGeral(notaGeral);
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";
    atualizarVisualCategoriaSelect();
    atualizarDisponibilidadeReviewRapido();

    if (salvo?.temporadas) {
        salvo.temporadas.forEach(t => { temporadasModal[t.numero] = t; });
    }
    Object.values(temporadasPrefetch).forEach(t => {
        if (!temporadasModal[t.numero]) {
            temporadasModal[t.numero] = t;
        }
    });

    abrirModalAcessivel("modal", document.activeElement);
    const temFallbackLocal = renderizarTemporadasSalvasNoModal(serie.id);

    if (!temFallbackLocal) {
        mostrarMensagemEpisodios("Carregando episodios...");
    }

    mostrarToast("Carregando temporadas...");
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${API_KEY}&language=pt-BR`);
        const detalhes = await res.json();
        totalTemporadas = detalhes.number_of_seasons || obterTemporadasSalvasOrdenadas().length || 1;
        renderizarAbasTemporadas(serie.id);
        const primeiraTemporada = temFallbackLocal ? temporadaAtiva : 1;
        await carregarTemporada(serie.id, primeiraTemporada);
        atualizarResumoProgressoSerie();
    } catch (err) {
        const temporadasSalvas = obterTemporadasSalvasOrdenadas();
        totalTemporadas = temporadasSalvas.length || serie.number_of_seasons || 1;
        renderizarAbasTemporadas(serie.id);

        if (temporadasSalvas.length > 0) {
            mostrarToast("Usando dados salvos da série.");
            temporadaAtiva = temporadasSalvas[0].numero || 1;
            atualizarEstrelasTemporada(temporadasModal[temporadaAtiva]?.nota || 0);
            renderizarEpisodios(temporadaAtiva);
            atualizarResumoProgressoSerie();
        } else {
            mostrarMensagemEpisodios("Nao foi possivel carregar as temporadas agora. Tente novamente em alguns instantes.", "erro");
            mostrarToast("Erro ao carregar temporadas.");
        }
    }
}


function atualizarEstrelasGeral(nota) {
    window.atualizarEstrelas(document.getElementById("rating-geral"), nota);
}

window.ativarEstrelas(document.getElementById("rating-geral"), (nota) => {
    notaGeral = nota;
    atualizarEstrelasGeral(notaGeral);
    document.getElementById("suaNota").innerText = "⭐ Sua nota geral: " + notaGeral;
});


function atualizarEstrelasTemporada(nota) {
    window.atualizarEstrelas(document.getElementById("rating-temporada"), nota);
}

window.ativarEstrelas(document.getElementById("rating-temporada"), (val) => {
    if (!temporadasModal[temporadaAtiva]) return;
    temporadasModal[temporadaAtiva].nota = val;
    atualizarEstrelasTemporada(val);
});


function renderizarAbasTemporadas(serieId) {
    const tabs = document.getElementById("seasons-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    for (let i = 1; i <= totalTemporadas; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("s-tab");
        if (i === temporadaAtiva) btn.classList.add("active");
        btn.setAttribute("aria-pressed", i === temporadaAtiva ? "true" : "false");
        btn.innerText = `T${i}`;
        btn.addEventListener("click", () => trocarTemporada(serieId, i));
        tabs.appendChild(btn);
    }
}

async function trocarTemporada(serieId, numero) {
    temporadaAtiva = numero;
    document.querySelectorAll(".s-tab").forEach((btn, idx) => {
        btn.classList.toggle("active", idx + 1 === numero);
        btn.setAttribute("aria-pressed", idx + 1 === numero ? "true" : "false");
    });
    const label = document.getElementById("label-nota-temporada");
    if (label) label.innerText = `Nota da temporada ${numero}`;
    await carregarTemporada(serieId, numero);
}

async function carregarTemporada(serieId, numero) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;
    mostrarMensagemEpisodios("Carregando episodios...");

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serieId}/season/${numero}?api_key=${API_KEY}&language=pt-BR`);
        if (!res.ok) {
            throw new Error(`Falha HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data?.success === false) {
            throw new Error(data.status_message || "Falha ao carregar temporada");
        }
        const episodios = data.episodes || [];
        const temporadaSalva = temporadasModal[numero];

        if (episodios.length === 0) {
            if (temporadaSalva?.episodios?.length) {
                atualizarEstrelasTemporada(temporadaSalva.nota || 0);
                renderizarEpisodios(numero);
                atualizarResumoProgressoSerie();
                mostrarToast(`Temporada ${numero} aberta com dados salvos.`);
                return;
            }

            mostrarMensagemEpisodios(`Nenhum episodio foi encontrado para a temporada ${numero}.`, "erro");
            return;
        }

        if (!temporadasModal[numero]) {
            temporadasModal[numero] = {
                numero,
                nota: 0,
                episodios: episodios.map(ep => ({ numero: ep.episode_number, nome: ep.name, nota: 0 }))
            };
        } else {
            temporadasModal[numero].episodios = temporadasModal[numero].episodios || [];
            episodios.forEach(ep => {
                const existe = temporadasModal[numero].episodios.find(e => e.numero === ep.episode_number);
                if (!existe) {
                    temporadasModal[numero].episodios.push({ numero: ep.episode_number, nome: ep.name, nota: 0 });
                    return;
                }
                existe.nome = ep.name || existe.nome;
            });
            temporadasModal[numero].episodios.sort((a, b) => a.numero - b.numero);
        }

        atualizarEstrelasTemporada(temporadasModal[numero].nota || 0);
        const label = document.getElementById("label-nota-temporada");
        if (label) label.innerText = `Nota da temporada ${numero}`;

        renderizarEpisodios(numero);
        atualizarResumoProgressoSerie();
    } catch (err) {
        const temporadaSalva = temporadasModal[numero];

        if (temporadaSalva?.episodios?.length) {
            atualizarEstrelasTemporada(temporadaSalva.nota || 0);
            renderizarEpisodios(numero);
            atualizarResumoProgressoSerie();
            mostrarToast(`Temporada ${numero} aberta com dados salvos.`);
            return;
        }

        console.error("Erro ao carregar episodios:", err);
        mostrarErroEpisodios(numero, `Nao foi possivel carregar os episodios da temporada ${numero}.`);
    }
}


function renderizarEpisodios(numTemporada) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;
    const t = temporadasModal[numTemporada];
    if (!t) return;

    if (!Array.isArray(t.episodios) || t.episodios.length === 0) {
        mostrarMensagemEpisodios(`Nenhum episodio salvo para a temporada ${numTemporada}.`, "erro");
        return;
    }

    lista.innerHTML = "";
    t.episodios.forEach(ep => {
        const row = document.createElement("div");
        row.classList.add("ep-row");
        row.classList.toggle("is-watched", Boolean(ep.visto || (ep.nota || 0) > 0));
        row.innerHTML = `
            <div class="ep-info">
                <span class="ep-num">E${ep.numero}</span>
                <span class="ep-nome">${ep.nome || "Episódio " + ep.numero}</span>
            </div>
            <label class="ep-watch">
                <input type="checkbox" data-watch-toggle="${ep.numero}" ${ep.visto || (ep.nota || 0) > 0 ? "checked" : ""}>
                Visto
            </label>
            <div class="ep-stars" data-temporada="${numTemporada}" data-ep="${ep.numero}">
                ${[1,2,3,4,5].map(i => `<span class="ep-star${i <= ep.nota ? ' active' : ''}" data-val="${i}">★</span>`).join("")}
            </div>
        `;
        lista.appendChild(row);
    });

    lista.querySelectorAll(".ep-stars").forEach(container => {
        const numT = Number(container.dataset.temporada);
        const numEp = Number(container.dataset.ep);
        container.querySelectorAll(".ep-star").forEach(star => {
            star.setAttribute("role", "button");
            star.setAttribute("tabindex", "0");
            star.setAttribute("aria-label", `Dar nota ${star.dataset.val} para o episódio ${numEp}`);

            const aplicarNota = () => {
                const val = Number(star.dataset.val);
                const ep = temporadasModal[numT]?.episodios.find(e => e.numero === numEp);
                if (ep) {
                    ep.nota = val;
                    ep.visto = true;
                }
                container.querySelectorAll(".ep-star").forEach(s => {
                    s.classList.toggle("active", Number(s.dataset.val) <= val);
                    s.setAttribute("aria-pressed", Number(s.dataset.val) <= val ? "true" : "false");
                });
                const row = container.closest(".ep-row");
                row?.classList.add("is-watched");
                const watchInput = row?.querySelector(`[data-watch-toggle="${numEp}"]`);
                if (watchInput) watchInput.checked = true;
                atualizarMediaTemporada(numT);
                atualizarResumoProgressoSerie();
            };

            star.addEventListener("click", () => {
                aplicarNota();
            });

            star.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    aplicarNota();
                }
            });
        });
    });

    lista.querySelectorAll("[data-watch-toggle]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const epNumero = Number(checkbox.dataset.watchToggle);
            const ep = temporadasModal[numTemporada]?.episodios?.find((item) => item.numero === epNumero);
            if (!ep) return;
            ep.visto = checkbox.checked;
            checkbox.closest(".ep-row")?.classList.toggle("is-watched", checkbox.checked || (ep.nota || 0) > 0);
            atualizarResumoProgressoSerie();
        });
    });

    atualizarMediaTemporada(numTemporada);
    atualizarResumoProgressoSerie();
}

function atualizarMediaTemporada(numTemporada) {
    const t = temporadasModal[numTemporada];
    if (!t) return;
    const notadas = t.episodios.filter(e => e.nota > 0);
    const media = notadas.length ? (notadas.reduce((a, e) => a + e.nota, 0) / notadas.length).toFixed(1) : "—";
    const el = document.getElementById("media-temporada");
    if (el) el.innerText = `Média dos episódios da T${numTemporada}: ${media} ★`;
}


document.getElementById("salvar").addEventListener("click", () => {
    if (!serieSelecionada) {
        mostrarToast("Pesquise e selecione uma série antes de salvar.");
        return;
    }

    const categoria = document.getElementById("categoriaFilme").value;
    const watchlist = document.getElementById("watchlist").checked;
    const index = filmesSalvos.findIndex(f => f.id === serieSelecionada.id && f.tipo === "serie");

    const obj = {
        id: serieSelecionada.id,
        tipo: "serie",
        titulo: serieSelecionada.name || serieSelecionada.title,
        imagem: serieSelecionada.poster_path,
        descricao: serieSelecionada.overview || "",
        generoIds: serieSelecionada.genre_ids || [],
        nota: notaGeral,
        categoria,
        watchlist,
        temporadas: obterTemporadasSalvasOrdenadas(),
        totalTemporadas,
        totalEpisodios: obterTemporadasSalvasOrdenadas().reduce((acc, temporada) => {
            return acc + (Array.isArray(temporada.episodios) ? temporada.episodios.length : 0);
        }, 0),
        review: categoria === "Assistido" ? (filmesSalvos[index]?.review || null) : null
    };

    if (index >= 0) {
        filmesSalvos[index] = obj;
    } else {
        filmesSalvos.push(obj);
    }

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    recarregarFilmesSalvos();
    const conquestInfo = window.CineListState?.computeAchievements?.(filmesSalvos);
    conquestInfo?.newlyUnlocked?.forEach((achievement) => {
        mostrarToast(`Conquista desbloqueada: ${achievement.title}`);
    });
    atualizarCards();
    if (typeof atualizarNavCounts === "function") atualizarNavCounts();
    mostrarToast("Série salva com sucesso!");
    fecharModalAcessivel("modal");

    limparOrigemSugestoes();

    if (buscador.value.trim().length > 0 && seriesAtuais.length > 0) {
        renderizarSeries(filtroGeneroAtivo
            ? seriesAtuais.filter(s => normalizarSerie(s).genre_ids?.includes(filtroGeneroAtivo))
            : seriesAtuais
        );
    } else {
        carregarSeriesSalvas();
    }
});

document.getElementById("abrirReviewRapido")?.addEventListener("click", () => {
    if (!serieSelecionada) {
        mostrarToast("Abra uma série antes de escrever a review.");
        return;
    }
    if (!podeCriarReview(document.getElementById("categoriaFilme")?.value)) {
        mostrarToast("A review só pode ser feita para títulos marcados como Assistido.");
        return;
    }

    const atual = filmesSalvos.find((item) => item.id === serieSelecionada.id && item.tipo === "serie");
    abrirReviewRapido({
        item: { ...serieSelecionada, review: atual?.review },
        onSave: (review) => {
            filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
            const index = filmesSalvos.findIndex((item) => item.id === serieSelecionada.id && item.tipo === "serie");
            if (index < 0) {
                mostrarToast("Salve a série antes de adicionar uma review.");
                return;
            }
            if (filmesSalvos[index].categoria !== "Assistido") {
                mostrarToast("A review só pode ser salva em títulos assistidos.");
                return;
            }
            filmesSalvos[index].review = review;
            localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
            mostrarToast("Review salva.");
            carregarSeriesSalvas();
        }
    });
});

document.getElementById("categoriaFilme")?.addEventListener("change", () => atualizarDisponibilidadeReviewRapido());


function atualizarCards() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const soSeries = filmesSalvos.filter(f => f.tipo === "serie");
    const seriesFavoritas = soSeries.filter(f => f.categoria === "Favorito");
    const seriesAssistidas = soSeries.filter(f => f.categoria === "Assistido");
    const seriesAvaliadas = soSeries.filter(f => (f.nota || 0) > 0);
    const total = soSeries.length;
    const favoritas = seriesFavoritas.length;
    const assistidas = seriesAssistidas.length;
    const media = seriesAvaliadas.length > 0
        ? (seriesAvaliadas.reduce((acc, f) => acc + (f.nota || 0), 0) / seriesAvaliadas.length).toFixed(1)
        : 0;

    const setTexto = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.innerText = valor;
    };

    setTexto("card-total", total);
    setTexto("card-favoritas", favoritas);
    setTexto("card-assistidas", assistidas);
    setTexto("card-media", media);

    calcularHorasTotaisSeries(seriesAssistidas);
}

async function buscarDuracaoSerie(serieSalva) {
    const tmdbId = typeof serieSalva === "object" ? serieSalva?.id : serieSalva;
    if (!tmdbId) return 0;
    if ((cacheDuracoesSeries[tmdbId] || 0) > 0) return cacheDuracoesSeries[tmdbId];

    const episodiosSalvos = Array.isArray(serieSalva?.temporadas)
        ? serieSalva.temporadas.reduce((acc, temporada) => {
            const qtd = Array.isArray(temporada.episodios) ? temporada.episodios.length : 0;
            return acc + qtd;
        }, 0)
        : 0;

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${API_KEY}&language=pt-BR`);
        const data = await res.json();
        const tempos = Array.isArray(data.episode_run_time)
            ? data.episode_run_time.filter(valor => Number(valor) > 0)
            : [];
        const runtimeMedio = tempos[0] || 0;
        const episodiosTotais = Number(data.number_of_episodes) || 0;
        const episodiosBase = episodiosTotais || episodiosSalvos;
        const runtimeBase = runtimeMedio || (episodiosSalvos > 0 ? DURACAO_PADRAO_EPISODIO : 0);
        const minutos = runtimeBase > 0 && episodiosBase > 0
            ? runtimeBase * episodiosBase
            : 0;

        if (minutos > 0) {
            cacheDuracoesSeries[tmdbId] = minutos;
            localStorage.setItem("cache_duracoes_series", JSON.stringify(cacheDuracoesSeries));
        }

        return minutos;
    } catch (err) {
        if (episodiosSalvos > 0) {
            const minutosEstimados = episodiosSalvos * DURACAO_PADRAO_EPISODIO;
            cacheDuracoesSeries[tmdbId] = minutosEstimados;
            localStorage.setItem("cache_duracoes_series", JSON.stringify(cacheDuracoesSeries));
            return minutosEstimados;
        }
        return 0;
    }
}

async function calcularHorasTotaisSeries(series) {
    const elHoras = document.getElementById("card-horas");
    if (!elHoras) return;

    const minutosCache = series.reduce((acc, s) => acc + (cacheDuracoesSeries[s.id] || 0), 0);
    elHoras.innerText = formatarHoras(minutosCache);

    const semCache = series.filter(s => (cacheDuracoesSeries[s.id] || 0) <= 0 && s.id);
    if (semCache.length === 0) return;

    const lote = 5;
    for (let i = 0; i < semCache.length; i += lote) {
        const grupo = semCache.slice(i, i + lote);
        await Promise.all(grupo.map(s => buscarDuracaoSerie(s)));

        const totalMin = series.reduce((acc, s) => acc + (cacheDuracoesSeries[s.id] || 0), 0);
        if (elHoras) elHoras.innerText = formatarHoras(totalMin);
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

function atualizarContador() {
    const el = document.getElementById("contador");
    if (el) el.innerText = document.querySelectorAll(".movie").length;
}

atualizarCards();
ativarVisualCategoriaSelect();
configurarCardsResumo();
carregarGeneros().then(() => {
    carregarSeriesSalvas();
    if (temSugestaoPendente) {
        return processarSugestaoPendente();
    }
});
