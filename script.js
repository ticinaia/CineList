const API_KEY = "137645a15bec14eae77e0f109056e7e3";

const modal = document.getElementById("modal");
const abrirBtn = document.getElementById("adicionarModal");
const fecharBtn = document.getElementById("fecharModal");
const buscador = document.getElementById("buscador");

let filmeSelecionado = null;
let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let filmesAtuais = [];
let notaSelecionada = 0;
const tipoAtivo = "filme";

let mapaGeneros = {};
let filtroGeneroAtivo = null;

let temporadasModal = {}; 
let temporadaAtiva = 1;
let totalTemporadas = 0;




async function carregarGeneros() {
    try {
        const endpoint = tipoAtivo === "filme"
            ? `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=pt-BR`
            : `https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=pt-BR`;
        const res = await fetch(endpoint);
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
    const campo = tipoAtivo === "filme" ? "genre_ids" : "genre_ids";
    const filtrados = filmesAtuais.filter(f => Array.isArray(f.genre_ids) && f.genre_ids.includes(filtroGeneroAtivo));
    renderizarFilmes(filtrados);
    if (filtrados.length === 0) {
        mostrarToast(`Nenhum resultado para "${mapaGeneros[filtroGeneroAtivo] || "esse gênero"}".`);
    }
}


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
    document.getElementById("tituloFilme").innerText = tipoAtivo === "filme" ? "Adicionar filme" : "Adicionar série";
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
    temporadaAtiva = 1;
    totalTemporadas = 0;
}


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
        const endpoint = tipoAtivo === "filme"
            ? `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`
            : `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;
        const res = await fetch(endpoint);
        const data = await res.json();
        filmesAtuais = data.results || [];
        filtroGeneroAtivo ? aplicarFiltroGenero() : renderizarFilmes(filmesAtuais);
    } catch (err) {
        console.error("Erro ao buscar:", err);
        mostrarToast("Erro ao buscar. Verifique sua conexão.");
    }
}


function renderizarFilmes(lista) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Nenhum resultado encontrado.</p>`;
        atualizarContador();
        return;
    }

    lista.forEach(item => {
        const poster = item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : "https://via.placeholder.com/250x350?text=Sem+Imagem";

        const generosTexto = (item.genre_ids || [])
            .slice(0, 2)
            .map(id => mapaGeneros[id] || "")
            .filter(Boolean)
            .join(", ") || "—";

        const titulo = item.title || item.name || "Sem título";
        const ano = (item.release_date || item.first_air_date || "").slice(0, 4) || "—";
        const nota = item.vote_average?.toFixed(1) || "0";

        const isFilme = tipoAtivo === "filme";
        const salvo = filmesSalvos.find(f => f.id === item.id && f.tipo === (isFilme ? "filme" : "serie"));
        const badgeStatus = salvo ? `<span class="status">${salvo.categoria}</span>` : "";
        const badgeTipo = `<span class="badge-tipo ${isFilme ? 'badge-filme' : 'badge-serie'}">${isFilme ? 'Filme' : 'Série'}</span>`;

        const div = document.createElement("div");
        div.classList.add("movie");
        div.innerHTML = `
            <img src="${poster}" alt="${titulo}">
            ${badgeStatus}
            ${badgeTipo}
            <div class="info">
                <h3 class="nome">${titulo}</h3>
                <span class="diretor">${ano}</span>
                <span class="genero">${generosTexto}</span>
                <span class="nota-tmdb">⭐ ${nota}</span>
            </div>
        `;

        div.addEventListener("click", () => isFilme ? abrirModalFilme(item) : abrirModalSerie(item));
        container.appendChild(div);
    });

    atualizarContador();
}


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
    document.getElementById("infoExtra").innerText = generosTexto ? "🎬 " + generosTexto : "";

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


async function abrirModalSerie(serie) {
    filmeSelecionado = { ...serie, tipo: "serie" };
    temporadasModal = {};
    temporadaAtiva = 1;

    const generosTexto = (serie.genre_ids || []).map(id => mapaGeneros[id] || "").filter(Boolean).join(", ");
    document.getElementById("tituloFilme").innerText = serie.name || serie.title;
    document.getElementById("posterDetalhe").src = serie.poster_path
        ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    document.getElementById("descricaoFilme").innerText = serie.overview || "Sem descrição disponível";
    document.getElementById("notaGeral").innerText = "⭐ Nota geral: " + (serie.vote_average?.toFixed(1) || "0");
    document.getElementById("infoExtra").innerText = generosTexto ? "📺 " + generosTexto : "";

    const salvo = filmesSalvos.find(f => f.id === serie.id && f.tipo === "serie");
    document.getElementById("suaNota").innerText = salvo?.nota ? "⭐ Sua nota: " + salvo.nota : "Você ainda não avaliou";
    notaSelecionada = salvo?.nota || 0;
    document.querySelectorAll(".rating span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
    });
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";

    // Carregar detalhes da série (número de temporadas)
    const secaoSeries = document.getElementById("secao-series");
    if (secaoSeries) secaoSeries.style.display = "block";

    mostrarToast("Carregando temporadas...");

    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${API_KEY}&language=pt-BR`);
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

        renderizarEpisodios(numero);
        renderizarNotaTemporada(numero);
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

function renderizarNotaTemporada(numTemporada) {
}

function atualizarMediaTemporada(numTemporada) {
    const t = temporadasModal[numTemporada];
    if (!t) return;
    const notadas = t.episodios.filter(e => e.nota > 0);
    const media = notadas.length ? (notadas.reduce((a, e) => a + e.nota, 0) / notadas.length).toFixed(1) : "—";
    const el = document.getElementById("media-temporada");
    if (el) el.innerText = `Média dos episódios da T${numTemporada}: ${media} ★`;
}


function ativarEstrelas() {
    document.querySelectorAll(".rating span").forEach(star => {
        star.onclick = () => {
            notaSelecionada = Number(star.dataset.value);
            document.querySelectorAll(".rating span").forEach(s => {
                s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
            });
            // Se for série, salvar nota da temporada ativa
            if (filmeSelecionado?.tipo === "serie" && temporadasModal[temporadaAtiva]) {
                temporadasModal[temporadaAtiva].nota = notaSelecionada;
            }
        };
    });
}

ativarEstrelas();


document.getElementById("salvar").addEventListener("click", () => {
    if (!filmeSelecionado) {
        mostrarToast("Pesquise e selecione um item antes de salvar.");
        return;
    }

    const categoria = document.getElementById("categoriaFilme").value;
    const watchlist = document.getElementById("watchlist").checked;
    const index = filmesSalvos.findIndex(f => f.id === filmeSelecionado.id && f.tipo === filmeSelecionado.tipo);

    const obj = {
        id: filmeSelecionado.id,
        tipo: filmeSelecionado.tipo || "filme",
        titulo: filmeSelecionado.title || filmeSelecionado.name,
        imagem: filmeSelecionado.poster_path,
        descricao: filmeSelecionado.overview || "",
        generoIds: filmeSelecionado.genre_ids || [],
        nota: notaSelecionada,
        categoria,
        watchlist,
    };

    if (filmeSelecionado.tipo === "serie") {
        obj.temporadas = Object.values(temporadasModal);
    }

    if (index >= 0) {
        filmesSalvos[index] = obj;
    } else {
        filmesSalvos.push(obj);
    }

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    atualizarCards();
    atualizarNavCounts();
    mostrarToast("Salvo com sucesso!");
    modal.classList.remove("active");

    renderizarFilmes(filtroGeneroAtivo
        ? filmesAtuais.filter(f => f.genre_ids?.includes(filtroGeneroAtivo))
        : filmesAtuais
    );
});


function atualizarCards() {
    filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const soFilmes = filmesSalvos.filter(f => f.tipo !== "serie");
    const total = soFilmes.length;
    const assistidos = soFilmes.filter(f => f.categoria === "Assistido").length;
    const media = total > 0
        ? (soFilmes.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;

    const h2s = document.querySelectorAll(".card h2");
    if (h2s[0]) h2s[0].innerText = total;
    if (h2s[1]) h2s[1].innerText = assistidos;
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