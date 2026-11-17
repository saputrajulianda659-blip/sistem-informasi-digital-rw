<?php
// api/warga.php
// Citizen data management backend endpoint with role-based access control and relation preservation

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$method = $_SERVER['REQUEST_METHOD'];

// Handle php://input (JSON) and $_POST (FormData) flexibly
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$input = is_array($jsonInput) ? $jsonInput : [];
if (!empty($_POST) && is_array($_POST)) {
    $input = array_merge($input, $_POST);
}
$user = getAuthenticatedUser($input);

$action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === 'register') {
    require_once __DIR__ . '/auth.php';
    exit();
}
if ($action === 'edit') {
    $action = 'update';
}
if ($method === 'DELETE') {
    $action = 'delete';
} elseif ($method === 'PUT') {
    $action = 'update';
}

// 1. ACTION: LIST or DETAIL
if ($action === 'list' || $action === 'detail' || ($method === 'GET' && empty($action))) {
    $warga = $database['warga'] ?? [];

    // Check if specific citizen detail is requested by NIK
    $filterNik = trim($_GET['nik'] ?? ($input['nik'] ?? ''));
    if (!empty($filterNik)) {
        foreach ($warga as $w) {
            if (($w['nik'] ?? '') === $filterNik) {
                jsonResponse(['success' => true, 'data' => $w]);
            }
        }
        jsonResponse(['success' => false, 'error' => 'Data warga tidak ditemukan.'], 404);
    }

    $filterRt = $_GET['rt'] ?? ($input['rt'] ?? null);
    
    // Apply role-based filtering if user is Ketua RT or Warga
    if ($user) {
        $role = $user['role'] ?? '';
        if ($role === 'Ketua RT' && !empty($user['rt'])) {
            $filterRt = $user['rt'];
        } elseif ($role === 'Warga' && !empty($user['nik'])) {
            $warga = array_values(array_filter($warga, function($w) use ($user) {
                return ($w['nik'] ?? '') === $user['nik'];
            }));
            jsonResponse(['success' => true, 'data' => $warga, 'total' => count($warga)]);
        }
    }

    if ($filterRt !== null && $filterRt !== '') {
        $filterRtNorm = str_pad($filterRt, 2, '0', STR_PAD_LEFT);
        $warga = array_values(array_filter($warga, function($w) use ($filterRtNorm) {
            $rt = str_pad($w['rt'] ?? '', 2, '0', STR_PAD_LEFT);
            return $rt === $filterRtNorm;
        }));
    }

    jsonResponse(['success' => true, 'data' => $warga, 'total' => count($warga)]);
}

// 2. ACTION: DELETE
if ($action === 'delete') {
    $nik = trim($input['nik'] ?? $_GET['nik'] ?? '');
    if (empty($nik)) {
        jsonResponse(['success' => false, 'error' => 'NIK warga wajib disertakan.'], 400);
    }

    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'Autentikasi diperlukan. Sesi login tidak valid.'], 401);
    }

    $role = $user['role'] ?? '';
    $userRt = isset($user['rt']) ? str_pad($user['rt'], 2, '0', STR_PAD_LEFT) : '';
    $userRw = isset($user['rw']) ? str_pad($user['rw'], 2, '0', STR_PAD_LEFT) : '05';

    // Role check: Only Super Admin, Ketua RW, and Ketua RT are authorized
    $allowedRoles = ['Super Admin', 'Ketua RW', 'Ketua RT'];
    if (!in_array($role, $allowedRoles)) {
        jsonResponse([
            'success' => false,
            'error' => 'Akses ditolak: Anda tidak memiliki hak akses untuk menghapus data kependudukan.'
        ], 403);
    }

    // Find citizen in database
    $wargaList = $database['warga'] ?? [];
    $targetIndex = -1;
    $targetWarga = null;

    foreach ($wargaList as $idx => $w) {
        if (($w['nik'] ?? '') === $nik) {
            $targetIndex = $idx;
            $targetWarga = $w;
            break;
        }
    }

    if ($targetIndex === -1 || !$targetWarga) {
        jsonResponse([
            'success' => false,
            'error' => "Data warga dengan NIK {$nik} tidak ditemukan di database."
        ], 404);
    }

    $wargaRt = str_pad($targetWarga['rt'] ?? '', 2, '0', STR_PAD_LEFT);
    $wargaRw = str_pad($targetWarga['rw'] ?? '05', 2, '0', STR_PAD_LEFT);

    // Territorial Scope Checks:
    // - Ketua RT can ONLY delete citizens in their assigned RT
    if ($role === 'Ketua RT') {
        if (empty($userRt) || $wargaRt !== $userRt) {
            jsonResponse([
                'success' => false,
                'error' => "Akses ditolak: Ketua RT hanya berwenang menghapus data warga dalam wilayah RT {$userRt}. Warga ini tercatat di RT {$wargaRt}."
            ], 403);
        }
    }

    // - Ketua RW can only delete citizens in their assigned RW
    if ($role === 'Ketua RW' && !empty($userRw)) {
        if ($wargaRw !== $userRw) {
            jsonResponse([
                'success' => false,
                'error' => "Akses ditolak: Ketua RW hanya berwenang menghapus data warga dalam wilayah RW {$userRw}."
            ], 403);
        }
    }

    // Check Data Retention & Linked Administrative Records:
    $pelayananList = $database['pelayanan'] ?? [];
    $pengaduanList = $database['pengaduan'] ?? [];
    $usersList = $database['users'] ?? [];

    $activePelayanan = [];
    $archivedPelayanan = [];
    foreach ($pelayananList as $p) {
        if (($p['nik_pemohon'] ?? '') === $nik) {
            $st = $p['status'] ?? '';
            if (in_array($st, ['Menunggu Verifikasi RT', 'Menunggu Persetujuan RW', 'Disetujui RT'])) {
                $activePelayanan[] = $p['id'];
            } else {
                $archivedPelayanan[] = $p['id'];
            }
        }
    }

    $activePengaduan = [];
    foreach ($pengaduanList as $ad) {
        if (($ad['nik_pelapor'] ?? '') === $nik) {
            $st = $ad['status'] ?? '';
            if (in_array($st, ['Baru', 'Diproses', 'Ditindaklanjuti'])) {
                $activePengaduan[] = $ad['id'];
            }
        }
    }

    $force = isset($input['force']) && $input['force'] === true;

    // If there are active, unresolved applications, warn unless explicitly confirmed
    if (!empty($activePelayanan) && !$force) {
        jsonResponse([
            'success' => false,
            'requiresConfirmation' => true,
            'activeTransactions' => count($activePelayanan),
            'error' => "Warga ini masih memiliki " . count($activePelayanan) . " pengajuan surat aktif (" . implode(', ', $activePelayanan) . "). Selesaikan permohonan terlebih dahulu atau konfirmasi penghapusan arsip."
        ], 409);
    }

    // Safe deletion:
    // 1. Remove from warga collection
    array_splice($wargaList, $targetIndex, 1);
    $database['warga'] = array_values($wargaList);

    // 2. Preserve administrative history:
    // Update linked pelayanan and pengaduan to retain applicant name tag if not present
    $citizenName = $targetWarga['nama'] ?? 'Mantan Warga';
    foreach ($database['pelayanan'] as &$pel) {
        if (($pel['nik_pemohon'] ?? '') === $nik) {
            if (!isset($pel['nama_pemohon_arsip'])) {
                $pel['nama_pemohon_arsip'] = $citizenName . ' (Data Warga Dihapus)';
            }
        }
    }
    unset($pel);

    foreach ($database['pengaduan'] as &$peng) {
        if (($peng['nik_pelapor'] ?? '') === $nik) {
            if (!isset($peng['nama_pelapor']) || empty($peng['nama_pelapor'])) {
                $peng['nama_pelapor'] = $citizenName . ' (Data Warga Dihapus)';
            }
        }
    }
    unset($peng);

    // 3. Deactivate or remove linked login user account if exists
    foreach ($database['users'] as &$u) {
        if (($u['nik'] ?? '') === $nik) {
            $u['status'] = 'Nonaktif (Warga Dihapus)';
        }
    }
    unset($u);

    // Save to database.json
    saveDatabase($database);

    // Recalculate true statistics
    $remainingTotal = count($database['warga']);
    $byRT = [];
    foreach ($database['warga'] as $w) {
        $r = str_pad($w['rt'] ?? '', 2, '0', STR_PAD_LEFT);
        $byRT[$r] = ($byRT[$r] ?? 0) + 1;
    }
    ksort($byRT);

    jsonResponse([
        'success' => true,
        'message' => "Data warga \"{$citizenName}\" (NIK: {$nik}) berhasil dihapus dari database.",
        'deletedNik' => $nik,
        'deletedNama' => $citizenName,
        'remainingTotal' => $remainingTotal,
        'byRT' => $byRT
    ]);
}

// 3. ACTION: ADD / CREATE (Handle POST Request for Citizen Data Creation)
if ($action === 'add' || ($method === 'POST' && $action !== 'delete' && $action !== 'update')) {
    // 1. Tangani Request POST: Ambil payload dari php://input (JSON) atau $_POST (FormData)
    $data = (isset($input['data']) && is_array($input['data'])) ? $input['data'] : $input;

    $nik = trim($data['nik'] ?? '');
    if (empty($nik)) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'NIK warga wajib diisi.'], 400);
    }

    if (strlen($nik) !== 16 || !ctype_digit($nik)) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'NIK harus berupa 16 digit angka.'], 400);
    }

    $email = isset($data['email']) ? trim($data['email']) : '';
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'Format alamat email tidak valid.'], 400);
    }

    // Role check if userContext provided
    if ($user && ($user['role'] ?? '') === 'Ketua RT') {
        $userRt = str_pad($user['rt'] ?? '', 2, '0', STR_PAD_LEFT);
        $wRt = str_pad($data['rt'] ?? '', 2, '0', STR_PAD_LEFT);
        if (!empty($userRt) && !empty($wRt) && $userRt !== $wRt) {
            jsonResponse(['status' => 'error', 'success' => false, 'message' => "Akses ditolak: Ketua RT hanya dapat menambah warga di wilayah RT {$userRt}."], 403);
        }
    }

    // 2. Validasi & Pembacaan database.json
    $db = loadDatabase();
    if (!isset($db['warga']) || !is_array($db['warga'])) {
        $db['warga'] = [];
    }

    // Cek apakah NIK sudah terdaftar di database
    foreach ($db['warga'] as $w) {
        if (trim((string)($w['nik'] ?? '')) === $nik) {
            jsonResponse(['status' => 'error', 'success' => false, 'message' => "NIK {$nik} sudah terdaftar di sistem."], 400);
        }
    }

    // 3. Susun Objek Warga Baru & Push ke Array
    $newWarga = [
        'nik' => $nik,
        'nama' => trim($data['nama'] ?? ''),
        'no_kk' => trim($data['no_kk'] ?? ''),
        'tempat_lahir' => trim($data['tempat_lahir'] ?? ''),
        'tanggal_lahir' => trim($data['tanggal_lahir'] ?? ''),
        'jenis_kelamin' => trim($data['jenis_kelamin'] ?? 'L'),
        'alamat' => trim($data['alamat'] ?? ''),
        'rt' => str_pad(trim($data['rt'] ?? '01'), 2, '0', STR_PAD_LEFT),
        'rw' => str_pad(trim($data['rw'] ?? '05'), 2, '0', STR_PAD_LEFT),
        'no_hp' => trim($data['no_hp'] ?? ''),
        'status' => trim($data['status'] ?? 'Tetap'),
        'email' => $email,
        'pekerjaan' => trim($data['pekerjaan'] ?? '-'),
        'agama' => trim($data['agama'] ?? '-')
    ];

    $db['warga'][] = $newWarga;
    saveDatabase($db);

    jsonResponse([
        'status' => 'success',
        'success' => true,
        'message' => 'Data warga berhasil ditambahkan',
        'data' => $newWarga,
        'totalWarga' => count($db['warga'])
    ]);
}

// 4. ACTION: UPDATE
if ($action === 'update' || $method === 'PUT') {
    $role = $user['role'] ?? ($input['userContext']['role'] ?? ($_SERVER['HTTP_X_USER_ROLE'] ?? ''));
    if (!empty($role) && !in_array($role, ['Super Admin', 'Ketua RW', 'Ketua RT', 'admin', 'super_admin', 'rw', 'rt', 'rt01', 'rt02'])) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'Akses ditolak.'], 403);
    }

    $data = (isset($input['data']) && is_array($input['data'])) ? $input['data'] : $input;
    $nik = trim((string)($input['nik'] ?? ($data['nik'] ?? '')));

    if (empty($nik)) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'NIK warga wajib disertakan.'], 400);
    }

    // Email validation (optional)
    $email = isset($data['email']) ? trim((string)$data['email']) : '';
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'Format alamat email tidak valid.'], 400);
    }

    $db = loadDatabase();
    if (!isset($db['warga']) || !is_array($db['warga'])) {
        $db['warga'] = [];
    }

    $foundIdx = -1;
    foreach ($db['warga'] as $idx => $w) {
        if (trim((string)($w['nik'] ?? '')) === $nik) {
            $foundIdx = $idx;
            break;
        }
    }

    if ($foundIdx === -1) {
        jsonResponse(['status' => 'error', 'success' => false, 'message' => 'Data warga tidak ditemukan.'], 404);
    }

    if ($role === 'Ketua RT' || $role === 'rt' || $role === 'rt01' || $role === 'rt02') {
        $userRt = str_pad($user['rt'] ?? ($input['userContext']['rt'] ?? ''), 2, '0', STR_PAD_LEFT);
        $wargaRt = str_pad($db['warga'][$foundIdx]['rt'] ?? '', 2, '0', STR_PAD_LEFT);
        if (!empty($userRt) && !empty($wargaRt) && $wargaRt !== $userRt) {
            jsonResponse(['status' => 'error', 'success' => false, 'message' => "Akses ditolak: Ketua RT hanya dapat mengubah data warga di RT {$userRt}."], 403);
        }
    }

    $curr = $db['warga'][$foundIdx];
    $updatedWarga = array_merge($curr, [
        'nama' => isset($data['nama']) && trim((string)$data['nama']) !== '' ? trim((string)$data['nama']) : ($curr['nama'] ?? ''),
        'no_kk' => isset($data['no_kk']) && trim((string)$data['no_kk']) !== '' ? trim((string)$data['no_kk']) : ($curr['no_kk'] ?? ''),
        'tempat_lahir' => isset($data['tempat_lahir']) && trim((string)$data['tempat_lahir']) !== '' ? trim((string)$data['tempat_lahir']) : ($curr['tempat_lahir'] ?? ''),
        'tanggal_lahir' => $data['tanggal_lahir'] ?? ($curr['tanggal_lahir'] ?? ''),
        'jenis_kelamin' => $data['jenis_kelamin'] ?? ($curr['jenis_kelamin'] ?? 'L'),
        'alamat' => isset($data['alamat']) && trim((string)$data['alamat']) !== '' ? trim((string)$data['alamat']) : ($curr['alamat'] ?? ''),
        'rt' => str_pad($data['rt'] ?? ($curr['rt'] ?? '01'), 2, '0', STR_PAD_LEFT),
        'rw' => str_pad($data['rw'] ?? ($curr['rw'] ?? '05'), 2, '0', STR_PAD_LEFT),
        'no_hp' => isset($data['no_hp']) ? trim((string)$data['no_hp']) : ($curr['no_hp'] ?? ''),
        'email' => !empty($email) ? $email : ($curr['email'] ?? ''),
        'status' => $data['status'] ?? ($curr['status'] ?? 'Tetap'),
        'pekerjaan' => isset($data['pekerjaan']) ? trim((string)$data['pekerjaan']) : ($curr['pekerjaan'] ?? '-'),
        'agama' => isset($data['agama']) ? trim((string)$data['agama']) : ($curr['agama'] ?? '-')
    ]);

    $db['warga'][$foundIdx] = $updatedWarga;

    // Sinkronisasi data ke array users jika ada akun dengan NIK yang sama
    if (isset($db['users']) && is_array($db['users'])) {
        foreach ($db['users'] as &$u) {
            if (trim((string)($u['nik'] ?? '')) === $nik) {
                if (!empty($updatedWarga['nama'])) $u['nama'] = $updatedWarga['nama'];
                if (!empty($updatedWarga['no_hp'])) $u['no_hp'] = $updatedWarga['no_hp'];
                if (!empty($updatedWarga['alamat'])) $u['alamat'] = $updatedWarga['alamat'];
                if (!empty($updatedWarga['rt'])) $u['rt'] = $updatedWarga['rt'];
                if (!empty($updatedWarga['rw'])) $u['rw'] = $updatedWarga['rw'];
            }
        }
        unset($u);
    }

    saveDatabase($db);

    jsonResponse([
        'status' => 'success',
        'success' => true,
        'message' => 'Data warga berhasil diperbarui.',
        'data' => $db['warga'][$foundIdx]
    ]);
}

jsonResponse(['success' => false, 'error' => 'Aksi tidak dikenali.'], 400);
