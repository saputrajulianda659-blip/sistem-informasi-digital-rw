<?php
// api/sync.php - Realtime Two-Way Synchronization Endpoint
require_once __DIR__ . '/db_helper.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Role, X-User-Id, X-User-RT, X-User-NIK, *");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$database = loadDatabase();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure kas calculations and totals are always synchronized in database
$kasList = $database['kas'] ?? ($database['kas_iuran'] ?? []);
$totalPemasukan = 0;
$totalPengeluaran = 0;
foreach ($kasList as $k) {
    $nom = (float)($k['nominal'] ?? 0);
    $jenis = strtolower(trim($k['jenis'] ?? ($k['tipe'] ?? '')));
    if ($jenis === 'pemasukan' || $jenis === 'masuk') $totalPemasukan += $nom;
    elseif ($jenis === 'pengeluaran' || $jenis === 'keluar') $totalPengeluaran += $nom;
}
$database['total_pemasukan'] = $totalPemasukan;
$database['total_pengeluaran'] = $totalPengeluaran;
$database['total_saldo'] = $totalPemasukan - $totalPengeluaran;
$database['kas'] = $kasList;
$database['kas_iuran'] = $kasList;
saveDatabase($database);

if ($method === 'GET') {
    $warga = $database['warga'] ?? [];
    $byRT = [];
    foreach ($warga as $w) {
        $rt = $w['rt'] ?? '01';
        $byRT[$rt] = ($byRT[$rt] ?? 0) + 1;
    }

    jsonResponse([
        'success' => true,
        'timestamp' => time(),
        'totalWarga' => count($warga),
        'byRT' => $byRT,
        'database' => $database,
        'data' => $database
    ]);
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $user = getAuthenticatedUser($input);

    // If client pushes updates with authorized role
    if ($user && in_array($user['role'] ?? '', ['Super Admin', 'Ketua RW', 'Ketua RT'])) {
        if (!empty($input['database']) && is_array($input['database'])) {
            $database = array_merge($database, $input['database']);
            saveDatabase($database);
            jsonResponse([
                'success' => true,
                'message' => 'Database berhasil disinkronkan.',
                'database' => $database
            ]);
        }
    }

    jsonResponse([
        'success' => true,
        'database' => $database
    ]);
}
