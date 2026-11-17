// js/pages/StatusPengajuan.js
// Halaman Riwayat Pengajuan Pelayanan Warga (Filter HANYA berkas milik pemohon)
import { getCollection } from '../utils/db.js';
import { fetchPelayananFromBackend, isMenungguRT, isMenungguRW } from '../models/Pelayanan.js';
import { getCurrentUser } from '../models/User.js';
import { renderStatusBadge } from '../utils/badge.js';

export function getCleanRT(val) {
    if (!val) return '';
    return String(val).replace(/^0+/, '').trim();
}

export function getWargaPelayananList(customList = null) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    const dataPelayanan = Array.isArray(customList) ? customList : (getCollection('pelayanan') || []);
    // HAPUS logic array fallback default (dummy data SRT-20260902-1002 dsb)
    const cleanPelayanan = dataPelayanan.filter(item => item && item.id !== 'SRT-20260902-1002');
    
    const userNik = String(currentUser.nik || '').trim();
    const userNikClean = getCleanRT(userNik);

    // Filter HANYA berkas yang NIK-nya sama dengan akun warga login (Sama untuk Warga RT 01 & RT 02):
    const listSaya = cleanPelayanan.filter(item => {
        if (!item) return false;
        const itemNik = String(item.nik || item.nik_pemohon || '').trim();
        return (itemNik && itemNik === userNik) || (userNikClean !== '' && getCleanRT(itemNik) === userNikClean);
    });

    // Urutkan dari yang terbaru (created_at descending)
    return listSaya.sort((a, b) => {
        const timeA = new Date(a.created_at || a.tanggal_pengajuan || 0).getTime();
        const timeB = new Date(b.created_at || b.tanggal_pengajuan || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''));
    });
}

export function renderTableRows(pelayananList) {
    if (!pelayananList || pelayananList.length === 0) {
        return `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">Belum ada riwayat pengajuan surat.</td></tr>`;
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
        
        const namaPemohon = p.nama_pemohon || 'Warga';
        const jenisLayanan = p.jenis_surat || p.jenis_pelayanan || 'Pelayanan Surat';
        const rt = p.rt ? String(getCleanRT(p.rt)).padStart(2, '0') : '01';
        const rw = p.rw ? String(getCleanRT(p.rw)).padStart(2, '0') : '05';

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
                        <i class="ph-bold ph-eye"></i> Detail
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

export function renderStatusPengajuan() {
    const listSaya = getWargaPelayananList();

    return `
        <div>
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Riwayat Pengajuan Pelayanan Saya</h1>
                    <p class="page-subtitle">Pantau progres verifikasi RT, persetujuan RW, dan pencetakan dokumen surat administrasi.</p>
                </div>
                <div>
                    <a href="#/pengajuan-pelayanan" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                        <i class="ph-bold ph-plus"></i> Ajukan Surat Baru
                    </a>
                </div>
            </div>

            <!-- Filter & Search Toolbar (DashStack Style) -->
            <div class="card mb-4" style="padding: 1rem 1.25rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 260px; max-width: 500px;">
                        <input type="text" id="searchPelayananInput" class="form-input" placeholder="🔍 Cari nama pemohon, jenis surat, nomor berkas..." style="padding: 8px 14px;">
                    </div>
                    <div id="totalPengajuanText" style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
                        Total Pengajuan: <strong id="totalPelayananCount" style="color: var(--text-main);">${listSaya.length}</strong> data
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
                        ${renderTableRows(listSaya)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function setupStatusPengajuanEvents() {
    const searchInput = document.getElementById('searchPelayananInput');
    const tableBody = document.getElementById('pelayananTableBody');
    const totalCountEl = document.getElementById('totalPelayananCount');
    const totalTextEl = document.getElementById('totalPengajuanText');

    const refreshTable = (customData = null) => {
        if (!tableBody) return;
        const freshList = getWargaPelayananList(customData);
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
        fetchPelayananFromBackend().then((freshData) => {
            if (Array.isArray(freshData) && freshData.length > 0) {
                refreshTable(freshData);
            }
        }).catch(() => {});
    }, 600);

    // Mencegah penumpukan event listener saat navigasi berulang
    if (window._statusPengajuanSyncHandler) {
        window.removeEventListener('db:synced', window._statusPengajuanSyncHandler);
    }
    window._statusPengajuanSyncHandler = () => refreshTable();
    window.addEventListener('db:synced', window._statusPengajuanSyncHandler);
}

// Backward-compatible exports
export const renderPelayananList = renderStatusPengajuan;
export const setupPelayananListEvents = setupStatusPengajuanEvents;
