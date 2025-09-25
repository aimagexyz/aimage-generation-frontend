/**
 * Simple utilities for PDF export
 * KISS: Basic helper functions
 */

/**
 * Format timestamp to MM:SS format
 * KISS: Simple time formatting
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format date to readable string
 * KISS: Simple date formatting
 */
export function formatDate(dateString: string): string {
  if (!dateString) {
    return '-';
  }
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
