
let categories = [];
let currentDocument = null;
const shortcutsButton = document.getElementById("shortcuts-button");
const shortcutsModalElement = document.getElementById("shortcuts-modal");

const shortcutsModal = new bootstrap.Modal(shortcutsModalElement);
const breadcrumb    = document.getElementById("breadcrumb");
const backToTop     = document.getElementById("back-to-top");
const navigation    = document.getElementById("navigation");
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
const collapseH2Toggle = document.getElementById("collapse-h2-toggle");tocSidebar.hidden   = true;
const resetChecklistButton = document.getElementById("reset-checklist-button");
const advancedSearchButton = document.getElementById("advanced-search-button");    

fetch("./data.json")
    .then(response => response.json())
    .then(async data => {
        categories = data;

        renderNavigation(categories);

        await buildSearchIndex();

        showAdvancedSearch();
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

        collapseElement.addEventListener("show.bs.collapse", () => {
            categoryButton.setAttribute("aria-expanded", "true");
        });

        collapseElement.addEventListener("hide.bs.collapse", () => {
            categoryButton.setAttribute("aria-expanded", "false");
        });

        const documentContainer =
            section.querySelector(`#documents-${index}`);

        category.documents.forEach(doc => {
            doc.category = category.category;
            const button = document.createElement("button");


            button.className = "btn btn-sm w-100 text-start text-secondary document-link";
            button.dataset.file = doc.file;
            button.dataset.category = category.category;
            button.innerHTML = `
                <i class="bi bi-file-earmark-text me-2"></i>
                ${doc.title}
            `;

            button.onclick = () => loadDocument(doc);

            documentContainer.appendChild(button);
        });
    });
}


function setActiveDocument(doc) {
    const documentButtons = navigation.querySelectorAll(".document-link");

    documentButtons.forEach(button => {
        const isActive = button.dataset.file === doc.file;

        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

async function loadDocument(doc, sectionIndex = null) {
    try {
        const response = await fetch(doc.file);

        if (!response.ok) {
            throw new Error("Document not found");
        }

        const html = await response.text();

        setActiveDocument(doc);
        currentDocument = doc;
        updateBreadcrumb(doc);
        content.innerHTML = html;
        applyContentHierarchy();
        initializeH2Collapse();
        highlightCodeBlocks();
        generateTableOfContents();
        initializeChecklist(doc);
        updateReadingProgress();
        if (sectionIndex !== null && sectionIndex >= 0) {

            const headings =
                content.querySelectorAll("h2");

            const targetHeading =
                headings[sectionIndex];

            if (targetHeading) {

                setTimeout(() => {

                    targetHeading.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }, 100);

            }

        }

    } catch (error) {
        content.textContent = "Error loading document: " + error.message;
    }
}

function applyContentHierarchy() {

    const elements = content.querySelectorAll(
        "h1, h2, h3, h4, p, ul, ol, table, .code-block"
    );

    let currentLevel = 1;

    elements.forEach(element => {

        if (/^H[1-4]$/.test(element.tagName)) {
            currentLevel = Number(element.tagName.substring(1));
            return;
        }

        element.dataset.contentLevel = currentLevel;
    });
}



/* #region initialize H2 Collapse */

    function initializeH2Collapse() {

        const headings = Array.from(
            content.querySelectorAll("h2")
        );

        headings.forEach(heading => {

            // Avoid adding the control twice
            if (heading.querySelector(".heading-chevron")) {
                return;
            }

            const chevron = document.createElement("i");

            chevron.className =
                "bi bi-chevron-down heading-chevron";

            heading.prepend(chevron);

            heading.classList.add("collapsible-heading");

            // Create the section wrapper
            const section = document.createElement("div");
            section.className = "h2-section";

            // Create an inner wrapper for the animated content
            const sectionContent = document.createElement("div");
            sectionContent.className = "h2-section-content";

            let nextElement = heading.nextElementSibling;

            while (
                nextElement &&
                !nextElement.matches("h1, h2")
            ) {

                const currentElement = nextElement;
                nextElement = nextElement.nextElementSibling;

                sectionContent.appendChild(currentElement);
            }

            section.appendChild(sectionContent);
            heading.after(section);

            heading.addEventListener("click", () => {
                toggleH2Section(
                    heading,
                    section,
                    chevron
                );
            });

        });
    }

    function toggleH2Section(heading, section, chevron) {

        const isCollapsed =
            heading.classList.toggle("collapsed");

        section.classList.toggle(
            "collapsed",
            isCollapsed
        );
    }


    function collapseAllH2() {

        const headings = content.querySelectorAll(
            "h2.collapsible-heading"
        );

        headings.forEach(heading => {

            const section = heading.nextElementSibling;

            if (!section) {
                return;
            }

            heading.classList.add("collapsed");
            section.classList.add("collapsed");

        });
    }

    collapseH2Toggle.addEventListener(
        "click",
        collapseAllH2
    );

    resetChecklistButton.addEventListener(
        "click",
        resetChecklist
    );

/* #endregion */

/* #region reset Checklist */

    function resetChecklist() {

        if (!currentDocument || !currentDocument.checklist) {
            return;
        }

        const checkboxes = content.querySelectorAll(
            ".checklist-checkbox"
        );

        checkboxes.forEach(checkbox => {

            checkbox.checked = false;

            const heading = checkbox.closest(
                ".checklist-heading"
            );

            if (!heading) {
                return;
            }

            const storageKey =
                `mykms-checklist:${currentDocument.file}:${heading.id}`;

            localStorage.removeItem(storageKey);

        });

    }

/* #endregion */




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

/* #region Checklist */

function initializeChecklist(doc) {

    if (!doc.checklist) {
        return;
    }

    const headings = content.querySelectorAll(
        "h2, h3, h4"
    );

    headings.forEach(heading => {

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "checklist-checkbox";

        const storageKey =
            `mykms-checklist:${doc.file}:${heading.id}`;

        checkbox.checked =
            localStorage.getItem(storageKey) === "true";

        checkbox.setAttribute(
            "aria-label",
            `Mark "${heading.textContent.trim()}" as complete`
        );

        checkbox.addEventListener("click", event => {
            event.stopPropagation();
        });

        checkbox.addEventListener("change", () => {

            localStorage.setItem(
                storageKey,
                checkbox.checked
            );

        });

        heading.classList.add("checklist-heading");

        heading.insertBefore(
            checkbox,
            heading.firstChild
        );

        const textNodes = Array.from(heading.childNodes)
            .filter(node =>
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim()
            );

        textNodes.forEach(node => {

            const headingText = document.createElement("span");

            headingText.className =
                "checklist-heading-text";

            headingText.textContent =
                node.textContent.trim();

            node.replaceWith(headingText);

        });

    });
}

/* #endregion Checklist */


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
            isDark ? "Switch to light mode (Ctrl + Shift + D)" : "Switch to dark mode (Ctrl + Shift + D)"
        );

        themeToggle.title = isDark ? "Switch to light mode (Ctrl + Shift + D)" : "Switch to dark mode (Ctrl + Shift + D)";

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

    function exportPdf() {

        if (!content.innerHTML.trim()) {
            return;
        }

        window.print();

    }

    exportPdfButton.addEventListener(
        "click",
        exportPdf
    );

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


/* #region updateBreadcrumb */

    function updateBreadcrumb(doc) {

        const breadcrumb = document.getElementById("breadcrumb");

        if (!breadcrumb) {
            return;
        }

        breadcrumb.innerHTML = "";

        const home = document.createElement("span");
        home.className = "breadcrumb-item";
        home.textContent = "Home";

        const separator1 = document.createElement("span");
        separator1.className = "breadcrumb-separator";
        separator1.textContent = "/";

        const category = document.createElement("span");
        category.className = "breadcrumb-item";
        category.textContent = doc.category;

        const separator2 = document.createElement("span");
        separator2.className = "breadcrumb-separator";
        separator2.textContent = "/";

        const documentItem = document.createElement("span");
        documentItem.className = "breadcrumb-item current";
        documentItem.textContent = doc.title;

        breadcrumb.appendChild(home);
        breadcrumb.appendChild(separator1);
        breadcrumb.appendChild(category);
        breadcrumb.appendChild(separator2);
        breadcrumb.appendChild(documentItem);
    }

    

/* #endregion */

// #region Keyboard Shortcuts

    document.addEventListener("keydown", event => {

        const key = event.key.toLowerCase();

        // Ctrl + M → Collapse All H2
        if (
            event.ctrlKey &&
            !event.shiftKey &&
            key === "m"
        ) {
            event.preventDefault();
            collapseAllH2();
            return;
        }

        // Ctrl + Shift + A → Advanced Search
        if (
            event.ctrlKey &&
            event.shiftKey &&
            key === "a"
        ) {
            event.preventDefault();
            showAdvancedSearch();
            return;
        }

        // Ctrl + Shift + D → Toggle Theme
        if (
            event.ctrlKey &&
            event.shiftKey &&
            key === "d"
        ) {
            event.preventDefault();
            toggleTheme();
            return;
        }

        // Ctrl + Shift + E → Export PDF
        if (
            event.ctrlKey &&
            event.shiftKey &&
            key === "e"
        ) {
            event.preventDefault();
            exportPdf();
            return;
        }

        // Ctrl + Shift + R → Reset Checklist
        if (
            event.ctrlKey &&
            event.shiftKey &&
            key === "r"
        ) {
            event.preventDefault();
            resetChecklist();
            return;
        }

        // Ctrl + Shift + K → Keyboard Shortcuts
        if (
            event.ctrlKey &&
            event.shiftKey &&
            key === "k"
        ) {
            event.preventDefault();
            shortcutsModal.show();
            return;
        }

    });

// #endregion Keyboard Shortcuts

/* #region Advanced Search */

let searchIndex = [];


async function buildSearchIndex() {

    searchIndex = [];

    for (const category of categories) {

        for (const doc of category.documents) {

            try {

                const response = await fetch(doc.file);

                if (!response.ok) {
                    continue;
                }

                const html = await response.text();

                const temp = document.createElement("div");
                temp.innerHTML = html;

                const sections = [];

                const headings = Array.from(
                    temp.querySelectorAll("h2")
                );

                headings.forEach((heading, index) => {

                    let sectionText = heading.textContent;

                    let nextElement = heading.nextElementSibling;

                    while (
                        nextElement &&
                        !nextElement.matches("h2")
                    ) {
                        sectionText += " " + nextElement.textContent;
                        nextElement = nextElement.nextElementSibling;
                    }

                    sections.push({
                        index,
                        heading: heading.textContent.trim(),
                        text: sectionText
                            .replace(/\s+/g, " ")
                            .trim()
                    });

                });

                searchIndex.push({
                    title: doc.title,
                    category: category.category,
                    file: doc.file,

                    text: temp.textContent
                        .replace(/\s+/g, " ")
                        .trim(),

                    sections
                });

            } catch (error) {

                console.error(
                    "Error indexing document:",
                    doc.file,
                    error
                );

            }

        }

    }

}


function showAdvancedSearch() {



    breadcrumb.innerHTML = "";

    content.innerHTML = `
        <h1> Advanced Search </h1>
        <div class="advanced-search-page">

            <div class="advanced-search-header">

                <p>
                    Search across your entire knowledge base.
                </p>

            </div>

            <div class="advanced-search-input">

                <i class="bi bi-search"></i>

                <input
                    id="advanced-search"
                    type="search"
                    placeholder="Search topics, concepts, code..."
                    autocomplete="off"
                >

            </div>

            <div id="search-results"></div>

        </div>
    `;

    tocSidebar.hidden = true;

    const input =
        document.getElementById("advanced-search");

    input.addEventListener(
        "input",
        () => performAdvancedSearch(input.value)
    );

    input.focus();

}

function performAdvancedSearch(query) {

    const resultsContainer =
        document.getElementById("search-results");

    if (!resultsContainer) {
        return;
    }

    const normalizedQuery =
        query.trim().toLowerCase();

    if (!normalizedQuery) {

        resultsContainer.innerHTML = "";

        return;

    }

    const results = searchIndex
        .map(doc => {

            const sectionIndex = doc.sections.findIndex(section =>
                section.text.toLowerCase().includes(normalizedQuery)
            );

            return {
                ...doc,
                sectionIndex
            };

        })
        .filter(doc =>
            doc.text.toLowerCase().includes(normalizedQuery)
        );

    if (!results.length) {

        resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="bi bi-search"></i>

                <p>
                    No results found.
                </p>
            </div>
        `;

        return;

    }

    resultsContainer.innerHTML = `
        <div class="search-result-count">
            ${results.length}
            ${results.length === 1 ? "result" : "results"}
        </div>

        ${results.map(doc => createSearchResult(doc, normalizedQuery)).join("")}
    `;

}

function createSearchResult(doc, query) {

    const index =
        doc.text.toLowerCase().indexOf(query);

    const start =
        Math.max(0, index - 120);

    const end =
        Math.min(
            doc.text.length,
            index + query.length + 180
        );

    let snippet =
        doc.text.substring(start, end);

    if (start > 0) {
        snippet = "..." + snippet;
    }

    if (end < doc.text.length) {
        snippet += "...";
    }

    const safeSnippet = escapeHtml(snippet);

    const highlightedSnippet =
        highlightSearchTerm(safeSnippet, query);

    return `
        <article class="search-result">

            <div class="search-result-header">

                <div>

                    <h3>
                        ${doc.title}
                    </h3>

                    <span class="search-result-category">
                        ${doc.category}
                    </span>

                </div>

            </div>

            <p class="search-result-snippet">
                ${highlightedSnippet}
            </p>

            <button
                class="search-result-open"
                type="button"
                data-file="${doc.file}"
                data-section-index="${doc.sectionIndex}">
                <i class="bi bi-arrow-right"></i>
                Open Document
            </button>

        </article>
    `;

}

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


function highlightSearchTerm(text, query) {

    const escapedQuery =
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return text.replace(
        new RegExp(`(${escapedQuery})`, "gi"),
        "<mark>$1</mark>"
    );

}


    advancedSearchButton.addEventListener(
        "click",
        showAdvancedSearch
    );

    document.addEventListener("click", event => {

        const button = event.target.closest(".search-result-open");

        if (!button) {
            return;
        }

        const file = button.dataset.file;

        const doc = categories
            .flatMap(category => category.documents)
            .find(document => document.file === file);

        if (!doc) {
            return;
        }

        const sectionIndex =
            Number(button.dataset.sectionIndex);

        loadDocument(doc, sectionIndex);

    });


/* #endregion Advanced Search */


shortcutsButton.addEventListener("click", () => {
    shortcutsModal.show();
});


