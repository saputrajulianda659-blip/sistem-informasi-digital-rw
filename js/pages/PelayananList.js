// js/pages/PelayananList.js
import { getAllPelayanan, fetchPelayananFromBackend, isMenungguRT, isMenungguRW, STATUS_PELAYANAN } from '../models/Pelayanan.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { renderStatusBadge } from '../utils/badge.js';

function renderTableRows(pelayananList) {
    if (!pelayananList || pelayananList.length === 0) {
        return `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">Belum ada data pengajuan surat.</td></tr>`;
    }

    // Sort newest first (descending berdasarkan tanggal/created_at atau id berkas)
    const sorted = [...pelayananList].sort((a, b) => {
        const timeA = new Date(a.tanggal_pengajuan || a.created_at || 0).getTime();
        const timeB = new Date(b.tanggal_pengajuan || b.created_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''));
    });

    return sorted.map(p => {
        const date = new Date(p.tanggal_pengajuan).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

        // Global pill status badge
        let statusBadge = '';
        const st = (p.status || '').toLowerCase();
        if (isMenungguRW(p.status) || st === 'menunggu_verifikasi_rw' || st === 'menunggu persetujuan rw' || st === 'disetujui rt / menunggu verifikasi rw') {
            statusBadge = renderStatusBadge('Menunggu Verifikasi RW', 'Disetujui RT / Menunggu Verifikasi RW');
        } else if (isMenungguRT(p.status) || st === 'menunggu_verifikasi_rt' || st === 'menunggu verifikasi rt') {
            statusBadge = renderStatusBadge('Menunggu Verifikasi RT');
        } else {
            statusBadge = renderStatusBadge(p.status);
        }

        return `
            <tr class="pelayanan-row" data-id="${p.id}" data-nama="${(p.nama_pemohon || '').toLowerCase()}" data-jenis="${(p.jenis_pelayanan || '').toLowerCase()}">
                <td style="font-family: monospace; font-weight: 700; color: var(--primary-color);">#${p.id}</td>
                <td>
                    <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.2rem; font-size: 0.9375rem;">${p.jenis_pelayanan}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph-bold ph-calendar"></i> ${date}
                    </div>
                </td>
                <td>
                    <div style="color: var(--text-main); font-weight: 700; margin-bottom: 0.2rem; font-size: 0.9375rem;">${p.nama_pemohon}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: inline-block; padding: 2px 8px; background: var(--background-body); border-radius: 4px; font-weight: 600;">RT ${p.rt} / RW ${p.rw}</div>
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

export function getFilteredPelayananList() {
    const user = getCurrentUser();
    if (!user) return [];

    const hash = (typeof window !== 'undefined' && window.location.hash) ? window.location.hash : '';
    const allPelayanan = getAllPelayanan();

    if (hash.includes('status-pengajuan') || user.role === ROLES.WARGA) {
        return allPelayanan.filter(item =>
            String(item.nik || item.nik_pemohon || '').trim() === String(user.nik || '').trim()
        );
    } else if (hash.includes('verifikasi-pengajuan') || user.role === ROLES.KETUA_RT) {
        const userRT = String(user.rt || '').replace(/^0+/, '');
        return allPelayanan.filter(item => {
            const itemRT = String(item.rt || '').replace(/^0+/, '');
            return userRT === itemRT;
        });
    } else if (hash.includes('persetujuan-pelayanan') || user.role === ROLES.KETUA_RW) {
        return allPelayanan.filter(item => {
            const st = String(item.status || '').toLowerCase();
            return isMenungguRW(item.status) ||
                st.includes('disetujui rt') ||
                st.includes('menunggu verifikasi rw') ||
                st.includes('menunggu persetujuan rw') ||
                st.includes('selesai') ||
                st.includes('ditolak rw');
        });
    }

    return allPelayanan;
}

export function renderPelayananList() {
    const user = getCurrentUser();
    const pelayananList = getFilteredPelayananList();

    // Check permissions for Add button
    const isWarga = user && user.role === ROLES.WARGA;
    const btnAddHtml = isWarga
        ? `<a href="#/pengajuan-pelayanan" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
             <i class="ph-bold ph-plus"></i> Ajukan Surat Baru
           </a>`
        : '';

    let title = 'Daftar Pengajuan Pelayanan';
    if (user && user.role === ROLES.KETUA_RT) title = `Verifikasi Pengajuan Warga RT ${user.rt || '01'}`;
    else if (user && user.role === ROLES.KETUA_RW) title = 'Persetujuan Pelayanan RW';
    else if (user && user.role === ROLES.WARGA) title = 'Riwayat Pengajuan Pelayanan Saya';

    return `
        <div>
            <!-- Page Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">${title}</h1>
                    <p class="page-subtitle">Pantau progres verifikasi RT, persetujuan RW, dan pencetakan dokumen surat administrasi.</p>
                </div>
                <div>
                    ${btnAddHtml}
                </div>
            </div>

            <!-- Filter & Search Toolbar (DashStack Style) -->
            <div class="card mb-4" style="padding: 1rem 1.25rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 0.75rem; flex: 1; min-width: 260px; max-width: 500px;">
                        <input type="text" id="searchPelayananInput" class="form-input" placeholder="🔍 Cari nama pemohon, jenis surat, nomor berkas..." style="padding: 8px 14px;">
                    </div>
                    <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
                        Total Pengajuan: <strong id="totalPelayananCount" style="color: var(--text-main);">${pelayananList.length}</strong> data
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
                        ${renderTableRows(pelayananList)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function setupPelayananListEvents() {
    const searchInput = document.getElementById('searchPelayananInput');
    const tableBody = document.getElementById('pelayananTableBody');
    const totalCountEl = document.getElementById('totalPelayananCount');

    const refreshTable = () => {
        if (!tableBody) return;
        const freshList = getFilteredPelayananList();
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
    if (window._pelayananListSyncHandler) {
        window.removeEventListener('db:synced', window._pelayananListSyncHandler);
    }
    window._pelayananListSyncHandler = () => refreshTable();
    window.addEventListener('db:synced', window._pelayananListSyncHandler);
}
