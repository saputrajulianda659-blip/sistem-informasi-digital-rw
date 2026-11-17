// js/pages/MonitoringKegiatan.js
import { getAllKegiatan, getKegiatanById, createKegiatan, updateKegiatan, deleteKegiatan } from '../models/Kegiatan.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { showConfirmDialog, showAlertDialog } from '../utils/uiDialog.js';
import { renderStatusBadge } from '../utils/badge.js';

function getStatusBadge(status) {
    return renderStatusBadge(status);
}

function getCategoryColor(kategori) {
    switch (kategori) {
        case 'Rapat': return '#2563eb';
        case 'Kerja Bakti': return '#16a34a';
        case 'Kesehatan': return '#db2777';
        case 'Olahraga': return '#ea580c';
        case 'Sosial': return '#7c3aed';
        default: return '#0284c7';
    }
}

export function renderMonitoringKegiatan() {
    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAuthorized = [ROLES.KETUA_RW, ROLES.KETUA_RT, ROLES.SUPER_ADMIN].includes(user?.role);
    if (!isAuthorized) {
        return `
            <div class="card" style="padding: 2.5rem; text-align: center; max-width: 600px; margin: 2rem auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem auto;">
                    <i class="ph-bold ph-prohibit"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Akses Terbatas</h3>
                <p class="text-muted" style="margin-bottom: 1.5rem;">Halaman Monitoring Kegiatan hanya dapat diakses oleh Ketua RT, Ketua RW, dan Super Admin.</p>
                <a href="#/dashboard" class="btn btn-primary">Kembali ke Dashboard</a>
            </div>
        `;
    }

    const canManage = isAuthorized;
    const kegiatanList = getAllKegiatan();

    const totalKegiatan = kegiatanList.length;
    const akanDatang = kegiatanList.filter(k => k.status === 'Akan Datang' || k.status === 'Sedang Berlangsung').length;
    const selesai = kegiatanList.filter(k => k.status === 'Selesai').length;

    const btnTambahHtml = canManage ? `
        <button id="btnTambahKegiatan" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; border-radius: 8px; padding: 10px 18px;">
            <i class="ph ph-plus-circle text-lg"></i> + Tambah Kegiatan Baru
        </button>
    ` : '';

    let cardsHtml = '';
    if (kegiatanList.length === 0) {
        cardsHtml = `
            <div class="card" style="text-align: center; padding: 3.5rem 1rem; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.75rem; color: #64748b;">
                    <i class="ph ph-calendar-blank"></i>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">Belum Ada Jadwal Kegiatan</h3>
                <p style="color: #64748b; font-size: 0.875rem; margin: 0;">Belum ada agenda kegiatan warga yang tercatat saat ini.</p>
            </div>
        `;
    } else {
        cardsHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                ${kegiatanList.map(k => {
                    const catColor = getCategoryColor(k.kategori);
                    const formattedDate = k.tanggal ? new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';

                    const actionButtons = canManage ? `
                        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn btn-sm btn-edit-kegiatan" data-id="${k.id}" style="padding: 6px 14px; border: 1px solid #f59e0b; color: #b45309; background: #fffbeb; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;">
                                <i class="ph ph-pencil-simple"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-delete-kegiatan" data-id="${k.id}" data-nama="${k.nama}" style="padding: 6px 14px; border: 1px solid #fca5a5; color: #b91c1c; background: #fef2f2; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;">
                                <i class="ph ph-trash"></i> Hapus
                            </button>
                        </div>
                    ` : '';

                    return `
                        <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 4px solid ${catColor}; border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; gap: 8px;">
                                    <span style="background: #f8fafc; color: ${catColor}; border: 1px solid #e2e8f0; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 6px;">
                                        ${k.kategori || 'Umum'}
                                    </span>
                                    ${getStatusBadge(k.status)}
                                </div>
                                <h3 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem; line-height: 1.35;">
                                    ${k.nama}
                                </h3>
                                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; font-size: 0.8125rem; color: #64748b;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ph ph-calendar-blank text-base" style="color: #2563eb;"></i>
                                        <span><strong>${formattedDate}</strong> &bull; ${k.waktu || 'WIB'}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ph ph-map-pin text-base" style="color: #ef4444;"></i>
                                        <span>${k.lokasi || 'Balai RW 05'}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ph ph-user-circle text-base" style="color: #10b981;"></i>
                                        <span>Penyelenggara: ${k.penyelenggara || 'Pengurus RW/RT'}</span>
                                    </div>
                                </div>
                                <p style="font-size: 0.875rem; color: #475569; line-height: 1.55; margin: 0; background: #f8fafc; padding: 0.75rem; border-radius: 8px; border: 1px solid #f1f5f9;">
                                    ${k.deskripsi || 'Tidak ada deskripsi tambahan.'}
                                </p>
                            </div>
                            ${actionButtons}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    return `
        <div>
            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="color: #1e293b; margin-bottom: 0.25rem;">Monitoring Kegiatan RW & RT</h1>
                    <p class="text-muted" style="margin: 0;">Pantau dan kelola jadwal agenda kegiatan resmi warga di lingkungan RW 05.</p>
                </div>
                ${btnTambahHtml}
            </div>

            <!-- Summary Cards -->
            <div class="stats-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 24px;">
                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-calendar-check"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${totalKegiatan}</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Total Agenda Kegiatan</div>
                    </div>
                </div>
                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-hourglass-high"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${akanDatang}</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Akan Datang / Aktif</div>
                    </div>
                </div>
                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #dcfce7; color: #166534; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-check-circle"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${selesai}</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Kegiatan Terlaksana</div>
                    </div>
                </div>
            </div>

            <!-- List Cards -->
            ${cardsHtml}

            <!-- Modal Form Tambah / Edit Kegiatan -->
            <div id="modalKegiatan" class="modal-backdrop" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.65); z-index: 10000; backdrop-filter: blur(4px);">
                <div class="card" style="width: 90%; max-width: 560px; padding: 1.75rem; border-radius: 16px; background: #ffffff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <h2 id="modalTitle" style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;">Tambah Kegiatan Baru</h2>
                        <button id="btnModalClose" style="background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; padding: 4px;">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>

                    <form id="formKegiatan">
                        <input type="hidden" id="kegiatanId">

                        <div class="form-group mb-4">
                            <label class="form-label" for="namaKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Nama Kegiatan <span class="text-danger">*</span></label>
                            <input type="text" id="namaKegiatan" class="form-input" required placeholder="Contoh: Kerja Bakti Akbar RW 05" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="kategoriKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Kategori <span class="text-danger">*</span></label>
                                <select id="kategoriKegiatan" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                    <option value="Rapat">Rapat</option>
                                    <option value="Kerja Bakti">Kerja Bakti</option>
                                    <option value="Kesehatan">Kesehatan / Posyandu</option>
                                    <option value="Olahraga">Olahraga</option>
                                    <option value="Sosial">Sosial / Keagamaan</option>
                                    <option value="Umum">Umum</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="statusKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Status <span class="text-danger">*</span></label>
                                <select id="statusKegiatan" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                    <option value="Akan Datang">Akan Datang</option>
                                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                                    <option value="Selesai">Selesai</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="tanggalKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Tanggal <span class="text-danger">*</span></label>
                                <input type="date" id="tanggalKegiatan" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="waktuKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Waktu</label>
                                <input type="text" id="waktuKegiatan" class="form-input" placeholder="08:00 WIB" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                            </div>
                        </div>

                        <div class="form-group mb-4">
                            <label class="form-label" for="lokasiKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Lokasi Kegiatan <span class="text-danger">*</span></label>
                            <input type="text" id="lokasiKegiatan" class="form-input" required placeholder="Contoh: Balai Warga RW 05" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                        </div>

                        <div class="form-group mb-4">
                            <label class="form-label" for="penyelenggaraKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Penyelenggara</label>
                            <input type="text" id="penyelenggaraKegiatan" class="form-input" placeholder="Contoh: Pengurus RW 05 & RT 01" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                        </div>

                        <div class="form-group mb-4">
                            <label class="form-label" for="deskripsiKegiatan" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Deskripsi / Keterangan</label>
                            <textarea id="deskripsiKegiatan" class="form-input" rows="3" placeholder="Tuliskan rincian kegiatan..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;"></textarea>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 1.25rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" id="btnBatalModal" class="btn btn-secondary btn-cancel" style="padding: 9px 16px;">
                                Batal
                            </button>
                            <button type="submit" class="btn btn-primary" style="border-radius: 8px; padding: 9px 18px; font-weight: 600;">
                                <i class="ph ph-floppy-disk"></i> Simpan Kegiatan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export function setupMonitoringKegiatanEvents() {
    const modal = document.getElementById('modalKegiatan');
    const form = document.getElementById('formKegiatan');
    const btnTambah = document.getElementById('btnTambahKegiatan');
    const btnClose = document.getElementById('btnModalClose');
    const btnBatal = document.getElementById('btnBatalModal');
    const modalTitle = document.getElementById('modalTitle');

    const openModal = () => {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            if (form) form.reset();
            const idField = document.getElementById('kegiatanId');
            if (idField) idField.value = '';
        }
    };

    if (btnTambah) {
        btnTambah.addEventListener('click', () => {
            if (modalTitle) modalTitle.innerText = 'Tambah Kegiatan Baru';
            if (form) form.reset();
            const idField = document.getElementById('kegiatanId');
            if (idField) idField.value = '';
            const tglInput = document.getElementById('tanggalKegiatan');
            if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
            openModal();
        });
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnBatal) btnBatal.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Edit Buttons
    const editBtns = document.querySelectorAll('.btn-edit-kegiatan');
    editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const k = getKegiatanById(id);
            if (!k) return;

            if (modalTitle) modalTitle.innerText = 'Edit Kegiatan';
            document.getElementById('kegiatanId').value = k.id;
            document.getElementById('namaKegiatan').value = k.nama || '';
            document.getElementById('kategoriKegiatan').value = k.kategori || 'Umum';
            document.getElementById('statusKegiatan').value = k.status || 'Akan Datang';
            document.getElementById('tanggalKegiatan').value = k.tanggal || '';
            document.getElementById('waktuKegiatan').value = k.waktu || '';
            document.getElementById('lokasiKegiatan').value = k.lokasi || '';
            document.getElementById('penyelenggaraKegiatan').value = k.penyelenggara || '';
            document.getElementById('deskripsiKegiatan').value = k.deskripsi || '';

            openModal();
        });
    });

    // Delete Buttons
    const deleteBtns = document.querySelectorAll('.btn-delete-kegiatan');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const nama = e.currentTarget.getAttribute('data-nama') || 'kegiatan ini';

            const confirmed = await showConfirmDialog({
                title: 'Konfirmasi Hapus',
                message: `Apakah Anda yakin ingin menghapus "${nama}"?`,
                itemName: `kegiatan "${nama}"`,
                confirmText: 'Ya, Hapus',
                cancelText: 'Batal',
                confirmButtonColor: '#dc2626'
            });

            if (confirmed) {
                try {
                    deleteKegiatan(id);
                    await showAlertDialog('Kegiatan berhasil dihapus!', 'success');
                    window.location.hash = '#/monitoring-kegiatan';
                    window.location.reload();
                } catch (err) {
                    await showAlertDialog(err.message, 'error');
                }
            }
        });
    });

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('kegiatanId').value;
            const data = {
                nama: document.getElementById('namaKegiatan').value.trim(),
                kategori: document.getElementById('kategoriKegiatan').value,
                status: document.getElementById('statusKegiatan').value,
                tanggal: document.getElementById('tanggalKegiatan').value,
                waktu: document.getElementById('waktuKegiatan').value.trim(),
                lokasi: document.getElementById('lokasiKegiatan').value.trim(),
                penyelenggara: document.getElementById('penyelenggaraKegiatan').value.trim(),
                deskripsi: document.getElementById('deskripsiKegiatan').value.trim()
            };

            try {
                if (id) {
                    updateKegiatan(id, data);
                    await showAlertDialog('Kegiatan berhasil diperbarui!', 'success');
                } else {
                    createKegiatan(data);
                    await showAlertDialog('Kegiatan berhasil ditambahkan!', 'success');
                }
                closeModal();
                window.location.hash = '#/monitoring-kegiatan';
                window.location.reload();
            } catch (err) {
                await showAlertDialog(err.message, 'error');
            }
        });
    }
}
