import { getCollection, saveCollection } from '../utils/db.js';
import { getCurrentUser, ROLES, getUserByNik } from './User.js';
import { getWargaByNIK } from './Warga.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from './Notifikasi.js';
import { notifyStatusPengaduan } from '../services/notificationService.js';

export const KATEGORI_PENGADUAN = [
    'Infrastruktur',
    'Kebersihan',
    'Keamanan',
    'Administrasi',
    'Sosial',
    'Lainnya'
];

export const STATUS_PENGADUAN = {
    BARU: 'Baru',
    DIPROSES: 'Diproses',
    DITINDAKLANJUTI: 'Ditindaklanjuti',
    SELESAI: 'Selesai',
    DITOLAK: 'Ditolak'
};

import { callBackendApi } from '../services/apiClient.js';

export function resolvePelaporName(nik, fallbackName) {
    if (nik) {
        const warga = getWargaByNIK(nik);
        if (warga && warga.nama) return warga.nama;
        const u = getUserByNik(nik);
        if (u && (u.name || u.nama)) return u.name || u.nama;
    }
    if (fallbackName && fallbackName.toLowerCase() === 'agus') {
        return 'Julianda Saputra';
    }
    return fallbackName || 'Warga';
}

export function getAllPengaduan() {
    const pengaduan = getCollection('pengaduan') || [];
    const allWarga = getCollection('warga') || [];
    const allUsers = getCollection('users') || [];
    const wargaMap = new Map();
    allWarga.forEach(w => { if (w && w.nik) wargaMap.set(String(w.nik).trim(), w.nama || w.name); });
    allUsers.forEach(u => { if (u && u.nik && !wargaMap.has(String(u.nik).trim())) wargaMap.set(String(u.nik).trim(), u.name || u.nama); });

    pengaduan.forEach(p => {
        const cleanNik = String(p.nik_pelapor || '').trim();
        if (cleanNik && wargaMap.has(cleanNik)) {
            p.nama_pelapor = wargaMap.get(cleanNik);
        } else if (p.nama_pelapor && p.nama_pelapor.toLowerCase() === 'agus') {
            p.nama_pelapor = 'Julianda Saputra';
        } else if (!p.nama_pelapor) {
            p.nama_pelapor = 'Warga';
        }
    });
    return pengaduan.sort((a,b) => new Date(b.tanggal_pengaduan) - new Date(a.tanggal_pengaduan));
}

export function getPengaduanByNik(nik) {
    const pengaduan = getCollection('pengaduan') || [];
    return pengaduan
        .filter(p => p.nik_pelapor === nik)
        .map(p => {
            p.nama_pelapor = resolvePelaporName(p.nik_pelapor, p.nama_pelapor);
            return p;
        })
        .sort((a,b) => new Date(b.tanggal_pengaduan) - new Date(a.tanggal_pengaduan));
}

export function getPengaduanById(id) {
    const pengaduan = getCollection('pengaduan') || [];
    const item = pengaduan.find(p => p.id === id) || null;
    if (item) {
        item.nama_pelapor = resolvePelaporName(item.nik_pelapor, item.nama_pelapor);
    }
    return item;
}

export function createPengaduan(data) {
    const user = getCurrentUser();
    if (user.role !== ROLES.WARGA) {
        throw new Error("Hanya warga yang dapat membuat pengaduan.");
    }

    const userRt = user.rt ? String(user.rt).padStart(2, '0') : '01';
    const userRw = user.rw ? String(user.rw).padStart(2, '0') : '05';

    const pengaduan = getCollection('pengaduan') || [];
    
    const newPengaduan = {
        id: 'ADU-' + Date.now(),
        judul: data.judul,
        kategori: data.kategori,
        deskripsi: data.deskripsi,
        lokasi: data.lokasi,
        lampiran: data.lampiran || '',
        status: STATUS_PENGADUAN.BARU,
        tanggal_pengaduan: new Date().toISOString(),
        nik_pelapor: user.nik,
        nama_pelapor: resolvePelaporName(user.nik, user.name),
        rt: userRt,
        rw: userRw,
        tanggapan: []
    };

    pengaduan.unshift(newPengaduan);
    saveCollection('pengaduan', pengaduan);

    // Sync to backend asynchronously
    callBackendApi('pengaduan.php', {
        action: 'create',
        ...newPengaduan
    }).catch(e => console.warn('[Backend Pengaduan Sync Warn]', e));

    // 1. Notify Pelapor: Pengaduan diterima
    createNotifikasi({
        recipientId: user.id,
        recipientNik: user.nik,
        judul: `Pengaduan Diterima: ${data.judul}`,
        pesan: `Laporan pengaduan Anda mengenai "${data.judul}" (${newPengaduan.id}) telah berhasil dicatat. Pengurus akan segera memeriksa dan menindaklanjuti laporan Anda.`,
        kategori: KATEGORI_NOTIFIKASI.PENGADUAN,
        type: 'info',
        link: `#/pengaduan/detail?id=${newPengaduan.id}`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: `${newPengaduan.id}-created`
    });

    // 2. Notify Pengurus RT wilayah pelapor, Ketua RW, dan Super Admin
    createNotifikasi({
        target: 'pengurus',
        targetRole: 'rt',
        target_role: 'rt',
        targetRt: userRt,
        target_rt: userRt,
        targetRw: userRw,
        target_rw: userRw,
        judul: `Pengaduan Warga Baru: [${data.kategori}] ${data.judul}`,
        pesan: `Terdapat pengaduan baru dari warga ${newPengaduan.nama_pelapor} (RT ${userRt}) terkait ${data.kategori} di lokasi ${data.lokasi}. Silakan buka aplikasi Digital RW untuk meninjau detail dan memberikan tanggapan.`,
        kategori: 'pengaduan',
        type: 'warning',
        link: `#/pengaduan/detail?id=${newPengaduan.id}`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: `${newPengaduan.id}-to-pengurus`
    });

    return newPengaduan;
}

export async function updateStatusDanTanggapan(id, status, pesanTanggapan) {
    const user = getCurrentUser();
    // Berikan izin penuh kepada role Ketua RT, Ketua RW, dan Super Admin
    if (![ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN].includes(user?.role)) {
        throw new Error("Anda tidak memiliki hak untuk memberikan tanggapan.");
    }

    const pengaduan = getCollection('pengaduan') || [];
    const index = pengaduan.findIndex(p => p.id === id);
    
    if (index === -1) throw new Error("Pengaduan tidak ditemukan.");
    
    let isStatusChanged = pengaduan[index].status !== status;
    if (status) {
        pengaduan[index].status = status;
    }

    if (!Array.isArray(pengaduan[index].tanggapan)) {
        pengaduan[index].tanggapan = [];
    }
    
    const timestampNow = new Date().toISOString();
    const tanggapanId = 'TGP-' + Date.now();

    if (pesanTanggapan && pesanTanggapan.trim() !== '') {
        const itemTanggapan = {
            id: tanggapanId,
            penanggap: user.name || user.nama || 'Pengurus',
            nama_penanggap: user.name || user.nama || 'Pengurus',
            role: user.role,
            role_penanggap: user.role,
            pesan: pesanTanggapan.trim(),
            tanggal: timestampNow
        };
        pengaduan[index].tanggapan.push(itemTanggapan);
    }

    // Pastikan nama pelapor konsisten
    pengaduan[index].nama_pelapor = resolvePelaporName(pengaduan[index].nik_pelapor, pengaduan[index].nama_pelapor);

    saveCollection('pengaduan', pengaduan);

    // Simpan secara permanen ke backend API database.json
    try {
        await callBackendApi('pengaduan.php', {
            action: 'update_status',
            id: id,
            status: status,
            pesan: pesanTanggapan ? pesanTanggapan.trim() : ''
        });
    } catch (apiErr) {
        console.warn('[Backend Pengaduan API warning]', apiErr);
    }

    // Kirim notifikasi ke pelapor jika status berubah atau ada tanggapan baru
    if (isStatusChanged || (pesanTanggapan && pesanTanggapan.trim() !== '')) {
        const pelaporUser = getUserByNik(pengaduan[index].nik_pelapor);
        const pelaporWarga = getWargaByNIK(pengaduan[index].nik_pelapor);

        // Direct WhatsApp Fonnte Trigger - Dinonaktifkan karena pengiriman WhatsApp resmi ditangani 1x di backend (api/pengaduan.php)
        // notifyStatusPengaduan({
        //     pengaduan: pengaduan[index],
        //     status: status,
        //     pesanTanggapan: pesanTanggapan,
        //     pelaporWarga: pelaporWarga,
        //     penanggapName: user.name
        // }).catch(e => console.warn('[WhatsApp Pengaduan Error]', e));

        if (pelaporUser) {
            let statusBadge = status === STATUS_PENGADUAN.SELESAI ? 'Selesai Ditangani' : status;
            let pesanNotif = `Pengaduan Anda "${pengaduan[index].judul}" saat ini berstatus: ${statusBadge}.`;
            if (pesanTanggapan && pesanTanggapan.trim() !== '') {
                pesanNotif += `\nTanggapan Pengurus (${user.name}): "${pesanTanggapan}"`;
            }
            pesanNotif += `\nSilakan buka aplikasi untuk melihat rincian penanganan.`;

            // Kanal WhatsApp dinonaktifkan di sini untuk mengeliminasi duplikat pesan lonceng 🔔 ganda
            createNotifikasi({
                recipientId: pelaporUser.id,
                recipientNik: pelaporUser.nik,
                recipient_phone: pelaporWarga?.no_hp || '',
                judul: `Pembaruan Pengaduan: ${pengaduan[index].judul}`,
                pesan: pesanNotif,
                kategori: KATEGORI_NOTIFIKASI.PENGADUAN,
                type: status === STATUS_PENGADUAN.SELESAI ? 'success' : 'info',
                link: `#/pengaduan/detail?id=${id}`,
                channels: ['in_app', 'email'],
                eventId: `${id}-status-${Date.now()}`
            });
        }
    }

    return pengaduan[index];
}
