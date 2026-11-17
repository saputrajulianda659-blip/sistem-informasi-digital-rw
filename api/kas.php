<?php
// api/kas.php
// Backend Service for Kas & Iuran Warga Digital RW
// Handles listing, creation, deletion, and recalculation of totals in database.json

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$user = getAuthenticatedUser($input);
$method = $_SERVER['REQUEST_METHOD'];

$action = $input['action'] ?? $_GET['action'] ?? 'list';

// Helper function to recalculate totals and synchronize database
function recalculateKasSummary(&$database) {
    // Check both 'kas' and 'kas_iuran'
    $kasList = $database['kas'] ?? ($database['kas_iuran'] ?? []);
    
    $totalPemasukan = 0;
    $totalPengeluaran = 0;

    foreach ($kasList as $k) {
        $nominal = (float)($k['nominal'] ?? 0);
        $jenis = strtolower(trim($k['jenis'] ?? ($k['tipe'] ?? '')));
        if ($jenis === 'pemasukan' || $jenis === 'masuk') {
            $totalPemasukan += $nominal;
        } elseif ($jenis === 'pengeluaran' || $jenis === 'keluar') {
            $totalPengeluaran += $nominal;
        }
    }

    $totalSaldo = $totalPemasukan - $totalPengeluaran;

    // Set both at root level and keep arrays aligned
    $database['total_pemasukan'] = $totalPemasukan;
    $database['total_pengeluaran'] = $totalPengeluaran;
    $database['total_saldo'] = $totalSaldo;

    // Mirror to kas_iuran for compatibility
    $database['kas'] = $kasList;
    $database['kas_iuran'] = $kasList;

    saveDatabase($database);

    return [
        'total_pemasukan' => $totalPemasukan,
        'total_pengeluaran' => $totalPengeluaran,
        'total_saldo' => $totalSaldo
    ];
}

// Recalculate on every hit so database.json always has up-to-date attributes
$summary = recalculateKasSummary($database);

// -------------------------------------------------------------
// ACTION: LIST KAS / GET SUMMARY
// -------------------------------------------------------------
if ($action === 'list' || $action === 'get_all' || $action === 'summary') {
    $kasList = $database['kas'] ?? [];

    // Filter by RT: Warga & Ketua RT restricted to their own RT; RW/Admin can filter via query param
    $rtFilter = $_GET['rt'] ?? ($input['rt'] ?? null);
    if ($user) {
        $role = $user['role'] ?? 'Warga';
        if (in_array($role, ['Ketua RT', 'Warga']) && !empty($user['rt'])) {
            $rtFilter = $user['rt'];
        }
    }

    if ($rtFilter && $rtFilter !== 'all' && $rtFilter !== 'semua') {
        $scopedRt = str_pad($rtFilter, 2, '0', STR_PAD_LEFT);
        $kasList = array_values(array_filter($kasList, function($k) use ($scopedRt) {
            return str_pad($k['rt'] ?? '01', 2, '0', STR_PAD_LEFT) === $scopedRt;
        }));

        // Scoped summary calculations
        $rtPemasukan = 0;
        $rtPengeluaran = 0;
        foreach ($kasList as $k) {
            $nom = (float)($k['nominal'] ?? 0);
            $j = strtolower(trim($k['jenis'] ?? ($k['tipe'] ?? '')));
            if ($j === 'pemasukan' || $j === 'masuk') {
                $rtPemasukan += $nom;
            } elseif ($j === 'pengeluaran' || $j === 'keluar') {
                $rtPengeluaran += $nom;
            }
        }
        $summary = [
            'total_pemasukan' => $rtPemasukan,
            'total_pengeluaran' => $rtPengeluaran,
            'total_saldo' => $rtPemasukan - $rtPengeluaran
        ];
    }

    // Sort newest first
    usort($kasList, function($a, $b) {
        return strtotime($b['tanggal'] ?? '') - strtotime($a['tanggal'] ?? '');
    });

    jsonResponse([
        'success' => true,
        'total' => count($kasList),
        'total_pemasukan' => $summary['total_pemasukan'],
        'total_pengeluaran' => $summary['total_pengeluaran'],
        'total_saldo' => $summary['total_saldo'],
        'data' => $kasList
    ]);
}

// -------------------------------------------------------------
// ACTION: CREATE KAS (TAMBAH TRANSAKSI KAS)
// -------------------------------------------------------------
if ($action === 'create' || $action === 'add' || ($method === 'POST' && empty($action))) {
    // Role check: Only Pengurus (Super Admin, Ketua RW, Ketua RT) can create
    $allowedRoles = ['Super Admin', 'Ketua RW', 'Ketua RT', 'super_admin', 'ketua_rw', 'ketua_rt'];
    $role = $user['role'] ?? '';
    if (!in_array($role, $allowedRoles)) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak: Hanya pengurus yang dapat menambahkan transaksi kas.'], 403);
    }

    $jenis = trim($input['jenis'] ?? 'Pemasukan');
    $tipe = trim($input['tipe'] ?? 'Iuran');
    $nominal = (float)($input['nominal'] ?? 0);
    $tanggal = !empty($input['tanggal']) ? date('c', strtotime($input['tanggal'])) : date('c');
    $keterangan = trim($input['keterangan'] ?? '');
    $rt = isset($input['rt']) && !empty($input['rt']) ? str_pad($input['rt'], 2, '0', STR_PAD_LEFT) : str_pad($user['rt'] ?? '01', 2, '0', STR_PAD_LEFT);
    $rw = str_pad($input['rw'] ?? $user['rw'] ?? '05', 2, '0', STR_PAD_LEFT);

    if ($nominal <= 0) {
        jsonResponse(['success' => false, 'error' => 'Nominal transaksi harus lebih besar dari 0.'], 400);
    }

    $newId = 'KAS-' . round(microtime(true) * 1000);
    $newKas = [
        'id' => $newId,
        'jenis' => ucfirst(strtolower($jenis)) === 'Pengeluaran' ? 'Pengeluaran' : 'Pemasukan',
        'tipe' => $tipe,
        'nominal' => $nominal,
        'tanggal' => $tanggal,
        'keterangan' => $keterangan,
        'nik_warga' => $input['nik_warga'] ?? '',
        'rt' => $rt,
        'rw' => $rw
    ];

    if (!isset($database['kas']) || !is_array($database['kas'])) {
        $database['kas'] = [];
    }
    array_unshift($database['kas'], $newKas);

    // Re-calculate totals and persist to database.json
    $summary = recalculateKasSummary($database);

    jsonResponse([
        'success' => true,
        'message' => 'Transaksi kas berhasil disimpan.',
        'data' => $newKas,
        'summary' => $summary
    ]);
}

// -------------------------------------------------------------
// ACTION: DELETE KAS
// -------------------------------------------------------------
if ($action === 'delete') {
    $allowedRoles = ['Super Admin', 'Ketua RW', 'Ketua RT', 'super_admin', 'ketua_rw', 'ketua_rt'];
    $role = $user['role'] ?? '';
    if (!in_array($role, $allowedRoles)) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak: Hanya pengurus yang dapat menghapus transaksi kas.'], 403);
    }

    $id = trim($input['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonResponse(['success' => false, 'error' => 'ID transaksi kas wajib diisi.'], 400);
    }

    $kasList = $database['kas'] ?? [];
    $filtered = array_values(array_filter($kasList, function($k) use ($id) {
        return ($k['id'] ?? '') !== $id;
    }));

    $database['kas'] = $filtered;
    $summary = recalculateKasSummary($database);

    jsonResponse([
        'success' => true,
        'message' => 'Transaksi kas berhasil dihapus.',
        'summary' => $summary
    ]);
}

jsonResponse(['success' => false, 'error' => 'Aksi tidak dikenali.'], 400);
