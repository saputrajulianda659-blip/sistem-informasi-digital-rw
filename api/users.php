<?php
// api/users.php
// Backend REST API Service for User Management (Digital RW)
// Supports GET, POST, PUT/PATCH /api/users/:id, and DELETE with Role-based Authorization:
// - Super Admin: Full access to change all fields including Role (Warga, Ketua RT, Ketua RW, Super Admin)
// - Ketua RT & Ketua RW: Access to update citizen data (Name, NIK, Email, Phone, Address, Status) for their assigned territory, but CANNOT change User Role.

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$user = getAuthenticatedUser($input);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $input['action'] ?? $_GET['action'] ?? '';

if ($action === 'register') {
    require_once __DIR__ . '/auth.php';
    exit();
}

// Extract ID from query param, input payload, PATH_INFO, or REQUEST_URI
$id = trim($_GET['id'] ?? ($input['id'] ?? ''));
if (empty($id) && !empty($_SERVER['PATH_INFO'])) {
    $id = trim($_SERVER['PATH_INFO'], '/');
}
if (empty($id) && !empty($_SERVER['REQUEST_URI'])) {
    $cleanUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#users(?:\.php)?/([^/]+)#i', $cleanUri, $m)) {
        $id = urldecode($m[1]);
    }
}

// Ensure database['users'] is an array
if (!isset($database['users']) || !is_array($database['users'])) {
    $database['users'] = [];
}

// -------------------------------------------------------------
// ACTION: GET (List all or single user)
// -------------------------------------------------------------
if ($method === 'GET' && empty($action)) {
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'Autentikasi diperlukan.'], 401);
    }

    $users = $database['users'];

    if (!empty($id)) {
        foreach ($users as $u) {
            if (strval($u['id'] ?? '') === strval($id)) {
                unset($u['password']); // Protect password
                jsonResponse(['success' => true, 'data' => $u]);
            }
        }
        jsonResponse(['success' => false, 'error' => 'Pengguna tidak ditemukan.'], 404);
    }

    // Role-based visibility
    $callerRole = $user['role'] ?? '';
    if ($callerRole === 'Ketua RT' && !empty($user['rt'])) {
        $userRt = str_pad($user['rt'], 2, '0', STR_PAD_LEFT);
        $users = array_values(array_filter($users, function($u) use ($userRt) {
            $rt = str_pad($u['rt'] ?? '', 2, '0', STR_PAD_LEFT);
            return $rt === $userRt || ($u['role'] ?? '') === 'Ketua RT';
        }));
    }

    // Sanitize passwords before returning
    $sanitized = array_map(function($u) {
        unset($u['password']);
        return $u;
    }, $users);

    jsonResponse([
        'success' => true,
        'total' => count($sanitized),
        'data' => $sanitized
    ]);
}

// -------------------------------------------------------------
// ACTION: PUT / PATCH / UPDATE USER
// -------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH' || $action === 'update') {
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'Autentikasi diperlukan. Sesi login tidak valid.'], 401);
    }

    $callerRole = $user['role'] ?? '';
    $allowedRoles = ['Super Admin', 'Ketua RW', 'Ketua RT'];
    if (!in_array($callerRole, $allowedRoles)) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah data pengguna.'], 403);
    }

    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'ID pengguna wajib disertakan.'], 400);
    }

    $users = $database['users'];
    $foundIndex = -1;
    $targetUser = null;

    foreach ($users as $idx => $u) {
        if (strval($u['id'] ?? '') === strval($id)) {
            $foundIndex = $idx;
            $targetUser = $u;
            break;
        }
    }

    if ($foundIndex === -1 || !$targetUser) {
        jsonResponse(['success' => false, 'error' => "Pengguna dengan ID {$id} tidak ditemukan di database."], 404);
    }

    // Extract updated fields
    $reqUsername = isset($input['username']) ? trim($input['username']) : ($targetUser['username'] ?? '');
    $reqName     = isset($input['name']) ? trim($input['name']) : ($targetUser['name'] ?? '');
    $reqEmail    = isset($input['email']) ? trim($input['email']) : ($targetUser['email'] ?? '');
    $reqRole     = isset($input['role']) ? trim($input['role']) : ($targetUser['role'] ?? 'Warga');
    $reqRt       = isset($input['rt']) ? str_pad(trim($input['rt']), 2, '0', STR_PAD_LEFT) : ($targetUser['rt'] ?? '');
    $reqRw       = isset($input['rw']) ? str_pad(trim($input['rw']), 2, '0', STR_PAD_LEFT) : ($targetUser['rw'] ?? '05');
    $reqNik      = isset($input['nik']) ? trim($input['nik']) : ($targetUser['nik'] ?? '');
    $reqStatus   = isset($input['status']) ? trim($input['status']) : ($targetUser['status'] ?? 'Aktif');
    $reqNoHp     = isset($input['phone']) ? trim($input['phone']) : (isset($input['no_hp']) ? trim($input['no_hp']) : ($targetUser['no_hp'] ?? ''));
    $reqAlamat   = isset($input['alamat']) ? trim($input['alamat']) : ($targetUser['alamat'] ?? '');
    $reqPassword = isset($input['password']) ? trim($input['password']) : '';

    $targetRt = str_pad($targetUser['rt'] ?? '', 2, '0', STR_PAD_LEFT);
    $targetRw = str_pad($targetUser['rw'] ?? '05', 2, '0', STR_PAD_LEFT);
    $userRt   = isset($user['rt']) ? str_pad($user['rt'], 2, '0', STR_PAD_LEFT) : '';
    $userRw   = isset($user['rw']) ? str_pad($user['rw'], 2, '0', STR_PAD_LEFT) : '05';

    // ---------------------------------------------------------
    // HAK AKSES & ROLE PERMISSION CHECKS
    // ---------------------------------------------------------
    if ($callerRole === 'Super Admin') {
        // Super Admin memiliki hak akses penuh mengubah SEMUA data pengguna termasuk Role
        $finalRole = $reqRole;
    } elseif ($callerRole === 'Ketua RW') {
        // Ketua RW hanya dapat mengubah data warga di wilayah RW-nya
        if (!empty($userRw) && $targetRw !== $userRw) {
            jsonResponse([
                'success' => false,
                'error' => "Akses ditolak: Ketua RW hanya berwenang mengubah data warga dalam wilayah RW {$userRw}."
            ], 403);
        }
        // TIDAK BISA mengubah Peran (Role) pengguna - Pertahankan peran awal
        $finalRole = $targetUser['role'] ?? 'Warga';
    } elseif ($callerRole === 'Ketua RT') {
        // Ketua RT hanya dapat mengubah data warga di wilayah RT-nya
        if (empty($userRt) || $targetRt !== $userRt) {
            jsonResponse([
                'success' => false,
                'error' => "Akses ditolak: Ketua RT hanya berwenang mengubah data warga dalam wilayah RT {$userRt}."
            ], 403);
        }
        // TIDAK BISA mengubah Peran (Role) pengguna - Pertahankan peran awal
        $finalRole = $targetUser['role'] ?? 'Warga';
    } else {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    // Check duplicate username if username is changing
    if (!empty($reqUsername) && strtolower($reqUsername) !== strtolower($targetUser['username'] ?? '')) {
        foreach ($users as $u) {
            if (strval($u['id'] ?? '') !== strval($id) && strtolower($u['username'] ?? '') === strtolower($reqUsername)) {
                jsonResponse(['success' => false, 'error' => "Username \"{$reqUsername}\" sudah digunakan oleh akun lain."], 409);
            }
        }
    }

    // Update user object
    $updatedUser = $targetUser;
    $updatedUser['username'] = $reqUsername;
    $updatedUser['name']     = $reqName;
    $updatedUser['email']    = $reqEmail;
    $updatedUser['role']     = $finalRole;
    $updatedUser['rt']       = $reqRt;
    $updatedUser['rw']       = $reqRw;
    $updatedUser['nik']      = $reqNik;
    $updatedUser['status']   = $reqStatus;
    $updatedUser['no_hp']    = $reqNoHp;
    $updatedUser['alamat']   = $reqAlamat;
    $updatedUser['updated_at'] = date('c');

    if (!empty($reqPassword)) {
        // Hash password or update
        $updatedUser['password'] = 'h_' . substr(md5($reqPassword), 0, 8) . base64_encode(substr($reqPassword, 0, 3));
    }

    $database['users'][$foundIndex] = $updatedUser;

    // ---------------------------------------------------------
    // SINKRONISASI KE DATA KEPENDUDUKAN (database['warga'])
    // ---------------------------------------------------------
    $oldNik = $targetUser['nik'] ?? '';
    if (!empty($reqNik) || !empty($oldNik)) {
        $wargaList = $database['warga'] ?? [];
        foreach ($wargaList as $wIdx => &$w) {
            if (($w['nik'] ?? '') === $reqNik || ($w['nik'] ?? '') === $oldNik) {
                if (!empty($reqName))   $w['nama'] = $reqName;
                if (!empty($reqNik))    $w['nik'] = $reqNik;
                if (!empty($reqEmail))  $w['email'] = $reqEmail;
                if (!empty($reqNoHp))   $w['no_hp'] = $reqNoHp;
                if (!empty($reqAlamat)) $w['alamat'] = $reqAlamat;
                if (!empty($reqRt))     $w['rt'] = $reqRt;
                if (!empty($reqRw))     $w['rw'] = $reqRw;
                break;
            }
        }
        unset($w);
        $database['warga'] = $wargaList;
    }

    // Save permanently to database.json
    saveDatabase($database);

    // Return response without raw password
    $returnUser = $updatedUser;
    unset($returnUser['password']);

    jsonResponse([
        'success' => true,
        'message' => "Data pengguna @{$updatedUser['username']} ({$updatedUser['name']}) berhasil diperbarui di database.",
        'data' => $returnUser
    ], 200);
}

// -------------------------------------------------------------
// ACTION: POST / CREATE NEW USER
// -------------------------------------------------------------
if ($method === 'POST' && ($action === 'create' || $action === 'add' || empty($action))) {
    if (!$user || !in_array($user['role'] ?? '', ['Super Admin', 'Ketua RW', 'Ketua RT'])) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $reqUsername = trim($input['username'] ?? '');
    $reqName     = trim($input['name'] ?? '');
    $reqEmail    = trim($input['email'] ?? '');
    $reqRole     = trim($input['role'] ?? 'Warga');
    $reqRt       = str_pad(trim($input['rt'] ?? '01'), 2, '0', STR_PAD_LEFT);
    $reqRw       = str_pad(trim($input['rw'] ?? '05'), 2, '0', STR_PAD_LEFT);
    $reqNik      = trim($input['nik'] ?? '');
    $reqStatus   = trim($input['status'] ?? 'Aktif');
    $reqNoHp     = trim($input['no_hp'] ?? '');
    $reqAlamat   = trim($input['alamat'] ?? '');
    $reqPassword = trim($input['password'] ?? 'password123');

    if (empty($reqUsername) || empty($reqName)) {
        jsonResponse(['success' => false, 'error' => 'Username dan nama lengkap wajib diisi.'], 400);
    }

    // Check duplicate username
    foreach ($database['users'] as $u) {
        if (strtolower($u['username'] ?? '') === strtolower($reqUsername)) {
            jsonResponse(['success' => false, 'error' => "Username \"{$reqUsername}\" sudah terdaftar."], 409);
        }
    }

    // Role restrictions for non-superadmin
    $callerRole = $user['role'] ?? '';
    if ($callerRole !== 'Super Admin') {
        $reqRole = 'Warga'; // Only Super Admin can assign administrative roles
        if ($callerRole === 'Ketua RT') {
            $reqRt = str_pad($user['rt'] ?? '01', 2, '0', STR_PAD_LEFT);
        }
    }

    $newId = round(microtime(true) * 1000);
    $newUser = [
        'id' => $newId,
        'username' => $reqUsername,
        'name' => $reqName,
        'email' => !empty($reqEmail) ? $reqEmail : "{$reqUsername}@rwdigital.id",
        'role' => $reqRole,
        'rt' => $reqRt,
        'rw' => $reqRw,
        'nik' => $reqNik,
        'no_hp' => $reqNoHp,
        'alamat' => $reqAlamat,
        'status' => $reqStatus,
        'password' => 'h_' . substr(md5($reqPassword), 0, 8) . base64_encode(substr($reqPassword, 0, 3)),
        'created_at' => date('c')
    ];

    $database['users'][] = $newUser;
    saveDatabase($database);

    unset($newUser['password']);
    jsonResponse([
        'success' => true,
        'message' => 'Akun pengguna baru berhasil ditambahkan ke database.',
        'data' => $newUser
    ], 200);
}

// -------------------------------------------------------------
// ACTION: DELETE USER
// -------------------------------------------------------------
if ($method === 'DELETE' || $action === 'delete') {
    if (!$user || ($user['role'] ?? '') !== 'Super Admin') {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak: Hanya Super Admin yang dapat menghapus akun pengguna.'], 403);
    }

    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'ID pengguna wajib disertakan.'], 400);
    }

    $foundIndex = -1;
    $targetUser = null;
    foreach ($database['users'] as $idx => $u) {
        if (strval($u['id'] ?? '') === strval($id)) {
            $foundIndex = $idx;
            $targetUser = $u;
            break;
        }
    }

    if ($foundIndex === -1) {
        jsonResponse(['success' => false, 'error' => 'Pengguna tidak ditemukan.'], 404);
    }

    array_splice($database['users'], $foundIndex, 1);
    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => "Akun pengguna @{$targetUser['username']} berhasil dihapus dari database."
    ], 200);
}

jsonResponse(['success' => false, 'error' => 'Aksi tidak didukung.'], 400);
