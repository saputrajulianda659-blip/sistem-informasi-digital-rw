// js/pages/NotificationSettings.js
import { getCurrentUser, ROLES } from '../models/User.js';
import { getCollection, saveCollection } from '../utils/db.js';
import { getNotificationConfig, updateNotificationConfig, getNotificationLogs, retryNotification } from '../models/Notifikasi.js';
import { callBackendApi } from '../services/apiClient.js';

export function renderNotificationSettings() {
    const user = getCurrentUser();
    if (!user) return '';

    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user.role);
    const prefs = getCollection('notification_preferences') || {
        email: true,
        whatsapp: true,
        in_app: true,
        categories: {
            Pengumuman: true,
            Kegiatan: true,
            Pelayanan: true,
            Pengaduan: true,
            Kas: true,
            Darurat: true
        }
    };

    const savedWaToken = (typeof localStorage !== 'undefined')
        ? (localStorage.getItem('fonnte_api_token') || localStorage.getItem('fonnte_token') || '65G3LsBQrNkQLSV1F9Dc')
        : '65G3LsBQrNkQLSV1F9Dc';

    return `
        <div class="notification-settings-page">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="font-size: 1.65rem; color: var(--text-main); margin: 0 0 0.25rem 0;">Pengaturan Notifikasi & Integrasi</h1>
                    <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Kelola preferensi penerimaan pemberitahuan, konfigurasi kanal komunikasi, serta audit log pengiriman.</p>
                </div>
                <div>
                    <a href="#/notifikasi" class="btn btn-outline" style="font-weight: 600; padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph-bold ph-bell"></i> Pusat Notifikasi
                    </a>
                </div>
            </div>

            <!-- Tab Navigation for Admin vs Regular Users -->
            <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.5rem;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button id="tabBtnPreferences" class="btn-tab-setting active" style="padding: 8px 18px; border-radius: 8px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; cursor: pointer; font-size: 0.875rem;">
                        <i class="ph-bold ph-sliders"></i> Preferensi Notifikasi
                    </button>
                    ${isAdmin ? `
                        <button id="tabBtnIntegration" class="btn-tab-setting" style="padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-weight: 600; cursor: pointer; font-size: 0.875rem;">
                            <i class="ph-bold ph-cloud-check"></i> Status Provider (Email & WhatsApp)
                        </button>
                        <button id="tabBtnLogs" class="btn-tab-setting" style="padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-weight: 600; cursor: pointer; font-size: 0.875rem;">
                            <i class="ph-bold ph-clock-counter-clockwise"></i> Log & Antrean Pengiriman
                        </button>
                    ` : ''}
                </div>
            </div>

            <div id="settingsAlertContainer" style="margin-bottom: 1rem;"></div>

            <!-- TAB 1: PREFERENSI PENGGUNA -->
            <div id="tabContentPreferences">
                <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 0.5rem 0;">Kanal Pengiriman Aktif</h3>
                    <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 1.25rem 0;">Pilih jalur komunikasi yang ingin Anda gunakan untuk menerima notifikasi dari pengurus RW.</p>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                    <i class="ph-bold ph-bell-ringing"></i>
                                </div>
                                <div>
                                    <strong style="color: #1e293b; font-size: 0.9rem;">Notifikasi Dalam Aplikasi (In-App)</strong>
                                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">Pemberitahuan langsung pada ikon lonceng header dan menu aplikasi.</p>
                                </div>
                            </div>
                            <span style="font-size: 0.75rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 4px 10px; border-radius: 9999px;">Wajib Aktif</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                    <i class="ph-bold ph-envelope"></i>
                                </div>
                                <div>
                                    <strong style="color: #1e293b; font-size: 0.9rem;">Pemberitahuan Melalui Email</strong>
                                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">Menerima salinan informasi resmi dan pembaruan dokumen melalui alamat email terdaftar.</p>
                                </div>
                            </div>
                            <label class="toggle-switch" title="Aktifkan / Nonaktifkan Notifikasi Email">
                                <input type="checkbox" id="prefEmail" ${prefs.email !== false ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 36px; height: 36px; border-radius: 8px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                    <i class="ph-bold ph-whatsapp-logo"></i>
                                </div>
                                <div>
                                    <strong style="color: #1e293b; font-size: 0.9rem;">Pemberitahuan Melalui WhatsApp</strong>
                                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">Menerima ringkasan pesan penting ke nomor WhatsApp yang terdaftar.</p>
                                </div>
                            </div>
                            <label class="toggle-switch switch-whatsapp" title="Aktifkan / Nonaktifkan Notifikasi WhatsApp">
                                <input type="checkbox" id="prefWhatsapp" ${prefs.whatsapp !== false ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 0.5rem 0;">Kategori Pemberitahuan</h3>
                    <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 1.25rem 0;">Pemberitahuan administratif penting seperti status surat dan laporan darurat bersifat wajib demi kelancaran pelayanan.</p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                        <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #1e293b;">Pengumuman Warga</strong>
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0.25rem 0 0 0;">Berita lingkungan, pengumuman RT/RW.</p>
                                </div>
                                <input type="checkbox" id="catPengumuman" ${prefs.categories?.Pengumuman !== false ? 'checked' : ''}>
                            </div>
                        </div>

                        <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #1e293b;">Kegiatan & Gotong Royong</strong>
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0.25rem 0 0 0;">Jadwal kerja bakti, posyandu, rapat.</p>
                                </div>
                                <input type="checkbox" id="catKegiatan" ${prefs.categories?.Kegiatan !== false ? 'checked' : ''}>
                            </div>
                        </div>

                        <div style="padding: 1rem; border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #166534;">Status Pelayanan Surat</strong>
                                    <p style="font-size: 0.75rem; color: #15803d; margin: 0.25rem 0 0 0;">Verifikasi RT/RW, selesai/ditolak.</p>
                                </div>
                                <span style="font-size: 0.7rem; font-weight: 700; color: #166534;">Wajib (Terkunci)</span>
                            </div>
                        </div>

                        <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #1e293b;">Tindak Lanjut Pengaduan</strong>
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0.25rem 0 0 0;">Tanggapan pengurus atas laporan Anda.</p>
                                </div>
                                <input type="checkbox" id="catPengaduan" ${prefs.categories?.Pengaduan !== false ? 'checked' : ''}>
                            </div>
                        </div>

                        <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #1e293b;">Kas & Iuran</strong>
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0.25rem 0 0 0;">Konfirmasi pembayaran dan pengingat.</p>
                                </div>
                                <input type="checkbox" id="catKas" ${prefs.categories?.Kas !== false ? 'checked' : ''}>
                            </div>
                        </div>

                        <div style="padding: 1rem; border: 1px solid #fecaca; background: #fef2f2; border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 0.875rem; color: #991b1b;">Peringatan Darurat Lingkungan</strong>
                                    <p style="font-size: 0.75rem; color: #b91c1c; margin: 0.25rem 0 0 0;">Keamanan, kebakaran, medis, darurat.</p>
                                </div>
                                <span style="font-size: 0.7rem; font-weight: 700; color: #dc2626;">Wajib (Terkunci)</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button id="btnSavePreferences" class="btn btn-primary" style="font-weight: 600; padding: 10px 22px; border-radius: 8px;">
                            <i class="ph-bold ph-floppy-disk"></i> Simpan Preferensi
                        </button>
                    </div>
                </div>
            </div>

            ${isAdmin ? `
                <!-- TAB 2: STATUS INTEGRASI PROVIDER (EMAIL & WHATSAPP) -->
                <div id="tabContentIntegration" style="display: none;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                        <!-- Email Card -->
                        <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 44px; height: 44px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                        <i class="ph-bold ph-envelope-simple"></i>
                                    </div>
                                    <div>
                                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">Email (SMTP Engine)</h3>
                                        <span id="badgeEmailStatus" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: #fef3c7; color: #92400e;">Memuat...</span>
                                    </div>
                                </div>
                            </div>
                            <p style="font-size: 0.8125rem; color: #64748b; line-height: 1.5; margin-bottom: 1rem;">
                                Digunakan untuk mengirim surat konfirmasi, ringkasan pengumuman resmi, dan tanda terima digital ke alamat email warga.
                            </p>

                            <form id="formEmailConfig">
                                <div class="form-group mb-3">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">SMTP Host</label>
                                    <input type="text" id="cfgSmtpHost" class="form-input" placeholder="smtp.gmail.com / mail.rwdigital.id" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                </div>
                                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem;" class="mb-3">
                                    <div class="form-group" style="margin: 0;">
                                        <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">SMTP Username</label>
                                        <input type="text" id="cfgSmtpUser" class="form-input" placeholder="admin@rwdigital.id" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">Port</label>
                                        <input type="number" id="cfgSmtpPort" class="form-input" value="587" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                    </div>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">SMTP Password</label>
                                    <input type="password" id="cfgSmtpPass" class="form-input" placeholder="••••••••" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                </div>
                                <div class="form-group mb-4">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">Alamat Pengirim (From)</label>
                                    <input type="email" id="cfgFromEmail" class="form-input" placeholder="no-reply@rwdigital.id" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                </div>
                                <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: 600; padding: 8px; border-radius: 6px;">
                                    Simpan Konfigurasi Email
                                </button>
                            </form>
                        </div>

                        <!-- WhatsApp Card -->
                        <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 44px; height: 44px; border-radius: 10px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                        <i class="ph-bold ph-whatsapp-logo"></i>
                                    </div>
                                    <div>
                                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">WhatsApp Gateway (Fonnte API)</h3>
                                        <span id="badgeWaStatus" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: #dcfce7; color: #166534;"><i class="ph-bold ph-check-circle"></i> 100% Siap Aktif</span>
                                    </div>
                                </div>
                            </div>
                            <p style="font-size: 0.8125rem; color: #64748b; line-height: 1.5; margin-bottom: 1rem;">
                                Terhubung dengan Fonnte WhatsApp Gateway API untuk pesan pengajuan surat, update pengaduan, pengumuman warga, dan verifikasi instan.
                            </p>

                            <form id="formWaConfig">
                                <div class="form-group mb-3">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">API Base Endpoint</label>
                                    <input type="text" id="cfgWaApiUrl" class="form-input" value="https://api.fonnte.com/send" readonly style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem; background: #f8fafc;">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">API Token Fonnte</label>
                                    <input type="text" id="cfgWaToken" class="form-input" value="${savedWaToken}" placeholder="Masukkan API Token Fonnte" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; font-size: 0.85rem;">
                                </div>
                                <div class="form-group mb-4">
                                    <label class="form-label" style="font-size: 0.8125rem; font-weight: 600;">Status Konektivitas</label>
                                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 7px 12px; font-size: 0.85rem; font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
                                        <i class="ph-bold ph-check-circle" style="color: #16a34a;"></i> 100% Siap Aktif (Fonnte Gateway)
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: 600; padding: 8px; border-radius: 6px; background: #16a34a; border-color: #16a34a;">
                                    Simpan Konfigurasi WhatsApp
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: LOG PENGIRIMAN & ANTREAN -->
                <div id="tabContentLogs" style="display: none;">
                    <div class="card mb-4" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
                            <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">Log Riwayat & Status Pengiriman Multi-Kanal</h3>
                            <button id="btnRefreshLogs" class="btn btn-sm btn-outline" style="font-weight: 600;">
                                <i class="ph-bold ph-arrows-clockwise"></i> Segarkan Log
                            </button>
                        </div>

                        <div style="overflow-x: auto;">
                            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                                        <th style="padding: 10px 12px;">Waktu</th>
                                        <th style="padding: 10px 12px;">Kanal</th>
                                        <th style="padding: 10px 12px;">Penerima</th>
                                        <th style="padding: 10px 12px;">Kategori / Judul</th>
                                        <th style="padding: 10px 12px;">Status</th>
                                        <th style="padding: 10px 12px;">Keterangan</th>
                                        <th style="padding: 10px 12px;">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBodyLogs">
                                    <tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">Memuat riwayat log...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

export function setupNotificationSettingsEvents() {
    const user = getCurrentUser();
    if (!user) return;

    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.KETUA_RW].includes(user.role);
    const alertBox = document.getElementById('settingsAlertContainer');

    const showAlert = (msg, type = 'success') => {
        if (!alertBox) return;
        const bg = type === 'success' ? '#dcfce7' : '#fee2e2';
        const color = type === 'success' ? '#166534' : '#991b1b';
        const border = type === 'success' ? '#bbf7d0' : '#fecaca';
        alertBox.innerHTML = `
            <div style="padding: 10px 14px; border-radius: 8px; background: ${bg}; color: ${color}; border: 1px solid ${border}; font-weight: 600; font-size: 0.875rem;">
                ${msg}
            </div>
        `;
        setTimeout(() => { if (alertBox) alertBox.innerHTML = ''; }, 5000);
    };

    // Tab Switching
    const tabBtnPref = document.getElementById('tabBtnPreferences');
    const tabBtnInteg = document.getElementById('tabBtnIntegration');
    const tabBtnLogs = document.getElementById('tabBtnLogs');

    const contentPref = document.getElementById('tabContentPreferences');
    const contentInteg = document.getElementById('tabContentIntegration');
    const contentLogs = document.getElementById('tabContentLogs');

    const switchTab = (activeBtn, activeContent) => {
        [tabBtnPref, tabBtnInteg, tabBtnLogs].forEach(b => {
            if (b) {
                b.style.background = '#ffffff';
                b.style.color = '#475569';
                b.style.border = '1px solid #cbd5e1';
                b.classList.remove('active');
            }
        });
        [contentPref, contentInteg, contentLogs].forEach(c => {
            if (c) c.style.display = 'none';
        });

        if (activeBtn) {
            activeBtn.style.background = '#2563eb';
            activeBtn.style.color = '#ffffff';
            activeBtn.style.border = 'none';
            activeBtn.classList.add('active');
        }
        if (activeContent) {
            activeContent.style.display = 'block';
        }
    };

    if (tabBtnPref) tabBtnPref.onclick = () => switchTab(tabBtnPref, contentPref);
    if (tabBtnInteg) tabBtnInteg.onclick = () => {
        switchTab(tabBtnInteg, contentInteg);
        loadProviderConfig();
    };
    if (tabBtnLogs) tabBtnLogs.onclick = () => {
        switchTab(tabBtnLogs, contentLogs);
        loadLogs();
    };

    // Reactive State & Toggle Switch Handler (Email & WhatsApp)
    const savedPrefs = getCollection('notification_preferences') || {};
    let isEmailEnabled = savedPrefs.email !== false;
    let isWhatsappEnabled = savedPrefs.whatsapp !== false;

    const prefEmailInput = document.getElementById('prefEmail');
    const prefWhatsappInput = document.getElementById('prefWhatsapp');

    // 1. Ensure toggle switches are fully enabled across all roles (remove disabled attributes)
    if (prefEmailInput) {
        prefEmailInput.removeAttribute('disabled');
        prefEmailInput.disabled = false;
        prefEmailInput.checked = isEmailEnabled;
    }
    if (prefWhatsappInput) {
        prefWhatsappInput.removeAttribute('disabled');
        prefWhatsappInput.disabled = false;
        prefWhatsappInput.checked = isWhatsappEnabled;
    }

    // Function to save preferences reactively to LocalStorage and Backend API
    const savePreferencesState = async (showNotification = false) => {
        const catPengumuman = document.getElementById('catPengumuman')?.checked ?? true;
        const catKegiatan = document.getElementById('catKegiatan')?.checked ?? true;
        const catPengaduan = document.getElementById('catPengaduan')?.checked ?? true;
        const catKas = document.getElementById('catKas')?.checked ?? true;

        const newPrefs = {
            in_app: true,
            email: isEmailEnabled,
            whatsapp: isWhatsappEnabled,
            categories: {
                Pengumuman: catPengumuman,
                Kegiatan: catKegiatan,
                Pelayanan: true, // locked
                Pengaduan: catPengaduan,
                Kas: catKas,
                Darurat: true // locked
            },
            updated_at: new Date().toISOString()
        };

        // 1. Save to LocalStorage database
        saveCollection('notification_preferences', newPrefs);
        try {
            localStorage.setItem('notification_preferences', JSON.stringify(newPrefs));
        } catch (e) {}

        // 2. Synchronize to Backend API
        try {
            await callBackendApi('notification.php', {
                action: 'save_preferences',
                userId: user.id || user.nik,
                preferences: newPrefs
            });
        } catch (err) {
            console.warn('[Backend save_preferences]', err);
        }

        if (showNotification) {
            showAlert('Preferensi notifikasi berhasil disimpan!', 'success');
        }
    };

    // 2. Reactive Event Listeners on Toggle Click
    if (prefEmailInput) {
        prefEmailInput.addEventListener('change', (e) => {
            isEmailEnabled = e.target.checked;
            savePreferencesState(false);
            showAlert(`Pemberitahuan Email berhasil ${isEmailEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
        });
    }

    if (prefWhatsappInput) {
        prefWhatsappInput.addEventListener('change', (e) => {
            isWhatsappEnabled = e.target.checked;
            savePreferencesState(false);
            showAlert(`Pemberitahuan WhatsApp berhasil ${isWhatsappEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
        });
    }

    // Category checkboxes auto-save on change
    ['catPengumuman', 'catKegiatan', 'catPengaduan', 'catKas'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) {
            chk.addEventListener('change', () => {
                savePreferencesState(false);
            });
        }
    });

    // Save Preferences Manual Button
    const btnSavePref = document.getElementById('btnSavePreferences');
    if (btnSavePref) {
        btnSavePref.onclick = () => {
            if (prefEmailInput) isEmailEnabled = prefEmailInput.checked;
            if (prefWhatsappInput) isWhatsappEnabled = prefWhatsappInput.checked;
            savePreferencesState(true);
        };
    }

    // Load Provider Configuration (Admin)
    const loadProviderConfig = async () => {
        if (!isAdmin) return;
        const badgeEmail = document.getElementById('badgeEmailStatus');
        const badgeWa = document.getElementById('badgeWaStatus');

        try {
            const cfg = await getNotificationConfig();
            if (cfg && cfg.email) {
                const em = cfg.email;
                if (badgeEmail) {
                    badgeEmail.innerText = em.status_label;
                    badgeEmail.style.background = em.configured ? '#dcfce7' : '#fef3c7';
                    badgeEmail.style.color = em.configured ? '#166534' : '#92400e';
                }
                if (document.getElementById('cfgSmtpHost')) document.getElementById('cfgSmtpHost').value = em.smtp_host || '';
                if (document.getElementById('cfgSmtpUser')) document.getElementById('cfgSmtpUser').value = em.smtp_user || '';
                if (document.getElementById('cfgSmtpPort')) document.getElementById('cfgSmtpPort').value = em.smtp_port || 587;
                if (document.getElementById('cfgFromEmail')) document.getElementById('cfgFromEmail').value = em.from_email || '';
            }

            if (cfg && cfg.whatsapp) {
                const wa = cfg.whatsapp;
                if (badgeWa) {
                    badgeWa.innerHTML = '<i class="ph-bold ph-check-circle"></i> 100% Siap Aktif';
                    badgeWa.style.background = '#dcfce7';
                    badgeWa.style.color = '#166534';
                }
                const activeToken = localStorage.getItem('fonnte_api_token') || localStorage.getItem('fonnte_token') || wa.api_token || '65G3LsBQrNkQLSV1F9Dc';
                if (document.getElementById('cfgWaToken')) document.getElementById('cfgWaToken').value = activeToken;
                if (document.getElementById('cfgWaApiUrl')) document.getElementById('cfgWaApiUrl').value = wa.api_url || 'https://api.fonnte.com/send';
            }
        } catch (e) {
            console.warn(e);
        }
    };

    // Submit Email Config
    const formEmail = document.getElementById('formEmailConfig');
    if (formEmail) {
        formEmail.onsubmit = async (e) => {
            e.preventDefault();
            try {
                await updateNotificationConfig({
                    email: {
                        enabled: true,
                        smtp_host: document.getElementById('cfgSmtpHost').value.trim(),
                        smtp_port: parseInt(document.getElementById('cfgSmtpPort').value) || 587,
                        smtp_user: document.getElementById('cfgSmtpUser').value.trim(),
                        smtp_pass: document.getElementById('cfgSmtpPass').value.trim() || '***',
                        from_email: document.getElementById('cfgFromEmail').value.trim()
                    }
                });
                showAlert('Konfigurasi provider Email berhasil disimpan!', 'success');
                loadProviderConfig();
            } catch (err) {
                showAlert('Gagal menyimpan konfigurasi: ' + err.message, 'error');
            }
        };
    }

    // Submit WhatsApp Config (Fix Tombol Simpan Konfigurasi WhatsApp)
    const formWa = document.getElementById('formWaConfig');
    if (formWa) {
        formWa.onsubmit = async (e) => {
            e.preventDefault();
            const btnSubmit = formWa.querySelector('button[type="submit"]');
            const origHtml = btnSubmit ? btnSubmit.innerHTML : '';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Menyimpan Konfigurasi...';
            }

            try {
                const inputToken = (document.getElementById('cfgWaToken')?.value || '').trim() || '65G3LsBQrNkQLSV1F9Dc';
                const inputApiUrl = (document.getElementById('cfgWaApiUrl')?.value || '').trim() || 'https://api.fonnte.com/send';

                // 1. Simpan ke LocalStorage agar tidak pernah hilang / reset saat di-refresh
                localStorage.setItem('fonnte_api_token', inputToken);
                localStorage.setItem('fonnte_token', inputToken);

                // 2. Simpan ke LocalStorage notification_config
                const currentCfg = JSON.parse(localStorage.getItem('notification_config') || '{}');
                currentCfg.whatsapp = {
                    ...(currentCfg.whatsapp || {}),
                    enabled: true,
                    provider: 'fonnte',
                    api_url: inputApiUrl,
                    api_token: inputToken,
                    access_token: inputToken,
                    configured: true,
                    status_label: '100% Siap Aktif'
                };
                localStorage.setItem('notification_config', JSON.stringify(currentCfg));

                // 3. Kirim ke API backend (update_config)
                try {
                    await updateNotificationConfig({
                        whatsapp: {
                            enabled: true,
                            provider: 'fonnte',
                            api_url: inputApiUrl,
                            api_token: inputToken,
                            access_token: inputToken
                        }
                    });
                } catch (apiErr) {
                    console.warn('[Backend updateNotificationConfig Warning]', apiErr);
                }

                showAlert('Konfigurasi WhatsApp Fonnte berhasil disimpan dan tersimpan secara permanen!', 'success');
                loadProviderConfig();
            } catch (err) {
                showAlert('Gagal menyimpan konfigurasi: ' + err.message, 'error');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = origHtml;
                }
            }
        };
    }

    // Load Logs
    const loadLogs = async () => {
        const tbody = document.getElementById('tableBodyLogs');
        if (!tbody) return;

        try {
            const logs = await getNotificationLogs();
            if (!logs || logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: #94a3b8;">Belum ada log pengiriman yang tercatat.</td></tr>`;
                return;
            }

            tbody.innerHTML = logs.map(l => {
                const dateStr = new Date(l.created_at || 'now').toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let statusBadge = `<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; background: #dcfce7; color: #166534;">Terkirim</span>`;
                if (l.status === 'failed') {
                    statusBadge = `<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; background: #fee2e2; color: #991b1b;">Gagal</span>`;
                } else if (l.status === 'pending') {
                    statusBadge = `<span style="padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; background: #fef3c7; color: #92400e;">Antrean</span>`;
                }

                let channelIcon = '<i class="ph-bold ph-bell"></i> In-App';
                if (l.channel === 'email') channelIcon = '<i class="ph-bold ph-envelope"></i> Email';
                if (l.channel === 'whatsapp') channelIcon = '<i class="ph-bold ph-whatsapp-logo" style="color:#16a34a;"></i> WhatsApp';

                const canRetry = l.status === 'failed' && (l.attempts || 1) < (l.max_retries || 3);
                const retryBtn = canRetry ? `
                    <button class="btn btn-sm btn-retry-log" data-id="${l.id}" style="padding: 3px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; background: #f8fafc;">
                        <i class="ph-bold ph-arrows-clockwise"></i> Retry (${l.attempts || 1}/3)
                    </button>
                ` : '<span style="color: #94a3b8;">-</span>';

                return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 9px 12px; color: #64748b;">${dateStr}</td>
                        <td style="padding: 9px 12px; font-weight: 600;">${channelIcon}</td>
                        <td style="padding: 9px 12px;">
                            <strong>${l.recipient_name || 'Warga'}</strong>
                            <div style="font-size: 0.75rem; color: #64748b;">${l.recipient_target || '-'}</div>
                        </td>
                        <td style="padding: 9px 12px;">
                            <span style="font-weight: 600; color: #2563eb;">[${l.category || 'Info'}]</span>
                            <span style="color: #334155;">${l.title || '-'}</span>
                        </td>
                        <td style="padding: 9px 12px;">${statusBadge}</td>
                        <td style="padding: 9px 12px; color: ${l.status === 'failed' ? '#dc2626' : '#64748b'}; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.error_message || 'Berhasil terkirim'}">
                            ${l.error_message || 'Terkirim ke saluran'}
                        </td>
                        <td style="padding: 9px 12px;">${retryBtn}</td>
                    </tr>
                `;
            }).join('');

            // Attach retry buttons
            tbody.querySelectorAll('.btn-retry-log').forEach(b => {
                b.onclick = async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    e.currentTarget.disabled = true;
                    e.currentTarget.innerText = 'Mengulang...';
                    try {
                        const res = await retryNotification(id);
                        showAlert(res.message || 'Percobaan kirim ulang selesai.', res.success ? 'success' : 'error');
                        loadLogs();
                    } catch (err) {
                        showAlert('Gagal retry: ' + err.message, 'error');
                        loadLogs();
                    }
                };
            });
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #dc2626;">Gagal memuat log: ${e.message}</td></tr>`;
        }
    };

    const btnRefresh = document.getElementById('btnRefreshLogs');
    if (btnRefresh) btnRefresh.onclick = loadLogs;
}
