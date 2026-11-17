// js/models/Kas.js
import { getCollection, saveCollection } from '../utils/db.js';
import { getCurrentUser, ROLES, getUserByNik } from './User.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from './Notifikasi.js';

import { callBackendApi } from '../services/apiClient.js';

export function getKasSummary(scopedRt = null) {
    const user = getCurrentUser();
    const kas = getCollection('kas') || getCollection('kas_iuran') || [];
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    let targetRt = scopedRt;
    // Warga dan Ketua RT otomatis terkunci hanya melihat RT mereka sendiri
    if (user && (user.role === ROLES.KETUA_RT || user.role === ROLES.WARGA)) {
        targetRt = user.rt || '01';
    }

    kas.forEach(k => {
        const kRt = k.rt ? String(k.rt).padStart(2, '0') : '01';
        if (targetRt && targetRt !== 'all' && targetRt !== 'semua' && kRt !== String(targetRt).padStart(2, '0')) {
            return;
        }

        const nom = Number(k.nominal) || 0;
        const j = String(k.jenis || k.tipe || '').toLowerCase();
        if (j === 'pemasukan' || j === 'masuk') {
            totalPemasukan += nom;
        } else if (j === 'pengeluaran' || j === 'keluar') {
            totalPengeluaran += nom;
        }
    });

    const totalSaldo = totalPemasukan - totalPengeluaran;
    return {
        totalPemasukan,
        totalPengeluaran,
        totalSaldo
    };
}

export function getAllKas(scopedRt = null) {
    const user = getCurrentUser();
    const kas = getCollection('kas') || getCollection('kas_iuran') || [];
    
    // Sort newest first
    kas.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    if (!user) return [];

    let effectiveRt = scopedRt;
    // Warga dan Ketua RT otomatis terisolasi hanya pada RT masing-masing
    if (user.role === ROLES.KETUA_RT || user.role === ROLES.WARGA) {
        effectiveRt = user.rt || '01';
    }

    if (effectiveRt && effectiveRt !== 'all' && effectiveRt !== 'semua') {
        return kas.filter(k => {
            const kRt = k.rt ? String(k.rt).padStart(2, '0') : '01';
            return kRt === String(effectiveRt).padStart(2, '0');
        });
    } else {
        // Ketua RW / Super Admin / Admin RW dapat melihat seluruh RW
        return kas;
    }
}

export async function createKas(data) {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN].includes(user?.role)) {
        throw new Error("Hanya pengurus yang dapat menambahkan transaksi kas.");
    }

    const kas = getCollection('kas') || getCollection('kas_iuran') || [];
    const nominal = parseInt(data.nominal);
    const id = `KAS-${Date.now()}`;
    
    const newKas = {
        id,
        jenis: data.jenis, // 'Pemasukan' | 'Pengeluaran'
        tipe: data.tipe,
        nominal: nominal,
        tanggal: new Date(data.tanggal).toISOString(),
        keterangan: data.keterangan,
        nik_warga: data.nik_warga || '',
        rt: data.rt || user.rt || '01',
        rw: data.rw || user.rw || '05'
    };

    kas.unshift(newKas);
    saveCollection('kas', kas);
    saveCollection('kas_iuran', kas);

    // Sync to backend API kas.php and wait for updated summary
    try {
        const res = await callBackendApi('kas.php', {
            action: 'create',
            ...newKas
        });
        if (res && res.summary) {
            saveCollection('total_pemasukan', res.summary.total_pemasukan);
            saveCollection('total_pengeluaran', res.summary.total_pengeluaran);
            saveCollection('total_saldo', res.summary.total_saldo);
        }
    } catch(e) {
        console.warn('[Backend Kas API Sync Error]', e);
    }

    // Dispatch realtime event so any open cards or tabs update instantly
    window.dispatchEvent(new CustomEvent('kas:updated', { detail: newKas }));

    // If this is a resident dues payment (Pemasukan), notify the payer
    if (newKas.jenis === 'Pemasukan' && newKas.nik_warga) {
        const wargaUser = getUserByNik(newKas.nik_warga);
        if (wargaUser) {
            createNotifikasi({
                recipientId: wargaUser.id,
                recipientNik: wargaUser.nik,
                judul: `Konfirmasi Pembayaran Kas / Iuran`,
                pesan: `Terima kasih! Pembayaran ${newKas.tipe} sebesar Rp ${nominal.toLocaleString('id-ID')} (${newKas.keterangan}) telah berhasil dicatat oleh pengurus RT ${newKas.rt}.`,
                kategori: KATEGORI_NOTIFIKASI.KAS,
                type: 'success',
                link: `#/kas-iuran`,
                channels: ['in_app', 'email', 'whatsapp'],
                eventId: `${id}-receipt`
            });
        }
    }

    return newKas;
}

export async function deleteKas(id) {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.ADMIN_RW, ROLES.SUPER_ADMIN].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk menghapus data kas.");
    }
    
    let kas = getCollection('kas') || getCollection('kas_iuran') || [];
    kas = kas.filter(k => k.id !== id);
    saveCollection('kas', kas);
    saveCollection('kas_iuran', kas);

    try {
        const res = await callBackendApi('kas.php', {
            action: 'delete',
            id: id
        });
        if (res && res.summary) {
            saveCollection('total_pemasukan', res.summary.total_pemasukan);
            saveCollection('total_pengeluaran', res.summary.total_pengeluaran);
            saveCollection('total_saldo', res.summary.total_saldo);
        }
    } catch(e) {
        console.warn('[Backend Kas Delete Error]', e);
    }

    window.dispatchEvent(new CustomEvent('kas:updated', { detail: { id, deleted: true } }));
}

// Function to send polite dues payment reminder to residents of an RT
export function sendIuranReminder(targetRt = '01', nominal = 50000, periode = 'Bulan Ini') {
    const user = getCurrentUser();
    if (![ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user?.role)) {
        throw new Error("Akses ditolak: Hanya pengurus yang dapat mengirimkan pengingat iuran.");
    }

    const rtStr = String(targetRt).padStart(2, '0');
    createNotifikasi({
        target: `rt_${rtStr}`,
        judul: `Pengingat Pembayaran Iuran Warga RT ${rtStr}`,
        pesan: `Diinformasikan kepada warga RT ${rtStr}, mohon untuk melakukan penyetoran iuran kebersihan & keamanan (${periode}) sebesar Rp ${nominal.toLocaleString('id-ID')} kepada bendahara RT. Terima kasih atas partisipasi aktif Anda.`,
        kategori: KATEGORI_NOTIFIKASI.KAS,
        type: 'info',
        link: `#/kas-iuran`,
        channels: ['in_app', 'email', 'whatsapp'],
        eventId: `REMINDER-IURAN-RT${rtStr}-${Date.now()}`
    });
}
