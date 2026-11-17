// js/pages/Dashboard.js
import { getCurrentUser, ROLES, getAllUsers } from '../models/User.js';
import { getAllPengumuman, createPengumumanDarurat } from '../models/Pengumuman.js';
import { getAllWarga, getWargaStatistics } from '../models/Warga.js';
import { getAllPelayanan, fetchPelayananFromBackend, isMenungguRW, isMenungguRT, STATUS_PELAYANAN } from '../models/Pelayanan.js';
import { getAllPengaduan, getPengaduanByNik, STATUS_PENGADUAN } from '../models/Pengaduan.js';
import { isAIEnabled } from '../models/AIConfig.js';
import { getAllKas, getKasSummary } from '../models/Kas.js';
import { getAllWilayah } from '../models/Wilayah.js';
import { getCollection } from '../utils/db.js';
import { renderStatusBadge } from '../utils/badge.js';

// Helper function to render global modern pill status badge
function getStatusBadge(status) {
    return renderStatusBadge(status);
}

// Helper function to extract and format Google Maps links into clean DashStack action buttons
function formatTextAndMaps(text, lampiranUrl) {
    let rawText = text || '';
    let mapsLink = lampiranUrl && lampiranUrl.includes('google.com/maps') ? lampiranUrl : null;

    // Check if text itself contains a google maps url
    const mapsRegex = /(https?:\/\/(?:www\.)?(?:google\.com\/maps[^\s]+|maps\.app\.goo\.gl[^\s]+|maps\.google\.com[^\s]+))/i;
    const match = rawText.match(mapsRegex);
    if (match) {
        if (!mapsLink) mapsLink = match[0];
        rawText = rawText.replace(match[0], '').trim();
    }

    rawText = rawText.replace(/Lokasi:\s*$/i, '').trim();

    let mapsButton = '';
    if (mapsLink) {
        mapsButton = `
            <div style="margin-top: 10px;">
                <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background-color: var(--primary-light); color: var(--primary-color); border: 1px solid rgba(72, 128, 255, 0.25); font-weight: 700; padding: 5px 12px; border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
                    <i class="ph-bold ph-map-pin"></i> Buka Peta GPS
                </a>
            </div>
        `;
    }

    return { cleanedText: rawText, mapsButton };
}

// Single-pass Fast In-Memory Aggregator (0ms, 1x JSON parse, tanpa iterasi/initDB berulang)
function getDashboardData(user) {
    let db = {};
    try {
        const raw = localStorage.getItem('rwdigital_db_v3');
        db = raw ? JSON.parse(raw) : {};
    } catch (e) {
        db = {};
    }

    const warga = Array.isArray(db.warga) ? db.warga : (getCollection('warga') || []);
    const users = Array.isArray(db.users) ? db.users : (getCollection('users') || []);
    const rawPelayanan = Array.isArray(db.pelayanan) ? db.pelayanan : (getCollection('pelayanan') || []);
    const pelayanan = rawPelayanan.filter(p => p && p.id !== 'SRT-20260902-1002');
    const pengaduan = Array.isArray(db.pengaduan) ? db.pengaduan : (getCollection('pengaduan') || []);
    const kas = Array.isArray(db.kas) ? db.kas : (Array.isArray(db.kas_iuran) ? db.kas_iuran : (getCollection('kas') || []));
    const wilayah = Array.isArray(db.wilayah) ? db.wilayah : (getCollection('wilayah') || []);
    const rawPengumuman = Array.isArray(db.pengumuman) ? db.pengumuman : (getCollection('pengumuman') || []);

    const normRT = (val) => String(val || '').replace(/^0+/, '');
    const userRt = normRT(user?.rt || '01');

    // 1. Agregasi Warga dalam 1 kali loop
    const byRT = {};
    let totalWargaRT = 0;
    const rtWargaNikSet = new Set();
    const wargaMap = new Map();
    warga.forEach(w => {
        if (w && w.nik) wargaMap.set(String(w.nik).trim(), w);
        const r = w.rt ? String(w.rt).padStart(2, '0') : 'Lainnya';
        byRT[r] = (byRT[r] || 0) + 1;
        if (!user?.rt || normRT(w.rt) === userRt) {
            totalWargaRT++;
            if (w.nik) rtWargaNikSet.add(String(w.nik).trim());
        }
    });

    const uniqueRTs = wilayah.length || Object.keys(byRT).filter(r => r !== 'Lainnya').length || 2;

    // 2. Agregasi Kas dalam 1 kali loop
    let totalPemasukanRW = 0;
    let totalPengeluaranRW = 0;
    let totalPemasukanRT = 0;
    let totalPengeluaranRT = 0;

    kas.forEach(k => {
        const nom = Number(k.nominal) || 0;
        const j = String(k.jenis || k.tipe || '').toLowerCase();
        const isMasuk = j === 'pemasukan' || j === 'masuk';
        const isKeluar = j === 'pengeluaran' || j === 'keluar';

        if (isMasuk) totalPemasukanRW += nom;
        else if (isKeluar) totalPengeluaranRW += nom;

        const kRt = normRT(k.rt);
        if (kRt === userRt) {
            if (isMasuk) totalPemasukanRT += nom;
            else if (isKeluar) totalPengeluaranRT += nom;
        }
    });

    const totalSaldoRW = totalPemasukanRW - totalPengeluaranRW;
    const totalSaldoRT = totalPemasukanRT - totalPengeluaranRT;

    // 3. Agregasi Pelayanan dalam 1 kali loop (Sinkron dengan logic StatusPengajuan, VerifikasiPengajuan, & PersetujuanPelayanan)
    let pendingRWCount = 0;
    let pendingRTCount = 0;
    let totalPelayananRTCount = 0;
    const pelayananSaya = [];
    const userNik = String(user?.nik || '').trim();
    const userNikClean = normRT(userNik);

    pelayanan.forEach(p => {
        if (!p) return;
        const pNik = String(p.nik_pemohon || p.nik || '').trim();
        const pemohon = pNik ? wargaMap.get(pNik) : null;
        const resolvedRt = p.rt || (pemohon ? pemohon.rt : '');
        const pRt = normRT(resolvedRt);

        // Filter Ketua RW: berkas yang menunggu tindakan persetujuan RW
        if (isMenungguRW(p.status)) {
            pendingRWCount++;
        }

        // Filter Ketua RT: berkas wilayah RT bersangkutan
        if (pRt === userRt) {
            totalPelayananRTCount++;
            if (isMenungguRT(p.status)) {
                pendingRTCount++;
            }
        }

        // Filter Warga: berkas milik user warga login
        const pNikClean = normRT(pNik);
        if (userNik && (pNik === userNik || (userNikClean !== '' && pNikClean === userNikClean))) {
            pelayananSaya.push(p);
        }
    });

    pelayananSaya.sort((a, b) => new Date(b.tanggal_pengajuan || b.createdAt || 0) - new Date(a.tanggal_pengajuan || a.createdAt || 0));

    // 4. Agregasi Pengaduan dalam 1 kali loop
    let pengaduanRTCount = 0;
    const pengaduanSaya = [];

    pengaduan.forEach(p => {
        const pNik = String(p.nik_pelapor || '').trim();
        if (rtWargaNikSet.has(pNik)) {
            pengaduanRTCount++;
        }
        if (userNik && pNik === userNik) {
            pengaduanSaya.push(p);
        }
    });

    pengaduanSaya.sort((a, b) => new Date(b.tanggal_pengaduan || b.createdAt || 0) - new Date(a.tanggal_pengaduan || a.createdAt || 0));

    const pengajuanAktif = pelayananSaya.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return !s.includes('selesai') && !s.includes('ditolak');
    }).length;

    const pengaduanAktif = pengaduanSaya.filter(p =>
        p.status !== STATUS_PENGADUAN.SELESAI &&
        p.status !== STATUS_PENGADUAN.DITOLAK &&
        p.status !== 'Selesai' &&
        p.status !== 'Ditolak'
    ).length;

    const aiConfig = db.ai_config || {};
    const aiActive = aiConfig.enabled !== false && aiConfig.status !== 'inactive';

    const publishedPengumuman = rawPengumuman.filter(p => p.status_publikasi === 'Published' || !p.status_publikasi);

    return {
        totalWarga: warga.length,
        byRT,
        uniqueRTs,
        totalWargaRT,
        totalUsers: users.length,
        totalPelayanan: pelayanan.length,
        totalPengaduan: pengaduan.length,
        saKas: {
            totalPemasukan: totalPemasukanRW,
            totalPengeluaran: totalPengeluaranRW,
            totalSaldo: totalSaldoRW
        },
        rwKas: {
            totalPemasukan: totalPemasukanRW,
            totalPengeluaran: totalPengeluaranRW,
            totalSaldo: totalSaldoRW
        },
        rtKas: {
            totalPemasukan: totalPemasukanRT,
            totalPengeluaran: totalPengeluaranRT,
            totalSaldo: totalSaldoRT
        },
        pendingRWCount,
        pendingRTCount,
        totalPelayananRTCount,
        pengaduanRTCount,
        pelayananSaya,
        pengaduanSaya,
        pengajuanAktif,
        pengaduanAktif,
        aiActive,
        pengumuman: publishedPengumuman
    };
}

function renderLatestPengumumanWidget(showCreateButton = null, cachedPengumuman = null) {
    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    const canManage = [ROLES.SUPER_ADMIN, ROLES.ADMIN_RW, ROLES.KETUA_RW].includes(user?.role);
    const shouldShowCreate = showCreateButton !== null ? showCreateButton : canManage;

    const rawPengumuman = cachedPengumuman || getAllPengumuman(true) || getCollection('pengumuman') || [];
    const listPengumuman = Array.isArray(rawPengumuman) ? [...rawPengumuman] : [];

    // Urutkan daftar pengumuman secara descending berdasarkan waktu pembuatan terbaru (createdAt / tanggal_dibuat / tanggal / id)
    const sortedPengumuman = listPengumuman.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.tanggal_dibuat || a.tanggal || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.tanggal_dibuat || b.tanggal || b.created_at || 0).getTime();
        if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
            return timeB - timeA; // Paling baru di paling atas
        }
        return String(b.id || '').localeCompare(String(a.id || ''));
    });

    const createBtnHtml = shouldShowCreate ? `
        <a href="#/pengumuman/form" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; text-decoration: none;">
            <i class="ph-bold ph-plus"></i> Buat Pengumuman
        </a>
    ` : '';

    if (sortedPengumuman.length === 0) {
        return `
            <div class="card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="ph-bold ph-megaphone"></i>
                        </div>
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0;">Pengumuman & Informasi Terbaru</h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${createBtnHtml}
                        <a href="#/pengumuman" style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-color); text-decoration: none;">Lihat Semua &rarr;</a>
                    </div>
                </div>
                <div class="dashboard-pengumuman-empty" style="padding: 2.5rem 1rem; text-align: center; background: #F8F9FD; border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
                    <i class="ph-bold ph-megaphone" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: inline-block;"></i>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Belum ada pengumuman yang diterbitkan.</p>
                </div>
            </div>
        `;
    }

    const latest = sortedPengumuman.slice(0, 3);

    let html = `
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="ph-bold ph-megaphone"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.2;">Pengumuman Terbaru</h3>
                        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">Pemberitahuan resmi dan agenda lingkungan warga</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${createBtnHtml}
                    <a href="#/pengumuman" style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-color); text-decoration: none;">Lihat Semua &rarr;</a>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
    `;

    latest.forEach(p => {
        const kategoriStr = (p.kategori || '').toLowerCase();
        const isDarurat = kategoriStr.includes('darurat');
        const isKegiatan = kategoriStr.includes('kegiatan') || kategoriStr.includes('kerja bakti');

        let borderColor = 'var(--border-light)';
        let bgColor = 'var(--surface-color, #ffffff)';
        let categoryBadge = '';

        if (isDarurat) {
            borderColor = 'rgba(239, 56, 38, 0.3)';
            bgColor = 'var(--danger-light)';
            categoryBadge = '<span class="badge-pastel-red"><i class="ph-bold ph-warning"></i> DARURAT</span>';
        } else if (isKegiatan) {
            borderColor = 'rgba(72, 128, 255, 0.2)';
            bgColor = 'var(--surface-color, #ffffff)';
            const badgeLabel = (p.kategori || 'KEGIATAN').toUpperCase();
            categoryBadge = `<span class="badge-pastel-blue"><i class="ph-bold ph-calendar-check"></i> ${badgeLabel}</span>`;
        } else {
            borderColor = 'var(--border-light)';
            bgColor = 'var(--surface-color, #ffffff)';
            const badgeLabel = (p.kategori || 'INFORMASI').toUpperCase();
            categoryBadge = `<span class="badge-purple"><i class="ph-bold ph-info"></i> ${badgeLabel}</span>`;
        }

        const { cleanedText, mapsButton } = formatTextAndMaps(p.isi, p.lampiran);
        const shortText = cleanedText.length > 150 ? cleanedText.substring(0, 150) + '...' : cleanedText;
        const tanggalVal = p.tanggal_dibuat || p.createdAt || p.tanggal || p.created_at;
        const displayDate = tanggalVal ? new Date(tanggalVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru';

        html += `
            <div class="dashboard-pengumuman-card ${isDarurat ? 'pengumuman-darurat-card' : ''}" style="padding: 1.25rem; border: 1px solid ${borderColor}; background-color: ${bgColor}; border-radius: var(--radius-lg); position: relative; transition: all var(--transition-fast);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 6px;">
                    ${categoryBadge}
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="ph-bold ph-calendar align-middle"></i> ${displayDate}</span>
                </div>
                <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">${p.judul}</h4>
                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-line; margin: 0;">${shortText}</p>
                ${mapsButton}
                <div style="margin-top: 10px; border-top: 1px solid var(--border-light); padding-top: 8px;">
                    <a href="#/pengumuman" style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-color); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        Baca pengumuman lengkap &rarr;
                    </a>
                </div>
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

// 1. SUPER ADMIN DASHBOARD
function renderSuperAdminDashboard(data) {
    const stats = { totalWarga: data?.totalWarga || 0, byRT: data?.byRT || {} };
    const uniqueRTs = data?.uniqueRTs || 2;
    const totalUsers = data?.totalUsers || 0;
    const totalPelayanan = data?.totalPelayanan || 0;
    const totalPengaduan = data?.totalPengaduan || 0;
    const aiActive = data?.aiActive || false;
    const saKas = data?.saKas || { totalPemasukan: 0, totalPengeluaran: 0, totalSaldo: 0 };

    return `
        <!-- Page Header -->
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard Super Admin</h1>
                <p class="page-subtitle">Ringkasan status ekosistem, data kependudukan, administrasi sistem, dan AI</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <a href="#/manajemen-ai" class="btn btn-outline" style="font-weight: 700;">
                    <i class="ph-bold ph-robot"></i> Kelola AI
                </a>
                <a href="#/manajemen-pengguna" class="btn btn-primary">
                    <i class="ph-bold ph-user-plus"></i> Manajemen Pengguna
                </a>
            </div>
        </div>

        <!-- 4-Card DashStack KPI Row -->
        <div class="stats-grid mb-6">
            <div class="card stat-card">
                <div class="stat-info">
                    <p>Cakupan Wilayah</p>
                    <h3>1 RW / ${uniqueRTs} RT</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-blue"><i class="ph-bold ph-map-pin"></i> Wilayah Aktif</span>
                    </div>
                </div>
                <div class="stat-icon purple">
                    <i class="ph-bold ph-buildings"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Total Warga Terdaftar</p>
                    <h3>${stats.totalWarga}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-green"><i class="ph-bold ph-check"></i> Terverifikasi</span>
                    </div>
                </div>
                <div class="stat-icon success">
                    <i class="ph-bold ph-users"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Total Akun Pengguna</p>
                    <h3>${totalUsers}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-blue"><i class="ph-bold ph-shield-check"></i> Hak Akses Aktif</span>
                    </div>
                </div>
                <div class="stat-icon primary">
                    <i class="ph-bold ph-users-three"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Status Asisten AI</p>
                    <h3 style="color: ${aiActive ? 'var(--success-color)' : 'var(--danger-color)'};">
                        ${aiActive ? 'AKTIF' : 'NONAKTIF'}
                    </h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status ${aiActive ? 'stat-status-green' : 'stat-status-red'}">
                            <i class="ph-bold ${aiActive ? 'ph-power' : 'ph-prohibit'}"></i> ${aiActive ? 'ON' : 'OFF'}
                        </span>
                    </div>
                </div>
                <div class="stat-icon warning">
                    <i class="ph-bold ph-robot"></i>
                </div>
            </div>
        </div>
        
        <!-- Secondary Service, Complaint & Kas Summary -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
            <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Statistik Pelayanan Surat</h3>
                    <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1rem;">Total surat diajukan dan diproses dalam sistem</p>
                    <div style="font-size: 2.25rem; font-weight: 800; color: var(--primary-color); line-height: 1;">${totalPelayanan}</div>
                </div>
                <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">
                    <i class="ph-bold ph-file-text"></i>
                </div>
            </div>

            <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Statistik Pengaduan Warga</h3>
                    <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1rem;">Laporan lingkungan & ketertiban dari warga</p>
                    <div style="font-size: 2.25rem; font-weight: 800; color: var(--danger-color); line-height: 1;">${totalPengaduan}</div>
                </div>
                <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--danger-light); color: var(--danger-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">
                    <i class="ph-bold ph-warning-circle"></i>
                </div>
            </div>

            <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Total Saldo Kas RW</h3>
                    <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem;">Masuk: Rp ${saKas.totalPemasukan.toLocaleString('id-ID')} | Keluar: Rp ${saKas.totalPengeluaran.toLocaleString('id-ID')}</p>
                    <div style="font-size: 1.85rem; font-weight: 800; color: ${saKas.totalSaldo < 0 ? 'var(--danger-color)' : 'var(--success-color)'}; line-height: 1;">
                        ${saKas.totalSaldo < 0 ? '- Rp ' + Math.abs(saKas.totalSaldo).toLocaleString('id-ID') : 'Rp ' + saKas.totalSaldo.toLocaleString('id-ID')}
                    </div>
                </div>
                <div style="width: 56px; height: 56px; border-radius: 16px; background: ${saKas.totalSaldo < 0 ? 'var(--danger-light)' : 'rgba(34, 197, 94, 0.15)'}; color: ${saKas.totalSaldo < 0 ? 'var(--danger-color)' : 'var(--success-color)'}; display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">
                    <i class="ph-bold ph-coins"></i>
                </div>
            </div>
        </div>

        ${renderLatestPengumumanWidget(null, data.pengumuman)}
    `;
}

// 2. KETUA RW DASHBOARD
function renderKetuaRWDashboard(data) {
    const stats = { totalWarga: data?.totalWarga || 0, byRT: data?.byRT || {} };
    const totalSaldo = data?.rwKas?.totalSaldo || 0;
    const formattedSaldo = totalSaldo < 0 
        ? `- Rp ${Math.abs(totalSaldo).toLocaleString('id-ID')}` 
        : `Rp ${totalSaldo.toLocaleString('id-ID')}`;

    const pendingRWCount = data?.pendingRWCount || 0;
    const totalPengaduan = data?.totalPengaduan || 0;

    return `
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard Ketua RW</h1>
                <p class="page-subtitle">Pemantauan persetujuan surat warga, pengaduan lingkungan, dan demografi wilayah</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <a href="#/persetujuan-pelayanan" class="btn btn-primary" id="btnPersetujuanRWTop">
                    <i class="ph-bold ph-check-square-offset"></i> Persetujuan (${pendingRWCount})
                </a>
                <a href="#/statistik-rw" class="btn btn-outline">
                    <i class="ph-bold ph-chart-bar"></i> Statistik RW
                </a>
            </div>
        </div>

        <div class="stats-grid mb-6">
            <div class="card stat-card">
                <div class="stat-info">
                    <p>Menunggu Persetujuan Anda</p>
                    <h3 id="statMenungguPersetujuanRW" style="color: ${pendingRWCount > 0 ? 'var(--warning-color)' : 'var(--text-main)'};">
                        ${pendingRWCount}
                    </h3>
                    <div style="margin-top: 6px;">
                        <span id="badgeMenungguPersetujuanRW" class="stat-status ${pendingRWCount > 0 ? 'stat-status-yellow' : 'stat-status-green'}">
                            <i class="ph-bold ${pendingRWCount > 0 ? 'ph-clock' : 'ph-check'}"></i> ${pendingRWCount > 0 ? 'Perlu Verifikasi' : 'Selesai Semua'}
                        </span>
                    </div>
                </div>
                <div class="stat-icon warning">
                    <i class="ph-bold ph-check-square-offset"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Total Warga Terdata</p>
                    <h3>${stats.totalWarga}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-green"><i class="ph-bold ph-users"></i> Warga RW</span>
                    </div>
                </div>
                <div class="stat-icon primary">
                    <i class="ph-bold ph-users"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Laporan Pengaduan</p>
                    <h3>${totalPengaduan}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-red"><i class="ph-bold ph-warning"></i> Laporan Lingkungan</span>
                    </div>
                </div>
                <div class="stat-icon danger">
                    <i class="ph-bold ph-warning-circle"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Kas & Keuangan RW</p>
                    <h3 id="dashboardKasTotalSaldo" style="font-size: 1.45rem; color: ${totalSaldo < 0 ? 'var(--danger-color)' : 'var(--text-main)'};">${formattedSaldo}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status ${totalSaldo < 0 ? 'stat-status-red' : 'stat-status-green'}">
                            <i class="ph-bold ${totalSaldo < 0 ? 'ph-trend-down' : 'ph-wallet'}"></i> ${totalSaldo < 0 ? 'Defisit Saldo' : 'Total Saldo Seluruh RT'}
                        </span>
                    </div>
                </div>
                <div class="stat-icon ${totalSaldo < 0 ? 'danger' : 'success'}">
                    <i class="ph-bold ph-wallet"></i>
                </div>
            </div>
        </div>
        
        <div class="card mb-6" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Ringkasan Demografi Wilayah</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Total penduduk terdaftar: <strong>${stats.totalWarga} jiwa</strong> dari seluruh RT binaan RW 05.</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <a href="#/data-warga" class="btn btn-outline btn-sm">
                    <i class="ph-bold ph-users"></i> Data Warga
                </a>
                <a href="#/statistik-rw" class="btn btn-primary btn-sm">
                    <i class="ph-bold ph-chart-bar"></i> Lihat Grafik Statistik
                </a>
            </div>
        </div>

        <div style="margin-bottom: 24px;">
            ${renderLatestPengumumanWidget(true, data.pengumuman)}
        </div>
    `;
}

// 4. KETUA RT DASHBOARD
function renderKetuaRTDashboard(user, data) {
    const totalWargaRT = data?.totalWargaRT || 0;
    const pendingCount = data?.pendingRTCount || 0;
    const totalCount = data?.totalPelayananRTCount || 0;
    const pengaduanRTCount = data?.pengaduanRTCount || 0;

    return `
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard Ketua RT ${user.rt || ''}</h1>
                <p class="page-subtitle">Verifikasi surat pengantar warga, monitoring laporan, dan data warga lingkungan RT ${user.rt || ''}</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <a href="#/verifikasi-pengajuan" class="btn btn-primary" id="btnVerifikasiRTTop">
                    <i class="ph-bold ph-file-magnifying-glass"></i> Verifikasi Surat (<span id="btnVerifikasiCountTop">${pendingCount}</span>)
                </a>
            </div>
        </div>

        <div class="stats-grid mb-6">
            <div class="card stat-card">
                <div class="stat-info">
                    <p>Total Warga RT ${user.rt || ''}</p>
                    <h3>${totalWargaRT}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-blue"><i class="ph-bold ph-users"></i> Warga Lingkungan</span>
                    </div>
                </div>
                <div class="stat-icon primary">
                    <i class="ph-bold ph-users"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Menunggu Verifikasi</p>
                    <h3 id="statMenungguVerifikasiRT" style="color: ${pendingCount > 0 ? 'var(--warning-color)' : 'var(--text-main)'};">
                        ${pendingCount}
                    </h3>
                    <div style="margin-top: 6px;">
                        <span id="badgeMenungguVerifikasiRT" class="stat-status ${pendingCount > 0 ? 'stat-status-yellow' : 'stat-status-green'}">
                            <i class="ph-bold ${pendingCount > 0 ? 'ph-clock' : 'ph-check'}"></i> ${pendingCount > 0 ? 'Perlu Diverifikasi' : 'Sudah Selesai'}
                        </span>
                    </div>
                </div>
                <div class="stat-icon warning">
                    <i class="ph-bold ph-file-magnifying-glass"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Pengaduan Warga RT</p>
                    <h3>${pengaduanRTCount}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-red"><i class="ph-bold ph-warning"></i> Laporan Masuk</span>
                    </div>
                </div>
                <div class="stat-icon danger">
                    <i class="ph-bold ph-warning-circle"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Total Pelayanan RT</p>
                    <h3 id="statTotalPelayananRT">${totalCount}</h3>
                    <div style="margin-top: 6px;">
                        <span class="stat-status stat-status-green"><i class="ph-bold ph-check-circle"></i> Arsip Surat RT</span>
                    </div>
                </div>
                <div class="stat-icon success">
                    <i class="ph ph-file-text"></i>
                </div>
            </div>
        </div>
        
        <div class="card mb-6">
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Tindakan Cepat Ketua RT</h3>
            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">Tindak lanjuti berkas permohonan surat pengantar dari warga RT Anda</p>
            <div style="display: flex; gap: 0.875rem; flex-wrap: wrap;">
                <a href="#/verifikasi-pengajuan" class="btn btn-primary" id="btnVerifikasiRTQuick">
                    <i class="ph-bold ph-check"></i> Verifikasi Pengajuan (<span id="btnVerifikasiCountQuick">${pendingCount}</span>)
                </a>
                <a href="#/data-warga" class="btn btn-outline">
                    <i class="ph-bold ph-users"></i> Lihat Data Warga RT
                </a>
                <a href="#/kas-iuran" class="btn btn-outline">
                    <i class="ph-bold ph-wallet"></i> Kas & Iuran RT
                </a>
            </div>
        </div>

        ${renderLatestPengumumanWidget(null, data.pengumuman)}
    `;
}

function renderWargaLatestStatusCard(latestPelayanan) {
    if (latestPelayanan) {
        return `
            <div class="warga-status-item-card" style="padding: 1.25rem; background: #F8F9FD; border: 1px solid var(--border-light); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <strong style="color: var(--text-main); font-size: 1.05rem; font-weight: 800;">${latestPelayanan.jenis_pelayanan || latestPelayanan.jenis_surat || 'Pelayanan Surat'}</strong>
                    ${getStatusBadge(latestPelayanan.status)}
                </div>
                <div style="font-size: 0.8125rem; color: var(--text-muted);">
                    <i class="ph-bold ph-calendar text-sm align-middle"></i> Diajukan: ${new Date(latestPelayanan.tanggal_pengajuan || latestPelayanan.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                    <span style="font-weight: 600; color: var(--text-main);">Keperluan:</span> ${latestPelayanan.keperluan || '-'}
                </p>
                <div style="border-top: 1px solid var(--border-color); margin-top: 6px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">No. Berkas: #${latestPelayanan.id || latestPelayanan.no_berkas}</span>
                    <a href="#/pelayanan/detail?id=${latestPelayanan.id || latestPelayanan.no_berkas}" style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-color); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        Lihat Progres &rarr;
                    </a>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="warga-status-empty-card" style="padding: 2.25rem 1rem; text-align: center; background: #F8F9FD; border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
                <i class="ph-bold ph-files" style="font-size: 2.25rem; color: var(--text-muted); margin-bottom: 0.5rem; display: inline-block;"></i>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Anda belum memiliki riwayat pengajuan surat.</p>
                <a href="#/pengajuan-pelayanan" class="btn btn-sm btn-primary" style="margin-top: 1rem;">Ajukan Surat Baru</a>
            </div>
        `;
    }
}

// 5. WARGA DASHBOARD
function renderWargaDashboard(user, data) {
    const pelayananSaya = data?.pelayananSaya || [];
    const pengaduanSaya = data?.pengaduanSaya || [];
    const pengajuanAktif = data?.pengajuanAktif || 0;
    const pengaduanAktif = data?.pengaduanAktif || 0;
    const latestPelayanan = pelayananSaya.length > 0 ? pelayananSaya[0] : null;

    const latestStatusHtml = renderWargaLatestStatusCard(latestPelayanan);

    return `
        <!-- Page Header -->
        <div class="page-header">
            <div>
                <h1 class="page-title">Selamat Datang, ${user.nama || user.name || 'Warga'}!</h1>
                <p class="page-subtitle">Portal layanan mandiri kependudukan Digital RW — RT ${user.rt || '01'} / RW ${user.rw || '05'}</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <a href="#/pengajuan-pelayanan" class="btn btn-primary">
                    <i class="ph-bold ph-plus"></i> Ajukan Surat Baru
                </a>
            </div>
        </div>

        <!-- 2-Column Symmetrical DashStack KPI Cards for Warga -->
        <div class="stats-grid-2 mb-6">
            <div class="card stat-card">
                <div class="stat-info">
                    <p>Pengajuan Surat Aktif</p>
                    <h3 id="statPengajuanAktifWarga">${pengajuanAktif}</h3>
                    <div style="margin-top: 6px;">
                        <span id="badgePengajuanAktifWarga" class="stat-status stat-status-yellow"><i class="ph-bold ph-clock"></i> Total ${pelayananSaya.length} Diajukan</span>
                    </div>
                </div>
                <div class="stat-icon warning">
                    <i class="ph-bold ph-file-text"></i>
                </div>
            </div>

            <div class="card stat-card">
                <div class="stat-info">
                    <p>Pengaduan Lingkungan</p>
                    <h3 id="statPengaduanWarga">${pengaduanSaya.length}</h3>
                    <div style="margin-top: 6px;">
                        <span id="badgePengaduanWarga" class="stat-status stat-status-red"><i class="ph-bold ph-warning"></i> ${pengaduanAktif} Dalam Proses</span>
                    </div>
                </div>
                <div class="stat-icon danger">
                    <i class="ph-bold ph-warning-circle"></i>
                </div>
            </div>
        </div>
        
        <!-- Emergency Panic Button Banner (DashStack Clean Card) -->
        <div class="card mb-6" style="background: var(--danger-light); border: 1px solid rgba(239, 56, 38, 0.3); padding: 1.35rem 1.75rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 1.25rem; max-width: 680px;">
                <div class="panic-icon-box" style="width: 50px; height: 50px; border-radius: 14px; background: #FFFFFF; color: var(--danger-color); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(239, 56, 38, 0.2);">
                    <i class="ph-bold ph-warning-octagon"></i>
                </div>
                <div>
                    <h4 class="panic-title" style="font-size: 1.05rem; font-weight: 800; color: #991b1b; margin: 0 0 3px 0;">Tombol Darurat Warga (Panic Button)</h4>
                    <p class="panic-subtitle" style="font-size: 0.8125rem; color: #b91c1c; margin: 0; line-height: 1.45;">
                        Tekan jika dalam keadaan bahaya (kebakaran, medis darurat, kriminalitas) untuk membunyikan sinyal alarm serta membagikan titik koordinat GPS ke pengurus RT & RW.
                    </p>
                </div>
            </div>
            <div>
                <button id="btnPanicEmergency" onclick="window.handlePanicClick(event)" class="btn btn-danger" style="font-weight: 800; padding: 11px 22px; font-size: 0.875rem; box-shadow: 0 6px 16px rgba(239, 56, 38, 0.35);">
                    <i class="ph-bold ph-siren"></i> LAPOR DARURAT
                </button>
            </div>
        </div>
        
        <!-- Status Pengajuan Terbaru -->
        <div class="card mb-6">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="ph-bold ph-clock"></i>
                    </div>
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0;">Status Pengajuan Terbaru</h3>
                </div>
                <a href="#/status-pengajuan" style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-color); text-decoration: none;">Riwayat Lengkap &rarr;</a>
            </div>
            <div id="containerLatestPelayananWarga">
                ${latestStatusHtml}
            </div>
        </div>

        <!-- Pengumuman Terbaru -->
        <div style="margin-bottom: 24px;">
            ${renderLatestPengumumanWidget(null, data.pengumuman)}
        </div>
    `;
}

export function renderDashboard() {
    try {
        const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!user || !user.role) {
            return `
                <div class="card" style="padding: 2.5rem; text-align: center; max-width: 500px; margin: 2rem auto;">
                    <div style="font-size: 2rem; color: #f59e0b; margin-bottom: 0.5rem;">⚠️</div>
                    <h3 style="font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Sesi Pengguna Tidak Ditemukan</h3>
                    <p class="text-muted" style="margin-bottom: 1.5rem; font-size: 0.875rem;">Silakan login ulang untuk mengakses data dashboard.</p>
                    <a href="#/login" class="btn btn-primary">Ke Halaman Login</a>
                </div>
            `;
        }

        // Single-pass lightweight data calculation (0ms, 1x JSON parse murni di memori)
        const dashboardData = getDashboardData(user);

        let dashboardContent = '';
        switch (user.role) {
            case ROLES.SUPER_ADMIN: dashboardContent = renderSuperAdminDashboard(dashboardData); break;
            case ROLES.KETUA_RW: dashboardContent = renderKetuaRWDashboard(dashboardData); break;
            case ROLES.KETUA_RT: dashboardContent = renderKetuaRTDashboard(user, dashboardData); break;
            case ROLES.WARGA: dashboardContent = renderWargaDashboard(user, dashboardData); break;
            default: dashboardContent = renderWargaDashboard(user, dashboardData); break;
        }

        return `
            <div class="dashboard-wrapper">
                ${dashboardContent}
            </div>
        `;
    } catch (err) {
        console.error("Dashboard render error:", err);
        return `
            <div class="card" style="padding: 2rem; border-left: 4px solid var(--danger-color); max-width: 700px; margin: 1.5rem auto;">
                <h3 style="color: var(--danger-color); font-weight: 700; margin-bottom: 0.5rem;">Terjadi Kendala Memuat Dashboard</h3>
                <p class="text-muted" style="margin-bottom: 1.25rem;">Gagal merender komponen dashboard: ${err.message || 'Unknown render error'}</p>
                <button onclick="window.location.reload()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-arrows-clockwise"></i> Muat Ulang Halaman
                </button>
            </div>
        `;
    }
}

// Emergency Panic Modal Logic
let currentMapsLink = null;
let currentEmergencyType = 'Lainnya';

window.handlePanicClick = function (e) {
    e.preventDefault();

    if (document.getElementById('daruratModalDynamic')) {
        document.getElementById('daruratModalDynamic').remove();
    }

    const modalHtml = `
        <div id="daruratModalDynamic" class="modal-backdrop" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.65); z-index: 10000; backdrop-filter: blur(4px);">
            <div class="card" style="width: 90%; max-width: 440px; padding: 2rem; border-top: 6px solid var(--danger-color); box-shadow: 0 25px 50px rgba(0,0,0,0.25); background: #FFFFFF; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border-color);">
                <div style="text-align: center;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--danger-light); color: var(--danger-color); display: flex; align-items: center; justify-content: center; font-size: 2.25rem; margin: 0 auto 0.75rem auto;">
                        <i class="ph-bold ph-warning-octagon"></i>
                    </div>
                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #991b1b; margin-bottom: 0.25rem;">Konfirmasi Sinyal Darurat</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Pilih kategori bantuan yang Anda perlukan saat ini:</p>
                </div>
                
                <div class="flex flex-col gap-2 mt-2" id="daruratOptions">
                    <button class="btn py-3 text-base justify-start gap-3" onclick="window.selectDaruratType('Kebakaran', this)" style="border-radius: var(--radius-md); border: 1px solid var(--border-color); background: #F8F9FD; color: var(--text-main); font-weight: 700; text-align: left; padding: 12px 16px; width: 100%;">
                        🔥 Kebakaran
                    </button>
                    <button class="btn py-3 text-base justify-start gap-3" onclick="window.selectDaruratType('Keamanan', this)" style="border-radius: var(--radius-md); border: 1px solid var(--border-color); background: #F8F9FD; color: var(--text-main); font-weight: 700; text-align: left; padding: 12px 16px; width: 100%;">
                        🛡️ Keamanan / Kriminalitas
                    </button>
                    <button class="btn py-3 text-base justify-start gap-3" onclick="window.selectDaruratType('Medis', this)" style="border-radius: var(--radius-md); border: 1px solid var(--border-color); background: #F8F9FD; color: var(--text-main); font-weight: 700; text-align: left; padding: 12px 16px; width: 100%;">
                        🚑 Pertolongan Medis
                    </button>
                </div>

                <div id="daruratGpsStatus" class="mt-2 text-center" style="padding: 10px; background: #F1F5F9; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-main); font-weight: 600;">
                    <i class="ph-bold ph-spinner ph-spin text-lg text-primary align-middle"></i> Mendapatkan Titik GPS...
                </div>

                <div class="flex flex-col gap-2 mt-3">
                    <button id="btnKirimDarurat" class="btn btn-danger w-full py-3 text-base font-bold" onclick="window.kirimSinyalDarurat(event)" disabled style="padding: 12px; cursor: pointer; border-radius: var(--radius-md);">
                        KIRIM SINYAL SEKARANG
                    </button>
                    <button class="btn btn-secondary btn-cancel w-full mt-1" onclick="document.getElementById('daruratModalDynamic').remove()" style="font-weight: 700; padding: 8px;">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    currentMapsLink = null;
    currentEmergencyType = 'Lainnya';

    const daruratGpsStatus = document.getElementById('daruratGpsStatus');
    const btnKirimDarurat = document.getElementById('btnKirimDarurat');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                currentMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
                if (daruratGpsStatus) {
                    daruratGpsStatus.innerHTML = '<i class="ph-bold ph-check-circle text-lg align-middle" style="color: var(--success-color);"></i> Lokasi GPS berhasil dideteksi!';
                    daruratGpsStatus.style.color = 'var(--success-color)';
                    daruratGpsStatus.style.backgroundColor = 'var(--success-light)';
                }
                if (btnKirimDarurat) btnKirimDarurat.disabled = false;
            },
            (error) => {
                console.warn("GPS error:", error);
                if (daruratGpsStatus) {
                    daruratGpsStatus.innerHTML = '<i class="ph-bold ph-warning text-lg align-middle" style="color: var(--warning-color);"></i> GPS offline. Menggunakan alamat rumah terdaftar.';
                    daruratGpsStatus.style.color = 'var(--warning-color)';
                    daruratGpsStatus.style.backgroundColor = 'var(--warning-light)';
                }
                if (btnKirimDarurat) btnKirimDarurat.disabled = false;
            },
            { timeout: 8000, enableHighAccuracy: true }
        );
    } else {
        if (daruratGpsStatus) {
            daruratGpsStatus.innerHTML = '<i class="ph-bold ph-warning text-lg align-middle" style="color: var(--warning-color);"></i> Browser tidak mendukung GPS. Menggunakan alamat fallback.';
            daruratGpsStatus.style.color = 'var(--warning-color)';
            daruratGpsStatus.style.backgroundColor = 'var(--warning-light)';
        }
        if (btnKirimDarurat) btnKirimDarurat.disabled = false;
    }
};

window.selectDaruratType = function (type, element) {
    currentEmergencyType = type;
    const buttons = document.querySelectorAll('#daruratOptions button');
    buttons.forEach(btn => {
        btn.style.background = '#F8F9FD';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border-color)';
    });

    element.style.background = 'var(--primary-light)';
    element.style.color = 'var(--primary-color)';
    element.style.borderColor = 'var(--primary-color)';
};

window.kirimSinyalDarurat = function (e) {
    e.preventDefault();
    const btnKirimDarurat = document.getElementById('btnKirimDarurat');
    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (btnKirimDarurat) {
        btnKirimDarurat.innerHTML = '<i class="ph-bold ph-spinner ph-spin align-middle"></i> Mengirimkan...';
        btnKirimDarurat.disabled = true;
    }

    try {
        const userName = user.nama || user.name || 'Warga';
        const userRT = user.rt || '01';
        const userRW = user.rw || '05';

        const alertData = {
            nik: user.nik || '',
            nama: userName,
            rt: userRT,
            rw: userRW,
            alamat: user.alamat || `RT ${userRT} / RW ${userRW}`,
            jenis_darurat: currentEmergencyType,
            maps_link: currentMapsLink,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('emergencyAlert', JSON.stringify(alertData));

        createPengumumanDarurat(user, currentMapsLink, currentEmergencyType);

        const modal = document.getElementById('daruratModalDynamic');
        if (modal) modal.remove();

        showCustomToast(`Sinyal Darurat [${currentEmergencyType}] Berhasil Dikirim ke Pengurus RT/RW!`, 'success');
    } catch (err) {
        console.error(err);
        if (btnKirimDarurat) {
            btnKirimDarurat.innerHTML = 'KIRIM SINYAL SEKARANG';
            btnKirimDarurat.disabled = false;
        }
        showCustomToast('Gagal mengirim sinyal: ' + err.message, 'error');
    }
};

function showCustomToast(message, type) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = type === 'error' ? 'var(--danger-color)' : 'var(--success-color)';
    toast.style.color = '#FFFFFF';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = 'var(--radius-lg)';
    toast.style.boxShadow = 'var(--shadow-dropdown)';
    toast.style.zIndex = '99999';
    toast.style.fontWeight = '700';
    toast.style.fontSize = '0.9rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';

    const icon = type === 'error' ? 'ph-x-circle' : 'ph-check-circle';
    toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size: 1.35rem;"></i> <span>${message}</span>`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Chart Instances & Cleanup Management (Mencegah beban CPU & kebocoran memori saat render ulang)
let dashboardChartInstances = [];

export function destroyDashboardCharts() {
    try {
        if (Array.isArray(dashboardChartInstances) && dashboardChartInstances.length > 0) {
            dashboardChartInstances.forEach(c => {
                try {
                    if (c && typeof c.destroy === 'function') c.destroy();
                } catch (e) {}
            });
            dashboardChartInstances = [];
        }
        if (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') {
            const canvases = document.querySelectorAll('.dashboard-wrapper canvas');
            canvases.forEach(canvas => {
                try {
                    const inst = Chart.getChart(canvas);
                    if (inst && typeof inst.destroy === 'function') inst.destroy();
                } catch (e) {}
            });
        }
    } catch (e) {
        console.warn("Chart cleanup warning:", e);
    }
}

// Listener Handlers untuk mencegah kebocoran/duplikasi event listener
let dashboardSyncHandler = null;
let rwKasUpdatedHandler = null;

export function setupDashboardEvents() {
    // 1. Bersihkan chart lama & atur animasi false untuk efisiensi CPU maksimal
    destroyDashboardCharts();
    if (typeof Chart !== 'undefined' && Chart.defaults) {
        Chart.defaults.animation = false;
        if (Chart.defaults.transitions && Chart.defaults.transitions.active) {
            Chart.defaults.transitions.active.animation = { duration: 0 };
        }
    }

    // 2. Jika ada icon library seperti lucide, batasi hanya pada container konten dashboard
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        try {
            const container = document.querySelector('.dashboard-wrapper') || document.querySelector('.page-content');
            if (container) {
                lucide.createIcons({ root: container });
            }
        } catch (e) {}
    }

    const user = getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!user || !user.role) return;

    // Realtime Dynamic Dashboard Sync saat event 'db:synced' dipicu
    const updateDashboardLive = () => {
        const freshUser = getCurrentUser() || user;
        const freshData = getDashboardData(freshUser);

        // A. KETUA RW
        if (freshUser.role === ROLES.KETUA_RW) {
            const count = freshData.pendingRWCount;
            const statEl = document.getElementById('statMenungguPersetujuanRW');
            const badgeEl = document.getElementById('badgeMenungguPersetujuanRW');
            const btnTop = document.getElementById('btnPersetujuanRWTop');

            if (statEl) {
                statEl.textContent = count;
                statEl.style.color = count > 0 ? 'var(--warning-color)' : 'var(--text-main)';
            }
            if (badgeEl) {
                badgeEl.className = `stat-status ${count > 0 ? 'stat-status-yellow' : 'stat-status-green'}`;
                badgeEl.innerHTML = `<i class="ph-bold ${count > 0 ? 'ph-clock' : 'ph-check'}"></i> ${count > 0 ? 'Perlu Verifikasi' : 'Selesai Semua'}`;
            }
            if (btnTop) {
                btnTop.innerHTML = `<i class="ph-bold ph-check-square-offset"></i> Persetujuan (${count})`;
            }

            const kasEl = document.getElementById('dashboardKasTotalSaldo');
            if (kasEl) {
                const totalSaldo = freshData.rwKas.totalSaldo;
                kasEl.textContent = totalSaldo < 0 
                    ? `- Rp ${Math.abs(totalSaldo).toLocaleString('id-ID')}` 
                    : `Rp ${totalSaldo.toLocaleString('id-ID')}`;
                kasEl.style.color = totalSaldo < 0 ? 'var(--danger-color)' : 'var(--text-main)';
            }
        }

        // B. KETUA RT
        else if (freshUser.role === ROLES.KETUA_RT) {
            const pending = freshData.pendingRTCount;
            const total = freshData.totalPelayananRTCount;

            const statPendingEl = document.getElementById('statMenungguVerifikasiRT');
            const badgePendingEl = document.getElementById('badgeMenungguVerifikasiRT');
            const statTotalEl = document.getElementById('statTotalPelayananRT');
            const btnCountTop = document.getElementById('btnVerifikasiCountTop');
            const btnCountQuick = document.getElementById('btnVerifikasiCountQuick');

            if (statPendingEl) {
                statPendingEl.textContent = `${pending}`;
                statPendingEl.style.color = pending > 0 ? 'var(--warning-color)' : 'var(--text-main)';
            }
            if (badgePendingEl) {
                badgePendingEl.className = `stat-status ${pending > 0 ? 'stat-status-yellow' : 'stat-status-green'}`;
                badgePendingEl.innerHTML = `<i class="ph-bold ${pending > 0 ? 'ph-clock' : 'ph-check'}"></i> ${pending > 0 ? 'Perlu Diverifikasi' : 'Sudah Selesai'}`;
            }
            if (statTotalEl) {
                statTotalEl.textContent = `${total}`;
            }
            if (btnCountTop) {
                btnCountTop.textContent = `${pending}`;
            }
            if (btnCountQuick) {
                btnCountQuick.textContent = `${pending}`;
            }
        }

        // C. WARGA
        else if (freshUser.role === ROLES.WARGA) {
            const statPengajuanEl = document.getElementById('statPengajuanAktifWarga');
            const badgePengajuanEl = document.getElementById('badgePengajuanAktifWarga');
            const statPengaduanEl = document.getElementById('statPengaduanWarga');
            const badgePengaduanEl = document.getElementById('badgePengaduanWarga');
            const containerLatestEl = document.getElementById('containerLatestPelayananWarga');

            if (statPengajuanEl) {
                statPengajuanEl.textContent = freshData.pengajuanAktif;
            }
            if (badgePengajuanEl) {
                badgePengajuanEl.innerHTML = `<i class="ph-bold ph-clock"></i> Total ${freshData.pelayananSaya.length} Diajukan`;
            }
            if (statPengaduanEl) {
                statPengaduanEl.textContent = freshData.pengaduanSaya.length;
            }
            if (badgePengaduanEl) {
                badgePengaduanEl.innerHTML = `<i class="ph-bold ph-warning"></i> ${freshData.pengaduanAktif} Dalam Proses`;
            }
            if (containerLatestEl) {
                const latest = freshData.pelayananSaya[0] || null;
                containerLatestEl.innerHTML = renderWargaLatestStatusCard(latest);
            }
        }
    };

    // Bersihkan listener lama agar tidak terjadi duplikasi
    if (dashboardSyncHandler) {
        window.removeEventListener('db:synced', dashboardSyncHandler);
    }
    dashboardSyncHandler = updateDashboardLive;
    window.addEventListener('db:synced', dashboardSyncHandler);

    if (user.role === ROLES.KETUA_RW) {
        if (rwKasUpdatedHandler) {
            window.removeEventListener('kas:updated', rwKasUpdatedHandler);
        }
        rwKasUpdatedHandler = updateDashboardLive;
        window.addEventListener('kas:updated', rwKasUpdatedHandler, { once: true });
    }

    // Pembaruan data asinkron di latar belakang tanpa memblokir render
    setTimeout(() => {
        fetchPelayananFromBackend().then(() => {
            updateDashboardLive();
        }).catch(() => {});
    }, 600);
}

