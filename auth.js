const AUTH_USERS_KEY = "cinelist_users";
const AUTH_CURRENT_KEY = "cinelist_current_user";
const LEGACY_FILMES_KEY = "filmes";

function lerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    } catch (err) {
        return [];
    }
}

function salvarUsuarios(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_CURRENT_KEY) || "null");
    } catch (err) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem(AUTH_CURRENT_KEY, JSON.stringify(user));
}

function limparSessao() {
    localStorage.removeItem(AUTH_CURRENT_KEY);
}

function buscarUsuarioPorEmail(email) {
    return lerUsuarios().find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

function registrarUsuario(nome, email, senha) {
    const users = lerUsuarios();
    if (buscarUsuarioPorEmail(email)) {
        throw new Error("Ja existe uma conta com esse e-mail.");
    }

    const novoUsuario = {
        id: `user_${Date.now()}`,
        nome,
        email,
        senha,
        filmes: []
    };

    users.push(novoUsuario);
    salvarUsuarios(users);
    setCurrentUser({ id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email });
    hidratarFilmesDoUsuario();
}

function autenticarUsuario(email, senha) {
    const user = buscarUsuarioPorEmail(email);
    if (!user || user.senha !== senha) {
        throw new Error("E-mail ou senha incorretos.");
    }

    setCurrentUser({ id: user.id, nome: user.nome, email: user.email });
    hidratarFilmesDoUsuario();
}

function atualizarFilmesDoUsuario(filmes) {
    const atual = getCurrentUser();
    if (!atual) return;

    const users = lerUsuarios().map(user => {
        if (user.id !== atual.id) return user;
        return { ...user, filmes };
    });
    salvarUsuarios(users);
}

function hidratarFilmesDoUsuario() {
    const atual = getCurrentUser();
    if (!atual) return;

    const user = lerUsuarios().find(item => item.id === atual.id);
    const filmes = user?.filmes || [];
    const originalSetItem = Storage.prototype.setItem;
    originalSetItem.call(localStorage, LEGACY_FILMES_KEY, JSON.stringify(filmes));
}

function protegerPagina() {
    const atual = getCurrentUser();
    const pagina = window.location.pathname.split("/").pop() || "index.html";
    const paginaLogin = pagina === "login.html";

    if (!atual && !paginaLogin) {
        window.location.href = "login.html";
        return false;
    }

    if (atual && paginaLogin) {
        window.location.href = "index.html";
        return false;
    }

    if (atual) hidratarFilmesDoUsuario();
    return true;
}

function renderizarAuthHeader() {
    const atual = getCurrentUser();
    const menu = document.querySelector(".menu");
    if (!menu || !atual || document.getElementById("auth-user")) return;

    const authWrap = document.createElement("div");
    authWrap.className = "auth-user";
    authWrap.id = "auth-user";
    authWrap.innerHTML = `
        <button type="button" id="auth-trigger" class="auth-trigger" aria-haspopup="menu" aria-expanded="false">
            <span class="auth-avatar" aria-hidden="true">
                <span class="auth-avatar-head"></span>
                <span class="auth-avatar-body"></span>
            </span>
            <span class="auth-user-meta">
                <span class="auth-user-label">Perfil</span>
                <span class="auth-user-name">${atual.nome}</span>
            </span>
        </button>
        <div id="auth-dropdown" class="auth-dropdown hidden" role="menu">
            <button type="button" id="auth-settings" class="auth-dropdown-item" role="menuitem">Configuracoes</button>
            <button type="button" id="auth-logout" class="auth-dropdown-item auth-dropdown-danger" role="menuitem">Sair da conta</button>
        </div>
    `;
    menu.appendChild(authWrap);

    const trigger = document.getElementById("auth-trigger");
    const dropdown = document.getElementById("auth-dropdown");
    const fecharDropdown = () => {
        dropdown?.classList.add("hidden");
        trigger?.setAttribute("aria-expanded", "false");
    };

    trigger?.addEventListener("click", (e) => {
        e.stopPropagation();
        const aberto = !dropdown?.classList.contains("hidden");
        if (aberto) {
            fecharDropdown();
            return;
        }
        dropdown?.classList.remove("hidden");
        trigger.setAttribute("aria-expanded", "true");
    });

    document.getElementById("auth-settings")?.addEventListener("click", () => {
        fecharDropdown();
        alert("As configuracoes do perfil podem entrar aqui em seguida.");
    });

    document.getElementById("auth-logout")?.addEventListener("click", () => {
        fecharDropdown();
        limparSessao();
        window.location.href = "login.html";
    });

    document.addEventListener("click", (e) => {
        if (!authWrap.contains(e.target)) {
            fecharDropdown();
        }
    });
}

const __authOriginalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
    __authOriginalSetItem.call(this, key, value);
    if (this === localStorage && key === LEGACY_FILMES_KEY) {
        try {
            atualizarFilmesDoUsuario(JSON.parse(value || "[]"));
        } catch (err) {
            atualizarFilmesDoUsuario([]);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (protegerPagina()) {
        renderizarAuthHeader();
    }
});
