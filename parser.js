(function () {
    function detectEncoding(uint8Array) {
        if (uint8Array.length >= 2) {
            const b0 = uint8Array[0];
            const b1 = uint8Array[1];
            if (b0 === 0xff && b1 === 0xfe) {
                return 'utf-16le';
            }
            if (b0 === 0xfe && b1 === 0xff) {
                return 'utf-16be';
            }
        }
        if (uint8Array.length >= 3) {
            if (uint8Array[0] === 0xef && uint8Array[1] === 0xbb && uint8Array[2] === 0xbf) {
                return 'utf-8';
            }
        }
        let zeroCount = 0;
        for (let i = 0; i < Math.min(uint8Array.length, 200); i += 1) {
            if (uint8Array[i] === 0) {
                zeroCount += 1;
            }
        }
        return zeroCount > 10 ? 'utf-16le' : 'utf-8';
    }

    function decodeArrayBuffer(arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        const encoding = detectEncoding(uint8Array);
        return new TextDecoder(encoding).decode(uint8Array);
    }

    function parseDelimitedText(text, delimiter) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            const next = text[index + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (!inQuotes && char === delimiter) {
                row.push(cell);
                cell = '';
                continue;
            }

            if (!inQuotes && (char === '\n' || char === '\r')) {
                if (char === '\r' && next === '\n') {
                    index += 1;
                }
                row.push(cell);
                cell = '';
                if (row.some((item) => String(item).trim() !== '')) {
                    rows.push(row);
                }
                row = [];
                continue;
            }

            cell += char;
        }

        row.push(cell);
        if (row.some((item) => String(item).trim() !== '')) {
            rows.push(row);
        }
        return rows;
    }

    function rowsToObjects(parsedRows) {
        if (!parsedRows.length) {
            return {
                columns: [],
                rows: []
            };
        }
        const columns = parsedRows[0].map((item) => String(item).trim().replace(/^\uFEFF/, ''));
        const rows = parsedRows.slice(1).map((cells) => {
            const row = {};
            columns.forEach((column, index) => {
                row[column] = cells[index] === undefined ? '' : cells[index];
            });
            return row;
        });
        return { columns, rows };
    }

    async function parseFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const text = decodeArrayBuffer(arrayBuffer);
        const parsedRows = parseDelimitedText(text, '\t');
        const table = rowsToObjects(parsedRows);
        return Object.assign({ rawText: text }, table);
    }

    window.ABToolParser = {
        parseFile
    };
})();
