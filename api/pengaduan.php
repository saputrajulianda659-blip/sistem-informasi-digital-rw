<?php
// api/pengaduan.php
// Backend Service for Pengaduan Warga Digital RW
// Handles listing, creation, and replies (tanggapan & status update) by Pengurus (Ketua RT, Ketua RW, Super Admin)

require_once __DIR__ . '/db_helper.php';
require_once __DIR__ . '/notification_engine.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$user = getAuthenticatedUser($input);
$method = $_SERVER['REQUEST_METHOD'];

$action = $input['action'] ?? $_GET['action'] ?? 'list';

// Helper function to resolve citizen name dynamically from NIK
function resolvePelaporName($nik, $database, $fallbackName = 'Warga') {
    if (!empty($nik)) {
        foreach (($database['warga'] ?? []) as $w) {
            if (($w['nik'] ?? '') === $nik && !empty($w['nama'])) {
                return $w['nama'];
            }
        }
        foreach (($database['users'] ?? []) as $u) {
            if (($u['nik'] ?? '') === $nik && !empty($u['name'])) {
                return $u['name'];
            }
        }
    }
    // Prevent hardcoded "Agus" from ever persisting
    if (strcasecmp($fallbackName, 'Agus') === 0) {
        return 'Julianda Saputra';
    }
    return !empty($fallbackName) ? $fallbackName : 'Warga';
}

// Helper: Wrapper fungsi pengiriman WhatsApp resmi via Fonnte Gateway
if (!function_exists('sendWhatsApp')) {
    function sendWhatsApp($recipientPhone, $pesanWa) {
        $waCfg = loadConfig()['whatsapp'] ?? [];
        return sendWhatsAppMessage($waCfg, $recipientPhone, '', $pesanWa, 'Pengaduan');
    }
}

// -------------------------------------------------------------
// ACTION: LIST PENGADUAN
// -------------------------------------------------------------
if ($action === 'list' || $action === 'get_all') {
    $pengaduanList = $database['pengaduan'] ?? [];

    // Ensure all items have dynamically resolved pelapor name
    foreach ($pengaduanList as &$p) {
        $p['nama_pelapor'] = resolvePelaporName($p['nik_pelapor'] ?? '', $database, $p['nama_pelapor'] ?? '');
    }
    unset($p);

    // Role-based filtering if authenticated
    if ($user) {
        $role = $user['role'] ?? 'Warga';
        if ($role === 'Warga' && !empty($user['nik'])) {
            $pengaduanList = array_values(array_filter($pengaduanList, function($p) use ($user) {
                return ($p['nik_pelapor'] ?? '') === $user['nik'];
            }));
        }
    }

    // Sort descending by tanggal_pengaduan
    usort($pengaduanList, function($a, $b) {
        return strtotime($b['tanggal_pengaduan'] ?? '') - strtotime($a['tanggal_pengaduan'] ?? '');
    });

    jsonResponse([
        'success' => true,
        'total' => count($pengaduanList),
        'data' => $pengaduanList
    ]);
}

// -------------------------------------------------------------
// ACTION: GET DETAIL PENGADUAN
// -------------------------------------------------------------
if ($action === 'detail' || $action === 'get_detail') {
    $id = $input['id'] ?? $_GET['id'] ?? '';
    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'Parameter ID pengaduan wajib diisi.'], 400);
    }

    $found = null;
    foreach (($database['pengaduan'] ?? []) as $p) {
        if (($p['id'] ?? '') === $id) {
            $found = $p;
            break;
        }
    }

    if (!$found) {
        jsonResponse(['success' => false, 'error' => 'Data pengaduan tidak ditemukan.'], 404);
    }

    // Resolve name dynamically
    $found['nama_pelapor'] = resolvePelaporName($found['nik_pelapor'] ?? '', $database, $found['nama_pelapor'] ?? '');

    jsonResponse([
        'success' => true,
        'data' => $found
    ]);
}

// -------------------------------------------------------------
// ACTION: UPDATE STATUS & TANGGAPAN (Ketua RT, Ketua RW, Super Admin)
// -------------------------------------------------------------
if ($action === 'update_status' || $action === 'tanggapi' || $action === 'add_tanggapan') {
    $id = trim($input['id'] ?? '');
    $status = trim($input['status'] ?? '');
    $pesan = trim($input['pesan'] ?? $input['pesanTanggapan'] ?? '');

    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'ID pengaduan tidak boleh kosong.'], 400);
    }

    // Role check: Allow Ketua RT, Ketua RW, Super Admin (support both normalized and underscore/case variants)
    $rawRole = $user['role'] ?? '';
    $normalizedRole = strtolower(str_replace(['_', ' '], '', $rawRole));
    $allowedRoles = ['ketuart', 'ketuarw', 'superadmin'];

    if (!in_array($normalizedRole, $allowedRoles)) {
        jsonResponse(['success' => false, 'error' => 'Anda tidak memiliki hak untuk memberikan tanggapan.'], 403);
    }

    $index = -1;
    foreach (($database['pengaduan'] ?? []) as $i => $item) {
        if (($item['id'] ?? '') === $id) {
            $index = $i;
            break;
        }
    }

    if ($index === -1) {
        jsonResponse(['success' => false, 'error' => 'Pengaduan dengan ID tersebut tidak ditemukan.'], 404);
    }

    $p = &$database['pengaduan'][$index];

    // 1. Update status jika diberikan status valid
    if (!empty($status)) {
        $p['status'] = $status;
    }

    // 2. Tambahkan tanggapan baru jika ada pesan
    $userName = $user['name'] ?? $user['nama'] ?? 'Pengurus Lingkungan';
    $displayRole = $user['role'] ?? 'Pengurus';
    if ($normalizedRole === 'ketuart') $displayRole = 'Ketua RT';
    elseif ($normalizedRole === 'ketuarw') $displayRole = 'Ketua RW';
    elseif ($normalizedRole === 'superadmin') $displayRole = 'Super Admin';

    if (!isset($p['tanggapan']) || !is_array($p['tanggapan'])) {
        $p['tanggapan'] = [];
    }

    if (!empty($pesan)) {
        $newTanggapan = [
            'id' => 'TGP-' . round(microtime(true) * 1000),
            'nama_penanggap' => $userName,
            'penanggap' => $userName, // kompatibilitas format frontend
            'role_penanggap' => $displayRole,
            'role' => $displayRole, // kompatibilitas format frontend
            'pesan' => $pesan,
            'tanggal' => date('c')
        ];
        $p['tanggapan'][] = $newTanggapan;
    }

    // Pastikan nama pelapor konsisten
    $p['nama_pelapor'] = resolvePelaporName($p['nik_pelapor'] ?? '', $database, $p['nama_pelapor'] ?? '');

    // Simpan seluruh database secara permanen
    $database['pengaduan'][$index] = $p;
    saveDatabase($database);

    // -------------------------------------------------------------
    // PENGIRIMAN RESMI TEPAT 1 KALI WHATSAPP KE WARGA PELAPOR
    // -------------------------------------------------------------
    $nikPelapor = (string)($p['nik_pelapor'] ?? ($p['nik'] ?? ''));
    $namaWarga = $p['nama_pelapor'] ?? 'Warga';
    $nomorHpWarga = $p['no_hp'] ?? '';

    if (!empty($nikPelapor)) {
        foreach (($database['warga'] ?? []) as $w) {
            if ((string)($w['nik'] ?? '') === $nikPelapor) {
                if (!empty($w['nama'])) $namaWarga = $w['nama'];
                if (!empty($w['no_hp']) && $w['no_hp'] !== '-') $nomorHpWarga = $w['no_hp'];
                break;
            }
        }
        if (empty($nomorHpWarga)) {
            foreach (($database['users'] ?? []) as $u) {
                if ((string)($u['nik'] ?? '') === $nikPelapor) {
                    if (!empty($u['name'])) $namaWarga = $u['name'];
                    if (!empty($u['no_hp']) && $u['no_hp'] !== '-') $nomorHpWarga = $u['no_hp'];
                    break;
                }
            }
        }
    }

    $judulPengaduan = $p['judul'] ?? 'Laporan Pengaduan';
    $statusRaw = !empty($status) ? $status : ($p['status'] ?? 'Diproses');
    $statusLabel = $statusRaw;
    if ($statusRaw === 'Selesai' || stripos($statusRaw, 'selesai') !== false) {
        $statusLabel = 'SELESAI DITANGANI';
    } elseif ($statusRaw === 'Diproses' || stripos($statusRaw, 'proses') !== false) {
        $statusLabel = 'SEDANG DITINDAKLANJUTI';
    }

    $namaPetugas = $userName . ' (' . $displayRole . ')';
    $tanggapan = !empty($pesan) ? $pesan : 'Laporan telah ditindaklanjuti oleh pengurus.';
    $bulanIndo = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
        7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
    ];
    $waktu = date('d') . ' ' . $bulanIndo[(int)date('n')] . ' ' . date('Y, H:i') . ' WIB';

    $pesanWa = "✅ *[DIGITAL RW 05 - PENGADUAN LINGKUNGAN]*\n\n"
             . "Halo Bapak/Ibu *{$namaWarga}*,\n"
             . "Laporan pengaduan Anda telah menerima pembaruan dari pihak pengurus:\n\n"
             . "📌 *Judul Laporan*: {$judulPengaduan}\n"
             . "🏷️ *Status*: *{$statusLabel}*\n"
             . "💬 *Tanggapan ({$namaPetugas})*:\n\"{$tanggapan}\"\n"
             . "📅 *Waktu*: {$waktu}\n\n"
             . "Terima kasih atas partisipasi dan kepedulian Anda dalam menjaga lingkungan kita tetap aman, tertib, dan nyaman.\n\n"
             . "_Pesan otomatis dikirim oleh Sistem Informasi Digital RW 05._";

    // PANGGIL TEPAT 1 KALI SAJA:
    if (!empty($nomorHpWarga) && $nomorHpWarga !== '-') {
        try {
            sendWhatsApp($nomorHpWarga, $pesanWa);
        } catch (\Throwable $waErr) {
            error_log("[sendWhatsApp Pengaduan Error] " . $waErr->getMessage());
        }
    }

    jsonResponse([
        'success' => true,
        'message' => 'Status dan tanggapan berhasil disimpan.',
        'data' => $p
    ]);
}

// -------------------------------------------------------------
// ACTION: CREATE PENGADUAN
// -------------------------------------------------------------
if ($action === 'create' || $method === 'POST') {
    $judul = trim($input['judul'] ?? '');
    $kategori = trim($input['kategori'] ?? 'Lainnya');
    $deskripsi = trim($input['deskripsi'] ?? '');
    $lokasi = trim($input['lokasi'] ?? '');
    $lampiran = trim($input['lampiran'] ?? '');

    if (empty($judul) || empty($deskripsi)) {
        jsonResponse(['success' => false, 'error' => 'Judul dan deskripsi pengaduan wajib diisi.'], 400);
    }

    $nikPelapor = $user['nik'] ?? $input['nik_pelapor'] ?? '';
    $namaPelapor = resolvePelaporName($nikPelapor, $database, $user['name'] ?? $input['nama_pelapor'] ?? 'Warga');

    // Dapatkan data RT pelapor (format '01', '02', dst)
    $rtPelapor = $input['rt'] ?? ($user['rt'] ?? '');
    if (empty($rtPelapor) && !empty($nikPelapor)) {
        foreach (($database['warga'] ?? []) as $w) {
            if (($w['nik'] ?? '') === $nikPelapor && !empty($w['rt'])) {
                $rtPelapor = $w['rt'];
                break;
            }
        }
    }
    if (empty($rtPelapor)) {
        if (preg_match('/\bRT\s*0?([1-9][0-9]?)\b/i', $judul . ' ' . $lokasi, $m)) {
            $rtPelapor = $m[1];
        }
    }
    $rtPelapor = !empty($rtPelapor) ? str_pad(preg_replace('/[^0-9]/', '', (string)$rtPelapor), 2, '0', STR_PAD_LEFT) : '01';
    $rwPelapor = !empty($input['rw'] ?? $user['rw'] ?? '') ? str_pad(preg_replace('/[^0-9]/', '', (string)($input['rw'] ?? $user['rw'])), 2, '0', STR_PAD_LEFT) : '05';

    $newId = 'ADU-' . round(microtime(true) * 1000);
    $newPengaduan = [
        'id' => $newId,
        'judul' => $judul,
        'kategori' => $kategori,
        'deskripsi' => $deskripsi,
        'lokasi' => $lokasi,
        'lampiran' => $lampiran,
        'status' => 'Baru',
        'tanggal_pengaduan' => date('c'),
        'nik_pelapor' => $nikPelapor,
        'nama_pelapor' => $namaPelapor,
        'rt' => $rtPelapor,
        'rw' => $rwPelapor,
        'tanggapan' => []
    ];

    if (!isset($database['pengaduan']) || !is_array($database['pengaduan'])) {
        $database['pengaduan'] = [];
    }
    array_unshift($database['pengaduan'], $newPengaduan);

    // ---------------------------------------------------------
    // DISPATCH NOTIFIKASI PENGADUAN KEPADA PENGURUS YANG BERHAK
    // ---------------------------------------------------------
    // Target Penerima HANYA:
    // a. Akun Ketua RT yang memiliki nomor RT yang sama ($user['role'] === 'rt' && $user['rt'] === $rtPelapor).
    // b. Akun Ketua RW / Super Admin ($user['role'] === 'rw' || $user['role'] === 'super_admin').
    // DILARANG mengirim notifikasi (in-app, email, maupun WhatsApp) ke Ketua RT yang nomor RT-nya berbeda!
    $judulNotif = "Pengaduan Warga Baru: [{$kategori}] {$judul}";
    $pesanNotif = "Terdapat pengaduan baru dari warga {$namaPelapor} (RT {$rtPelapor}) terkait {$kategori} di lokasi {$lokasi}. Silakan buka aplikasi Digital RW untuk meninjau detail dan memberikan tanggapan.";
    $linkNotif = "#/pengaduan/detail?id={$newId}";
    $nowIso = date('c');

    $eligiblePengurus = [];
    foreach (($database['users'] ?? []) as $u) {
        $uRoleRaw = strtolower(str_replace(['_', ' '], '', $u['role'] ?? ''));
        $uRt = !empty($u['rt']) ? str_pad(preg_replace('/[^0-9]/', '', (string)$u['rt']), 2, '0', STR_PAD_LEFT) : '';

        $isSameRtLeader = ($uRoleRaw === 'ketuart' || $uRoleRaw === 'rt') && ($uRt === $rtPelapor);
        $isRwLeader = ($uRoleRaw === 'ketuarw' || $uRoleRaw === 'rw');
        $isSuperAdmin = ($uRoleRaw === 'superadmin' || $uRoleRaw === 'admin');

        if ($isSameRtLeader || $isRwLeader || $isSuperAdmin) {
            $eligiblePengurus[] = $u;
        }
    }

    if (!isset($database['notifikasi']) || !is_array($database['notifikasi'])) {
        $database['notifikasi'] = [];
    }

    $config = loadConfig();

    foreach ($eligiblePengurus as $pengurusUser) {
        $uRoleRaw = strtolower(str_replace(['_', ' '], '', $pengurusUser['role'] ?? ''));
        $canonicalRole = ($uRoleRaw === 'ketuart' || $uRoleRaw === 'rt') ? 'rt' : (($uRoleRaw === 'ketuarw' || $uRoleRaw === 'rw') ? 'rw' : 'super_admin');
        $idempotencyKey = "ADU-{$newId}-{$pengurusUser['id']}";

        // Tentukan channels: Super Admin hanya in-app
        $targetChannels = ['in_app', 'whatsapp', 'email'];
        if ($canonicalRole === 'super_admin') {
            $targetChannels = ['in_app'];
        }

        if (function_exists('dispatchServiceNotification')) {
            dispatchServiceNotification(
                $pengurusUser,
                $judulNotif,
                $pesanNotif,
                'pengaduan',
                'warning',
                $linkNotif,
                $database,
                $config,
                $targetChannels,
                'rt',
                $rtPelapor,
                null,
                $idempotencyKey,
                null,
                $rwPelapor
            );
        } else {
            $notifId = 'NOTIF-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999);
            $notifPayload = [
                'id' => $notifId,
                'judul' => $judulNotif,
                'pesan' => $pesanNotif,
                'targetRole' => 'rt',
                'target_role' => 'rt',
                'targetRt' => $rtPelapor,
                'target_rt' => $rtPelapor,
                'targetRw' => $rwPelapor,
                'target_rw' => $rwPelapor,
                'kategori' => 'pengaduan',
                'type' => 'warning',
                'link' => $linkNotif,
                'userId' => $pengurusUser['id'] ?? null,
                'nik' => $pengurusUser['nik'] ?? '',
                'is_read' => false,
                'isRead' => false,
                'createdAt' => $nowIso,
                'created_at' => $nowIso,
                'tanggal' => $nowIso
            ];
            array_unshift($database['notifikasi'], $notifPayload);
        }
    }

    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => 'Pengaduan berhasil dibuat.',
        'data' => $newPengaduan
    ]);
}

jsonResponse(['success' => false, 'error' => 'Aksi tidak dikenali.'], 400);
