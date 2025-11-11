import re

def tokenize_payload(payload: str):
    """
    Tokenizes payload into lowercased words, symbols, and operators.
    Example:
      "SELECT * FROM users WHERE 1=1"
    → ['select', '*', 'from', 'users', 'where', '1', '=', '1']
    """
    try:
        tokens = re.findall(r"[A-Za-z0-9]+|[^\sA-Za-z0-9]", payload)
        tokens = [t.lower() for t in tokens]
        return tokens
    except Exception:
        return []
