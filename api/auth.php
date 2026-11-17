<?php
// api/auth.php
// Authentication & Self-Registration API for Digital RW

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$method = $_SERVER['REQUEST_METHOD'];
$action = $input['action'] ?? $_GET['action'] ?? 'register';

if ($action === 'register' || ($method === 'POST' && (isset($input['nik']) || isset($input['password'])))) {
    $nik = trim($input['nik'] ?? '');
    $no_kk = trim($input['no_kk'] ?? '');
    $nama = trim($input['nama'] ?? ($input['name'] ?? ''));
    $rt = str_pad(trim($input['rt'] ?? '01'), 2, '0', STR_PAD_LEFT);
    $rw = str_pad(trim($input['rw'] ?? '05'), 2, '0', STR_PAD_LEFT);
    $no_hp = trim($input['telepon'] ?? ($input['no_hp'] ?? ''));
    $email = strtolower(trim($input['email'] ?? ''));
    $jenis_kelamin = strtoupper(trim($input['jenis_kelamin'] ?? 'L'));
    $rawPassword = trim($input['password'] ?? '');
    $hashedPassword = trim($input['hashed_password'] ?? '');

    // 1. Validasi Input Dasar
    if (strlen($nik) !== 16 || !ctype_digit($nik)) {
        jsonResponse(['success' => false, 'error' => 'NIK harus berupa 16 digit angka.'], 400);
    }
    if (strlen($no_kk) !== 16 || !ctype_digit($no_kk)) {
        jsonResponse(['success' => false, 'error' => 'Nomor Kartu Keluarga harus berupa 16 digit angka.'], 400);
    }
    if (empty($nama)) {
        jsonResponse(['success' => false, 'error' => 'Nama lengkap wajib diisi.'], 400);
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'Format alamat email tidak valid.'], 400);
    }
    if (empty($rawPassword) && empty($hashedPassword)) {
        jsonResponse(['success' => false, 'error' => 'Password wajib diisi.'], 400);
    }

    if (empty($hashedPassword)) {
        $hashedPassword = 'h_' . substr(md5($rawPassword), 0, 8) . base64_encode(substr($rawPassword, 0, 3));
    }

    $dbFile = getDatabasePath();
    $fp = fopen($dbFile, 'c+');
    if (!$fp) {
        jsonResponse(['success' => false, 'error' => 'Gagal membuka database server.'], 500);
    }

    flock($fp, LOCK_EX);
    $size = filesize($dbFile);
    $content = $size > 0 ? fread($fp, $size) : '';
    $db = json_decode($content, true);
    if (!is_array($db)) {
        $db = loadDatabase();
    }
    if (!isset($db['warga']) || !is_array($db['warga'])) $db['warga'] = [];
    if (!isset($db['users']) || !is_array($db['users'])) $db['users'] = [];

    // 2. Cek apakah NIK atau Email sudah terdaftar di database.json
    $isDuplicate = false;
    foreach ($db['warga'] as $w) {
        if (($w['nik'] ?? '') === $nik || (!empty($email) && strtolower($w['email'] ?? '') === $email)) {
            $isDuplicate = true;
            break;
        }
    }
    if (!$isDuplicate) {
        foreach ($db['users'] as $u) {
            if (($u['nik'] ?? '') === $nik || (!empty($email) && strtolower($u['email'] ?? '') === $email)) {
                $isDuplicate = true;
                break;
            }
        }
    }

    if ($isDuplicate) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'NIK/Email sudah terdaftar'], 400);
    }

    // 3. Simpan ke array 'warga'
    $newWarga = [
        'nik' => $nik,
        'no_kk' => $no_kk,
        'nama' => $nama,
        'rt' => $rt,
        'rw' => $rw,
        'telepon' => $no_hp,
        'no_hp' => $no_hp,
        'email' => $email,
        'jenis_kelamin' => $jenis_kelamin,
        'password' => $hashedPassword,
        'role' => 'warga',
        'status_warga' => 'Tetap',
        'status' => 'Tetap',
        'pekerjaan' => trim($input['pekerjaan'] ?? '-'),
        'agama' => trim($input['agama'] ?? '-'),
        'alamat' => trim($input['alamat'] ?? "RT {$rt} / RW {$rw}"),
        'created_at' => $input['created_at'] ?? date('c')
    ];
    $db['warga'][] = $newWarga;

    // 4. Simpan ke array 'users'
    $newUserId = round(microtime(true) * 1000);
    $newUser = [
        'id' => $newUserId,
        'name' => $nama,
        'username' => $nik,
        'email' => $email,
        'role' => 'Warga',
        'rt' => $rt,
        'rw' => $rw,
        'nik' => $nik,
        'no_hp' => $no_hp,
        'alamat' => $newWarga['alamat'],
        'status' => 'Aktif',
        'password' => $hashedPassword,
        'created_at' => $newWarga['created_at']
    ];
    $db['users'][] = $newUser;

    // 5. Tulis database.json dengan aman
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    unset($newUser['password']);
    unset($newWarga['password']);

    jsonResponse([
        'success' => true,
        'message' => 'Pendaftaran berhasil! Silakan login menggunakan NIK dan password Anda.',
        'data' => [
            'warga' => $newWarga,
            'user' => $newUser
        ]
    ], 201);
}

jsonResponse(['success' => false, 'error' => 'Aksi tidak valid.'], 400);

