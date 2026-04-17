// nav-counts.js — inclua em TODAS as páginas para manter os badges atualizados
function atualizarNavCounts() {
    const todos = JSON.parse(localStorage.getItem("filmes")) || [];
    const filmes = todos.filter(f => f.tipo !== "serie");
    const series = todos.filter(f => f.tipo === "serie");
    const assistidos = todos.filter(f => f.categoria === "Assistido");
    const watchlist = todos.filter(f => f.watchlist);
    const assistindo = todos.filter(f => f.categoria === "Assistindo");

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set("nav-count-filmes", filmes.length);
    set("nav-count-series", series.length);
    set("nav-count-assistidos", assistidos.length);
    set("nav-count-watchlist", watchlist.length);
    set("nav-count-assistindo", assistindo.length);
}

document.addEventListener("DOMContentLoaded", atualizarNavCounts);