const API_KEY = "137645a15bec14eae77e0f109056e7e3";

let tipoSug = "filme";
let mapaGeneros = {};

// ---------------- TIPO TOGGLE ----------------

function setTipoSug(tipo) {
    tipoSug = tipo;
    document.getElementById("btn-filmes-sug").classList.toggle("active", tipo === "filme");
    document.getElementById("btn-series-sug").classList.toggle("active", tipo === "serie");
    iniciar();
}

// ---------------- GÊNEROS ----------------

async function carregarMapaGeneros() {
    try {
        const [resFilme, resSerie] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=pt-BR`),
            fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}&language=pt-BR`)
        ]);
        const dataFilme = await resFilme.json();
        const dataSerie = await resSerie.json();
        [...dataFilme.genres, ...dataSerie.genres].forEach(g => { mapaGeneros[g.id] = g.name; });
    } catch (err) {
        console.error("Erro ao carregar gêneros:", err);
    }
}

// ---------------- ANÁLISE DO HISTÓRICO ----------------

function analisarGenerosPreferidos(tipo) {
    const todos = JSON.parse(localStorage.getItem("filmes")) || [];
    const filtrados = tipo === "filme"
        ? todos.filter(f => f.tipo !== "serie")
        : todos.filter(f => f.tipo === "serie");

    const contagem = {};
    filtrados.forEach(item => {
        (item.generoIds || []).forEach(id => {
            contagem[id] = (contagem[id] || 0) + 1;
        });
    });

    // Ordenar por frequência e retornar os top 3
    return Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ id: Number(id), nome: mapaGeneros[id] || "Desconhecido", count }));
}

// ---------------- RENDER GÊNEROS FAVORITOS ----------------

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
                    background:var(--gold);
                    color:var(--ink);
                    padding:4px 14px;
                    border-radius:999px;
                    font-size:13px;
                    font-weight:500;
                ">${g.nome} <span style="opacity:0.6; font-size:11px;">${g.count}x</span></span>
            `).join("")}
        </div>
    `;
}

// ---------------- BUSCAR SUGESTÕES ----------------

async function buscarSugestoes(generos, tipo) {
    const secao = document.getElementById("secao-sugestoes");
    if (!secao) return;

    if (generos.length === 0) {
        secao.innerHTML = "";
        return;
    }

    secao.innerHTML = `<p style="color:var(--muted); font-size:14px; padding:20px 0;">Buscando sugestões...</p>`;

    const todosSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
    const idsSalvos = new Set(todosSalvos.map(f => f.id));

    try {
        // Buscar por cada gênero favorito em paralelo
        const endpoint = tipo === "filme" ? "discover/movie" : "discover/tv";
        const promises = generos.map(g =>
            fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${API_KEY}&with_genres=${g.id}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=100&page=1`)
                .then(r => r.json())
                .then(data => ({ genero: g, resultados: data.results || [] }))
        );

        const resultados = await Promise.all(promises);

        secao.innerHTML = "";

        resultados.forEach(({ genero, resultados: lista }) => {
            // Filtrar já salvos e pegar top 6
            const novos = lista
                .filter(item => !idsSalvos.has(item.id))
                .slice(0, 6);

            if (novos.length === 0) return;

            const bloco = document.createElement("div");
            bloco.style.marginBottom = "32px";
            bloco.innerHTML = `
                <h3 style="
                    font-family: 'DM Serif Display', serif;
                    font-size: 20px;
                    font-weight: 400;
                    color: var(--muted);
                    margin-bottom: 14px;
                ">Porque você curte <span style="color:var(--gold)">${genero.nome}</span></h3>
                <div class="filmes" id="sug-${genero.id}"></div>
            `;
            secao.appendChild(bloco);

            const container = document.getElementById(`sug-${genero.id}`);
            novos.forEach(item => {
                const poster = item.poster_path
                    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                    : "https://via.placeholder.com/250x350?text=Sem+Imagem";
                const titulo = item.title || item.name || "Sem título";
                const ano = (item.release_date || item.first_air_date || "").slice(0, 4) || "—";
                const nota = item.vote_average?.toFixed(1) || "0";

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

                // Ao clicar, vai para a página correspondente com o id para buscar
                div.addEventListener("click", () => {
                    const pagina = tipo === "filme" ? "index.html" : "series.html";
                    localStorage.setItem("sugestao_busca", JSON.stringify({ id: item.id, titulo, tipo }));
                    window.location.href = pagina;
                });

                container.appendChild(div);
            });
        });

    } catch (err) {
        console.error("Erro ao buscar sugestões:", err);
        secao.innerHTML = `<p style="color:var(--muted); font-size:14px;">Erro ao carregar sugestões.</p>`;
    }
}

// ---------------- INICIAR ----------------

async function iniciar() {
    await carregarMapaGeneros();
    const generos = analisarGenerosPreferidos(tipoSug);
    renderizarGenerosFavoritos(generos);
    await buscarSugestoes(generos, tipoSug);
}

iniciar();