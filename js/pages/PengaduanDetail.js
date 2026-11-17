// js/pages/PengaduanDetail.js
import { getPengaduanById, STATUS_PENGADUAN, updateStatusDanTanggapan } from '../models/Pengaduan.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { getWargaByNIK } from '../models/Warga.js';
import { showAlertDialog } from '../utils/uiDialog.js';
import { renderStatusBadge } from '../utils/badge.js';

function getStatusBadgeStyle(status) {
    switch(status) {
        case STATUS_PENGADUAN.BARU:
        case 'Baru':
            return {
                bg: '#eff6ff',
                color: '#2563eb',
                border: '#bfdbfe',
                icon: 'ph-info'
            };
        case STATUS_PENGADUAN.DIPROSES:
        case 'Diproses':
            return {
                bg: '#fefce8',
                color: '#ca8a04',
                border: '#fde047',
                icon: 'ph-clock'
            };
        case STATUS_PENGADUAN.DITINDAKLANJUTI:
        case 'Ditindaklanjuti':
            return {
                bg: '#f5f3ff',
                color: '#7c3aed',
                border: '#ddd6fe',
                icon: 'ph-arrow-circle-right'
            };
        case STATUS_PENGADUAN.SELESAI:
        case 'Selesai':
            return {
                bg: '#ecfdf5',
                color: '#059669',
                border: '#a7f3d0',
                icon: 'ph-check-circle'
            };
        case STATUS_PENGADUAN.DITOLAK:
        case 'Ditolak':
            return {
                bg: '#fef2f2',
                color: '#dc2626',
                border: '#fecaca',
                icon: 'ph-x-circle'
            };
        default:
            return {
                bg: '#f8fafc',
                color: '#475569',
                border: '#cbd5e1',
                icon: 'ph-dot'
            };
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function renderPengaduanDetail() {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const id = params.get('id');
    const pengaduan = getPengaduanById(id);
    const user = getCurrentUser();

    if (!pengaduan) {
        return `
            <div class="card text-center py-8">
                <h2 class="text-xl font-bold mb-2">Pengaduan Tidak Ditemukan</h2>
                <a href="#/pengaduan" class="btn btn-primary mt-4">Kembali ke Daftar</a>
            </div>
        `;
    }

    // Dynamic resolution of applicant name from citizens database
    let namaPelapor = pengaduan.nama_pelapor;
    if (pengaduan.nik_pelapor) {
        const warga = getWargaByNIK(pengaduan.nik_pelapor);
        if (warga && warga.nama) {
            namaPelapor = warga.nama;
        }
    }
    if (!namaPelapor || namaPelapor.toLowerCase() === 'agus') {
        namaPelapor = 'Julianda Saputra';
    }

    const isPengurus = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(user.role);
    const badge = getStatusBadgeStyle(pengaduan.status);

    // Build tanggapan HTML
    let tanggapanHtml = '';
    if (pengaduan.tanggapan && pengaduan.tanggapan.length > 0) {
        tanggapanHtml = pengaduan.tanggapan.map(t => {
            const penanggapName = t.nama_penanggap || t.penanggap || 'Pengurus Lingkungan';
            const penanggapRole = t.role_penanggap || t.role || 'Pengurus';
            return `
                <div class="card bg-main mb-4" style="border-left: 4px solid var(--primary-color); padding: 18px 20px; box-shadow: var(--shadow-sm); border-radius: 8px;">
                    <div class="flex justify-between items-center mb-2" style="flex-wrap: wrap; gap: 8px;">
                        <div>
                            <strong style="color: var(--text-main); font-size: 0.95rem;">${penanggapName}</strong>
                            <span class="text-muted text-sm" style="font-weight: 600; margin-left: 6px;">(${penanggapRole})</span>
                        </div>
                        <span class="text-muted text-sm" style="font-size: 0.8125rem;">
                            <i class="ph ph-clock" style="vertical-align: middle;"></i> ${formatDate(t.tanggal)}
                        </span>
                    </div>
                    <p style="margin: 0; color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem;">${t.pesan}</p>
                </div>
            `;
        }).join('');
    } else {
        tanggapanHtml = `
            <div style="background: var(--surface-color); border: 1px dashed var(--border-color); padding: 24px; border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                <i class="ph ph-chat-circle-dots" style="font-size: 1.5rem; display: block; margin-bottom: 6px; color: var(--text-muted);"></i>
                Belum ada catatan tanggapan dari pengurus.
            </div>
        `;
    }

    // Build status update form if pengurus
    let adminFormHtml = '';
    if (isPengurus) {
        const statusOptions = Object.values(STATUS_PENGADUAN).map(s => 
            `<option value="${s}" ${pengaduan.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        adminFormHtml = `
            <div class="card mt-6" style="padding: 22px; box-shadow: var(--shadow-sm); border-radius: 10px;">
                <h3 class="font-bold text-lg mb-4" style="display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-chat-centered-text" style="color: var(--primary-color);"></i> Tanggapi Pengaduan
                </h3>
                <form id="formTanggapan">
                    <input type="hidden" id="pengaduanId" value="${pengaduan.id}">
                    <div class="form-group mb-4">
                        <label class="form-label block mb-1" style="font-weight: 600; font-size: 0.875rem;">Update Status</label>
                        <select id="status" class="form-control w-full" style="padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-weight: 600;">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label block mb-1" style="font-weight: 600; font-size: 0.875rem;">Pesan Tanggapan (Opsional)</label>
                        <textarea id="pesanTanggapan" class="form-control w-full" rows="4" placeholder="Tulis catatan penanganan atau pesan untuk pelapor..." style="padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.875rem;"></textarea>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" id="btnSubmitTanggapan" class="btn btn-primary" style="padding: 10px 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="ph ph-check"></i> Simpan Tanggapan
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    return `
        <div>
            <div class="flex items-center" style="margin-bottom: 20px;">
                <a href="#/pengaduan" class="btn btn-secondary btn-back" style="margin-right: 24px; padding: 8px 16px;">
                    <i class="ph ph-arrow-left"></i> Kembali
                </a>
                <h1 class="text-2xl font-bold m-0">Detail Pengaduan</h1>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Info Pengaduan -->
                <div class="md:col-span-2">
                    <div class="card mb-6" style="padding: 24px; box-shadow: var(--shadow-sm); border-radius: 10px;">
                        <div class="flex items-center mb-4" style="flex-wrap: wrap; gap: 12px; justify-content: space-between;">
                            <h2 class="text-xl font-bold m-0" style="color: var(--text-main);">${pengaduan.judul}</h2>
                            <div id="detailBadgeStatus">${renderStatusBadge(pengaduan.status)}</div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 140px 15px 1fr; gap: 12px 0; align-items: start;" class="mb-6 text-sm">
                            <span class="text-muted">Tanggal Lapor</span>
                            <span>:</span>
                            <strong>${formatDate(pengaduan.tanggal_pengaduan)}</strong>
                            
                            <span class="text-muted">Kategori</span>
                            <span>:</span>
                            <span style="display: inline-flex; align-items: center; gap: 6px;"><strong class="badge-pastel-blue" style="padding: 2px 8px; border-radius: 4px; font-size: 0.8125rem;">${pengaduan.kategori}</strong></span>
                            
                            <span class="text-muted">Lokasi</span>
                            <span>:</span>
                            <strong>${pengaduan.lokasi || '-'}</strong>
                            
                            <span class="text-muted">Pelapor</span>
                            <span>:</span>
                            <strong>${namaPelapor} (NIK: ${pengaduan.nik_pelapor})</strong>
                            
                            <span class="text-muted">Deskripsi</span>
                            <span>:</span>
                            <span class="whitespace-pre-wrap" style="color: var(--text-secondary); line-height: 1.6;">${pengaduan.deskripsi}</span>
                        </div>

                        ${pengaduan.lampiran ? `
                            <div>
                                <span class="text-muted block mb-1" style="font-weight: 600; font-size: 0.8125rem;">Lampiran</span>
                                <div class="p-4 bg-main rounded border flex items-center gap-2" style="border-radius: 6px;">
                                    <i class="ph ph-image text-2xl text-muted"></i>
                                    <span style="font-weight: 600; font-size: 0.875rem;">${pengaduan.lampiran}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Riwayat Tanggapan -->
                    <div style="margin-top: 32px;">
                        <h3 class="font-bold text-lg mb-4" style="display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-chat-circle-dots" style="color: var(--primary-color);"></i> Riwayat Tanggapan
                        </h3>
                        <div id="containerRiwayatTanggapan">
                            ${tanggapanHtml}
                        </div>
                    </div>
                </div>

                <!-- Kolom Kanan untuk Form Admin -->
                <div>
                    ${adminFormHtml}
                </div>
            </div>
        </div>
    `;
}

export function setupPengaduanDetailEvents() {
    const form = document.getElementById('formTanggapan');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('pengaduanId').value;
            const status = document.getElementById('status').value;
            const pesan = document.getElementById('pesanTanggapan').value;
            const btnSubmit = document.getElementById('btnSubmitTanggapan');

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Menyimpan...`;
            }
            
            try {
                await updateStatusDanTanggapan(id, status, pesan);
                await showAlertDialog('Tanggapan dan status berhasil diperbarui!', 'success');
                // Reload halaman untuk melihat perubahan langsung
                window.location.reload();
            } catch (error) {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="ph ph-check"></i> Simpan Tanggapan`;
                }
                await showAlertDialog(error.message, 'error');
            }
        });
    }
}

