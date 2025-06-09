import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const slugifyUsername = (username: string): string => {
  if (!username) return 'myprofile'; // Handle null, undefined, or empty string input
  const slug = username
    .toString() // Ensure it's a string
    .trim() // Remove leading/trailing whitespace
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove all non-alphanumeric characters except hyphens
    .replace(/--+/g, '-'); // Replace multiple hyphens with a single one
  return slug || 'myprofile'; // Fallback if slug becomes empty
};
