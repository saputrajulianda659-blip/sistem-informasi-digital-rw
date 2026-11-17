// js/services/notificationService.js
// Enterprise WhatsApp Service powered by Fonnte WhatsApp Gateway API
// Automatically handles format conversion (08... -> 628...) and triggers notifications for:
// 1. Status pengajuan surat warga (Disetujui / Ditolak / Perlu Diperbaiki)
// 2. Tanggapan & update status pengaduan warga
// 3. Pengumuman resmi dari Pengurus

export const FONNTE_API_ENDPOINT = 'https://api.fonnte.com/send';
export const FONNTE_API_TOKEN = '65G3LsBQrNkQLSV1F9Dc';

/**
 * Resolves active Fonnte API Token from LocalStorage or falls back to permanent default
 */
export function getActiveFonnteToken() {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('fonnte_api_token') || localStorage.getItem('fonnte_token');
            if (stored && stored.trim()) return stored.trim();
            const rawCfg = localStorage.getItem('notification_config');
            if (rawCfg) {
                const cfg = JSON.parse(rawCfg);
                if (cfg.whatsapp && (cfg.whatsapp.api_token || cfg.whatsapp.access_token)) {
                    return cfg.whatsapp.api_token || cfg.whatsapp.access_token;
                }
            }
        }
    } catch (e) {}
    return FONNTE_API_TOKEN;
}

/**
 * Normalizes Indonesian phone numbers into international E.164 format (without +)
 * e.g. 081234567890 -> 6281234567890
 *      +62 812-3456-7890 -> 6281234567890
 *      81234567890 -> 6281234567890
 */
export function formatWhatsAppNumber(phone) {
    if (!phone) return '';
    let clean = String(phone).trim().replace(/[^0-9]/g, '');
    if (clean.startsWith('08')) {
        clean = '628' + clean.slice(2);
    } else if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '628' + clean.slice(1);
    }
    return clean;
}

/**
 * Sends a WhatsApp message via Fonnte API
 * @param {string|string[]} target - Phone number or array of phone numbers
 * @param {string} message - Message text
 * @param {object} options - Optional metadata (title, category, recipientName, eventId)
 */
export async function sendWhatsApp(target, message, options = {}) {
    try {
        // Enforce guard: Super Admin is strictly excluded from operational WA notifications
        const recipientRole = String(options.recipientRole || options.role || options.targetRole || options.target || options.target_role || '').toLowerCase();
        if (recipientRole.includes('admin') || recipientRole === 'superadmin' || recipientRole === 'super_admin') {
            console.info('[Fonnte WhatsApp] Pengiriman WA dilewati untuk Super Admin.');
            return {
                success: false,
                skipped: true,
                message: 'Super Admin dikecualikan dari notifikasi WhatsApp.'
            };
        }

        const rawTarget = Array.isArray(target) ? target.join(',') : String(target);
        const targets = rawTarget
            .split(',')
            .map(t => formatWhatsAppNumber(t.trim()))
            .filter(t => t.length >= 10);

        if (targets.length === 0) {
            console.warn('[Fonnte WhatsApp] Target nomor telepon kosong atau tidak valid:', target);
            return {
                success: false,
                error: 'Nomor WhatsApp tidak valid atau belum terdaftar.'
            };
        }

        const normalizedTarget = targets.join(',');

        const formData = new FormData();
        formData.append('target', normalizedTarget);
        formData.append('message', message);
        formData.append('countryCode', '62');

        const activeToken = getActiveFonnteToken();

        const response = await fetch(FONNTE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': activeToken
            },
            body: formData
        });

        const result = await response.json();
        const isSuccess = result.status === true;

        // Record delivery log in localStorage
        try {
            const rawLogs = localStorage.getItem('notification_logs');
            const logs = rawLogs ? JSON.parse(rawLogs) : [];
            targets.forEach(phone => {
                logs.unshift({
                    id: 'LOG-WA-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    notification_id: 'WA-' + Date.now(),
                    event_id: options.eventId || ('EVT-' + Date.now()),
                    category: options.category || options.kategori || 'WhatsApp Gateway',
                    channel: 'whatsapp',
                    recipient_id: options.recipientId || phone,
                    recipient_name: options.recipientName || 'Warga',
                    recipient_target: phone,
                    title: options.title || options.judul || 'Pesan WhatsApp Gateway (Fonnte)',
                    body: message,
                    status: isSuccess ? 'sent' : 'failed',
                    attempts: 1,
                    max_retries: 3,
                    error_message: isSuccess ? null : (result.reason || result.detail || 'Pengiriman Fonnte ditolak'),
                    created_at: new Date().toISOString(),
                    sent_at: isSuccess ? new Date().toISOString() : null
                });
            });
            localStorage.setItem('notification_logs', JSON.stringify(logs.slice(0, 150)));
        } catch (e) {
            console.warn('[Fonnte WhatsApp] Gagal menyimpan log lokal:', e);
        }

        return {
            success: isSuccess,
            data: result,
            target: normalizedTarget,
            message: message
        };
    } catch (err) {
        console.error('[Fonnte WhatsApp] Error saat pengiriman ke API Fonnte:', err);
        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Alias for sendWhatsApp as requested
 */
export async function sendWhatsAppNotification(target, message, options = {}) {
    return await sendWhatsApp(target, message, options);
}

/**
 * 1. ACTION TRIGGER: Perubahan status pengajuan surat warga
 * Status: Disetujui / Ditolak / Perlu Diperbaiki
 */
export async function notifyStatusSurat({ pelayanan, status, catatan, pemohonWarga }) {
    // Pengiriman WhatsApp layanan surat telah dipusatkan secara resmi di backend PHP (api/pelayanan.php)
    // untuk mencegah eksekusi ganda dan menjamin akurasi waktu WIB serta proteksi idempotency.
    console.info('[Fonnte WhatsApp] Pengiriman notifikasi WhatsApp surat dipusatkan di backend PHP.');
    return {
        success: true,
        status: 'delegated_to_backend'
    };
}

/**
 * 2. ACTION TRIGGER: Tanggapan atau update status pengaduan lingkungan
 */
export async function notifyStatusPengaduan({ pengaduan, status, pesanTanggapan, pelaporWarga, penanggapName }) {
    if (!pengaduan) return null;

    const phone = pelaporWarga?.no_hp || pengaduan.no_hp;
    if (!phone || phone === '-') {
        console.info('[Fonnte WhatsApp] Pelapor tidak memiliki nomor HP/WA terdaftar.');
        return null;
    }

    const nama = pelaporWarga?.nama || pengaduan.nama_pelapor || 'Warga';
    const judul = pengaduan.judul || 'Laporan Pengaduan';
    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) + ' WIB';

    let statusBadge = status;
    let icon = '📢';
    if (status === 'Selesai' || status.includes('Selesai')) {
        icon = '✅';
        statusBadge = 'SELESAI DITANGANI';
    } else if (status === 'Diproses' || status.includes('Proses')) {
        icon = '🔄';
        statusBadge = 'SEDANG DITINDAKLANJUTI';
    }

    let waMessage = 
`${icon} *[DIGITAL RW 05 - PENGADUAN LINGKUNGAN]*

Halo Bapak/Ibu *${nama}*,
Laporan pengaduan Anda telah menerima pembaruan dari pihak pengurus:

📌 *Judul Laporan*: ${judul}
🏷️ *Status*: *${statusBadge}*`;

    if (pesanTanggapan && pesanTanggapan.trim()) {
        waMessage += `\n💬 *Tanggapan (${penanggapName || 'Pengurus RW 05'})*:\n"${pesanTanggapan.trim()}"`;
    }

    waMessage += 
`\n📅 *Waktu*: ${dateStr}

Terima kasih atas partisipasi dan kepedulian Anda dalam menjaga lingkungan kita tetap aman, tertib, dan nyaman.

_Pesan otomatis dikirim oleh Sistem Informasi Digital RW 05._`;

    return await sendWhatsApp(phone, waMessage, {
        recipientId: pelaporWarga?.nik || pengaduan.nik_pelapor,
        recipientName: nama,
        title: `Pembaruan Pengaduan: ${judul}`,
        category: 'Pengaduan',
        eventId: `${pengaduan.id}-${Date.now()}`
    });
}

/**
 * 3. ACTION TRIGGER: Pengumuman resmi dari Pengurus
 */
export async function notifyPengumuman({ pengumuman, targetWargaList }) {
    if (!pengumuman) return null;

    const judul = pengumuman.judul || 'Pengumuman Resmi RW 05';
    const isi = pengumuman.isi || '';
    const penulis = pengumuman.penulis || 'Pengurus RW 05';
    const targetRt = pengumuman.target_rt ? `RT ${pengumuman.target_rt}` : 'Seluruh Warga RW 05';
    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const waMessage = 
`📢 *[PENGUMUMAN RESMI PENGURUS RW 05]*
🎯 *Sasaran*: ${targetRt}

*${judul}*

${isi}

👤 *Diterbitkan Oleh*: ${penulis}
📅 *Tanggal*: ${dateStr}

Silakan cek detail pengumuman melalui aplikasi Digital RW 05.
Mari bersama menjaga kerukunan dan keterbukaan informasi di lingkungan kita.

_Pemberitahuan resmi Pengurus RW 05._`;

    const phoneList = (targetWargaList || [])
        .map(w => w.no_hp)
        .filter(p => p && p !== '-' && String(p).trim().length >= 10);

    if (phoneList.length > 0) {
        // Broadcast in chunks of 50 to avoid length issues
        const chunkSize = 50;
        const results = [];
        for (let i = 0; i < phoneList.length; i += chunkSize) {
            const chunk = phoneList.slice(i, i + chunkSize);
            const res = await sendWhatsApp(chunk.join(','), waMessage, {
                title: `Pengumuman: ${judul}`,
                category: 'Pengumuman',
                eventId: `${pengumuman.id}-broadcast-${Date.now()}`
            });
            results.push(res);
        }
        return results;
    }
    return null;
}

/**
 * Provider Status Inspector
 */
export function getWhatsAppConfigStatus() {
    return {
        provider: 'Fonnte WhatsApp Gateway API',
        endpoint: FONNTE_API_ENDPOINT,
        has_token: !!FONNTE_API_TOKEN,
        configured: true,
        status_label: '100% Siap Aktif',
        status_color: '#16a34a',
        badge_bg: '#dcfce7'
    };
}
