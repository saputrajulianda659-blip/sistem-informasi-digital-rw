// js/pages/FormWarga.js
import { getWargaByNIK, addWarga, updateWarga, calculateAge } from '../models/Warga.js';
import { showAlertDialog } from '../utils/uiDialog.js';

export function renderFormWarga() {
    // Extract NIK from hash if editing (e.g. #/data-warga/form?nik=123)
    const hashSplit = window.location.hash.split('?nik=');
    const isEdit = hashSplit.length > 1;
    const editNik = isEdit ? hashSplit[1] : null;
    
    let warga = null;
    let initialAge = '-';
    if (isEdit) {
        warga = getWargaByNIK(editNik);
        if (!warga) {
            return `<div class="card"><p class="text-danger">Data warga tidak ditemukan.</p><a href="#/data-warga" class="btn btn-primary mt-4">Kembali</a></div>`;
        }
        if (warga.tanggal_lahir) {
            const age = calculateAge(warga.tanggal_lahir);
            if (age !== null) initialAge = `${age} tahun`;
        }
    }

    return `
        <div>
            <div class="flex items-center gap-4 mb-4">
                <a href="#/data-warga" class="btn btn-secondary btn-back"><i class="ph ph-arrow-left"></i> Kembali</a>
                <h1 class="text-2xl font-bold">${isEdit ? 'Edit Data Warga' : 'Tambah Warga Baru'}</h1>
            </div>
            
            <div class="card">
                <form id="wargaForm">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <!-- Column 1 -->
                        <div>
                            <div class="form-group">
                                <label class="form-label" for="nik">Nomor Induk Kependudukan (NIK) <span style="color:var(--danger-color)">*</span></label>
                                <input type="text" id="nik" class="form-input" placeholder="16 digit NIK" required pattern="[0-9]{16}" title="NIK harus berupa 16 digit angka" ${isEdit ? 'readonly style="background:var(--surface-hover)"' : ''} value="${warga ? warga.nik : ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="nama">Nama Lengkap <span style="color:var(--danger-color)">*</span></label>
                                <input type="text" id="nama" class="form-input" required value="${warga ? warga.nama : ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="no_kk">Nomor Kartu Keluarga (KK) <span style="color:var(--danger-color)">*</span></label>
                                <input type="text" id="no_kk" class="form-input" required pattern="[0-9]{16}" title="No KK harus berupa 16 digit angka" value="${warga ? warga.no_kk : ''}">
                            </div>
                            <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label class="form-label" for="tempat_lahir">Tempat Lahir <span style="color:var(--danger-color)">*</span></label>
                                    <input type="text" id="tempat_lahir" class="form-input" required value="${warga ? warga.tempat_lahir : ''}">
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <label class="form-label" for="tanggal_lahir">Tanggal Lahir <span style="color:var(--danger-color)">*</span></label>
                                        <span id="formAgeBadge" style="font-size: 0.75rem; color: #2563eb; font-weight: 600;">Umur: ${initialAge}</span>
                                    </div>
                                    <input type="date" id="tanggal_lahir" class="form-input" required value="${warga ? warga.tanggal_lahir : ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Jenis Kelamin <span style="color:var(--danger-color)">*</span></label>
                                <div class="flex gap-4" style="margin-top: 0.5rem;">
                                    <label class="flex items-center gap-2"><input type="radio" name="jenis_kelamin" value="L" required ${warga && warga.jenis_kelamin === 'L' ? 'checked' : ''}> Laki-laki</label>
                                    <label class="flex items-center gap-2"><input type="radio" name="jenis_kelamin" value="P" required ${warga && warga.jenis_kelamin === 'P' ? 'checked' : ''}> Perempuan</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Column 2 -->
                        <div>
                            <div class="form-group">
                                <label class="form-label" for="alamat">Alamat Lengkap <span style="color:var(--danger-color)">*</span></label>
                                <textarea id="alamat" class="form-input" rows="3" required>${warga ? warga.alamat : ''}</textarea>
                            </div>
                            <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label class="form-label" for="rt">RT <span style="color:var(--danger-color)">*</span></label>
                                    <select id="rt" class="form-input" required>
                                        <option value="">Pilih RT...</option>
                                        <option value="01" ${warga && warga.rt === '01' ? 'selected' : ''}>01</option>
                                        <option value="02" ${warga && warga.rt === '02' ? 'selected' : ''}>02</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label" for="rw">RW <span style="color:var(--danger-color)">*</span></label>
                                    <input type="text" id="rw" class="form-input" readonly value="05" style="background:var(--surface-hover)">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="no_hp">Nomor HP</label>
                                <input type="text" id="no_hp" class="form-input" pattern="[0-9]*" placeholder="contoh: 081234567890" value="${warga ? warga.no_hp : ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="email">Alamat Email <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">(Opsional)</span></label>
                                <input type="email" id="email" class="form-input" placeholder="contoh: nama@email.com" value="${warga && warga.email ? warga.email : ''}">
                                <span class="form-hint" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Untuk pengiriman notifikasi surat & informasi kependudukan digital.</span>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="status">Status Warga <span style="color:var(--danger-color)">*</span></label>
                                <select id="status" class="form-input" required>
                                    <option value="Tetap" ${warga && warga.status === 'Tetap' ? 'selected' : ''}>Tetap</option>
                                    <option value="Kontrak/Kos" ${warga && warga.status === 'Kontrak/Kos' ? 'selected' : ''}>Kontrak/Kos</option>
                                    <option value="Pindah" ${warga && warga.status === 'Pindah' ? 'selected' : ''}>Pindah</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
                        <a href="#/data-warga" class="btn btn-secondary btn-cancel">Batal</a>
                        <button type="submit" class="btn btn-primary"><i class="ph ph-floppy-disk"></i> Simpan Data</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function setupFormWargaEvents() {
    const form = document.getElementById('wargaForm');
    const tglInput = document.getElementById('tanggal_lahir');
    const formAgeBadge = document.getElementById('formAgeBadge');

    if (tglInput && formAgeBadge) {
        const updateBadge = () => {
            const val = tglInput.value;
            const age = calculateAge(val);
            formAgeBadge.innerText = age !== null ? `Umur: ${age} tahun` : 'Umur: -';
        };
        tglInput.addEventListener('input', updateBadge);
        tglInput.addEventListener('change', updateBadge);
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            if (form.dataset.isSubmitting === 'true') {
                return;
            }
            form.dataset.isSubmitting = 'true';
            
            const hashSplit = window.location.hash.split('?nik=');
            const isEdit = hashSplit.length > 1;
            const editNik = isEdit ? hashSplit[1] : null;

            const jk = document.querySelector('input[name="jenis_kelamin"]:checked');
            if (!jk) {
                form.dataset.isSubmitting = 'false';
                await showAlertDialog("Silakan pilih jenis kelamin.", "warning");
                return;
            }

            const emailInput = document.getElementById('email');
            const emailVal = emailInput ? emailInput.value.trim() : '';
            if (emailVal) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailVal)) {
                    form.dataset.isSubmitting = 'false';
                    await showAlertDialog("Format alamat email tidak valid. Harap periksa kembali.", "warning");
                    return;
                }
            }
            
            const data = {
                nik: document.getElementById('nik').value,
                nama: document.getElementById('nama').value,
                no_kk: document.getElementById('no_kk').value,
                tempat_lahir: document.getElementById('tempat_lahir').value,
                tanggal_lahir: document.getElementById('tanggal_lahir').value,
                jenis_kelamin: jk.value,
                alamat: document.getElementById('alamat').value,
                rt: document.getElementById('rt').value,
                rw: document.getElementById('rw').value,
                no_hp: document.getElementById('no_hp').value,
                email: emailVal,
                status: document.getElementById('status').value
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menyimpan...';
                submitBtn.disabled = true;
            }

            try {
                if (isEdit) {
                    await updateWarga(editNik, data);
                    await showAlertDialog("Data warga berhasil diperbarui!", "success");
                } else {
                    await addWarga(data);
                    await showAlertDialog("Data warga berhasil ditambahkan!", "success");
                }
                window.location.hash = '#/data-warga';
            } catch(err) {
                await showAlertDialog("Error: " + err.message, "error");
            } finally {
                form.dataset.isSubmitting = 'false';
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                }
            }
        };
    }
}
