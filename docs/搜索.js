function normalizeSearch(value) {
 return String(value ?? '').normalize('NFKC').toLowerCase().trim();
}

function matchesSearch(query, ...fields) {
 const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
 const text = fields.map(normalizeSearch).join(' ');
 return terms.every(term => text.includes(term));
}

