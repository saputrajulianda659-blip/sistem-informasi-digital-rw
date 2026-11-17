// js/pages/PelayananForm.js
import { JENIS_PELAYANAN, createPengajuan } from '../models/Pelayanan.js';
import { getCurrentUser, ROLES } from '../models/User.js';

export function getCleanRT(val) {
    if (!val) return '';
    return String(val).replace(/^0+/, '').trim();
}

export const PERSYARATAN_CONFIG = {
    'Surat Keterangan Tidak Mampu (SKTM)': {
        judul: 'Persyaratan Dokumen Surat Keterangan Tidak Mampu (SKTM):',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Bukti Penghasilan / Slip Gaji / Foto Rumah'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'bukti_penghasilan', label: 'Bukti Penghasilan / Slip Gaji / Foto Rumah', placeholder: 'Pilih Berkas Bukti Penghasilan / Slip Gaji / Foto Rumah', required: true, accept: '.jpg,.jpeg,.png,.pdf' }
        ]
    },
    'Surat Pengantar SKCK': {
        judul: 'Persyaratan Dokumen Surat Pengantar SKCK:',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Pas Foto terbaru ukuran 4x6 (latar merah/biru)'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'pas_foto', label: 'Pas Foto terbaru ukuran 4x6 (latar merah/biru)', placeholder: 'Pilih Berkas Pas Foto terbaru ukuran 4x6 (latar merah/biru)', required: true, accept: '.jpg,.jpeg,.png' }
        ]
    },
    'Surat Keterangan Kematian': {
        judul: 'Persyaratan Dokumen Surat Keterangan Kematian:',
        syaratList: [
            'KTP Almarhum/Almarhumah',
            'Kartu Keluarga (KK)',
            'Surat Keterangan Kematian dari RS/Dokter/Puskesmas'
        ],
        dokumen: [
            { id: 'ktp_almarhum', label: 'KTP Almarhum/Almarhumah', placeholder: 'Pilih Berkas KTP Almarhum/Almarhumah', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'surat_kematian_rs', label: 'Surat Keterangan Kematian dari RS/Dokter/Puskesmas', placeholder: 'Pilih Berkas Surat Keterangan Kematian dari RS/Dokter/Puskesmas', required: true, accept: '.jpg,.jpeg,.png,.pdf' }
        ]
    },
    'Surat Keterangan Domisili': {
        judul: 'Persyaratan Dokumen Surat Keterangan Domisili:',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Bukti Kontrak / Sewa / Sertifikat Rumah'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'bukti_domisili', label: 'Bukti Kontrak / Sewa / Sertifikat Rumah', placeholder: 'Pilih Berkas Bukti Kontrak / Sewa / Sertifikat Rumah', required: true, accept: '.jpg,.jpeg,.png,.pdf' }
        ]
    },
    'Surat Keterangan Usaha (SKU)': {
        judul: 'Persyaratan Dokumen Surat Keterangan Usaha (SKU):',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Foto Tempat / Lokasi Usaha'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'foto_usaha', label: 'Foto Tempat / Lokasi Usaha', placeholder: 'Pilih Berkas Foto Tempat / Lokasi Usaha', required: true, accept: '.jpg,.jpeg,.png' }
        ]
    },
    'Surat Keterangan Belum Menikah': {
        judul: 'Persyaratan Dokumen Surat Keterangan Belum Menikah:',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Surat Pernyataan Belum Menikah (Bermeterai)'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'surat_pernyataan', label: 'Surat Pernyataan Belum Menikah (Bermeterai)', placeholder: 'Pilih Berkas Surat Pernyataan Belum Menikah (Bermeterai)', required: true, accept: '.jpg,.jpeg,.png,.pdf' }
        ]
    },
    'Surat Keterangan Lainnya': {
        judul: 'Persyaratan Dokumen Surat Keterangan Lainnya:',
        syaratList: [
            'KTP Pemohon',
            'Kartu Keluarga (KK)',
            'Dokumen Pendukung Tambahan (Opsional)'
        ],
        dokumen: [
            { id: 'ktp', label: 'KTP Pemohon', placeholder: 'Pilih Berkas KTP Pemohon', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'kk', label: 'Kartu Keluarga (KK)', placeholder: 'Pilih Berkas Kartu Keluarga (KK)', required: true, accept: '.jpg,.jpeg,.png,.pdf' },
            { id: 'dokumen_tambahan', label: 'Dokumen Pendukung Tambahan (Opsional)', placeholder: 'Pilih Berkas Dokumen Pendukung Tambahan (Opsional)', required: false, accept: '.jpg,.jpeg,.png,.pdf' }
        ]
    }
};

// Store file asli warga dalam memori (Base64)
let uploadedFilesStore = {};

function renderDokumenContainer(jenis) {
    // Reset file store saat ganti jenis surat
    uploadedFilesStore = {};

    if (!jenis) {
        return `
            <div style="padding: 2rem 1.5rem; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; color: #64748b; font-size: 0.875rem;">
                <i class="ph ph-files text-3xl" style="display: block; margin-bottom: 0.5rem; color: #94a3b8;"></i>
                <p style="margin: 0; font-weight: 500; line-height: 1.5;">Silakan pilih <strong>Jenis Layanan / Surat</strong> terlebih dahulu untuk melihat persyaratan dokumen pendukung yang harus diunggah.</p>
            </div>
        `;
    }

    const config = PERSYARATAN_CONFIG[jenis] || PERSYARATAN_CONFIG['Surat Keterangan Lainnya'];

    const infoBoxHtml = `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem;">
                <i class="ph-fill ph-info" style="font-size: 1.35rem; color: #2563eb; flex-shrink: 0;"></i>
                <strong style="color: #1e40af; font-size: 0.95rem;">${config.judul}</strong>
            </div>
            
            <ol style="margin: 0 0 1rem 1.25rem; padding: 0; color: #1e3a8a; font-size: 0.85rem; line-height: 1.6;">
                ${config.syaratList.map(item => `<li>${item}</li>`).join('')}
            </ol>
            
            <div style="border-top: 1px dashed #bfdbfe; padding-top: 0.75rem; color: #3b82f6; font-size: 0.8rem; line-height: 1.5;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">📌 Petunjuk Pengunggahan Dokumen:</div>
                <ul style="margin: 0 0 0 1.2rem; padding: 0; list-style-type: disc; color: #1e3a8a;">
                    <li>Format file yang diterima: <strong>JPG, PNG, atau PDF</strong>.</li>
                    <li>Ukuran maksimal file: <strong>2 MB</strong> per dokumen.</li>
                    <li>Pastikan foto/scan dokumen <strong>asli, terbaca jelas, dan tidak terpotong</strong>.</li>
                </ul>
            </div>
        </div>
    `;

    const fieldsHtml = config.dokumen.map(doc => {
        const reqBadge = doc.required 
            ? '<span class="text-danger" style="font-size: 0.8rem; font-weight: 600;">(Wajib) *</span>' 
            : '<span class="text-muted" style="font-size: 0.8rem;">(Opsional)</span>';

        return `
            <div style="width: 100%;">
                <label class="form-label" style="font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #1e293b;">${doc.label}</span>
                    ${reqBadge}
                </label>
                <div id="dropzone-${doc.id}" class="upload-area" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; cursor: pointer; position: relative; background: #f8fafc; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; width: 100%;">
                    <i id="icon-${doc.id}" class="ph ph-upload-simple" style="font-size: 2.25rem; color: #94a3b8; margin-bottom: 8px; transition: all 0.2s ease;"></i>
                    <p id="text-${doc.id}" style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #1e293b; transition: all 0.2s ease;">${doc.placeholder || 'Pilih File'}</p>
                    <p id="subtext-${doc.id}" class="text-muted" style="font-size: 0.75rem; margin: 4px 0 0; color: #64748b;">Format: ${doc.accept.replace(/\./g, '').toUpperCase()}</p>
                    <input type="file" id="dokumen_${doc.id}" data-doc-id="${doc.id}" data-doc-label="${doc.label}" accept="${doc.accept}" ${doc.required ? 'required' : ''} style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                </div>
            </div>
        `;
    }).join('');

    return `
        ${infoBoxHtml}
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            ${fieldsHtml}
        </div>
    `;
}

export function renderPelayananForm() {
    const user = getCurrentUser();
    
    if (user.role !== ROLES.WARGA) {
        return `
            <div class="card">
                <p class="text-danger">Akses ditolak: Hanya warga yang dapat membuat pengajuan baru.</p>
                <a href="#/dashboard" class="btn btn-primary mt-4">Kembali</a>
            </div>
        `;
    }

    const options = JENIS_PELAYANAN.map(j => `<option value="${j}">${j}</option>`).join('');

    return `
        <div>
            <div class="flex items-center gap-4 mb-4">
                <a href="#/status-pengajuan" class="btn btn-secondary btn-cancel" style="padding: 8px 16px;">
                    <i class="ph ph-arrow-left" style="font-size: 1rem;"></i> Batal
                </a>
                <h1 class="text-2xl font-bold" style="color: #1e293b;">Ajukan Surat Baru</h1>
            </div>
            
            <div class="card" style="max-width: 680px;">
                <form id="pelayananForm">
                    <div class="form-group">
                        <label class="form-label" for="jenis_pelayanan" style="font-weight: 600; color: #1e293b;">Jenis Layanan / Surat <span class="text-danger">*</span></label>
                        <select id="jenis_pelayanan" class="form-input" required style="font-weight: 500;">
                            <option value="" selected>-- Pilih Jenis Layanan / Surat --</option>
                            ${options}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="keperluan" style="font-weight: 600; color: #1e293b;">Tujuan / Keperluan <span class="text-danger">*</span></label>
                        <textarea id="keperluan" class="form-input" rows="3" placeholder="Jelaskan secara singkat keperluan pembuatan surat ini..." required></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1e293b;">Dokumen Pendukung <span class="text-danger">*</span></label>
                        <div id="dynamicDokumenWrapper">
                            ${renderDokumenContainer('')}
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-weight: 600; border-radius: 8px;"><i class="ph ph-paper-plane-tilt"></i> Kirim Pengajuan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function attachFileEventListeners() {
    const fileInputs = document.querySelectorAll('#dynamicDokumenWrapper input[type="file"]');
    
    fileInputs.forEach(input => {
        const docId = input.getAttribute('data-doc-id');
        const docLabel = input.getAttribute('data-doc-label') || 'Dokumen';
        const icon = document.getElementById(`icon-${docId}`);
        const text = document.getElementById(`text-${docId}`);
        const subtext = document.getElementById(`subtext-${docId}`);
        const dropzone = document.getElementById(`dropzone-${docId}`);

        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                
                // Validasi ukuran berkas (Maks 2 MB)
                if (file.size > 2 * 1024 * 1024) {
                    showCustomToast(`Ukuran berkas "${file.name}" melebihi batas maksimal 2 MB.`, 'error');
                    input.value = '';
                    delete uploadedFilesStore[docId];
                    if (icon) {
                        icon.className = 'ph ph-upload-simple';
                        icon.style.color = '#94a3b8';
                        icon.style.fontSize = '2.25rem';
                    }
                    if (text) {
                        text.textContent = 'Pilih File';
                        text.style.color = '#1e293b';
                    }
                    if (dropzone) {
                        dropzone.style.borderColor = '#cbd5e1';
                        dropzone.style.backgroundColor = '#f8fafc';
                    }
                    return;
                }

                // Baca file fisik menggunakan FileReader untuk menyimpan Base64 Data URL
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const base64Data = evt.target.result;
                    uploadedFilesStore[docId] = {
                        label: docLabel,
                        nama_file: file.name,
                        data: base64Data
                    };

                    if (icon) {
                        icon.className = 'ph-fill ph-check-circle';
                        icon.style.color = '#10b981';
                        icon.style.fontSize = '2.75rem';
                    }
                    if (text) {
                        text.textContent = file.name;
                        text.style.color = '#10b981';
                        text.style.wordBreak = 'break-all';
                    }
                    if (subtext) {
                        const sizeKB = (file.size / 1024).toFixed(1);
                        subtext.textContent = `${sizeKB} KB (Berkas Asli Terbaca)`;
                        subtext.style.color = '#059669';
                    }
                    if (dropzone) {
                        dropzone.style.borderColor = '#10b981';
                        dropzone.style.backgroundColor = '#ecfdf5';
                    }
                };
                reader.onerror = function() {
                    showCustomToast(`Gagal membaca berkas "${file.name}".`, 'error');
                };
                reader.readAsDataURL(file);

            } else {
                delete uploadedFilesStore[docId];
                if (icon) {
                    icon.className = 'ph ph-upload-simple';
                    icon.style.color = '#94a3b8';
                    icon.style.fontSize = '2.25rem';
                }
                if (text) {
                    text.textContent = 'Pilih File';
                    text.style.color = '#1e293b';
                    text.style.wordBreak = 'normal';
                }
                if (subtext) {
                    const accept = input.getAttribute('accept') || '';
                    subtext.textContent = 'Format: ' + accept.replace(/\./g, '').toUpperCase();
                    subtext.style.color = '#64748b';
                }
                if (dropzone) {
                    dropzone.style.borderColor = '#cbd5e1';
                    dropzone.style.backgroundColor = '#f8fafc';
                }
            }
        });
    });
}

export function setupPelayananFormEvents() {
    const form = document.getElementById('pelayananForm');
    const jenisSelect = document.getElementById('jenis_pelayanan');
    const dynamicWrapper = document.getElementById('dynamicDokumenWrapper');

    // Attach initial file listeners
    attachFileEventListeners();

    // Re-render upload boxes when jenis_pelayanan changes
    if (jenisSelect && dynamicWrapper) {
        jenisSelect.addEventListener('change', (e) => {
            const selectedJenis = e.target.value;
            dynamicWrapper.innerHTML = renderDokumenContainer(selectedJenis);
            attachFileEventListeners();
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Ambil user dari session / auth state aplikasi:
            const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser) 
                ? Auth.getCurrentUser() 
                : (getCurrentUser() || JSON.parse(localStorage.getItem('rwdigital_current_user') || localStorage.getItem('currentUser') || '{}'));

            // 2. Pastikan alias variabel aman:
            const user = currentUser;

            // 3. Validasi keberadaan user:
            if (!user || !user.nik) {
                showCustomToast('Sesi login telah berakhir, silakan login kembali.', 'error');
                return;
            }
            
            const jenisPelayananVal = document.getElementById('jenis_pelayanan').value;
            if (!jenisPelayananVal) {
                showCustomToast("Silakan pilih jenis layanan / surat terlebih dahulu.", "error");
                return;
            }

            const config = PERSYARATAN_CONFIG[jenisPelayananVal] || PERSYARATAN_CONFIG['Surat Keterangan Lainnya'];
            const dokumen_pendukung = [];

            // Validasi kelengkapan berkas wajib & susun array dokumen pendukung dengan file asli (Base64)
            for (const doc of config.dokumen) {
                const uploaded = uploadedFilesStore[doc.id];
                if (doc.required && (!uploaded || !uploaded.data)) {
                    showCustomToast(`Berkas "${doc.label}" wajib diunggah!`, "error");
                    return;
                }
                if (uploaded && uploaded.data) {
                    dokumen_pendukung.push({
                        label: uploaded.label || doc.label,
                        nama_file: uploaded.nama_file,
                        data: uploaded.data
                    });
                }
            }
            
            // Standarisasi nomor RT & RW warga pemohon secara dinamis murni:
            // Warga RT 01 submit -> properti rt tersimpan "01"
            // Warga RT 02 submit -> properti rt tersimpan "02"
            const cleanUserRt = getCleanRT(user.rt);
            const formattedRt = cleanUserRt ? String(cleanUserRt).padStart(2, '0') : '01';

            const cleanUserRw = getCleanRT(user.rw);
            const formattedRw = cleanUserRw ? String(cleanUserRw).padStart(2, '0') : '05';

            const data = {
                jenis_surat: jenisPelayananVal,
                jenis_pelayanan: jenisPelayananVal,
                nik: String(user.nik || '').trim(),
                nik_pemohon: String(user.nik || '').trim(),
                nama_pemohon: user.nama || user.name || 'Warga',
                rt: formattedRt,
                rw: formattedRw,
                keperluan: document.getElementById('keperluan').value,
                dokumen_pendukung: dokumen_pendukung,
                status: 'Menunggu Verifikasi RT',
                created_at: new Date().toISOString()
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Mengirim Pengajuan...';
            submitBtn.disabled = true;

            try {
                const resPengajuan = await createPengajuan(data);
                
                // Update state memori lokal / localStorage secara instan menggunakan unshift agar berada di urutan teratas
                const dbKey = 'rwdigital_db_v3';
                try {
                    const db = JSON.parse(localStorage.getItem(dbKey) || '{}');
                    if (!Array.isArray(db.pelayanan)) db.pelayanan = [];
                    const existIdx = db.pelayanan.findIndex(p => p && (p.id === resPengajuan.id || p.no_berkas === resPengajuan.id));
                    if (existIdx >= 0) {
                        db.pelayanan.splice(existIdx, 1);
                    }
                    db.pelayanan.unshift(resPengajuan);
                    localStorage.setItem(dbKey, JSON.stringify(db));
                } catch (e) {}

                showCustomToast("Pengajuan berhasil dikirim dan berkas asli tersimpan!", "success");
                setTimeout(() => {
                    window.location.hash = '#/status-pengajuan';
                }, 300);
            } catch(err) {
                showCustomToast("Error: " + err.message, "error");
            } finally {
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
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

export const showToast = showCustomToast;
