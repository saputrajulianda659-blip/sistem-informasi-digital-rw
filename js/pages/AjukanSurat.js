// js/pages/AjukanSurat.js - Form Submit Pengajuan Surat Warga Standarisasi Multi-RT
import { renderPelayananForm, setupPelayananFormEvents, getCleanRT } from './PelayananForm.js';
import { createPengajuan } from '../models/Pelayanan.js';

export const renderAjukanSurat = renderPelayananForm;
export const setupAjukanSuratEvents = setupPelayananFormEvents;
export { getCleanRT, createPengajuan };
export * from './PelayananForm.js';
