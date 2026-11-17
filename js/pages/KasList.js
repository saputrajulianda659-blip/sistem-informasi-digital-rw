// js/pages/KasList.js
import { getAllKas, getKasSummary, createKas, deleteKas } from '../models/Kas.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { showConfirmDialog, showAlertDialog } from '../utils/uiDialog.js';

export function formatRp(num) {
    const val = Number(num || 0);
    return val < 0 ? '-Rp ' + Math.abs(val).toLocaleString('id-ID') : 'Rp ' + val.toLocaleString('id-ID');
}

export function renderKasTableRows(kasData, isPengurus) {
    if (!kasData || kasData.length === 0) {
        return `<tr><td colspan="${isPengurus ? 6 : 5}" class="py-8 px-4 text-center text-slate-400 font-medium" style="text-align: center; padding: 3rem; color: #94a3b8;">Belum ada data transaksi kas pada wilayah ini.</td></tr>`;
    }
    return kasData.map(k => {
        const date = new Date(k.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const isPemasukan = k.jenis === 'Pemasukan' || String(k.tipe || '').toLowerCase() === 'masuk' || String(k.jenis || '').toLowerCase() === 'pemasukan';
        
        const badgeTipe = isPemasukan 
            ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap">↓ Masuk</span>' 
            : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 whitespace-nowrap">↑ Keluar</span>';

        let actionCol = '';
        if (isPengurus) {
            actionCol = `
                <td class="py-4 px-4 whitespace-nowrap text-center align-middle">
                    <button class="btn btn-sm btn-outline delete-btn" data-id="${k.id}" style="color: var(--danger-color); border-color: rgba(239, 56, 38, 0.3); padding: 4px 8px;" title="Hapus Transaksi">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            `;
        }

        return `
            <tr class="kas-row hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-none" data-tipe="${(k.kategori || k.tipe || '').toLowerCase()}" data-ket="${(k.keterangan || '').toLowerCase()}">
                <td class="py-4 px-4 whitespace-nowrap text-sm text-slate-600 font-medium align-middle">
                    <span class="inline-flex items-center gap-1.5"><i class="ph-bold ph-calendar-blank text-slate-400"></i> ${date}</span>
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm align-middle">
                    <div class="inline-flex items-center gap-2">
                        ${badgeTipe}
                        <span class="text-slate-800 font-semibold text-sm">${k.kategori || k.tipe}</span>
                    </div>
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-slate-700 font-medium align-middle">
                    ${k.keterangan || '-'}
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm font-bold text-right align-middle">
                    ${isPemasukan 
                        ? `<span class="text-emerald-600 font-bold tracking-tight">+ Rp ${Number(k.nominal || 0).toLocaleString('id-ID')}</span>`
                        : `<span class="text-rose-600 font-bold tracking-tight">- Rp ${Number(k.nominal || 0).toLocaleString('id-ID')}</span>`
                    }
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-slate-600 align-middle">
                    <span class="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">RT ${k.rt || '01'} / RW ${k.rw || '05'}</span>
                </td>
                ${actionCol}
            </tr>
        `;
    }).join('');
}

export function renderKasList() {
    const user = getCurrentUser() || {};
    const isRwOrAdmin = [ROLES.KETUA_RW, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user.role);
    const isPengurus = [ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user.role);

    // Initial scope: for RW/Admin defaults to 'semua'; for Warga/Ketua RT locked strictly to user.rt
    const initialRtScope = isRwOrAdmin ? 'semua' : (user.rt || '01');
    const queryRt = (initialRtScope === 'semua' || initialRtScope === 'all') ? null : initialRtScope;

    // Calculate Summary and Rows
    const summary = getKasSummary(queryRt);
    const kasData = getAllKas(queryRt);
    const tableRows = renderKasTableRows(kasData, isPengurus);

    const btnAddHtml = isPengurus 
        ? `<button id="btnTambahKas" class="btn btn-primary" style="font-weight: 700;">
             <i class="ph-bold ph-plus"></i> Tambah Transaksi Kas
           </button>` 
        : '';

    // Modal Add with lightweight solid overlay & smooth scrolling
    const modalHtml = isPengurus ? `
        <div id="modalKas" class="modal-backdrop bg-slate-900/60" style="display: none; position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; padding: 1.5rem;">
            <div class="card bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto overscroll-contain" style="width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto; overscroll-behavior: contain; border-radius: 1rem; padding: 2rem; transform: translateZ(0); will-change: transform;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">Tambah Transaksi Kas</h3>
                        <p style="font-size: 0.8125rem; color: var(--text-muted); margin: 0;">Catat arus kas masuk / keluar kas lingkungan</p>
                    </div>
                    <button id="btnCloseModal" class="btn" style="background: transparent; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer;"><i class="ph-bold ph-x"></i></button>
                </div>
                <form id="formKas">
                    ${isRwOrAdmin ? `
                    <div class="form-group mb-4">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Wilayah RT</label>
                        <select id="rtKas" class="form-select" required style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-weight: 600;">
                            <option value="01">RT 01</option>
                            <option value="02">RT 02</option>
                        </select>
                    </div>
                    ` : `
                    <input type="hidden" id="rtKas" value="${user.rt || '01'}">
                    `}
                    <div class="form-group mb-4">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Jenis Transaksi</label>
                        <select id="jenisKas" class="form-select" required style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-weight: 600;">
                            <option value="Pemasukan">Pemasukan (Uang Masuk)</option>
                            <option value="Pengeluaran">Pengeluaran (Uang Keluar)</option>
                        </select>
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Kategori / Tipe</label>
                        <input type="text" id="tipeKas" class="form-input" required placeholder="Contoh: Iuran Keamanan, Perbaikan Lampu Jalan" style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Nominal (Rp)</label>
                        <input type="number" id="nominalKas" class="form-input" required min="1" placeholder="Masukkan jumlah nominal" style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Tanggal Transaksi</label>
                        <input type="date" id="tanggalKas" class="form-input" required style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                    </div>
                    <div class="form-group mb-6">
                        <label class="form-label" style="font-weight: 600; font-size: 0.875rem;">Keterangan Tambahan</label>
                        <textarea id="keteranganKas" class="form-input" rows="3" placeholder="Rincian sumber dana atau keperluan penggunaan kas..." style="width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);"></textarea>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1.25rem;">
                        <button type="button" id="btnCancelModal" class="btn btn-secondary btn-cancel" style="padding: 10px 18px; font-weight: 600;">Batal</button>
                        <button type="submit" id="btnSubmitKas" class="btn btn-primary" style="font-weight: 700; padding: 10px 22px;">Simpan Transaksi</button>
                    </div>
                </form>
            </div>
        </div>
    ` : '';

    return `
        <div>
            <!-- Header Section -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">Kas & Iuran Warga</h1>
                    <p class="page-subtitle">Transparansi tata kelola anggaran kas rukun warga dan iuran pemeliharaan lingkungan</p>
                </div>
                <div>
                    ${btnAddHtml}
                </div>
            </div>

            <!-- DashStack 3-Column KPI Summary Cards (Clean Layout without Clutter) -->
            <div class="stats-grid-3 mb-6">
                <div class="card stat-card">
                    <div class="stat-info">
                        <p>Total Saldo Kas Saat Ini</p>
                        <h3 id="cardKasTotalSaldo" style="color: var(--primary-color); font-size: 1.65rem;">${formatRp(summary.totalSaldo)}</h3>
                        <div style="margin-top: 6px;">
                            <span class="stat-status stat-status-blue"><i class="ph-bold ph-wallet"></i> Saldo Bersih</span>
                        </div>
                    </div>
                    <div class="stat-icon primary">
                        <i class="ph-bold ph-coins"></i>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <p>Total Pemasukan</p>
                        <h3 id="cardKasTotalPemasukan" style="color: var(--success-color); font-size: 1.65rem;">+ Rp ${summary.totalPemasukan.toLocaleString('id-ID')}</h3>
                        <div style="margin-top: 6px;">
                            <span class="stat-status stat-status-green"><i class="ph-bold ph-trend-up"></i> Arus Masuk</span>
                        </div>
                    </div>
                    <div class="stat-icon success">
                        <i class="ph-bold ph-arrow-down-left"></i>
                    </div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <p>Total Pengeluaran</p>
                        <h3 id="cardKasTotalPengeluaran" style="color: var(--danger-color); font-size: 1.65rem;">- Rp ${summary.totalPengeluaran.toLocaleString('id-ID')}</h3>
                        <div style="margin-top: 6px;">
                            <span class="stat-status stat-status-red"><i class="ph-bold ph-trend-down"></i> Pengeluaran</span>
                        </div>
                    </div>
                    <div class="stat-icon danger">
                        <i class="ph-bold ph-arrow-up-right"></i>
                    </div>
                </div>
            </div>

            <!-- Filter Wilayah Tabs (HANYA MUNCUL DI ROLE KETUA RW & SUPER ADMIN) -->
            ${isRwOrAdmin ? `
            <div class="tab-filter-container flex items-center justify-between flex-wrap gap-3 mb-4 mt-6 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; margin-bottom: 1rem; background: #ffffff; padding: 0.75rem 1rem; border-radius: 1rem; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div class="tab-filter-group flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <button type="button" 
                            id="tabFilterSemua"
                            class="tab-filter-btn btn-filter-rt active bg-blue-600 text-white font-semibold shadow-sm px-4 py-2 rounded-xl text-xs cursor-pointer transition" 
                            data-rt="semua"
                            style="display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 600; background-color: #2563eb; color: #ffffff; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(37,99,235,0.35);">
                        Semua RT (Gabungan)
                    </button>
                    <button type="button" 
                            id="tabFilterRT01"
                            class="tab-filter-btn btn-filter-rt inactive bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-xs cursor-pointer transition" 
                            data-rt="01"
                            style="display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 500; background-color: #f1f5f9; color: #475569; border: none; cursor: pointer; transition: all 0.2s ease;">
                        Kas RT 01
                    </button>
                    <button type="button" 
                            id="tabFilterRT02"
                            class="tab-filter-btn btn-filter-rt inactive bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-xs cursor-pointer transition" 
                            data-rt="02"
                            style="display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 500; background-color: #f1f5f9; color: #475569; border: none; cursor: pointer; transition: all 0.2s ease;">
                        Kas RT 02
                    </button>
                </div>
                <div class="text-xs text-slate-500 font-medium" style="font-size: 0.75rem; color: #64748b; font-weight: 500;">
                    <span id="filterWilayahLabel">Menampilkan: Seluruh Wilayah RW 05</span>
                </div>
            </div>
            ` : ''}

            <!-- Table Card Container -->
            <div id="kasTableContainer" class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden ${isRwOrAdmin ? '' : 'mt-6'}">
                <div class="table-responsive overflow-x-auto w-full" style="margin: 0; border: none; border-radius: 0;">
                    <table class="data-table min-w-full table-auto" style="width: 100%; border-collapse: collapse;">
                        <thead class="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th class="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                                <th class="py-3.5 px-4 whitespace-nowrap">Kategori / Tipe</th>
                                <th class="py-3.5 px-4 whitespace-nowrap">Keterangan</th>
                                <th class="py-3.5 px-4 whitespace-nowrap text-right">Nominal</th>
                                <th class="py-3.5 px-4 whitespace-nowrap">Wilayah</th>
                                ${isPengurus ? '<th class="py-3.5 px-4 whitespace-nowrap text-center">Aksi</th>' : ''}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
            
            ${modalHtml}
        </div>
    `;
}

export function setupKasListEvents() {
    const user = getCurrentUser() || {};
    const isRwOrAdmin = [ROLES.KETUA_RW, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user.role);
    const isPengurus = [ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN, ROLES.ADMIN_RW].includes(user.role);

    // Default state: 'semua' for RW/Admin, or user.rt for Warga/Ketua RT
    let activeTabRT = isRwOrAdmin ? 'semua' : (user.rt || '01');

    const updateView = (targetRt) => {
        activeTabRT = targetRt;
        const scopedRt = (targetRt === 'semua' || targetRt === 'all') ? null : targetRt;
        const newSummary = getKasSummary(scopedRt);
        const newKasData = getAllKas(scopedRt);

        const cardSaldo = document.getElementById('cardKasTotalSaldo');
        const cardPemasukan = document.getElementById('cardKasTotalPemasukan');
        const cardPengeluaran = document.getElementById('cardKasTotalPengeluaran');
        const labelWilayah = document.getElementById('filterWilayahLabel');
        const tbody = document.querySelector('#kasTableContainer tbody');

        if (cardSaldo) {
            cardSaldo.innerText = formatRp(newSummary.totalSaldo);
            cardSaldo.style.color = newSummary.totalSaldo < 0 ? 'var(--danger-color)' : 'var(--primary-color)';
        }
        if (cardPemasukan) {
            cardPemasukan.innerText = `+ Rp ${newSummary.totalPemasukan.toLocaleString('id-ID')}`;
        }
        if (cardPengeluaran) {
            cardPengeluaran.innerText = `- Rp ${newSummary.totalPengeluaran.toLocaleString('id-ID')}`;
        }
        if (labelWilayah) {
            if (targetRt === '01') {
                labelWilayah.innerText = 'Menampilkan: Kas Wilayah RT 01';
            } else if (targetRt === '02') {
                labelWilayah.innerText = 'Menampilkan: Kas Wilayah RT 02';
            } else {
                labelWilayah.innerText = 'Menampilkan: Seluruh Wilayah RW 05';
            }
        }
        if (tbody) {
            tbody.innerHTML = renderKasTableRows(newKasData, isPengurus);
        }

        // Update button visual styles
        const filterBtns = document.querySelectorAll('.btn-filter-rt');
        filterBtns.forEach(btn => {
            const bRt = btn.getAttribute('data-rt');
            const isActive = (bRt === targetRt);
            if (isActive) {
                btn.className = 'tab-filter-btn btn-filter-rt active bg-blue-600 text-white font-semibold shadow-sm px-4 py-2 rounded-xl text-xs cursor-pointer transition';
                btn.style.backgroundColor = '#2563eb';
                btn.style.color = '#ffffff';
                btn.style.fontWeight = '600';
                btn.style.boxShadow = '0 1px 3px rgba(37,99,235,0.35)';
            } else {
                btn.className = 'tab-filter-btn btn-filter-rt inactive bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-xs cursor-pointer transition';
                btn.style.backgroundColor = '#f1f5f9';
                btn.style.color = '#475569';
                btn.style.fontWeight = '500';
                btn.style.boxShadow = 'none';
            }
        });
    };

    // Filter Buttons Listener for Ketua RW / Super Admin
    const filterBtns = document.querySelectorAll('.btn-filter-rt');
    filterBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetRt = btn.getAttribute('data-rt');
            updateView(targetRt);
        };
    });

    // Modal & Add Events
    const modal = document.getElementById('modalKas');
    const btnAdd = document.getElementById('btnTambahKas');
    const btnClose = document.getElementById('btnCloseModal');
    const btnCancel = document.getElementById('btnCancelModal');
    const form = document.getElementById('formKas');
    
    if (btnAdd && modal) {
        btnAdd.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('tanggalKas');
            if (dateInput) dateInput.value = today;
            modal.style.display = 'flex';
        });
        
        const closeModal = () => {
            modal.style.display = 'none';
            if (form) form.reset();
        };

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const rtField = document.getElementById('rtKas');
                const selectedRt = rtField ? rtField.value : (user.rt || '01');

                const data = {
                    jenis: document.getElementById('jenisKas').value,
                    tipe: document.getElementById('tipeKas').value,
                    nominal: Number(document.getElementById('nominalKas').value),
                    tanggal: document.getElementById('tanggalKas').value,
                    keterangan: document.getElementById('keteranganKas').value,
                    rt: selectedRt
                };
                
                try {
                    await createKas(data);
                    closeModal();
                    await showAlertDialog('Data transaksi kas berhasil disimpan!', 'success');
                    updateView(activeTabRT);
                } catch(err) {
                    await showAlertDialog(err.message, 'error');
                }
            });
        }
    }

    // Event Delegation for Delete Button (handles dynamically filtered rows)
    const tableContainer = document.getElementById('kasTableContainer');
    if (tableContainer) {
        tableContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('.delete-btn');
            if (!btn) return;

            const confirmed = await showConfirmDialog({
                title: 'Konfirmasi Hapus',
                message: 'Apakah Anda yakin ingin menghapus transaksi kas ini? Saldo akan disesuaikan kembali.',
                itemName: 'transaksi kas ini',
                confirmText: 'Ya, Hapus',
                cancelText: 'Batal',
                confirmButtonColor: '#dc2626'
            });

            if (confirmed) {
                const id = btn.getAttribute('data-id');
                await deleteKas(id);
                await showAlertDialog('Transaksi kas berhasil dihapus.', 'success');
                updateView(activeTabRT);
            }
        });
    }

    // Real-time listener for external updates (cegah penumpukan listener)
    if (window._kasListUpdatedHandler) {
        window.removeEventListener('kas:updated', window._kasListUpdatedHandler);
    }
    window._kasListUpdatedHandler = () => {
        updateView(activeTabRT);
    };
    window.addEventListener('kas:updated', window._kasListUpdatedHandler);
}
