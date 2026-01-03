"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeImageUrl = normalizeImageUrl;
/**
 * Normalizes image URLs to ensure they are relative paths.
 * - If the URL is absolute (starts with http:// or https://), extracts the path portion
 * - If the URL is already a relative path (starts with /), returns it as-is
 * - If the URL is null or empty, returns null
 *
 * This ensures that image URLs are always relative paths that can be served
 * through the same origin (via nginx proxy or static file serving).
 */
function normalizeImageUrl(url) {
    if (!url || url.trim() === '') {
        return null;
    }
    const trimmed = url.trim();
    // If it's an absolute URL, extract just the path
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const urlObj = new URL(trimmed);
            return urlObj.pathname;
        }
        catch (e) {
            // If URL parsing fails, try to extract path manually
            const pathMatch = trimmed.match(/https?:\/\/[^\/]+(\/.*)/);
            if (pathMatch && pathMatch[1]) {
                return pathMatch[1];
            }
            // Fallback: return as-is if we can't parse it
            return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
        }
    }
    // If it's already a relative path, return as-is
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    // If it doesn't start with /, assume it's a relative path and prepend /
    return '/' + trimmed;
}
