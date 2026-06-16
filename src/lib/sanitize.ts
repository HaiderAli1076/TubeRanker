import { ValidationError } from "./errors";

// Patterns to detect common prompt injection attempts
const INJECTION_PATTERNS = [
  /\bignore\s+(?:previous|all|the)\b/i,
  /\bsystem\s+instruction\b/i,
  /\byou\s+are\s+now\b/i,
  /\bnew\s+prompt\b/i,
  /\btranslate\s+(?:this|the)\s+above\b/i,
  /\[system\]/i,
  /<\/system>/i,
  /\bprompt\s+injection\b/i,
  /\bacting\s+as\s+a\b/i,
  /\bdo\s+not\s+follow\b/i,
];

/**
 * Sanitizes input text, shielding the AI models from prompt injections.
 * Throws a ValidationError if a suspicious pattern matches.
 */
export function sanitizeInput(input: string, field = "input"): string {
  const trimmed = input.trim();
  
  if (!trimmed) {
    throw new ValidationError("Input cannot be empty", field);
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new ValidationError("Invalid or suspicious input detected", field);
    }
  }

  return trimmed;
}
