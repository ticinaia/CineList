const CATEGORY_VISUAL_MAP = {
    Favorito: "favorito",
    Assistido: "assistido",
    Assistindo: "assistindo",
    "Quero ver": "quero-ver"
};

function atualizarVisualCategoriaSelect(selectId = "categoriaFilme") {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.dataset.categoryValue = CATEGORY_VISUAL_MAP[select.value] || "favorito";

    const targetId = select.dataset.choiceContainerId;
    if (!targetId) return;

    document.querySelectorAll(`#${targetId} .categoria-chip`).forEach(chip => {
        chip.classList.toggle("active", chip.dataset.value === select.value);
        chip.setAttribute("aria-pressed", chip.dataset.value === select.value ? "true" : "false");
    });
}

function ativarVisualCategoriaSelect(selectId = "categoriaFilme") {
    const select = document.getElementById(selectId);
    if (!select || select.dataset.visualBound === "true") return;

    select.dataset.visualBound = "true";

    if (!select.dataset.choiceContainerId) {
        select.dataset.choiceContainerId = `${selectId}-choices`;
    }

    const containerId = select.dataset.choiceContainerId;

    if (!document.getElementById(containerId)) {
        const wrap = document.createElement("div");
        wrap.className = "categoria-choices";
        wrap.id = containerId;
        wrap.setAttribute("role", "group");
        wrap.setAttribute("aria-label", "Selecionar categoria");

        Array.from(select.options).forEach(option => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "categoria-chip";
            chip.dataset.value = option.value;
            chip.dataset.categoryValue = CATEGORY_VISUAL_MAP[option.value] || "favorito";
            chip.textContent = option.value;
            chip.setAttribute("aria-pressed", "false");
            chip.addEventListener("click", () => {
                select.value = option.value;
                select.dispatchEvent(new Event("change", { bubbles: true }));
            });
            wrap.appendChild(chip);
        });

        select.insertAdjacentElement("afterend", wrap);
    }

    select.addEventListener("change", () => atualizarVisualCategoriaSelect(selectId));
    atualizarVisualCategoriaSelect(selectId);
}

function atualizarEstrelas(container, nota) {
    if (!container) return;

    container.querySelectorAll("[data-value]").forEach(star => {
        const ativa = Number(star.dataset.value) <= nota;
        star.classList.toggle("active", ativa);
        star.setAttribute("aria-pressed", ativa ? "true" : "false");
    });
}

function ativarEstrelas(container, onChange) {
    if (!container || container.dataset.ratingBound === "true") return;

    container.dataset.ratingBound = "true";
    const stars = Array.from(container.querySelectorAll("[data-value]"));

    stars.forEach((star, index) => {
        star.setAttribute("role", "button");
        star.setAttribute("tabindex", "0");
        star.setAttribute("aria-label", `Dar nota ${star.dataset.value} de 5`);

        const aplicarNota = () => onChange(Number(star.dataset.value));

        star.addEventListener("click", aplicarNota);
        star.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                aplicarNota();
                return;
            }

            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                stars[Math.min(index + 1, stars.length - 1)]?.focus();
            }

            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                stars[Math.max(index - 1, 0)]?.focus();
            }
        });
    });
}

function escaparHtml(texto) {
    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function obterResumoReview(salvo) {
    if (salvo?.categoria !== "Assistido") return "";
    const tags = Array.isArray(salvo?.review?.tags) ? salvo.review.tags.slice(0, 3) : [];
    const comentario = String(salvo?.review?.comentario || "").trim();
    if (!comentario && tags.length === 0) return "";

    const comentarioCurto = comentario.length > 88
        ? `${comentario.slice(0, 85)}...`
        : comentario;

    return `
        <div class="card-review-preview">
            ${comentarioCurto ? `<p>${escaparHtml(comentarioCurto)}</p>` : ""}
            ${tags.length > 0 ? `
                <div class="card-tag-list">
                    ${tags.map((tag) => `<span>${escaparHtml(tag)}</span>`).join("")}
                </div>
            ` : ""}
        </div>
    `;
}

function obterResumoSerie(salvo) {
    if (salvo?.tipo !== "serie" || !window.CineListState?.computeSeriesProgress) return "";
    const progress = window.CineListState.computeSeriesProgress(salvo);
    if (!progress.totalEpisodes && !progress.totalSeasons) return "";

    return `
        <div class="series-progress">
            <div class="series-progress-meta">
                <span>Progresso</span>
                <strong>${progress.percent}%</strong>
            </div>
            <div class="series-progress-bar">
                <span style="width:${progress.percent}%;"></span>
            </div>
            <p>${progress.label}</p>
        </div>
    `;
}

function obterMetaDoMes(item, tipo) {
    if (!window.CineListState?.isItemInMonthlyGoal || !item?.id) return "";
    if (!window.CineListState.isItemInMonthlyGoal(item.id, tipo)) return "";
    return `<span class="goal-pill">Meta do mês</span>`;
}

function criarCardMidia({
    item,
    tipo,
    salvo,
    onActivate,
    generosTexto = "",
    notaTexto = "",
    ano = "—",
    showSuggestionFavorite = false,
    onToggleFavoriteSuggestion = null
}) {
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    const titulo = item.title || item.name || "Sem título";

    const card = document.createElement("button");
    card.type = "button";
    card.className = `movie movie-${tipo}`;
    card.setAttribute("aria-label", `Abrir detalhes de ${titulo}`);

    const badgeStatus = salvo?.categoria
        ? `<span class="status">${salvo.categoria}</span>`
        : "";
    const badgeTipo = `<span class="badge-tipo ${tipo === "filme" ? "badge-filme" : "badge-serie"}">${tipo === "filme" ? "Filme" : "Série"}</span>`;
    const badgeMeta = obterMetaDoMes(item, tipo);
    const generoMarkup = generosTexto ? `<span class="genero">${generosTexto}</span>` : "";
    const notaMarkup = notaTexto ? `<span class="nota-tmdb">${notaTexto}</span>` : "";
    const reviewMarkup = obterResumoReview(salvo);
    const progressMarkup = obterResumoSerie(salvo);
    const favoritoSugestaoAtivo = showSuggestionFavorite && window.CineListState?.isFavoriteSuggestion?.(item.id, tipo);
    const favoritoSugestaoMarkup = showSuggestionFavorite ? `
        <span
            class="suggestion-favorite-btn${favoritoSugestaoAtivo ? " active" : ""}"
            data-suggestion-id="${item.id}"
            data-suggestion-type="${tipo}"
            role="button"
            tabindex="0"
            aria-label="${favoritoSugestaoAtivo ? "Remover dos favoritos" : "Favoritar sugestão"}"
            aria-pressed="${favoritoSugestaoAtivo ? "true" : "false"}"
        >❤</span>
    ` : "";

    card.innerHTML = `
        <img src="${poster}" alt="Poster de ${titulo}">
        ${favoritoSugestaoMarkup}
        ${badgeStatus}
        ${badgeTipo}
        <div class="info">
            <h3 class="nome">${titulo}</h3>
            <span class="diretor">${ano}</span>
            ${badgeMeta}
            ${generoMarkup}
            ${notaMarkup}
            ${progressMarkup}
            ${reviewMarkup}
        </div>
    `;

    card.addEventListener("click", onActivate);

    if (showSuggestionFavorite) {
        const favoriteButton = card.querySelector(".suggestion-favorite-btn");
        const toggleFavorite = (event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavoriteSuggestion?.(item, tipo, favoriteButton);
        };
        favoriteButton?.addEventListener("click", toggleFavorite);
        favoriteButton?.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                toggleFavorite(event);
            }
        });
    }

    return card;
}

function mostrarToast(mensagem) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }

    toast.innerText = mensagem;
    toast.classList.add("show");
    clearTimeout(mostrarToast._timer);
    mostrarToast._timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function prepararModalAcessivel(modalId = "modal", closeButtonId = "fecharModal") {
    const modal = document.getElementById(modalId);
    if (!modal || modal.dataset.a11yBound === "true") return;

    modal.dataset.a11yBound = "true";
    const closeButton = document.getElementById(closeButtonId);
    let triggerAnterior = null;

    const getFocusable = () => Array.from(modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && !el.classList.contains("hidden"));

    modal.__openAccessible = (trigger) => {
        triggerAnterior = trigger || document.activeElement;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        const focaveis = getFocusable();
        (focaveis[0] || closeButton || modal).focus();
    };

    modal.__closeAccessible = () => {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        triggerAnterior?.focus?.();
    };

    modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeButton?.click();
            return;
        }

        if (event.key !== "Tab") return;

        const focaveis = getFocusable();
        if (focaveis.length === 0) return;

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (event.shiftKey && document.activeElement === primeiro) {
            event.preventDefault();
            ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
            event.preventDefault();
            primeiro.focus();
        }
    });
}

function abrirModalAcessivel(modalId = "modal", trigger = null) {
    const modal = document.getElementById(modalId);
    modal?.__openAccessible?.(trigger);
}

function fecharModalAcessivel(modalId = "modal") {
    const modal = document.getElementById(modalId);
    modal?.__closeAccessible?.();
}

function podeCriarReview(categoria) {
    return categoria === "Assistido";
}

function atualizarDisponibilidadeReviewRapido(selectId = "categoriaFilme", buttonId = "abrirReviewRapido") {
    const select = document.getElementById(selectId);
    const button = document.getElementById(buttonId);
    if (!button) return;

    const habilitado = podeCriarReview(select?.value);
    button.disabled = !habilitado;
    button.classList.toggle("hidden", !habilitado);
    button.setAttribute("aria-hidden", !habilitado ? "true" : "false");
}

function garantirModalReview() {
    if (document.getElementById("review-modal")) return;

    const wrap = document.createElement("div");
    wrap.id = "review-modal";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `
        <div class="modal-content review-modal-content" role="dialog" aria-modal="true" aria-labelledby="reviewModalTitle">
            <h2 id="reviewModalTitle">Review rápido</h2>
            <p id="reviewModalSubtitle" class="review-subtitle"></p>

            <label for="review-comment">Comentário</label>
            <textarea id="review-comment" rows="4" placeholder="O que fez esse título valer o seu tempo?"></textarea>

            <label for="review-tags">Tags</label>
            <input id="review-tags" type="text" placeholder="ex: comfort movie, plot twist, sci-fi">
            <p class="review-hint">Separe as tags por vírgula. Você pode usar até 8.</p>

            <div id="review-tag-preview" class="card-tag-list card-tag-list-preview"></div>

            <div class="modal-actions">
                <button type="button" id="salvarReviewModal">Salvar review</button>
                <button type="button" id="fecharReviewModal">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
    prepararModalAcessivel("review-modal", "fecharReviewModal");

    const tagsInput = document.getElementById("review-tags");
    const preview = document.getElementById("review-tag-preview");
    const atualizarPreview = () => {
        const tags = window.CineListState?.parseReviewTags(tagsInput?.value || "") || [];
        preview.innerHTML = tags.map((tag) => `<span>${escaparHtml(tag)}</span>`).join("");
    };

    tagsInput?.addEventListener("input", atualizarPreview);
    document.getElementById("fecharReviewModal")?.addEventListener("click", () => fecharModalAcessivel("review-modal"));
    document.getElementById("review-modal")?.addEventListener("click", (event) => {
        if (event.target === document.getElementById("review-modal")) {
            fecharModalAcessivel("review-modal");
        }
    });

    wrap.__atualizarPreviewReview = atualizarPreview;
}

function abrirReviewRapido({ item, onSave }) {
    garantirModalReview();
    const modal = document.getElementById("review-modal");
    const subtitle = document.getElementById("reviewModalSubtitle");
    const comment = document.getElementById("review-comment");
    const tags = document.getElementById("review-tags");
    const saveButton = document.getElementById("salvarReviewModal");

    subtitle.innerText = item?.titulo || item?.title || item?.name || "Título sem nome";
    comment.value = item?.review?.comentario || "";
    tags.value = Array.isArray(item?.review?.tags) ? item.review.tags.join(", ") : "";
    modal.__atualizarPreviewReview?.();

    saveButton.onclick = () => {
        const payload = {
            comentario: comment.value.trim(),
            tags: window.CineListState?.parseReviewTags(tags.value) || [],
            updatedAt: new Date().toISOString()
        };
        onSave?.(payload);
        fecharModalAcessivel("review-modal");
    };

    abrirModalAcessivel("review-modal", document.activeElement);
}

function inicializarNavegacao() {
    const header = document.querySelector(".header");
    const menu = document.querySelector(".menu");
    const main = document.querySelector("main");

    if (!header || !menu || !main) return;

    if (!document.querySelector(".skip-link")) {
        const skip = document.createElement("a");
        skip.href = "#main-content";
        skip.className = "skip-link";
        skip.innerText = "Pular para o conteúdo";
        document.body.insertAdjacentElement("afterbegin", skip);
    }

    if (!main.id) {
        main.id = "main-content";
        main.setAttribute("tabindex", "-1");
    }

    if (!menu.id) {
        menu.id = "primary-navigation";
    }
    menu.setAttribute("aria-label", "Navegação principal");

    const links = Array.from(menu.querySelectorAll("a[href]"));
    const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
    links.forEach(link => {
        const href = link.getAttribute("href");
        const ativo = href === paginaAtual;
        link.classList.toggle("active", ativo);
        if (ativo) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    if (!document.getElementById("menu-toggle")) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.id = "menu-toggle";
        toggle.className = "menu-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", menu.id);
        toggle.setAttribute("aria-label", "Abrir navegação");
        toggle.innerHTML = "<span></span><span></span><span></span>";
        header.insertBefore(toggle, menu);

        toggle.addEventListener("click", () => {
            const aberto = header.classList.toggle("menu-open");
            toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
            toggle.setAttribute("aria-label", aberto ? "Fechar navegação" : "Abrir navegação");
        });

        menu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                header.classList.remove("menu-open");
                toggle.setAttribute("aria-expanded", "false");
                toggle.setAttribute("aria-label", "Abrir navegação");
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarNavegacao();
    prepararModalAcessivel();
    garantirModalReview();
    atualizarDisponibilidadeReviewRapido();
});

window.abrirReviewRapido = abrirReviewRapido;
window.atualizarDisponibilidadeReviewRapido = atualizarDisponibilidadeReviewRapido;
window.podeCriarReview = podeCriarReview;
