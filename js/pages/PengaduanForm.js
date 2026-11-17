// js/pages/PengaduanForm.js
import { KATEGORI_PENGADUAN, createPengaduan } from '../models/Pengaduan.js';
import { getCurrentUser, ROLES } from '../models/User.js';

export function renderPengaduanForm() {
    const user = getCurrentUser();
    if (user && user.role !== ROLES.WARGA) {
        return `
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                <p class="text-danger">Akses ditolak: Hanya warga yang dapat membuat pengaduan baru.</p>
                <a href="#/pengaduan" class="btn btn-primary mt-4">Kembali</a>
            </div>
        `;
    }

    const kategoriList = Array.isArray(KATEGORI_PENGADUAN) ? KATEGORI_PENGADUAN : [
        'Infrastruktur',
        'Kebersihan',
        'Keamanan',
        'Administrasi',
        'Sosial',
        'Lainnya'
    ];

    const kategoriOptions = kategoriList.map(k => `<option value="${k}">${k}</option>`).join('');

    return `
        <div>
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                <a href="#/pengaduan" class="btn btn-secondary btn-back" style="padding: 8px 16px;">
                    <i class="ph ph-arrow-left" style="font-size: 1rem;"></i> Kembali
                </a>
                <h1 class="text-2xl font-bold" style="color: #1e293b; margin: 0;">Buat Pengaduan Baru</h1>
            </div>

            <div class="card" style="max-width: 720px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <form id="formPengaduan">
                    <!-- Pengaduan -->
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label" for="judul" style="font-weight: 600; color: #1e293b; margin-bottom: 8px; display: block; font-size: 0.875rem;">
                            Pengaduan <span class="text-danger">*</span>
                        </label>
                        <input type="text" id="judul" class="form-input" required placeholder="Contoh: Lampu Jalan Mati di RT 01" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; box-sizing: border-box; outline: none; transition: all 0.2s ease;" onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.15)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';">
                    </div>

                    <!-- Kategori -->
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label" for="kategori" style="font-weight: 600; color: #1e293b; margin-bottom: 8px; display: block; font-size: 0.875rem;">
                            Kategori Pengaduan <span class="text-danger">*</span>
                        </label>
                        <select id="kategori" class="form-input" required style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; box-sizing: border-box; outline: none; transition: all 0.2s ease; background-color: #ffffff;" onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.15)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';">
                            <option value="">-- Pilih Kategori Pengaduan --</option>
                            ${kategoriOptions}
                        </select>
                    </div>

                    <!-- Lokasi -->
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label" for="lokasi" style="font-weight: 600; color: #1e293b; margin-bottom: 8px; display: block; font-size: 0.875rem;">
                            Lokasi Kejadian <span class="text-danger">*</span>
                        </label>
                        <input type="text" id="lokasi" class="form-input" required placeholder="Contoh: Jl. Merdeka No. 4 depan Poskamling RT 01" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; box-sizing: border-box; outline: none; transition: all 0.2s ease;" onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.15)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';">
                    </div>

                    <!-- Deskripsi -->
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label" for="deskripsi" style="font-weight: 600; color: #1e293b; margin-bottom: 8px; display: block; font-size: 0.875rem;">
                            Deskripsi Lengkap <span class="text-danger">*</span>
                        </label>
                        <textarea id="deskripsi" class="form-input" rows="4" required placeholder="Jelaskan secara rinci detail pengaduan atau keluhan Anda..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; box-sizing: border-box; outline: none; transition: all 0.2s ease; line-height: 1.5;" onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.15)';" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none';"></textarea>
                    </div>

                    <!-- Lampiran / Foto -->
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label" style="font-weight: 600; color: #1e293b; margin-bottom: 8px; display: block; font-size: 0.875rem;">
                            Lampiran Foto Pendukung <span class="text-muted" style="font-size: 0.8rem; font-weight: normal;">(Opsional)</span>
                        </label>
                        <div id="dropzone-lampiran" class="upload-area" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; cursor: pointer; position: relative; background: #f8fafc; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 125px; width: 100%; box-sizing: border-box;">
                            <i id="icon-camera" class="ph ph-camera" style="font-size: 2.25rem; color: #94a3b8; margin-bottom: 8px; transition: all 0.2s ease;"></i>
                            <p id="text-lampiran" style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #1e293b; transition: all 0.2s ease;">Pilih Foto atau Tarik ke Sini</p>
                            <p id="subtext-lampiran" class="text-muted" style="font-size: 0.75rem; margin: 4px 0 0; color: #64748b;">Format: JPG, PNG (Maksimal 5MB)</p>
                            <input type="file" id="lampiran" accept="image/*" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                        </div>
                        
                        <div id="preview-lampiran" style="margin-top: 12px; display: none; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
                            <img id="img-preview" src="" alt="Preview" style="width: 70px; height: 60px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;">
                            <div style="flex: 1; overflow: hidden;">
                                <p id="filename-preview" style="margin: 0; font-size: 0.875rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></p>
                                <p id="filesize-preview" class="text-muted" style="margin: 2px 0 0; font-size: 0.75rem; color: #64748b;"></p>
                            </div>
                            <button type="button" id="btn-remove-preview" class="btn" style="padding: 4px 8px; border: 1px solid #fecaca; background: #fef2f2; color: #ef4444; border-radius: 6px; font-size: 0.75rem;" title="Hapus foto">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Tombol Aksi -->
                    <div style="border-top: 1px solid #e2e8f0; margin-top: 1.5rem; padding-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-weight: 600; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="ph ph-paper-plane-tilt"></i> Kirim Pengaduan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function setupPengaduanFormEvents() {
    const form = document.getElementById('formPengaduan');
    const lampiranInput = document.getElementById('lampiran');
    const previewContainer = document.getElementById('preview-lampiran');
    const imgPreview = document.getElementById('img-preview');
    const filenamePreview = document.getElementById('filename-preview');
    const filesizePreview = document.getElementById('filesize-preview');
    const dropzone = document.getElementById('dropzone-lampiran');
    const btnRemove = document.getElementById('btn-remove-preview');

    if (btnRemove) {
        btnRemove.addEventListener('click', () => {
            if (lampiranInput) lampiranInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (dropzone) {
                dropzone.style.borderColor = '#cbd5e1';
                dropzone.style.backgroundColor = '#f8fafc';
            }
        });
    }

    if (lampiranInput) {
        lampiranInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showCustomToast("Ukuran file maksimal 5MB.", "error");
                    this.value = '';
                    if (previewContainer) previewContainer.style.display = 'none';
                    return;
                }
                if (!file.type.startsWith('image/')) {
                    showCustomToast("File harus berupa gambar (JPG/PNG).", "error");
                    this.value = '';
                    if (previewContainer) previewContainer.style.display = 'none';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (imgPreview) imgPreview.src = evt.target.result;
                    if (filenamePreview) filenamePreview.textContent = file.name;
                    if (filesizePreview) filesizePreview.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
                    if (previewContainer) previewContainer.style.display = 'flex';
                    if (dropzone) {
                        dropzone.style.borderColor = '#10b981';
                        dropzone.style.backgroundColor = '#ecfdf5';
                    }
                };
                reader.readAsDataURL(file);
            } else {
                if (previewContainer) previewContainer.style.display = 'none';
                if (dropzone) {
                    dropzone.style.borderColor = '#cbd5e1';
                    dropzone.style.backgroundColor = '#f8fafc';
                }
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const judul = document.getElementById('judul').value;
            const kategori = document.getElementById('kategori').value;
            const lokasi = document.getElementById('lokasi').value;
            const deskripsi = document.getElementById('deskripsi').value;
            
            if (!kategori) {
                showCustomToast("Silakan pilih kategori pengaduan.", "error");
                return;
            }

            let lampiran = '';
            if (lampiranInput && lampiranInput.files.length > 0) {
                lampiran = lampiranInput.files[0].name;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Kirim Pengaduan';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Mengirim...';
                submitBtn.disabled = true;
            }

            try {
                await new Promise(resolve => setTimeout(resolve, 600));
                createPengaduan({
                    judul,
                    kategori,
                    lokasi,
                    deskripsi,
                    lampiran
                });
                showCustomToast('Pengaduan berhasil dikirim!', 'success');
                setTimeout(() => {
                    window.location.hash = '#/pengaduan';
                }, 1500);
            } catch (error) {
                showCustomToast("Error: " + error.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                }
            }
        });
    }
}

function showCustomToast(message, type) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = type === 'error' ? '#b91c1c' : '#10b981';
    toast.style.color = 'white';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.zIndex = '99999';
    toast.style.fontWeight = 'bold';
    
    const icon = type === 'error' ? 'ph-x-circle' : 'ph-check-circle';
    toast.innerHTML = `<i class="ph-fill ${icon} text-xl align-middle mr-2"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
