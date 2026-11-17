<?php
// api/update_profile.php
// Pembaruan profil pengguna (Khusus No. Kontak dan Email) secara aman ke database.json

require_once __DIR__ . '/db_helper.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode HTTP tidak diizinkan.']);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$username = trim($data['username'] ?? '');
$newContact = trim($data['no_hp'] ?? '');
$newEmail = trim($data['email'] ?? '');

if (empty($username)) {
    echo json_encode(['success' => false, 'error' => 'Sesi username tidak valid.']);
    exit();
}

$db = loadDatabase();
$users = $db['users'] ?? [];
$warga = $db['warga'] ?? [];

$userFound = false;
$targetNik = null;
$updatedUser = null;

// 1. Perbarui data pada koleksi users (HANYA no_hp & email)
foreach ($users as $index => $u) {
    if (isset($u['username']) && strtolower($u['username']) === strtolower($username)) {
        if (!empty($newContact)) {
            $users[$index]['no_hp'] = $newContact;
            $users[$index]['telepon'] = $newContact;
        }
        if (!empty($newEmail)) {
            $users[$index]['email'] = $newEmail;
        }

        $targetNik = $u['nik'] ?? null;
        $updatedUser = $users[$index];
        $userFound = true;
        break;
    }
}

if (!$userFound) {
    echo json_encode(['success' => false, 'error' => 'Pengguna tidak ditemukan dalam sistem.']);
    exit();
}

// 2. Sinkronkan ke koleksi warga jika user memiliki tautan NIK
if (!empty($targetNik)) {
    foreach ($warga as $wIdx => $w) {
        if (isset($w['nik']) && $w['nik'] === $targetNik) {
            if (!empty($newContact)) {
                $warga[$wIdx]['no_hp'] = $newContact;
                $warga[$wIdx]['telepon'] = $newContact;
            }
            if (!empty($newEmail)) {
                $warga[$wIdx]['email'] = $newEmail;
            }
            break;
        }
    }
}

// 3. Simpan kembali ke database.json secara atomic dengan file lock LOCK_EX
$db['users'] = $users;
$db['warga'] = $warga;

$saveResult = saveDatabase($db);

if ($saveResult !== false) {
    if (isset($updatedUser['password'])) unset($updatedUser['password']);

    echo json_encode([
        'success' => true,
        'message' => 'Profil berhasil diperbarui.',
        'user' => $updatedUser
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Gagal menulis pembaruan ke database server.'
    ]);
}

