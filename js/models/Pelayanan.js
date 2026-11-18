import { getCollection, saveCollection, trackPendingSave } from '../utils/db.js';
import { getCurrentUser, ROLES, getKetuaRT, getKetuaRW, getSuperAdmin, getUserByNik } from './User.js';
import { getWargaByNIK } from './Warga.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from './Notifikasi.js';
import { notifyStatusSurat } from '../services/notificationService.js';
import { callBackendApi } from '../services/apiClient.js';

export function getCleanRT(val) {
    if (!val) return '';
    return String(val).replace(/^0+/, '').trim();
}

export const STATUS_PELAYANAN = {
    MENUNGGU_RT: 'Menunggu Verifikasi RT',
    MENUNGGU_VERIFIKASI_RT: 'menunggu_verifikasi_rt',
    MENUNGGU_RW: 'Menunggu Persetujuan RW',
    MENUNGGU_VERIFIKASI_RW: 'menunggu_verifikasi_rw',
    DISETUJUI_RT: 'Disetujui RT',
    DITOLAK_RT: 'Ditolak RT',
    DISETUJUI_RW: 'Disetujui RW',
    DITOLAK_RW: 'Ditolak RW',
    PERLU_DIPERBAIKI: 'Perlu Diperbaiki',
    SELESAI: 'Selesai'
};

export function isMenungguRT(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === 'menunggu verifikasi rt' || s === 'menunggu_verifikasi_rt' || s === 'menunggu rt' || (s.includes('menunggu') && s.includes('rt'));
}

export function isMenungguRW(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === 'menunggu_verifikasi_rw' || s === 'menunggu persetujuan rw' || s === 'menunggu verifikasi rw' || s === 'disetujui rt' || s.includes('menunggu rw') || s.includes('verifikasi rw');
}

export const JENIS_PELAYANAN = [
    'Surat Pengantar SKCK',
    'Surat Keterangan Tidak Mampu (SKTM)',
    'Surat Keterangan Kematian',
    'Surat Keterangan Domisili',
    'Surat Keterangan Usaha (SKU)',
    'Surat Keterangan Belum Menikah',
    'Surat Keterangan Lainnya'
];

export function getAllPelayanan() {
    const user = getCurrentUser();
    let pelayanan = (getCollection('pelayanan') || []).filter(item => item && item.id !== 'SRT-20260902-1002');
    const allWarga = getCollection('warga') || [];
    const wargaMap = new Map();
    allWarga.forEach(w => { if (w && w.nik) wargaMap.set(String(w.nik).trim(), w); });

    // Map pemohon name and territory for easy display
    pelayanan = pelayanan.map(p => {
        const pNik = String(p.nik || p.nik_pemohon || '').trim();
        const pemohon = pNik ? wargaMap.get(pNik) : null;
        const resolvedRt = p.rt || (pemohon ? pemohon.rt : '');
        const cleanRt = getCleanRT(resolvedRt);
        const resolvedRw = p.rw || (pemohon ? pemohon.rw : '05');
        const cleanRw = getCleanRT(resolvedRw);
        return {
            ...p,
            id: p.id || p.no_berkas,
            no_berkas: p.no_berkas || p.id,
            jenis_surat: p.jenis_surat || p.jenis_pelayanan || 'Pelayanan Surat',
            jenis_pelayanan: p.jenis_pelayanan || p.jenis_surat || 'Pelayanan Surat',
            nik: pNik,
            nik_pemohon: pNik,
            nama_pemohon: p.nama_pemohon || (pemohon ? pemohon.nama : (p.nama_pemohon_arsip || 'Warga')),
            rt: cleanRt ? String(cleanRt).padStart(2, '0') : '01',
            rw: cleanRw ? String(cleanRw).padStart(2, '0') : '05'
        };
    });

    if (!user) return [];

    let filtered = [];
    if (user.role === ROLES.WARGA) {
        const userNik = String(user.nik || '').trim();
        const userNikClean = getCleanRT(userNik);
        const userName = String(user.nama || user.name || '').trim().toLowerCase();
        const userUsername = String(user.username || '').trim().toLowerCase();

        filtered = pelayanan.filter(item => {
            const itemNik = String(item.nik || item.nik_pemohon || '').trim();
            const itemNama = String(item.nama_pemohon || item.nama || '').trim().toLowerCase();
            const itemUsername = String(item.username || '').trim().toLowerCase();

            const matchNik = userNik && ((itemNik && itemNik === userNik) || (userNikClean !== '' && itemNik !== '' && getCleanRT(itemNik) === userNikClean));
            const matchUsername = userUsername && itemUsername && (itemUsername === userUsername);
            const matchNama = userName && itemNama && (itemNama === userName);

            return matchNik || matchUsername || matchNama;
        });
    } else if (user.role === ROLES.KETUA_RT) {
        const cleanUserRt = getCleanRT(user.rt);
        filtered = pelayanan.filter(item => {
            return getCleanRT(item.rt) === cleanUserRt;
        });
    } else {
        // Super Admin, Ketua RW can see all in RW 05
        filtered = pelayanan;
    }

    // Urutkan tabel dari yang paling baru (sort descending berdasarkan tanggal/created_at atau id berkas) agar pengajuan terbaru selalu berada di paling atas.
    return filtered.sort((a, b) => {
        const timeA = new Date(a.tanggal_pengajuan || a.created_at || 0).getTime();
        const timeB = new Date(b.tanggal_pengajuan || b.created_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''));
    });
}

export async function fetchPelayananFromBackend() {
    try {
        const res = await callBackendApi('pelayanan.php', { action: 'list' }, 'GET');
        if (res && res.success && Array.isArray(res.data)) {
            const cleanBackendData = res.data.filter(item => item && item.id !== 'SRT-20260902-1002');
            const current = (getCollection('pelayanan') || []).filter(item => item && item.id !== 'SRT-20260902-1002');
            const map = new Map();
            cleanBackendData.forEach(item => { if (item && item.id) map.set(item.id, item); });
            current.forEach(item => {
                if (item && item.id && item.id !== 'SRT-20260902-1002') {
                    if (map.has(item.id)) {
                        const fresh = map.get(item.id);
                        const mergedDocs = (item.dokumen_pendukung && Array.isArray(item.dokumen_pendukung) && item.dokumen_pendukung.some(d => d && (d.data || d.url)))
                            ? item.dokumen_pendukung
                            : (fresh.dokumen_pendukung || item.dokumen_pendukung);
                        map.set(item.id, { ...item, ...fresh, dokumen_pendukung: mergedDocs });
                    } else {
                        map.set(item.id, item);
                    }
                }
            });
            const updated = Array.from(map.values()).filter(item => item && item.id !== 'SRT-20260902-1002');
            // Urutkan data terbaru paling atas
            updated.sort((a, b) => {
                const dateA = new Date(a.tanggal_pengajuan || a.created_at || 0).getTime();
                const dateB = new Date(b.tanggal_pengajuan || b.created_at || 0).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return String(b.id || '').localeCompare(String(a.id || ''));
            });
            saveCollection('pelayanan', updated);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('db:synced'));
            }
            return updated;
        }
    } catch (e) {
        console.warn('[fetchPelayananFromBackend Error]', e);
    }
    return (getCollection('pelayanan') || []).filter(item => item && item.id !== 'SRT-20260902-1002');
}

export function getPelayananById(id) {
    const rawAll = getCollection('pelayanan') || [];
    let p = rawAll.find(item => item && (item.id === id || item.no_berkas === id));
    if (!p) {
        p = getAllPelayanan().find(item => item && (item.id === id || item.no_berkas === id));
    }
    if (p) {
        const pemohon = getWargaByNIK(p.nik || p.nik_pemohon);
        const resolvedRt = p.rt || (pemohon ? pemohon.rt : '');
        const cleanRt = getCleanRT(resolvedRt);
        const resolvedRw = p.rw || (pemohon ? pemohon.rw : '05');
        const cleanRw = getCleanRT(resolvedRw);
        return {
            ...p,
            id: p.id || p.no_berkas,
            no_berkas: p.no_berkas || p.id,
            jenis_surat: p.jenis_surat || p.jenis_pelayanan || 'Pelayanan Surat',
            jenis_pelayanan: p.jenis_pelayanan || p.jenis_surat || 'Pelayanan Surat',
            nik: String(p.nik || p.nik_pemohon || '').trim(),
            nik_pemohon: String(p.nik_pemohon || p.nik || '').trim(),
            nama_pemohon: p.nama_pemohon || (pemohon ? pemohon.nama : (p.nama_pemohon_arsip || 'Warga')),
            rt: cleanRt ? String(cleanRt).padStart(2, '0') : '01',
            rw: cleanRw ? String(cleanRw).padStart(2, '0') : '05'
        };
    }
    return null;
}

export async function createPengajuan(data) {
    const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser)
        ? Auth.getCurrentUser()
        : (getCurrentUser() || JSON.parse(localStorage.getItem('rwdigital_current_user') || localStorage.getItem('currentUser') || '{}'));
    const user = currentUser;

    if (!user || (user.role && user.role !== ROLES.WARGA)) {
        throw new Error("Hanya warga yang dapat membuat pengajuan baru.");
    }

    const pelayanan = getCollection('pelayanan') || [];

    // Generate ID: SRT-YYYYMMDD-Random
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const id = data.id || data.no_berkas || `SRT-${dateStr}-${random}`;
    const jenisSurat = data.jenis_surat || data.jenis_pelayanan;
    const jenis = jenisSurat;
    const arrayDokumen = Array.isArray(data.dokumen_pendukung) ? data.dokumen_pendukung : (data.dokumen_pendukung ? [data.dokumen_pendukung] : []);

    const nikVal = String(data.nik || user.nik || '');
    const namaVal = data.nama_pemohon || user.nama || user.name || 'Warga';
    const rtVal = String(data.rt || user.rt || '01').padStart(2, '0');
    const rwVal = String(data.rw || user.rw || '05').padStart(2, '0');

    const newPengajuan = {
        id: id,
        no_berkas: id,
        jenis_surat: jenisSurat,
        jenis_pelayanan: jenisSurat,
        nik: nikVal,
        nik_pemohon: nikVal,
        nama_pemohon: namaVal,
        rt: rtVal,
        rw: rwVal,
        status: data.status || STATUS_PELAYANAN.MENUNGGU_RT,
        keperluan: data.keperluan,
        dokumen_pendukung: arrayDokumen,
        created_at: data.created_at || date.toISOString(),
        tanggal_pengajuan: date.toISOString(),
        catatan_rt: '',
        catatan_rw: '',
        tanggal_selesai: null
    };

    // 1. Send to Backend API (Permanent Storage in api/database.json)
    try {
        const createPromise = callBackendApi('pelayanan.php', {
            action: 'create',
            ...newPengajuan
        }, 'POST');
        trackPendingSave(createPromise);
        const response = await createPromise;
        if (response && response.success && response.data) {
            Object.assign(newPengajuan, response.data);
        }
    } catch (apiErr) {
        console.warn('[Backend Pelayanan Create Error]', apiErr);
    }

    // 2. Tambahkan langsung data pengajuan baru ke awal array (unshift) pada cache lokal / state pelayanan:
    const existingIdx = pelayanan.findIndex(p => p.id === newPengajuan.id);
    if (existingIdx >= 0) {
        pelayanan[existingIdx] = newPengajuan;
    } else {
        pelayanan.unshift(newPengajuan);
    }
    saveCollection('pelayanan', pelayanan);

    // Sinkronkan ulang localStorage dengan data terbaru dari backend
    try {
        await fetchPelayananFromBackend();
    } catch (syncErr) {
        console.warn('[Sync Backend After Create Warning]', syncErr);
    }

    // Notify listeners that collection updated
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db:synced'));
    }

    // 3. Multi-Channel In-App & Push Notifications
    // Pemohon notification
    createNotifikasi({
        recipientId: user.id,
        recipientNik: user.nik,
        judul: `Pengajuan Berhasil Dikirim: ${jenis}`,
        pesan: `Permohonan surat ${jenis} (${id}) telah berhasil dikirimkan. Saat ini menunggu verifikasi oleh Ketua RT ${user.rt || ''}.`,
        kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
        type: 'info',
        link: `#/status-pengajuan`,
        channels: ['in_app'],
        eventId: `${id}-created`
    });

    // Ketua RT notification
    const ketuaRt = getKetuaRT(user.rt, user.rw);
    const cleanRt = String(user.rt || '01').padStart(2, '0');
    if (ketuaRt) {
        createNotifikasi({
            recipientId: ketuaRt.id,
            target_id: ketuaRt.id,
            target: 'ketua_rt',
            target_rt: cleanRt,
            recipient_phone: ketuaRt.no_hp || '',
            recipient_email: ketuaRt.email || '',
            recipient_name: ketuaRt.name || 'Ketua RT',
            judul: `Pengajuan Surat Baru Perlu Verifikasi`,
            pesan: `Warga ${user.name || newPengajuan.nama_pemohon} mengajukan ${jenis} (No: ${id}). Silakan lakukan verifikasi berkas.`,
            kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
            type: 'info',
            link: `#/verifikasi-pengajuan`,
            channels: ['in_app'],
            eventId: `${id}-notify-rt`
        });
    }

    // Super Admin notification (tembusan web in-app only, NO WA / Email)
    const superAdmin = getSuperAdmin();
    if (superAdmin) {
        createNotifikasi({
            recipientId: superAdmin.id,
            target_id: superAdmin.id,
            target: 'super_admin',
            target_role: 'super_admin',
            recipient_name: superAdmin.name || 'Super Admin',
            judul: `Pengajuan Surat Baru Perlu Verifikasi`,
            pesan: `Warga ${user.name || newPengajuan.nama_pemohon} mengajukan ${jenis} (No: ${id}) di RT ${cleanRt}. Silakan pantau verifikasi berkas.`,
            kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
            type: 'info',
            link: `#/pelayanan`,
            channels: ['in_app'],
            eventId: `${id}-notify-admin`
        });
    }

    return newPengajuan;
}

export async function updateStatusPelayanan(id, action, catatan) {
    const user = getCurrentUser();
    const pelayanan = getCollection('pelayanan') || [];
    const index = pelayanan.findIndex(p => p.id === id);

    if (index === -1) throw new Error("Pengajuan tidak ditemukan.");

    const p = pelayanan[index];
    const warga = getWargaByNIK(p.nik_pemohon);
    const pemohonUser = getUserByNik(p.nik_pemohon);

    if (user.role === ROLES.KETUA_RT) {
        const itemRt = getCleanRT(p.rt || (warga && warga.rt));
        const userRt = getCleanRT(user.rt);
        if (itemRt !== userRt) throw new Error("Akses ditolak: Warga bukan dari RT Anda.");
        if (!isMenungguRT(p.status)) throw new Error("Status saat ini tidak dapat diubah oleh RT.");

        if (action === 'APPROVE') {
            p.status = 'menunggu_verifikasi_rw';
            p.catatan_rt = catatan || 'Disetujui oleh Ketua RT dan meneruskan ke Ketua RW.';
        } else if (action === 'REJECT') {
            p.status = STATUS_PELAYANAN.DITOLAK_RT;
            p.catatan_rt = catatan || 'Ditolak oleh RT (Dokumen/informasi belum sesuai)';
            p.tanggal_selesai = new Date().toISOString();
        } else if (action === 'REVISION' || action === 'PERLU_DIPERBAIKI') {
            p.status = STATUS_PELAYANAN.PERLU_DIPERBAIKI;
            p.catatan_rt = catatan || 'Perlu diperbaiki: mohon lengkapi atau perbaiki dokumen pengajuan.';
        }
    } else if ([ROLES.KETUA_RW, ROLES.SUPER_ADMIN].includes(user.role)) {
        if (!isMenungguRW(p.status) && !isMenungguRT(p.status)) throw new Error("Status belum dapat diverifikasi atau sudah selesai.");

        if (action === 'APPROVE') {
            p.status = STATUS_PELAYANAN.SELESAI;
            p.catatan_rw = catatan || 'Disetujui oleh Ketua RW. Surat resmi telah diterbitkan.';
            p.tanggal_selesai = new Date().toISOString();
        } else if (action === 'REJECT') {
            p.status = STATUS_PELAYANAN.DITOLAK_RW;
            p.catatan_rw = catatan || 'Ditolak oleh RW';
            p.tanggal_selesai = new Date().toISOString();
        } else if (action === 'REVISION' || action === 'PERLU_DIPERBAIKI') {
            p.status = STATUS_PELAYANAN.PERLU_DIPERBAIKI;
            p.catatan_rw = catatan || 'Perlu perbaikan berkas oleh pemohon.';
        }
    } else {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk memverifikasi.");
    }

    saveCollection('pelayanan', pelayanan);

    // Sync with backend API
    try {
        const updatePromise = callBackendApi('pelayanan.php', {
            action: 'update_status',
            id: p.id,
            actionType: action,
            catatan: (user.role === ROLES.KETUA_RT) ? p.catatan_rt : p.catatan_rw
        });
        trackPendingSave(updatePromise);
        await updatePromise;
    } catch (apiErr) {
        console.warn('[Backend Pelayanan Sync]', apiErr);
    }

    // Multi-Channel Notifications for Status Change
    const link = `#/status-pengajuan`;
    const targetRw = warga ? warga.rw : (p.rw || '05');
    const targetRt = warga ? warga.rt : (p.rt || '01');

    // Dynamic letter name directly from the letter object
    const jenisSurat = p.jenis_pelayanan || p.jenis_surat || p.layanan || p.jenis || 'Surat';

    let resolvedPemohon = pemohonUser;
    if (!resolvedPemohon) {
        const allUsers = getCollection('users') || [];
        resolvedPemohon = allUsers.find(u => 
            (p.userId && String(u.id) === String(p.userId)) ||
            (p.pemohonId && String(u.id) === String(p.pemohonId)) ||
            (p.nik && u.nik === p.nik) ||
            (p.nik_pemohon && u.nik === p.nik_pemohon) ||
            (p.nama_pemohon && u.name && u.name.toLowerCase() === p.nama_pemohon.toLowerCase())
        );
    }
    const citizenUserId = resolvedPemohon ? resolvedPemohon.id : (p.userId || p.pemohonId || null);
    const citizenNik = resolvedPemohon ? resolvedPemohon.nik : (p.nik_pemohon || p.nik || '');
    const citizenUsername = resolvedPemohon ? resolvedPemohon.username : (p.username || '');
    const citizenNama = resolvedPemohon ? (resolvedPemohon.nama || resolvedPemohon.name) : (p.nama_pemohon || warga?.nama || 'Warga');
    const citizenPhone = warga?.no_hp || resolvedPemohon?.no_hp || '';

    if (user.role === ROLES.KETUA_RT) {
        const isApproved = action === 'APPROVE';
        const isRevision = action === 'REVISION' || action === 'PERLU_DIPERBAIKI';
        
        let statusTerbaru = '';
        if (isApproved) {
            statusTerbaru = 'disetujui oleh Ketua RT dan diteruskan ke Ketua RW.';
        } else if (isRevision) {
            statusTerbaru = 'memerlukan perbaikan berkas.' + (p.catatan_rt ? ` Catatan RT: ${p.catatan_rt}` : '');
        } else {
            statusTerbaru = 'ditolak oleh Ketua RT.' + (p.catatan_rt ? ` Alasan: ${p.catatan_rt}` : '');
        }

        const notifJudul = "Status Berkas Diperbarui";
        const notifPesan = `Pengajuan ${jenisSurat} Anda telah ${statusTerbaru}`;

        createNotifikasi({
            userId: citizenUserId,
            recipientId: citizenUserId,
            username: citizenUsername,
            nik: citizenNik,
            recipientNik: citizenNik,
            pemohon: citizenNama,
            recipient_name: citizenNama,
            target_role: 'warga',
            target_nik: citizenNik,
            recipient_phone: citizenPhone,
            judul: notifJudul,
            pesan: notifPesan,
            kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
            type: isApproved ? 'success' : (isRevision ? 'warning' : 'error'),
            link: link,
            isRead: false,
            is_read: false,
            channels: ['in_app'],
            eventId: `${p.id}-rt-${action}`
        });

        if (action === 'APPROVE') {
            const ketuaRw = getKetuaRW(targetRw);
            if (ketuaRw) {
                createNotifikasi({
                    recipientId: ketuaRw.id,
                    target_id: ketuaRw.id,
                    target: 'ketua_rw',
                    recipient_phone: ketuaRw.no_hp || '082114122927',
                    recipient_email: ketuaRw.email || 'bambang@rwdigital.id',
                    recipient_name: ketuaRw.name || 'Bambang Mulyono',
                    judul: `Persetujuan Surat Menunggu Tindakan`,
                    pesan: `Pengajuan ${jenisSurat} dari ${p.nama_pemohon || citizenNama} telah diverifikasi RT dan menunggu persetujuan RW.`,
                    kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
                    type: 'warning',
                    link: `#/persetujuan-pelayanan`,
                    channels: ['in_app'],
                    eventId: `${p.id}-to-rw`
                });
            }
        }
    } else if ([ROLES.KETUA_RW, ROLES.SUPER_ADMIN].includes(user.role)) {
        const isApproved = action === 'APPROVE';
        const isRevision = action === 'REVISION' || action === 'PERLU_DIPERBAIKI';
        
        let statusTerbaru = '';
        if (isApproved) {
            statusTerbaru = 'diproses dan dinyatakan Selesai oleh Ketua RW.';
        } else if (isRevision) {
            statusTerbaru = 'memerlukan perbaikan berkas.' + (p.catatan_rw ? ` Catatan RW: ${p.catatan_rw}` : '');
        } else {
            statusTerbaru = 'ditolak pada tahap verifikasi RW.' + (p.catatan_rw ? ` Alasan: ${p.catatan_rw}` : '');
        }

        const notifJudul = isApproved ? "Pengajuan Surat Selesai" : (isRevision ? "Pengajuan Surat Perlu Diperbaiki" : "Pengajuan Surat Ditolak RW");
        const notifPesan = `Pengajuan ${jenisSurat} (${p.no_berkas || p.id}) Anda telah ${statusTerbaru}`;

        createNotifikasi({
            userId: citizenUserId,
            recipientId: citizenUserId,
            username: citizenUsername,
            nik: citizenNik,
            recipientNik: citizenNik,
            pemohon: citizenNama,
            recipient_name: citizenNama,
            target_role: 'warga',
            targetRole: 'warga',
            target: 'warga',
            target_nik: citizenNik,
            recipient_phone: citizenPhone,
            judul: notifJudul,
            pesan: notifPesan,
            kategori: 'surat',
            type: isApproved ? 'success' : (isRevision ? 'warning' : 'error'),
            link: link,
            isRead: false,
            is_read: false,
            channels: ['in_app'],
            eventId: `${p.id}-rw-${action}`
        });

        // Notify RT about final RW decision (strictly targeted to RT)
        const ketuaRt = getKetuaRT(targetRt, targetRw);
        if (ketuaRt) {
            createNotifikasi({
                recipientId: ketuaRt.id,
                target_role: 'rt',
                targetRole: 'rt',
                target: 'rt',
                target_rt: String(targetRt).padStart(2, '0'),
                judul: `Status Pelayanan RT: ${p.no_berkas || p.id} Telah ${isApproved ? 'Selesai' : (isRevision ? 'Diminta Perbaikan' : 'Ditolak RW')}`,
                pesan: `Pengajuan ${jenisSurat} (${p.no_berkas || p.id}) warga RT ${targetRt} telah diproses oleh Ketua RW dengan status: ${p.status}.`,
                kategori: 'surat',
                type: 'info',
                link: `#/verifikasi-pengajuan`,
                channels: ['in_app'],
                eventId: `${p.id}-rt-final`
            });
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db:synced', { detail: { action: 'update_status', id: p.id, status: p.status } }));
    }

    return {
        success: true,
        status: p.status,
        data: p
    };
}
