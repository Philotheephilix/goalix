// Game utility functions

/**
 * Validates if a game code has the correct format
 * @param gameCode - The game code to validate
 * @returns true if valid, false otherwise
 */
export function isValidGameCode(gameCode: string): boolean {
  return Boolean(gameCode && gameCode.length === 66 && gameCode.startsWith('0x') && /^0x[a-fA-F0-9]{64}$/.test(gameCode));
}

/**
 * Formats a game code for display (truncates if too long)
 * @param gameCode - The game code to format
 * @param maxLength - Maximum length before truncation
 * @returns Formatted game code
 */
export function formatGameCode(gameCode: string, maxLength: number = 20): string {
  if (!gameCode) return '';
  
  if (gameCode.length <= maxLength) {
    return gameCode;
  }
  
  return `${gameCode.substring(0, 10)}...${gameCode.substring(gameCode.length - 8)}`;
}

/**
 * Copies text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Generates a sample game code for testing (not a real game code)
 * @returns A sample game code string
 */
export function generateSampleGameCode(): string {
  return '0x' + 'a'.repeat(64);
}

/**
 * Extracts game code from various formats
 * @param input - Input that might contain a game code
 * @returns The extracted game code or null
 */
export function extractGameCode(input: string): string | null {
  // Remove whitespace and common prefixes
  const cleaned = input.trim().replace(/^(game|code|id):\s*/i, '');
  
  // Check if it's already a valid game code
  if (isValidGameCode(cleaned)) {
    return cleaned;
  }
  
  // Try to find a game code pattern in the input
  const gameCodeMatch = cleaned.match(/0x[a-fA-F0-9]{64}/);
  if (gameCodeMatch) {
    return gameCodeMatch[0];
  }
  
  return null;
} 