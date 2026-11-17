// js/services/syncService.js
// Real-time Auto-Sync and Auto-Polling Service for Digital RW
import { getApiUrl, getDatabaseUrl, getDbUrl } from './apiClient.js';

let pollingTimer = null;
let lastSyncSignature = '';
let isFetching = false;

export { getDatabaseUrl, getDbUrl };

export const startAutoSync = (onDataUpdated) => {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }

    const fetchLive = async () => {
        // Proteksi visibilitas tab: Jangan lakukan polling jika tab sedang tidak aktif (di background)
        if (typeof document !== 'undefined' && document.hidden) return;
        if (isFetching) return;
        isFetching = true;

        try {
            const targetUrl = typeof getDbUrl === 'function' ? getDbUrl() : getDatabaseUrl();
            const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (response.ok) {
                const liveData = await response.json();
                if (liveData && typeof liveData === 'object') {
                    // Hitung signature komprehensif untuk mendeteksi perubahan data secara presisi
                    const pelayananSig = Array.isArray(liveData.pelayanan) 
                        ? liveData.pelayanan.map(p => `${p.id}:${p.status || ''}:${p.tanggal_selesai || ''}`).join(';') 
                        : '';
                    const notifSig = Array.isArray(liveData.notifikasi) 
                        ? liveData.notifikasi.slice(0, 15).map(n => `${n.id}:${n.is_read || n.isRead ? 1 : 0}`).join(';') 
                        : '';
                    const pengaduanSig = Array.isArray(liveData.pengaduan) 
                        ? liveData.pengaduan.map(p => `${p.id}:${p.status || ''}`).join(';') 
                        : '';
                    const pengumumanSig = Array.isArray(liveData.pengumuman) 
                        ? liveData.pengumuman.slice(0, 5).map(p => `${p.id}:${p.status_publikasi || ''}`).join(';') 
                        : '';
                    const kasSig = Array.isArray(liveData.kas) 
                        ? `${liveData.kas.length}:${liveData.kas[liveData.kas.length - 1]?.id || ''}` 
                        : '';

                    const currentSig = `${pelayananSig}|${notifSig}|${pengaduanSig}|${pengumumanSig}|${kasSig}`;

                    const rawDbCheck = typeof localStorage !== 'undefined' ? localStorage.getItem('rwdigital_db_v3') : null;
                    let currentDbCheck = {};
                    try { currentDbCheck = rawDbCheck ? JSON.parse(rawDbCheck) : {}; } catch (e) {}
                    const needsNotifHydration = !Array.isArray(currentDbCheck.notifikasi) || currentDbCheck.notifikasi.length === 0;

                    // HANYA proses data jika signature berubah (data baru terdeteksi) atau cache notifikasi lokal kosong
                    if (currentSig !== lastSyncSignature || needsNotifHydration) {
                        lastSyncSignature = currentSig;

                        // Update local storage collections
                        try {
                            const rawDb = localStorage.getItem('rwdigital_db_v3');
                            let currentDb = rawDb ? JSON.parse(rawDb) : {};
                            const merged = { ...currentDb, ...liveData };

                            // Pertahankan data users penting jika ada di local session
                            if (Array.isArray(liveData.users) && Array.isArray(currentDb.users)) {
                                merged.users = liveData.users.map(u => {
                                    const ex = currentDb.users.find(cu => cu.id === u.id || cu.username === u.username);
                                    return { ...u, password: u.password || ex?.password || 'h_4889ba9bcGFz' };
                                });
                            }

                            // Safely merge notifikasi collection: combine liveData and local items preserving read flags
                            if (Array.isArray(liveData.notifikasi) && liveData.notifikasi.length > 0) {
                                const backendNotifs = liveData.notifikasi;
                                const localNotifs = Array.isArray(currentDb.notifikasi) ? currentDb.notifikasi : [];
                                const notifMap = new Map();

                                backendNotifs.forEach(n => {
                                    if (n && n.id) notifMap.set(n.id, n);
                                });

                                localNotifs.forEach(n => {
                                    if (n && n.id) {
                                        if (notifMap.has(n.id)) {
                                            const bNotif = notifMap.get(n.id);
                                            const isRead = Boolean(n.isRead || n.is_read || bNotif.isRead || bNotif.is_read);
                                            notifMap.set(n.id, { ...bNotif, ...n, isRead, is_read: isRead });
                                        } else {
                                            notifMap.set(n.id, n);
                                        }
                                    }
                                });

                                const mergedNotifs = Array.from(notifMap.values());
                                mergedNotifs.sort((a, b) => {
                                    const timeA = new Date(a.createdAt || a.created_at || a.waktu || a.tanggal || 0).getTime();
                                    const timeB = new Date(b.createdAt || b.created_at || b.waktu || b.tanggal || 0).getTime();
                                    return timeB - timeA;
                                });
                                merged.notifikasi = mergedNotifs;
                            } else if (Array.isArray(currentDb.notifikasi) && currentDb.notifikasi.length > 0) {
                                merged.notifikasi = currentDb.notifikasi;
                            }

                            localStorage.setItem('rwdigital_db_v3', JSON.stringify(merged));
                            if (Array.isArray(liveData.pengumuman)) {
                                localStorage.setItem('pengumuman', JSON.stringify(liveData.pengumuman));
                            }
                            if (Array.isArray(liveData.pengaduan)) {
                                localStorage.setItem('pengaduan', JSON.stringify(liveData.pengaduan));
                            }
                            if (Array.isArray(merged.notifikasi) && merged.notifikasi.length > 0) {
                                localStorage.setItem('notifikasi', JSON.stringify(merged.notifikasi));
                            }
                        } catch (e) {
                            console.warn('[AutoSync] LocalStorage merge warning:', e);
                        }

                        // Broadcast event ke seluruh UI komponen yang sedang aktif
                        window.dispatchEvent(new CustomEvent('db:synced', {
                            detail: { database: liveData, source: 'auto-sync' }
                        }));

                        if (typeof onDataUpdated === 'function') {
                            onDataUpdated(liveData);
                        }
                    }
                }
            }
        } catch (err) {
            // Diamkan error jika hanya network throttle sementara
        } finally {
            isFetching = false;
        }
    };

    // Eksekusi langsung sekali saat awal jika tab sedang aktif
    if (typeof document === 'undefined' || !document.hidden) {
        fetchLive();
    }

    // Jalankan polling setiap 15 detik (15000ms) secara otomatis agar tidak membebani main thread
    pollingTimer = setInterval(fetchLive, 15000);
};

export const stopAutoSync = () => {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
};

export const resetSyncSignature = () => {
    lastSyncSignature = '';
};

// Cek sinkronisasi langsung ketika pengguna membuka kembali tab
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && pollingTimer) {
            startAutoSync();
        }
    });
}

