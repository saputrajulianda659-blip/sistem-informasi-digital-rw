import { getCollection, saveCollection } from '../utils/db.js';
import { getCurrentUser, ROLES } from './User.js';
import { callBackendApi } from '../services/apiClient.js';
import { sendWhatsAppNotification } from '../services/notificationService.js';

export const KATEGORI_NOTIFIKASI = {
    PENGUMUMAN: 'Pengumuman',
    KEGIATAN: 'Kegiatan',
    PELAYANAN: 'Pelayanan',
    PENGADUAN: 'Pengaduan',
    KAS: 'Kas',
    DARURAT: 'Darurat'
};

// Dispatch multi-channel notification (In-App, Email, WhatsApp)
export async function createNotifikasi(targetUserIdOrOptions, pesanText = '', type = 'info', link = null) {
    try {
        let options = {};

        // Support both legacy signature: createNotifikasi(userId, pesan, type, link)
        // and modern options object: createNotifikasi({ recipientId, judul, pesan, kategori, type, link, channels, ... })
        if (typeof targetUserIdOrOptions === 'object' && targetUserIdOrOptions !== null) {
            options = targetUserIdOrOptions;
        } else {
            options = {
                recipientId: targetUserIdOrOptions,
                pesan: pesanText,
                type: type,
                link: link,
                judul: 'Pemberitahuan Digital RW',
                kategori: KATEGORI_NOTIFIKASI.PENGUMUMAN,
                channels: ['in_app', 'email', 'whatsapp']
            };
        }

        const notifikasi = getCollection('notifikasi') || [];
        const logs = getCollection('notification_logs') || [];

        const notifId = 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const eventId = options.eventId || ('EVT-' + Date.now());
        const judul = options.judul || 'Pemberitahuan Digital RW';
        const pesan = options.pesan || '';
        const kategori = options.kategori || KATEGORI_NOTIFIKASI.PENGUMUMAN;
        const notifType = options.type || 'info';
        const notifLink = options.link || null;
        const priority = (kategori === KATEGORI_NOTIFIKASI.DARURAT || options.priority === 'high') ? 'high' : 'normal';

        // 1. Create In-App Notification Record in Local Database
        const targetChannels = Array.isArray(options.channels)
            ? options.channels
            : (options.channel ? (options.channel === 'all' ? ['in_app', 'email', 'whatsapp'] : [options.channel]) : ['in_app']);

        const rawTargetRole = (options.target_role || options.targetRole || options.target || options.role || '').toLowerCase();
        let canonicalRole = 'all';
        if (rawTargetRole.includes('warga') || rawTargetRole === 'user') canonicalRole = 'warga';
        else if (rawTargetRole.includes('rt')) canonicalRole = 'rt';
        else if (rawTargetRole.includes('rw')) canonicalRole = 'rw';
        else if (rawTargetRole.includes('admin')) canonicalRole = 'super_admin';

        // Super Admin EXCLUSION from WhatsApp and Email
        const isSuperAdminTarget = canonicalRole === 'super_admin' || rawTargetRole.includes('admin') || options.recipientRole === 'Super Admin' || options.role === 'Super Admin';

        if (!options.channels || targetChannels.includes('in_app') || options.channel === 'in_app' || options.channel === 'all') {
            let resolvedUserId = options.userId || options.recipientId || options.target_id || 'all';
            let resolvedNik = options.nik || options.target_nik || options.targetNik || options.recipientNik || (options.target_id && String(options.target_id).length === 16 ? options.target_id : '');
            let resolvedUsername = options.username || options.recipient_username || '';
            let resolvedPemohon = options.pemohon || options.nama_pemohon || options.recipient_name || options.recipientName || options.nama || '';

            // Auto-enrich user identity if partially provided
            if (resolvedNik || (resolvedUserId && resolvedUserId !== 'all')) {
                const users = getCollection('users') || [];
                const matchedUser = users.find(u => 
                    (resolvedNik && u.nik === resolvedNik) || 
                    (resolvedUserId && String(u.id) === String(resolvedUserId)) ||
                    (resolvedUsername && u.username === resolvedUsername)
                );
                if (matchedUser) {
                    if (!resolvedNik && matchedUser.nik) resolvedNik = matchedUser.nik;
                    if ((!resolvedUserId || resolvedUserId === 'all') && matchedUser.id) resolvedUserId = matchedUser.id;
                    if (!resolvedUsername && matchedUser.username) resolvedUsername = matchedUser.username;
                    if (!resolvedPemohon && matchedUser.name) resolvedPemohon = matchedUser.name;
                }
            }

            const targetScope = options.targetScope || options.target_scope || options.scope || (resolvedNik ? 'personal' : 'broadcast');
            const nowIso = new Date().toISOString();
            const notifRtVal = options.targetRt || options.target_rt || (options.recipientRt ? String(options.recipientRt).padStart(2, '0') : '');
            const notifRwVal = options.targetRw || options.target_rw || '05';

            const newNotif = {
                id: notifId,
                target_role: canonicalRole, // 'warga' | 'rt' | 'rw' | 'super_admin' | 'all'
                targetRole: canonicalRole,
                target: canonicalRole,
                role: canonicalRole,
                targetScope: targetScope,
                target_scope: targetScope,
                scope: targetScope,
                target_nik: resolvedNik,
                nik: resolvedNik,
                target_rt: notifRtVal,
                targetRt: notifRtVal,
                target_rw: notifRwVal,
                targetRw: notifRwVal,
                judul: judul,
                pesan: pesan,
                kategori: kategori,
                type: notifType,
                link: notifLink,
                priority: priority,
                is_read: false,
                isRead: false,
                is_simulation: options.is_simulation || false,
                createdAt: nowIso,
                created_at: nowIso,
                waktu: nowIso,
                tanggal: nowIso,
                userId: resolvedUserId,
                username: resolvedUsername,
                nama: resolvedPemohon,
                pemohon: resolvedPemohon,
                nama_pemohon: resolvedPemohon
            };
            if (Array.isArray(notifikasi) && !options.skipInAppInsert) {
                const existingIndex = notifikasi.findIndex(n => n.id === notifId);
                if (existingIndex === -1) {
                    notifikasi.unshift(newNotif);
                    saveCollection('notifikasi', notifikasi);
                }
            }

            // Record in-app delivery log
            if (Array.isArray(logs)) {
                logs.unshift({
                    id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    notification_id: notifId,
                    event_id: eventId,
                    category: kategori,
                    channel: 'in_app',
                    recipient_id: options.recipientId || options.target_id || 'all',
                    recipient_name: options.recipient_name || options.recipientName || 'Warga',
                    recipient_target: 'In-App',
                    title: judul,
                    body: pesan,
                    status: 'sent',
                    attempts: 1,
                    max_retries: 3,
                    error_message: null,
                    created_at: new Date().toISOString(),
                    sent_at: new Date().toISOString()
                });
                saveCollection('notification_logs', logs);
            }
        }

        // 2. Direct WhatsApp Dispatch via Fonnte Service (API Token: 65G3LsBQrNkQLSV1F9Dc)
        // Super Admin STRICTLY EXCLUDED from receiving operational WhatsApp
        if (targetChannels.includes('whatsapp') && !isSuperAdminTarget) {
            let waTarget = options.recipient_phone || options.phone || '';
            const recipientName = options.recipient_name || options.recipientName || 'Warga';
            if (!waTarget) {
                const targetNik = options.recipientNik || (options.target_id && String(options.target_id).length === 16 ? options.target_id : (options.recipientId && String(options.recipientId).length === 16 ? options.recipientId : ''));
                if (targetNik) {
                    const wargaList = getCollection('warga') || [];
                    const w = wargaList.find(item => item && item.nik === targetNik);
                    if (w && w.no_hp && w.no_hp !== '-') {
                        waTarget = w.no_hp;
                    }
                }
            }
            if (waTarget && waTarget !== '-') {
                const waBody = `🔔 *[DIGITAL RW 05 - ${kategori.toUpperCase()}]*\n\n*${judul}*\n\n${pesan}` + (notifLink ? `\n\n🔗 Buka Aplikasi: ${notifLink}` : '') + `\n\n📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`;
                sendWhatsAppNotification(waTarget, waBody, {
                    recipientId: options.recipientId || options.target_id,
                    recipientName: recipientName,
                    title: judul,
                    category: kategori,
                    eventId: eventId,
                    is_simulation: options.is_simulation || false
                }).catch(err => console.warn('[Fonnte WhatsApp Dispatch]', err));
            }

            // Record WhatsApp log in local collection if not simulated
            if (Array.isArray(logs) && !options.is_simulation) {
                logs.unshift({
                    id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    notification_id: notifId,
                    event_id: eventId,
                    category: kategori,
                    channel: 'whatsapp',
                    recipient_id: options.recipientId || options.target_id || waTarget,
                    recipient_name: recipientName,
                    recipient_target: waTarget || '(kosong)',
                    title: judul,
                    body: pesan,
                    status: waTarget ? 'sent' : 'failed',
                    attempts: 1,
                    max_retries: 3,
                    error_message: waTarget ? null : 'Nomor HP tidak valid atau kosong',
                    created_at: new Date().toISOString(),
                    sent_at: waTarget ? new Date().toISOString() : null
                });
                saveCollection('notification_logs', logs);
            }
        }

        // 3. Email Channel Logging if active in local state
        // Super Admin STRICTLY EXCLUDED from receiving operational Email
        if (targetChannels.includes('email') && !isSuperAdminTarget && Array.isArray(logs)) {
            const recipientEmail = options.recipient_email || options.email || '';
            const recipientName = options.recipient_name || options.recipientName || 'Warga';
            logs.unshift({
                id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                notification_id: notifId,
                event_id: eventId,
                category: kategori,
                channel: 'email',
                recipient_id: options.recipientId || options.target_id || recipientEmail,
                recipient_name: recipientName,
                recipient_target: recipientEmail || 'maulanasaputra2187@gmail.com',
                title: judul,
                body: pesan,
                status: options.is_simulation ? 'simulated' : 'sent',
                attempts: 1,
                max_retries: options.is_simulation ? 0 : 3,
                error_message: options.is_simulation ? '[Mode Simulasi] Simulasi pengiriman email berhasil dicatat.' : null,
                created_at: new Date().toISOString(),
                sent_at: new Date().toISOString()
            });
            saveCollection('notification_logs', logs);
        }

        // 4. Synchronize with Backend Notification Engine (Handles Email SMTP & WhatsApp API)
        let backendResult = null;
        try {
            backendResult = await callBackendApi('notification.php', {
                action: 'send',
                judul: judul,
                pesan: pesan,
                kategori: kategori,
                type: notifType,
                link: notifLink,
                eventId: eventId,
                priority: priority,
                channels: targetChannels,
                target: options.target,
                targetRole: options.targetRole || options.target_role,
                target_role: options.targetRole || options.target_role,
                targetRt: options.targetRt || options.target_rt,
                target_rt: options.targetRt || options.target_rt,
                targetRw: options.targetRw || options.target_rw,
                target_rw: options.targetRw || options.target_rw,
                recipientId: options.recipientId || options.target_id,
                recipientNik: options.recipientNik,
                recipient_name: options.recipient_name || options.recipientName,
                recipient_email: options.recipient_email || options.email,
                recipient_phone: options.recipient_phone || options.phone,
                recipients: options.recipients,
                is_simulation: options.is_simulation || false
            });
        } catch (err) {
            console.warn('Backend notification dispatch error:', err.message);
            backendResult = { success: false, error: err.message };
        }

        return { notifId, backendResult };
    } catch (err) {
        console.error("Error creating notification:", err);
        return 'NOTIF-FALLBACK-' + Date.now();
    }
}

// Export named alias kirimNotifikasiMultiChannel expected by pages
export async function kirimNotifikasiMultiChannel(options = {}) {
    return await createNotifikasi(options);
}

export function getAllNotifikasi(userOrId = null) {
    try {
        const notifikasi = getCollection('notifikasi');
        if (!Array.isArray(notifikasi)) return [];

        let currentUser = userOrId;
        if (!currentUser || typeof currentUser !== 'object') {
            const currentSession = getCurrentUser();
            if (currentSession && (!userOrId || String(currentSession.id) === String(userOrId) || String(currentSession.nik) === String(userOrId))) {
                currentUser = currentSession;
            } else if (userOrId) {
                const allUsers = getCollection('users') || [];
                currentUser = allUsers.find(u => String(u.id) === String(userOrId) || String(u.nik) === String(userOrId) || u.username === String(userOrId)) || currentSession;
            } else {
                currentUser = currentSession;
            }
        }

        if (!currentUser) return notifikasi;

        const userRole = String(currentUser.role || '').toLowerCase();
        const userNik = currentUser.nik ? String(currentUser.nik).trim() : '';
        const userRt = currentUser.rt ? String(currentUser.rt).padStart(2, '0') : '';
        const userRw = currentUser.rw ? String(currentUser.rw).padStart(2, '0') : '05';
        const userNama = String(currentUser.nama || currentUser.name || '').toLowerCase().trim();
        const userUsername = String(currentUser.username || '').toLowerCase().trim();
        const userIdStr = currentUser.id !== undefined && currentUser.id !== null ? String(currentUser.id) : '';

        // STANDARISASI FILTER NOTIFIKASI
        const filteredList = notifikasi.filter(notif => {
            if (!notif) return false;

            const notifTargetScope = String(notif.targetScope || notif.target_scope || notif.scope || '').toLowerCase().trim();
            const notifNik = String(notif.nik || notif.target_nik || '').trim();
            const notifTarget = String(notif.target || notif.target_role || notif.targetRole || notif.role || '').toLowerCase().trim();
            const notifUserId = notif.userId !== undefined && notif.userId !== null ? String(notif.userId).trim() : '';
            const notifUsername = String(notif.username || '').toLowerCase().trim();
            const notifPemohon = String(notif.pemohon || notif.nama_pemohon || notif.nama || notif.recipient_name || '').toLowerCase().trim();
            const notifRt = notif.target_rt ? String(notif.target_rt).padStart(2, '0') : (notif.targetRt ? String(notif.targetRt).padStart(2, '0') : (notif.rt ? String(notif.rt).padStart(2, '0') : ''));
            const notifRw = notif.target_rw ? String(notif.target_rw).padStart(2, '0') : (notif.targetRw ? String(notif.targetRw).padStart(2, '0') : (notif.rw ? String(notif.rw).padStart(2, '0') : ''));
            const notifKategori = String(notif.kategori || '').toLowerCase().trim();
            const notifJudul = String(notif.judul || '').trim();
            const notifPesan = String(notif.pesan || '').trim();
            const notifLink = String(notif.link || '').trim();

            // ========================================================
            // ATURAN FILTER TARGET PENERIMA KHUSUS PENGADUAN WARGA
            // ========================================================
            const isNotifPengaduan = notifKategori === 'pengaduan' || 
                notifJudul.toLowerCase().includes('pengaduan') ||
                notifLink.toLowerCase().includes('pengaduan');

            if (isNotifPengaduan) {
                // Deteksi nomor RT pengaduan (dari targetRt / target_rt / rt atau teks)
                let aduanRt = notifRt;
                if (!aduanRt) {
                    const matchRt = (notifJudul + ' ' + notifPesan).match(/\bRT\s*0?([1-9][0-9]?)\b/i);
                    if (matchRt) {
                        aduanRt = matchRt[1].padStart(2, '0');
                    }
                }

                const isLaporanBaruPengurus = notifJudul.toLowerCase().startsWith('pengaduan warga baru');

                // a. Jika user adalah WARGA:
                if (userRole === 'warga' || (!userRole && userNik)) {
                    // Warga TIDAK BOLEH melihat notifikasi pengurus pengaduan
                    if (isLaporanBaruPengurus) return false;
                    // Warga hanya melihat notifikasi pengaduan pribadi miliknya
                    return (userNik && (notifNik === userNik || String(notif.target_nik || '').trim() === userNik)) ||
                           (!userNik && userIdStr && notifUserId && notifUserId === userIdStr);
                }

                // b. Jika user adalah KETUA RT:
                if (userRole === 'rt' || userRole === 'ketua rt' || userRole === 'ketua_rt') {
                    // ATURAN MUTLAK: Ketua RT HANYA melihat pengaduan dari RT-nya sendiri!
                    if (aduanRt && userRt && aduanRt !== userRt) {
                        return false; // JANGAN TAMPILKAN ke Ketua RT yang nomor RT-nya berbeda!
                    }
                    if (aduanRt && userRt && aduanRt === userRt) {
                        return true;
                    }
                    return !aduanRt || (userRt && aduanRt === userRt);
                }

                // c. Jika user adalah KETUA RW atau SUPER ADMIN:
                if (userRole === 'rw' || userRole === 'ketua rw' || userRole === 'ketua_rw' ||
                    userRole === 'super admin' || userRole === 'super_admin' || userRole === 'admin') {
                    // Berhak melihat seluruh pengaduan warga
                    return true;
                }

                return false;
            }

            // 1. CEK NOTIFIKASI PERSONAL (KUNCI NIK)
            // Notifikasi bertarget personal atau yang memiliki NIK spesifik HANYA boleh tampil untuk pemilik NIK tersebut.
            const isPersonal = notifTargetScope === 'personal' || (notifNik !== '' && notifNik !== 'all');
            if (isPersonal) {
                if (userNik && (notifNik === userNik || String(notif.target_nik || '').trim() === userNik)) {
                    return true;
                }
                if (!userNik && userIdStr && notifUserId && notifUserId !== 'all' && (notifUserId === userIdStr || notifUserId == currentUser.id)) {
                    return true;
                }
                // DILARANG KERAS notifikasi personal lolos ke filter broadcast
                return false;
            }

            // 2. CEK BROADCAST UMUM (Semua Warga / Pengumuman RW)
            if (notifTarget === 'all' || notifTarget === 'semua' || notifUserId === 'all' || notif.role === 'all' || notif.target_role === 'all') {
                return true;
            }

            // Jika broadcast untuk warga umum (bukan surat/simulasi personal)
            if ((notifTarget === 'warga' || notif.targetRole === 'warga' || notif.target_role === 'warga') && !notifNik && (!notifUserId || notifUserId === 'all' || notifUserId === 'warga')) {
                return (userRole === 'warga' || !userRole);
            }

            // 3. User Pengurus RT
            if (userRole === 'rt' || userRole === 'ketua rt' || userRole === 'ketua_rt') {
                if (notifTarget === 'rt' || notifTarget === 'ketua rt' || notifTarget === 'ketua_rt' || notif.targetRole === 'rt') {
                    return !notifRt || (userRt && notifRt === userRt);
                }
                if (notif.rt && userRt && String(notif.rt).padStart(2, '0') === userRt) {
                    return true;
                }
            }

            // 4. User Pengurus RW
            if (userRole === 'rw' || userRole === 'ketua rw' || userRole === 'ketua_rw') {
                if (notifTarget === 'rw' || notifTarget === 'ketua rw' || notifTarget === 'ketua_rw' || notif.targetRole === 'rw' || notif.role === 'rw') {
                    return !notifRw || (userRw && notifRw === userRw);
                }
            }

            // 5. Super Admin
            if (userRole === 'super admin' || userRole === 'super_admin' || userRole === 'admin') {
                const isPersonalSuratWarga = notif.kategori === 'Pelayanan' && 
                    (String(notif.judul || '').startsWith('Surat Selesai') || 
                     String(notif.judul || '').startsWith('Pengajuan Surat Disetujui') ||
                     String(notif.judul || '').startsWith('Pengajuan Surat Ditolak') ||
                     String(notif.judul || '').startsWith('Pengajuan Surat Perlu Diperbaiki')) &&
                    (!notifNik || (userNik && notifNik !== userNik));

                if (isPersonalSuratWarga) return false;

                return notifTarget === 'super_admin' || 
                       notifTarget === 'super admin' || 
                       notifTarget === 'admin' ||
                       notif.targetRole === 'super_admin' ||
                       (userNik && notifNik && notifNik === userNik);
            }

            return false;
        }).sort((a, b) => new Date(b.created_at || b.createdAt || b.waktu || b.tanggal || 0) - new Date(a.created_at || a.createdAt || a.waktu || a.tanggal || 0));

        return getUniqueNotifikasi(filteredList);
    } catch (err) {
        console.error("Error in getAllNotifikasi:", err);
        return [];
    }
}

/**
 * Deduplikasi Notifikasi: Cegah item duplikat akibat auto-polling atau multiple push
 */
export function getUniqueNotifikasi(rawNotifikasi) {
    if (!Array.isArray(rawNotifikasi)) return [];
    return rawNotifikasi.filter((item, index, self) => {
        if (!item) return false;
        return index === self.findIndex((t) => {
            if (!t) return false;
            // 1. Cek ID yang sama
            if (item.id && t.id && String(item.id).trim() === String(t.id).trim()) {
                return true;
            }
            // 2. Cek gabungan judul + pesan + waktu pembuatan (createdAt / tanggal / waktu)
            const sameJudul = String(t.judul || '').trim() === String(item.judul || '').trim();
            const samePesan = String(t.pesan || '').trim() === String(item.pesan || '').trim();
            if (sameJudul && samePesan) {
                const timeAStr = t.createdAt || t.created_at || t.tanggal || t.waktu || '';
                const timeBStr = item.createdAt || item.created_at || item.tanggal || item.waktu || '';
                if (timeAStr && timeBStr && timeAStr === timeBStr) {
                    return true;
                }
                const timeA = new Date(timeAStr || 0).getTime();
                const timeB = new Date(timeBStr || 0).getTime();
                if (timeA && timeB && Math.abs(timeA - timeB) < 60000) {
                    return true;
                }
                if (!timeAStr && !timeBStr) {
                    return true;
                }
            }
            return false;
        });
    });
}

export function getUnreadNotifikasi(userOrId = null) {
    try {
        const list = getAllNotifikasi(userOrId);
        return Array.isArray(list) ? list.filter(n => n && !n.is_read && n.isRead !== true) : [];
    } catch (err) {
        console.error("Error in getUnreadNotifikasi:", err);
        return [];
    }
}

export async function markAsRead(id) {
    try {
        const notifikasi = getCollection('notifikasi');
        if (Array.isArray(notifikasi)) {
            const index = notifikasi.findIndex(n => n && n.id === id);
            if (index !== -1) {
                notifikasi[index].is_read = true;
                notifikasi[index].isRead = true;
                saveCollection('notifikasi', notifikasi);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('db:synced', { detail: { action: 'mark_read', id } }));
                }
            }
        }

        // Sync to backend database
        try {
            await callBackendApi('notification.php', { action: 'mark_read', id: id });
        } catch (e) {}
    } catch (err) {
        console.error("Error in markAsRead:", err);
    }
}

export async function markAllAsRead(userOrId) {
    try {
        const notifikasi = getCollection('notifikasi');
        if (!Array.isArray(notifikasi) || notifikasi.length === 0) return;

        let userObj = userOrId;
        if (!userObj || typeof userObj !== 'object') {
            const currentSession = getCurrentUser();
            if (currentSession && (!userOrId || String(currentSession.id) === String(userOrId) || String(currentSession.nik) === String(userOrId))) {
                userObj = currentSession;
            } else if (userOrId) {
                const allUsers = getCollection('users') || [];
                userObj = allUsers.find(u => String(u.id) === String(userOrId) || String(u.nik) === String(userOrId) || u.username === String(userOrId)) || currentSession;
            } else {
                userObj = currentSession;
            }
        }

        const visibleNotifs = getAllNotifikasi(userObj);
        const visibleIdSet = new Set(visibleNotifs.map(n => n.id).filter(Boolean));

        let changed = false;
        notifikasi.forEach(n => {
            if (!n) return;
            if (visibleIdSet.has(n.id)) {
                if (!n.is_read || !n.isRead) {
                    n.is_read = true;
                    n.isRead = true;
                    changed = true;
                }
            }
        });

        if (changed) {
            saveCollection('notifikasi', notifikasi);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('db:synced', { detail: { action: 'mark_all_read' } }));
            }
        }

        // Sync to backend database
        try {
            const targetId = userObj && userObj.id !== undefined ? String(userObj.id) : null;
            const targetNik = userObj && userObj.nik ? String(userObj.nik) : null;
            await callBackendApi('notification.php', { action: 'mark_all_read', userId: targetId, nik: targetNik });
        } catch (e) {}
    } catch (err) {
        console.error("Error in markAllAsRead:", err);
    }
}

export async function getNotificationLogs(filter = {}) {
    try {
        // Try from backend API first
        try {
            const res = await callBackendApi('notification.php', {
                action: 'get_logs',
                ...filter
            });
            if (res && res.success && Array.isArray(res.logs)) {
                // Update local storage cache
                saveCollection('notification_logs', res.logs);
                return res.logs;
            }
        } catch (e) {}

        // Fallback to local logs
        const logs = getCollection('notification_logs');
        if (!Array.isArray(logs)) return [];
        return logs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch (err) {
        console.error("Error in getNotificationLogs:", err);
        return [];
    }
}

export async function retryNotification(logId) {
    try {
        const res = await callBackendApi('notification.php', {
            action: 'retry',
            log_id: logId
        });
        return res;
    } catch (err) {
        throw err;
    }
}

export async function getNotificationConfig() {
    const storedToken = (typeof localStorage !== 'undefined') 
        ? (localStorage.getItem('fonnte_api_token') || localStorage.getItem('fonnte_token') || '65G3LsBQrNkQLSV1F9Dc') 
        : '65G3LsBQrNkQLSV1F9Dc';

    try {
        const res = await callBackendApi('notification.php', { action: 'get_config' });
        if (res && res.success) {
            if (res.whatsapp && !res.whatsapp.api_token) {
                res.whatsapp.api_token = storedToken;
            }
            return res;
        }
    } catch (e) {}

    return {
        email: { configured: false, status_label: 'Belum dikonfigurasi' },
        whatsapp: {
            configured: true,
            status_label: '100% Siap Aktif',
            provider: 'fonnte',
            api_url: 'https://api.fonnte.com/send',
            api_token: storedToken
        }
    };
}

export async function updateNotificationConfig(configData) {
    try {
        if (configData && configData.whatsapp) {
            const token = configData.whatsapp.api_token || configData.whatsapp.access_token;
            if (token && typeof localStorage !== 'undefined') {
                localStorage.setItem('fonnte_api_token', token);
                localStorage.setItem('fonnte_token', token);
            }
        }

        const res = await callBackendApi('notification.php', {
            action: 'update_config',
            ...configData
        });
        return res;
    } catch (e) {
        // Even if backend fails, token is already persisted locally
        if (configData && configData.whatsapp) {
            const token = configData.whatsapp.api_token || configData.whatsapp.access_token;
            if (token && typeof localStorage !== 'undefined') {
                localStorage.setItem('fonnte_api_token', token);
                localStorage.setItem('fonnte_token', token);
            }
        }
        throw e;
    }
}
