const fs = require("fs");
const path = require("path");

const documentsRoot = path.join(__dirname, "Documents");

function getTitleFromFile(filePath) {
    return path.basename(filePath, ".html");
}

function hasChecklistMetadata(filePath) {
    const html = fs.readFileSync(filePath, "utf8");

    return /<!--\s*checklist:\s*true\s*-->/i.test(html);
}

function getCategories() {
    const categories = [];

    if (!fs.existsSync(documentsRoot)) {
        console.error("Documents folder not found.");
        process.exit(1);
    }

    const categoryNames = fs
        .readdirSync(documentsRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    for (const categoryName of categoryNames) {

        const categoryPath = path.join(
            documentsRoot,
            categoryName
        );

        const documents = fs
            .readdirSync(categoryPath, { withFileTypes: true })
            .filter(entry =>
                entry.isFile() &&
                entry.name.toLowerCase().endsWith(".html")
            )
            .map(entry => {

                const filePath = path.join(
                    categoryPath,
                    entry.name
                );

                const relativePath = path
                    .relative(__dirname, filePath)
                    .split(path.sep)
                    .join("/");

                const document = {
                    title: getTitleFromFile(entry.name),
                    file: relativePath
                };

                if (hasChecklistMetadata(filePath)) {
                    document.checklist = true;
                }

                return document;
            })
            .sort((a, b) =>
                a.title.localeCompare(b.title)
            );

            if (documents.length > 0) {
                categories.push({
                    category: categoryName,
                    documents
                });
            }
    }

    return categories;
}

const data = getCategories();

fs.writeFileSync(
    path.join(__dirname, "data.json"),
    JSON.stringify(data, null, 4) + "\n",
    "utf8"
);

console.log("data.json generated successfully.");   