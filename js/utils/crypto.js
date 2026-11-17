// js/utils/crypto.js

/**
 * Simple mock hash function for frontend-only application.
 * In a real application, you should use bcrypt or Argon2 on the backend.
 * @param {string} string
 * @returns {string} hashed string
 */
export function hashPassword(string) {
    if (!string) return '';
    
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        let char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Return a hex representation + a simple salt to obscure it a bit
    return 'h_' + Math.abs(hash).toString(16) + btoa(string).substring(0, 4);
}
