import { LogEntry } from './logStore';

// Define the types of search terms
type SearchTermType = 'KEY_VALUE' | 'WILDCARD' | 'NEGATION' | 'TEXT';

// Interface for a parsed search term
interface SearchTerm {
  type: SearchTermType;
  key?: string;
  value: string;
  negate: boolean;
}

/**
 * Parse a search query into structured search terms
 * Supports:
 * - key:"value" (exact match)
 * - key:*value* (wildcard/contains)
 * - -key:value (negation)
 * - "value" (plain text search)
 * - "value1" "value2" (multiple text search)
 */
export function parseSearchQuery(query: string): SearchTerm[] {
  if (!query.trim()) {
    return [];
  }

  const terms: SearchTerm[] = [];
  let currentPosition = 0;
  const queryLength = query.length;

  while (currentPosition < queryLength) {
    // Skip whitespace
    while (currentPosition < queryLength && query[currentPosition] === ' ') {
      currentPosition++;
    }

    if (currentPosition >= queryLength) {
      break;
    }

    // Check if this is a negation term
    const isNegation = query[currentPosition] === '-';
    if (isNegation) {
      currentPosition++;
    }

    // Check if this is a key:value term or a plain text term
    let colonPosition = -1;
    let keyStart = currentPosition;
    
    // Look for a colon that's not inside quotes
    let insideQuotes = false;
    for (let i = currentPosition; i < queryLength; i++) {
      if (query[i] === '"') {
        insideQuotes = !insideQuotes;
      } else if (query[i] === ':' && !insideQuotes) {
        colonPosition = i;
        break;
      } else if (query[i] === ' ' && !insideQuotes) {
        break;
      }
    }

    if (colonPosition > -1) {
      // This is a key:value term
      const key = query.substring(keyStart, colonPosition).trim();
      currentPosition = colonPosition + 1;

      // Extract the value (which might be quoted)
      let value = '';
      let isWildcard = false;

      // Check if the value starts with a quote
      if (currentPosition < queryLength && query[currentPosition] === '"') {
        // Extract quoted value
        currentPosition++; // Skip opening quote
        const valueStart = currentPosition;
        
        // Find closing quote
        while (currentPosition < queryLength && query[currentPosition] !== '"') {
          currentPosition++;
        }
        
        value = query.substring(valueStart, currentPosition);
        
        if (currentPosition < queryLength) {
          currentPosition++; // Skip closing quote
        }
      } else if (currentPosition < queryLength && query[currentPosition] === '*') {
        // This is a wildcard search
        isWildcard = true;
        currentPosition++; // Skip opening asterisk
        const valueStart = currentPosition;
        
        // Find the end of the value (space or end of string)
        while (currentPosition < queryLength && 
               query[currentPosition] !== ' ' && 
               query[currentPosition] !== '*') {
          currentPosition++;
        }
        
        value = query.substring(valueStart, currentPosition);
        
        // Check for closing asterisk
        if (currentPosition < queryLength && query[currentPosition] === '*') {
          currentPosition++; // Skip closing asterisk
        } else {
          // If no closing asterisk, treat as prefix search
          isWildcard = false;
          value = query.substring(valueStart - 1, currentPosition);
        }
      } else {
        // Extract non-quoted value until space or end
        const valueStart = currentPosition;
        
        while (currentPosition < queryLength && query[currentPosition] !== ' ') {
          currentPosition++;
        }
        
        value = query.substring(valueStart, currentPosition);
      }

      terms.push({
        type: isWildcard ? 'WILDCARD' : 'KEY_VALUE',
        key,
        value,
        negate: isNegation
      });
    } else {
      // This is a plain text search term
      let value = '';
      
      // Check if it starts with a quote
      if (currentPosition < queryLength && query[currentPosition] === '"') {
        // Extract quoted value
        currentPosition++; // Skip opening quote
        const valueStart = currentPosition;
        
        // Find closing quote
        while (currentPosition < queryLength && query[currentPosition] !== '"') {
          currentPosition++;
        }
        
        value = query.substring(valueStart, currentPosition);
        
        if (currentPosition < queryLength) {
          currentPosition++; // Skip closing quote
        }
      } else {
        // Extract non-quoted value until space or end
        const valueStart = currentPosition;
        
        while (currentPosition < queryLength && query[currentPosition] !== ' ') {
          currentPosition++;
        }
        
        value = query.substring(valueStart, currentPosition);
      }

      terms.push({
        type: 'TEXT',
        value,
        negate: isNegation
      });
    }
  }

  return terms;
}

/**
 * Filter logs based on the parsed search terms
 */
export function filterLogsBySearchTerms(logs: LogEntry[], searchTerms: SearchTerm[]): LogEntry[] {
  if (searchTerms.length === 0) {
    return logs;
  }

  return logs.filter(log => {
    // Check each search term against the log
    for (const term of searchTerms) {
      let matches = false;

      if (term.type === 'KEY_VALUE' && term.key) {
        // For key:value terms, check if the log has the key and if the value matches
        const logValue = log[term.key];
        if (logValue !== undefined) {
          const logValueStr = String(logValue).toLowerCase();
          const termValueLower = term.value.toLowerCase();
          matches = logValueStr === termValueLower;
        }
      } else if (term.type === 'WILDCARD' && term.key) {
        // For key:*value* terms, check if the log has the key and if the value is contained
        const logValue = log[term.key];
        if (logValue !== undefined) {
          const logValueStr = String(logValue).toLowerCase();
          const termValueLower = term.value.toLowerCase();
          matches = logValueStr.includes(termValueLower);
        }
      } else if (term.type === 'TEXT') {
        // For plain text terms, check if any field contains the value
        const termValueLower = term.value.toLowerCase();
        
        // Check in all string fields
        for (const [key, value] of Object.entries(log)) {
          if (typeof value === 'string') {
            if (value.toLowerCase().includes(termValueLower)) {
              matches = true;
              break;
            }
          } else if (typeof value === 'object' && value !== null) {
            // For object values, check in the stringified version
            const stringValue = JSON.stringify(value).toLowerCase();
            if (stringValue.includes(termValueLower)) {
              matches = true;
              break;
            }
          }
        }
      }

      // If this is a negation term, invert the match
      if (term.negate) {
        matches = !matches;
      }

      // If any term doesn't match, exclude the log
      if (!matches) {
        return false;
      }
    }

    // If all terms match, include the log
    return true;
  });
}

/**
 * Main function to filter logs by a search query
 */
export function filterLogsByQuery(logs: LogEntry[], query: string): LogEntry[] {
  if (!query.trim()) {
    return logs;
  }

  const searchTerms = parseSearchQuery(query);
  return filterLogsBySearchTerms(logs, searchTerms);
}