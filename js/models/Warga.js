// js/models/Warga.js
import { getCollection, saveCollection } from '../utils/db.js';
import { getCurrentUser, ROLES } from './User.js';
import { callBackendApi } from '../services/apiClient.js';

export function calculateAge(tanggalLahir) {
    if (!tanggalLahir) return null;
    const birthDate = new Date(tanggalLahir);
    if (isNaN(birthDate.getTime())) return null;
    
    const currentYear = new Date().getFullYear();
    const birthYear = birthDate.getFullYear();
    const age = currentYear - birthYear;
    return age >= 0 ? age : 0;
}

// Single Source of Truth for citizen statistics
export function getWargaStatistics(scopedRt = null) {
    const warga = getCollection('warga') || [];
    const currentYear = new Date().getFullYear();

    const byRT = {};
    const byGender = { L: 0, P: 0 };
    const byStatus = { Tetap: 0, 'Kontrak/Kos': 0, Pindah: 0 };
    const byAge = { anak: 0, remaja: 0, dewasa: 0, lansia: 0, belum_terdata: 0 };
    const kkSet = new Set();

    warga.forEach(w => {
        const rt = w.rt ? String(w.rt).padStart(2, '0') : 'Lainnya';
        byRT[rt] = (byRT[rt] || 0) + 1;

        // Scoped stats if requested
        if (scopedRt && rt !== String(scopedRt).padStart(2, '0')) {
            return;
        }

        const jk = (w.jenis_kelamin || '').toUpperCase();
        if (jk === 'L') byGender.L++;
        else if (jk === 'P') byGender.P++;

        const st = (w.status || 'Tetap').toLowerCase();
        if (st.includes('kontrak') || st.includes('kos')) {
            byStatus['Kontrak/Kos']++;
        } else if (st.includes('pindah')) {
            byStatus['Pindah']++;
        } else {
            byStatus['Tetap']++;
        }

        const age = calculateAge(w.tanggal_lahir);
        if (age === null) {
            byAge.belum_terdata++;
        } else if (age <= 12) {
            byAge.anak++;
        } else if (age <= 18) {
            byAge.remaja++;
        } else if (age <= 59) {
            byAge.dewasa++;
        } else {
            byAge.lansia++;
        }

        if (w.no_kk) {
            kkSet.add(w.no_kk);
        }
    });

    const totalWarga = scopedRt 
        ? (byRT[String(scopedRt).padStart(2, '0')] || 0)
        : warga.length;

    return {
        totalWarga,
        byRT,
        byGender,
        byStatus,
        byAge,
        uniqueKK: kkSet.size
    };
}

export function getAllWarga(ignoreRole = false) {
    const user = getCurrentUser();
    let warga = getCollection('warga') || [];

    if (ignoreRole) {
        return warga;
    }

    // Role-based visibility
    if (user && user.role === ROLES.KETUA_RT) {
        return warga.filter(w => String(w.rt).padStart(2, '0') === String(user.rt).padStart(2, '0'));
    } else if (user && user.role === ROLES.WARGA) {
        return warga.filter(w => w.nik === user.nik);
    }

    return warga;
}

export function getWargaByNIK(nik) {
    const warga = getCollection('warga') || [];
    return warga.find(w => w.nik === nik) || null;
}

export async function addWarga(data) {
    const user = getCurrentUser();

    // Guard: Super Admin, Ketua RW, Ketua RT can add
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk menambah data warga.");
    }

    // Validate email if provided
    if (data.email && typeof data.email === 'string' && data.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
            throw new Error("Format alamat email tidak valid.");
        }
        data.email = data.email.trim();
    } else {
        data.email = '';
    }

    // Ketua RT restriction
    if (user.role === ROLES.KETUA_RT) {
        const userRt = String(user.rt).padStart(2, '0');
        const dataRt = String(data.rt).padStart(2, '0');
        if (userRt !== dataRt) {
            throw new Error(`Akses ditolak: Ketua RT hanya dapat menambah warga di wilayah RT ${userRt}.`);
        }
    }

    const warga = getCollection('warga') || [];

    // Check duplicate NIK
    if (warga.some(w => w.nik === data.nik)) {
        throw new Error("NIK sudah terdaftar di sistem.");
    }

    // Sync with backend API
    try {
        await callBackendApi('warga.php', { action: 'add', data: data });
    } catch (e) {
        // If backend returned business logic error, bubble it up
        if (e.message && (e.message.includes('NIK') || e.message.includes('Akses ditolak'))) {
            throw e;
        }
    }

    warga.push(data);
    saveCollection('warga', warga);
    return data;
}

export async function updateWarga(nik, data) {
    const user = getCurrentUser();

    // Guard: Super Admin, Ketua RW, Ketua RT can update
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user?.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk mengubah data warga.");
    }

    // Validate email if provided
    if (data.email && typeof data.email === 'string' && data.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
            throw new Error("Format alamat email tidak valid.");
        }
        data.email = data.email.trim();
    }

    const warga = getCollection('warga') || [];
    const index = warga.findIndex(w => w.nik === nik);

    if (index === -1) {
        throw new Error("Data warga tidak ditemukan.");
    }

    // Ketua RT territorial check
    if (user.role === ROLES.KETUA_RT) {
        const userRt = String(user.rt).padStart(2, '0');
        const currentRt = String(warga[index].rt).padStart(2, '0');
        if (userRt !== currentRt) {
            throw new Error(`Akses ditolak: Ketua RT hanya dapat mengubah data warga di RT ${userRt}.`);
        }
    }

    // Sync with backend API
    try {
        await callBackendApi('warga.php', { action: 'update', nik: nik, data: data });
    } catch (e) {
        if (e.message && e.message.includes('Akses ditolak')) {
            throw e;
        }
    }

    warga[index] = { ...warga[index], ...data };
    saveCollection('warga', warga);
    return warga[index];
}

export async function deleteWarga(nik, options = {}) {
    const user = getCurrentUser();

    if (!user) {
        throw new Error("Autentikasi diperlukan. Silakan login kembali.");
    }

    // Guard 1: Warga role cannot delete
    if (user.role === ROLES.WARGA) {
        throw new Error("Akses ditolak: Warga tidak memiliki hak untuk menghapus data kependudukan.");
    }

    // Guard 2: Super Admin, Ketua RW, Ketua RT only
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user.role)) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk menghapus data warga.");
    }

    let warga = getCollection('warga') || [];
    const targetWarga = warga.find(w => w.nik === nik);

    if (!targetWarga) {
        throw new Error(`Data warga dengan NIK ${nik} tidak ditemukan.`);
    }

    // Guard 3: Territorial authority check
    if (user.role === ROLES.KETUA_RT) {
        const userRt = String(user.rt).padStart(2, '0');
        const targetRt = String(targetWarga.rt).padStart(2, '0');
        if (userRt !== targetRt) {
            throw new Error(`Akses ditolak: Ketua RT hanya berwenang menghapus data warga dalam wilayah RT ${userRt}. Warga ini tercatat di RT ${targetRt}.`);
        }
    }

    // Guard 4: Active transaction / relation checks
    const pelayanan = getCollection('pelayanan') || [];
    const activePelayanan = pelayanan.filter(p => 
        p.nik_pemohon === nik && 
        ['Menunggu Verifikasi RT', 'Menunggu Persetujuan RW', 'Disetujui RT'].includes(p.status)
    );

    if (activePelayanan.length > 0 && !options.force) {
        throw new Error(`Warga masih memiliki ${activePelayanan.length} pengajuan surat aktif (${activePelayanan.map(p => p.id).join(', ')}). Selesaikan pengajuan terlebih dahulu sebelum menghapus data warga.`);
    }

    // 1. Call backend API for real server database deletion & validation
    try {
        await callBackendApi('warga.php', {
            action: 'delete',
            nik: nik,
            force: Boolean(options.force)
        });
    } catch (err) {
        // Bubble up backend validation error (e.g. 403 / 409)
        throw err;
    }

    // 2. Perform client-side storage removal
    warga = warga.filter(w => w.nik !== nik);
    saveCollection('warga', warga);

    // 3. Preserve administrative integrity in linked collections
    // Retain applicant name in pelayanan and pengaduan archive
    const updatedPelayanan = pelayanan.map(p => {
        if (p.nik_pemohon === nik && !p.nama_pemohon_arsip) {
            return {
                ...p,
                nama_pemohon_arsip: `${targetWarga.nama} (Data Warga Dihapus)`
            };
        }
        return p;
    });
    saveCollection('pelayanan', updatedPelayanan);

    const pengaduan = getCollection('pengaduan') || [];
    const updatedPengaduan = pengaduan.map(ad => {
        if (ad.nik_pelapor === nik && (!ad.nama_pelapor || !ad.nama_pelapor.includes('Dihapus'))) {
            return {
                ...ad,
                nama_pelapor: `${targetWarga.nama} (Data Warga Dihapus)`
            };
        }
        return ad;
    });
    saveCollection('pengaduan', updatedPengaduan);

    // Deactivate linked user account if exists
    const users = getCollection('users') || [];
    let usersUpdated = false;
    users.forEach(u => {
        if (u.nik === nik) {
            u.status = 'Nonaktif (Warga Dihapus)';
            usersUpdated = true;
        }
    });
    if (usersUpdated) {
        saveCollection('users', users);
    }

    return {
        success: true,
        deletedNik: nik,
        deletedNama: targetWarga.nama,
        remainingTotal: warga.length,
        statistics: getWargaStatistics()
    };
}
