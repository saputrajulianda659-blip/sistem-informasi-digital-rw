<?php
// api/pengumuman.php
// Backend Service for Pengumuman Digital RW
// Supports territorial query fetching, create, update, and permanent DELETE / DESTROY

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$user = getAuthenticatedUser($input);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $input['action'] ?? $_GET['action'] ?? '';

// Extract ID from query param, input payload, PATH_INFO, or REQUEST_URI
$id = trim($_GET['id'] ?? ($input['id'] ?? ''));
if (empty($id) && !empty($_SERVER['PATH_INFO'])) {
    $id = trim($_SERVER['PATH_INFO'], '/');
}
if (empty($id) && !empty($_SERVER['REQUEST_URI'])) {
    $cleanUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#pengumuman(?:\.php)?/([^/]+)#i', $cleanUri, $m)) {
        $id = urldecode($m[1]);
    }
}

// -------------------------------------------------------------
// ACTION: DELETE / DESTROY PENGUMUMAN (Permanently from Database)
// -------------------------------------------------------------
if ($method === 'DELETE' || $action === 'delete' || $action === 'destroy') {
    // Role check: Only Super Admin, Ketua RW, and Admin RW are authorized
    if (!$user || !in_array($user['role'] ?? '', ['Super Admin', 'Ketua RW', 'Admin RW'])) {
        jsonResponse([
            'success' => false,
            'error' => 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus pengumuman.'
        ], 403);
    }

    if (empty($id)) {
        jsonResponse([
            'success' => false,
            'error' => 'ID pengumuman wajib disertakan untuk penghapusan.'
        ], 400);
    }

    $pengumumanList = $database['pengumuman'] ?? [];
    $foundIndex = -1;
    $targetPengumuman = null;

    foreach ($pengumumanList as $idx => $p) {
        if (($p['id'] ?? '') === $id) {
            $foundIndex = $idx;
            $targetPengumuman = $p;
            break;
        }
    }

    if ($foundIndex === -1) {
        jsonResponse([
            'success' => false,
            'error' => "Pengumuman dengan ID {$id} tidak ditemukan di database."
        ], 404);
    }

    // Permanently destroy / remove from database collection
    array_splice($pengumumanList, $foundIndex, 1);
    $database['pengumuman'] = array_values($pengumumanList);

    // Clean up linked in-app notifications if any exist
    if (isset($database['notifikasi']) && is_array($database['notifikasi'])) {
        $database['notifikasi'] = array_values(array_filter($database['notifikasi'], function($notif) use ($id, $targetPengumuman) {
            if (isset($notif['eventId']) && strpos($notif['eventId'], $id) !== false) {
                return false;
            }
            if (isset($notif['link']) && $notif['link'] === '#/pengumuman') {
                if (isset($targetPengumuman['judul']) && isset($notif['judul']) && strpos($notif['judul'], $targetPengumuman['judul']) !== false) {
                    return false;
                }
            }
            return true;
        }));
    }

    // Permanently persist to database.json
    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => "Pengumuman \"{$targetPengumuman['judul']}\" berhasil dihapus secara permanen dari database.",
        'deletedId' => $id,
        'remainingTotal' => count($database['pengumuman']),
        'data' => $database['pengumuman']
    ], 200);
}

// -------------------------------------------------------------
// ACTION: LIST / GET PENGUMUMAN (With Warga territorial query)
// -------------------------------------------------------------
if ($action === 'list' || $action === 'get' || ($method === 'GET' && empty($action) && empty($id))) {
    $pengumumanList = $database['pengumuman'] ?? [];

    // Sort newest first
    usort($pengumumanList, function($a, $b) {
        return strtotime($b['tanggal_dibuat'] ?? 0) - strtotime($a['tanggal_dibuat'] ?? 0);
    });

    $onlyPublished = isset($_GET['published']) ? ($_GET['published'] !== 'false') : true;
    if ($onlyPublished) {
        $pengumumanList = array_values(array_filter($pengumumanList, function($p) {
            return ($p['status_publikasi'] ?? '') === 'Published';
        }));
    }

    // Role-based territorial filtering for Warga
    if ($user && ($user['role'] ?? '') === 'Warga') {
        $userRt = isset($user['rt']) ? str_pad($user['rt'], 2, '0', STR_PAD_LEFT) : '';
        $userRw = isset($user['rw']) ? str_pad($user['rw'], 2, '0', STR_PAD_LEFT) : '05';

        $pengumumanList = array_values(array_filter($pengumumanList, function($p) use ($userRt, $userRw) {
            $targetRole = $p['target_role'] ?? 'all';
            $targetRt = $p['target_rt'] ?? '';
            $targetRw = $p['target_rw'] ?? '';

            // Public / General Announcement
            $isPublicRole = empty($targetRole) || $targetRole === 'all' || $targetRole === 'warga';
            $isPublicWilayah = (empty($targetRt) || $targetRt === 'all') && (empty($targetRw) || $targetRw === 'all' || $targetRw === '05');

            if ($isPublicRole && $isPublicWilayah) {
                return true;
            }

            // Target RW match
            if (!empty($targetRw) && $targetRw !== 'all') {
                if (str_pad($targetRw, 2, '0', STR_PAD_LEFT) !== $userRw) {
                    return false;
                }
            }

            // Target RT match
            if (!empty($targetRt) && $targetRt !== 'all') {
                if (str_pad($targetRt, 2, '0', STR_PAD_LEFT) === $userRt) {
                    return true;
                }
                return false;
            }

            return true;
        }));
    }

    jsonResponse([
        'success' => true,
        'total' => count($pengumumanList),
        'data' => $pengumumanList
    ]);
}

// -------------------------------------------------------------
// ACTION: SINGLE GET BY ID
// -------------------------------------------------------------
if ($method === 'GET' && !empty($id)) {
    $pengumumanList = $database['pengumuman'] ?? [];
    foreach ($pengumumanList as $p) {
        if (($p['id'] ?? '') === $id) {
            jsonResponse(['success' => true, 'data' => $p]);
        }
    }
    jsonResponse(['success' => false, 'error' => 'Pengumuman tidak ditemukan.'], 404);
}

// -------------------------------------------------------------
// ACTION: CREATE / STORE PENGUMUMAN (With Bulk In-App Notification)
// -------------------------------------------------------------
if ($action === 'create' || $action === 'store' || ($method === 'POST' && empty($action))) {
    if (!$user || !in_array($user['role'] ?? '', ['Super Admin', 'Ketua RW', 'Admin RW'])) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak: Hanya Pengurus yang dapat membuat pengumuman.'], 403);
    }

    $judul = trim($input['judul'] ?? '');
    $isi = trim($input['isi'] ?? '');
    $kategori = trim($input['kategori'] ?? 'Informasi');
    $statusPub = trim($input['status_publikasi'] ?? 'Published');
    $targetRt = trim($input['target_rt'] ?? '');
    $targetRw = trim($input['target_rw'] ?? '');
    $targetRole = trim($input['target_role'] ?? 'all');
    $lampiran = trim($input['lampiran'] ?? '');

    if (empty($judul) || empty($isi)) {
        jsonResponse(['success' => false, 'error' => 'Judul dan isi pengumuman wajib diisi.'], 400);
    }

    $newId = 'INFO-' . round(microtime(true) * 1000);
    $newPengumuman = [
        'id' => $newId,
        'judul' => $judul,
        'isi' => $isi,
        'tanggal_dibuat' => date('c'),
        'penulis' => $user['name'] ?? 'Pengurus RW 05',
        'kategori' => $kategori,
        'target_rt' => $targetRt,
        'target_rw' => $targetRw,
        'target_role' => $targetRole,
        'status_publikasi' => $statusPub,
        'lampiran' => $lampiran
    ];

    if (!isset($database['pengumuman'])) $database['pengumuman'] = [];
    array_unshift($database['pengumuman'], $newPengumuman);

    // Bulk insert in-app notification records for each targeted citizen (Warga)
    if ($statusPub === 'Published') {
        if (!isset($database['notifikasi'])) $database['notifikasi'] = [];
        $wargaList = $database['warga'] ?? [];
        $usersList = $database['users'] ?? [];

        $userMapByNik = [];
        foreach ($usersList as $u) {
            if (!empty($u['nik'])) $userMapByNik[$u['nik']] = $u;
        }

        $notifCount = 0;
        foreach ($wargaList as $w) {
            $wRt = str_pad($w['rt'] ?? '', 2, '0', STR_PAD_LEFT);
            $wNik = $w['nik'] ?? '';

            // Check RT target criteria
            if (empty($targetRt) || $targetRt === 'all' || str_pad($targetRt, 2, '0', STR_PAD_LEFT) === $wRt) {
                $linkedUser = $userMapByNik[$wNik] ?? null;
                $targetUserId = $linkedUser['id'] ?? $wNik;

                $database['notifikasi'][] = [
                    'id' => 'NOTIF-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999) . '-' . $notifCount,
                    'userId' => $targetUserId,
                    'nik' => $wNik,
                    'judul' => "Pengumuman Baru: {$judul}",
                    'pesan' => $isi,
                    'kategori' => 'Pengumuman',
                    'type' => 'info',
                    'link' => '#/pengumuman',
                    'priority' => ($kategori === 'Darurat') ? 'high' : 'normal',
                    'is_read' => false,
                    'tanggal' => date('c')
                ];
                $notifCount++;
            }
        }
    }

    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => 'Pengumuman berhasil diterbitkan dan notifikasi telah disebarkan.',
        'data' => $newPengumuman,
        'notifications_created' => $notifCount ?? 0
    ], 200);
}

// -------------------------------------------------------------
// ACTION: UPDATE PENGUMUMAN
// -------------------------------------------------------------
if ($action === 'update' || $method === 'PUT') {
    if (!$user || !in_array($user['role'] ?? '', ['Super Admin', 'Ketua RW', 'Admin RW'])) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $pengumumanList = $database['pengumuman'] ?? [];
    $foundIndex = -1;
    foreach ($pengumumanList as $idx => $p) {
        if (($p['id'] ?? '') === $id) {
            $foundIndex = $idx;
            break;
        }
    }

    if ($foundIndex === -1) {
        jsonResponse(['success' => false, 'error' => 'Pengumuman tidak ditemukan.'], 404);
    }

    $pengumumanList[$foundIndex] = array_merge($pengumumanList[$foundIndex], [
        'judul' => trim($input['judul'] ?? $pengumumanList[$foundIndex]['judul']),
        'isi' => trim($input['isi'] ?? $pengumumanList[$foundIndex]['isi']),
        'kategori' => trim($input['kategori'] ?? $pengumumanList[$foundIndex]['kategori']),
        'status_publikasi' => trim($input['status_publikasi'] ?? $pengumumanList[$foundIndex]['status_publikasi']),
        'target_rt' => trim($input['target_rt'] ?? ($pengumumanList[$foundIndex]['target_rt'] ?? '')),
        'target_rw' => trim($input['target_rw'] ?? ($pengumumanList[$foundIndex]['target_rw'] ?? '05')),
        'target_role' => trim($input['target_role'] ?? ($pengumumanList[$foundIndex]['target_role'] ?? 'all')),
        'lampiran' => trim($input['lampiran'] ?? ($pengumumanList[$foundIndex]['lampiran'] ?? ''))
    ]);

    $database['pengumuman'] = $pengumumanList;
    saveDatabase($database);

    jsonResponse([
        'success' => true,
        'message' => 'Pengumuman berhasil diperbarui.',
        'data' => $pengumumanList[$foundIndex]
    ], 200);
}

jsonResponse(['success' => false, 'error' => 'Aksi pengumuman tidak valid.'], 400);
