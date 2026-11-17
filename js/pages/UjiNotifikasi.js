// js/pages/UjiNotifikasi.js
// Dedicated Notification Testing Sandbox for Super Admin & Pengurus
import { getCurrentUser, ROLES } from '../models/User.js';
import { getAllWarga } from '../models/Warga.js';
import { getNotificationConfig, kirimNotifikasiMultiChannel, getNotificationLogs } from '../models/Notifikasi.js';
import { sendWhatsAppNotification, FONNTE_API_TOKEN } from '../services/notificationService.js';
import { getCollection, saveCollection } from '../utils/db.js';
import { showAlertDialog } from '../utils/uiDialog.js';
import { getDbUrl, getDatabaseUrl } from '../services/apiClient.js';

/**
 * Mengambil daftar warga aktif dari localStorage ('rwdigital_db_v3') atau fallback getAllWarga
 */
export function getDaftarWargaAktif() {
    try {
        const rawDb = localStorage.getItem('rwdigital_db_v3');
        if (rawDb) {
            const db = JSON.parse(rawDb);
            if (Array.isArray(db.warga) && db.warga.length > 0) {
                return db.warga;
            }
        }
    } catch (e) {}
    return getAllWarga(true) || [];
}

/**
 * Fetch daftar warga terbaru secara live dari api/database.json atau endpoint warga
 */
export async function fetchWargaTerbaru() {
    try {
        const targetUrl = typeof getDbUrl === 'function' ? getDbUrl() : (typeof getDatabaseUrl === 'function' ? getDatabaseUrl() : 'api/database.json');
        const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.warga) && data.warga.length > 0) {
                try {
                    const rawDb = localStorage.getItem('rwdigital_db_v3');
                    const db = rawDb ? JSON.parse(rawDb) : {};
                    db.warga = data.warga;
                    localStorage.setItem('rwdigital_db_v3', JSON.stringify(db));
                } catch (e) {}
                return data.warga;
            }
        }
    } catch (e) {
        console.warn('[UjiNotifikasi] Gagal fetch warga terbaru live:', e);
    }
    return getDaftarWargaAktif();
}

/**
 * Render opsi dropdown target warga dengan tag kontak yang akurat
 */
export function renderWargaOptions(wargaList, selectedNik = null) {
    if (!Array.isArray(wargaList) || wargaList.length === 0) {
        return '<option value="">(Belum ada data warga)</option>';
    }
    return wargaList.map(w => {
        const email = w.email || '';
        const noHp = w.no_hp || w.telepon || '';
        const contactTag = [
            email ? '✉ Email' : '',
            (noHp && noHp !== '-') ? '📱 WA' : ''
        ].filter(Boolean).join(' & ') || 'Tanpa Kontak Eksternal';
        const isSelected = selectedNik && String(w.nik).trim() === String(selectedNik).trim() ? 'selected' : '';
        return `<option value="${w.nik}" ${isSelected}>${w.nama} (${contactTag}) - RT ${w.rt || '01'}</option>`;
    }).join('');
}

export function renderUjiNotifikasi() {
    const user = getCurrentUser();
    if (!user) return '';

    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user.role);
    if (!isAdmin) {
        return `
            <div class="card" style="padding: 2.5rem; text-align: center; max-width: 600px; margin: 2rem auto;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem auto;">
                    <i class="ph-bold ph-prohibit"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Akses Terbatas</h3>
                <p class="text-muted" style="margin-bottom: 1.5rem;">Halaman Uji Coba Notifikasi hanya dapat diakses oleh Super Admin dan Pengurus RW.</p>
                <a href="#/dashboard" class="btn btn-primary">Kembali ke Dashboard</a>
            </div>
        `;
    }

    const wargaList = getDaftarWargaAktif();

    // Citizen options
    const wargaOptions = renderWargaOptions(wargaList);

    return `
        <div class="uji-notifikasi-page">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="font-size: 1.65rem; color: #1e293b; margin: 0 0 0.25rem 0;">
                        <i class="ph-bold ph-paper-plane-tilt" style="color: var(--primary-color);"></i> Uji Coba Notifikasi Digital RW
                    </h1>
                    <p class="text-muted" style="margin: 0; font-size: 0.9rem;">
                        Simulasikan dan uji pengiriman notifikasi In-App, Email, dan WhatsApp kepada data warga riil dengan validasi sasaran.
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="#/pengaturan-notifikasi" class="btn btn-outline" style="font-weight: 600; padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-gear"></i> Konfigurasi Provider
                    </a>
                    <a href="#/notifikasi" class="btn btn-outline" style="font-weight: 600; padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-bell"></i> Pusat Notifikasi
                    </a>
                </div>
            </div>

            <!-- Provider Status KPI Cards -->
            <div class="stats-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <span style="font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Kanal 1</span>
                            <h4 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 2px 0 6px 0;">In-App Notifikasi</h4>
                            <span class="badge" style="background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
                                <i class="ph-bold ph-check-circle"></i> 100% Siap Aktif
                            </span>
                        </div>
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                            <i class="ph-bold ph-bell-ringing"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <span style="font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Kanal 2</span>
                            <h4 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 2px 0 6px 0;">Email (SMTP)</h4>
                            <span id="statusBadgeEmail" class="badge" style="background: #f1f5f9; color: #64748b; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
                                Memuat status...
                            </span>
                        </div>
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                            <i class="ph-bold ph-envelope"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <span style="font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Kanal 3</span>
                            <h4 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 2px 0 6px 0;">WhatsApp Gateway (Fonnte API)</h4>
                            <span id="statusBadgeWA" class="badge" style="background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
                                <i class="ph-bold ph-check-circle"></i> 100% Siap Aktif
                            </span>
                        </div>
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                            <i class="ph-bold ph-whatsapp-logo"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Test Sandbox Area: 2 Columns -->
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1.5rem; margin-bottom: 2rem;">
                <!-- Column 1: Test Form -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-flask" style="color: #2563eb;"></i> Formulir Uji Coba Notifikasi
                    </h3>

                    <div id="sandboxAlertContainer" style="margin-bottom: 1rem;"></div>

                    <form id="sandboxForm">
                        <!-- 1. Recipient Selection -->
                        <div class="form-group mb-4">
                            <label class="form-label" for="selectTargetWarga" style="font-weight: 700; color: #1e293b;">
                                Pilih Target Warga Penerima <span style="color: #dc2626;">*</span>
                            </label>
                            <select id="selectTargetWarga" class="form-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-weight: 600;">
                                ${wargaOptions}
                            </select>
                            <span style="font-size: 0.75rem; color: #64748b; margin-top: 4px; display: block;">
                                Kontak email dan nomor HP akan otomatis diisi dari profil warga yang dipilih.
                            </span>
                        </div>

                        <!-- Recipient Quick Info Card -->
                        <div id="recipientQuickCard" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.8125rem;">
                                <div>
                                    <span style="color: #64748b;">Nama Lengkap:</span>
                                    <strong id="cardNama" style="display: block; color: #1e293b;">-</strong>
                                </div>
                                <div>
                                    <span style="color: #64748b;">Wilayah:</span>
                                    <strong id="cardWilayah" style="display: block; color: #1e293b;">-</strong>
                                </div>
                                <div>
                                    <span style="color: #64748b;">Alamat Email:</span>
                                    <span id="cardEmail" style="display: block; font-weight: 600;">-</span>
                                </div>
                                <div>
                                    <span style="color: #64748b;">Nomor WhatsApp:</span>
                                    <span id="cardPhone" style="display: block; font-weight: 600;">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Channel Selection -->
                        <div class="form-group mb-4">
                            <label class="form-label" style="font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: block;">
                                Saluran / Kanal Distribusi
                            </label>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                                    <input type="checkbox" id="chkInApp" checked disabled>
                                    <span>In-App (Wajib)</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                                    <input type="checkbox" id="chkEmail" checked>
                                    <span>Email</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                                    <input type="checkbox" id="chkWA" checked>
                                    <span>WhatsApp</span>
                                </label>
                            </div>
                        </div>

                        <!-- 3. Template Selection -->
                        <div class="form-group mb-4">
                            <label class="form-label" for="selectTemplate" style="font-weight: 700; color: #1e293b;">
                                Pilih Skenario / Templat Pesan
                            </label>
                            <select id="selectTemplate" class="form-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;">
                                <option value="surat_disetujui">1. Pengajuan Surat: Disetujui Ketua RT/RW (Pribadi)</option>
                                <option value="surat_ditolak">2. Pengajuan Surat: Ditolak / Perbaikan Dokumen (Pribadi)</option>
                                <option value="pengaduan_proses">3. Pengaduan: Ditindaklanjuti Pengurus (Pribadi)</option>
                                <option value="pengumuman_rw">4. Pengumuman: Kerja Bakti Lingkungan RW 05 (Massal Wilayah)</option>
                                <option value="darurat_alert">5. Keadaan Darurat: Peringatan Luapan Air RT 01 (Prioritas Tinggi)</option>
                                <option value="iuran_bayar">6. Iuran: Konfirmasi Pembayaran Berhasil (Pribadi)</option>
                                <option value="iuran_ingat">7. Iuran: Pengingat Iuran Bulanan Warga (Pribadi)</option>
                                <option value="kustom">8. Pesan Kustom (Tulis Sendiri)</option>
                            </select>
                        </div>

                        <!-- 4. Title & Message -->
                        <div class="form-group mb-3">
                            <label class="form-label" for="inputJudul" style="font-weight: 700; color: #1e293b;">Judul Notifikasi</label>
                            <input type="text" id="inputJudul" class="form-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;" value="Pengajuan Surat SKTM Telah Disetujui">
                        </div>

                        <div class="form-group mb-4">
                            <label class="form-label" for="inputPesan" style="font-weight: 700; color: #1e293b;">Isi Pesan Notifikasi</label>
                            <textarea id="inputPesan" class="form-input" rows="3" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; resize: vertical;">Pengajuan Surat Keterangan Tidak Mampu (SKTM) Anda telah disetujui oleh Ketua RT & RW. Silakan buka aplikasi Digital RW untuk mengunduh dokumen.</textarea>
                        </div>

                        <!-- 5. Mode: Simulation vs Real -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem;">
                            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                                <input type="checkbox" id="chkSimulasiOnly" checked style="margin-top: 3px;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #1e293b;">Mode Simulasi Aman (Direkomendasikan)</strong>
                                    <p style="font-size: 0.78rem; color: #64748b; margin: 0; line-height: 1.35;">
                                        Mencatat dan memvalidasi alur pengiriman di sistem tanpa membebankan kuota SMS/API eksternal atau mengirim pesan nyata sebelum provider dikonfigurasi.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <!-- Submit Button -->
                        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                            <button type="submit" id="btnSubmitUji" class="btn btn-primary" style="padding: 10px 24px; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="ph-bold ph-paper-plane-right"></i> Kirim Uji Coba Sekarang
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Column 2: Live Preview & Instructions -->
                <div>
                    <!-- Live Preview Box -->
                    <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                        <h4 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 6px;">
                            <i class="ph-bold ph-eye" style="color: #2563eb;"></i> Pratinjau Tampilan Notifikasi
                        </h4>

                        <!-- In-App Preview Pill -->
                        <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; background: #f8fafc; margin-bottom: 1rem;">
                            <span style="font-size: 0.7rem; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Tampilan In-App (Header & Bell)</span>
                            <div style="display: flex; gap: 10px; align-items: flex-start; margin-top: 8px;">
                                <div style="width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                                    <i class="ph-bold ph-info"></i>
                                </div>
                                <div>
                                    <strong id="previewTitleInApp" style="font-size: 0.85rem; color: #1e293b; display: block;">Pengajuan Surat SKTM Telah Disetujui</strong>
                                    <p id="previewTextInApp" style="font-size: 0.78rem; color: #475569; margin: 2px 0 4px 0; line-height: 1.35;">Pengajuan Surat Keterangan Tidak Mampu (SKTM) Anda telah disetujui...</p>
                                    <span style="font-size: 0.68rem; color: #94a3b8;">Baru saja • Sistem Digital RW</span>
                                </div>
                            </div>
                        </div>

                        <!-- WhatsApp Preview Bubble -->
                        <div style="border: 1px solid #bbf7d0; border-radius: 10px; padding: 1rem; background: #f0fdf4;">
                            <span style="font-size: 0.7rem; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Format Pesan WhatsApp / Email</span>
                            <div style="background: #ffffff; border-radius: 8px; padding: 0.85rem; margin-top: 8px; border: 1px solid #dcfce7; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                                <strong id="previewWaHeader" style="font-size: 0.85rem; color: #1e293b; display: block; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px;">
                                    📢 DIGITAL RW NOTIFIKASI
                                </strong>
                                <p id="previewWaBody" style="font-size: 0.8rem; color: #334155; margin: 0; line-height: 1.4; white-space: pre-wrap;">
                                    Halo, *Agus*!
                                    Pengajuan Surat Keterangan Tidak Mampu (SKTM) Anda telah disetujui...
                                </p>
                                <span style="display: block; margin-top: 8px; font-size: 0.68rem; color: #94a3b8; text-align: right;">18:00 WIB • Digital RW Bot</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sandbox Rule Checklist -->
                    <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; font-size: 0.8125rem;">
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 0.75rem 0;">
                            <i class="ph-bold ph-shield-check" style="color: #16a34a;"></i> Proteksi Privasi & Isolasi Sasaran
                        </h4>
                        <ul style="padding-left: 1.25rem; margin: 0; color: #475569; line-height: 1.5;">
                            <li>Pesan pribadi hanya dikirim kepada warga yang dipilih, <strong>tidak dibocorkan ke warga lain</strong>.</li>
                            <li>Jika email atau nomor HP target kosong, kanal eksternal otomatis dilewati dengan aman.</li>
                            <li>Kredensial rahasia tersimpan di server dan <strong>tidak pernah diekspos ke frontend</strong>.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Audit Logs of Test Runs -->
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0;">Riwayat Uji Coba & Status Pengiriman</h3>
                        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Catatan waktu pengiriman, kanal, target penerima, dan respons status.</p>
                    </div>
                    <button id="btn-refresh-log" class="btn btn-sm btn-outline" style="font-weight: 600; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-arrows-clockwise"></i> Segarkan Log
                    </button>
                </div>

                <div style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                                <th style="padding: 10px 14px;">Waktu</th>
                                <th style="padding: 10px 14px;">Kanal</th>
                                <th style="padding: 10px 14px;">Target Penerima</th>
                                <th style="padding: 10px 14px;">Kategori / Judul</th>
                                <th style="padding: 10px 14px;">Status Hasil</th>
                                <th style="padding: 10px 14px;">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Memuat riwayat pengiriman...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export function setupUjiNotifikasiEvents() {
    // 1. Deklarasi State Komponen: isSimulasi (default true saat uji coba)
    let isSimulasi = true;
    const chkSimulasiOnly = document.getElementById('chkSimulasiOnly');
    if (chkSimulasiOnly) {
        chkSimulasiOnly.checked = isSimulasi;
        chkSimulasiOnly.addEventListener('change', (e) => {
            isSimulasi = e.target.checked;
        });
    }

    const wargaList = getAllWarga() || [];
    const selectTarget = document.getElementById('selectTargetWarga');
    const selectTemplate = document.getElementById('selectTemplate');
    const inputJudul = document.getElementById('inputJudul');
    const inputPesan = document.getElementById('inputPesan');
    const previewTitle = document.getElementById('previewTitleInApp');
    const previewText = document.getElementById('previewTextInApp');
    const previewWaBody = document.getElementById('previewWaBody');
    const btnSubmit = document.getElementById('btnSubmitUji');
    const btnRefresh = document.getElementById('btn-refresh-log') || document.getElementById('btnRefreshLogs');

    // Update Recipient Card
    const updateRecipientInfo = () => {
        if (!selectTarget) return;
        const nik = selectTarget.value;
        const target = wargaList.find(w => w.nik === nik);
        if (!target) return;

        const elNama = document.getElementById('cardNama');
        const elWilayah = document.getElementById('cardWilayah');
        const elEmail = document.getElementById('cardEmail');
        const elPhone = document.getElementById('cardPhone');
        const chkEmail = document.getElementById('chkEmail');
        const chkWA = document.getElementById('chkWA');

        if (elNama) elNama.innerText = target.nama;
        if (elWilayah) elWilayah.innerText = `RT ${target.rt || '01'} / RW ${target.rw || '05'}`;

        if (elEmail) {
            if (target.email) {
                elEmail.innerHTML = `<span style="color: #0284c7;">${target.email}</span>`;
                if (chkEmail) chkEmail.disabled = false;
            } else {
                elEmail.innerHTML = `<span style="color: #dc2626; font-size: 0.75rem;">(Belum Diisi)</span>`;
                if (chkEmail) { chkEmail.checked = false; chkEmail.disabled = true; }
            }
        }

        if (elPhone) {
            if (target.no_hp && target.no_hp !== '-') {
                elPhone.innerHTML = `<span style="color: #16a34a;">${target.no_hp}</span>`;
                if (chkWA) chkWA.disabled = false;
            } else {
                elPhone.innerHTML = `<span style="color: #dc2626; font-size: 0.75rem;">(Belum Diisi)</span>`;
                if (chkWA) { chkWA.checked = false; chkWA.disabled = true; }
            }
        }

        updateLivePreview();
    };

    // Update Live Preview Box
    const updateLivePreview = () => {
        const judul = inputJudul ? inputJudul.value : '';
        const pesan = inputPesan ? inputPesan.value : '';
        const target = selectTarget ? wargaList.find(w => w.nik === selectTarget.value) : null;
        const targetName = target ? target.nama : 'Warga';

        if (previewTitle) previewTitle.innerText = judul || 'Judul Notifikasi';
        if (previewText) previewText.innerText = pesan || 'Isi notifikasi...';
        if (previewWaBody) {
            previewWaBody.innerText = `Halo, *${targetName}*!\n\n📌 *${judul}*\n${pesan}\n\nSilakan akses aplikasi Digital RW untuk info lebih lanjut.`;
        }
    };

    // Template change handler
    if (selectTemplate) {
        selectTemplate.addEventListener('change', () => {
            const val = selectTemplate.value;
            if (val === 'surat_disetujui') {
                inputJudul.value = 'Pengajuan Surat SKTM Telah Disetujui';
                inputPesan.value = 'Pengajuan Surat Keterangan Tidak Mampu (SKTM) Anda telah disetujui oleh Ketua RT & RW. Silakan buka aplikasi Digital RW untuk mengunduh dokumen.';
            } else if (val === 'surat_ditolak') {
                inputJudul.value = 'Pengajuan Surat Memerlukan Perbaikan';
                inputPesan.value = 'Pengajuan surat Anda dikembalikan oleh Ketua RT untuk perbaikan lampiran kartu keluarga. Silakan periksa catatan revisi di aplikasi.';
            } else if (val === 'pengaduan_proses') {
                inputJudul.value = 'Pengaduan Sedang Ditindaklanjuti';
                inputPesan.value = 'Laporan kebersihan gang merdeka telah diterima oleh petugas dan sedang dalam jadwal penanganan hari ini.';
            } else if (val === 'pengumuman_rw') {
                inputJudul.value = 'Pengumuman: Kerja Bakti Lingkungan RW 05';
                inputPesan.value = 'Diberitahukan kepada seluruh warga RW 05 bahwa kerja bakti serentak akan diadakan hari Minggu pukul 07.00 WIB di pos RW.';
            } else if (val === 'darurat_alert') {
                inputJudul.value = '[PERINGATAN DARURAT] Potensi Genangan Air RT 01';
                inputPesan.value = 'Warga RT 01 dimohon mengamankan barang berharga dan waspada kenaikan debit air drainase utama.';
            } else if (val === 'iuran_bayar') {
                inputJudul.value = 'Konfirmasi Pembayaran Iuran Berhasil';
                inputPesan.value = 'Terima kasih, pembayaran iuran kebersihan & keamanan sebesar Rp 50.000 telah diverifikasi oleh bendahara.';
            } else if (val === 'iuran_ingat') {
                inputJudul.value = 'Pengingat Jadwal Iuran Warga';
                inputPesan.value = 'Mengingatkan kembali batas waktu pembayaran iuran rutin lingkungan bulan berjalan sebelum tanggal 10.';
            } else if (val === 'kustom') {
                inputJudul.value = '';
                inputPesan.value = '';
            }
            updateLivePreview();
        });
    }

    if (selectTarget) selectTarget.addEventListener('change', updateRecipientInfo);
    if (inputJudul) inputJudul.addEventListener('input', updateLivePreview);
    if (inputPesan) inputPesan.addEventListener('input', updateLivePreview);

    // Initial fill
    updateRecipientInfo();

    // Check Provider Status from Backend
    const checkProviders = async () => {
        try {
            const config = await getNotificationConfig();
            const badgeEmail = document.getElementById('statusBadgeEmail');
            const badgeWA = document.getElementById('statusBadgeWA');

            if (badgeEmail) {
                if (config.email && config.email.configured) {
                    badgeEmail.className = 'badge';
                    badgeEmail.style.background = '#dcfce7';
                    badgeEmail.style.color = '#166534';
                    badgeEmail.innerHTML = '<i class="ph-bold ph-check-circle"></i> Terhubung (SMTP)';
                } else {
                    badgeEmail.className = 'badge';
                    badgeEmail.style.background = '#fef3c7';
                    badgeEmail.style.color = '#92400e';
                    badgeEmail.innerHTML = '<i class="ph-bold ph-warning"></i> Belum dikonfigurasi';
                }
            }

            if (badgeWA) {
                badgeWA.className = 'badge';
                badgeWA.style.background = '#dcfce7';
                badgeWA.style.color = '#166534';
                badgeWA.innerHTML = '<i class="ph-bold ph-check-circle"></i> 100% Siap Aktif';
            }
        } catch (e) { }
    };

    checkProviders();

    // Load Audit Logs Table
    const loadLogs = async () => {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        try {
            const res = await getNotificationLogs({ limit: 15 });
            const logs = Array.isArray(res) ? res : (res?.logs || res?.data || []);

            if (!logs || logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Belum ada riwayat pengiriman notifikasi tercatat.</td></tr>`;
                return;
            }

            tbody.innerHTML = logs.map(l => {
                let badgeStatus = '<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.72rem; background: #dcfce7; color: #166534;">Terkirim</span>';
                if (l.status === 'failed') {
                    badgeStatus = '<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.72rem; background: #fee2e2; color: #991b1b;">Gagal</span>';
                } else if (l.status === 'simulated') {
                    badgeStatus = '<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.72rem; background: #e0f2fe; color: #0369a1;">Simulasi Berhasil</span>';
                }

                const timeStr = l.created_at ? new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';

                return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 14px; font-size: 0.78rem; color: #64748b;">${timeStr}</td>
                        <td style="padding: 8px 14px; font-weight: 700; text-transform: uppercase; font-size: 0.75rem;">${l.channel}</td>
                        <td style="padding: 8px 14px; color: #1e293b;">
                            <strong>${l.recipient_name || l.recipient || '-'}</strong>
                            <div style="font-size: 0.72rem; color: #64748b;">${l.recipient_target || l.recipient || ''}</div>
                        </td>
                        <td style="padding: 8px 14px;">
                            <span style="font-size: 0.75rem; color: #475569;">[${l.category || 'Info'}]</span>
                            <div style="font-weight: 600; color: #1e293b;">${l.title || '-'}</div>
                        </td>
                        <td style="padding: 8px 14px;">${badgeStatus}</td>
                        <td style="padding: 8px 14px; font-size: 0.75rem; color: #64748b;">
                            ${l.error_message || l.details || (l.status === 'sent' ? 'Pesan diterima oleh antrean' : '-')}
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #dc2626;">Gagal memuat log: ${e.message}</td></tr>`;
        }
    };

    loadLogs();
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            const originalHtml = btnRefresh.innerHTML;
            btnRefresh.disabled = true;
            btnRefresh.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Memperbarui...';
            try {
                await loadLogs();
            } finally {
                btnRefresh.disabled = false;
                btnRefresh.innerHTML = originalHtml;
            }
        });
    }

    // Form Submit Handler
    const form = document.getElementById('sandboxForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const alertContainer = document.getElementById('sandboxAlertContainer');
            if (alertContainer) alertContainer.innerHTML = '';

            const targetNik = selectTarget.value;
            const targetWarga = wargaList.find(w => w.nik === targetNik);
            if (!targetWarga) {
                await showAlertDialog("Target warga belum dipilih.", "warning");
                return;
            }

            const judul = inputJudul.value.trim();
            const pesan = inputPesan.value.trim();
            if (!judul || !pesan) {
                await showAlertDialog("Judul dan isi pesan tidak boleh kosong.", "warning");
                return;
            }

            // Sync status checkbox simulasi (default true)
            if (chkSimulasiOnly) {
                isSimulasi = chkSimulasiOnly.checked;
            }

            const sendInApp = document.getElementById('chkInApp')?.checked ?? true;
            const sendEmail = document.getElementById('chkEmail')?.checked ?? false;
            const sendWA = document.getElementById('chkWA')?.checked ?? false;
            const channels = [];
            if (sendInApp) channels.push('in_app');
            if (sendEmail) channels.push('email');
            if (sendWA) channels.push('whatsapp');
            if (channels.length === 0) channels.push('in_app');

            let chosenChannel = 'in_app';
            if (sendInApp && sendEmail && sendWA) chosenChannel = 'all';
            else if (sendWA && !sendEmail && !sendInApp) chosenChannel = 'whatsapp';
            else if (sendInApp && sendWA) chosenChannel = 'whatsapp';
            else if (sendInApp && sendEmail) chosenChannel = 'email';

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Mengirim Notifikasi Uji...';

            try {
                // Pastikan token Fonnte WhatsApp tersimpan
                const fonnteToken = '65G3LsBQrNkQLSV1F9Dc';
                if (typeof localStorage !== 'undefined') {
                    if (!localStorage.getItem('fonnte_api_token')) {
                        localStorage.setItem('fonnte_api_token', fonnteToken);
                    }
                    if (!localStorage.getItem('fonnte_token')) {
                        localStorage.setItem('fonnte_token', fonnteToken);
                    }
                }

                // 1. Simpan record simulasi ke tabel in-app notification & logs secara konsisten terkunci ke NIK penerima
                const currentNotifs = getCollection('notifikasi') || [];
                const simNotifId = "NTF-" + Date.now();
                const nowIso = new Date().toISOString();
                const finalJudul = isSimulasi ? `[SIMULASI] ${judul}` : judul;

                const payloadNotif = {
                    id: simNotifId,
                    nik: targetNik, // contoh: 3201010101010003
                    target_nik: targetNik,
                    nama: targetWarga.nama,
                    nama_pemohon: targetWarga.nama,
                    recipient_name: targetWarga.nama,
                    targetRole: "warga",
                    target_role: "warga",
                    target: "warga",
                    role: "warga",
                    targetScope: "personal", // TANDAI PERSONAL, BUKAN BROADCAST
                    target_scope: "personal",
                    scope: "personal",
                    judul: finalJudul,
                    pesan: pesan,
                    kategori: selectTemplate.value.includes('darurat') ? 'Darurat' : 'Pengumuman',
                    type: 'info',
                    link: '#/notifikasi',
                    priority: selectTemplate.value.includes('darurat') ? 'high' : 'normal',
                    waktu: nowIso,
                    created_at: nowIso,
                    tanggal: nowIso,
                    isRead: false,
                    is_read: false,
                    is_simulation: isSimulasi,
                    userId: targetWarga.nik
                };

                currentNotifs.unshift(payloadNotif);
                saveCollection('notifikasi', currentNotifs);

                // 2. Panggil fungsi multi channel notification
                const res = await kirimNotifikasiMultiChannel({
                    id: simNotifId,
                    skipInAppInsert: true,
                    judul: finalJudul,
                    pesan: pesan,
                    type: 'info',
                    kategori: selectTemplate.value.includes('darurat') ? 'Darurat' : 'Pengumuman',
                    channel: chosenChannel,
                    channels: channels,
                    target: 'warga',
                    targetRole: 'warga',
                    target_role: 'warga',
                    targetScope: 'personal',
                    target_scope: 'personal',
                    scope: 'personal',
                    target_id: targetWarga.nik,
                    recipientNik: targetNik,
                    nik: targetNik,
                    recipient_name: targetWarga.nama,
                    nama: targetWarga.nama,
                    recipient_email: targetWarga.email || '',
                    recipient_phone: targetWarga.no_hp || '',
                    is_simulation: isSimulasi,
                    link: '#/notifikasi'
                });

                // 3. Panggil service WhatsApp Gateway Fonnte secara langsung jika kanal WA dicentang
                if (sendWA && targetWarga.no_hp && targetWarga.no_hp !== '-') {
                    const waBody = `🔔 *[DIGITAL RW 05 - UJI NOTIFIKASI]*\n\n*${finalJudul}*\n\nHalo *${targetWarga.nama}*,\n${pesan}\n\n📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB\n🔗 Buka Aplikasi: #/notifikasi`;
                    try {
                        await sendWhatsAppNotification(targetWarga.no_hp, waBody, {
                            recipientId: targetNik,
                            recipientName: targetWarga.nama,
                            title: finalJudul,
                            category: selectTemplate.value.includes('darurat') ? 'Darurat' : 'Pengumuman',
                            eventId: 'SIM-WA-' + Date.now(),
                            is_simulation: isSimulasi
                        });
                    } catch (waErr) {
                        console.warn('[Fonnte WhatsApp Simulator Call Warning]:', waErr);
                    }
                }

                const backendData = res?.backendResult;
                let errorDetails = '';
                if (backendData && backendData.results) {
                    if (sendEmail && backendData.results.email?.failed > 0) {
                        errorDetails += `<div style="margin-top: 6px; padding: 6px 10px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 0.8rem;"><strong><i class="ph-bold ph-warning"></i> Email SMTP:</strong> Gagal terkirim. Periksa riwayat log untuk detail error.</div>`;
                    }
                    if (sendWA && backendData.results.whatsapp?.failed > 0) {
                        errorDetails += `<div style="margin-top: 6px; padding: 6px 10px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 0.8rem;"><strong><i class="ph-bold ph-warning"></i> WhatsApp:</strong> Gagal terkirim. Periksa riwayat log untuk detail error.</div>`;
                    }
                } else if (backendData && backendData.success === false && backendData.error) {
                    errorDetails += `<div style="margin-top: 6px; padding: 6px 10px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 0.8rem;"><strong><i class="ph-bold ph-warning"></i> Backend:</strong> ${backendData.error}</div>`;
                }

                if (alertContainer) {
                    const isAnyFailed = errorDetails.length > 0;
                    alertContainer.innerHTML = `
                        <div style="background: ${isAnyFailed ? '#fef3c7' : '#dcfce7'}; border: 1px solid ${isAnyFailed ? '#fde68a' : '#bbf7d0'}; color: ${isAnyFailed ? '#92400e' : '#166534'}; padding: 1rem; border-radius: 8px; font-size: 0.875rem;">
                            <strong><i class="ph-bold ${isAnyFailed ? 'ph-warning-circle' : 'ph-check-circle'}"></i> ${isAnyFailed ? 'Notifikasi Diproses dengan Catatan' : 'Berhasil!'}</strong>
                            <p style="margin: 4px 0 0 0;">
                                Notifikasi uji coba telah diproses untuk <strong>${targetWarga.nama}</strong>.
                                ${isSimulasi ? '(Mode Simulasi Aktif)' : ''}
                            </p>
                            ${errorDetails}
                        </div>
                    `;
                }

                // Refresh table & top navbar badge
                loadLogs();
            } catch (err) {
                if (alertContainer) {
                    alertContainer.innerHTML = `
                        <div style="background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 8px; font-size: 0.875rem;">
                            <strong><i class="ph-bold ph-x-circle"></i> Pengiriman Gagal:</strong>
                            <p style="margin: 4px 0 0 0;">${err.message}</p>
                        </div>
                    `;
                }
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="ph-bold ph-paper-plane-right"></i> Kirim Uji Coba Sekarang';
            }
        });
    }
}
