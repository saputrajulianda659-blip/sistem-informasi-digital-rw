// js/models/Kegiatan.js
import { getCollection, saveCollection } from '../utils/db.js';
import { getCurrentUser, ROLES } from './User.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from './Notifikasi.js';

const defaultKegiatan = [
    {
        id: 'KEG-1',
        nama: 'Rapat Koordinasi RT/RW',
        kategori: 'Rapat',
        tanggal: '2026-09-15',
        waktu: '19:30 WIB',
        lokasi: 'Balai Warga RW 05',
        status: 'Akan Datang',
        penyelenggara: 'Ketua RW 05',
        deskripsi: 'Pembahasan program kerja bulanan, evaluasi ketertiban lingkungan, dan pelaporan kas RW.'
    },
    {
        id: 'KEG-2',
        nama: 'Kerja Bakti Bulanan Lingkungan',
        kategori: 'Kerja Bakti',
        tanggal: '2026-09-05',
        waktu: '07:00 WIB',
        lokasi: 'Area Balai Warga & Lapangan Olahraga',
        status: 'Selesai',
        penyelenggara: 'Pengurus RT 01 & RT 02',
        deskripsi: 'Pembersihan gorong-gorong, pengangkutan sampah, dan pemangkasan dahan pohon rawan tumbang.'
    },
    {
        id: 'KEG-3',
        nama: 'Posyandu Balita & Lansia Melati',
        kategori: 'Kesehatan',
        tanggal: '2026-09-20',
        waktu: '08:30 WIB',
        lokasi: 'Poskesdes Balai RW 05',
        status: 'Akan Datang',
        penyelenggara: 'Kader PKK & Puskesmas',
        deskripsi: 'Penimbangan balita, imunisasi berkala, pemeriksaan tensi gratis, serta pembagian makanan bergizi.'
    },
    {
        id: 'KEG-4',
        nama: 'Senam Sehat Warga Akhir Pekan',
        kategori: 'Olahraga',
        tanggal: '2026-09-27',
        waktu: '06:00 WIB',
        lokasi: 'Lapangan Olahraga RW 05',
        status: 'Akan Datang',
        penyelenggara: 'Karang Taruna RW 05',
        deskripsi: 'Senam aerobik bersama seluruh warga RW 05 untuk menjaga kebugaran jasmani dan silaturahmi.'
    }
];

export function getAllKegiatan() {
    let list = getCollection('kegiatan');
    if (!list || list.length === 0) {
        saveCollection('kegiatan', defaultKegiatan);
        list = defaultKegiatan;
    }
    return list;
}

export function getKegiatanById(id) {
    const list = getAllKegiatan();
    return list.find(k => k.id === id) || null;
}

export function createKegiatan(data) {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user?.role)) {
        throw new Error('Akses ditolak: Hanya Ketua RW dan Ketua RT yang dapat menambah kegiatan.');
    }
    const list = getAllKegiatan();
    const newItem = {
        id: 'KEG-' + Date.now(),
        nama: data.nama,
        kategori: data.kategori || 'Umum',
        tanggal: data.tanggal,
        waktu: data.waktu || '08:00 WIB',
        lokasi: data.lokasi || 'Wilayah RW 05',
        status: data.status || 'Akan Datang',
        penyelenggara: data.penyelenggara || user?.name || user?.role || 'Pengurus RW/RT',
        deskripsi: data.deskripsi || ''
    };
    list.unshift(newItem);
    saveCollection('kegiatan', list);

    // Notify citizens about new activity schedule across in-app, email, and WhatsApp
    createNotifikasi({
        target: 'all',
        judul: `Agenda Kegiatan Baru: ${newItem.nama}`,
        pesan: `Kegiatan "${newItem.nama}" (${newItem.kategori}) akan diselenggarakan pada ${newItem.tanggal}, pukul ${newItem.waktu}.\nLokasi: ${newItem.lokasi}.\nCatatan: ${newItem.deskripsi || '-'}\nMari berpartisipasi aktif demi kebersamaan lingkungan!`,
        kategori: KATEGORI_NOTIFIKASI.KEGIATAN,
        type: 'info',
        link: `#/monitoring-kegiatan`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: newItem.id
    });

    return newItem;
}

export function updateKegiatan(id, data) {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user?.role)) {
        throw new Error('Akses ditolak: Hanya Ketua RW dan Ketua RT yang dapat mengubah kegiatan.');
    }
    let list = getAllKegiatan();
    const idx = list.findIndex(k => k.id === id);
    if (idx === -1) throw new Error('Kegiatan tidak ditemukan.');
    
    const isScheduleChanged = list[idx].tanggal !== data.tanggal || list[idx].waktu !== data.waktu || list[idx].lokasi !== data.lokasi;
    
    list[idx] = { ...list[idx], ...data };
    saveCollection('kegiatan', list);

    // If schedule or details changed, dispatch update notification
    if (isScheduleChanged) {
        createNotifikasi({
            target: 'all',
            judul: `Pembaruan Jadwal Kegiatan: ${list[idx].nama}`,
            pesan: `Jadwal kegiatan "${list[idx].nama}" telah diperbarui menjadi:\nTanggal: ${list[idx].tanggal}, Pukul: ${list[idx].waktu}\nLokasi: ${list[idx].lokasi}.\nSilakan sesuaikan agenda kehadiran Anda.`,
            kategori: KATEGORI_NOTIFIKASI.KEGIATAN,
            type: 'warning',
            link: `#/monitoring-kegiatan`,
            channels: ['in_app', 'email', 'whatsapp'],
            eventId: `${list[idx].id}-update-${Date.now()}`
        });
    }

    return list[idx];
}

export function deleteKegiatan(id) {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user?.role)) {
        throw new Error('Akses ditolak: Hanya Ketua RW dan Ketua RT yang dapat menghapus kegiatan.');
    }
    let list = getAllKegiatan();
    const target = list.find(k => k.id === id);
    list = list.filter(k => k.id !== id);
    saveCollection('kegiatan', list);

    if (target) {
        createNotifikasi({
            target: 'all',
            judul: `Pembatalan Kegiatan: ${target.nama}`,
            pesan: `Diinformasikan bahwa agenda kegiatan "${target.nama}" yang sedianya diadakan pada ${target.tanggal} telah dibatalkan oleh pengurus.`,
            kategori: KATEGORI_NOTIFIKASI.KEGIATAN,
            type: 'warning',
            link: `#/monitoring-kegiatan`,
            channels: ['in_app', 'email', 'whatsapp'],
            eventId: `${id}-cancelled`
        });
    }
}

// Function to send event reminder
export function sendKegiatanReminder(id) {
    const k = getKegiatanById(id);
    if (!k) return;

    createNotifikasi({
        target: 'all',
        judul: `Pengingat Kegiatan: ${k.nama}`,
        pesan: `Pengingat: Kegiatan "${k.nama}" akan dimulai pada ${k.tanggal}, pukul ${k.waktu}.\nLokasi: ${k.lokasi}.\nJangan lupa untuk hadir tepat waktu!`,
        kategori: KATEGORI_NOTIFIKASI.KEGIATAN,
        type: 'info',
        link: `#/monitoring-kegiatan`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: `${k.id}-reminder-${k.tanggal}`
    });
}
