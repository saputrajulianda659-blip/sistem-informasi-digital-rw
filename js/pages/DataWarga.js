// js/pages/DataWarga.js
import { getAllWarga, deleteWarga, calculateAge, getWargaByNIK, addWarga, updateWarga, getWargaStatistics } from '../models/Warga.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { showAlertDialog } from '../utils/uiDialog.js';
import { getCollection, saveCollection } from '../utils/db.js';
import { callBackendApi } from '../services/apiClient.js';
import { renderStatusBadge } from '../utils/badge.js';

export function generateWargaRowHtml(w, canManage) {
    const age = calculateAge(w.tanggal_lahir);
    const ageBadge = age !== null
        ? `<span class="badge-capsule badge-age" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.7rem; font-weight: 600; padding: 1px 6px; border-radius: 9999px; margin-left: 5px; white-space: nowrap;">${age} th</span>`
        : `<span style="color: #94a3b8; font-size: 0.75rem;">-</span>`;

    const birthFormatted = w.tanggal_lahir
        ? new Date(w.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '<span style="color: #94a3b8;">-</span>';

    const actionHtml = canManage ? `
        <button class="btn btn-sm btn-edit-warga-modal" data-nik="${w.nik}" style="padding: 4px 8px; border: 1px solid #f59e0b; color: #b45309; background: #fffbeb; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; flex-shrink: 0;" title="Edit Data Warga">
            <i class="ph ph-pencil-simple"></i> Edit
        </button>
        <button class="btn btn-sm btn-delete-warga" data-nik="${w.nik}" data-nama="${w.nama}" data-rt="${w.rt || '01'}" data-rw="${w.rw || '05'}" style="padding: 4px 8px; border: 1px solid #fca5a5; color: #b91c1c; background: #fef2f2; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; flex-shrink: 0;" title="Hapus Data">
            <i class="ph ph-trash"></i> Hapus
        </button>
    ` : '';

    const statusBadge = renderStatusBadge(w.status || 'Tetap');

    return `
        <tr id="row-warga-${w.nik}" data-nik="${w.nik}" data-nama="${(w.nama || '').toLowerCase()}" data-rt="${w.rt}">
            <td style="font-family: monospace; font-size: 0.775rem; font-weight: 700; color: #334155; padding: 8px 12px; white-space: nowrap;">${w.nik}</td>
            <td style="padding: 8px 12px; min-width: 180px;">
                <div style="font-weight: 700; color: #1e293b; font-size: 0.8125rem; line-height: 1.35; word-break: break-word;" class="warga-nama-text">${w.nama}</div>
                <div style="font-size: 0.7rem; color: #64748b; margin-top: 1px;">KK: ${w.no_kk || '-'}</div>
                ${w.email ? `<div style="font-size: 0.7rem; color: #0284c7; display: flex; align-items: center; gap: 3px; margin-top: 1px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${w.email}"><i class="ph ph-envelope" style="flex-shrink: 0;"></i> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${w.email}</span></div>` : ''}
            </td>
            <td style="white-space: nowrap; padding: 8px 12px; font-size: 0.8rem;"><span style="font-weight: 700; color: #2563eb;">RT ${w.rt || '01'}</span> / RW ${w.rw || '05'}</td>
            <td style="text-align: center; padding: 8px 12px; font-size: 0.8rem;">${w.jenis_kelamin === 'L' ? '<span class="badge-gender-l" style="color: #2563eb; font-weight: 700; background: #eff6ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #dbeafe;">L</span>' : '<span class="badge-gender-p" style="color: #db2777; font-weight: 700; background: #fdf2f8; padding: 2px 6px; border-radius: 4px; border: 1px solid #fce7f3;">P</span>'}</td>
            <td style="white-space: nowrap; padding: 8px 12px;">
                <div style="font-size: 0.775rem; color: #1e293b; display: flex; align-items: center;">
                    <span class="warga-birth-text">${birthFormatted}</span>
                    ${ageBadge}
                </div>
            </td>
            <td style="text-align: center; white-space: nowrap; padding: 8px 12px;">${statusBadge}</td>
            <td style="padding: 8px 12px; text-align: center; white-space: nowrap;">
                <div class="flex gap-1" style="justify-content: center; align-items: center; flex-wrap: nowrap; display: inline-flex; white-space: nowrap;">
                    <a href="#/data-warga/detail?nik=${w.nik}" class="btn btn-sm btn-detail-warga" onclick="sessionStorage.setItem('dataWargaScrollPos', window.scrollY || document.documentElement.scrollTop || 0);" style="padding: 4px 7px; border: 1px solid #cbd5e1; color: #0284c7; background: #f0f9ff; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; flex-shrink: 0;" title="Lihat Detail"><i class="ph ph-eye"></i></a>
                    ${actionHtml}
                </div>
            </td>
        </tr>
    `;
}

export function generateTableRows(wargaList, canManage) {
    if (!wargaList || wargaList.length === 0) {
        return `<tr id="emptyWargaRow"><td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">Tidak ada data warga ditemukan.</td></tr>`;
    }
    return wargaList.map(w => generateWargaRowHtml(w, canManage)).join('');
}

export function renderDataWarga() {
    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    const wargaList = getAllWarga();

    // Check permissions: Super Admin, Ketua RW, and Ketua RT can manage
    const canManage = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user?.role);

    const btnAddHtml = canManage
        ? `<button id="btnTambahWargaModal" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
             <i class="ph ph-plus-circle text-lg"></i> + Tambah Data Warga
           </button>`
        : '';

    // Generate Table Rows
    const tableRows = generateTableRows(wargaList, canManage);


    return `
        <div>
            <!-- Alert Banner Container -->
            <div id="wargaAlertContainer" style="margin-bottom: 1rem;"></div>

            <div class="flex items-center" style="justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="color: #1e293b;">Data Kependudukan Warga</h1>
                    <p class="text-muted" style="margin: 0;">Kelola data induk warga, identitas keluarga, tanggal lahir, dan status kependudukan.</p>
                </div>
                ${btnAddHtml}
            </div>
            
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;">
                <div class="flex gap-4" style="flex-wrap: wrap; align-items: center;">
                    <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 250px;">
                        <input type="text" id="searchWarga" class="form-input" placeholder="🔍 Cari berdasarkan NIK atau Nama Warga..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 14px;">
                    </div>
                    ${user.role !== ROLES.KETUA_RT ? `
                        <div class="form-group" style="margin-bottom: 0; width: 170px;">
                            <select id="filterRT" class="form-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-weight: 600;">
                                <option value="">Semua RT (RW 05)</option>
                                <option value="01">RT 01</option>
                                <option value="02">RT 02</option>
                            </select>
                        </div>
                    ` : ''}
                    <div style="font-size: 0.85rem; color: #64748b;">
                        Total: <strong id="totalWargaCount" style="color: #1e293b; font-size: 1.05rem;">${wargaList.length}</strong> warga
                    </div>
                </div>
            </div>

            <div class="card table-responsive" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <table class="data-table table-compact-warga" style="width: 100%; min-width: 880px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                            <th style="min-width: 130px; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">NIK</th>
                            <th style="min-width: 200px; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">NAMA LENGKAP</th>
                            <th style="min-width: 95px; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">WILAYAH</th>
                            <th style="min-width: 50px; text-align: center; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">L/P</th>
                            <th style="min-width: 160px; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">TANGGAL LAHIR / UMUR</th>
                            <th style="min-width: 95px; text-align: center; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">STATUS</th>
                            <th style="min-width: 165px; text-align: center; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">AKSI</th>
                        </tr>
                    </thead>
                    <tbody id="wargaTableBody">
                        ${tableRows}
                    </tbody>
                </table>
            </div>

            <!-- MODAL KONFIRMASI HAPUS WARGA (Eksplisit Sesuai Kebutuhan) -->
            <div id="modalConfirmDeleteWarga" class="modal-backdrop" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.65); z-index: 10001;">
                <div class="card" style="width: 90%; max-width: 500px; padding: 2rem; border-radius: 16px; background: #ffffff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25);">
                    <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0;">
                            <i class="ph-bold ph-warning-octagon"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0 0 0.25rem 0;">Konfirmasi Penghapusan Data Warga</h3>
                            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">Data warga ini akan dihapus dari sistem kependudukan aktif.</p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem; font-size: 0.875rem;">
                        <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Nama Warga:</span>
                            <strong id="deleteModalNama" style="color: #0f172a;">-</strong>
                        </div>
                        <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">NIK:</span>
                            <span id="deleteModalNik" style="font-family: monospace; font-weight: 700; color: #1e293b;">-</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Wilayah:</span>
                            <span id="deleteModalWilayah" style="font-weight: 600; color: #2563eb;">-</span>
                        </div>
                    </div>

                    <div id="deleteModalAlert" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8125rem; margin-bottom: 1.25rem;"></div>

                    <div style="font-size: 0.8125rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.4;">
                        <i class="ph ph-info" style="color: #2563eb;"></i> <em>Catatan:</em> Riwayat administrasi yang pernah diajukan oleh warga ini tetap terlindungi dalam arsip pelayanan.
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button type="button" id="btnCancelDeleteWarga" class="btn btn-secondary btn-cancel" style="padding: 9px 18px;">
                            Batal
                        </button>
                        <button type="button" id="btnConfirmDeleteWarga" class="btn btn-danger" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 9px 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="ph ph-trash"></i> Ya, Hapus Data
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Form Tambah / Edit Warga -->
            <div id="modalWargaForm" class="modal-backdrop" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.65); z-index: 10000;">
                <div class="card" style="width: 90%; max-width: 680px; padding: 2rem; border-radius: 16px; background: #ffffff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; overscroll-behavior: contain;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <h2 id="modalWargaTitle" style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;">Tambah Warga Baru</h2>
                        <button id="btnModalWargaClose" style="background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; padding: 4px;">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>

                    <form id="formModalWarga">
                        <input type="hidden" id="modalIsEdit" value="false">
                        <input type="hidden" id="modalEditNik" value="">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                            <!-- Kolom 1 -->
                            <div>
                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalNik" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">NIK (16 Digit) <span class="text-danger">*</span></label>
                                    <input type="text" id="modalNik" class="form-input" required pattern="[0-9]{16}" placeholder="320101xxxxxxxxxx" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalNama" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Nama Lengkap <span class="text-danger">*</span></label>
                                    <input type="text" id="modalNama" class="form-input" required placeholder="Nama sesuai KTP" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalNoKk" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Nomor KK (16 Digit) <span class="text-danger">*</span></label>
                                    <input type="text" id="modalNoKk" class="form-input" required pattern="[0-9]{16}" placeholder="320101xxxxxxxxxx" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalTempatLahir" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Tempat Lahir <span class="text-danger">*</span></label>
                                    <input type="text" id="modalTempatLahir" class="form-input" required placeholder="Contoh: Jakarta" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>

                                <div class="form-group mb-4">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <label class="form-label" for="modalTanggalLahir" style="font-size: 0.875rem; font-weight: 600; color: #1e293b; margin: 0;">Tanggal Lahir <span class="text-danger">*</span></label>
                                        <span id="modalAgePreview" style="font-size: 0.75rem; color: #2563eb; font-weight: 600;">Umur: -</span>
                                    </div>
                                    <input type="date" id="modalTanggalLahir" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>
                            </div>

                            <!-- Kolom 2 -->
                            <div>
                                <div class="form-group mb-4">
                                    <label class="form-label" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Jenis Kelamin <span class="text-danger">*</span></label>
                                    <div class="flex gap-4" style="margin-top: 0.5rem;">
                                        <label class="flex items-center gap-2" style="font-size: 0.875rem; cursor: pointer;">
                                            <input type="radio" name="modalJenisKelamin" value="L" checked required> Laki-laki
                                        </label>
                                        <label class="flex items-center gap-2" style="font-size: 0.875rem; cursor: pointer;">
                                            <input type="radio" name="modalJenisKelamin" value="P" required> Perempuan
                                        </label>
                                    </div>
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalAlamat" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Alamat Lengkap <span class="text-danger">*</span></label>
                                    <textarea id="modalAlamat" class="form-input" rows="2" required placeholder="Jl. Merdeka No..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;"></textarea>
                                </div>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;" class="mb-4">
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label" for="modalRt" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">RT <span class="text-danger">*</span></label>
                                        <select id="modalRt" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                            <option value="01">RT 01</option>
                                            <option value="02">RT 02</option>
                                        </select>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label" for="modalRw" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">RW</label>
                                        <input type="text" id="modalRw" class="form-input" readonly value="05" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; background: #f1f5f9;">
                                    </div>
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalNoHp" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Nomor HP</label>
                                    <input type="text" id="modalNoHp" class="form-input" placeholder="08123456789" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                </div>

                                <div class="form-group mb-4">
                                    <label class="form-label" for="modalStatus" style="font-size: 0.875rem; font-weight: 600; color: #1e293b;">Status Kependudukan <span class="text-danger">*</span></label>
                                    <select id="modalStatus" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px;">
                                        <option value="Tetap">Tetap</option>
                                        <option value="Kontrak/Kos">Kontrak/Kos</option>
                                        <option value="Pindah">Pindah</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 1.25rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" id="btnModalWargaCancel" class="btn btn-secondary btn-cancel" style="padding: 9px 16px;">
                                Batal
                            </button>
                            <button type="submit" class="btn btn-primary" style="border-radius: 8px; padding: 9px 20px; font-weight: 600;">
                                <i class="ph ph-floppy-disk"></i> Simpan Warga
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export function setupDataWargaEvents() {
    const modal = document.getElementById('modalWargaForm');
    const form = document.getElementById('formModalWarga');
    const btnTambah = document.getElementById('btnTambahWargaModal');
    const btnClose = document.getElementById('btnModalWargaClose');
    const btnCancel = document.getElementById('btnModalWargaCancel');
    const modalTitle = document.getElementById('modalWargaTitle');
    const modalIsEdit = document.getElementById('modalIsEdit');
    const modalEditNik = document.getElementById('modalEditNik');
    const tglInput = document.getElementById('modalTanggalLahir');
    const agePreview = document.getElementById('modalAgePreview');

    const alertContainer = document.getElementById('wargaAlertContainer');
    const totalWargaCount = document.getElementById('totalWargaCount');

    // Show stylish alert message
    const showAlert = (message, type = 'success') => {
        if (!alertContainer) return;
        const bg = type === 'success' ? '#dcfce7' : '#fee2e2';
        const color = type === 'success' ? '#166534' : '#991b1b';
        const border = type === 'success' ? '#bbf7d0' : '#fecaca';
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';

        alertContainer.innerHTML = `
            <div style="padding: 12px 16px; border-radius: 8px; background: ${bg}; color: ${color}; border: 1px solid ${border}; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 0.9rem; animation: fadeIn 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="ph-bold ${icon} text-lg"></i>
                    <span>${message}</span>
                </div>
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: ${color}; font-size: 1.1rem; cursor: pointer;">&times;</button>
            </div>
        `;

        setTimeout(() => {
            if (alertContainer.firstChild) {
                alertContainer.innerHTML = '';
            }
        }, 6000);
    };

    const updateAgePreview = () => {
        if (!tglInput || !agePreview) return;
        const val = tglInput.value;
        const age = calculateAge(val);
        agePreview.innerText = age !== null ? `Umur: ${age} tahun` : 'Umur: -';
    };

    if (tglInput) {
        tglInput.addEventListener('change', updateAgePreview);
        tglInput.addEventListener('input', updateAgePreview);
    }

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
            if (modalIsEdit) modalIsEdit.value = 'false';
            if (modalEditNik) modalEditNik.value = '';
            if (agePreview) agePreview.innerText = 'Umur: -';
            const nikField = document.getElementById('modalNik');
            if (nikField) {
                nikField.readOnly = false;
                nikField.style.background = '#ffffff';
            }
        }
    };

    if (btnTambah) {
        btnTambah.addEventListener('click', () => {
            if (modalTitle) modalTitle.innerText = 'Tambah Warga Baru';
            if (modalIsEdit) modalIsEdit.value = 'false';
            if (form) form.reset();
            const nikField = document.getElementById('modalNik');
            if (nikField) {
                nikField.readOnly = false;
                nikField.style.background = '#ffffff';
            }
            openModal();
        });
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Modal Edit Warga Buttons
    const attachEditHandlers = () => {
        const editModalBtns = document.querySelectorAll('.btn-edit-warga-modal');
        editModalBtns.forEach(btn => {
            btn.onclick = (e) => {
                const nik = e.currentTarget.getAttribute('data-nik');
                const w = getWargaByNIK(nik);
                if (!w) return;

                if (modalTitle) modalTitle.innerText = 'Edit Data Warga';
                if (modalIsEdit) modalIsEdit.value = 'true';
                if (modalEditNik) modalEditNik.value = w.nik;

                const nikField = document.getElementById('modalNik');
                if (nikField) {
                    nikField.value = w.nik;
                    nikField.readOnly = true;
                    nikField.style.background = '#f1f5f9';
                }
                document.getElementById('modalNama').value = w.nama || '';
                document.getElementById('modalNoKk').value = w.no_kk || '';
                document.getElementById('modalTempatLahir').value = w.tempat_lahir || '';
                document.getElementById('modalTanggalLahir').value = w.tanggal_lahir || '';
                document.getElementById('modalAlamat').value = w.alamat || '';
                document.getElementById('modalRt').value = w.rt || '01';
                document.getElementById('modalNoHp').value = w.no_hp || '';
                document.getElementById('modalStatus').value = w.status || 'Tetap';

                const radios = document.querySelectorAll('input[name="modalJenisKelamin"]');
                radios.forEach(r => {
                    r.checked = (r.value === w.jenis_kelamin);
                });

                updateAgePreview();
                openModal();
            };
        });
    };
    attachEditHandlers();

    // ---------------------------------------------------------
    // PERBAIKAN FITUR HAPUS WARGA (MODAL + BACKEND + TANPA RELOAD)
    // ---------------------------------------------------------
    const modalDelete = document.getElementById('modalConfirmDeleteWarga');
    const deleteModalNama = document.getElementById('deleteModalNama');
    const deleteModalNik = document.getElementById('deleteModalNik');
    const deleteModalWilayah = document.getElementById('deleteModalWilayah');
    const deleteModalAlert = document.getElementById('deleteModalAlert');
    const btnCancelDelete = document.getElementById('btnCancelDeleteWarga');
    const btnConfirmDelete = document.getElementById('btnConfirmDeleteWarga');

    let pendingDeleteNik = null;
    let pendingDeleteNama = null;

    const closeDeleteModal = () => {
        if (modalDelete) {
            modalDelete.style.display = 'none';
            document.body.style.overflow = '';
            pendingDeleteNik = null;
            pendingDeleteNama = null;
            if (deleteModalAlert) {
                deleteModalAlert.style.display = 'none';
                deleteModalAlert.innerText = '';
            }
            if (btnConfirmDelete) {
                btnConfirmDelete.disabled = false;
                btnConfirmDelete.innerHTML = '<i class="ph ph-trash"></i> Ya, Hapus Data';
            }
        }
    };

    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);

    if (modalDelete) {
        modalDelete.addEventListener('click', (e) => {
            if (e.target === modalDelete) closeDeleteModal();
        });
    }

    // Attach click to delete buttons
    const attachDeleteHandlers = () => {
        const deleteBtns = document.querySelectorAll('.btn-delete-warga');
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => {
                const nik = e.currentTarget.getAttribute('data-nik');
                const nama = e.currentTarget.getAttribute('data-nama') || nik;
                const rt = e.currentTarget.getAttribute('data-rt') || '01';
                const rw = e.currentTarget.getAttribute('data-rw') || '05';

                pendingDeleteNik = nik;
                pendingDeleteNama = nama;

                if (deleteModalNama) deleteModalNama.innerText = nama;
                if (deleteModalNik) deleteModalNik.innerText = nik;
                if (deleteModalWilayah) deleteModalWilayah.innerText = `RT ${rt} / RW ${rw}`;

                if (deleteModalAlert) {
                    deleteModalAlert.style.display = 'none';
                    deleteModalAlert.innerText = '';
                }

                if (modalDelete) {
                    modalDelete.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            };
        });
    };

    attachDeleteHandlers();

    // Confirm Delete Action Execution
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!pendingDeleteNik) return;

            btnConfirmDelete.disabled = true;
            btnConfirmDelete.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menghapus...';

            try {
                // Call deleteWarga which verifies permissions and calls backend api
                const res = await deleteWarga(pendingDeleteNik);

                // If backend confirmed deletion:
                closeDeleteModal();

                // 1. Remove table row smoothly without page reload
                const rowEl = document.getElementById(`row-warga-${pendingDeleteNik}`);
                if (rowEl) {
                    rowEl.style.transition = 'all 0.4s ease';
                    rowEl.style.opacity = '0';
                    rowEl.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        rowEl.remove();
                        // If no more rows exist, show empty message
                        const tbody = document.getElementById('wargaTableBody');
                        if (tbody && tbody.children.length === 0) {
                            tbody.innerHTML = `<tr id="emptyWargaRow"><td colspan="7" style="text-align: center; padding: 3rem; color: #64748b;">Tidak ada data warga ditemukan.</td></tr>`;
                        }
                    }, 400);
                }

                // 2. Update dynamic total warga counter
                const currentRemaining = getAllWarga().length;
                if (totalWargaCount) {
                    totalWargaCount.innerText = currentRemaining;
                }

                // 3. Show clear success message
                showAlert(`Data warga "${pendingDeleteNama}" (NIK: ${pendingDeleteNik}) berhasil dihapus dari sistem.`, 'success');

            } catch (err) {
                // Failure: data remains in table and user receives clear error
                btnConfirmDelete.disabled = false;
                btnConfirmDelete.innerHTML = '<i class="ph ph-trash"></i> Ya, Hapus Data';

                if (deleteModalAlert) {
                    deleteModalAlert.style.display = 'block';
                    deleteModalAlert.style.background = '#fef2f2';
                    deleteModalAlert.style.color = '#991b1b';
                    deleteModalAlert.style.border = '1px solid #fecaca';
                    deleteModalAlert.innerHTML = `<strong>Gagal Menghapus:</strong> ${err.message}`;
                } else {
                    showAlert(`Gagal menghapus: ${err.message}`, 'error');
                }
            }
        });
    }

    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    const canManage = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user?.role);

    // Pulihkan posisi scroll saat kembali ke halaman Data Warga
    const restoreWargaScroll = () => {
        const savedScroll = sessionStorage.getItem('dataWargaScrollPos');
        if (savedScroll) {
            setTimeout(() => {
                const pos = parseInt(savedScroll, 10);
                window.scrollTo({
                    top: pos,
                    behavior: 'instant' // langsung ke posisi semula tanpa jeda
                });
                const mainContent = document.querySelector('.main-content');
                if (mainContent && mainContent.scrollTop !== undefined) {
                    mainContent.scrollTop = pos;
                }
                sessionStorage.removeItem('dataWargaScrollPos'); // bersihkan setelah dipulihkan
            }, 50);
        }
    };

    // Simpan posisi scroll vertikal saat tombol aksi Lihat Detail (icon mata) diklik
    const tableBody = document.getElementById('wargaTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const detailBtn = e.target.closest('a[href*="#/data-warga/detail"], .btn-detail-warga');
            if (detailBtn) {
                const scrollPos = window.scrollY || document.documentElement.scrollTop || (document.querySelector('.main-content')?.scrollTop) || 0;
                sessionStorage.setItem('dataWargaScrollPos', scrollPos);
            }
        });
    }

    // Memicu render ulang tabel daftar warga secara instan (State update)
    const reloadWargaData = () => {
        const tbody = document.getElementById('wargaTableBody');
        if (!tbody) return;
        const currentList = getAllWarga();
        tbody.innerHTML = generateTableRows(currentList, canManage);
        if (totalWargaCount) {
            totalWargaCount.innerText = currentList.length;
        }
        attachEditHandlers();
        attachDeleteHandlers();
        applyFilter();
    };
    const renderUlangTabelWarga = reloadWargaData;

    // Sinkronisasi data warga terbaru dari server database lalu render ulang tabel
    const refreshAndRenderWargaTable = async () => {
        try {
            const res = await callBackendApi(`warga.php?_t=${Date.now()}`, { action: 'list' }, 'GET');
            if (res && res.success && Array.isArray(res.data)) {
                saveCollection('warga', res.data);
            }
        } catch (fetchErr) {
            console.warn('[refreshAndRenderWargaTable] Server fetch fallback:', fetchErr);
        }
        reloadWargaData();
        restoreWargaScroll();
    };

    // Form Modal Submit handling (Tambah & Update)
    if (form) {
        // Gunakan property onsubmit untuk mencegah penumpukan event listener ganda
        form.onsubmit = async (e) => {
            // Wajib panggil e.preventDefault() di baris paling awal fungsi
            e.preventDefault();

            // Hindari pengiriman data ganda jika proses simpan sedang berjalan
            if (form.dataset.isSubmitting === 'true') {
                return;
            }
            form.dataset.isSubmitting = 'true';

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<i class="ph ph-floppy-disk"></i> Simpan Warga';

            // Kunci tombol submit sementara saat request asinkron berjalan
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menyimpan...';
            }

            try {
                const isEdit = modalIsEdit && modalIsEdit.value === 'true';
                const editNik = modalEditNik ? modalEditNik.value.trim() : null;

                const jk = document.querySelector('input[name="modalJenisKelamin"]:checked');
                const targetNik = (isEdit && editNik) ? editNik : document.getElementById('modalNik').value.trim();

                // Ambil data warga yang ada di cache lokal jika mode edit agar info tambahan tidak hilang
                const existingWarga = (isEdit && editNik) ? getWargaByNIK(editNik) : null;

                const data = {
                    nik: targetNik,
                    nama: document.getElementById('modalNama').value.trim(),
                    no_kk: document.getElementById('modalNoKk').value.trim(),
                    tempat_lahir: document.getElementById('modalTempatLahir').value.trim(),
                    tanggal_lahir: document.getElementById('modalTanggalLahir').value,
                    jenis_kelamin: jk ? jk.value : 'L',
                    alamat: document.getElementById('modalAlamat').value.trim(),
                    rt: document.getElementById('modalRt').value,
                    rw: document.getElementById('modalRw').value || '05',
                    no_hp: document.getElementById('modalNoHp').value.trim(),
                    status: document.getElementById('modalStatus').value,
                    email: existingWarga?.email || '',
                    pekerjaan: existingWarga?.pekerjaan || '-',
                    agama: existingWarga?.agama || '-'
                };

                const reqPayload = {
                    action: isEdit ? 'update' : 'add',
                    nik: targetNik,
                    data: data
                };

                let resData = null;
                try {
                    resData = await callBackendApi('warga.php', reqPayload, 'POST');
                } catch (apiErr) {
                    console.warn('[DataWarga] callBackendApi error, trying direct fetch:', apiErr);
                    try {
                        const directRes = await fetch('api/warga.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: JSON.stringify(reqPayload)
                        });
                        if (directRes.ok) {
                            resData = await directRes.json();
                        }
                    } catch (directErr) {
                        console.warn('[DataWarga] Direct fetch fallback failed:', directErr);
                    }
                }

                // Perbarui cache warga lokal seketika
                const updatedItem = (resData && resData.data && typeof resData.data === 'object') ? { ...data, ...resData.data } : data;
                const wargaColl = getCollection('warga') || [];
                const existingIdx = wargaColl.findIndex(w => w.nik === targetNik);
                if (existingIdx !== -1) {
                    wargaColl[existingIdx] = { ...wargaColl[existingIdx], ...updatedItem };
                } else {
                    wargaColl.push(updatedItem);
                }
                saveCollection('warga', wargaColl);

                // 1. Tutup modal form dan reset
                closeModal();
                form.reset();

                // 2. Render ulang tabel warga secara langsung (instant state update tanpa window.location.reload())
                reloadWargaData();

                // 3. Tampilkan pesan notifikasi sukses
                const successMsg = resData?.message || (isEdit ? "Data warga berhasil diperbarui!" : "Data warga berhasil ditambahkan");
                showAlert(successMsg, 'success');

                // 4. Sinkronisasi background asinkron ke server
                refreshAndRenderWargaTable().catch(() => { });
            } catch (err) {
                console.error('[Submit Warga Error]:', err);
                showAlert("Gagal menyimpan: " + (err.message || 'Terjadi kesalahan sistem.'), "error");
                showAlertDialog("Error: " + (err.message || 'Gagal menyimpan data warga.'), "error").catch(() => { });
            } finally {
                form.dataset.isSubmitting = 'false';
                // Selalu kembalikan status tombol secara konsisten
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        };
    }

    // Filter & Search handling
    const searchInput = document.getElementById('searchWarga');
    const filterRT = document.getElementById('filterRT');

    function applyFilter() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedRT = filterRT ? filterRT.value : '';
        const rows = document.querySelectorAll('#wargaTableBody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            if (row.id === 'emptyWargaRow') return;
            const nik = row.getAttribute('data-nik') || '';
            const nama = row.getAttribute('data-nama') || '';
            const rt = row.getAttribute('data-rt') || '';

            const matchQuery = !query || nik.includes(query) || nama.includes(query);
            const matchRT = !selectedRT || rt === selectedRT;

            if (matchQuery && matchRT) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (totalWargaCount) totalWargaCount.innerText = visibleCount;
    }

    if (searchInput) searchInput.addEventListener('input', applyFilter);
    if (filterRT) filterRT.addEventListener('change', applyFilter);

    // Initial background refresh anti-cache saat halaman DataWarga dibuka (asinkron di latar belakang tanpa menahan layar)
    setTimeout(() => {
        refreshAndRenderWargaTable().catch(() => { });
    }, 800);

    // Pulihkan posisi scroll saat kembali dari detail warga
    restoreWargaScroll();
}
