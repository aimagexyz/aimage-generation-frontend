import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to check for valid URL
export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (error) {
    // Intentional: The URL constructor throws an error for invalid URLs.
    // This catch block handles that expected behavior by returning false.
    if (import.meta.env.DEV) {
      console.warn(`Attempted to validate an invalid URL: ${string}`, error);
    }
    return false;
  }
};
