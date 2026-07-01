const decodeHtmlEntities = (value) =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");

const flattenJson = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);

  const parts = [];
  const visit = (item) => {
    if (item === null || item === undefined) return;
    if (typeof item !== "object") {
      parts.push(String(item));
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      parts.push(String(key));
      visit(child);
    }
  };
  visit(value);
  return parts.join(" ");
};

const decodeUnicodeEscapes = (value) =>
  value.replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

const decodeBase64LikeText = (value) => {
  const chunks = value.match(/\b[A-Za-z0-9+/]{16,}={0,2}\b/g) || [];
  const decoded = chunks
    .slice(0, 5)
    .map((chunk) => {
      try {
        const text = Buffer.from(chunk, "base64").toString("utf8");
        return /[\x09\x0a\x0d\x20-\x7e]/.test(text) ? text : "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return decoded.length ? `${value} ${decoded.join(" ")}` : value;
};

export const canonicalizePayload = (input = "") => {
  let value = typeof input === "object" ? flattenJson(input) : String(input);
  value = decodeUnicodeEscapes(value);

  for (let i = 0; i < 5; i += 1) {
    try {
      const decoded = decodeURIComponent(value.replace(/\+/g, " "));
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }

  value = decodeBase64LikeText(decodeHtmlEntities(value));

  return value
    .replace(/\u0000/g, "")
    .replace(/\/\*![\s\S]*?\*\//g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/#[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const RULES = [
  {
    id: "sql-commented-union",
    category: "sqli",
    severity: 0.95,
    reason: "SQL injection keyword chain: UNION SELECT",
    pattern: /union(?:\/\*.*?\*\/|\s)+select/i,
  },
  {
    id: "sql-union-select",
    category: "sqli",
    severity: 0.95,
    reason: "SQL injection keyword chain: UNION SELECT",
    pattern: /\bunion\s+(?:all\s+)?select\b/i,
  },
  {
    id: "sql-boolean-tautology",
    category: "sqli",
    severity: 0.9,
    reason: "SQL injection tautology condition",
    pattern: /(?:or|and)\s+['"]?[\w.-]+['"]?\s*=\s*['"]?[\w.-]+['"]?/i,
  },
  {
    id: "sql-stacked-query",
    category: "sqli",
    severity: 0.85,
    reason: "Stacked SQL statement with destructive keyword",
    pattern: /;\s*(drop|alter|truncate|delete|insert|update)\b/i,
  },
  {
    id: "sql-time-delay",
    category: "sqli",
    severity: 0.9,
    reason: "Time-based SQL injection function",
    pattern: /\b(sleep|benchmark|pg_sleep|waitfor\s+delay)\s*\(/i,
  },
  {
    id: "xss-script-tag",
    category: "xss",
    severity: 0.95,
    reason: "Executable script tag",
    pattern: /<\s*script\b/i,
  },
  {
    id: "xss-event-handler",
    category: "xss",
    severity: 0.85,
    reason: "HTML event handler execution",
    pattern: /\bon[a-z]{3,}\s*=/i,
  },
  {
    id: "xss-javascript-url",
    category: "xss",
    severity: 0.8,
    reason: "javascript: URL execution",
    pattern: /javascript\s*:/i,
  },
  {
    id: "xss-dangerous-tags",
    category: "xss",
    severity: 0.85,
    reason: "Dangerous HTML tag often used for XSS",
    pattern: /<\s*(iframe|object|embed|svg|img|body|math)\b/i,
  },
  {
    id: "path-traversal",
    category: "lfi",
    severity: 0.85,
    reason: "Directory traversal sequence",
    pattern: /(?:\.\.\/|\.\.\\|%2e%2e)/i,
  },
  {
    id: "sensitive-file-read",
    category: "lfi",
    severity: 0.8,
    reason: "Sensitive local file path",
    pattern: /(?:\/etc\/passwd|win\.ini|boot\.ini)/i,
  },
  {
    id: "shell-command",
    category: "rce",
    severity: 0.9,
    reason: "Shell command execution pattern",
    pattern: /(?:\||;|&&|\$\()\s*(?:cat|curl|wget|bash|sh|powershell|cmd|whoami|id)\b/i,
  },
  {
    id: "ssrf-cloud-metadata",
    category: "ssrf",
    severity: 0.95,
    reason: "Cloud metadata service access",
    pattern: /(?:169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200)/i,
  },
  {
    id: "ssrf-localhost",
    category: "ssrf",
    severity: 0.85,
    reason: "Local network URL fetch attempt",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|172\.(?:1[6-9]|2\d|3[0-1])\.|192\.168\.)/i,
  },
  {
    id: "nosql-operator",
    category: "nosqli",
    severity: 0.85,
    reason: "NoSQL query operator injection",
    pattern: /"\$(?:ne|gt|gte|lt|lte|regex|where|or|and)"\s*:/i,
  },
  {
    id: "ldap-filter-injection",
    category: "ldap",
    severity: 0.8,
    reason: "LDAP filter injection syntax",
    pattern: /\)\s*\(\s*\|\s*\([^)]*=\*/i,
  },
  {
    id: "template-expression",
    category: "ssti",
    severity: 0.8,
    reason: "Server-side template expression",
    pattern: /(?:\{\{.*?\}\}|\$\{.*?\})/i,
  },
  {
    id: "jndi-lookup",
    category: "rce",
    severity: 0.95,
    reason: "JNDI lookup payload",
    pattern: /\$\{\s*jndi\s*:\s*(?:ldap|rmi|dns|http)/i,
  },
  {
    id: "xxe-doctype-entity",
    category: "xxe",
    severity: 0.9,
    reason: "XML external entity declaration",
    pattern: /<!doctype\b[\s\S]*<!entity\b/i,
  },
  {
    id: "header-crlf-injection",
    category: "header-injection",
    severity: 0.8,
    reason: "CRLF header injection sequence",
    pattern: /\b(?:set-cookie|location|content-length|x-[\w-]+)\s*:/i,
  },
  {
    id: "open-redirect",
    category: "redirect",
    severity: 0.55,
    reason: "External redirect parameter",
    pattern: /\b(?:next|redirect|return|url|continue)=https?:\/\/(?!localhost|127\.0\.0\.1)/i,
  },
];

export const evaluateWafRules = (input = "") => {
  const canonical = canonicalizePayload(input);
  const matches = RULES.filter((rule) => rule.pattern.test(canonical)).map(
    ({ id, category, severity, reason }) => ({ id, category, severity, reason })
  );
  const score = matches.reduce((max, rule) => Math.max(max, rule.severity), 0);

  return {
    score,
    matched: matches.length > 0,
    matches,
    reasons: matches.map((match) => match.reason),
    canonicalLength: canonical.length,
  };
};
