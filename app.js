
let categories = [];

const navigation = document.getElementById("navigation");
const title = document.getElementById("title");
const content = document.getElementById("content");
const search = document.getElementById("search");

fetch("./data.json")
    .then(response => response.json())
    .then(data => {
        categories = data;
        renderNavigation(categories);
    });

function renderNavigation(items) {
    navigation.innerHTML = "";

    items.forEach((category, index) => {

        const section = document.createElement("div");

        section.className = "mb-2";

        section.innerHTML = `
            <button class="btn btn-sm w-100 text-start fw-semibold"
                    data-bs-toggle="collapse"
                    data-bs-target="#category-${index}">
                <i class="bi bi-folder me-2"></i>
                ${category.category}
                <i class="bi bi-chevron-down float-end"></i>
            </button>

            <div class="collapse show" id="category-${index}">
                <div class="ms-3 mt-1" id="documents-${index}"></div>
            </div>
        `;

        navigation.appendChild(section);

        const documentContainer =
            section.querySelector(`#documents-${index}`);

        category.documents.forEach(doc => {

            const button = document.createElement("button");

            button.className = "btn btn-sm w-100 text-start text-secondary";
            button.innerHTML = `
                <i class="bi bi-file-earmark-text me-2"></i>
                ${doc.title}
            `;

            button.onclick = () => loadDocument(doc);

            documentContainer.appendChild(button);
        });
    });
}

async function loadDocument(doc) {
    try {
        const response = await fetch(doc.file);

        if (!response.ok) {
            throw new Error("Document not found");
        }

        const html = await response.text();

        title.textContent = doc.title;
        content.innerHTML = html;

    } catch (error) {
        content.textContent = "Error loading document: " + error.message;
    }
}

search.addEventListener("input", () => {
    const query = search.value.toLowerCase();

    const filtered = categories.map(category => ({
        ...category,
        documents: category.documents.filter(doc =>
            doc.title.toLowerCase().includes(query)
        )
    })).filter(category =>
        category.documents.length > 0
    );

    renderNavigation(filtered);
});


/* #region Theme management */

    const themeToggle = document.getElementById("theme-toggle");
    const themeToggleIcon = document.getElementById("theme-toggle-icon");

    const THEME_STORAGE_KEY = "mykms-theme";

    // Get the saved theme or use light mode by default
    function getSavedTheme() {
        try {
            return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
                ? "dark"
                : "light";
        } catch {
            return "light";
        }
    }

    // Apply the selected theme
    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;

        const isDark = theme === "dark";

        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";

        themeToggleIcon.className = isDark
            ? "bi bi-sun"
            : "bi bi-moon-stars";
    }

    // Toggle between light and dark modes
    function toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme;
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        applyTheme(newTheme);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch {
            // Theme still works even if storage is unavailable
        }
    }

    // Initialize theme
    applyTheme(getSavedTheme());

    // Theme button event
    themeToggle.addEventListener("click", toggleTheme);

/* #endregion */