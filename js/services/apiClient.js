// js/services/apiClient.js
// Universal API client for Digital RW backend (works with Apache port 80 & local dev server)
import { getCurrentUser } from '../models/User.js';

export function getDbUrl() {
    if (typeof window !== 'undefined' && window.location) {
        // Jika diakses via subfolder Apache (http://localhost/project%20RPL/...)
        const path = window.location.pathname;
        if (path.includes('project')) {
            const rootFolder = path.substring(0, path.indexOf('/', 1) + 1);
            return `${rootFolder}api/database.json`;
        }
        // Jika diakses via root (http://localhost:3000/...)
        return '/api/database.json';
    }
    return 'api/database.json';
}

export const getDatabaseUrl = getDbUrl;

export function getApiUrl(endpoint = '') {
    // Bersihkan endpoint dari slash depan jika ada
    const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\//, '');

    if (typeof window !== 'undefined' && window.location) {
        // Jika dibuka di port 3000 (npx serve / root development)
        if (window.location.port === '3000') {
            return `api/${cleanEndpoint}`;
        }

        // Jika dibuka lewat Apache Laragon (localhost/project%20RPL/ atau sejenisnya)
        const path = window.location.pathname;
        const projectFolderMatch = path.match(/^\/([^\/]+)\//);
        const baseFolder = projectFolderMatch ? projectFolderMatch[0] : '/';

        return `${baseFolder}api/${cleanEndpoint}`;
    }
    return `api/${cleanEndpoint}`;
}

function getApiBaseCandidates() {
    const candidates = [];
    if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        const port = window.location.port;
        const pathname = window.location.pathname;
        const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);

        // Jika dev server diakses dari port 3000 atau port dev lainnya
        if (port === '3000') {
            candidates.push(`${origin}/api/`);
            candidates.push(`api/`);
            candidates.push("http://localhost/project%20RPL/api/");
            candidates.push("http://127.0.0.1/project%20RPL/api/");
        } else if (port && port !== '80' && port !== '443') {
            candidates.push("http://localhost/project%20RPL/api/");
            candidates.push("http://127.0.0.1/project%20RPL/api/");
            candidates.push(`${origin}${dir}api/`);
        }

        // 1. Relative to current path
        candidates.push(`${origin}${dir}api/`);
        // 2. Relative project RPL folder
        candidates.push(`${origin}/project%20RPL/api/`);
        // 3. Fallback to Apache Laragon / XAMPP port 80
        candidates.push("http://localhost/project%20RPL/api/");
        candidates.push("http://127.0.0.1/project%20RPL/api/");
    } else {
        candidates.push("http://localhost/project%20RPL/api/");
        candidates.push("http://127.0.0.1/project%20RPL/api/");
    }
    return [...new Set(candidates)];
}

export async function callBackendApi(endpointName, payload = {}, method = 'POST') {
    const user = getCurrentUser();
    const candidates = getApiBaseCandidates();

    // Normalize endpoint name: strip leading slash and optional 'api/' prefix
    let cleanEndpoint = endpointName.replace(/^\/?(api\/)?/, '');

    // Generate endpoint variants (e.g. users/:id -> users.php?id=:id, pengumuman/:id -> pengumuman.php?id=:id)
    const endpointVariants = [cleanEndpoint];
    const pengumumanMatch = cleanEndpoint.match(/^pengumuman\/([^/?]+)$/);
    if (pengumumanMatch) {
        endpointVariants.push(`pengumuman.php?id=${encodeURIComponent(pengumumanMatch[1])}`);
    }
    const usersMatch = cleanEndpoint.match(/^users\/([^/?]+)$/);
    if (usersMatch) {
        endpointVariants.push(`users.php?id=${encodeURIComponent(usersMatch[1])}`);
    }
    const wargaMatch = cleanEndpoint.match(/^warga\/([^/?]+)$/);
    if (wargaMatch) {
        endpointVariants.push(`warga.php?nik=${encodeURIComponent(wargaMatch[1])}`);
    }

    // Augment payload with userContext for session & role verification
    const enrichedPayload = {
        ...payload,
        userContext: user ? {
            id: user.id,
            username: user.username,
            name: user.nama || user.name,
            role: user.role,
            rt: user.rt,
            rw: user.rw,
            nik: user.nik
        } : null
    };

    let lastError = null;

    for (const base of candidates) {
        for (const ep of endpointVariants) {
            let fullUrl = `${base}${ep}`;

            if (method === 'GET') {
                const queryParams = new URLSearchParams();
                if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
                    for (const [key, val] of Object.entries(payload)) {
                        if (val !== undefined && val !== null) {
                            queryParams.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
                        }
                    }
                }
                // Anti-cache busting timestamp on all GET requests to prevent HTTP 304
                queryParams.set('_t', String(Date.now()));
                const qs = queryParams.toString();
                if (qs) {
                    fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
                }
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout to allow external WA & Email SMTP delivery

                const options = {
                    method: method,
                    cache: 'no-store', // Strict anti-cache fetch to prevent HTTP 304 Not Modified
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    signal: controller.signal
                };

                if (user) {
                    options.headers['X-User-Role'] = user.role;
                    options.headers['X-User-Id'] = String(user.id || '');
                    if (user.rt !== undefined && user.rt !== null) {
                        options.headers['X-User-RT'] = String(user.rt);
                    }
                    if (user.nik) {
                        options.headers['X-User-NIK'] = String(user.nik);
                    }
                }

                if (method !== 'GET') {
                    options.body = JSON.stringify(enrichedPayload);
                }

                const response = await fetch(fullUrl, options);
                clearTimeout(timeoutId);

                // If response is valid JSON from PHP API
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    if (response.ok) {
                        return data;
                    } else {
                        // Application level error returned by PHP backend
                        throw new Error(data.message || data.error || `HTTP ${response.status}: Permintaan ditolak.`);
                    }
                }

                // Jika server (misal port 3000) mengembalikan non-JSON (seperti raw PHP text atau HTML),
                // lanjutkan ke candidate berikutnya (Apache port 80)!
                continue;
            } catch (err) {
                // If it's a domain/connection error on this specific candidate, continue to next
                if (err.name === 'AbortError') {
                    continue;
                }
                if (err.message && (err.message.startsWith('HTTP') || err.message.includes('Akses ditolak') || err.message.includes('wajib') || err.message.includes('tidak ditemukan'))) {
                    // Legitimate error from backend
                    throw err;
                }
                lastError = err;
            }
        }
    }

    if (lastError) {
        console.warn('Backend API call fallback notice:', lastError);
    }
    return null;
}
