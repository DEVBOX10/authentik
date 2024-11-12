import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function* walkFilesystem(dir) {
    const openeddir = fs.opendirSync(dir);
    if (!openeddir) {
        return;
    }
    let d;
    while ((d = openeddir?.readSync())) {
        if (!d) {
            break;
        }
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walkFilesystem(entry);
        else if (d.isFile()) yield entry;
    }
    openeddir.close();
}

const import_re = /^(import \w+ from .*\.css)";/;

function extractImportLinesFromFile(path) {
    const source = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
    const lines = source?.split("\n") ?? [];
    return lines.filter((l) => import_re.test(l));
}

function createOneImportLine(line) {
    const importMatch = import_re.exec(line);
    if (!importMatch) {
        throw new Error("How did an unmatchable line get here?");
    }
    const importContent = importMatch[1];
    if (!importContent) {
        throw new Error("How did an unmatchable line get here!?");
    }
    return `    '${importContent}";',`;
}

const isSourceFile = /\.ts$/;

function getTheSourceFiles() {
    return Array.from(walkFilesystem(path.join(__dirname, "..", "src"))).filter((path) =>
        isSourceFile.test(path),
    );
}

function getTheImportLines(importPaths) {
    const importLines = importPaths.reduce(
        (acc, path) => [...acc, extractImportLinesFromFile(path)].flat(),
        [],
    );
    const uniqueImportLines = new Set(importLines);
    const sortedImportLines = Array.from(uniqueImportLines.keys());
    sortedImportLines.sort();
    return sortedImportLines;
}

const importPaths = getTheSourceFiles();
const importLines = getTheImportLines(importPaths);

const outputFile = `// THIS IS A GENERATED FILE.  DO NOT EDIT BY HAND.
//
// This file is generated by the build-storybook-import-maps script in the UI's base directory.
// This is a *hack* to work around an inconsistency in the way rollup, vite, and storybook
// import CSS modules.
//
// Sometime around 2030 or so, the Javascript community may finally get its collective act together
// and we'll have one unified way of doing this.  I can only hope.

const rawCssImportMaps = [
${importLines.map(createOneImportLine).join("\n")}
];

const cssImportMaps = rawCssImportMaps.reduce(
    (acc, line) => ({ ...acc, [line]: line.replace(/\\.css/, ".css?inline") }),
    {},
);

export { cssImportMaps };
export default cssImportMaps;
`;

fs.writeFileSync(path.join(__dirname, "..", ".storybook", "css-import-maps.ts"), outputFile, {
    encoding: "utf8",
    flag: "w",
});
