const API_KEY = "137645a15bec14eae77e0f109056e7e3";

const modal = document.getElementById("modal");
const abrirBtn = document.getElementById("adicionarModal");
const fecharBtn = document.getElementById("fecharModal");
const buscador = document.getElementById("buscador");

let serieSelecionada = null;
let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let seriesAtuais = [];
let notaGeral = 0;

let mapaGeneros = {};
let filtroGeneroAtivo = null;

let temporadasModal = {};
let temporadaAtiva = 1;
let totalTemporadas = 0;

// ---------------- GÊNEROS ----------------

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
    const filtradas = seriesAtuais.filter(s => Array.isArray(s.genre_ids) && s.genre_ids.includes(filtroGeneroAtivo));
    renderizarSeries(filtradas);
    if (filtradas.length === 0) mostrarToast(`Nenhum resultado para "${mapaGeneros[filtroGeneroAtivo] || "esse gênero"}".`);
}

// ---------------- MODAL ABRIR/FECHAR ----------------

abrirBtn.addEventListener("click", () => {
    serieSelecionada = null;
    limparModal();
    modal.classList.add("active");
});

fecharBtn.addEventListener("click", () => modal.classList.remove("active"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });

function limparModal() {
    document.getElementById("tituloFilme").innerText = "Adicionar série";
    document.getElementById("posterDetalhe").src = "";
    document.getElementById("descricaoFilme").innerText = "";
    document.getElementById("notaGeral").innerText = "";
    document.getElementById("suaNota").innerText = "";
    document.getElementById("infoExtra").innerText = "";
    document.getElementById("categoriaFilme").value = "Favorito";
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

// ---------------- BUSCA ----------------

let timeout;
buscador.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => buscarSeries(buscador.value.trim()), 400);
});
document.getElementById("buscar").addEventListener("click", () => buscarSeries(buscador.value.trim()));

async function buscarSeries(query) {
    if (query.length < 3) return;
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`);
        const data = await res.json();
        seriesAtuais = data.results || [];
        filtroGeneroAtivo ? aplicarFiltroGenero() : renderizarSeries(seriesAtuais);
    } catch (err) {
        mostrarToast("Erro ao buscar. Verifique sua conexão.");
    }
}

// ---------------- RENDER CARDS ----------------

function renderizarSeries(lista) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Nenhuma série encontrada.</p>`;
        atualizarContador();
        return;
    }
    lista.forEach(serie => {
        const poster = serie.poster_path
            ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
            : "https://via.placeholder.com/250x350?text=Sem+Imagem";
        const generosTexto = (serie.genre_ids || []).slice(0, 2).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ") || "—";
        const titulo = serie.name || serie.title || "Sem título";
        const ano = (serie.first_air_date || "").slice(0, 4) || "—";
        const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
        const badgeStatus = salvo ? `<span class="status">${salvo.categoria}</span>` : "";
        const div = document.createElement("div");
        div.classList.add("movie");
        div.innerHTML = `
            <img src="${poster}" alt="${titulo}">
            ${badgeStatus}
            <span class="badge-tipo badge-serie" style="top:38px;">Série</span>
            <div class="info">
                <h3 class="nome">${titulo}</h3>
                <span class="diretor">${ano}</span>
                <span class="genero">${generosTexto}</span>
                <span class="nota-tmdb">⭐ ${serie.vote_average?.toFixed(1) || "0"}</span>
            </div>
        `;
        div.addEventListener("click", () => abrirModalSerie(serie));
        container.appendChild(div);
    });
    atualizarContador();
}

// ---------------- MODAL SÉRIE ----------------

async function abrirModalSerie(serie) {
    serieSelecionada = serie;
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

    const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
    notaGeral = salvo?.nota || 0;
    document.getElementById("suaNota").innerText = notaGeral ? "⭐ Sua nota geral: " + notaGeral : "Você ainda não avaliou";
    atualizarEstrelasGeral(notaGeral);
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";

    if (salvo?.temporadas) {
        salvo.temporadas.forEach(t => { temporadasModal[t.numero] = t; });
    }

    mostrarToast("Carregando temporadas...");
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${API_KEY}&language=pt-BR`);
        const detalhes = await res.json();
        totalTemporadas = detalhes.number_of_seasons || 1;
        renderizarAbasTemporadas(serie.id);
        await carregarTemporada(serie.id, 1);
    } catch (err) {
        mostrarToast("Erro ao carregar temporadas.");
    }

    modal.classList.add("active");
}

// ---------------- ESTRELAS GERAL ----------------

function atualizarEstrelasGeral(nota) {
    document.querySelectorAll("#rating-geral span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= nota);
    });
}

document.querySelectorAll("#rating-geral span").forEach(star => {
    star.addEventListener("click", () => {
        notaGeral = Number(star.dataset.value);
        atualizarEstrelasGeral(notaGeral);
        document.getElementById("suaNota").innerText = "⭐ Sua nota geral: " + notaGeral;
    });
});

// ---------------- ESTRELAS TEMPORADA ----------------

function atualizarEstrelasTemporada(nota) {
    document.querySelectorAll("#rating-temporada span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= nota);
    });
}

document.querySelectorAll("#rating-temporada span").forEach(star => {
    star.addEventListener("click", () => {
        const val = Number(star.dataset.value);
        if (!temporadasModal[temporadaAtiva]) return;
        temporadasModal[temporadaAtiva].nota = val;
        atualizarEstrelasTemporada(val);
    });
});

// ---------------- TEMPORADAS ----------------

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
    const label = document.getElementById("label-nota-temporada");
    if (label) label.innerText = `Nota da temporada ${numero}`;
    await carregarTemporada(serieId, numero);
}

async function carregarTemporada(serieId, numero) {
    const lista = document.getElementById("episodios-lista");
    if (!lista) return;
    lista.innerHTML = `<p style="font-size:13px; color:var(--muted);">Carregando episódios...</p>`;

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serieId}/season/${numero}?api_key=${API_KEY}&language=pt-BR`);
        const data = await res.json();
        const episodios = data.episodes || [];

        if (!temporadasModal[numero]) {
            temporadasModal[numero] = {
                numero,
                nota: 0,
                episodios: episodios.map(ep => ({ numero: ep.episode_number, nome: ep.name, nota: 0 }))
            };
        } else {
            episodios.forEach(ep => {
                const existe = temporadasModal[numero].episodios.find(e => e.numero === ep.episode_number);
                if (!existe) temporadasModal[numero].episodios.push({ numero: ep.episode_number, nome: ep.name, nota: 0 });
            });
        }

        // Mostrar nota salva da temporada
        atualizarEstrelasTemporada(temporadasModal[numero].nota || 0);
        const label = document.getElementById("label-nota-temporada");
        if (label) label.innerText = `Nota da temporada ${numero}`;

        renderizarEpisodios(numero);
    } catch (err) {
        lista.innerHTML = `<p style="font-size:13px; color:var(--muted);">Erro ao carregar episódios.</p>`;
    }
}

// ---------------- EPISÓDIOS ----------------

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
        const numT = Number(container.dataset.temporada);
        const numEp = Number(container.dataset.ep);
        container.querySelectorAll(".ep-star").forEach(star => {
            star.addEventListener("click", () => {
                const val = Number(star.dataset.val);
                const ep = temporadasModal[numT]?.episodios.find(e => e.numero === numEp);
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
    const media = notadas.length ? (notadas.reduce((a, e) => a + e.nota, 0) / notadas.length).toFixed(1) : "—";
    const el = document.getElementById("media-temporada");
    if (el) el.innerText = `Média dos episódios da T${numTemporada}: ${media} ★`;
}

// ---------------- SALVAR ----------------

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
        temporadas: Object.values(temporadasModal),
    };

    if (index >= 0) {
        filmesSalvos[index] = obj;
    } else {
        filmesSalvos.push(obj);
    }

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    atualizarCards();
    // Chama atualizarNavCounts do nav-counts.js
    if (typeof atualizarNavCounts === "function") atualizarNavCounts();
    mostrarToast("Série salva com sucesso!");
    modal.classList.remove("active");

    if (seriesAtuais.length > 0) {
        renderizarSeries(filtroGeneroAtivo
            ? seriesAtuais.filter(s => s.genre_ids?.includes(filtroGeneroAtivo))
            : seriesAtuais
        );
    }
});

// ---------------- CARDS STATS ----------------

function atualizarCards() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const soSeries = filmesSalvos.filter(f => f.tipo === "serie");
    const total = soSeries.length;
    const assistidas = soSeries.filter(f => f.categoria === "Assistido").length;
    const media = total > 0
        ? (soSeries.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;
    const h2s = document.querySelectorAll(".card h2");
    if (h2s[0]) h2s[0].innerText = total;
    if (h2s[1]) h2s[1].innerText = assistidas;
    if (h2s[2]) h2s[2].innerText = media;
}

function atualizarContador() {
    const el = document.getElementById("contador");
    if (el) el.innerText = document.querySelectorAll(".movie").length;
}

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

atualizarCards();
carregarGeneros();