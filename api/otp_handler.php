<?php
// api/otp_handler.php
// Handler OTP Verifikasi Pembaruan Profil (6 Digit, Multi-Channel Fonnte WA & SMTP Mail)

require_once __DIR__ . '/db_helper.php';
require_once __DIR__ . '/notification_engine.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode HTTP tidak diizinkan.']);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$action = $data['action'] ?? '';
$tempFile = __DIR__ . '/otp_temp.json';

function getOtpStore($file) {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

function saveOtpStore($file, $store) {
    $now = time();
    $cleaned = array_filter($store, function($item) use ($now) {
        return isset($item['expires_at']) && ($item['expires_at'] > ($now - 600));
    });
    file_put_contents($file, json_encode($cleaned, JSON_PRETTY_PRINT), LOCK_EX);
}

// -------------------------------------------------------------
// ACTION 1: REQUEST OTP
// -------------------------------------------------------------
if ($action === 'request_otp') {
    $username = trim($data['username'] ?? '');
    $noHp = trim($data['no_hp'] ?? '');
    $email = trim($data['email'] ?? '');
    $nama = trim($data['nama'] ?? 'Warga');

    if (empty($username) || (empty($noHp) && empty($email))) {
        echo json_encode(['success' => false, 'error' => 'Data username dan kontak/email tidak lengkap.']);
        exit();
    }

    $otpCode = (string)random_int(100000, 999999);
    $expiresAt = time() + 300; // 5 menit

    $store = getOtpStore($tempFile);
    $store[$username] = [
        'username' => $username,
        'otp' => $otpCode,
        'no_hp' => $noHp,
        'email' => $email,
        'created_at' => time(),
        'expires_at' => $expiresAt
    ];
    saveOtpStore($tempFile, $store);

    $pesanOtp = "[DIGITAL RW 05]\nKode Verifikasi OTP Anda adalah: *$otpCode*\n\nGunakan kode ini untuk mengonfirmasi perubahan profil akun Anda. Kode berlaku selama 5 menit. JANGAN bagikan kode ini kepada siapapun.";

    $waSent = false;
    $mailSent = false;

    // Kirim via WhatsApp jika nomor tersedia
    if (!empty($noHp)) {
        $waCfg = loadConfig()['whatsapp'] ?? [];
        $waRes = sendWhatsAppMessage($waCfg, $noHp, 'Kode Verifikasi OTP', $pesanOtp, 'Keamanan');
        $waSent = $waRes['success'] ?? false;
    }

    // Kirim via Email jika email tersedia
    if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $smtpCfg = loadConfig()['email'] ?? [];
        $htmlMail = "
            <div style='font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;'>
                <h3 style='color: #2563eb; margin-top: 0;'>Verifikasi Pembaruan Profil Digital RW 05</h3>
                <p>Halo <strong>{$nama}</strong>,</p>
                <p>Berikut adalah kode verifikasi 6 digit untuk perubahan profil akun Anda:</p>
                <div style='background: #f1f5f9; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px; margin: 15px 0;'>
                    {$otpCode}
                </div>
                <p style='font-size: 13px; color: #64748b;'>Kode ini berlaku selama 5 menit. Abaikan email ini jika Anda tidak melakukan permintaan pembaruan profil.</p>
            </div>
        ";
        $mailRes = sendSmtpMail($smtpCfg, $email, $nama, "Kode OTP Verifikasi Profil Digital RW", $htmlMail);
        $mailSent = $mailRes['success'] ?? false;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Kode OTP berhasil dibuat dan dikirimkan.',
        'wa_sent' => $waSent,
        'mail_sent' => $mailSent,
        'debug_otp' => $otpCode
    ]);
    exit();
}

// -------------------------------------------------------------
// ACTION 2: VERIFY OTP
// -------------------------------------------------------------
if ($action === 'verify_otp') {
    $username = trim($data['username'] ?? '');
    $otpInput = trim($data['otp'] ?? '');

    if (empty($username) || empty($otpInput)) {
        echo json_encode(['success' => false, 'error' => 'Username dan kode OTP wajib diisi.']);
        exit();
    }

    $store = getOtpStore($tempFile);
    if (!isset($store[$username])) {
        echo json_encode(['success' => false, 'error' => 'Permintaan OTP tidak ditemukan atau telah kedaluwarsa.']);
        exit();
    }

    $entry = $store[$username];
    if (time() > $entry['expires_at']) {
        unset($store[$username]);
        saveOtpStore($tempFile, $store);
        echo json_encode(['success' => false, 'error' => 'Kode OTP telah kadaluarsa. Silakan minta kode baru.']);
        exit();
    }

    if ($entry['otp'] !== $otpInput) {
        echo json_encode(['success' => false, 'error' => 'Kode OTP salah. Silakan periksa kembali.']);
        exit();
    }

    unset($store[$username]);
    saveOtpStore($tempFile, $store);

    echo json_encode([
        'success' => true,
        'verified' => true,
        'message' => 'Verifikasi OTP berhasil.'
    ]);
    exit();
}

echo json_encode(['success' => false, 'error' => 'Aksi OTP tidak dikenali.']);

