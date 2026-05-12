const decodeHtmlEntities = (value) =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");

export const canonicalizePayload = (input = "") => {
  let value = String(input);
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(value.replace(/\+/g, " "));
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return decodeHtmlEntities(value)
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const RULES = [
  {
    id: "sql-commented-union",
    category: "sqli",
    severity: 0.95,
    pattern: /union(?:\/\*.*?\*\/|\s)+select/i,
  },
  {
    id: "sql-boolean-tautology",
    category: "sqli",
    severity: 0.9,
    pattern: /(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  },
  {
    id: "sql-stacked-query",
    category: "sqli",
    severity: 0.85,
    pattern: /;\s*(drop|alter|truncate|delete|insert|update)\b/i,
  },
  {
    id: "xss-script-tag",
    category: "xss",
    severity: 0.95,
    pattern: /<\s*script\b/i,
  },
  {
    id: "xss-event-handler",
    category: "xss",
    severity: 0.85,
    pattern: /\bon[a-z]{3,}\s*=/i,
  },
  {
    id: "xss-javascript-url",
    category: "xss",
    severity: 0.8,
    pattern: /javascript\s*:/i,
  },
  {
    id: "path-traversal",
    category: "lfi",
    severity: 0.85,
    pattern: /(?:\.\.\/|\.\.\\|%2e%2e)/i,
  },
  {
    id: "sensitive-file-read",
    category: "lfi",
    severity: 0.8,
    pattern: /(?:\/etc\/passwd|win\.ini|boot\.ini)/i,
  },
  {
    id: "shell-command",
    category: "rce",
    severity: 0.9,
    pattern: /(?:\||;|&&|\$\()\s*(?:cat|curl|wget|bash|sh|powershell|cmd|whoami|id)\b/i,
  },
];

export const evaluateWafRules = (input = "") => {
  const canonical = canonicalizePayload(input);
  const matches = RULES.filter((rule) => rule.pattern.test(canonical)).map(
    ({ id, category, severity }) => ({ id, category, severity })
  );
  const score = matches.reduce((max, rule) => Math.max(max, rule.severity), 0);

  return {
    score,
    matched: matches.length > 0,
    matches,
    canonicalLength: canonical.length,
  };
};
