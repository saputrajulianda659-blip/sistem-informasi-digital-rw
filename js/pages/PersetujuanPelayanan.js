// js/pages/PersetujuanPelayanan.js
// Halaman Persetujuan Pelayanan Ketua RW (RW membawahi semua RT, tampilkan semua berkas dari RT 01, RT 02, dst., yang statusnya sudah disetujui RT / Menunggu RW)
import { getCollection } from '../utils/db.js';
import { fetchPelayananFromBackend, isMenungguRT, isMenungguRW } from '../models/Pelayanan.js';
import { getCurrentUser } from '../models/User.js';
import { renderStatusBadge } from '../utils/badge.js';

export function getRwPelayananList() {
    const allPelayanan = getCollection('pelayanan') || [];

    // RW membawahi semua RT, tampilkan semua berkas dari RT 01, RT 02, dst., yang statusnya sudah disetujui RT
    const rwList = allPelayanan.filter(item => {
        const st = String(item.status || '').toLowerCase();
        return isMenungguRW(item.status) || 
               st.includes('disetujui rt') || 
               st.includes('menunggu verifikasi rw') ||
               st.includes('menunggu persetujuan rw') ||
               st.includes('selesai') ||
               st.includes('ditolak rw');
    });

    // Urutkan dari yang terbaru
    return rwList.sort((a, b) => {
        const timeA = new Date(a.tanggal_pengajuan || a.created_at || 0).getTime();
        const timeB = new Date(b.tanggal_pengajuan || b.created_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''));
    });
}

export function renderTableRows(pelayananList) {
    if (!pelayananList || pelayananList.length === 0) {
        return `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">Belum ada berkas pengajuan yang menunggu persetujuan RW.</td></tr>`;
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
        const rt = p.rt || '01';
        const rw = p.rw || '05';

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
                        <i class="ph-bold ph-eye"></i> Detail & Tanda Tangan
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

export function renderPersetujuanPelayanan() {
    const rwList = getRwPelayananList();

    return `
        <div>
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Persetujuan Pelayanan RW</h1>
                    <p class="page-subtitle">Verifikasi akhir dan penandatanganan pengesahan surat warga dari seluruh RT (RT 01, RT 02, dst.) yang telah diverifikasi oleh Ketua RT.</p>
                </div>
            </div>

            <!-- Filter & Search Toolbar (DashStack Style) -->
            <div class="card mb-4" style="padding: 1rem 1.25rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 260px; max-width: 500px;">
                        <input type="text" id="searchPelayananInput" class="form-input" placeholder="🔍 Cari nama pemohon, jenis surat, nomor berkas..." style="padding: 8px 14px;">
                    </div>
                    <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
                        Total Pengajuan: <strong id="totalPelayananCount" style="color: var(--text-main);">${rwList.length}</strong> data
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
                        ${renderTableRows(rwList)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function setupPersetujuanPelayananEvents() {
    const searchInput = document.getElementById('searchPelayananInput');
    const tableBody = document.getElementById('pelayananTableBody');
    const totalCountEl = document.getElementById('totalPelayananCount');

    const refreshTable = () => {
        if (!tableBody) return;
        const freshList = getRwPelayananList();
        if (totalCountEl) totalCountEl.textContent = `${freshList.length}`;
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

    // Pengambilan data terbaru di latar belakang (tanpa memblokir render tabel awal)
    setTimeout(() => {
        fetchPelayananFromBackend().then(() => {
            refreshTable();
        }).catch(() => {
            refreshTable();
        });
    }, 600);

    // Mencegah penumpukan event listener saat navigasi berulang
    if (window._persetujuanPelayananSyncHandler) {
        window.removeEventListener('db:synced', window._persetujuanPelayananSyncHandler);
    }
    window._persetujuanPelayananSyncHandler = () => refreshTable();
    window.addEventListener('db:synced', window._persetujuanPelayananSyncHandler);
}
