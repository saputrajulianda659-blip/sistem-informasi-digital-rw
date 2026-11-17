// js/pages/PelayananDetail.js
import { getPelayananById, updateStatusPelayanan, STATUS_PELAYANAN, isMenungguRT, isMenungguRW } from '../models/Pelayanan.js';
import { getCurrentUser, ROLES, getKetuaRT, getKetuaRW } from '../models/User.js';
import { getWargaByNIK } from '../models/Warga.js';
import { createNotifikasi, KATEGORI_NOTIFIKASI } from '../models/Notifikasi.js';
import { callBackendApi } from '../services/apiClient.js';
import { getCollection, saveCollection } from '../utils/db.js';
import { renderMainLayout, setupLayoutEvents } from '../components/Layout.js';
import { showConfirmDialog, showAlertDialog } from '../utils/uiDialog.js';
import { renderStatusBadge } from '../utils/badge.js';

function formatTanggalIndo(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    
    const tgl = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const jam = String(d.getHours()).padStart(2, '0');
    const menit = String(d.getMinutes()).padStart(2, '0');
    
    return `${tgl}, ${jam}:${menit} WIB`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Penyimpan referensi dokumen aktif di halaman detail untuk preview interaktif
let currentLoadedDocs = [];

/**
 * Helper untuk membuka file / Base64 Data URL di tab baru browser
 */
export function openInNewTab(urlOrData) {
    if (!urlOrData) return;
    if (typeof urlOrData === 'string' && urlOrData.startsWith('data:')) {
        try {
            const arr = urlOrData.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
            return;
        } catch (e) {
            console.error('Error creating Blob URL for new tab', e);
        }
    }
    window.open(urlOrData, '_blank', 'noopener,noreferrer');
}

/**
 * Memecah dokumen pendukung (array objek Base64 / string JSON / string legacy) menjadi list item terstruktur
 */
export function parseDokumenList(dokumenInput) {
    if (!dokumenInput) return [];
    
    let rawList = [];

    // 1. Jika sudah berupa Array objek
    if (Array.isArray(dokumenInput)) {
        rawList = dokumenInput;
    } else if (typeof dokumenInput === 'string') {
        const trimmed = dokumenInput.trim();
        if (!trimmed || trimmed === '-') return [];

        // 2. Jika tersimpan sebagai JSON string dari array
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    rawList = parsed;
                }
            } catch (e) {
                // Bukan JSON valid, lanjut ke fallback string
            }
        }

        // 3. Fallback format string teks legacy (dipisahkan koma / titik dua)
        if (rawList.length === 0) {
            let stringItems = [];
            if (trimmed.includes(':')) {
                stringItems = trimmed.split(/,\s*(?=[^,:]+:\s*)/);
            } else {
                stringItems = trimmed.split(/,\s*/);
            }

            return stringItems.map((item, idx) => {
                let label = 'Dokumen Pendukung';
                let fileName = item.trim();
                let hasFile = true;

                if (item.includes(':')) {
                    const colonIdx = item.indexOf(':');
                    label = item.substring(0, colonIdx).trim();
                    fileName = item.substring(colonIdx + 1).trim();
                } else {
                    label = item.trim();
                    fileName = item.trim();
                }

                if (!fileName || fileName === '-' || fileName.toLowerCase() === 'tidak ada' || fileName.toLowerCase() === 'kosong') {
                    hasFile = false;
                }

                const lowerLabel = label.toLowerCase();
                const lowerFile = fileName.toLowerCase();

                let docType = 'doc';
                let icon = 'ph-file';

                if (lowerLabel.includes('ktp') || lowerFile.includes('ktp') || lowerFile.includes('ktm')) {
                    docType = 'ktp';
                    icon = 'ph-identification-card';
                } else if (lowerLabel.includes('kk') || lowerLabel.includes('keluarga') || lowerFile.includes('kk')) {
                    docType = 'kk';
                    icon = 'ph-users-three';
                } else if (lowerLabel.includes('foto') || lowerFile.includes('foto') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) {
                    docType = 'foto';
                    icon = 'ph-image';
                } else if (/\.pdf$/i.test(fileName) || lowerLabel.includes('surat') || lowerLabel.includes('berkas')) {
                    docType = 'pdf';
                    icon = 'ph-file-pdf';
                }

                return {
                    index: idx,
                    label,
                    fileName,
                    hasFile,
                    docType,
                    icon,
                    data: null,
                    url: `uploads/${encodeURIComponent(fileName)}`
                };
            }).filter(d => d.fileName || d.label);
        }
    }

    // Map list item dokumen pendukung
    return rawList.map((item, idx) => {
        const label = item.label || `Dokumen ${idx + 1}`;
        const fileName = item.nama_file || item.fileName || item.name || '-';
        const data = item.data || item.base64 || null;
        const hasFile = Boolean(data || (fileName && fileName !== '-' && fileName.toLowerCase() !== 'tidak ada' && fileName.toLowerCase() !== 'kosong'));

        const lowerLabel = label.toLowerCase();
        const lowerFile = fileName.toLowerCase();

        let docType = 'doc';
        let icon = 'ph-file';

        if (lowerLabel.includes('ktp') || lowerFile.includes('ktp') || lowerFile.includes('ktm')) {
            docType = 'ktp';
            icon = 'ph-identification-card';
        } else if (lowerLabel.includes('kk') || lowerLabel.includes('keluarga') || lowerFile.includes('kk')) {
            docType = 'kk';
            icon = 'ph-users-three';
        } else if (lowerLabel.includes('foto') || lowerFile.includes('foto') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName) || (data && data.startsWith('data:image/'))) {
            docType = 'foto';
            icon = 'ph-image';
        } else if (/\.pdf$/i.test(fileName) || (data && data.startsWith('data:application/pdf')) || lowerLabel.includes('surat') || lowerLabel.includes('berkas')) {
            docType = 'pdf';
            icon = 'ph-file-pdf';
        }

        return {
            index: idx,
            label,
            fileName,
            hasFile,
            docType,
            icon,
            data,
            url: data ? data : `uploads/${encodeURIComponent(fileName)}`
        };
    }).filter(d => d.fileName || d.label);
}

/**
 * Render visual komponen Dokumen Pendukung Fisik
 */
function renderDokumenPendukungSection(p) {
    const rawDocs = (p.dokumen_pendukung && (Array.isArray(p.dokumen_pendukung) ? p.dokumen_pendukung.length > 0 : String(p.dokumen_pendukung).trim() !== '')) 
        ? p.dokumen_pendukung 
        : (p.berkas || p.dokumen_pendukung || []);
    const docs = parseDokumenList(rawDocs);
    currentLoadedDocs = docs;

    if (docs.length === 0) {
        return `
            <div style="margin-bottom: 1.25rem;">
                <p class="text-muted" style="font-size: 0.875rem; font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ph-folder" style="color: var(--primary-color);"></i> Dokumen Pendukung Fisik
                </p>
                <div style="padding: 10px 14px; background: var(--surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-color); color: var(--text-muted); font-size: 0.875rem; font-style: italic;">
                    Tidak ada berkas dokumen pendukung fisik yang dilampirkan.
                </div>
            </div>
        `;
    }

    const docItemsHtml = docs.map(doc => {
        if (!doc.hasFile) {
            return `
                <div class="document-item-card" style="opacity: 0.7; background: #f8fafc;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
                        <div style="width: 38px; height: 38px; border-radius: 8px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                            <i class="ph ${doc.icon}"></i>
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <p style="margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">${escapeHtml(doc.label)}</p>
                            <p style="margin: 0; font-size: 0.8125rem; color: #94a3b8; font-style: italic;">Tidak dilampirkan</p>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; color: #94a3b8; background: #e2e8f0; padding: 3px 8px; border-radius: 4px;">Kosong</span>
                </div>
            `;
        }

        return `
            <div class="document-item-card">
                <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
                    <div style="width: 38px; height: 38px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
                        <i class="ph ${doc.icon}"></i>
                    </div>
                    <div style="min-width: 0; flex: 1;">
                        <p style="margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(doc.label)}</p>
                        <p style="margin: 0; font-size: 0.875rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(doc.fileName)}">
                            ${escapeHtml(doc.fileName)}
                        </p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.75rem; flex-shrink: 0;">
                    <button type="button" class="btn btn-preview-doc" 
                            data-doc-index="${doc.index}"
                            title="Pratinjau berkas asli dokumen">
                        <i class="ph ph-eye"></i> Pratinjau
                    </button>
                    <button type="button" class="btn-open-doc-tab document-link" 
                            data-doc-index="${doc.index}"
                            title="Buka berkas di tab baru"
                            style="background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; font-size: 0.8125rem; font-weight: 600; color: var(--primary-color);">
                        Lihat Dokumen <i class="ph ph-arrow-square-out" style="font-size: 0.95rem;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <p class="text-muted" style="font-size: 0.875rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ph-folder" style="color: var(--primary-color);"></i> Dokumen Pendukung Fisik
                </p>
                <span style="font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 99px; font-weight: 600;">
                    ${docs.filter(d => d.hasFile).length} berkas terlampir
                </span>
            </div>
            <div class="document-list-container">
                ${docItemsHtml}
            </div>
        </div>
    `;
}

/**
 * Modal Pratinjau Dokumen Fisik Asli Warga (Base64) untuk Pemeriksaan RT / RW / Warga
 */
export function openDocumentPreviewModal(options = {}) {
    let { label, fileName, fileUrl, fileData, docType, namaPemohon, nikPemohon, pengajuan } = options;
    const rawSrc = fileData || fileUrl;
    const isImage = (rawSrc && (rawSrc.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName))) || ['ktp', 'kk', 'foto'].includes(docType);
    const isPdf = (rawSrc && rawSrc.startsWith('data:application/pdf')) || /\.pdf$/i.test(fileName);
    
    // Resolve active pengajuan if not passed
    if (!pengajuan) {
        const id = getSuratIdFromUrl();
        if (id) {
            const allP = getCollection('pelayanan') || [];
            pengajuan = allP.find(item => item && (item.id === id || item.no_berkas === id)) || getPelayananById(id);
        }
    }

    // Flexible mapping of nama and NIK pemohon reading all alias fields
    if (pengajuan) {
        if (!namaPemohon || namaPemohon === 'Warga') {
            namaPemohon = pengajuan.nama_pemohon || pengajuan.nama || (pengajuan.user && (pengajuan.user.nama || pengajuan.user.name)) || '';
        }
        if (!nikPemohon || nikPemohon === '-') {
            nikPemohon = pengajuan.nik || pengajuan.nik_pemohon || (pengajuan.user && pengajuan.user.nik) || '';
        }
    }

    // Cross-check with warga collection for full completeness
    if ((!namaPemohon || namaPemohon === 'Warga') && nikPemohon && nikPemohon !== '-') {
        const warga = getWargaByNIK(nikPemohon);
        if (warga && warga.nama) {
            namaPemohon = warga.nama;
        }
    }

    if ((!nikPemohon || nikPemohon === '-') && namaPemohon && namaPemohon !== 'Warga') {
        const allWarga = getCollection('warga') || [];
        const matchWarga = allWarga.find(w => w && w.nama && w.nama.trim().toLowerCase() === namaPemohon.trim().toLowerCase());
        if (matchWarga && matchWarga.nik) {
            nikPemohon = matchWarga.nik;
        }
    }

    namaPemohon = namaPemohon || 'Warga';
    nikPemohon = nikPemohon || '-';
    
    let previewContent = '';

    if (rawSrc && isImage) {
        // Tampilkan gambar asli Base64 langsung
        previewContent = `
            <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; display: flex; justify-content: center; align-items: center; min-height: 260px; max-height: 480px; overflow: auto; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
                <img src="${rawSrc}" 
                     alt="${escapeHtml(fileName)}" 
                     style="max-width: 100%; max-height: 450px; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
            </div>
        `;
    } else if (rawSrc && isPdf) {
        // Tampilkan PDF dalam iframe
        previewContent = `
            <div style="background: #f8fafc; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
                <iframe src="${rawSrc}" style="width: 100%; height: 400px; border: none; border-radius: 6px;"></iframe>
            </div>
        `;
    } else {
        previewContent = `
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 2rem;">
                    <i class="ph ph-file-text"></i>
                </div>
                <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">${escapeHtml(fileName)}</h4>
                <p style="color: #64748b; font-size: 0.8125rem;">Berkas Dokumen Digital Terlampir</p>
            </div>
        `;
    }

    if (typeof window !== 'undefined' && window.Swal) {
        window.Swal.fire({
            title: `<div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.15rem; font-weight: 700; color: #1e293b;">
                <i class="ph ph-file-magnifying-glass" style="color: var(--primary-color);"></i>
                <span>Pratinjau: ${escapeHtml(label)}</span>
            </div>`,
            html: `
                <div style="text-align: left; font-size: 0.875rem;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
                        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 6px;">
                            <span style="color: #64748b;">Nama Berkas:</span>
                            <span style="font-weight: 600; color: #1e293b; word-break: break-all;">${escapeHtml(fileName)}</span>
                            <span style="color: #64748b;">Pemohon:</span>
                            <span id="modalPemohonText" style="color: #1e293b; font-weight: 600;">${escapeHtml(namaPemohon)} (NIK: ${escapeHtml(nikPemohon)})</span>
                            <span style="color: #64748b;">Status:</span>
                            <span style="color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="ph-bold ph-check-circle"></i> Berkas Asli Pemohon
                            </span>
                        </div>
                    </div>
                    ${previewContent}
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #f1f5f9;">
                        <span style="color: #64748b; font-size: 0.75rem;">
                            <i class="ph ph-info"></i> Buka tab baru untuk melihat ukuran penuh / cetak
                        </span>
                        <button type="button" id="btnModalOpenTab" style="background: none; border: none; color: #2563eb; font-weight: 700; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 0;">
                            Buka di Tab Baru <i class="ph ph-arrow-square-out"></i>
                        </button>
                    </div>
                </div>
            `,
            width: 680,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-arrow-square-out"></i> Buka di Tab Baru',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#4880FF',
            cancelButtonColor: '#64748b',
            focusConfirm: false,
            didOpen: () => {
                const btnTab = document.getElementById('btnModalOpenTab');
                if (btnTab && rawSrc) {
                    btnTab.addEventListener('click', () => openInNewTab(rawSrc));
                }
                const modalPemohonEl = document.getElementById('modalPemohonText');
                if (modalPemohonEl) {
                    modalPemohonEl.textContent = `${namaPemohon} (NIK: ${nikPemohon})`;
                }
            }
        }).then((result) => {
            if (result.isConfirmed && rawSrc) {
                openInNewTab(rawSrc);
            }
        });
    } else {
        openInNewTab(rawSrc);
    }
}

export function getCleanRT(val) {
    if (!val) return '';
    return String(val).replace(/^0+/, '').trim();
}

/**
 * Auto-Reload & State Update: Fetch latest pengajuan detail from backend API or local collection
 */
export async function fetchDetail(id) {
    if (!id) return null;
    try {
        const res = await callBackendApi('pelayanan.php', { action: 'detail', id: id }, 'GET');
        if (res && res.success && res.data) {
            let item = res.data;
            if (Array.isArray(item)) {
                item = item.find(x => x && (x.id === id || x.no_berkas === id)) || item[0];
            }
            if (item && (item.id || item.no_berkas)) {
                if (!item.id && item.no_berkas) item.id = item.no_berkas;
                const list = getCollection('pelayanan') || [];
                const idx = list.findIndex(p => p && (p.id === id || p.id === item.id));
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...item };
                } else {
                    list.unshift(item);
                }
                saveCollection('pelayanan', list);
                return item;
            }
        }
    } catch (e) {
        console.warn('[fetchDetail Backend Fallback]', e);
    }
    return getPelayananById(id);
}

export function getSuratIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    return urlParams.get('id');
}

export function checkAccessPengajuan(pengajuan, currentUser) {
    if (!pengajuan || !currentUser) return false;

    let rtVal = pengajuan.rt;
    let nikVal = pengajuan.nik || pengajuan.nik_pemohon;
    if (!rtVal && nikVal) {
        const pemohon = getWargaByNIK(nikVal);
        if (pemohon && pemohon.rt) rtVal = pemohon.rt;
    }

    // Normalisasi angka RT & NIK seragam di seluruh aplikasi
    const cleanNikPengajuan = getCleanRT(nikVal);
    const cleanNikUser = getCleanRT(currentUser.nik);

    const cleanRtPengajuan = getCleanRT(rtVal);
    const cleanRtUser = getCleanRT(currentUser.rt);

    const roleLower = String(currentUser.role || '').toLowerCase();

    // 1. Pemohon warga pemilik pengajuan (sama untuk Warga RT 01 & RT 02)
    const isPemohon = (cleanNikPengajuan && cleanNikPengajuan === cleanNikUser) ||
        (Boolean(currentUser.nik) && String(pengajuan.nik || pengajuan.nik_pemohon || '').trim() === String(currentUser.nik).trim());

    // 2. Ketua RT di wilayah yang sama (misal RT 01 dengan RT 01, RT 02 dengan RT 02)
    const isRTWilayah = roleLower.includes('rt') && cleanRtPengajuan === cleanRtUser && Boolean(cleanRtUser);

    // 3. Ketua RW atau Pengurus RW (membawahi seluruh RT)
    const isRWWilayah = roleLower.includes('rw');

    // 4. Super Admin
    const isSuperAdmin = roleLower.includes('admin');

    return Boolean(isPemohon || isRTWilayah || isRWWilayah || isSuperAdmin);
}

export function renderErrorAccess(message = "Pengajuan tidak ditemukan atau Anda tidak memiliki akses.") {
    const user = getCurrentUser() || {};
    let backLink = '#/dashboard';
    if (user.role === ROLES.WARGA) backLink = '#/status-pengajuan';
    else if (user.role === ROLES.KETUA_RT) backLink = '#/verifikasi-pengajuan';
    else if (user.role === ROLES.KETUA_RW) backLink = '#/persetujuan-pelayanan';

    return `
        <div class="card" style="padding: 2.5rem 1.5rem; text-align: center; max-width: 600px; margin: 2rem auto;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.75rem;">
                <i class="ph-bold ph-shield-warning"></i>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">Akses Ditolak</h3>
            <p class="text-danger" style="font-size: 0.875rem; margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
            <div>
                <a href="${backLink}" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                    <i class="ph-bold ph-arrow-left"></i> Kembali ke Halaman Sebelumnya
                </a>
            </div>
        </div>
    `;
}

export function renderDetailContent(p, user) {
    // Determine back link
    let backLink = '#/dashboard';
    if (user.role === ROLES.WARGA) backLink = '#/status-pengajuan';
    else if (user.role === ROLES.KETUA_RT) backLink = '#/verifikasi-pengajuan';
    else if (user.role === ROLES.KETUA_RW) backLink = '#/persetujuan-pelayanan';
    else if (user.role === ROLES.ADMIN_RW || user.role === ROLES.SUPER_ADMIN) backLink = '#/pelayanan';

    // Action Form & Indicator Logic
    let actionFormHtml = '';
    const roleLower = String(user.role || '').toLowerCase();
    let pRt = p.rt;
    if (!pRt && (p.nik || p.nik_pemohon)) {
        const pemohon = getWargaByNIK(p.nik || p.nik_pemohon);
        if (pemohon && pemohon.rt) pRt = pemohon.rt;
    }
    const isRT = roleLower.includes('rt') && !roleLower.includes('rw') && (getCleanRT(pRt) === getCleanRT(user.rt));
    const isRW = roleLower.includes('rw') || roleLower.includes('admin');

    const statusStr = String(p.status || '').toLowerCase().trim();
    const isMenungguVerifikasiRT = isMenungguRT(p.status) || statusStr === 'menunggu_verifikasi_rt' || (statusStr.includes('menunggu') && statusStr.includes('rt'));
    const isMenungguVerifikasiRW = isMenungguRW(p.status) || statusStr === 'menunggu_verifikasi_rw' || statusStr === 'menunggu_persetujuan_rw' || (statusStr.includes('menunggu') && statusStr.includes('rw')) || (statusStr.includes('persetujuan') && statusStr.includes('rw'));
    const isPerluPerbaikan = (statusStr === 'perlu diperbaiki' || statusStr === 'perlu_diperbaiki' || statusStr === 'perlu_perbaikan' || statusStr === 'perlu perbaikan' || statusStr.includes('perbaikan') || statusStr.includes('revisi')) && !statusStr.includes('menunggu');
    const isDitolakRT = p.status === STATUS_PELAYANAN.DITOLAK_RT || statusStr.includes('ditolak rt');
    const isDitolakRW = p.status === STATUS_PELAYANAN.DITOLAK_RW || statusStr.includes('ditolak rw');
    const isSelesai = p.status === STATUS_PELAYANAN.SELESAI || statusStr === 'selesai';

    const catatanPerbaikan = p.catatan_rt || p.catatan || p.alasan_perbaikan || p.keterangan || 'Harap periksa dan lengkapi kembali dokumen persyaratan Anda.';

    // KONDISI RENDER UI RT (Sama persis untuk RT 01, RT 02, dst):
    // 1. Tampilkan form tindakan verifikasi HANYA jika status masih 'menunggu_verifikasi_rt' dan BUKAN dalam status perlu perbaikan
    if (isRT && isMenungguVerifikasiRT && !isPerluPerbaikan) {
        actionFormHtml = `
            <div id="tindakanVerifikasiRT" class="card mt-4" style="border: 1px solid var(--warning-color);">
                <h3 class="mb-4">Tindakan Verifikasi RT</h3>
                <form id="actionForm">
                    <div class="flex gap-4" style="flex-wrap: wrap;">
                        <button type="button" class="btn btn-action" data-action="APPROVE" style="background: var(--success-color); color: white;"><i class="ph ph-check"></i> Setujui Pengajuan</button>
                        <button type="button" class="btn btn-action" data-action="REVISION" style="background: #f59e0b; color: white;"><i class="ph ph-note-pencil"></i> Minta Perbaikan (Perlu Diperbaiki)</button>
                        <button type="button" class="btn btn-action btn-outline" data-action="REJECT" style="border-color: var(--danger-color); color: var(--danger-color);"><i class="ph ph-x"></i> Tolak Pengajuan</button>
                    </div>
                </form>
            </div>
        `;
    } 
    // 2. Jika status Perlu Diperbaiki: sembunyikan tombol verifikasi RT, ganti dengan keterangan menunggu revisi pemohon
    else if (isRT && isPerluPerbaikan) {
        actionFormHtml = `
            <div class="card mt-4" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
                        <i class="ph-bold ph-note-pencil"></i>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="ph-bold ph-note-pencil"></i> Perlu Perbaikan / Revisi
                            </span>
                        </div>
                        <p style="margin: 0.35rem 0 0 0; color: #92400e; font-size: 0.8125rem; line-height: 1.4;">
                            Permintaan perbaikan telah dikirim ke pemohon. Menunggu warga mengunggah perbaikan dokumen persyaratan sebelum verifikasi dapat dilanjutkan.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    // 3. Sembunyikan form tindakan jika sudah disetujui RT / menunggu RW, dan tampilkan indikator/badge status terbaru
    else if (isRT && isMenungguVerifikasiRW && !isPerluPerbaikan) {
        actionFormHtml = `
            <div class="card mt-4" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
                        <i class="ph-bold ph-hourglass-high"></i>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            ${renderStatusBadge('Menunggu Verifikasi RW', 'Disetujui RT / Menunggu Verifikasi RW')}
                        </div>
                        <p style="margin: 0.35rem 0 0 0; color: #0c4a6e; font-size: 0.8125rem; line-height: 1.4;">
                            Berkas pengajuan ini telah Anda setujui dan sedang diteruskan untuk verifikasi akhir Ketua RW.
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else if (isRW && isMenungguVerifikasiRW && !isPerluPerbaikan) {
        actionFormHtml = `
            <div class="card mt-4" style="border: 1px solid var(--primary-color);">
                <h3 class="mb-4">Tindakan Persetujuan RW</h3>
                <form id="actionForm">
                    <div class="flex gap-4" style="flex-wrap: wrap;">
                        <button type="button" class="btn btn-action" data-action="APPROVE" style="background: var(--success-color); color: white;"><i class="ph ph-check"></i> Setujui Pengajuan</button>
                        <button type="button" class="btn btn-action" data-action="REVISION" style="background: #f59e0b; color: white;"><i class="ph ph-note-pencil"></i> Minta Perbaikan (Perlu Diperbaiki)</button>
                        <button type="button" class="btn btn-action btn-outline" data-action="REJECT" style="border-color: var(--danger-color); color: var(--danger-color);"><i class="ph ph-x"></i> Tolak Pengajuan</button>
                    </div>
                </form>
            </div>
        `;
    }

    // 4. Jika Warga / Pemohon dan status Perlu Diperbaiki: tampilkan area/form unggah dokumen susulan/perbaikan
    const isWarga = (user.role === ROLES.WARGA) || roleLower.includes('warga') || (p.nik_pemohon && String(p.nik_pemohon) === String(user.nik)) || (p.nik && String(p.nik) === String(user.nik));
    if (isWarga && isPerluPerbaikan) {
        actionFormHtml = `
            <div class="card mt-4" style="background: #ffffff; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.06);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <div style="background: #ffedd5; color: #ea580c; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                        <i class="ph-bold ph-upload-simple"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #9a3412;">Unggah Dokumen Perbaikan / Dokumen Susulan</h4>
                        <p style="margin: 2px 0 0; font-size: 0.8125rem; color: #7c2d12;">Silakan unggah dokumen persyaratan yang diminta oleh Ketua RT pada catatan di atas.</p>
                    </div>
                </div>

                <form id="formUploadPerbaikan">
                    <div style="margin-bottom: 14px;">
                        <label class="form-label" style="font-size: 0.875rem; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: block;">
                            Nama / Keterangan Dokumen <span class="text-danger">*</span>
                        </label>
                        <input type="text" id="perbaikanDocLabel" class="form-control" placeholder="Contoh: Dokumen Pendukung SKTM / KTP Pemohon / Kartu Keluarga" required style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label class="form-label" style="font-size: 0.875rem; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: block;">
                            Pilih Berkas Dokumen Perbaikan <span class="text-danger">*</span>
                        </label>
                        <div id="dropzonePerbaikan" style="border: 2px dashed #fed7aa; border-radius: 10px; padding: 22px 16px; text-align: center; cursor: pointer; position: relative; background: #fffaf5; transition: all 0.2s ease;">
                            <i id="iconDropzonePerbaikan" class="ph ph-file-arrow-up" style="font-size: 2.25rem; color: #ea580c; display: block; margin-bottom: 6px;"></i>
                            <p id="textDropzonePerbaikan" style="margin: 0; font-weight: 600; font-size: 0.875rem; color: #1e293b;">Klik atau tarik berkas dokumen ke area ini</p>
                            <p id="subtextDropzonePerbaikan" style="margin: 4px 0 0; font-size: 0.75rem; color: #64748b;">Format: JPG, PNG, atau PDF (Maksimal 2 MB)</p>
                            <input type="file" id="filePerbaikan" accept=".jpg,.jpeg,.png,.pdf" required style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                        </div>
                        <div id="previewPerbaikanContainer" style="display: none; margin-top: 10px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                                    <i class="ph-bold ph-check-circle" style="color: #16a34a; font-size: 1.25rem; flex-shrink: 0;"></i>
                                    <span id="previewPerbaikanName" style="font-weight: 600; font-size: 0.875rem; color: #15803d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
                                </div>
                                <span style="font-size: 0.75rem; color: #16a34a; font-weight: 700; background: #dcfce7; padding: 3px 8px; border-radius: 4px;">Siap Dikirim</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="submit" id="btnSubmitPerbaikan" class="btn btn-primary" style="padding: 10px 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; background: #ea580c; border-color: #ea580c;">
                            <i class="ph-bold ph-paper-plane-tilt"></i> Kirim Dokumen Perbaikan ke RT
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Timeline steps
    const step1 = true; // Always submitted
    const step2 = isMenungguVerifikasiRW || isSelesai || isDitolakRW || isDitolakRT || isPerluPerbaikan;
    const step3 = isSelesai || isDitolakRW;

    let step2Class = '';
    if (isDitolakRT) {
        step2Class = 'rejected';
    } else if (isPerluPerbaikan) {
        step2Class = 'warning';
    } else if (step2) {
        step2Class = 'active';
    }

    let step3Class = isDitolakRW ? 'rejected' : (step3 ? 'active' : '');

    let step2StatusLabel = 'Selesai';
    if (isPerluPerbaikan) step2StatusLabel = 'Perlu Diperbaiki';
    else if (isMenungguVerifikasiRW) step2StatusLabel = 'Disetujui RT / Menunggu Verifikasi RW';
    else if (isDitolakRT) step2StatusLabel = 'Ditolak';

    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const now = new Date();
    const docNumber = `0${Math.floor(Math.random() * 9) + 1}5/PRT/${romanMonths[now.getMonth()]}/${now.getFullYear()}`;
    const printDate = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Resolusi nama pejabat Ketua RT & Ketua RW untuk tanda tangan cetak
    const rtObj = getKetuaRT(p.rt, p.rw);
    const rwObj = getKetuaRW(p.rw);
    const namaKetuaRT = p.nama_rt || p.namaRt || rtObj?.name || (String(p.rt).includes('2') ? 'Eko Prasetyo' : 'Ahmad Fauzi');
    const namaKetuaRW = p.nama_rw || p.namaRw || rwObj?.name || 'Bambang Mulyono';

    // Resolusi judul surat dinamis
    const jenisSuratRaw = (p.jenis_pelayanan || p.jenis_surat || p.jenis || p.jenisPelayanan || 'Surat Pengantar').trim();
    let judulSuratCetak = jenisSuratRaw.toUpperCase();
    if (!judulSuratCetak.startsWith('SURAT PENGANTAR')) {
        judulSuratCetak = `SURAT PENGANTAR ${judulSuratCetak}`;
    }

    return `
        <style>
            .timeline { list-style: none; padding: 0; }
            .timeline li { padding-left: 2rem; position: relative; padding-bottom: 1.5rem; }
            .timeline li::before {
                content: ''; position: absolute; left: 0; top: 0; width: 1rem; height: 1rem;
                border-radius: 50%; background: var(--border-color); border: 2px solid white; z-index: 2;
            }
            .timeline li:not(:last-child)::after {
                content: ''; position: absolute; left: 0.45rem; top: 1rem; bottom: 0; width: 2px;
                background: var(--border-color); z-index: 1;
            }
            .timeline li.active::before { background: var(--success-color); }
            .timeline li.rejected::before { background: var(--danger-color); }
            .timeline li.warning::before { background: #f59e0b; border-color: #fef3c7; }
            .timeline li.active:not(:last-child)::after { background: var(--success-color); }
            .timeline li.warning:not(:last-child)::after { background: #f59e0b; }
            
            /* Dokumen Pendukung Styling */
            .document-list-container {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .document-item-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: #ffffff;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                transition: all 0.2s ease;
            }
            .document-item-card:hover {
                border-color: #cbd5e1;
                background: #fdfefe;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            .document-link {
                color: var(--primary-color, #4880FF);
                text-decoration: none;
                font-weight: 600;
                font-size: 0.8125rem;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 6px 12px;
                border-radius: 6px;
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .document-link:hover {
                color: #1d4ed8;
                background: #dbeafe;
                text-decoration: underline;
                box-shadow: 0 2px 6px rgba(72, 128, 255, 0.15);
            }
            .btn-preview-doc {
                background: #ffffff;
                border: 1px solid #cbd5e1;
                color: #334155;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8125rem;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .btn-preview-doc:hover {
                background: #f8fafc;
                border-color: #94a3b8;
                color: #0f172a;
            }

            .print-only { display: none !important; }
            @media print {
                @page {
                    size: A4 portrait;
                    margin: 15mm 20mm;
                }
                html, body {
                    width: 100%;
                    height: auto;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                }
                body * { visibility: hidden; }
                #app, .main-layout, .main-content {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: transparent !important;
                }
                #print-area, #print-area * {
                    visibility: visible;
                }
                #print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    color: #000000 !important;
                    background: #ffffff !important;
                    padding: 10px 15px !important;
                    box-sizing: border-box;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .print-only { display: block !important; }
                .no-print { display: none !important; }
            }
        </style>
        <div class="no-print">
            <div class="flex items-center gap-4 mb-4">
                <a href="${backLink}" class="btn btn-secondary btn-back" style="padding: 8px 16px;">
                    <i class="ph ph-arrow-left" style="font-size: 1rem;"></i> Kembali
                </a>
                <h1 class="text-2xl font-bold" style="color: #1e293b;">Detail Pengajuan: ${p.id}</h1>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
                <!-- Detail Info -->
                <div class="card">
                    <h3 class="mb-4" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Informasi Pengajuan</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <p class="text-muted" style="font-size: 0.875rem;">Jenis Pelayanan</p>
                            <p class="font-bold">${p.jenis_pelayanan || p.jenis_surat || 'Pelayanan Surat'}</p>
                        </div>
                        <div>
                            <p class="text-muted" style="font-size: 0.875rem;">Tanggal Pengajuan</p>
                            <p class="font-bold">${formatTanggalIndo(p.tanggal_pengajuan || p.created_at)}</p>
                        </div>
                        <div>
                            <p class="text-muted" style="font-size: 0.875rem;">Pemohon (NIK)</p>
                            <p class="font-bold"><a href="#/data-warga/detail?nik=${p.nik_pemohon || p.nik || ''}" style="color:var(--primary-color)">${p.nama_pemohon || 'Warga'} (${p.nik_pemohon || p.nik || '-'})</a></p>
                        </div>
                        <div>
                            <p class="text-muted" style="font-size: 0.875rem;">Wilayah</p>
                            <p class="font-bold">RT ${p.rt || '01'} / RW ${p.rw || '05'}</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <p class="text-muted" style="font-size: 0.875rem;">Keperluan</p>
                        <p style="background: var(--surface-hover); padding: 1rem; border-radius: var(--radius-md);">${p.keperluan || '-'}</p>
                    </div>
                    ${renderDokumenPendukungSection(p)}
                    
                    ${isPerluPerbaikan ? `
                        <div style="background: #ffffff; border: 1px solid #fed7aa; border-left: 5px solid #f97316; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.08); margin-top: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <div style="background: #ffedd5; color: #ea580c; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem;">
                                    <i class="bi bi-exclamation-triangle-fill ph-bold ph-warning"></i>
                                </div>
                                <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: #9a3412;">Catatan Tindak Lanjut dari Ketua RT</h4>
                            </div>
                            <p style="margin: 0; padding-left: 42px; font-size: 14px; color: #431407; line-height: 1.6;">
                                "${escapeHtml(catatanPerbaikan)}"
                            </p>
                        </div>
                    ` : ''}
                    
                    ${actionFormHtml}
                </div>
                
                <!-- Tracking Status -->
                <div class="card">
                    <h3 class="mb-4" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Tracking Status</h3>
                    <ul class="timeline">
                        <li class="active">
                            <strong>Diajukan oleh Warga</strong>
                            <p class="text-muted" style="font-size: 0.75rem;">${formatTanggalIndo(p.tanggal_pengajuan)}</p>
                        </li>
                        <li class="${step2Class}">
                            <strong>Verifikasi Ketua RT</strong>
                            ${isPerluPerbaikan ? `
                                <div style="margin-top: 0.35rem; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.8125rem; color: #64748b;">Status:</span>
                                    <span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; font-weight: 700; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
                                        <i class="ph-bold ph-note-pencil" style="color: #f59e0b;"></i> Perlu Perbaikan / Revisi
                                    </span>
                                </div>
                                <p style="font-size: 0.8125rem; color: #92400e; margin-top: 0.35rem; line-height: 1.35; font-style: italic;">
                                    Catatan: ${escapeHtml(catatanPerbaikan)}
                                </p>
                            ` : (step2 ? `
                                <div style="margin-top: 0.35rem; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.8125rem; color: #64748b;">Status:</span>
                                    ${renderStatusBadge(step2StatusLabel)}
                                </div>
                                <p class="text-muted" style="font-size: 0.875rem; font-style: italic; margin-top: 0.25rem;">Catatan: ${escapeHtml(p.catatan_rt || '-')}</p>
                            ` : `<p class="text-muted" style="font-size: 0.75rem;">Menunggu verifikasi...</p>`)}
                        </li>
                        <li class="${step3Class}">
                            <strong>Persetujuan Ketua RW</strong>
                            ${step3 ? `
                                <div style="margin-top: 0.35rem; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.8125rem; color: #64748b;">Status:</span>
                                    ${renderStatusBadge(p.status.includes('Ditolak') ? 'Ditolak RW' : 'Selesai')}
                                </div>
                                <p class="text-muted" style="font-size: 0.875rem; font-style: italic; margin-top: 0.25rem;">Catatan: ${p.catatan_rw || '-'}</p>
                                <p class="text-muted" style="font-size: 0.75rem; margin-top:0.5rem;">Waktu Selesai: ${formatTanggalIndo(p.tanggal_selesai)}</p>
                            ` : `<p class="text-muted" style="font-size: 0.75rem;">Menunggu...</p>`}
                        </li>
                    </ul>
                    
                    ${p.status === STATUS_PELAYANAN.SELESAI ? `
                        <div style="margin-top: 1.5rem; text-align: center;">
                            <button class="btn btn-primary w-full" onclick="window.print()" style="justify-content: center;"><i class="ph ph-printer text-lg"></i> Cetak Surat Pengantar</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- PRINT AREA (Surat Pengantar Resmi) -->
        <div id="print-area" class="print-only" style="font-family: 'Times New Roman', Times, serif; color: black; line-height: 1.5;">
            <div style="text-align: center; border-bottom: 3px double black; padding-bottom: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 1.35rem; font-weight: bold; text-transform: uppercase;">RUKUN TETANGGA ${p.rt || '01'} / RUKUN WARGA ${p.rw || '05'}</h2>
                <h3 style="margin: 4px 0 0; font-size: 1.1rem; text-transform: uppercase;">DESA CONTOH, KECAMATAN SAMPEL</h3>
                <p style="margin: 4px 0 0; font-size: 0.875rem;">Sekretariat: Lingkungan RW ${p.rw || '05'}, Telp. (021) 1234567</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
                <h3 style="margin: 0; font-size: 1.25rem; text-decoration: underline; font-weight: bold; text-transform: uppercase;">${judulSuratCetak}</h3>
                <p style="margin: 4px 0 0; font-size: 0.95rem;">Nomor: ${docNumber}</p>
            </div>
            
            <div style="margin-bottom: 20px; font-size: 1rem;">
                <p style="text-indent: 40px; margin-bottom: 12px; text-align: justify;">Yang bertanda tangan di bawah ini Ketua RT ${p.rt || '01'} / RW ${p.rw || '05'}, Desa Contoh, Kecamatan Sampel, menerangkan dengan sebenarnya bahwa:</p>
                <table style="width: 100%; margin-left: 20px; margin-bottom: 15px; font-size: 1rem;">
                    <tr><td style="width: 220px; padding: 4px 0;">Nama Lengkap</td><td>: <strong>${p.nama_pemohon || '-'}</strong></td></tr>
                    <tr><td style="padding: 4px 0;">Nomor Induk Kependudukan (NIK)</td><td>: ${p.nik_pemohon || p.nik || '-'}</td></tr>
                    <tr><td style="padding: 4px 0;">Alamat / Domisili</td><td>: Lingkungan RT ${p.rt || '01'} / RW ${p.rw || '05'}</td></tr>
                    <tr><td style="padding: 4px 0;">Jenis Pengajuan</td><td>: ${p.jenis_pelayanan || p.jenis_surat || p.jenis || '-'}</td></tr>
                    <tr><td style="padding: 4px 0;">Keperluan</td><td>: ${p.keperluan || '-'}</td></tr>
                </table>
                <p style="text-indent: 40px; text-align: justify; line-height: 1.6;">Berdasarkan surat pengantar dan dokumen fisik yang dilampirkan, bahwa nama tersebut di atas benar merupakan warga kami dan berdomisili di alamat tersebut. Demikian surat pengantar ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 1rem;">
                <div style="text-align: center; width: 250px;">
                    <p style="margin-bottom: 75px;">Mengetahui,<br>Ketua RW ${p.rw || '05'}</p>
                    <p style="font-weight: bold; text-decoration: underline; margin: 0;">( ${namaKetuaRW} )</p>
                </div>
                <div style="text-align: center; width: 250px;">
                    <p style="margin-bottom: 75px;">Sampel, ${printDate}<br>Ketua RT ${p.rt || '01'}</p>
                    <p style="font-weight: bold; text-decoration: underline; margin: 0;">( ${namaKetuaRT} )</p>
                </div>
            </div>
        </div>
    `;
}

export function renderPelayananDetail() {
    const suratId = getSuratIdFromUrl();
    if (!suratId) {
        return renderErrorAccess("Parameter ID pengajuan tidak ditemukan di URL.");
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
        return renderErrorAccess("Silakan masuk (login) terlebih dahulu untuk melihat berkas pengajuan ini.");
    }

    let pengajuan = getPelayananById(suratId);
    if (!pengajuan) {
        const allPelayanan = (getCollection('pelayanan') || []).filter(item => item && item.id !== 'SRT-20260902-1002');
        pengajuan = allPelayanan.find(p => p && (p.id === suratId || p.no_berkas === suratId));
    }

    if (pengajuan) {
        const pemohon = getWargaByNIK(pengajuan.nik || pengajuan.nik_pemohon);
        if (!pengajuan.nama_pemohon || pengajuan.nama_pemohon === 'undefined') {
            pengajuan.nama_pemohon = pemohon ? pemohon.nama : 'Warga';
        }
        if (!pengajuan.rt || pengajuan.rt === 'undefined') {
            pengajuan.rt = pemohon ? pemohon.rt : '01';
        }
        if (!pengajuan.rw || pengajuan.rw === 'undefined') {
            pengajuan.rw = pemohon ? pemohon.rw : '05';
        }
        if (!pengajuan.jenis_pelayanan && pengajuan.jenis_surat) {
            pengajuan.jenis_pelayanan = pengajuan.jenis_surat;
        }
        if (!pengajuan.jenis_surat && pengajuan.jenis_pelayanan) {
            pengajuan.jenis_surat = pengajuan.jenis_pelayanan;
        }
        if (!pengajuan.nik_pemohon && pengajuan.nik) {
            pengajuan.nik_pemohon = pengajuan.nik;
        }
        if (!pengajuan.nik && pengajuan.nik_pemohon) {
            pengajuan.nik = pengajuan.nik_pemohon;
        }
        if (!pengajuan.id && pengajuan.no_berkas) {
            pengajuan.id = pengajuan.no_berkas;
        }
    }

    if (!pengajuan) {
        // Tampilkan loading placeholder yang akan segera disinkronkan otomatis oleh setupPelayananDetailEvents
        return `
            <div id="detailPelayananContainer" data-surat-id="${escapeHtml(suratId)}">
                <div class="card" style="padding: 3rem 1.5rem; text-align: center; max-width: 600px; margin: 2rem auto;">
                    <i class="ph-bold ph-spinner ph-spin" style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1rem; display: inline-block;"></i>
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Memuat Data Pengajuan...</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Sedang menyinkronkan data berkas #${escapeHtml(suratId)} dari server.</p>
                </div>
            </div>
        `;
    }

    if (checkAccessPengajuan(pengajuan, currentUser)) {
        return `<div id="detailPelayananContainer" data-surat-id="${escapeHtml(suratId)}">${renderDetailContent(pengajuan, currentUser)}</div>`;
    } else {
        return renderErrorAccess("Pengajuan tidak ditemukan atau Anda tidak memiliki akses.");
    }
}

export function attachActionAndDocListeners(id) {
    let isProcessingAction = false;
    const actionBtns = document.querySelectorAll('.btn-action');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (isProcessingAction) return;
            const action = e.currentTarget.getAttribute('data-action');
            let catatan = '';
            
            if (action === 'REJECT') {
                if (typeof window !== 'undefined' && window.Swal) {
                    const { value: inputVal, isDismissed } = await window.Swal.fire({
                        title: 'Alasan Penolakan',
                        input: 'textarea',
                        inputLabel: 'Masukkan alasan penolakan pengajuan ini:',
                        inputPlaceholder: 'Tuliskan alasan penolakan di sini...',
                        inputValidator: (val) => !val && 'Alasan penolakan wajib diisi!',
                        showCancelButton: true,
                        confirmButtonText: 'Lanjutkan',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#dc2626'
                    });
                    if (isDismissed || !inputVal) return;
                    catatan = inputVal;
                } else {
                    catatan = 'Pengajuan ditolak oleh petugas';
                }
            } else if (action === 'REVISION') {
                if (typeof window !== 'undefined' && window.Swal) {
                    const { value: inputVal, isDismissed } = await window.Swal.fire({
                        title: 'Catatan Perbaikan',
                        input: 'textarea',
                        inputLabel: 'Masukkan catatan berkas/informasi yang perlu diperbaiki warga:',
                        inputPlaceholder: 'Tuliskan catatan perbaikan di sini...',
                        inputValidator: (val) => !val && 'Catatan perbaikan wajib diisi!',
                        showCancelButton: true,
                        confirmButtonText: 'Lanjutkan',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#f59e0b'
                    });
                    if (isDismissed || !inputVal) return;
                    catatan = inputVal;
                } else {
                    catatan = 'Mohon periksa dan lengkapi kembali berkas permohonan Anda.';
                }
            }
            
            let confirmTitle = 'Konfirmasi Persetujuan';
            let confirmMsg = 'Apakah Anda yakin ingin menyetujui pengajuan pelayanan ini?';
            let btnColor = '#10b981';
            let iconType = 'question';

            if (action === 'REJECT') {
                confirmTitle = 'Konfirmasi Penolakan';
                confirmMsg = 'Apakah Anda yakin ingin menolak pengajuan ini?';
                btnColor = '#dc2626';
                iconType = 'warning';
            } else if (action === 'REVISION') {
                confirmTitle = 'Konfirmasi Permintaan Revisi';
                confirmMsg = 'Minta warga memperbaiki dokumen pengajuan ini?';
                btnColor = '#f59e0b';
                iconType = 'warning';
            }

            const confirmed = await showConfirmDialog({
                title: confirmTitle,
                message: confirmMsg,
                confirmText: action === 'REJECT' ? 'Ya, Tolak' : (action === 'REVISION' ? 'Kirim Revisi' : 'Ya, Setujui'),
                cancelText: 'Batal',
                confirmButtonColor: btnColor,
                icon: iconType
            });

            if (confirmed) {
                isProcessingAction = true;
                actionBtns.forEach(b => {
                    b.disabled = true;
                    b.style.pointerEvents = 'none';
                    b.style.opacity = '0.6';
                });
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Memproses...';
                try {
                    await updateStatusPelayanan(id, action, catatan);
                    // Auto-Reload / State Update di Halaman Detail Verifikasi RT
                    await fetchDetail(id);

                    await showAlertDialog("Status pengajuan berhasil diperbarui dan notifikasi telah dikirim!", "success");

                    // Re-render UI dynamically
                    const app = document.getElementById('app');
                    if (app) {
                        app.innerHTML = renderMainLayout(renderPelayananDetail());
                        setupLayoutEvents();
                        setupPelayananDetailEvents();
                    } else {
                        window.location.reload();
                    }
                } catch(err) {
                    await showAlertDialog("Error: " + err.message, "error");
                    isProcessingAction = false;
                    actionBtns.forEach(b => {
                        b.disabled = false;
                        b.style.pointerEvents = 'auto';
                        b.style.opacity = '1';
                    });
                    btn.innerHTML = originalHtml;
                }
            }
        });
    });

    // Setup Interactive Document Preview Modal Events
    const previewBtns = document.querySelectorAll('.btn-preview-doc');
    previewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const docIndex = parseInt(btn.getAttribute('data-doc-index'), 10);
            const doc = currentLoadedDocs[docIndex];
            if (doc) {
                // Dynamically resolve the latest pengajuan record at click time
                const allP = getCollection('pelayanan') || [];
                const activePengajuan = allP.find(item => item && (item.id === id || item.no_berkas === id)) || getPelayananById(id) || {};

                const namaPemohon = activePengajuan.nama_pemohon || activePengajuan.nama || (activePengajuan.user && (activePengajuan.user.nama || activePengajuan.user.name)) || 'Warga';
                const nikPemohon = activePengajuan.nik || activePengajuan.nik_pemohon || (activePengajuan.user && activePengajuan.user.nik) || '-';

                openDocumentPreviewModal({
                    label: doc.label,
                    fileName: doc.fileName,
                    fileUrl: doc.url,
                    fileData: doc.data,
                    docType: doc.docType,
                    namaPemohon: namaPemohon,
                    nikPemohon: nikPemohon,
                    pengajuan: activePengajuan
                });
            }
        });
    });

    const openDocTabBtns = document.querySelectorAll('.btn-open-doc-tab');
    openDocTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const docIndex = parseInt(btn.getAttribute('data-doc-index'), 10);
            const doc = currentLoadedDocs[docIndex];
            if (doc) {
                openInNewTab(doc.data || doc.url);
            }
        });
    });

    // Setup Warga Perbaikan Dokumen Upload Handler
    const formPerbaikan = document.getElementById('formUploadPerbaikan');
    if (formPerbaikan) {
        const fileInput = document.getElementById('filePerbaikan');
        const docLabelInput = document.getElementById('perbaikanDocLabel');
        const dropzone = document.getElementById('dropzonePerbaikan');
        const textDropzone = document.getElementById('textDropzonePerbaikan');
        const previewContainer = document.getElementById('previewPerbaikanContainer');
        const previewName = document.getElementById('previewPerbaikanName');
        const submitBtn = document.getElementById('btnSubmitPerbaikan');

        let selectedBase64 = null;
        let selectedFileName = '';

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 2 * 1024 * 1024) {
                        showAlertDialog(`Ukuran berkas "${file.name}" melebihi batas maksimal 2 MB. Harap unggah berkas yang lebih kecil.`, 'error');
                        fileInput.value = '';
                        selectedBase64 = null;
                        selectedFileName = '';
                        if (previewContainer) previewContainer.style.display = 'none';
                        if (textDropzone) textDropzone.textContent = 'Klik atau tarik berkas dokumen ke area ini';
                        return;
                    }

                    selectedFileName = file.name;
                    if (docLabelInput && !docLabelInput.value) {
                        const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
                        docLabelInput.value = cleanBase;
                    }

                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        selectedBase64 = evt.target.result;
                        if (previewContainer && previewName) {
                            previewName.textContent = file.name;
                            previewContainer.style.display = 'block';
                        }
                        if (textDropzone) {
                            textDropzone.textContent = `File dipilih: ${file.name}`;
                        }
                        if (dropzone) {
                            dropzone.style.borderColor = '#16a34a';
                            dropzone.style.background = '#f0fdf4';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        formPerbaikan.addEventListener('submit', async (e) => {
            e.preventDefault();
            const labelVal = (docLabelInput ? docLabelInput.value : '').trim();
            if (!labelVal) {
                showAlertDialog('Harap masukkan nama atau keterangan dokumen perbaikan.', 'warning');
                return;
            }
            if (!selectedBase64 || !selectedFileName) {
                showAlertDialog('Harap pilih berkas dokumen yang akan diunggah terlebih dahulu.', 'warning');
                return;
            }

            const confirmed = await showConfirmDialog({
                title: 'Kirim Dokumen Perbaikan?',
                message: `Kirim berkas "${selectedFileName}" ke Ketua RT untuk verifikasi ulang?`,
                confirmText: 'Ya, Kirim Sekarang',
                cancelText: 'Batal',
                confirmButtonColor: '#ea580c',
                icon: 'question'
            });

            if (!confirmed) return;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Mengunggah...';
            }

            try {
                const list = getCollection('pelayanan') || [];
                const idx = list.findIndex(item => item && (item.id === id || item.no_berkas === id));
                if (idx === -1) throw new Error('Data pengajuan tidak ditemukan.');

                const targetItem = list[idx];
                let currentDocs = [];
                if (Array.isArray(targetItem.dokumen_pendukung)) {
                    currentDocs = [...targetItem.dokumen_pendukung];
                } else if (Array.isArray(targetItem.berkas)) {
                    currentDocs = [...targetItem.berkas];
                } else if (typeof targetItem.dokumen_pendukung === 'string' && targetItem.dokumen_pendukung.trim().startsWith('[')) {
                    try { currentDocs = JSON.parse(targetItem.dokumen_pendukung); } catch (e) { currentDocs = []; }
                } else if (typeof targetItem.berkas === 'string' && targetItem.berkas.trim().startsWith('[')) {
                    try { currentDocs = JSON.parse(targetItem.berkas); } catch (e) { currentDocs = []; }
                }

                const newDocItem = {
                    label: labelVal,
                    nama_file: selectedFileName,
                    fileName: selectedFileName,
                    data: selectedBase64,
                    url: selectedBase64
                };
                currentDocs.push(newDocItem);

                targetItem.dokumen_pendukung = currentDocs;
                targetItem.berkas = currentDocs;
                targetItem.status = 'menunggu_verifikasi_rt';
                targetItem.catatan_rt = targetItem.catatan_rt ? `${targetItem.catatan_rt} (Sudah diperbaiki warga)` : '';
                targetItem.updated_at = new Date().toISOString();

                list[idx] = targetItem;
                saveCollection('pelayanan', list);

                // 1. Simpan perubahan ke backend API agar tersimpan permanen di database server & bisa diakses oleh Ketua RT
                try {
                    await callBackendApi('pelayanan.php', {
                        action: 'submit',
                        id: targetItem.id,
                        no_berkas: targetItem.no_berkas || targetItem.id,
                        jenis_pelayanan: targetItem.jenis_pelayanan || targetItem.jenis_surat,
                        jenis_surat: targetItem.jenis_surat || targetItem.jenis_pelayanan,
                        nik: targetItem.nik || targetItem.nik_pemohon,
                        nik_pemohon: targetItem.nik_pemohon || targetItem.nik,
                        nama_pemohon: targetItem.nama_pemohon,
                        rt: targetItem.rt,
                        rw: targetItem.rw,
                        status: 'menunggu_verifikasi_rt',
                        keperluan: targetItem.keperluan,
                        dokumen_pendukung: currentDocs,
                        berkas: currentDocs,
                        catatan_rt: '',
                        tanggal_pengajuan: targetItem.tanggal_pengajuan || targetItem.created_at
                    }, 'POST');
                } catch(apiErr) {
                    console.warn('[callBackendApi perbaikan warning]', apiErr);
                }

                // 2. Fetch data terbaru dari backend server untuk memastikan cache dan state sinkron 100%
                try {
                    await fetchDetail(id);
                } catch(fErr) {
                    console.warn('[fetchDetail after submit perbaikan warning]', fErr);
                }

                // Kirim notifikasi ke Ketua RT
                try {
                    const cleanRt = String(targetItem.rt || '01').padStart(2, '0');
                    const ketuaRt = getKetuaRT(targetItem.rt, targetItem.rw);
                    const user = getCurrentUser() || {};
                    if (ketuaRt) {
                        createNotifikasi({
                            recipientId: ketuaRt.id,
                            target_id: ketuaRt.id,
                            target: 'ketua_rt',
                            target_rt: cleanRt,
                            recipient_phone: ketuaRt.no_hp || '',
                            recipient_email: ketuaRt.email || '',
                            recipient_name: ketuaRt.name || 'Ketua RT',
                            judul: 'Dokumen Perbaikan Surat Diunggah',
                            pesan: `Warga ${user.name || targetItem.nama_pemohon} telah mengunggah dokumen perbaikan (${labelVal}) untuk pengajuan ${targetItem.jenis_pelayanan || 'Surat'} (${id}). Silakan lakukan verifikasi berkas.`,
                            kategori: KATEGORI_NOTIFIKASI.PELAYANAN,
                            type: 'info',
                            link: '#/verifikasi-pengajuan',
                            channels: ['in_app'],
                            eventId: `${id}-revision-${Date.now()}`
                        });
                    }
                } catch(notifErr) {
                    console.warn('[Notification for revision warning]', notifErr);
                }

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('db:synced'));
                }

                await showAlertDialog('Dokumen perbaikan berhasil diunggah! Status pengajuan kini diajukan kembali ke Ketua RT untuk diverifikasi.', 'success');

                const app = document.getElementById('app');
                if (app) {
                    app.innerHTML = renderMainLayout(renderPelayananDetail());
                    setupLayoutEvents();
                    setupPelayananDetailEvents();
                } else {
                    window.location.reload();
                }
            } catch(err) {
                showAlertDialog('Gagal mengunggah dokumen: ' + err.message, 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> Kirim Dokumen Perbaikan ke RT';
                }
            }
        });
    }
}

export function setupPelayananDetailEvents() {
    const id = getSuratIdFromUrl();
    if (!id) return;

    const currentUser = getCurrentUser();
    const container = document.getElementById('detailPelayananContainer');
    const allPelayanan = (getCollection('pelayanan') || []).filter(item => item && item.id !== 'SRT-20260902-1002');
    let p = allPelayanan.find(item => item && (item.id === id || item.no_berkas === id)) || getPelayananById(id);
    if (p && !p.id && (p.no_berkas || id)) {
        p.id = p.no_berkas || id;
    }

    if (p && currentUser && checkAccessPengajuan(p, currentUser)) {
        attachActionAndDocListeners(id);
    }

    // Selalu ambil berkas terupdate dari backend server
    fetchDetail(id).then(freshPengajuan => {
        if (!freshPengajuan || Array.isArray(freshPengajuan)) return;
        if (freshPengajuan && !freshPengajuan.id && (freshPengajuan.no_berkas || id)) {
            freshPengajuan.id = freshPengajuan.no_berkas || id;
        }

        if (freshPengajuan && currentUser) {
            if (checkAccessPengajuan(freshPengajuan, currentUser)) {
                const pDocsLen = (p && (Array.isArray(p.dokumen_pendukung) ? p.dokumen_pendukung.length : (Array.isArray(p.berkas) ? p.berkas.length : 0))) || 0;
                const freshDocsLen = (freshPengajuan && (Array.isArray(freshPengajuan.dokumen_pendukung) ? freshPengajuan.dokumen_pendukung.length : (Array.isArray(freshPengajuan.berkas) ? freshPengajuan.berkas.length : 0))) || 0;

                if (container && (!p || container.querySelector('.ph-spinner') || (p && (p.status !== freshPengajuan.status || p.catatan_rt !== freshPengajuan.catatan_rt || p.catatan !== freshPengajuan.catatan || pDocsLen !== freshDocsLen)))) {
                    container.innerHTML = renderDetailContent(freshPengajuan, currentUser);
                    attachActionAndDocListeners(id);
                }
            } else {
                if (container) {
                    container.innerHTML = renderErrorAccess("Pengajuan tidak ditemukan atau Anda tidak memiliki akses.");
                }
            }
        } else if (!freshPengajuan && !p) {
            if (container) {
                container.innerHTML = renderErrorAccess("Pengajuan tidak ditemukan atau Anda tidak memiliki akses.");
            }
        }
    }).catch(err => {
        console.warn('[setupPelayananDetailEvents fetchDetail error]', err);
    });
}

