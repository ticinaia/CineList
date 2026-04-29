function lerFilmesPerfil() {
    try {
        return JSON.parse(localStorage.getItem("filmes") || "[]");
    } catch (err) {
        return [];
    }
}

function formatarHorasPerfil(minutos) {
    if (!minutos || minutos <= 0) return "—";
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (!horas) return `${resto}min`;
    if (!resto) return `${horas}h`;
    return `${horas}h ${resto}min`;
}

function calcularMinutosPerfil(filmes) {
    const cacheFilmes = JSON.parse(localStorage.getItem("cache_duracoes") || "{}");
    const cacheSeries = JSON.parse(localStorage.getItem("cache_duracoes_series") || "{}");
    return filmes
        .filter((item) => item.categoria === "Assistido")
        .reduce((acc, item) => acc + (item.tipo === "serie" ? (cacheSeries[item.id] || 0) : (cacheFilmes[item.id] || 0)), 0);
}

function renderizarPerfilHero(state) {
    const user = getCurrentUser();
    document.getElementById("profile-name").innerText = user?.nome || "Seu perfil";
    document.getElementById("profile-headline").innerText = state.profile.headline || "Seu próximo grande mês de maratonas começa aqui.";
    document.getElementById("profile-bio").innerText = state.profile.bio || "Use este espaço para guardar metas, reviews e o que você quer assistir em seguida.";
}

function renderizarResumoPerfil(filmes) {
    const assistidos = filmes.filter((item) => item.categoria === "Assistido");
    const reviews = filmes.filter((item) => item.review?.comentario || (item.review?.tags || []).length > 0);

    document.getElementById("profile-total").innerText = filmes.length;
    document.getElementById("profile-watched").innerText = assistidos.length;
    document.getElementById("profile-reviews").innerText = reviews.length;
    document.getElementById("profile-hours").innerText = formatarHorasPerfil(calcularMinutosPerfil(filmes));
}

function renderizarMetaDoMes(filmes) {
    const monthKey = window.CineListState.getCurrentMonthKey();
    const goal = window.CineListState.getMonthlyGoal(monthKey);
    const progress = window.CineListState.getMonthlyGoalProgress(filmes, monthKey);

    document.getElementById("goal-month-label").innerText = window.CineListState.getMonthLabel(monthKey);
    document.getElementById("goal-title").value = goal.title || "";
    document.getElementById("goal-target").value = goal.targetCount || 4;
    document.getElementById("goal-notes").value = goal.notes || "";

    document.getElementById("goal-progress").innerHTML = `
        <div class="series-progress">
            <div class="series-progress-meta">
                <span>${progress.goal.title}</span>
                <strong>${progress.current}/${progress.target}</strong>
            </div>
            <div class="series-progress-bar">
                <span style="width:${progress.percent}%;"></span>
            </div>
            <p>${progress.goal.notes || "Escolha títulos da watchlist ou das sugestões favoritas para transformar a meta em hábito."}</p>
        </div>
    `;

    const goalItems = document.getElementById("goal-items");
    if (goal.items.length === 0) {
        goalItems.innerHTML = `<p class="empty-inline">Nenhum título adicionado à meta ainda.</p>`;
    } else {
        goalItems.innerHTML = goal.items.map((item) => `
            <div class="mini-media-card">
                <div>
                    <strong>${item.titulo}</strong>
                    <span>${item.tipo === "serie" ? "Série" : "Filme"}</span>
                </div>
                <button type="button" data-remove-goal="${item.id}" data-remove-goal-type="${item.tipo}">Remover</button>
            </div>
        `).join("");
    }

    goalItems.querySelectorAll("[data-remove-goal]").forEach((button) => {
        button.addEventListener("click", () => {
            window.CineListState.removeItemFromMonthlyGoal(Number(button.dataset.removeGoal), button.dataset.removeGoalType, monthKey);
            renderizarTelaPerfil();
        });
    });

    const candidatos = [
        ...filmes.filter((item) => item.watchlist),
        ...window.CineListState.getFavoriteSuggestions()
    ].filter((item, index, array) => array.findIndex((entry) => entry.id === item.id && entry.tipo === item.tipo) === index);

    const candidatosWrap = document.getElementById("goal-candidates");
    if (candidatos.length === 0) {
        candidatosWrap.innerHTML = `<p class="empty-inline">Adicione títulos à watchlist ou favorite sugestões para montar a meta aqui.</p>`;
        return;
    }

    candidatosWrap.innerHTML = `
        <h4>Adicionar à meta</h4>
        <div class="mini-media-list">
            ${candidatos.slice(0, 8).map((item) => `
                <div class="mini-media-card">
                    <div>
                        <strong>${item.titulo || item.title || item.name}</strong>
                        <span>${item.tipo === "serie" ? "Série" : "Filme"}</span>
                    </div>
                    <button type="button" data-add-goal="${item.id}" data-add-goal-type="${item.tipo}">Entrar na meta</button>
                </div>
            `).join("")}
        </div>
    `;

    candidatosWrap.querySelectorAll("[data-add-goal]").forEach((button) => {
        button.addEventListener("click", () => {
            const origem = candidatos.find((item) => item.id === Number(button.dataset.addGoal) && item.tipo === button.dataset.addGoalType);
            if (!origem) return;
            window.CineListState.addItemToMonthlyGoal(origem, monthKey);
            renderizarTelaPerfil();
        });
    });
}

function renderizarConquistas(filmes) {
    const achievementInfo = window.CineListState.computeAchievements(filmes);
    const wrap = document.getElementById("achievement-list");
    wrap.innerHTML = achievementInfo.achievements.map((achievement) => `
        <div class="achievement-card${achievement.unlocked ? " unlocked" : ""}">
            <strong>${achievement.title}</strong>
            <p>${achievement.description}</p>
            <span>${achievement.unlocked ? "Desbloqueada" : "Em progresso"}</span>
        </div>
    `).join("");
}

function renderizarSugestoesFavoritas() {
    const wrap = document.getElementById("favorite-suggestions");
    const favoritos = window.CineListState.getFavoriteSuggestions();

    if (favoritos.length === 0) {
        wrap.innerHTML = `<p class="empty-inline">Nenhuma sugestão favoritada ainda.</p>`;
        return;
    }

    wrap.innerHTML = favoritos.map((item) => `
        <div class="mini-media-card">
            <div>
                <strong>${item.titulo}</strong>
                <span>${item.tipo === "serie" ? "Série" : "Filme"}</span>
            </div>
            <button type="button" data-remove-fav="${item.id}" data-remove-fav-type="${item.tipo}">Desfavoritar</button>
        </div>
    `).join("");

    wrap.querySelectorAll("[data-remove-fav]").forEach((button) => {
        button.addEventListener("click", () => {
            window.CineListState.toggleFavoriteSuggestion({ id: Number(button.dataset.removeFav), title: "", name: "" }, button.dataset.removeFavType);
            renderizarTelaPerfil();
        });
    });
}

function renderizarWatchlistFoco(filmes) {
    const wrap = document.getElementById("watchlist-focus");
    const items = filmes.filter((item) => item.watchlist).slice(0, 8);
    if (items.length === 0) {
        wrap.innerHTML = `<p class="empty-inline">Sua watchlist ainda está vazia.</p>`;
        return;
    }

    wrap.innerHTML = items.map((item) => `
        <div class="mini-media-card">
            <div>
                <strong>${item.titulo}</strong>
                <span>${item.tipo === "serie" ? "Série" : "Filme"}</span>
            </div>
            <button type="button" data-add-goal-watch="${item.id}" data-add-goal-watch-type="${item.tipo}">Usar na meta</button>
        </div>
    `).join("");

    wrap.querySelectorAll("[data-add-goal-watch]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = items.find((entry) => entry.id === Number(button.dataset.addGoalWatch) && entry.tipo === button.dataset.addGoalWatchType);
            if (!item) return;
            window.CineListState.addItemToMonthlyGoal(item);
            mostrarToast("Título adicionado à meta do mês.");
            renderizarTelaPerfil();
        });
    });
}

function renderizarTelaPerfil() {
    const filmes = lerFilmesPerfil();
    const state = window.CineListState.read();
    renderizarPerfilHero(state);
    renderizarResumoPerfil(filmes);
    renderizarMetaDoMes(filmes);
    renderizarConquistas(filmes);
    renderizarSugestoesFavoritas();
    renderizarWatchlistFoco(filmes);
}

function configurarEdicaoPerfil() {
    prepararModalAcessivel("profile-edit-modal", "fecharPerfilModalBtn");

    document.getElementById("editarPerfilBtn").addEventListener("click", () => {
        const state = window.CineListState.read();
        document.getElementById("profile-headline-input").value = state.profile.headline || "";
        document.getElementById("profile-bio-input").value = state.profile.bio || "";
        abrirModalAcessivel("profile-edit-modal", document.getElementById("editarPerfilBtn"));
    });

    document.getElementById("fecharPerfilModalBtn").addEventListener("click", () => fecharModalAcessivel("profile-edit-modal"));
    document.getElementById("profile-edit-modal").addEventListener("click", (event) => {
        if (event.target === document.getElementById("profile-edit-modal")) {
            fecharModalAcessivel("profile-edit-modal");
        }
    });

    document.getElementById("salvarPerfilBtn").addEventListener("click", () => {
        window.CineListState.update((state) => ({
            ...state,
            profile: {
                ...state.profile,
                headline: document.getElementById("profile-headline-input").value.trim(),
                bio: document.getElementById("profile-bio-input").value.trim()
            }
        }));
        fecharModalAcessivel("profile-edit-modal");
        renderizarTelaPerfil();
        mostrarToast("Perfil atualizado.");
    });
}

function configurarFormularioMeta() {
    document.getElementById("goal-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const monthKey = window.CineListState.getCurrentMonthKey();
        const goalAnterior = window.CineListState.getMonthlyGoal(monthKey);
        window.CineListState.saveMonthlyGoal({
            ...goalAnterior,
            monthKey,
            title: document.getElementById("goal-title").value.trim() || `Meta de ${window.CineListState.getMonthLabel(monthKey)}`,
            targetCount: Number(document.getElementById("goal-target").value) || 4,
            notes: document.getElementById("goal-notes").value.trim(),
            items: goalAnterior.items || []
        });
        renderizarTelaPerfil();
        mostrarToast("Meta do mês salva.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    configurarEdicaoPerfil();
    configurarFormularioMeta();
    renderizarTelaPerfil();
});
