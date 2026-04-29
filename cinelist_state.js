const CINE_LIST_STATE_PREFIX = "cinelist_state";

function getCineListUserScope() {
    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return currentUser?.id || "guest";
}

function getCineListStateKey() {
    return `${CINE_LIST_STATE_PREFIX}_${getCineListUserScope()}`;
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey = getCurrentMonthKey()) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getDefaultCineListState() {
    return {
        profile: {
            headline: "Montando minha próxima maratona.",
            bio: "",
            accent: "gold"
        },
        monthlyGoals: {},
        favoriteSuggestions: [],
        unlockedAchievements: [],
        lastAchievementCheck: null
    };
}

function readCineListState() {
    try {
        const parsed = JSON.parse(localStorage.getItem(getCineListStateKey()) || "null");
        return {
            ...getDefaultCineListState(),
            ...(parsed || {}),
            profile: {
                ...getDefaultCineListState().profile,
                ...(parsed?.profile || {})
            },
            monthlyGoals: parsed?.monthlyGoals || {},
            favoriteSuggestions: parsed?.favoriteSuggestions || [],
            unlockedAchievements: parsed?.unlockedAchievements || []
        };
    } catch (err) {
        return getDefaultCineListState();
    }
}

function writeCineListState(nextState) {
    localStorage.setItem(getCineListStateKey(), JSON.stringify(nextState));
    return nextState;
}

function updateCineListState(updater) {
    const current = readCineListState();
    const next = typeof updater === "function" ? updater(current) : current;
    return writeCineListState(next);
}

function getMonthlyGoal(monthKey = getCurrentMonthKey()) {
    const state = readCineListState();
    return state.monthlyGoals[monthKey] || {
        monthKey,
        title: `Meta de ${getMonthLabel(monthKey)}`,
        targetCount: 4,
        notes: "",
        items: []
    };
}

function saveMonthlyGoal(goal) {
    return updateCineListState((state) => ({
        ...state,
        monthlyGoals: {
            ...state.monthlyGoals,
            [goal.monthKey]: {
                ...getMonthlyGoal(goal.monthKey),
                ...goal,
                items: Array.isArray(goal.items) ? goal.items : []
            }
        }
    }));
}

function addItemToMonthlyGoal(item, monthKey = getCurrentMonthKey()) {
    const goal = getMonthlyGoal(monthKey);
    if (goal.items.some((entry) => entry.id === item.id && entry.tipo === item.tipo)) {
        return goal;
    }

    const nextGoal = {
        ...goal,
        items: [...goal.items, {
            id: item.id,
            tipo: item.tipo,
            titulo: item.titulo || item.title || item.name || "Sem titulo",
            imagem: item.imagem || item.poster_path || ""
        }]
    };
    saveMonthlyGoal(nextGoal);
    return nextGoal;
}

function removeItemFromMonthlyGoal(id, tipo, monthKey = getCurrentMonthKey()) {
    const goal = getMonthlyGoal(monthKey);
    const nextGoal = {
        ...goal,
        items: goal.items.filter((entry) => !(entry.id === id && entry.tipo === tipo))
    };
    saveMonthlyGoal(nextGoal);
    return nextGoal;
}

function isItemInMonthlyGoal(id, tipo, monthKey = getCurrentMonthKey()) {
    return getMonthlyGoal(monthKey).items.some((entry) => entry.id === id && entry.tipo === tipo);
}

function normalizeSuggestionEntry(item, tipo) {
    return {
        id: item.id,
        tipo,
        titulo: item.title || item.name || item.titulo || "Sem titulo",
        imagem: item.poster_path || item.imagem || "",
        addedAt: new Date().toISOString()
    };
}

function toggleFavoriteSuggestion(item, tipo) {
    let favorito = false;
    updateCineListState((state) => {
        const exists = state.favoriteSuggestions.some((entry) => entry.id === item.id && entry.tipo === tipo);
        favorito = !exists;
        return {
            ...state,
            favoriteSuggestions: exists
                ? state.favoriteSuggestions.filter((entry) => !(entry.id === item.id && entry.tipo === tipo))
                : [...state.favoriteSuggestions, normalizeSuggestionEntry(item, tipo)]
        };
    });
    return favorito;
}

function isFavoriteSuggestion(id, tipo) {
    return readCineListState().favoriteSuggestions.some((entry) => entry.id === id && entry.tipo === tipo);
}

function getFavoriteSuggestions(tipo = null) {
    const items = readCineListState().favoriteSuggestions || [];
    return tipo ? items.filter((entry) => entry.tipo === tipo) : items;
}

function parseReviewTags(value) {
    return String(value || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);
}

function computeSeriesProgress(serie) {
    const temporadas = Array.isArray(serie?.temporadas) ? serie.temporadas : [];
    const totalSeasons = Number(serie?.totalTemporadas) || temporadas.length || 0;
    const totalEpisodes = Number(serie?.totalEpisodios) || temporadas.reduce((acc, temporada) => {
        return acc + (Array.isArray(temporada.episodios) ? temporada.episodios.length : 0);
    }, 0);

    let watchedEpisodes = 0;
    let watchedSeasons = 0;

    temporadas.forEach((temporada) => {
        const episodios = Array.isArray(temporada.episodios) ? temporada.episodios : [];
        const watchedInSeason = episodios.filter((ep) => ep.visto || (ep.nota || 0) > 0).length;
        watchedEpisodes += watchedInSeason;
        if (watchedInSeason > 0) watchedSeasons += 1;
    });

    const percentBase = totalEpisodes > 0 ? watchedEpisodes / totalEpisodes : 0;
    const percent = Math.max(0, Math.min(100, Math.round(percentBase * 100)));

    return {
        totalSeasons,
        watchedSeasons,
        totalEpisodes,
        watchedEpisodes,
        percent,
        label: totalEpisodes > 0
            ? `${watchedEpisodes}/${totalEpisodes} eps`
            : `${watchedSeasons}/${totalSeasons || watchedSeasons} temporadas`
    };
}

function computeAchievements(filmes, state = readCineListState()) {
    const items = Array.isArray(filmes) ? filmes : [];
    const assistidos = items.filter((item) => item.categoria === "Assistido");
    const series = items.filter((item) => item.tipo === "serie");
    const reviewed = items.filter((item) => item.review?.comentario || (item.review?.tags || []).length > 0);
    const goal = getMonthlyGoal();
    const goalProgress = goal.items.filter((goalItem) => assistidos.some((item) => item.id === goalItem.id && item.tipo === goalItem.tipo)).length;

    const achievements = [
        {
            key: "primeiro_assistido",
            title: "Primeira sessão",
            description: "Marque seu primeiro título como assistido.",
            unlocked: assistidos.length >= 1
        },
        {
            key: "cinco_reviews",
            title: "Crítico da casa",
            description: "Escreva reviews para 5 títulos.",
            unlocked: reviewed.length >= 5
        },
        {
            key: "serie_maratonada",
            title: "Modo maratona",
            description: "Chegue a 20 episódios marcados em séries.",
            unlocked: series.reduce((acc, serie) => acc + computeSeriesProgress(serie).watchedEpisodes, 0) >= 20
        },
        {
            key: "meta_do_mes",
            title: "Meta batida",
            description: "Conclua sua meta principal do mês.",
            unlocked: goal.items.length > 0 && goalProgress >= Math.max(1, Number(goal.targetCount) || goal.items.length)
        },
        {
            key: "colecionador",
            title: "Colecionador",
            description: "Tenha 25 títulos salvos entre filmes e séries.",
            unlocked: items.length >= 25
        }
    ];

    const unlockedKeys = state.unlockedAchievements || [];
    const newlyUnlocked = achievements.filter((achievement) => achievement.unlocked && !unlockedKeys.includes(achievement.key));

    if (newlyUnlocked.length > 0) {
        updateCineListState((current) => ({
            ...current,
            unlockedAchievements: Array.from(new Set([
                ...(current.unlockedAchievements || []),
                ...newlyUnlocked.map((item) => item.key)
            ])),
            lastAchievementCheck: new Date().toISOString()
        }));
    }

    return {
        achievements,
        newlyUnlocked
    };
}

function getMonthlyGoalProgress(filmes, monthKey = getCurrentMonthKey()) {
    const goal = getMonthlyGoal(monthKey);
    const assistidos = (Array.isArray(filmes) ? filmes : []).filter((item) => item.categoria === "Assistido");
    const completedItems = goal.items.filter((goalItem) => assistidos.some((item) => item.id === goalItem.id && item.tipo === goalItem.tipo));
    const target = Math.max(1, Number(goal.targetCount) || goal.items.length || 1);
    return {
        goal,
        completedItems,
        current: completedItems.length,
        target,
        percent: Math.min(100, Math.round((completedItems.length / target) * 100))
    };
}

window.CineListState = {
    getCurrentMonthKey,
    getMonthLabel,
    read: readCineListState,
    write: writeCineListState,
    update: updateCineListState,
    getMonthlyGoal,
    saveMonthlyGoal,
    addItemToMonthlyGoal,
    removeItemFromMonthlyGoal,
    isItemInMonthlyGoal,
    toggleFavoriteSuggestion,
    isFavoriteSuggestion,
    getFavoriteSuggestions,
    parseReviewTags,
    computeSeriesProgress,
    computeAchievements,
    getMonthlyGoalProgress
};
