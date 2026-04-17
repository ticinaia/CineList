const API_KEY = "137645a15bec14eae77e0f109056e7e3";

const modal = document.getElementById("modal");
const abrirBtn = document.getElementById("adicionarModal");
const fecharBtn = document.getElementById("fecharModal");
const buscador = document.getElementById("buscador");

let filmeSelecionado = null;
let filmesSalvos = JSON.parse(localStorage.getItem("filmes")) || [];
let filmesAtuais = [];
let notaSelecionada = 0;

// ---------------- MODAL ----------------

// Abrir modal em branco (botão "Adicionar")
abrirBtn.addEventListener("click", () => {
    filmeSelecionado = null;
    limparModal();
    modal.classList.add("active");
});

// Fechar modal
fecharBtn.addEventListener("click", () => modal.classList.remove("active"));

// Fechar clicando fora do conteúdo
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
}

// ---------------- BUSCA ----------------
let timeout;

buscador.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        buscarFilmes(buscador.value.trim());
    }, 400);
});

// CORRIGIDO: busca manual pelo botão também
document.getElementById("buscar").addEventListener("click", () => {
    buscarFilmes(buscador.value.trim());
});

async function buscarFilmes(query) {
    if (query.length < 3) return;

    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`
        );
        const data = await res.json();
        filmesAtuais = data.results || [];
        renderizarFilmes(filmesAtuais);
    } catch (err) {
        console.error("Erro ao buscar filmes:", err);
    }
}

// ---------------- RENDER ----------------
function renderizarFilmes(lista) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";

    lista.forEach(filme => {
        const poster = filme.poster_path
            ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
            : "https://via.placeholder.com/250x350?text=Sem+Imagem";

        const div = document.createElement("div");
        div.classList.add("movie");

        div.innerHTML = `
            <img src="${poster}" alt="${filme.title}">
            <div class="info">
                <h3 class="nome">${filme.title}</h3>
                <span class="diretor">${filme.release_date?.slice(0, 4) || "Ano desconhecido"}</span>
                <span class="genero">⭐ ${filme.vote_average?.toFixed(1) || "0"}</span>
                <span class="status">Todos</span>
            </div>
        `;

        div.addEventListener("click", () => abrirModalFilme(filme));
        container.appendChild(div);
    });

    atualizarContador();
}

// ---------------- ABRIR MODAL COM FILME ----------------
function abrirModalFilme(filme) {
    filmeSelecionado = filme;

    document.getElementById("tituloFilme").innerText = filme.title;

    const poster = filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";

    document.getElementById("posterDetalhe").src = poster;
    document.getElementById("descricaoFilme").innerText = filme.overview || "Sem descrição disponível";
    document.getElementById("notaGeral").innerText = "⭐ Nota geral: " + (filme.vote_average?.toFixed(1) || "0");

    const salvo = filmesSalvos.find(f => f.id === filme.id);
    document.getElementById("suaNota").innerText = salvo
        ? "⭐ Sua nota: " + salvo.nota
        : "Você ainda não avaliou";

    // reset
    notaSelecionada = 0;
    document.querySelectorAll(".rating span").forEach(s => s.classList.remove("active"));
    document.getElementById("watchlist").checked = salvo?.watchlist || false;
    document.getElementById("categoriaFilme").value = salvo?.categoria || "Favorito";

    ativarEstrelas();
    modal.classList.add("active");
}

// ---------------- ESTRELAS ----------------
function ativarEstrelas() {
    const estrelas = document.querySelectorAll(".rating span");

    estrelas.forEach(star => {
        star.onclick = () => {
            notaSelecionada = Number(star.dataset.value);
            estrelas.forEach(s => {
                s.classList.toggle("active", Number(s.dataset.value) <= notaSelecionada);
            });
        };
    });
}

// inicializa estrelas ao carregar
ativarEstrelas();

// ---------------- SALVAR ----------------
document.getElementById("salvar").addEventListener("click", () => {
    if (!filmeSelecionado) {
        alert("Pesquise e selecione um filme antes de salvar.");
        return;
    }

    const categoria = document.getElementById("categoriaFilme").value;
    const watchlist = document.getElementById("watchlist").checked;

    // CORRIGIDO: permite reeditar um filme já salvo em vez de bloquear
    const index = filmesSalvos.findIndex(f => f.id === filmeSelecionado.id);

    const filmeObj = {
        id: filmeSelecionado.id,
        titulo: filmeSelecionado.title,
        imagem: filmeSelecionado.poster_path,
        nota: notaSelecionada,
        categoria: categoria,
        watchlist: watchlist
    };

    if (index >= 0) {
        filmesSalvos[index] = filmeObj; // atualiza existente
    } else {
        filmesSalvos.push(filmeObj);    // adiciona novo
    }

    localStorage.setItem("filmes", JSON.stringify(filmesSalvos));
    atualizarCards();
    modal.classList.remove("active");
});

// ---------------- CARDS ----------------
function atualizarCards() {
    const total = filmesSalvos.length;
    const assistidos = filmesSalvos.filter(f => f.categoria === "Assistido").length;
    const media = total > 0
        ? (filmesSalvos.reduce((acc, f) => acc + (f.nota || 0), 0) / total).toFixed(1)
        : 0;

    document.querySelectorAll(".card h2")[0].innerText = total;
    document.querySelectorAll(".card h2")[1].innerText = assistidos;
    document.querySelectorAll(".card h2")[2].innerText = media;
}

// ---------------- CONTADOR ----------------
function atualizarContador() {
    document.getElementById("contador").innerText =
        document.querySelectorAll(".movie").length;
}

// ---------------- FILTROS ----------------
// CORRIGIDO: seletor era #categoria (id duplicado), agora é .categoria a
document.querySelectorAll(".categoria a").forEach(botao => {
    botao.addEventListener("click", (e) => {
        e.preventDefault();

        const genero = botao.innerText.trim().toLowerCase();

        const filtrados = filmesAtuais.filter(f =>
            f.title.toLowerCase().includes(genero)
        );

        renderizarFilmes(filtrados.length > 0 ? filtrados : filmesAtuais);
    });
});

// ---------------- INICIALIZAR ----------------
atualizarCards();