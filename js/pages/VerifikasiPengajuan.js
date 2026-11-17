// js/pages/VerifikasiPengajuan.js
// Halaman Verifikasi Pengajuan Ketua RT (Filter HANYA warga di RT yang sama dengan Ketua RT yang login)
import { getCollection } from '../utils/db.js';
import { fetchPelayananFromBackend, isMenungguRT, isMenungguRW } from '../models/Pelayanan.js';
import { getCurrentUser } from '../models/User.js';
import { getWargaByNIK } from '../models/Warga.js';
import { renderStatusBadge } from '../utils/badge.js';

export function getCleanRT(val) {
    if (!val) return '';
    return String(val).replace(/^0+/, '').trim();
}

export function getRtPelayananList(customList = null) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    const allPelayanan = (Array.isArray(customList) && customList.length > 0) ? customList : (getCollection('pelayanan') || []);
    // Hapus dummy data lama jika ada
    const cleanPelayanan = allPelayanan.filter(item => item && item.id !== 'SRT-20260902-1002');

    const currentRT = String(currentUser.rt || '').replace(/^0+/, '');
    const rtList = cleanPelayanan.filter(item => {
        if (!item) return false;
        let itemRt = item.rt;
        if (!itemRt) {
            const pemohon = getWargaByNIK(item.nik || item.nik_pemohon);
            if (pemohon && pemohon.rt) itemRt = pemohon.rt;
        }
        return String(itemRt || '').replace(/^0+/, '') === currentRT;
    });

    // Urutkan dari yang terbaru (created_at descending)
    return rtList.sort((a, b) => {
        const timeA = new Date(a.created_at || a.tanggal_pengajuan || 0).getTime();
        const timeB = new Date(b.created_at || b.tanggal_pengajuan || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''));
    });
}

export const renderVerifikasiTable = renderTableRows;

export function renderTableRows(pelayananList) {
    if (!pelayananList || pelayananList.length === 0) {
        return `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">Belum ada berkas pengajuan warga di wilayah RT ini.</td></tr>`;
    }

    return pelayananList.map(p => {
        const date = new Date(p.tanggal_pengajuan || p.created_at || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
        
        let statusBadge = '';
        const st = (p.status || '').toLowerCase();
        if (isMenungguRW(p.status) || st === 'menunggu_verifikasi_rw' || st === 'menunggu persetujuan rw' || st === 'disetujui rt / menunggu verifikasi rw') {
            statusBadge = renderStatusBadge('Menunggu Verifikasi RW', 'Disetujui RT / Menunggu Verifikasi RW');
        } else if (isMenungguRT(p.status) || st === 'menunggu_verifikasi_rt' || st === 'menunggu verifikasi rt') {
            statusBadge = renderStatusBadge('Menunggu Verifikasi RT');
        } else {
            statusBadge = renderStatusBadge(p.status);
        }
        
        const pemohon = getWargaByNIK(p.nik || p.nik_pemohon);
        const namaPemohon = p.nama_pemohon && p.nama_pemohon !== 'undefined' ? p.nama_pemohon : (pemohon ? pemohon.nama : 'Warga');
        const jenisLayanan = p.jenis_surat || p.jenis_pelayanan || 'Pelayanan Surat';
        const rawRt = p.rt && p.rt !== 'undefined' ? p.rt : (pemohon ? pemohon.rt : '01');
        const rawRw = p.rw && p.rw !== 'undefined' ? p.rw : (pemohon ? pemohon.rw : '05');
        const rt = rawRt ? String(getCleanRT(rawRt)).padStart(2, '0') : '01';
        const rw = rawRw ? String(getCleanRT(rawRw)).padStart(2, '0') : '05';

        return `
            <tr class="pelayanan-row" data-id="${p.id}" data-nama="${namaPemohon.toLowerCase()}" data-jenis="${jenisLayanan.toLowerCase()}">
                <td style="font-family: monospace; font-weight: 700; color: var(--primary-color);">#${p.id}</td>
                <td>
                    <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.2rem; font-size: 0.9375rem;">${jenisLayanan}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph-bold ph-calendar"></i> ${date}
                    </div>
                </td>
                <td>
                    <div style="color: var(--text-main); font-weight: 700; margin-bottom: 0.2rem; font-size: 0.9375rem;">${namaPemohon}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: inline-block; padding: 2px 8px; background: var(--background-body); border-radius: 4px; font-weight: 600;">RT ${rt} / RW ${rw}</div>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td>
                    <a href="#/pelayanan/detail?id=${p.id}" class="btn btn-sm btn-outline" style="font-weight: 700; color: var(--primary-color); display: inline-flex; align-items: center; gap: 4px;">
                        <i class="ph-bold ph-eye"></i> Detail & Verifikasi
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

export function renderVerifikasiPengajuan() {
    const currentUser = getCurrentUser();
    const rtNumber = currentUser ? String(getCleanRT(currentUser.rt) || '1').padStart(2, '0') : '01';
    const rtList = getRtPelayananList();

    return `
        <div>
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Verifikasi Pengajuan Warga RT ${rtNumber}</h1>
                    <p class="page-subtitle">Verifikasi keabsahan dokumen permohonan surat warga di wilayah RT ${rtNumber} sebelum diteruskan ke Ketua RW.</p>
                </div>
            </div>

            <!-- Filter & Search Toolbar (DashStack Style) -->
            <div class="card mb-4" style="padding: 1rem 1.25rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 260px; max-width: 500px;">
                        <input type="text" id="searchPelayananInput" class="form-input" placeholder="🔍 Cari nama pemohon, jenis surat, nomor berkas..." style="padding: 8px 14px;">
                    </div>
                    <div id="totalPengajuanText" style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
                        Total Pengajuan: <strong id="totalPelayananCount" style="color: var(--text-main);">${rtList.length}</strong> data
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No. Berkas</th>
                            <th>Jenis Layanan</th>
                            <th>Pemohon</th>
                            <th>Status Pelayanan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="pelayananTableBody">
                        ${renderTableRows(rtList)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function setupVerifikasiPengajuanEvents() {
    const searchInput = document.getElementById('searchPelayananInput');
    const tableBody = document.getElementById('pelayananTableBody');
    const totalCountEl = document.getElementById('totalPelayananCount');
    const totalTextEl = document.getElementById('totalPengajuanText');

    const refreshTable = (customList = null) => {
        if (!tableBody) return;
        const freshList = getRtPelayananList(customList);
        if (totalCountEl) totalCountEl.textContent = `${freshList.length}`;
        if (totalTextEl) totalTextEl.innerHTML = `Total Pengajuan: <strong id="totalPelayananCount" style="color: var(--text-main);">${freshList.length}</strong> data`;
        tableBody.innerHTML = renderTableRows(freshList);
        if (searchInput && searchInput.value.trim()) {
            searchInput.dispatchEvent(new Event('input'));
        }
    };

    if (searchInput && tableBody) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            const rows = tableBody.querySelectorAll('.pelayanan-row');
            
            rows.forEach(row => {
                const id = row.getAttribute('data-id') || '';
                const nama = row.getAttribute('data-nama') || '';
                const jenis = row.getAttribute('data-jenis') || '';

                if (id.includes(query) || nama.includes(query) || jenis.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // 1. Baca koleksi data pelayanan dari state memori / localStorage secara sinkron terlebih dahulu (0 ms delay)
    refreshTable();

    // 2. Lakukan sinkronisasi background ke api/pelayanan.php tanpa memblokir render tabel awal
    setTimeout(() => {
        fetchPelayananFromBackend().then(freshData => {
            if (Array.isArray(freshData) && freshData.length > 0) {
                refreshTable(freshData);
            }
        }).catch(() => {});
    }, 600);

    // Mencegah penumpukan event listener saat navigasi berulang
    if (window._verifikasiPengajuanSyncHandler) {
        window.removeEventListener('db:synced', window._verifikasiPengajuanSyncHandler);
    }
    window._verifikasiPengajuanSyncHandler = () => refreshTable();
    window.addEventListener('db:synced', window._verifikasiPengajuanSyncHandler);
}
