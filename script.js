const modal = document.getElementById("modal");
const abrir = document.getElementById("adicionarModal");
const fechar = document.getElementById("fecharModal");

abrir.onclick = () => {
    modal.classList.add("active");
};

fechar.onclick = () => {
    modal.classList.remove("active");
};
async function buscarFilme(nome) {
    const apiKey = "SUA_API_KEY";
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${nome}`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    const filme = dados.results[0];

    document.getElementById("tituloFilme").innerText = filme.title;
}
const estrelas = document.querySelectorAll(".rating span");
const inputNota = document.getElementById("nota");

estrelas.forEach(star => {
    star.addEventListener("click", () => {
    const valor = star.dataset.value;
    inputNota.value = valor;

    estrelas.forEach(s => s.classList.remove("active"));

    for (let i = 0; i < valor; i++) {
        estrelas[i].classList.add("active");
    }
});
});
const buscador = document.getElementById("buscador");

buscador.addEventListener("input", async () => {
    const query = buscador.value;
    if (query.length < 3) return;
    const apiKey = "SUA_API_KEY";
    const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`
    );
    const data = await res.json();
    mostrarResultados(data.results);
});
function mostrarResultados(filmes) {
    const container = document.querySelector(".filmes");
    container.innerHTML = "";

    filmes.forEach(filme => {
    const div = document.createElement("div");
    div.classList.add("movie");

    div.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${filme.poster_path}">
        <h3>${filme.title}</h3>
    `;

    container.appendChild(div);
});
}
function atualizarContador() {
    const filmes = document.querySelectorAll(".movie");
    document.getElementById("contador").innerText = filmes.length;
}
function filtrarCategoria(categoria) {
  const filmes = document.querySelectorAll(".movie");

  filmes.forEach(filme => {
    const genero = filme.querySelector(".genero").innerText;

    if (genero === categoria || categoria === "Todos") {
      filme.style.display = "block";
    } else {
      filme.style.display = "none";
    }
  });
}
function calcularMedia() {
    const filmes = JSON.parse(localStorage.getItem("filmes")) || [];

    if (filmes.length === 0) return 0;

    const soma = filmes.reduce((acc, f) => acc + Number(f.nota || 0), 0);

    return (soma / filmes.length).toFixed(1);
}