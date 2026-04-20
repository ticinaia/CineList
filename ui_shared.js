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

function criarCardMidia({ item, tipo, salvo, onActivate, generosTexto = "", notaTexto = "", ano = "—" }) {
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : "https://via.placeholder.com/250x350?text=Sem+Imagem";
    const titulo = item.title || item.name || "Sem título";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "movie";
    card.setAttribute("aria-label", `Abrir detalhes de ${titulo}`);

    const badgeStatus = salvo?.categoria
        ? `<span class="status">${salvo.categoria}</span>`
        : "";
    const badgeTipo = `<span class="badge-tipo ${tipo === "filme" ? "badge-filme" : "badge-serie"}">${tipo === "filme" ? "Filme" : "Série"}</span>`;
    const generoMarkup = generosTexto ? `<span class="genero">${generosTexto}</span>` : "";
    const notaMarkup = notaTexto ? `<span class="nota-tmdb">${notaTexto}</span>` : "";

    card.innerHTML = `
        <img src="${poster}" alt="Poster de ${titulo}">
        ${badgeStatus}
        ${badgeTipo}
        <div class="info">
            <h3 class="nome">${titulo}</h3>
            <span class="diretor">${ano}</span>
            ${generoMarkup}
            ${notaMarkup}
        </div>
    `;

    card.addEventListener("click", onActivate);
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
});
