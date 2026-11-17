// js/pages/RwRtManagement.js
import { getAllWilayah, addWilayah, updateWilayah, deleteWilayah, getWilayahById } from '../models/Wilayah.js';
import { getAllWarga, getWargaStatistics } from '../models/Warga.js';
import { getKetuaRT } from '../models/User.js';
import { showConfirmDialog } from '../utils/uiDialog.js';

export function renderRwRtManagement() {
    const wilayahList = getAllWilayah().map(enrichWilayah);
    const stats = getWargaStatistics();

    const totalRT = wilayahList.length;
    const totalWarga = stats.totalWarga;
    const avgWarga = totalRT > 0 ? Math.round(totalWarga / totalRT) : 0;

    return `
        <div class="rw-rt-management-page">
            <!-- Header -->
            <div class="flex items-center justify-between" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="font-size: 1.65rem; color: var(--text-main); margin-bottom: 0.25rem;">Manajemen Unit RT & RW</h1>
                    <p class="text-muted" style="font-size: 0.9rem; color: var(--text-muted);">Kelola pembagian wilayah rukun tetangga, data pengurus RT, dan pemetaan kependudukan.</p>
                </div>
                <button id="btnTambahWilayah" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 0.65rem 1.25rem; font-weight: 600; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
                    <i class="ph-bold ph-plus-circle text-lg"></i>
                    <span>+ Tambah Wilayah RT</span>
                </button>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.75rem;">
                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid var(--primary-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Total Unit RT</p>
                            <h3 style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0;">${totalRT} RT</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-buildings"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid #8b5cf6; background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Wilayah Induk RW</p>
                            <h3 style="font-size: 1.75rem; font-weight: 800; color: #8b5cf6; margin: 0;">RW 05</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f5f3ff; color: #8b5cf6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-map-trifold"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid var(--success-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Total Warga Tercatat</p>
                            <h3 style="font-size: 1.75rem; font-weight: 800; color: var(--success-color); margin: 0;">${totalWarga} Jiwa</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-users"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid #f59e0b; background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Rata-rata Warga/RT</p>
                            <h3 style="font-size: 1.75rem; font-weight: 800; color: #f59e0b; margin: 0;">~${avgWarga} Jiwa</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #fffbeb; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-chart-bar"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search & Filter Card -->
            <div class="card mb-4" style="padding: 1rem 1.25rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; background: var(--surface-color); border: 1px solid var(--border-color);">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 260px; position: relative;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1.1rem;"></i>
                        <input type="text" id="searchWilayahInput" class="form-input" placeholder="Cari nama RT, nama Ketua RT, atau blok wilayah..." style="width: 100%; padding: 0.6rem 0.75rem 0.6rem 2.4rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="card" style="overflow-x: auto; padding: 0; border-radius: var(--radius-lg); border: 1px solid var(--border-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                <div class="table-subbar-header" style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: #fafbfc;">
                    <h3 class="font-bold table-subbar-title" style="font-size: 1.05rem; color: var(--text-main);">Daftar Wilayah Unit RT</h3>
                    <span id="wilayahCountBadge" class="table-count-badge" style="font-size: 0.8rem; background: #e2e8f0; color: #475569; padding: 0.2rem 0.65rem; border-radius: 9999px; font-weight: 600;">${totalRT} Unit</span>
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); background: #f8fafc;">
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Unit Wilayah</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Ketua RT</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Kontak Pengurus</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color); text-align: center;">Total Warga</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Keterangan / Cakupan Blok</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color); text-align: center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="wilayahTableBody">
                        ${renderWilayahRows(wilayahList)}
                    </tbody>
                </table>
            </div>

            <!-- Modal Form Tambah/Edit Wilayah RT -->
            <div id="modalWilayahForm" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(3px); padding: 1rem;">
                <div class="card" style="width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 1.75rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                                <i id="modalWilayahIcon" class="ph ph-buildings"></i>
                            </div>
                            <h3 id="modalWilayahTitle" class="text-xl font-bold" style="margin: 0;">Tambah Wilayah RT Baru</h3>
                        </div>
                        <button id="btnCloseWilayahModal" style="color: var(--text-muted); font-size: 1.4rem; padding: 4px; border-radius: 6px; display: flex;"><i class="ph ph-x"></i></button>
                    </div>

                    <form id="formWilayah">
                        <input type="hidden" id="wilayahIdInput" value="">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor RT <span style="color: var(--danger-color);">*</span></label>
                                <input type="text" id="wilayahRtInput" class="form-input" required placeholder="Contoh: 04" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor RW <span style="color: var(--danger-color);">*</span></label>
                                <input type="text" id="wilayahRwInput" class="form-input" required value="05" placeholder="Contoh: 05" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>
                        </div>

                        <div class="form-group mb-4" style="margin-bottom: 1rem;">
                            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nama Ketua RT</label>
                            <input type="text" id="wilayahKetuaInput" class="form-input" placeholder="Contoh: Bpk. Bambang Pamungkas" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                        </div>

                        <div class="form-group mb-4" style="margin-bottom: 1rem;">
                            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor Kontak / WhatsApp</label>
                            <input type="text" id="wilayahKontakInput" class="form-input" placeholder="Contoh: 081234567890" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                        </div>

                        <div class="form-group mb-4" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Keterangan / Cakupan Blok Wilayah</label>
                            <textarea id="wilayahKeteranganInput" class="form-input" rows="3" placeholder="Contoh: Mencakup Blok G1 - Blok H10, Pos Ronda Timur" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem; resize: vertical;"></textarea>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                            <button type="button" id="btnCancelWilayahModal" class="btn btn-secondary btn-cancel" style="padding: 0.6rem 1.2rem;">Batal</button>
                            <button type="submit" class="btn btn-primary" style="padding: 0.6rem 1.4rem; font-weight: 600; border-radius: var(--radius-md);">Simpan Wilayah</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function enrichWilayah(w) {
    if (!w) return w;
    const rtClean = String(w.rt || '').padStart(2, '0');
    const rwClean = String(w.rw || '05').padStart(2, '0');
    const rtUser = typeof getKetuaRT === 'function' ? getKetuaRT(rtClean, rwClean) : null;
    const namaKetua = w.nama_ketua_rt || w.ketua_rt || w.namaKetua || rtUser?.name || rtUser?.nama || (rtClean === '01' ? 'Ahmad Fauzi' : (rtClean === '02' ? 'Eko Prasetyo' : 'Belum Ditentukan'));
    const kontak = (w.kontak && w.kontak !== '-') ? w.kontak : (rtUser?.no_hp || rtUser?.phone || (rtClean === '01' ? '085799873238' : (rtClean === '02' ? '081234567892' : '-')));
    const keterangan = w.keterangan || (rtClean === '01' ? 'Mencakup Blok A1 - Blok B10, Pos Satpam Utama' : (rtClean === '02' ? 'Mencakup Blok C1 - Blok D12, Area Taman Bermain' : `Wilayah RT ${rtClean} / RW ${rwClean}`));

    return {
        ...w,
        nama_ketua_rt: namaKetua,
        kontak: kontak,
        keterangan: keterangan
    };
}

function renderWilayahRows(wilayahList) {
    if (!wilayahList || wilayahList.length === 0) {
        return `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">Tidak ada data unit wilayah RT yang ditemukan.</td></tr>`;
    }

    return wilayahList.map(item => {
        const w = enrichWilayah(item);
        return `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.15s ease;" onmouseover="this.style.backgroundColor='var(--surface-hover)'" onmouseout="this.style.backgroundColor='transparent'">
                <td style="padding: 1rem 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
                            ${w.rt}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">RT ${w.rt} / RW ${w.rw}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${w.id}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 1rem 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="ph-fill ph-user-circle" style="font-size: 1.3rem; color: #0284c7;"></i>
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${w.nama_ketua_rt}</span>
                    </div>
                </td>
                <td style="padding: 1rem 1.25rem;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #334155;">
                        <i class="ph ph-phone text-muted"></i>
                        <span>${w.kontak && w.kontak !== '-' ? w.kontak : '<span style="color: var(--text-muted);">-</span>'}</span>
                    </div>
                </td>
                <td style="padding: 1rem 1.25rem; text-align: center;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 0.3rem 0.75rem; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 9999px; font-weight: 700; font-size: 0.85rem;">
                        <i class="ph ph-users"></i> ${w.total_warga || 0} Warga
                    </span>
                </td>
                <td style="padding: 1rem 1.25rem; font-size: 0.85rem; color: var(--text-muted); max-width: 250px;">
                    ${w.keterangan || '-'}
                </td>
                <td style="padding: 1rem 1.25rem; text-align: center;">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button type="button" class="btn btn-action-edit-wilayah" data-id="${w.id}" data-rt="${w.rt}" title="Edit Data Wilayah" style="padding: 0.35rem 0.65rem; border: 1px solid var(--border-color); border-radius: 6px; color: var(--primary-color); background: white; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                            <i class="ph ph-pencil-simple" style="pointer-events: none;"></i>
                        </button>
                        <button type="button" class="btn btn-action-delete-wilayah" data-id="${w.id}" data-rt="${w.rt}" title="Hapus Wilayah RT" style="padding: 0.35rem 0.65rem; border: 1px solid #fecaca; border-radius: 6px; color: var(--danger-color); background: #fef2f2; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                            <i class="ph ph-trash" style="pointer-events: none;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

export function setupRwRtManagementEvents() {
    const modalWilayah = document.getElementById('modalWilayahForm');
    const formWilayah = document.getElementById('formWilayah');
    const btnTambah = document.getElementById('btnTambahWilayah');
    const btnClose = document.getElementById('btnCloseWilayahModal');
    const btnCancel = document.getElementById('btnCancelWilayahModal');
    const searchInput = document.getElementById('searchWilayahInput');
    const tableBody = document.getElementById('wilayahTableBody');
    const countBadge = document.getElementById('wilayahCountBadge');

    function findWilayahItem(idOrRt) {
        if (idOrRt === undefined || idOrRt === null) return null;
        const list = getAllWilayah().map(enrichWilayah);
        return list.find(item => 
            String(item.id) === String(idOrRt) || 
            String(item.rt) === String(idOrRt) ||
            String(item.rt).padStart(2, '0') === String(idOrRt).padStart(2, '0')
        ) || null;
    }

    function openEditModal(id, rt) {
        const wilayah = findWilayahItem(id) || findWilayahItem(rt);
        if (!wilayah) {
            console.warn('Wilayah not found for edit:', id, rt);
            return;
        }

        if (formWilayah) formWilayah.reset();
        document.getElementById('wilayahIdInput').value = wilayah.id;
        document.getElementById('wilayahRtInput').value = wilayah.rt;
        document.getElementById('wilayahRtInput').readOnly = true; // RT number fixed on edit
        document.getElementById('wilayahRwInput').value = wilayah.rw || '05';
        document.getElementById('wilayahKetuaInput').value = wilayah.nama_ketua_rt || '';
        document.getElementById('wilayahKontakInput').value = (wilayah.kontak && wilayah.kontak !== '-') ? wilayah.kontak : '';
        document.getElementById('wilayahKeteranganInput').value = (wilayah.keterangan && wilayah.keterangan !== '-') ? wilayah.keterangan : '';

        document.getElementById('modalWilayahTitle').innerText = `Ubah Data Pengurus RT ${wilayah.rt}`;
        document.getElementById('modalWilayahIcon').className = 'ph ph-pencil-simple';

        if (modalWilayah) {
            modalWilayah.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    async function handleDeleteWilayah(id, rt) {
        const confirmed = await showConfirmDialog({
            title: 'Konfirmasi Hapus',
            message: `Apakah Anda yakin ingin menghapus unit wilayah RT ${rt}?`,
            itemName: `unit wilayah RT ${rt}`,
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            confirmButtonColor: '#dc2626'
        });

        if (confirmed) {
            try {
                const targetItem = findWilayahItem(id) || findWilayahItem(rt);
                const realId = targetItem ? targetItem.id : (isNaN(Number(id)) ? id : Number(id));
                deleteWilayah(realId);
                showToast(`Unit RT ${rt} berhasil dihapus dari sistem.`, 'success');
                filterWilayah();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    }

    function filterWilayah() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        let list = getAllWilayah().map(enrichWilayah);

        if (query) {
            list = list.filter(w =>
                String(w.rt).includes(query) ||
                (w.nama_ketua_rt || '').toLowerCase().includes(query) ||
                (w.kontak || '').includes(query) ||
                (w.keterangan || '').toLowerCase().includes(query) ||
                (String(w.id) || '').toLowerCase().includes(query)
            );
        }

        if (tableBody) {
            tableBody.innerHTML = renderWilayahRows(list);
            attachRowEvents();
        }
        if (countBadge) {
            countBadge.innerText = `${list.length} Unit`;
        }
    }

    if (searchInput) searchInput.addEventListener('input', filterWilayah);

    // Open Modal Add
    if (btnTambah && modalWilayah) {
        btnTambah.addEventListener('click', () => {
            if (formWilayah) formWilayah.reset();
            document.getElementById('wilayahIdInput').value = '';
            document.getElementById('modalWilayahTitle').innerText = 'Tambah Wilayah RT Baru';
            document.getElementById('modalWilayahIcon').className = 'ph ph-plus-circle';
            document.getElementById('wilayahRtInput').readOnly = false;
            document.getElementById('wilayahRwInput').value = '05';
            modalWilayah.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    const closeModal = () => {
        if (modalWilayah) {
            modalWilayah.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (formWilayah) formWilayah.reset();
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (modalWilayah) {
        modalWilayah.addEventListener('click', (e) => {
            if (e.target === modalWilayah) closeModal();
        });
    }

    // Form Submit
    if (formWilayah) {
        formWilayah.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('wilayahIdInput').value;
            const data = {
                rt: document.getElementById('wilayahRtInput').value,
                rw: document.getElementById('wilayahRwInput').value,
                nama_ketua_rt: document.getElementById('wilayahKetuaInput').value,
                kontak: document.getElementById('wilayahKontakInput').value,
                keterangan: document.getElementById('wilayahKeteranganInput').value
            };

            try {
                if (id) {
                    const targetItem = findWilayahItem(id);
                    const realId = targetItem ? targetItem.id : (isNaN(Number(id)) ? id : Number(id));
                    updateWilayah(realId, data);
                    showToast('Data pengurus dan wilayah RT berhasil diperbarui!', 'success');
                } else {
                    addWilayah(data);
                    showToast(`Unit RT ${data.rt} berhasil ditambahkan ke sistem!`, 'success');
                }
                closeModal();
                filterWilayah();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    function attachRowEvents() {
        // Direct click on edit buttons
        document.querySelectorAll('.btn-action-edit-wilayah').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const rt = btn.getAttribute('data-rt');
                openEditModal(id, rt);
            };
        });

        // Direct click on delete buttons
        document.querySelectorAll('.btn-action-delete-wilayah').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const rt = btn.getAttribute('data-rt');
                handleDeleteWilayah(id, rt);
            };
        });
    }

    // Event delegation on table body for resilient click handling
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-action-edit-wilayah');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = editBtn.getAttribute('data-id');
                const rt = editBtn.getAttribute('data-rt');
                openEditModal(id, rt);
                return;
            }
            const deleteBtn = e.target.closest('.btn-action-delete-wilayah');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = deleteBtn.getAttribute('data-id');
                const rt = deleteBtn.getAttribute('data-rt');
                handleDeleteWilayah(id, rt);
                return;
            }
        });
    }

    attachRowEvents();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = type === 'error' ? '#991b1b' : '#166534';
    toast.style.color = 'white';
    toast.style.padding = '0.9rem 1.4rem';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '999999';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.transition = 'all 0.3s ease';

    const icon = type === 'error' ? 'ph-x-circle' : 'ph-check-circle';
    toast.innerHTML = `<i class="ph-fill ${icon}" style="font-size: 1.25rem;"></i> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
