<?php
// api/pelayanan.php
// Backend Service for Pelayanan Surat Digital RW (Workflow: Warga -> RT -> RW)
// Handles status transitions: Menunggu RT -> Menunggu Verifikasi RW -> Selesai / Ditolak

ignore_user_abort(true);
set_time_limit(120);
ini_set('memory_limit', '256M');

require_once __DIR__ . '/db_helper.php';
require_once __DIR__ . '/notification_engine.php';
date_default_timezone_set('Asia/Jakarta');
setCorsHeaders();

$database = loadDatabase();
$config = loadConfig();
$input = getJsonInput();
$user = getAuthenticatedUser($input);
$method = $_SERVER['REQUEST_METHOD'];

function getCleanRT($val) {
    if (!$val) return '';
    $clean = ltrim(trim((string)$val), '0');
    return $clean === '' ? '0' : $clean;
}

$action = $input['action'] ?? $_GET['action'] ?? 'list';

// -------------------------------------------------------------
// ACTION: CREATE / AJUKAN SURAT BARU
// -------------------------------------------------------------
if ($action === 'create' || $action === 'submit' || $action === 'ajukan' || $action === 'tambah' || ($method === 'POST' && (isset($input['jenis_pelayanan']) || isset($input['jenis_surat'])) && $action !== 'update_status' && $action !== 'verify')) {
    if (!isset($database['pelayanan']) || !is_array($database['pelayanan'])) {
        $database['pelayanan'] = [];
    }

    $id = trim($input['id'] ?? $input['no_berkas'] ?? '');
    if (empty($id)) {
        $dateStr = date('Ymd');
        $random = mt_rand(1000, 9999);
        $id = "SRT-{$dateStr}-{$random}";
    }

    $jenisSurat = trim($input['jenis_surat'] ?? $input['jenis_pelayanan'] ?? '');
    $nikPemohon = (string)trim($input['nik_pemohon'] ?? ($input['nik'] ?? ($user['nik'] ?? '')));
    $namaPemohon = trim($input['nama_pemohon'] ?? ($user['name'] ?? ($user['nama'] ?? '')));
    $rt = trim($input['rt'] ?? ($user['rt'] ?? ''));
    $rw = trim($input['rw'] ?? ($user['rw'] ?? '05'));
    $tanggalPengajuan = $input['tanggal_pengajuan'] ?? date('c');
    $status = $input['status'] ?? 'Menunggu Verifikasi RT';
    $keperluan = trim($input['keperluan'] ?? '');
    $dokumenPendukung = $input['dokumen_pendukung'] ?? '';
    if (is_string($dokumenPendukung)) {
        $dokumenPendukung = trim($dokumenPendukung);
    }

    // Resolve pemohon details from warga or users if missing
    if (!empty($nikPemohon) && (empty($namaPemohon) || empty($rt))) {
        foreach (($database['warga'] ?? []) as $w) {
            if ((string)($w['nik'] ?? '') === (string)$nikPemohon) {
                if (empty($namaPemohon)) $namaPemohon = $w['nama'] ?? '';
                if (empty($rt)) $rt = $w['rt'] ?? '';
                if (empty($rw)) $rw = $w['rw'] ?? '05';
                break;
            }
        }
    }
    if (empty($namaPemohon) && !empty($nikPemohon)) {
        foreach (($database['users'] ?? []) as $u) {
            if ((string)($u['nik'] ?? '') === (string)$nikPemohon) {
                $namaPemohon = $u['name'] ?? ($u['nama'] ?? '');
                break;
            }
        }
    }

    if (empty($jenisSurat)) {
        jsonResponse(['success' => false, 'error' => 'Jenis surat wajib diisi.'], 400);
    }
    if (empty($keperluan)) {
        jsonResponse(['success' => false, 'error' => 'Keperluan pengajuan surat wajib diisi.'], 400);
    }

    $cleanRtVal = getCleanRT($rt);
    $formattedRt = $cleanRtVal !== '' ? sprintf('%02d', (int)$cleanRtVal) : '01';
    $cleanRwVal = getCleanRT($rw ?? '05');
    $formattedRw = $cleanRwVal !== '' ? sprintf('%02d', (int)$cleanRwVal) : '05';
    $createdAt = $input['created_at'] ?? (isset($input['tanggal_pengajuan']) ? $input['tanggal_pengajuan'] : date('Y-m-d H:i:s'));

    $newPengajuan = [
        'id' => $id,
        'no_berkas' => $input['no_berkas'] ?? $id,
        'jenis_surat' => $jenisSurat,
        'jenis_pelayanan' => $jenisSurat,
        'nik' => (string)$nikPemohon,
        'nik_pemohon' => (string)$nikPemohon,
        'nama_pemohon' => $namaPemohon ?: 'Warga',
        'rt' => $formattedRt,
        'rw' => $formattedRw,
        'status' => $status,
        'keperluan' => $keperluan,
        'dokumen_pendukung' => $dokumenPendukung,
        'created_at' => $createdAt,
        'tanggal_pengajuan' => $tanggalPengajuan,
        'catatan_rt' => '',
        'catatan_rw' => '',
        'tanggal_selesai' => null
    ];

    // Buka database.json, push/unshift ke array 'pelayanan'
    $dbFile = __DIR__ . '/database.json';
    $dbData = json_decode(file_get_contents($dbFile), true) ?: [];
    if (!isset($dbData['pelayanan']) || !is_array($dbData['pelayanan'])) {
        $dbData['pelayanan'] = [];
    }

    // Bersihkan dummy palsu lama jika ada
    $dbData['pelayanan'] = array_values(array_filter($dbData['pelayanan'], function($item) {
        return ($item['id'] ?? '') !== 'SRT-20260902-1002';
    }));

    // Push or update existing (idempotent append)
    $existsIndex = -1;
    foreach ($dbData['pelayanan'] as $idx => $item) {
        if (($item['id'] ?? '') === $id) {
            $existsIndex = $idx;
            break;
        }
    }

    if ($existsIndex >= 0) {
        $dbData['pelayanan'][$existsIndex] = array_merge($dbData['pelayanan'][$existsIndex], $newPengajuan);
    } else {
        array_unshift($dbData['pelayanan'], $newPengajuan);
    }

    // 1. Simpan data surat baru ke api/database.json SECARA INSTAN terlebih dahulu
    file_put_contents($dbFile, json_encode($dbData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    $database = $dbData;

    // 2. Eksekusi pemanggilan trigger WhatsApp Fonnte (ke Ketua RT terkait) dan Email
    // dijalankan secara aman dalam try-catch tanpa terhalang error timeout Base64
    try {
        $judulRt = "Pengajuan Surat Baru Perlu Verifikasi";
        $pesanRt = "Warga {$newPengajuan['nama_pemohon']} mengajukan {$jenisSurat} (No: {$id}). Silakan lakukan verifikasi berkas.";

        $ketuaRtAccount = resolveKetuaRtAccount($database, $formattedRt, $formattedRw);
        if ($ketuaRtAccount) {
            $waMsgRt = buildPengurusWaMessage(
                $ketuaRtAccount['name'],
                'Ketua RT ' . $formattedRt,
                $jenisSurat,
                $id,
                $newPengajuan['nama_pemohon'],
                $formattedRt,
                $judulRt,
                "Permohonan surat warga baru diterima. Keperluan: {$keperluan}. Silakan lakukan verifikasi berkas.",
                '#/verifikasi-pengajuan'
            );

            dispatchServiceNotification(
                $ketuaRtAccount,
                $judulRt,
                $pesanRt,
                'Pelayanan',
                'info',
                '#/verifikasi-pengajuan',
                $database,
                $config,
                ['in_app', 'whatsapp', 'email'],
                'rt',
                $formattedRt,
                $waMsgRt,
                "SRT-CREATE-{$id}-RT",
                '',
                $formattedRw
            );
        }

        $superAdminAccount = resolveSuperAdminAccount($database);
        if ($superAdminAccount) {
            $judulAdmin = "Pengajuan Surat Baru Perlu Verifikasi";
            $pesanAdmin = "Warga {$newPengajuan['nama_pemohon']} mengajukan {$jenisSurat} (No: {$id}) di RT {$formattedRt}. Silakan pantau verifikasi berkas.";

            dispatchServiceNotification(
                $superAdminAccount,
                $judulAdmin,
                $pesanAdmin,
                'Pelayanan',
                'info',
                '#/pelayanan',
                $database,
                $config,
                ['in_app'], // Super Admin HANYA menerima in-app di web (tidak dikirimi WhatsApp)
                'super_admin',
                $formattedRt,
                null,
                "SRT-CREATE-{$id}-ADMIN",
                '',
                $formattedRw
            );
        }

        // Simpan pembaruan notifikasi & logs ke database.json
        saveDatabase($database);
    } catch (\Throwable $notifEx) {
        error_log("[Pelayanan Submit Notification Warning] " . $notifEx->getMessage());
    }

    // 3. Berikan response JSON valid
    echo json_encode([
        'status' => 'success',
        'success' => true,
        'message' => 'Pengajuan surat berhasil dikirim dan tersimpan di database.',
        'data' => $newPengajuan
    ]);
    exit();
}

// -------------------------------------------------------------
// ACTION: LIST PELAYANAN
// -------------------------------------------------------------
if ($action === 'list' || $action === 'get_all') {
    $dbFile = __DIR__ . '/database.json';
    $database = json_decode(file_get_contents($dbFile), true) ?: loadDatabase();
    $pelayananList = array_values(array_filter($database['pelayanan'] ?? [], function($item) {
        return ($item['id'] ?? '') !== 'SRT-20260902-1002';
    }));
    
    // Enrich with pemohon details if not already present
    $wargaMap = [];
    foreach (($database['warga'] ?? []) as $w) {
        $wargaMap[$w['nik']] = $w;
    }
    foreach ($pelayananList as &$item) {
        $nik = (string)($item['nik'] ?? ($item['nik_pemohon'] ?? ''));
        if (isset($wargaMap[$nik])) {
            if (empty($item['nama_pemohon'])) $item['nama_pemohon'] = $wargaMap[$nik]['nama'] ?? 'Warga';
            if (empty($item['rt'])) $item['rt'] = $wargaMap[$nik]['rt'] ?? '';
            if (empty($item['rw'])) $item['rw'] = $wargaMap[$nik]['rw'] ?? '05';
        }
        $item['nik'] = $nik;
        $item['nik_pemohon'] = $nik;
        $cRt = getCleanRT($item['rt'] ?? '');
        $item['rt'] = $cRt !== '' ? sprintf('%02d', (int)$cRt) : '01';
        $cRw = getCleanRT($item['rw'] ?? '05');
        $item['rw'] = $cRw !== '' ? sprintf('%02d', (int)$cRw) : '05';
        if (empty($item['no_berkas'])) {
            $item['no_berkas'] = $item['id'] ?? '';
        }
        if (empty($item['jenis_pelayanan']) && !empty($item['jenis_surat'])) {
            $item['jenis_pelayanan'] = $item['jenis_surat'];
        }
        if (empty($item['jenis_surat']) && !empty($item['jenis_pelayanan'])) {
            $item['jenis_surat'] = $item['jenis_pelayanan'];
        }
        if (empty($item['created_at'])) {
            $item['created_at'] = $item['tanggal_pengajuan'] ?? date('c');
        }
    }
    unset($item);

    // Role based filtering if authenticated
    $userNik = (string)($user['nik'] ?? $_GET['nik'] ?? ($input['nik'] ?? ''));
    if ($user) {
        $userId = $user['id'] ?? null;
        if ($userId && (empty($userNik) || empty($user['rt']))) {
            foreach (($database['users'] ?? []) as $u) {
                if ($u['id'] == $userId) {
                    $user = array_merge($u, $user);
                    if (empty($userNik) && !empty($u['nik'])) {
                        $userNik = (string)$u['nik'];
                    }
                    break;
                }
            }
        }

        $role = $user['role'] ?? 'Warga';
        if ($role === 'Warga' && !empty($userNik)) {
            $userNikClean = getCleanRT($userNik);
            $pelayananList = array_values(array_filter($pelayananList, function($p) use ($userNik, $userNikClean) {
                $pNik = (string)($p['nik'] ?? $p['nik_pemohon'] ?? '');
                return $pNik === $userNik || (getCleanRT($pNik) === $userNikClean && $userNikClean !== '');
            }));
        } elseif ($role === 'Ketua RT' && isset($user['rt'])) {
            $userRtClean = getCleanRT($user['rt']);
            $pelayananList = array_values(array_filter($pelayananList, function($p) use ($userRtClean) {
                return getCleanRT($p['rt'] ?? '') === $userRtClean;
            }));
        }
 elseif ($role === 'Ketua RW' || ($input['view'] ?? $_GET['view'] ?? '') === 'rw') {
            if (isset($_GET['filter_rw']) || ($input['filter_rw'] ?? false)) {
                $pelayananList = array_values(array_filter($pelayananList, function($p) {
                    $st = strtolower($p['status'] ?? '');
                    return strpos($st, 'disetujui rt') !== false || 
                           strpos($st, 'menunggu verifikasi rw') !== false || 
                           strpos($st, 'menunggu persetujuan rw') !== false || 
                           strpos($st, 'selesai') !== false || 
                           strpos($st, 'ditolak rw') !== false;
                }));
            }
        }
    }

    // Urutkan tabel dari yang paling baru (sort descending berdasarkan tanggal/created_at atau id berkas)
    usort($pelayananList, function($a, $b) {
        $timeA = strtotime($a['tanggal_pengajuan'] ?? $a['created_at'] ?? '1970-01-01');
        $timeB = strtotime($b['tanggal_pengajuan'] ?? $b['created_at'] ?? '1970-01-01');
        if ($timeB !== $timeA) {
            return $timeB - $timeA;
        }
        return strcmp((string)($b['id'] ?? ''), (string)($a['id'] ?? ''));
    });

    // Ringankan dokumen_pendukung untuk list: sertakan label dan nama file tanpa data base64 raksasa agar respons instan (<30ms)
    // Dokumen asli base64 lengkap tetap di-load penuh saat membuka detail (action=detail)
    foreach ($pelayananList as &$item) {
        if (!empty($item['dokumen_pendukung']) && is_array($item['dokumen_pendukung'])) {
            $lightDocs = [];
            foreach ($item['dokumen_pendukung'] as $doc) {
                if (is_array($doc)) {
                    $lightDocs[] = [
                        'label' => $doc['label'] ?? '',
                        'nama_file' => $doc['nama_file'] ?? ($doc['fileName'] ?? ''),
                        'hasFile' => !empty($doc['data']) || !empty($doc['url'])
                    ];
                } else {
                    $lightDocs[] = $doc;
                }
            }
            $item['dokumen_pendukung'] = $lightDocs;
        }
    }
    unset($item);

    jsonResponse([
        'success' => true,
        'total' => count($pelayananList),
        'data' => $pelayananList
    ]);
}

// -------------------------------------------------------------
// ACTION: GET DETAIL
// -------------------------------------------------------------
if ($action === 'detail' || $action === 'get_detail') {
    $id = trim($input['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'Parameter ID pengajuan wajib diisi.'], 400);
    }

    $dbFile = __DIR__ . '/database.json';
    $database = json_decode(file_get_contents($dbFile), true) ?: loadDatabase();

    $found = null;
    foreach (($database['pelayanan'] ?? []) as $p) {
        if (($p['id'] ?? '') === $id || ($p['no_berkas'] ?? '') === $id) {
            $found = $p;
            break;
        }
    }

    if (!$found) {
        jsonResponse(['success' => false, 'error' => 'Data pengajuan surat tidak ditemukan.'], 404);
    }

    // Attach pemohon info if available
    $nikPem = (string)($found['nik'] ?? ($found['nik_pemohon'] ?? ''));
    $pemohon = null;
    foreach (($database['warga'] ?? []) as $w) {
        if ((string)($w['nik'] ?? '') === $nikPem) {
            $pemohon = $w;
            break;
        }
    }
    if ($pemohon) {
        if (empty($found['nama_pemohon'])) {
            $found['nama_pemohon'] = $pemohon['nama'] ?? 'Warga';
        }
        if (empty($found['rt'])) {
            $found['rt'] = $pemohon['rt'] ?? '';
        }
        if (empty($found['rw'])) {
            $found['rw'] = $pemohon['rw'] ?? '05';
        }
        if (empty($found['no_hp'])) {
            $found['no_hp'] = $pemohon['no_hp'] ?? '';
        }
    }

    $cDetailRt = getCleanRT($found['rt'] ?? '');
    $found['rt'] = $cDetailRt !== '' ? sprintf('%02d', (int)$cDetailRt) : '01';
    $cDetailRw = getCleanRT($found['rw'] ?? '05');
    $found['rw'] = $cDetailRw !== '' ? sprintf('%02d', (int)$cDetailRw) : '05';
    $found['id'] = $found['id'] ?? ($found['no_berkas'] ?? $id);
    $found['no_berkas'] = $found['no_berkas'] ?? $found['id'];
    if (empty($found['jenis_pelayanan']) && !empty($found['jenis_surat'])) {
        $found['jenis_pelayanan'] = $found['jenis_surat'];
    }
    if (empty($found['jenis_surat']) && !empty($found['jenis_pelayanan'])) {
        $found['jenis_surat'] = $found['jenis_pelayanan'];
    }

    jsonResponse([
        'success' => true,
        'status' => 'success',
        'data' => $found
    ]);
}

// -------------------------------------------------------------
// ACTION: UPDATE STATUS (VERIFIKASI RT / RW)
// -------------------------------------------------------------
if ($action === 'update_status' || $action === 'verify') {
    $id = trim($input['id'] ?? '');
    $actionType = strtoupper(trim($input['actionType'] ?? $input['action_type'] ?? 'APPROVE')); // APPROVE, REJECT, REVISION
    $catatan = trim($input['catatan'] ?? $input['notes'] ?? '');

    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'ID pengajuan tidak boleh kosong.'], 400);
    }

    $index = -1;
    foreach (($database['pelayanan'] ?? []) as $i => $item) {
        if (($item['id'] ?? '') === $id) {
            $index = $i;
            break;
        }
    }

    if ($index === -1) {
        jsonResponse(['success' => false, 'error' => 'Pengajuan surat dengan ID tersebut tidak ditemukan.'], 404);
    }

    $p = &$database['pelayanan'][$index];
    $userRole = $user['role'] ?? 'Ketua RT'; // Default fallback if called locally
    $suratName = !empty($p['jenis_pelayanan']) ? $p['jenis_pelayanan'] : 'Surat Pelayanan';
    $isSktm = stripos($suratName, 'SKTM') !== false || stripos($suratName, 'Tidak Mampu') !== false;
    $suratLabel = $isSktm ? 'SKTM' : $suratName;

    $notifText = '';
    $notifTitle = '';
    $notifType = 'info';

    // Tentukan tahap proses secara akurat (apakah tahap RT atau tahap RW)
    $isRwStage = in_array(strtolower($p['status'] ?? ''), ['menunggu_verifikasi_rw', 'menunggu persetujuan rw', 'disetujui rt']);
    $rawUserRole = strtolower(trim((string)$userRole));
    $isRwRole = strpos($rawUserRole, 'rw') !== false;
    $isRtRole = strpos($rawUserRole, 'rt') !== false;
    $isAdminRole = strpos($rawUserRole, 'admin') !== false;
    $isProcessingRw = $isRwRole || ($isAdminRole && $isRwStage) || ($isRwStage && !$isRtRole);

    $jenisNama = !empty($p['jenis_surat']) ? $p['jenis_surat'] : (!empty($p['jenis_pelayanan']) ? $p['jenis_pelayanan'] : 'Surat');
    $noBerkas = !empty($p['no_berkas']) ? $p['no_berkas'] : $p['id'];

    if ($isProcessingRw) {
        // TAHAP PERSETUJUAN KETUA RW
        if ($actionType === 'APPROVE') {
            $p['status'] = 'Selesai';
            $p['catatan_rw'] = $catatan ?: 'Disetujui oleh Ketua RW. Surat resmi telah diterbitkan.';
            $p['tanggal_selesai'] = date('c');

            $notifTitle = "Pengajuan Surat Selesai";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda telah diproses dan dinyatakan Selesai oleh Ketua RW.";
            $notifType = 'success';
        } elseif ($actionType === 'REJECT') {
            $p['status'] = 'Ditolak RW';
            $p['catatan_rw'] = $catatan ?: 'Ditolak oleh Ketua RW.';
            $p['tanggal_selesai'] = date('c');

            $notifTitle = "Pengajuan Surat Ditolak RW";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda ditolak pada tahap verifikasi RW. Alasan: " . $p['catatan_rw'];
            $notifType = 'error';
        } elseif ($actionType === 'REVISION' || $actionType === 'PERLU_DIPERBAIKI') {
            $p['status'] = 'Perlu Diperbaiki';
            $p['catatan_rw'] = $catatan ?: 'Perlu perbaikan berkas oleh pemohon.';

            $notifTitle = "Pengajuan Surat Perlu Diperbaiki";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda memerlukan perbaikan dokumen. Catatan RW: " . $p['catatan_rw'];
            $notifType = 'warning';
        }
    } else {
        // TAHAP VERIFIKASI KETUA RT
        if ($actionType === 'APPROVE') {
            $p['status'] = 'menunggu_verifikasi_rw';
            $p['catatan_rt'] = $catatan ?: 'Disetujui oleh Ketua RT dan meneruskan ke Ketua RW.';

            $notifTitle = "Pengajuan Surat Disetujui RT";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda telah disetujui oleh Ketua RT dan diteruskan ke Ketua RW.";
            $notifType = 'success';
        } elseif ($actionType === 'REJECT') {
            $p['status'] = 'Ditolak RT';
            $p['catatan_rt'] = $catatan ?: 'Ditolak oleh RT (Dokumen/informasi belum sesuai).';
            $p['tanggal_selesai'] = date('c');

            $notifTitle = "Pengajuan Surat Ditolak RT";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda ditolak oleh Ketua RT. Alasan: " . $p['catatan_rt'];
            $notifType = 'error';
        } elseif ($actionType === 'REVISION' || $actionType === 'PERLU_DIPERBAIKI') {
            $p['status'] = 'Perlu Diperbaiki';
            $p['catatan_rt'] = $catatan ?: 'Perlu perbaikan berkas oleh pemohon.';

            $notifTitle = "Pengajuan Surat Perlu Diperbaiki";
            $notifText = "Pengajuan {$jenisNama} ({$noBerkas}) Anda memerlukan perbaikan dokumen. Catatan RT: " . $p['catatan_rt'];
            $notifType = 'warning';
        }
    }

    // -------------------------------------------------------------
    // DISTRIBUSI NOTIFIKASI PERUBAHAN STATUS:
    // -------------------------------------------------------------

    // 1. Notifikasi untuk Pemohon Warga (MUTLAK HARUS ADA UNTUK SEMUA WARGA)
    $pemohonNik = !empty($p['nik']) ? (string)$p['nik'] : (!empty($p['nik_pemohon']) ? (string)$p['nik_pemohon'] : '');
    $pemohonUser = null;
    foreach (($database['users'] ?? []) as $u) {
        if (($u['nik'] ?? '') === $pemohonNik) {
            $pemohonUser = $u;
            break;
        }
    }

    if (empty($pemohonNik) && !empty($p['nama_pemohon'])) {
        foreach (($database['warga'] ?? []) as $w) {
            if (strcasecmp($w['nama'] ?? '', $p['nama_pemohon']) === 0) {
                $pemohonNik = (string)$w['nik'];
                break;
            }
        }
    }

    // Pastikan konsistensi nik dan nik_pemohon pada record berkas
    $p['nik'] = $pemohonNik;
    $p['nik_pemohon'] = $pemohonNik;

    $pemohonPhone = $pemohonUser['no_hp'] ?? '';
    $pemohonEmail = $pemohonUser['email'] ?? '';
    $pemohonName  = $pemohonUser['name'] ?? ($p['nama_pemohon'] ?? 'Warga');

    if (empty($pemohonPhone) || empty($pemohonEmail)) {
        foreach (($database['warga'] ?? []) as $w) {
            if (($w['nik'] ?? '') === $pemohonNik) {
                if (empty($pemohonPhone) && !empty($w['no_hp'])) $pemohonPhone = $w['no_hp'];
                if (empty($pemohonEmail) && !empty($w['email'])) $pemohonEmail = $w['email'];
                break;
            }
        }
    }

    $itemRtClean = str_pad(getCleanRT($p['rt'] ?? '') ?: '01', 2, '0', STR_PAD_LEFT);
    $itemRwClean = str_pad(getCleanRT($p['rw'] ?? '05') ?: '05', 2, '0', STR_PAD_LEFT);

    if (!empty($pemohonNik) && !empty($notifText)) {
        if (!isset($database['notifikasi']) || !is_array($database['notifikasi'])) {
            $database['notifikasi'] = [];
        }

        $notifWarga = [
            "id" => "NTF-" . round(microtime(true) * 1000) . "-W",
            "targetRole" => "warga",
            "target_role" => "warga",
            "target" => "warga",
            "role" => "warga",
            "nik" => $pemohonNik,
            "target_nik" => $pemohonNik,
            "userId" => $pemohonUser['id'] ?? null,
            "username" => $pemohonUser['username'] ?? '',
            "pemohon" => $pemohonName,
            "nama_pemohon" => $pemohonName,
            "target_rt" => $itemRtClean,
            "target_rw" => $itemRwClean,
            "judul" => $notifTitle,
            "pesan" => $notifText,
            "kategori" => "surat",
            "type" => $notifType,
            "link" => "#/status-pengajuan",
            "waktu" => date('Y-m-d H:i:s'),
            "created_at" => date('Y-m-d H:i:s'),
            "tanggal" => date('c'),
            "isRead" => false,
            "is_read" => false
        ];
        array_unshift($database['notifikasi'], $notifWarga);

        // Multi-channel WhatsApp & Email (sesuai aturan guardrails: alur WA dan Email tetap utuh)
        $pemohonRecipient = [
            'id' => $pemohonUser['id'] ?? $pemohonNik,
            'user_id' => $pemohonUser['id'] ?? $pemohonNik,
            'name' => $pemohonName,
            'phone' => $pemohonPhone,
            'email' => $pemohonEmail,
            'nik' => $pemohonNik,
            'role' => 'Warga'
        ];

        $finalNote = $p['catatan_rw'] ?: ($p['catatan_rt'] ?: '');
        $waMsgWarga = buildSuratWaMessage(
            $pemohonName,
            $jenisNama,
            $id,
            $p['status'],
            $finalNote,
            '#/status-pengajuan'
        );

        dispatchServiceNotification(
            $pemohonRecipient,
            $notifTitle,
            $notifText,
            'Pelayanan',
            $notifType,
            '#/status-pengajuan',
            $database,
            $config,
            ['whatsapp', 'email'],
            'warga',
            $itemRtClean,
            $waMsgWarga,
            "SRT-STATUS-{$id}-{$actionType}-WARGA",
            $pemohonNik,
            $itemRwClean
        );
    }

    // 2. Saat Ketua RT Menyetujui Pengajuan (Status: menunggu_verifikasi_rw)
    // Otomatis kirim notifikasi In-App (lonceng), WhatsApp, dan Email ke Ketua RW
    if ($p['status'] === 'menunggu_verifikasi_rw') {
        $targetRw = str_pad(getCleanRT($p['rw'] ?? '05') ?: '05', 2, '0', STR_PAD_LEFT);
        $ketuaRwAccount = resolveKetuaRwAccount($database, $targetRw);

        if ($ketuaRwAccount) {
            $judulRw = "Persetujuan Surat Menunggu Tindakan";
            $pesanRw = "Pengajuan {$jenisNama} dari {$p['nama_pemohon']} telah diverifikasi RT {$itemRtClean} dan menunggu persetujuan RW.";

            $waMsgRw = buildPengurusWaMessage(
                $ketuaRwAccount['name'],
                'Ketua RW',
                $jenisNama,
                $id,
                $p['nama_pemohon'],
                $itemRtClean,
                $judulRw,
                "Pengajuan telah diverifikasi Ketua RT {$itemRtClean} dan menunggu persetujuan akhir Ketua RW.",
                '#/persetujuan-pelayanan'
            );

            dispatchServiceNotification(
                $ketuaRwAccount,
                $judulRw,
                $pesanRw,
                'Pelayanan',
                'warning',
                '#/persetujuan-pelayanan',
                $database,
                $config,
                ['in_app', 'whatsapp', 'email'],
                'rw',
                $itemRtClean,
                $waMsgRw,
                "SRT-STATUS-{$id}-APPROVE-RW",
                '',
                $targetRw
            );
        }
    }

    // 3. Saat Ketua RW Menyetujui Pengajuan (Status: Selesai)
    // Beri notifikasi ke Ketua RT bahwa surat warganya telah selesai diproses oleh RW (HANYA untuk RT, bukan RW)
    if ($p['status'] === 'Selesai') {
        $ketuaRtAccount = resolveKetuaRtAccount($database, $itemRtClean);
        if ($ketuaRtAccount) {
            $notifRtFinal = [
                "id" => "NTF-" . round(microtime(true) * 1000) . "-RT",
                "targetRole" => "rt",
                "target_role" => "rt",
                "target" => "rt",
                "role" => "rt",
                "target_rt" => $itemRtClean,
                "userId" => $ketuaRtAccount['id'] ?? null,
                "nik" => $ketuaRtAccount['nik'] ?? '',
                "judul" => "Status Pelayanan RT: {$noBerkas} Telah Selesai",
                "pesan" => "Pengajuan {$jenisNama} ({$noBerkas}) warga RT {$itemRtClean} telah diproses oleh Ketua RW dengan status: Selesai.",
                "kategori" => "surat",
                "type" => "info",
                "link" => "#/verifikasi-pengajuan",
                "waktu" => date('Y-m-d H:i:s'),
                "created_at" => date('Y-m-d H:i:s'),
                "tanggal" => date('c'),
                "isRead" => false,
                "is_read" => false
            ];
            array_unshift($database['notifikasi'], $notifRtFinal);
        }
    }

    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => 'Status pengajuan berhasil diperbarui.',
        'status' => $p['status'],
        'data' => $p
    ]);
}

jsonResponse(['success' => false, 'error' => 'Aksi pelayanan tidak valid.'], 400);
