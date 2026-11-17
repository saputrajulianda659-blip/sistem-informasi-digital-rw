// js/utils/badge.js
/**
 * Global Modern Pill Status Badge Helper
 * Standar GLOBAL untuk SEMUA ROLE (Warga, RT 01, RT 02, RW, Admin) & SEMUA JENIS STATUS.
 * Menghasilkan kapsul melengkung elegan (rounded-full) dengan warna latar lembut (soft pastel),
 * teks kontras jelas, border halus, dan dot indikator bulat.
 */

export function renderStatusBadge(statusText, customLabel = null) {
    if (!statusText && statusText !== 0) return '';
    
    const raw = String(statusText).trim();
    const st = raw.toLowerCase();
    const label = customLabel || raw;

    // 1. Menunggu Verifikasi RT / Diproses RT / Diproses / Pending / Menunggu Verifikasi
    if (
        st === 'menunggu verifikasi rt' ||
        st === 'menunggu_verifikasi_rt' ||
        st === 'diproses rt' ||
        st === 'diproses' ||
        st === 'pending' ||
        st === 'menunggu verifikasi' ||
        st === 'menunggu' ||
        st === 'baru' ||
        st === 'diajukan'
    ) {
        return `<span class="bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #fffbeb; color: #b45309; border: 1px solid rgba(253, 230, 138, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #f59e0b; display: inline-block;"></span>${label}</span>`;
    }

    // 2. Menunggu Verifikasi RW / Diproses RW / Disetujui RT / Menunggu Verifikasi RW
    if (
        st === 'menunggu verifikasi rw' ||
        st === 'menunggu_verifikasi_rw' ||
        st === 'diproses rw' ||
        st === 'menunggu persetujuan rw' ||
        st === 'disetujui rt / menunggu verifikasi rw' ||
        st === 'menunggu verifikasi ketua rw' ||
        (st.includes('menunggu') && st.includes('rw')) ||
        (st.includes('verifikasi') && st.includes('rw'))
    ) {
        return `<span class="bg-sky-50 text-sky-700 border border-sky-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #f0f9ff; color: #0369a1; border: 1px solid rgba(186, 230, 253, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-sky-500" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #0ea5e9; display: inline-block;"></span>${label}</span>`;
    }

    // 3. Selesai / Disetujui / Selesai (Disetujui RW) / Aktif / Tetap
    if (
        st === 'selesai' ||
        st === 'disetujui' ||
        st === 'selesai (disetujui rw)' ||
        st === 'disetujui rw' ||
        st === 'disetujui rt' ||
        st === 'selesai_disetujui_rw' ||
        st === 'aktif' ||
        st === 'tetap' ||
        st.includes('selesai') ||
        st.includes('disetujui')
    ) {
        return `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #ecfdf5; color: #047857; border: 1px solid rgba(167, 243, 208, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #10b981; display: inline-block;"></span>${label}</span>`;
    }

    // 4. Ditolak RT / Ditolak RW / Ditolak / Nonaktif / Batal
    if (
        st === 'ditolak rt' ||
        st === 'ditolak rw' ||
        st === 'ditolak' ||
        st === 'nonaktif' ||
        st === 'tidak aktif' ||
        st.includes('ditolak') ||
        st.includes('batal')
    ) {
        return `<span class="bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #fff1f2; color: #be123c; border: 1px solid rgba(254, 205, 211, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-rose-500" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #f43f5e; display: inline-block;"></span>${label}</span>`;
    }

    // 5. Perlu Diperbaiki / Revisi (Orange Pastel)
    if (st.includes('perbaikan') || st.includes('revisi') || st.includes('perlu diperbaiki')) {
        return `<span class="bg-orange-50 text-orange-700 border border-orange-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #fff7ed; color: #c2410c; border: 1px solid rgba(254, 215, 170, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #f97316; display: inline-block;"></span>${label}</span>`;
    }

    // 6. Ditindaklanjuti / Sedang Berlangsung / Dalam Penanganan (Indigo/Purple Pastel)
    if (st.includes('tindak') || st.includes('berlangsung') || st.includes('penanganan') || st.includes('proses')) {
        return `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #eef2ff; color: #4338ca; border: 1px solid rgba(199, 210, 254, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #6366f1; display: inline-block;"></span>${label}</span>`;
    }

    // 7. Default Neutral Pill Badge
    return `<span class="bg-slate-50 text-slate-700 border border-slate-200/80 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5" style="background-color: #f8fafc; color: #334155; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; white-space: nowrap;"><span class="w-1.5 h-1.5 rounded-full bg-slate-400" style="width: 6px; height: 6px; border-radius: 9999px; background-color: #94a3b8; display: inline-block;"></span>${label}</span>`;
}

// Global window registration
if (typeof window !== 'undefined') {
    window.renderStatusBadge = renderStatusBadge;
}

export default renderStatusBadge;

