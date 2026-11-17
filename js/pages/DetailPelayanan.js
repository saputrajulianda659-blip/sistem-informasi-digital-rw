// js/pages/DetailPelayanan.js - Standarisasi Detail Pelayanan Multi-RT
import { 
    renderPelayananDetail, 
    setupPelayananDetailEvents, 
    getCleanRT,
    checkAccessPengajuan,
    fetchDetail,
    renderDetailContent,
    renderErrorAccess,
    openDocumentPreviewModal,
    openInNewTab,
    parseDokumenList
} from './PelayananDetail.js';

export const renderDetailPelayanan = renderPelayananDetail;
export const setupDetailPelayananEvents = setupPelayananDetailEvents;
export {
    renderPelayananDetail,
    setupPelayananDetailEvents,
    getCleanRT,
    checkAccessPengajuan,
    fetchDetail,
    renderDetailContent,
    renderErrorAccess,
    openDocumentPreviewModal,
    openInNewTab,
    parseDokumenList
};
export * from './PelayananDetail.js';
