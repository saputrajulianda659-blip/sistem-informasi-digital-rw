import { getCollection, saveCollection, syncWithBackend } from '../utils/db.js';
import { getCurrentUser, ROLES, getUsersByRole } from './User.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from './Notifikasi.js';
import { notifyPengumuman } from '../services/notificationService.js';
import { callBackendApi } from '../services/apiClient.js';

export const KATEGORI_PENGUMUMAN = [
    'Informasi',
    'Kegiatan',
    'Administrasi',
    'Darurat'
];

/**
 * Fetch list of announcements with territorial query filtering for Role Warga.
 * Warga only receives announcements matching their target wilayah (target_rw, target_rt)
 * or public/general announcements (target_role = 'all' / empty).
 */
export function getPengumuman(onlyPublished = true, customUser = null, sourceItems = null) {
    const user = customUser || getCurrentUser();
    let pengumuman = Array.isArray(sourceItems) ? [...sourceItems] : (getCollection('pengumuman') || []);
    if (!pengumuman || pengumuman.length === 0) {
        try {
            pengumuman = JSON.parse(localStorage.getItem('pengumuman') || '[]');
        } catch (e) {}
    }
    
    // Sort newest first (DESC)
    pengumuman.sort((a, b) => {
        const timeA = a.tanggal_dibuat ? new Date(a.tanggal_dibuat).getTime() : 0;
        const timeB = b.tanggal_dibuat ? new Date(b.tanggal_dibuat).getTime() : 0;
        return timeB - timeA;
    });
    
    if (onlyPublished) {
        pengumuman = pengumuman.filter(p => p.status_publikasi === 'Published');
    }

    // Role-based territorial query filtering for Role Warga
    if (user && (user.role === ROLES.WARGA || user.role === 'Warga')) {
        const userRt = user.rt ? String(user.rt).padStart(2, '0') : '';
        const userRw = user.rw ? String(user.rw).padStart(2, '0') : '05';

        pengumuman = pengumuman.filter(p => {
            const targetRole = (p.target_role || 'all').toLowerCase();
            const targetRt = p.target_rt ? String(p.target_rt).padStart(2, '0') : '';
            const targetRw = p.target_rw ? String(p.target_rw).padStart(2, '0') : '';

            // Public / General announcement for all roles and all wilayah
            const isPublicRole = !targetRole || targetRole === 'all' || targetRole === 'warga';
            const isPublicWilayah = (!targetRt || targetRt === 'all') && (!targetRw || targetRw === 'all' || targetRw === '05');

            if (isPublicRole && isPublicWilayah) {
                return true;
            }

            // Exclude if target role is restricted to non-warga
            if (targetRole !== 'all' && targetRole !== 'warga') {
                return false;
            }

            // Target RW filter check
            if (targetRw && targetRw !== 'all' && targetRw !== userRw) {
                return false;
            }

            // Target RT filter check
            if (targetRt && targetRt !== 'all') {
                return targetRt === userRt;
            }

            return true;
        });
    }

    return pengumuman;
}

// Named alias for backward compatibility
export const getAllPengumuman = getPengumuman;

export function getPengumumanById(id) {
    const pengumuman = getCollection('pengumuman') || [];
    return pengumuman.find(p => p.id === id) || null;
}

export function createPengumuman(data) {
    const user = getCurrentUser();
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk membuat pengumuman.");
    }

    const pengumuman = getCollection('pengumuman') || [];
    
    const newPengumuman = {
        id: 'INFO-' + Date.now(),
        judul: data.judul,
        isi: data.isi,
        tanggal_dibuat: new Date().toISOString(),
        penulis: user.name,
        kategori: data.kategori || 'Informasi',
        target_rt: data.target_rt || '', // Optional specific RT target (e.g. '01', '02')
        target_rw: data.target_rw || '05',
        target_role: data.target_role || 'all',
        status_publikasi: data.status_publikasi || 'Draft',
        lampiran: data.lampiran || ''
    };

    pengumuman.unshift(newPengumuman);
    saveCollection('pengumuman', pengumuman);

    if (newPengumuman.status_publikasi === 'Published') {
        const allWarga = getCollection('warga') || [];
        const targetedWarga = allWarga.filter(w => !newPengumuman.target_rt || String(w.rt).padStart(2, '0') === String(newPengumuman.target_rt).padStart(2, '0'));
        
        // 1. Broadcast via Fonnte WhatsApp Gateway
        notifyPengumuman({ pengumuman: newPengumuman, targetWargaList: targetedWarga })
            .catch(e => console.warn('[WhatsApp Pengumuman Broadcast Error]', e));

        // 2. WAJIB: Bulk insert in-app notification records for EVERY targeted citizen (Warga)
        const allUsers = getCollection('users') || [];
        const userByNik = {};
        allUsers.forEach(u => { if (u.nik) userByNik[u.nik] = u; });

        const notifikasi = getCollection('notifikasi') || [];
        const logs = getCollection('notification_logs') || [];
        const nowIso = new Date().toISOString();

        targetedWarga.forEach((w, idx) => {
            const linkedUser = userByNik[w.nik];
            const targetUserId = linkedUser ? linkedUser.id : w.nik;
            const notifId = 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + idx;

            notifikasi.unshift({
                id: notifId,
                userId: targetUserId,
                nik: w.nik,
                judul: `Pengumuman Baru: ${newPengumuman.judul}`,
                pesan: newPengumuman.isi,
                kategori: KATEGORI_NOTIFIKASI.PENGUMUMAN,
                type: 'info',
                link: '#/pengumuman',
                priority: (newPengumuman.kategori === 'Darurat') ? 'high' : 'normal',
                is_read: false,
                tanggal: nowIso
            });

            logs.unshift({
                id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + idx,
                notification_id: notifId,
                event_id: newPengumuman.id,
                category: KATEGORI_NOTIFIKASI.PENGUMUMAN,
                channel: 'in_app',
                recipient_id: targetUserId,
                recipient_name: w.nama || 'Warga',
                recipient_target: 'In-App',
                title: `Pengumuman Baru: ${newPengumuman.judul}`,
                body: newPengumuman.isi,
                status: 'sent',
                attempts: 1,
                max_retries: 3,
                error_message: null,
                created_at: nowIso,
                sent_at: nowIso
            });
        });

        // Also add broadcast marker for all
        notifikasi.unshift({
            id: 'NOTIF-ALL-' + Date.now(),
            userId: 'all',
            target: newPengumuman.target_rt ? `rt_${newPengumuman.target_rt}` : 'all',
            target_rt: newPengumuman.target_rt || '',
            judul: `Pengumuman Baru: ${newPengumuman.judul}`,
            pesan: newPengumuman.isi,
            kategori: KATEGORI_NOTIFIKASI.PENGUMUMAN,
            type: 'info',
            link: '#/pengumuman',
            priority: (newPengumuman.kategori === 'Darurat') ? 'high' : 'normal',
            is_read: false,
            tanggal: nowIso
        });

        saveCollection('notifikasi', notifikasi);
        saveCollection('notification_logs', logs);

        // 3. Sync to Backend PHP Engine (Inserts into database.json & logs)
        callBackendApi('pengumuman.php', {
            action: 'create',
            judul: newPengumuman.judul,
            isi: newPengumuman.isi,
            kategori: newPengumuman.kategori,
            status_publikasi: newPengumuman.status_publikasi,
            target_rt: newPengumuman.target_rt,
            target_rw: newPengumuman.target_rw,
            target_role: newPengumuman.target_role,
            lampiran: newPengumuman.lampiran
        }).catch(err => console.warn('[Backend Pengumuman Create Sync]', err));
    }

    return newPengumuman;
}

export function updatePengumuman(id, data) {
    const user = getCurrentUser();
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk mengubah pengumuman.");
    }
    
    const pengumuman = getCollection('pengumuman') || [];
    const index = pengumuman.findIndex(p => p.id === id);
    
    if (index === -1) throw new Error("Pengumuman tidak ditemukan.");
    
    const wasDraft = pengumuman[index].status_publikasi !== 'Published';
    
    pengumuman[index] = { ...pengumuman[index], ...data };
    saveCollection('pengumuman', pengumuman);

    const targetAudience = pengumuman[index].target_rt ? `rt_${pengumuman[index].target_rt}` : 'all';

    if (wasDraft && pengumuman[index].status_publikasi === 'Published') {
        const allWarga = getCollection('warga') || [];
        const targetedWarga = allWarga.filter(w => !pengumuman[index].target_rt || String(w.rt).padStart(2, '0') === String(pengumuman[index].target_rt).padStart(2, '0'));
        
        // Broadcast via Fonnte WhatsApp Gateway
        notifyPengumuman({ pengumuman: pengumuman[index], targetWargaList: targetedWarga })
            .catch(e => console.warn('[WhatsApp Pengumuman Broadcast Error]', e));

        // Bulk insert in-app notification records for EVERY targeted citizen
        const allUsers = getCollection('users') || [];
        const userByNik = {};
        allUsers.forEach(u => { if (u.nik) userByNik[u.nik] = u; });

        const notifikasi = getCollection('notifikasi') || [];
        const nowIso = new Date().toISOString();

        targetedWarga.forEach((w, idx) => {
            const linkedUser = userByNik[w.nik];
            const targetUserId = linkedUser ? linkedUser.id : w.nik;
            const notifId = 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + idx;

            notifikasi.unshift({
                id: notifId,
                userId: targetUserId,
                nik: w.nik,
                judul: `Pengumuman Baru: ${pengumuman[index].judul}`,
                pesan: pengumuman[index].isi,
                kategori: KATEGORI_NOTIFIKASI.PENGUMUMAN,
                type: 'info',
                link: '#/pengumuman',
                priority: (pengumuman[index].kategori === 'Darurat') ? 'high' : 'normal',
                is_read: false,
                tanggal: nowIso
            });
        });

        saveCollection('notifikasi', notifikasi);

        // Sync to backend PHP Engine
        callBackendApi('pengumuman.php', {
            action: 'create',
            judul: pengumuman[index].judul,
            isi: pengumuman[index].isi,
            kategori: pengumuman[index].kategori,
            status_publikasi: pengumuman[index].status_publikasi,
            target_rt: pengumuman[index].target_rt || '',
            target_rw: pengumuman[index].target_rw || '05',
            target_role: pengumuman[index].target_role || 'all',
            lampiran: pengumuman[index].lampiran || ''
        }).catch(err => console.warn('[Backend Pengumuman Update Sync]', err));
    } else if (pengumuman[index].status_publikasi === 'Published') {
        createNotifikasi({
            target: targetAudience,
            judul: `Pembaruan Pengumuman: ${pengumuman[index].judul}`,
            pesan: `Terdapat pembaruan informasi pada pengumuman "${pengumuman[index].judul}". Silakan periksa detail terbaru pada aplikasi Digital RW.`,
            kategori: KATEGORI_NOTIFIKASI.PENGUMUMAN,
            type: 'info',
            link: `#/pengumuman`,
            channels: ['in_app', 'email', 'whatsapp'],
            eventId: `${pengumuman[index].id}-update-${Date.now()}`
        });
    }

    return pengumuman[index];
}

export async function deletePengumuman(id) {
    const user = getCurrentUser();
    if (![ROLES.SUPER_ADMIN, ROLES.ADMIN_RW, ROLES.KETUA_RW].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk menghapus pengumuman.");
    }

    // 1. Call Backend API DELETE /api/pengumuman/:id
    let apiRes = null;
    try {
        apiRes = await callBackendApi(`pengumuman/${encodeURIComponent(id)}`, {
            action: 'delete',
            id: id
        }, 'DELETE');
    } catch (err) {
        if (err.message && (err.message.includes('Akses ditolak') || err.message.includes('wajib'))) {
            throw err;
        }
        console.warn('[Pengumuman Delete Backend Notice]', err);
    }

    // 2. Update local state
    let pengumuman = getCollection('pengumuman') || [];
    pengumuman = pengumuman.filter(p => p.id !== id);
    saveCollection('pengumuman', pengumuman);

    // 3. Re-fetch / sync with backend database to confirm permanent deletion
    try {
        await syncWithBackend();
    } catch (e) {}

    return apiRes || { success: true, message: 'Pengumuman berhasil dihapus.' };
}

export function createPengumumanDarurat(user, mapsLink, jenisDarurat = 'Darurat') {
    const pengumuman = getCollection('pengumuman') || [];
    
    let lokasi = mapsLink || `Alamat Terdaftar: ${user.alamat || 'RT ' + user.rt + ' / RW ' + user.rw}`;
    
    const newPengumuman = {
        id: 'INFO-' + Date.now(),
        judul: `DARURAT [${jenisDarurat.toUpperCase()}]: Laporan dari ${user.name} (RT ${user.rt})`,
        isi: `Warga ${user.name} melaporkan keadaan darurat jenis: ${jenisDarurat}.\nLokasi: ${lokasi}`,
        tanggal_dibuat: new Date().toISOString(),
        penulis: user.name,
        kategori: 'Darurat',
        status_publikasi: 'Published',
        lampiran: mapsLink || ''
    };

    pengumuman.push(newPengumuman);
    saveCollection('pengumuman', pengumuman);

    // Urgent notification to all pengurus (RT & RW) across all channels with high priority
    createNotifikasi({
        target: 'pengurus',
        judul: `🚨 DARURAT [${jenisDarurat.toUpperCase()}]: Warga ${user.name} (RT ${user.rt})`,
        pesan: `Laporan darurat jenis ${jenisDarurat} dari ${user.name} (RT ${user.rt}).\nLokasi: ${lokasi}.\nSegera lakukan koordinasi dan pertolongan!`,
        kategori: KATEGORI_NOTIFIKASI.DARURAT,
        type: 'error',
        priority: 'high',
        link: `#/dashboard`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: newPengumuman.id
    });
}
