// js/pages/DetailWarga.js
import { getWargaByNIK } from '../models/Warga.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { getCollection, saveCollection } from '../utils/db.js';
import { getApiUrl } from '../services/apiClient.js';

function formatTtl(tempat, tanggal) {
    if (!tempat && !tanggal) return '-';
    const tglStr = tanggal
        ? new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    return [tempat, tglStr].filter(Boolean).join(', ') || '-';
}

export function renderDetailWarga() {
    let nik = null;
    const hash = window.location.hash || '';
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
        const params = new URLSearchParams(hash.substring(queryIdx));
        nik = params.get('nik');
    }
    const user = getCurrentUser() || {};
    if (!nik && user.role === ROLES.WARGA && user.nik) {
        nik = user.nik;
    }

    // Access control for WARGA
    if (user.role === ROLES.WARGA && user.nik && nik && user.nik !== nik) {
        return `
            <div class="card">
                <p class="text-danger">Akses ditolak: Anda hanya dapat melihat profil Anda sendiri.</p>
                <a href="#/dashboard" class="btn btn-primary mt-4">Kembali ke Dashboard</a>
            </div>
        `;
    }

    const warga = getWargaByNIK(nik) || {};
    const pekerjaan = warga.pekerjaan || '-';
    const agama = warga.agama || '-';
    const ttlFormatted = formatTtl(warga.tempat_lahir, warga.tanggal_lahir);

    return `
        <div id="detailWargaContainer" data-nik="${nik || ''}">
            <div class="flex items-center gap-4 mb-4">
                <a href="${user.role === ROLES.WARGA ? '#/dashboard' : '#/data-warga'}" class="btn btn-secondary btn-back"><i class="ph ph-arrow-left"></i> Kembali</a>
                <h1 class="text-2xl font-bold">Detail Profil Warga</h1>
            </div>
            
            <div class="card" style="max-width: 800px;">
                <div style="display: flex; align-items: flex-start; gap: 2rem; margin-bottom: 2rem;">
                    <div style="width: 100px; height: 100px; border-radius: var(--radius-full); background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                        <i class="ph-fill ph-user"></i>
                    </div>
                    <div>
                        <h2 id="detailWargaNama" style="font-size: 1.5rem; font-weight: 700;">${warga.nama || 'Memuat profil...'}</h2>
                        <p class="text-muted" style="margin-bottom: 0.5rem;">NIK: <span id="detailWargaNik">${warga.nik || nik || '-'}</span></p>
                        <span id="detailWargaStatus" style="padding: 0.25rem 0.75rem; background: var(--success-color); color: white; border-radius: var(--radius-full); font-size: 0.75rem;">${warga.status || warga.status_warga || 'Tetap'}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Nomor Kartu Keluarga (KK)</p>
                        <p id="detailWargaNoKk" class="font-bold">${warga.no_kk || '-'}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Tempat, Tanggal Lahir</p>
                        <p id="detailWargaTtl" class="font-bold">${ttlFormatted}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Jenis Kelamin</p>
                        <p id="detailWargaGender" class="font-bold">${warga.jenis_kelamin === 'L' ? 'Laki-laki' : (warga.jenis_kelamin === 'P' ? 'Perempuan' : '-')}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Nomor HP</p>
                        <p id="detailWargaNoHp" class="font-bold">${warga.no_hp || warga.telepon || '-'}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Alamat Email</p>
                        <p id="detailWargaEmail" class="font-bold" style="color: var(--primary-color);">${warga.email || '-'}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Pekerjaan</p>
                        <p id="detailWargaPekerjaan" class="font-bold">${pekerjaan}</p>
                    </div>
                    <div>
                        <p class="text-muted" style="font-size: 0.875rem;">Agama</p>
                        <p id="detailWargaAgama" class="font-bold">${agama}</p>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <p class="text-muted" style="font-size: 0.875rem;">Alamat Lengkap</p>
                        <p id="detailWargaAlamat" class="font-bold">${warga.alamat || '-'}</p>
                        <p id="detailWargaWilayah" class="font-bold">RT ${warga.rt || '01'} / RW ${warga.rw || '05'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function setupDetailWargaEvents() {
    let nik = null;
    const hash = window.location.hash || '';
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
        const params = new URLSearchParams(hash.substring(queryIdx));
        nik = params.get('nik');
    }
    const user = getCurrentUser() || {};
    if (!nik && user.role === ROLES.WARGA && user.nik) {
        nik = user.nik;
    }
    if (!nik) return;

    try {
        let freshWarga = null;

        // 1. Selalu lakukan request fresh ke backend dengan parameter dan header anti-cache
        try {
            const endpointUrl = typeof getApiUrl === 'function' ? getApiUrl(`warga.php?nik=${encodeURIComponent(nik)}`) : `api/warga.php?nik=${encodeURIComponent(nik)}`;
            const res = await fetch(`${endpointUrl}${endpointUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data) {
                    freshWarga = json.data;
                }
            }
        } catch (e) {
            console.warn('[DetailWarga] Fetch api/warga.php fallback:', e);
        }

        // Fallback: fetch langsung dari api/database.json anti-cache
        if (!freshWarga) {
            try {
                const dbUrl = typeof getApiUrl === 'function' ? getApiUrl('database.json') : 'api/database.json';
                const resDb = await fetch(`${dbUrl}${dbUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                if (resDb.ok) {
                    const dbData = await resDb.json();
                    if (dbData && Array.isArray(dbData.warga)) {
                        freshWarga = dbData.warga.find(w => w.nik === nik);
                    }
                }
            } catch (eDb) {
                console.warn('[DetailWarga] Fetch database.json fallback:', eDb);
            }
        }

        if (freshWarga) {
            // Update cache lokal agar konsisten di seluruh aplikasi
            const wargaList = getCollection('warga') || [];
            const idx = wargaList.findIndex(w => w.nik === nik);
            if (idx !== -1) {
                wargaList[idx] = { ...wargaList[idx], ...freshWarga };
            } else {
                wargaList.push(freshWarga);
            }
            saveCollection('warga', wargaList);

            // Render data langsung dari state hasil fetch terbaru ke elemen DOM
            const elNama = document.getElementById('detailWargaNama');
            const elNik = document.getElementById('detailWargaNik');
            const elStatus = document.getElementById('detailWargaStatus');
            const elNoKk = document.getElementById('detailWargaNoKk');
            const elTtl = document.getElementById('detailWargaTtl');
            const elGender = document.getElementById('detailWargaGender');
            const elNoHp = document.getElementById('detailWargaNoHp');
            const elEmail = document.getElementById('detailWargaEmail');
            const elPekerjaan = document.getElementById('detailWargaPekerjaan');
            const elAgama = document.getElementById('detailWargaAgama');
            const elAlamat = document.getElementById('detailWargaAlamat');
            const elWilayah = document.getElementById('detailWargaWilayah');

            if (elNama && freshWarga.nama) elNama.innerText = freshWarga.nama;
            if (elNik) elNik.innerText = freshWarga.nik || nik;
            if (elStatus) elStatus.innerText = freshWarga.status || freshWarga.status_warga || 'Tetap';
            if (elNoKk) elNoKk.innerText = freshWarga.no_kk || '-';
            if (elTtl) elTtl.innerText = formatTtl(freshWarga.tempat_lahir, freshWarga.tanggal_lahir);
            if (elGender) elGender.innerText = freshWarga.jenis_kelamin === 'L' ? 'Laki-laki' : (freshWarga.jenis_kelamin === 'P' ? 'Perempuan' : '-');
            if (elNoHp) elNoHp.innerText = freshWarga.no_hp || freshWarga.telepon || '-';
            if (elEmail) elEmail.innerText = freshWarga.email || '-';
            if (elPekerjaan) elPekerjaan.innerText = freshWarga.pekerjaan || '-';
            if (elAgama) elAgama.innerText = freshWarga.agama || '-';
            if (elAlamat) elAlamat.innerText = freshWarga.alamat || '-';
            if (elWilayah) elWilayah.innerText = `RT ${freshWarga.rt || '01'} / RW ${freshWarga.rw || '05'}`;
        }
    } catch (err) {
        console.error('[DetailWarga] Error saat memuat data warga:', err);
    }
}
