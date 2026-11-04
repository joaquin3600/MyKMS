
let categories = [];

const backToTop     = document.getElementById("back-to-top");
const navigation    = document.getElementById("navigation");
const title         = document.getElementById("title");
const content       = document.getElementById("content");
const search        = document.getElementById("search");
const tocSidebar    = document.getElementById("table-of-contents");
const tocNavigation = document.getElementById("toc-navigation");
const readingProgress = document.querySelector(".reading-progress");
const readingProgressBar = document.getElementById("reading-progress-bar");
const sidebar = document.querySelector(".sidebar-column");
const sidebarToggle = document.getElementById("sidebar-toggle");
const main = document.querySelector("main");
const exportPdfButton = document.getElementById("export-pdf");
tocSidebar.hidden   = true;

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
            <button class="btn btn-sm w-100 text-start fw-semibold category-toggle"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#category-${index}"
                    aria-expanded="true">

                <i class="bi bi-folder me-2"></i>

                ${category.category}

                <i class="bi bi-chevron-down float-end category-chevron"></i>
            </button>

            <div class="collapse show" id="category-${index}">
                <div class="ms-3 mt-1" id="documents-${index}"></div>
            </div>
        `;


        navigation.appendChild(section);


        const collapseElement = section.querySelector(`#category-${index}`);
        const categoryButton = section.querySelector(".category-toggle");
        const chevron = section.querySelector(".category-chevron");

        // Update chevron when category expands
        collapseElement.addEventListener("show.bs.collapse", () => {
            chevron.classList.replace("bi-chevron-right", "bi-chevron-down");
            categoryButton.setAttribute("aria-expanded", "true");
        });

        // Update chevron when category collapses
        collapseElement.addEventListener("hide.bs.collapse", () => {
            chevron.classList.replace("bi-chevron-down", "bi-chevron-right");
            categoryButton.setAttribute("aria-expanded", "false");
        });


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
        highlightCodeBlocks();
        generateTableOfContents();
        updateReadingProgress();

    } catch (error) {
        content.textContent = "Error loading document: " + error.message;
    }
}

/* #region Code Highlighting */

    function highlightCodeBlocks() {

        const codeBlocks = content.querySelectorAll("pre code");

        codeBlocks.forEach(block => {

            // Avoid highlighting the same block twice
            if (block.dataset.highlighted) {
                return;
            }

            hljs.highlightElement(block);

        });

    }

/* #endregion */



/* #region Table of Contents */

    let tocObserver = null;

    // Generate a URL-friendly ID from a heading
        function generateSlug(text) 
        {
            return text
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
        }

    // Generate the document outline
        function generateTableOfContents() {

            // Disconnect the previous observer
            if (tocObserver) {
                tocObserver.disconnect();
            }

            tocNavigation.innerHTML = "";

            const headings = content.querySelectorAll("h1, h2, h3");

            // Hide the TOC if there are no headings
            if (headings.length === 0) {
                tocSidebar.hidden = true;
                return;
            }

            tocSidebar.hidden = false;

            const usedIds = new Set();

            headings.forEach((heading, index) => {

                // Generate a unique ID
                const baseId = heading.id || generateSlug(heading.textContent) || `section-${index + 1}`;

                let id = baseId;
                let counter = 2;

                while (usedIds.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading)) {
                    id = `${baseId}-${counter}`;
                    counter++;
                }

                heading.id = id;
                usedIds.add(id);

                // Create TOC link
                const link = document.createElement("a");

                link.href = `#${id}`;
                link.textContent = heading.textContent.trim();
                link.classList.add(`toc-level-${heading.tagName.substring(1)}`);

                link.addEventListener("click", event => {
                    event.preventDefault();

                    heading.scrollIntoView({
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                            ? "auto"
                            : "smooth",
                        block: "start"
                    });

                    setActiveTocLink(link);
                    history.replaceState(null, "", `#${id}`);
                });

                tocNavigation.appendChild(link);
            });

            initializeTocObserver(headings);
        }

    // Highlight the currently visible section

    function setActiveTocLink(activeLink) {

        // Remove active class from all TOC links
        tocNavigation.querySelectorAll("a").forEach(link => {
            link.classList.remove("active");
        });

        // Highlight current section
        activeLink.classList.add("active");

        // Automatically scroll the TOC to keep the active link visible
        const sidebarRect = tocSidebar.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        const offset = 40;

        // If the active link is above the visible area
        if (linkRect.top < sidebarRect.top + offset) {

            tocSidebar.scrollTo({
                top: tocSidebar.scrollTop + linkRect.top - sidebarRect.top - offset,
                behavior: "smooth"
            });

        }

        // If the active link is below the visible area
        else if (linkRect.bottom > sidebarRect.bottom) {

            tocSidebar.scrollTo({
                top: tocSidebar.scrollTop + linkRect.bottom - sidebarRect.bottom + offset,
                behavior: "smooth"
            });

        }
    }

    // Observe headings while scrolling

        function initializeTocObserver(headings) {

            tocObserver = new IntersectionObserver(entries => {

                const visibleHeadings = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) =>
                        a.boundingClientRect.top - b.boundingClientRect.top
                    );

                if (visibleHeadings.length === 0) return;

                const activeHeading = visibleHeadings[0].target;

                const activeLink = tocNavigation.querySelector(
                    `a[href="#${CSS.escape(activeHeading.id)}"]`
                );

                if (activeLink) {
                    setActiveTocLink(activeLink);
                }

            }, {
                root: null,
                rootMargin: "-15% 0px -70% 0px",
                threshold: 0
            });

            headings.forEach(heading => {
                tocObserver.observe(heading);
            });
        }




/* #endregion */


/* #region Back to Top */

    // Show or hide the button depending on scroll position
    function updateBackToTopVisibility() {

        if (window.scrollY > 300) {
            backToTop.classList.add("visible");
        } else {
            backToTop.classList.remove("visible");
        }

    }

    // Listen for page scrolling
    window.addEventListener("scroll", updateBackToTopVisibility, {
        passive: true
    });

    // Return to the top when clicking the button
    backToTop.addEventListener("click", () => {

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? "auto" : "smooth"
        });

    });

    // Initialize button visibility
    updateBackToTopVisibility();

/* #endregion */


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

        const highlightLight = document.getElementById("highlight-light");
        const highlightDark = document.getElementById("highlight-dark");

        highlightLight.disabled = theme === "dark";
        highlightDark.disabled = theme !== "dark";

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

/* #region Reading Progress */

    function updateReadingProgress() {

        const documentHeight = content.scrollHeight;
        const viewportHeight = window.innerHeight;

        // Hide progress when no document is loaded
        if (!content.innerHTML || documentHeight <= viewportHeight) {
            readingProgress.style.display = "none";
            readingProgressBar.style.width = "0%";
            readingProgress.setAttribute("aria-valuenow", "0");
            return;
        }

        readingProgress.style.display = "block";

        // Calculate the reading progress
        const contentTop = content.getBoundingClientRect().top + window.scrollY;
        const scrollableHeight = documentHeight - viewportHeight;

        const scrolled = window.scrollY - contentTop;

        const progress = Math.min(
            100,
            Math.max(0, (scrolled / scrollableHeight) * 100)
        );

        readingProgressBar.style.width = `${progress}%`;
        readingProgress.setAttribute("aria-valuenow", Math.round(progress));
    }

    // Update progress while scrolling
    window.addEventListener("scroll", updateReadingProgress, {
        passive: true
    });

    // Recalculate when the window is resized
    window.addEventListener("resize", updateReadingProgress);

/* #endregion */


/* #region Sidebar Toggle */

    sidebarToggle.addEventListener("click", () => {

        const isHidden = sidebar.classList.toggle("sidebar-hidden");

        main.classList.toggle("main-expanded", isHidden);

        sidebarToggle.setAttribute(
            "aria-expanded",
            String(!isHidden)
        );

        sidebarToggle.setAttribute(
            "aria-label",
            isHidden ? "Show sidebar" : "Hide sidebar"
        );

    });

/* #endregion */

/* #region Export PDF */

    exportPdfButton.addEventListener("click", () => {

        if (!content.innerHTML.trim()) {
            return;
        }

        window.print();

    });

/* #endregion */


/* #region Code Block Copy */

    content.addEventListener("click", async event => {

        const copyButton = event.target.closest(".copy-code");

        if (!copyButton) return;

        const codeBlock = copyButton.closest(".code-block");
        const code = codeBlock.querySelector("pre code");

        try {

            await navigator.clipboard.writeText(code.textContent);

            copyButton.innerHTML = `
                <i class="bi bi-check2"></i>
                Copied!
            `;

            copyButton.classList.add("copied");

            setTimeout(() => {

                copyButton.innerHTML = `
                    <i class="bi bi-clipboard"></i>
                    Copy
                `;

                copyButton.classList.remove("copied");

            }, 2000);

        } catch (error) {

            console.error("Unable to copy code:", error);

        }

    });

    

/* #endregion */