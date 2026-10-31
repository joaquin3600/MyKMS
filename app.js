
let documents = [];

const navigation = document.getElementById("navigation");
const title = document.getElementById("title");
const content = document.getElementById("content");
const search = document.getElementById("search");

fetch("./data.json")
    .then(response => response.json())
    .then(data => {
        documents = data;
        renderNavigation(documents);
    });

function renderNavigation(items) {
    navigation.innerHTML = "";

    items.forEach(doc => {
        const button = document.createElement("button");

        button.textContent = doc.title;

        button.onclick = () => {
            title.textContent = doc.title;
            content.textContent = doc.content;
        };

        navigation.appendChild(button);
    });
}

search.addEventListener("input", () => {
    const query = search.value.toLowerCase();

    const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
    );

    renderNavigation(filtered);
});
