<?php
// api/stats.php
// Centralized statistics calculator for Digital RW

require_once __DIR__ . '/db_helper.php';
setCorsHeaders();

$database = loadDatabase();
$input = getJsonInput();
$user = getAuthenticatedUser($input);

$wargaList = $database['warga'] ?? [];
$usersList = $database['users'] ?? [];
$pelayananList = $database['pelayanan'] ?? [];
$pengaduanList = $database['pengaduan'] ?? [];
$kasList = $database['kas'] ?? [];
$wilayahList = $database['wilayah'] ?? [];

// Calculate true citizen statistics
$currentYear = (int)date('Y');
$totalWarga = count($wargaList);

$byRT = [];
$byGender = ['L' => 0, 'P' => 0];
$byStatus = ['Tetap' => 0, 'Kontrak/Kos' => 0, 'Pindah' => 0];
$byAge = ['anak' => 0, 'remaja' => 0, 'dewasa' => 0, 'lansia' => 0, 'belum_terdata' => 0];
$kkSet = [];

foreach ($wargaList as $w) {
    // RT distribution
    $rt = isset($w['rt']) && !empty($w['rt']) ? str_pad($w['rt'], 2, '0', STR_PAD_LEFT) : 'Lainnya';
    $byRT[$rt] = ($byRT[$rt] ?? 0) + 1;

    // Gender
    $jk = strtoupper($w['jenis_kelamin'] ?? '');
    if ($jk === 'L') $byGender['L']++;
    elseif ($jk === 'P') $byGender['P']++;

    // Status
    $st = $w['status'] ?? 'Tetap';
    if (stripos($st, 'kontrak') !== false || stripos($st, 'kos') !== false) {
        $byStatus['Kontrak/Kos']++;
    } elseif (stripos($st, 'pindah') !== false) {
        $byStatus['Pindah']++;
    } else {
        $byStatus['Tetap']++;
    }

    // Age calculation
    if (!empty($w['tanggal_lahir'])) {
        $birthYear = (int)substr($w['tanggal_lahir'], 0, 4);
        if ($birthYear > 1900 && $birthYear <= $currentYear) {
            $age = $currentYear - $birthYear;
            if ($age <= 12) $byAge['anak']++;
            elseif ($age <= 18) $byAge['remaja']++;
            elseif ($age <= 59) $byAge['dewasa']++;
            else $byAge['lansia']++;
        } else {
            $byAge['belum_terdata']++;
        }
    } else {
        $byAge['belum_terdata']++;
    }

    // Unique KK
    if (!empty($w['no_kk'])) {
        $kkSet[$w['no_kk']] = true;
    }
}
ksort($byRT);

// Pelayanan summary
$pelayananTotal = count($pelayananList);
$pelayananPendingRT = 0;
$pelayananPendingRW = 0;
$pelayananSelesai = 0;
foreach ($pelayananList as $p) {
    $st = $p['status'] ?? '';
    if (stripos($st, 'menunggu verifikasi rt') !== false) $pelayananPendingRT++;
    elseif (stripos($st, 'menunggu persetujuan rw') !== false || stripos($st, 'disetujui rt') !== false) $pelayananPendingRW++;
    elseif (stripos($st, 'selesai') !== false) $pelayananSelesai++;
}

// Pengaduan summary
$pengaduanTotal = count($pengaduanList);
$pengaduanBaru = 0;
$pengaduanDiproses = 0;
$pengaduanSelesai = 0;
foreach ($pengaduanList as $ad) {
    $st = $ad['status'] ?? '';
    if ($st === 'Baru') $pengaduanBaru++;
    elseif (in_array($st, ['Diproses', 'Ditindaklanjuti'])) $pengaduanDiproses++;
    elseif ($st === 'Selesai') $pengaduanSelesai++;
}

// Kas summary
$kasPemasukan = 0;
$kasPengeluaran = 0;
foreach ($kasList as $k) {
    $nom = (int)($k['nominal'] ?? 0);
    if (($k['jenis'] ?? '') === 'Pemasukan') {
        $kasPemasukan += $nom;
    } else {
        $kasPengeluaran += $nom;
    }
}
$kasSaldo = $kasPemasukan - $kasPengeluaran;

jsonResponse([
    'success' => true,
    'totalWarga' => $totalWarga,
    'byRT' => $byRT,
    'byGender' => $byGender,
    'byStatus' => $byStatus,
    'byAge' => $byAge,
    'uniqueKK' => count($kkSet),
    'pelayanan' => [
        'total' => $pelayananTotal,
        'pending_rt' => $pelayananPendingRT,
        'pending_rw' => $pelayananPendingRW,
        'selesai' => $pelayananSelesai
    ],
    'pengaduan' => [
        'total' => $pengaduanTotal,
        'baru' => $pengaduanBaru,
        'diproses' => $pengaduanDiproses,
        'selesai' => $pengaduanSelesai
    ],
    'kas' => [
        'pemasukan' => $kasPemasukan,
        'pengeluaran' => $kasPengeluaran,
        'saldo' => $kasSaldo
    ]
]);
