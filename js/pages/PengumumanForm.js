// js/pages/PengumumanForm.js
import { KATEGORI_PENGUMUMAN, getPengumumanById, createPengumuman, updatePengumuman } from '../models/Pengumuman.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { getWargaStatistics } from '../models/Warga.js';
import { showConfirmDialog, showAlertDialog } from '../utils/uiDialog.js';

export function renderPengumumanForm() {
    const user = getCurrentUser();
    
    if (![ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user.role)) {
        return `
            <div class="card">
                <p class="text-danger">Akses ditolak: Anda tidak memiliki wewenang untuk mengelola pengumuman.</p>
                <a href="#/pengumuman" class="btn btn-primary mt-4">Kembali</a>
            </div>
        `;
    }

    const hashSplit = window.location.hash.split('?id=');
    const isEdit = hashSplit.length > 1;
    const editId = isEdit ? hashSplit[1] : null;
    
    let p = null;
    if (isEdit) {
        p = getPengumumanById(editId);
        if (!p) {
            return `<div class="card"><p class="text-danger">Pengumuman tidak ditemukan.</p><a href="#/pengumuman" class="btn btn-primary mt-4">Kembali</a></div>`;
        }
    }

    const catOptions = KATEGORI_PENGUMUMAN.map(k => `<option value="${k}" ${p && p.kategori === k ? 'selected' : ''}>${k}</option>`).join('');

    return `
        <div>
            <div class="flex items-center gap-4 mb-4">
                <a href="#/pengumuman" class="btn btn-secondary btn-cancel"><i class="ph ph-arrow-left"></i> Batal</a>
                <h1 class="text-2xl font-bold">${isEdit ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h1>
            </div>
            
            <div class="card" style="max-width: 800px;">
                <form id="pengumumanForm">
                    <div class="form-group">
                        <label class="form-label" for="judul">Judul Pengumuman <span class="text-danger">*</span></label>
                        <input type="text" id="judul" class="form-input" required value="${p ? p.judul : ''}" placeholder="Masukkan judul yang jelas dan menarik">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div class="form-group">
                            <label class="form-label" for="kategori">Kategori <span class="text-danger">*</span></label>
                            <select id="kategori" class="form-input" required>
                                <option value="">-- Pilih Kategori --</option>
                                ${catOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="status_publikasi">Status <span class="text-danger">*</span></label>
                            <select id="status_publikasi" class="form-input" required>
                                <option value="Draft" ${p && p.status_publikasi === 'Draft' ? 'selected' : ''}>Draft (Simpan sementara)</option>
                                <option value="Published" ${p && p.status_publikasi === 'Published' ? 'selected' : (p ? '' : 'selected')}>Published (Tayang & Kirim Notifikasi)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="target_rt" style="font-weight: 700;">Target Wilayah Sasaran <span class="text-danger">*</span></label>
                        <select id="target_rt" class="form-input">
                            <option value="" ${!p || !p.target_rt ? 'selected' : ''}>Seluruh RW 05 (Semua RT)</option>
                            <option value="01" ${p && p.target_rt === '01' ? 'selected' : ''}>Khusus RT 01</option>
                            <option value="02" ${p && p.target_rt === '02' ? 'selected' : ''}>Khusus RT 02</option>
                        </select>
                        <div id="targetAudienceInfo" style="margin-top: 6px; font-size: 0.8125rem; color: #2563eb; font-weight: 600;">
                            <i class="ph-bold ph-users"></i> Menghitung estimasi sasaran warga...
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="isi">Isi Pengumuman <span class="text-danger">*</span></label>
                        <textarea id="isi" class="form-input" rows="8" placeholder="Tuliskan isi pesan pengumuman di sini..." required>${p ? p.isi : ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="lampiran">Lampiran (Opsional)</label>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem;">Masukkan nama file atau tautan eksternal dokumen terkait pengumuman ini.</p>
                        <input type="text" id="lampiran" class="form-input" placeholder="Contoh: Jadwal_Lomba.pdf atau https://link..." value="${p ? p.lampiran : ''}">
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary"><i class="ph ph-floppy-disk"></i> Simpan Pengumuman</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function setupPengumumanFormEvents() {
    const form = document.getElementById('pengumumanForm');
    const targetRtSelect = document.getElementById('target_rt');
    const targetAudienceInfo = document.getElementById('targetAudienceInfo');

    const updateAudienceCounter = () => {
        if (!targetAudienceInfo) return;
        const stats = getWargaStatistics();
        const selectedRt = targetRtSelect ? targetRtSelect.value : '';
        if (selectedRt) {
            const count = stats.byRT[selectedRt] || 0;
            targetAudienceInfo.innerHTML = `<i class="ph-bold ph-users"></i> Target: Khusus Warga RT ${selectedRt} (Estimasi <strong>${count}</strong> penerima). Warga RT lain tidak menerima.`;
        } else {
            targetAudienceInfo.innerHTML = `<i class="ph-bold ph-users"></i> Target: Seluruh Warga RW 05 (Estimasi <strong>${stats.totalWarga}</strong> penerima).`;
        }
    };

    if (targetRtSelect) {
        targetRtSelect.addEventListener('change', updateAudienceCounter);
        updateAudienceCounter();
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const hashSplit = window.location.hash.split('?id=');
            const isEdit = hashSplit.length > 1;
            const editId = isEdit ? hashSplit[1] : null;
            
            const targetRt = targetRtSelect ? targetRtSelect.value : '';
            const statusPub = document.getElementById('status_publikasi').value;

            if (statusPub === 'Published') {
                const targetDesc = targetRt ? `Khusus RT ${targetRt}` : `Seluruh Warga RW 05`;
                const confirmSend = await showConfirmDialog({
                    title: 'Konfirmasi Publikasi Pengumuman',
                    message: `Pengumuman ini akan dipublikasikan dan notifikasi akan dikirimkan ke:\n👉 ${targetDesc}\n\nLanjutkan publikasi?`,
                    confirmText: 'Ya, Publikasikan',
                    cancelText: 'Batal',
                    confirmButtonColor: '#4880FF',
                    icon: 'question'
                });
                if (!confirmSend) return;
            }

            const data = {
                judul: document.getElementById('judul').value,
                kategori: document.getElementById('kategori').value,
                status_publikasi: statusPub,
                target_rt: targetRt,
                isi: document.getElementById('isi').value,
                lampiran: document.getElementById('lampiran').value
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menyimpan...';
            submitBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 400));
                if (isEdit) {
                    updatePengumuman(editId, data);
                    await showAlertDialog("Pengumuman berhasil diperbarui!", "success");
                } else {
                    createPengumuman(data);
                    await showAlertDialog("Pengumuman berhasil dibuat!", "success");
                }
                window.location.hash = '#/pengumuman';
            } catch(err) {
                await showAlertDialog("Error: " + err.message, "error");
            } finally {
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
            }
        });
    }
}
