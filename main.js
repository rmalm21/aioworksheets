window.formatLongNote = function(text, limit = 20) {
    if(!text || text === '-') return '-'; if(text.length <= limit) return text;
    let preview = text.substring(0, limit) + '...';
    let encodedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    let encodedPreview = preview.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `<span class="note-preview">${encodedPreview}</span><span class="note-full" style="display:none;">${encodedText}</span><button class="btn btn-secondary read-more-btn" style="padding: 2px 6px; font-size: 10px; border-radius: 4px; margin-left: 5px; cursor: pointer; border: 1px solid #ccc; background: #eef4fc; color: #0050A0; font-weight: bold;" onclick="let p = this.previousElementSibling.previousElementSibling; let f = this.previousElementSibling; if(f.style.display === 'none') { f.style.display = 'inline'; p.style.display = 'none'; this.innerText = 'Tutup ▴'; } else { f.style.display = 'none'; p.style.display = 'inline'; this.innerText = 'Detail ▾'; }">Detail ▾</button>`;
};

function getClaimCurrency(item) { return normalizeCurrency(item && item.mataUang ? item.mataUang : 'IDR'); }
function formatClaimMoney(item, value = null) {
    return formatMoney(value === null ? Number(item && item.totalHeader) || 0 : value, getClaimCurrency(item));
}
function formatPaymentDate(item) {
    if(!item) return '-';
    if(item.paymentDate) return String(item.paymentDate);
    if(item.paymentAt) return String(item.paymentAt).replace(',', '').split(' ')[0] || '-';
    if(Number(item.paymentAtMs)) return new Date(Number(item.paymentAtMs)).toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' });
    return '-';
}
function formatPaymentReference(item) {
    return item && item.paymentReference ? String(item.paymentReference).trim() : '-';
}
function formatWorkflowDate(item, field, msField) {
    if(!item) return '-';
    if(item[field]) return String(item[field]).replace(',', '').split(' ')[0] || '-';
    if(Number(item[msField])) return new Date(Number(item[msField])).toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' });
    return '-';
}
function formatActorUsername(value) {
    return typeof getShortUsername === 'function' ? getShortUsername(value) : String(value || '-').split('@')[0];
}
function formatActorUsernameHtml(value) {
    return escapeTimelineText(formatActorUsername(value));
}
function addAmountToCurrencyMap(map, item, amount = null) {
    const code = getClaimCurrency(item);
    map[code] = (map[code] || 0) + (amount === null ? Number(item.totalHeader) || 0 : Number(amount) || 0);
    return map;
}
function getCurrencyTotals(items) {
    return (items || []).reduce((map, item) => addAmountToCurrencyMap(map, item), {});
}
function formatCurrencyTotals(totals, html = false) {
    const entries = Object.entries(totals || {}).filter(([currency,value]) => !amountsEqual(value, 0, currency)).sort(([a],[b]) => a.localeCompare(b));
    if(entries.length === 0) return '-';
    const separator = html ? '<br>' : ' | ';
    return entries.map(([currency, value]) => formatMoney(value, currency)).join(separator);
}

const REPORTING_DAY_MS = 24 * 60 * 60 * 1000;
function parseReportingDate(value) {
    if(value && typeof value.getTime === 'function' && !Number.isNaN(value.getTime())) {
        const date = new Date(value); date.setHours(0,0,0,0); return date;
    }
    const text = String(value || '').trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(match) {
        const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        if(date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1])) return date;
    }
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(match) {
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if(date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3])) return date;
    }
    return null;
}

function normalizeReportingRange(range) {
    if(!Array.isArray(range) || range.length !== 2) return null;
    const start = parseReportingDate(range[0]);
    const end = parseReportingDate(range[1]);
    if(!start || !end) return null;
    const ordered = start <= end ? [start, end] : [end, start];
    ordered[0].setHours(0,0,0,0); ordered[1].setHours(23,59,59,999);
    return ordered;
}

function getReportingPresetRange(preset, baseDate = new Date()) {
    const today = parseReportingDate(baseDate) || new Date();
    let start = null, end = new Date(today);
    if(preset === 'day') start = new Date(today);
    else if(preset === 'week' || preset === 'last_7') { start = new Date(today); start.setDate(start.getDate() - 6); }
    else if(preset === 'last_30') { start = new Date(today); start.setDate(start.getDate() - 29); }
    else if(preset === 'month' || preset === 'this_month') { start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
    else if(preset === 'last_month') { start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); }
    else if(preset === 'last_3_months') { start = new Date(today.getFullYear(), today.getMonth() - 2, 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
    else if(preset === 'this_quarter') { const quarter = Math.floor(today.getMonth() / 3); start = new Date(today.getFullYear(), quarter * 3, 1); end = new Date(today.getFullYear(), quarter * 3 + 3, 0); }
    else if(preset === 'year' || preset === 'this_year') { start = new Date(today.getFullYear(), 0, 1); end = new Date(today.getFullYear(), 11, 31); }
    else return null;
    return normalizeReportingRange([start, end]);
}

function reportingDateForClaim(item) {
    // Kebijakan P1: seluruh dashboard memakai tanggal submit sebagai basis.
    // tglProses hanya fallback untuk data legacy yang belum mempunyai tglSubmit.
    return parseReportingDate(item && (item.tglSubmit || item.tglProses));
}

function isDateInReportingRange(date, range) {
    const normalized = normalizeReportingRange(range);
    const target = parseReportingDate(date);
    return !!(normalized && target && target.getTime() >= normalized[0].getTime() && target.getTime() <= normalized[1].getTime());
}

function filterClaimsByReportingRange(items, range) {
    const normalized = normalizeReportingRange(range);
    if(!normalized) return [...(items || [])];
    return (items || []).filter(item => isDateInReportingRange(reportingDateForClaim(item), normalized));
}

function getPreviousReportingRange(range) {
    const normalized = normalizeReportingRange(range);
    if(!normalized) return null;
    const [start, end] = normalized;
    const fullYear = start.getMonth() === 0 && start.getDate() === 1 && end.getMonth() === 11 && end.getDate() === 31;
    const fullMonth = start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() && start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    if(fullYear) return normalizeReportingRange([new Date(start.getFullYear() - 1, 0, 1), new Date(start.getFullYear() - 1, 11, 31)]);
    if(fullMonth) return normalizeReportingRange([new Date(start.getFullYear(), start.getMonth() - 1, 1), new Date(start.getFullYear(), start.getMonth(), 0)]);
    const inclusiveDays = Math.round((parseReportingDate(end).getTime() - parseReportingDate(start).getTime()) / REPORTING_DAY_MS) + 1;
    const previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - inclusiveDays + 1);
    return normalizeReportingRange([previousStart, previousEnd]);
}

function getManagementComparisonRanges(baseDate = new Date()) {
    const today = parseReportingDate(baseDate) || new Date();
    const day = today.getDate();
    const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const previousYearMonthLastDay = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0).getDate();
    return {
        mtd: normalizeReportingRange([new Date(today.getFullYear(), today.getMonth(), 1), today]),
        lmtd: normalizeReportingRange([new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth() - 1, Math.min(day, previousMonthLastDay))]),
        sply: normalizeReportingRange([new Date(today.getFullYear() - 1, today.getMonth(), 1), new Date(today.getFullYear() - 1, today.getMonth(), Math.min(day, previousYearMonthLastDay))])
    };
}

window.getReportingPresetRange = getReportingPresetRange;
window.filterClaimsByReportingRange = filterClaimsByReportingRange;

function collectDetailRowsFromForm(data) {
    const currency = getClaimCurrency(data);
    const rows = [];
    document.querySelectorAll('#tbody-detail-items tr').forEach((tr, index) => {
        let desc = tr.querySelector('.det-desc').value.trim();
        let hal = tr.querySelector('.det-hal').value.trim();
        let amtNotaRaw = tr.querySelector('.det-amt-n').value.trim();
        let amtClaimRaw = tr.querySelector('.det-amt-c').value.trim();
        let amtNota = parseCurrencyAmount(amtNotaRaw, currency);
        let amtClaim = amtClaimRaw === '' ? null : parseCurrencyAmount(amtClaimRaw, currency);
        if(desc || amtNota !== 0 || hal || amtClaimRaw !== '') {
            rows.push({
                rowId: tr.dataset.rowId || `detail-${data.id}-${Date.now()}-${index}`,
                hal, desc, tgl: tr.querySelector('.det-tgl').value.trim(),
                amtNota, amtClaim, note: tr.querySelector('.det-note').value.trim()
            });
        }
    });
    return rows;
}

function validateDetailRowsForFinal(data, rows) {
    const currency = getClaimCurrency(data);
    const errors = [];
    if(!rows.length) errors.push('Minimal satu baris detail wajib diisi.');
    rows.forEach((row, index) => {
        const notaValue = typeof row.amtNota === 'number' ? row.amtNota : parseCurrencyAmount(row.amtNota, currency);
        const claimValue = row.amtClaim === null || row.amtClaim === undefined || row.amtClaim === '' ? null : (typeof row.amtClaim === 'number' ? row.amtClaim : parseCurrencyAmount(row.amtClaim, currency));
        if(!row.desc) errors.push(`Baris ${index + 1}: deskripsi wajib diisi.`);
        if(!isValidDateString(row.tgl)) errors.push(`Baris ${index + 1}: tanggal transaksi tidak valid.`);
        if(!(notaValue > 0)) errors.push(`Baris ${index + 1}: Amount Nota harus lebih dari 0.`);
        if(claimValue !== null && claimValue < 0) errors.push(`Baris ${index + 1}: Amount Claim tidak boleh negatif.`);
    });
    const effectiveTotal = rows.reduce((sum, row) => {
        const notaValue = typeof row.amtNota === 'number' ? row.amtNota : parseCurrencyAmount(row.amtNota, currency);
        const claimMissing = row.amtClaim === null || row.amtClaim === undefined || row.amtClaim === '';
        const claimValue = claimMissing ? null : (typeof row.amtClaim === 'number' ? row.amtClaim : parseCurrencyAmount(row.amtClaim, currency));
        return sum + (claimValue === null ? notaValue : claimValue);
    }, 0);
    if(!amountsEqual(effectiveTotal, Number(data.totalHeader) || 0, currency)) {
        errors.push(`Total detail efektif ${formatMoney(effectiveTotal, currency)} belum sama dengan header ${formatClaimMoney(data)}.`);
    }
    return errors;
}

function validateClaimForCompletion(item) {
    const errors = [];
    const currency = getClaimCurrency(item);
    if(!item.nama || !item.nik) errors.push('NIK dan nama belum lengkap.');
    if(!(item.noPR || item.extNo || item.docNo)) errors.push('Nomor referensi belum diisi.');
    if(!isValidDateString(item.tglSubmit) || !isValidDateString(item.tglProses)) errors.push('Tanggal proses/submit tidak valid.');
    if(!(Number(item.totalHeader) > 0)) errors.push('Total header harus lebih dari 0.');
    if(!item.mataUang || normalizeCurrency(item.mataUang) !== String(item.mataUang).toUpperCase()) errors.push('Mata uang belum valid.');

    if(!item.isQuick) {
        const lines = Array.isArray(item.lines) ? item.lines : [];
        if(!lines.length) errors.push('Minimal satu line item wajib tersedia.');
        lines.forEach((line, index) => {
            if(!line.gl) errors.push(`Line ${index + 1}: kategori/GL belum diisi.`);
            if(!isValidDateString(line.tgl)) errors.push(`Line ${index + 1}: tanggal tidak valid.`);
            if(amountsEqual(Number(line.amount) || 0, 0, currency)) errors.push(`Line ${index + 1}: nominal tidak boleh 0.`);
        });
        const lineTotal = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
        if(!amountsEqual(lineTotal, Number(item.totalHeader) || 0, currency)) errors.push('Total header belum sama dengan total line item.');
    }

    if(item.detailNota) {
        if(item.detailNota.status !== 'Final') errors.push('Rincian nota masih berstatus Draft.');
        errors.push(...validateDetailRowsForFinal(item, item.detailNota.rows || []));
    }
    return [...new Set(errors)];
}

function showCompletionErrors(item, errors) {
    const ref = item.noPR || item.extNo || item.id;
    customAlert(`Data ${ref} belum dapat diselesaikan:\n• ${errors.join('\n• ')}`);
}

function isWorkflowStatusLog(log) {
    const status = String(log && log.status || '');
    return /^(In Process|Waiting Approval|Posted|Paid|Hold|Returned by Finance|Cancelled Paid|Released Hold|Revisi|Confirm|Reversed to (In Process|Posted))/i.test(status);
}

window.undoLastStatus = function() {
    if(!requireAdmin()) return;
    let id = parseInt(document.getElementById('modal-claim-id').value);
    let index = typeof dbRekap !== 'undefined' ? dbRekap.findIndex(i => i.id === id) : -1;
    if(index === -1) return;
    let item = dbRekap[index];
    let statusLogs = (item.historyLog || []).filter(isWorkflowStatusLog); 
    if(statusLogs.length <= 1) return showToast('Status pertama tidak dapat dibatalkan.', 'error');
    
    customConfirm("Apakah Anda yakin ingin membatalkan status terakhir? Jejak sebelumnya tetap disimpan untuk keperluan audit.", async () => {
        const backup = clonePlain(item);
        const lastStatusLog = statusLogs[statusLogs.length - 1];
        const prevStatusLog = statusLogs[statusLogs.length - 2];

        if(prevStatusLog) {
            let rawStatus = prevStatusLog.status;
            let timeMsFallback = typeof parseHistoryTime === 'function' ? parseHistoryTime(prevStatusLog.time).getTime() : Date.now();
            if(rawStatus.includes('Revisi')) {
                item.statusClaim = 'Revisi'; item.reviseStep = rawStatus.split(' - ')[1] || ''; item.reviseNote = prevStatusLog.note || ''; item.reviseTime = prevStatusLog.time; item.reviseTimestamp = timeMsFallback; item.isArchived = false;
            } else if(rawStatus.includes('Waiting Approval')) {
                item.statusClaim = 'Waiting Approval'; item.reviseStep = null; item.reviseNote = null; item.reviseTime = null; item.reviseTimestamp = null; item.isArchived = false;
            } else if(rawStatus.includes('Posted')) {
                item.statusClaim = 'Posted'; item.reviseStep = null; item.reviseNote = null; item.reviseTime = null; item.reviseTimestamp = null; item.isArchived = true;
                item.postedAt = prevStatusLog.time; item.postedBy = prevStatusLog.by || sessionUser;
                if(!item.workflowTimestamps) item.workflowTimestamps = {};
                item.workflowTimestamps.completedAt = timeMsFallback;
            } else {
                item.statusClaim = 'In Process'; item.reviseStep = null; item.reviseNote = null; item.reviseTime = null; item.reviseTimestamp = null; item.isArchived = false;
            }
        }
        if(!isFinalClaimStatus(item.statusClaim)) {
            delete item.postedAt; delete item.postedBy;
            if(item.workflowTimestamps) delete item.workflowTimestamps.completedAt;
        }
        const undoTime = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
        item.historyLog.push({status: item.statusClaim, time: undoTime, by: sessionUser, note: `Pembatalan status terakhir: ${lastStatusLog.status}. Jejak asli tidak dihapus.`});
        try { await saveDataToLocal({ claimIds: [id] }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            dbRekap[index] = backup; await dbSyncClaimRows([id]).catch(() => {});
            return showToast('Pembatalan status gagal disimpan ke perangkat.', 'error');
        }
        logActivity(sessionUser, `Pembatalan Status Klaim ID ${id} (jejak audit dipertahankan)`);
        openStatusModal(id); refreshActiveViewSilently(); showToast('Status terakhir berhasil dibatalkan.', 'success');
    });
};

// --- SEARCH & HOTKEY ---
window.quickFilterTableRows = function(inputId, tableContainerId) {
    let keyword = document.getElementById(inputId).value.toLowerCase();
    let container = document.getElementById(tableContainerId);
    if (!container) return;
    container.querySelectorAll('table tbody tr').forEach(tr => tr.style.display = tr.innerText.toLowerCase().includes(keyword) ? '' : 'none');
};

document.addEventListener('keydown', function(e) {
    let filterModal = document.getElementById('excel-filter-modal');
    if (filterModal && filterModal.style.display === 'block') {
        if (e.key === 'Enter') { e.preventDefault(); let btn = filterModal.querySelector('button.btn-success, button[onclick*="apply"]'); if(btn) btn.click(); }
        else if (e.key === 'Escape') { e.preventDefault(); let mod = filterModal.getAttribute('data-module'); if(mod && typeof clearAllFilters === 'function') clearAllFilters(mod); filterModal.style.display = 'none'; }
    }
});

// --- DARK MODE LOGIC ---
function renderDarkModeButton() {
    const btn = document.getElementById('btn-dark-mode');
    if(!btn) return;
    const darkActive = document.body.classList.contains('dark-mode');
    const icon = btn.querySelector('#dark-mode-icon');
    const label = btn.querySelector('#dark-mode-label');
    if(icon) icon.textContent = darkActive ? '☀' : '🌙';
    if(label) label.textContent = darkActive ? 'Terang' : 'Gelap';
    btn.classList.toggle('is-dark-active', darkActive);
    btn.setAttribute('aria-pressed', darkActive ? 'true' : 'false');
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(btn);
}

function toggleDarkMode() {
    let body = document.body;
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('otsukaDarkMode', 'true');
    } else {
        localStorage.setItem('otsukaDarkMode', 'false');
    }
    renderDarkModeButton();
}
// Init Dark Mode
if (localStorage.getItem('otsukaDarkMode') === 'true') {
    document.body.classList.add('dark-mode');
}
onWorksheetReady(renderDarkModeButton);

function setCloudSyncButtonState(state = 'live') {
    const btn = document.getElementById('btn-cloud-sync');
    if(!btn) return;
    const states = {
        live: { icon:'●', label:'Delta' },
        busy: { icon:'↻', label:'Sinkronkan' },
        error: { icon:'!', label:'Gagal' }
    };
    const view = states[state] || states.live;
    const icon = btn.querySelector('#cloud-sync-icon');
    const label = btn.querySelector('#cloud-sync-label');
    btn.dataset.syncState = state;
    if(icon) icon.textContent = view.icon;
    if(label) label.textContent = view.label;
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(btn);
}
window.setCloudSyncButtonState = setCloudSyncButtonState;
onWorksheetReady(() => setCloudSyncButtonState('live'));

// --- SMART BACK BUTTON (V23) ---
window.menuHistoryStack = [];
function goBackMenu() {
    if (window.menuHistoryStack.length > 0) {
        let prevMenu = window.menuHistoryStack.pop();
        changeMenu(prevMenu, true);
    }
}
function updateBackButtonVisibility() {
    let backBtn = document.getElementById('btn-global-back');
    // Tombolnya memakai grid agar ikon panahnya tetap di tengah kotak.
    if (backBtn) backBtn.style.display = (window.menuHistoryStack.length > 0 && window.currentOpenMenu !== 'home') ? 'grid' : 'none';
}
window.exportStatistikExcel = function() {
    const statisticRange = normalizeReportingRange(window.filterDatesStatistik);
    const analyticsSource = dbRekap.filter(item => typeof isClaimActiveForAnalytics === 'function' ? isClaimActiveForAnalytics(item) : String(item && item.statusClaim || '') !== 'Canceled');
    let baseStat = filterClaimsByReportingRange(analyticsSource, window.filterDatesStatistik);

    if (baseStat.length === 0) return showToast("Tidak terdapat data pada periode Statistik yang dipilih.", "error");

    let slaCount = { hijau: 0, kuning: 0, merah: 0 };
    baseStat.forEach(d => { const category = getSlaCategory(calculateSLADays(d)); if (category.key === 'green') slaCount.hijau++; else if (category.key === 'warning') slaCount.kuning++; else slaCount.merah++; });
    let totalSla = slaCount.hijau + slaCount.kuning + slaCount.merah;
    const slaAchievement = totalSla ? ((slaCount.hijau + slaCount.kuning) / totalSla) * 100 : 0;
    const companyTarget = Number(window.slaSettings.achievementTargetPercent) || 90;
    let slaSheetData = [
        { "Kategori Performa SLA": `Sangat Baik (≤ ${window.slaSettings.greenMaxDays} Hari)`, "Jumlah Dokumen": slaCount.hijau, "Persentase": totalSla ? ((slaCount.hijau/totalSla)*100).toFixed(1) + "%" : "0%", "Target Perusahaan": `${companyTarget}%`, "Status Target": "-" },
        { "Kategori Performa SLA": `Perlu Perhatian (${window.slaSettings.greenMaxDays + 1}-${window.slaSettings.warningMaxDays} Hari)`, "Jumlah Dokumen": slaCount.kuning, "Persentase": totalSla ? ((slaCount.kuning/totalSla)*100).toFixed(1) + "%" : "0%", "Target Perusahaan": `${companyTarget}%`, "Status Target": "-" },
        { "Kategori Performa SLA": `Terlambat (> ${window.slaSettings.warningMaxDays} Hari)`, "Jumlah Dokumen": slaCount.merah, "Persentase": totalSla ? ((slaCount.merah/totalSla)*100).toFixed(1) + "%" : "0%", "Target Perusahaan": `${companyTarget}%`, "Status Target": "-" },
        { "Kategori Performa SLA": "Pencapaian SLA", "Jumlah Dokumen": slaCount.hijau + slaCount.kuning, "Persentase": `${slaAchievement.toFixed(1)}%`, "Target Perusahaan": `${companyTarget}%`, "Status Target": slaAchievement >= companyTarget ? "Tercapai" : "Belum tercapai" },
        { "Kategori Performa SLA": "TOTAL KESELURUHAN", "Jumlah Dokumen": totalSla, "Persentase": "100%", "Target Perusahaan": `${companyTarget}%`, "Status Target": "-" }
    ];

    let gMode = document.getElementById('trend-grouping') ? document.getElementById('trend-grouping').value : 'daily';
    let trendMap = {}; 
    baseStat.forEach(d => { let gInfo = getTrendGroupInfo(d.tglSubmit || d.tglProses, gMode); if(!trendMap[gInfo.sortKey]) trendMap[gInfo.sortKey] = { display: gInfo.display, count: 0 }; trendMap[gInfo.sortKey].count++; });
    let sortedKeys = Object.keys(trendMap).sort((a, b) => a.localeCompare(b));
    let trendSheetData = sortedKeys.length > 0 ? sortedKeys.map(k => ({ "Periode Waktu": trendMap[k].display, "Volume Klaim (Dokumen)": trendMap[k].count })) : [{"Periode Waktu": "Tidak ada data", "Volume Klaim (Dokumen)": 0}];

    let basePengaju = filterClaimsByReportingRange(analyticsSource, window.filterDatesPengaju);
    let empMap = {};
    basePengaju.forEach(d => {
        let key = `${d.nik}_${d.nama}`;
        if(!empMap[key]) empMap[key] = { nik: d.nik, nama: d.nama, count: 0, totals: {} };
        empMap[key].count++;
        addAmountToCurrencyMap(empMap[key].totals, d);
    });
    let empList = Object.values(empMap).sort((a, b) => b.count - a.count || a.nama.localeCompare(b.nama));
    let empSheetData = empList.length > 0 ? empList.flatMap((emp, idx) => Object.entries(emp.totals).sort(([a],[b]) => a.localeCompare(b)).map(([currency, total]) => ({
        "Peringkat berdasarkan Frekuensi": idx + 1, "NIK Karyawan": emp.nik, "Nama Karyawan": emp.nama,
        "Frekuensi Pengajuan": emp.count, "Mata Uang": currency, "Total Nominal": total
    }))) : [{"Peringkat berdasarkan Frekuensi": "-", "NIK Karyawan": "-", "Nama Karyawan": "Tidak ada data", "Frekuensi Pengajuan": 0, "Mata Uang": "-", "Total Nominal": 0}];

    let baseRevise = filterClaimsByReportingRange(analyticsSource, window.filterDatesRevisi);
    let reviseMap = {};
    baseRevise.forEach(d => {
        let slaDays = calculateSLADays(d), revCount = 0;
        if(d.historyLog) d.historyLog.forEach(log => { if(log.status.toLowerCase().includes('revisi')) revCount++; });
        if(d.statusClaim === 'Revisi' && revCount === 0) revCount = 1;
        if(revCount > 0) { let key = d.nik + '_' + d.nama; if(!reviseMap[key]) reviseMap[key] = { nik: d.nik, nama: d.nama, count: 0, totalSLA: 0, docCount: 0 }; reviseMap[key].count += revCount; reviseMap[key].totalSLA += slaDays; reviseMap[key].docCount++; }
    });
    let revList = Object.values(reviseMap).sort((a, b) => b.count - a.count);
    let revSheetData = revList.length > 0 ? revList.map((emp, idx) => ({ "Peringkat": idx + 1, "NIK Karyawan": emp.nik, "Nama Karyawan": emp.nama, "Jumlah Revisi": emp.count, "Avg SLA (Hari Kerja)": parseFloat((emp.totalSLA / emp.docCount).toFixed(1)) })) : [{"Peringkat": "-", "NIK Karyawan": "-", "Nama Karyawan": "Tidak ada data revisi", "Jumlah Revisi": 0, "Avg SLA (Hari Kerja)": 0}];

    const statusMap = {};
    baseStat.forEach(item => {
        const status = item.statusClaim || 'Tanpa Status';
        if(!statusMap[status]) statusMap[status] = { count: 0, totals: {} };
        statusMap[status].count++;
        addAmountToCurrencyMap(statusMap[status].totals, item);
    });
    const statusSheetData = Object.entries(statusMap).sort(([a],[b]) => a.localeCompare(b)).flatMap(([status, info]) =>
        Object.entries(info.totals).sort(([a],[b]) => a.localeCompare(b)).map(([currency, amount]) => ({
            'Status Claim': status, 'Jumlah Claim': info.count, 'Mata Uang': currency, 'Total Amount': amount
        }))
    );
    const rangeLabel = range => {
        const normalized = normalizeReportingRange(range);
        return normalized ? `${normalized[0].toLocaleDateString('id-ID')} s.d. ${normalized[1].toLocaleDateString('id-ID')}` : 'Keseluruhan';
    };
    const exportMetadata = [
        {'Komponen': 'Rapor SLA, Tren, Status & Valas', 'Periode Tgl Submit': rangeLabel(window.filterDatesStatistik)},
        {'Komponen': 'Top Pengaju', 'Periode Tgl Submit': rangeLabel(window.filterDatesPengaju)},
        {'Komponen': 'Top Revisi', 'Periode Tgl Submit': rangeLabel(window.filterDatesRevisi)},
        {'Komponen': 'Waktu Export', 'Periode Tgl Submit': new Date().toLocaleString('id-ID')},
        {'Komponen': 'Diekspor Oleh', 'Periode Tgl Submit': getCurrentActorUsername()}
    ];

    showToast("Menyiapkan dokumen manajerial...", "info");
    setTimeout(() => {
        let wb = XLSX.utils.book_new();
        let wsSLA = XLSX.utils.json_to_sheet(slaSheetData); let wsTrend = XLSX.utils.json_to_sheet(trendSheetData); let wsEmp = XLSX.utils.json_to_sheet(empSheetData); let wsRev = XLSX.utils.json_to_sheet(revSheetData); let wsStatus = XLSX.utils.json_to_sheet(statusSheetData.length ? statusSheetData : [{'Status Claim':'Tidak ada data','Jumlah Claim':0,'Mata Uang':'-','Total Amount':0}]); let wsMeta = XLSX.utils.json_to_sheet(exportMetadata);
        wsSLA['!cols'] = [{wch: 35}, {wch: 20}, {wch: 15}]; wsTrend['!cols'] = [{wch: 25}, {wch: 25}]; wsEmp['!cols'] = [{wch: 28}, {wch: 15}, {wch: 35}, {wch: 22}, {wch: 14}, {wch: 25}]; wsRev['!cols'] = [{wch: 12}, {wch: 15}, {wch: 35}, {wch: 22}, {wch: 22}]; 
        XLSX.utils.book_append_sheet(wb, wsSLA, "1. Rapor SLA"); XLSX.utils.book_append_sheet(wb, wsTrend, "2. Tren Volume"); XLSX.utils.book_append_sheet(wb, wsEmp, "3. Top Pengaju"); XLSX.utils.book_append_sheet(wb, wsRev, "4. Top Revisi"); XLSX.utils.book_append_sheet(wb, wsStatus, "5. Status & Valas"); XLSX.utils.book_append_sheet(wb, wsMeta, "6. Metadata");
        let dateSuffix = statisticRange ? `${statisticRange[0].toLocaleDateString('id-ID').replace(/\//g,'-')}_sd_${statisticRange[1].toLocaleDateString('id-ID').replace(/\//g,'-')}` : "Keseluruhan";
        XLSX.writeFile(wb, `Laporan_Analitik_Klaim_${dateSuffix}.xlsx`);
        logActivity(sessionUser, `Ekspor Statistik ke Excel: ${baseStat.length} klaim`).catch(() => {});
        showToast("Laporan Excel berhasil diunduh.", "success");
    }, 500);
};
// --- HELPER V32 & V33 ---
window.getReturningReason = function(item) {
    if (item.historyLog && item.historyLog.length > 0) {
        // BACA MAJU: Dari index 0 (log paling awal/tua)
        for (let i = 0; i < item.historyLog.length; i++) {
            let log = item.historyLog[i];
            if (log.status.toLowerCase().includes('revisi') && log.note && log.note.trim() !== "") return log.note;
        }
    }
    return (item.reviseNote && item.reviseNote.trim() !== "") ? item.reviseNote : "-";
};

window.getAdjustmentHistoryText = function(item) {
    let texts = []; let stripHTML = (str) => (str || "").toString().replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    if (item.adjustments && item.adjustments.length > 0) {
        item.adjustments.forEach((adj, i) => {
            let note = stripHTML(adj.note || adj.alasan || adj.reason || '-');
            let nominalInfo = (adj.nominalLama !== undefined && adj.nominalBaru !== undefined) ? `(${formatMoney(adj.nominalLama, getClaimCurrency(item))} ➔ ${formatMoney(adj.nominalBaru, getClaimCurrency(item))}) ` : '';
            texts.push(`[Adjust ${i+1}] ${adj.date || ''} ${nominalInfo}Alasan: ${note}`);
        });
    }
    if (item.historyLog && item.historyLog.length > 0) {
        item.historyLog.forEach(log => {
            let stat = (log.status || "").toLowerCase();
            if (stat.includes('adjust') || stat.includes('koreksi') || stat.includes('pembaruan')) {
                let note = stripHTML(log.note || '-');
                if (!texts.some(t => t.includes(note))) texts.push(`[Riwayat: ${log.time}] Catatan: ${note}`);
            }
        });
    }
    return texts.length > 0 ? texts.join(" | ") : "-";
};

// --- SILENT REFRESH V27 ---
window.refreshActiveViewSilently = function() {
    // Statistik/dashboard dan estimasi storage cukup dihitung saat browser idle.
    // Render langsung hanya dilakukan untuk layar yang sedang dibuka.
    schedulePostSaveMaintenance();
    let menu = window.currentOpenMenu;
    if (menu === 'claim-rekap') renderRekapTable();
    else if (menu === 'in-process' && typeof renderInProcessTable === 'function') renderInProcessTable();
    else if (menu === 'waiting-approval') renderWaitingTable();
    else if (menu === 'claim-revise') renderReviseConfirm();
    else if (menu === 'history') renderHistoryTable();
    else if (menu === 'canceled' && typeof renderCanceledTable === 'function') renderCanceledTable();
    else if (menu === 'super-find') renderSuperFindTable();
    else if (menu === 'statistik' && typeof renderStatistikData === 'function') renderStatistikData();
    else if (menu === 'claim-quick' && typeof updateQuickWorkflowControls === 'function') updateQuickWorkflowControls();
    else if (menu === 'master-karyawan') renderMasterKaryawan();
    else if (menu === 'master-gl') renderMasterGL();
    else if (menu === 'claim-catatan-detail' && typeof renderCatatanDetailTable === 'function') renderCatatanDetailTable();
    
};

function filterClaimsByProcessPeriod(items, range) {
    const normalized = normalizeReportingRange(range);
    if(!normalized) return [...(items || [])];
    const startMs = normalized[0].getTime();
    const endMs = normalized[1].getTime();
    return (items || []).filter(item => {
        const processDate = parseReportingDate(item && item.tglProses);
        return !!(processDate && processDate.getTime() >= startMs && processDate.getTime() <= endMs);
    });
}
window.filterClaimsByProcessPeriod = filterClaimsByProcessPeriod;

function filterClaimsByRtpPeriod(items, range) {
    const normalized = normalizeReportingRange(range);
    if(!normalized) return [...(items || [])];
    const startMs = normalized[0].getTime();
    const endMs = normalized[1].getTime();
    return (items || []).filter(item => {
        const rtpDate = typeof getClaimRtpDate === 'function' ? getClaimRtpDate(item) : null;
        return !!(rtpDate && rtpDate.getTime() >= startMs && rtpDate.getTime() <= endMs);
    });
}
window.filterClaimsByRtpPeriod = filterClaimsByRtpPeriod;

function renderFinanceQueueSummaries() {
    const summary = document.getElementById('finance-queue-summary-history');
    if(!summary) return;
    if(typeof canManageFinanceWorkflow !== 'function' || !canManageFinanceWorkflow()) {
        summary.style.display = 'none';
        return;
    }
    const historyBase = dbRekap.filter(item => isCurrentHistoryClaim(item));
    const periodClaims = filterClaimsByRtpPeriod(historyBase, window.filterDatesHistory);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const counts = {
        ready: periodClaims.filter(item => item.statusClaim === 'Posted').length,
        hold: periodClaims.filter(item => item.statusClaim === 'Hold').length,
        'paid-today': periodClaims.filter(item => item.statusClaim === 'Paid' && Number(item.paymentAtMs) >= today.getTime() && Number(item.paymentAtMs) < tomorrow.getTime()).length
    };
    summary.style.display = 'grid';
    Object.entries(counts).forEach(([key, value]) => {
        const target = summary.querySelector(`[data-queue-count="${key}"]`);
        if(target) target.innerText = value;
    });
}

// --- HELPER V4 & V6 ---
function getTglFeedback(item) {
    if (!item.historyLog) return "-";
    // BACA MAJU: Cari kapan pertama kali kena Revisi
    for(let i = 0; i < item.historyLog.length; i++) { 
        if(item.historyLog[i].status.toLowerCase().includes('revisi')) { 
            let fullTime = item.historyLog[i].time;
            if (!fullTime) return "-";
            
            // Kamus penerjemah bulan teks jadi angka
            let months = {'Jan':'01', 'Feb':'02', 'Mar':'03', 'Apr':'04', 'Mei':'05', 'May':'05', 'Jun':'06', 'Jul':'07', 'Agu':'08', 'Aug':'08', 'Sep':'09', 'Okt':'10', 'Oct':'10', 'Nov':'11', 'Des':'12', 'Dec':'12'};
            
            // Pecah teks waktu berdasarkan spasi
            let parts = fullTime.replace(/,/g, '').split(' ');
            if(parts.length >= 3) {
                let d = parts[0].padStart(2, '0'); // Tanggal (01-31)
                let m = months[parts[1]] || '01';  // Bulan angka (01-12)
                let y = parts[2];                  // Tahun (2026)
                
                return `${d}/${m}/${y}`; // Gabung jadi DD/MM/YYYY
            }
            return fullTime; // Jaga-jaga kalau formatnya beda
        }
    }
    return "-";
}

function detectFieldChanges(oldData, newData) {
    let changes = [];
    const fields = [
        { key: 'nama', label: 'Nama Karyawan' }, { key: 'nik', label: 'NIK' },
        { key: 'entitas', label: 'Entitas' }, { key: 'tipe', label: 'Tipe Pengajuan' },
        { key: 'tglSubmit', label: 'Tanggal Submit' }, { key: 'tglProses', label: 'Tanggal Proses' },
        { key: 'noPR', label: 'Nomor PR' }, { key: 'mataUang', label: 'Mata Uang' }
    ];
    fields.forEach(f => {
        let oldVal = (oldData[f.key] || '-').toString().trim();
        let newVal = (newData[f.key] || '-').toString().trim();
        if (oldVal !== newVal) changes.push(`• <b>${f.label}:</b> <strike style="color:#999;">${oldVal}</strike> ➔ <b style="color:#0050A0;">${newVal}</b>`);
    });
    return changes.length > 0 ? changes.join('<br>') : null;
}

function escapeTimelineText(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeTimelineNote(value) {
    return escapeTimelineText(value)
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
        .replace(/&lt;(\/?)strong&gt;/gi, '<$1strong>')
        .replace(/&lt;(\/?)b&gt;/gi, '<$1b>')
        .replace(/&lt;strike style=&quot;color:#999;&quot;&gt;/gi, '<strike>')
        .replace(/&lt;div style=&quot;margin-top:4px; font-size:11px;&quot;&gt;/gi, '<div>')
        .replace(/&lt;\/div&gt;/gi, '</div>')
        .replace(/&lt;(\/?)strike(?:\s+style=&quot;[^&]*&quot;)?&gt;/gi, '<$1strike>');
}

function getTimelineTone(title, type) {
    if(type === 'adjust') return {chip:'Penyesuaian', cls:'is-adjust', color:'#c13b4d'};
    const value = String(title || '').toLowerCase();
    if(value.includes('cancel')) return {chip:'Canceled', cls:'is-canceled', color:'#be123c'};
    if(value.includes('paid')) return {chip:'Paid', cls:'is-paid', color:'#0f8b69'};
    if(value.includes('posted')) return {chip:'Posted', cls:'is-posted', color:'#0780b7'};
    if(value.includes('revisi') || value.includes('revision')) return {chip:'Revisi', cls:'is-revision', color:'#b67a00'};
    if(value.includes('waiting')) return {chip:'Approval', cls:'is-waiting', color:'#7c5bb1'};
    if(value.includes('return')) return {chip:'Returned', cls:'is-returned', color:'#c15d39'};
    return {chip:'Status', cls:'', color:'#1684b8'};
}

function renderMergedTimelineContent(data, tlContainer) {
    tlContainer.innerHTML = '';
    let allEvents = [];
    if (data.historyLog) {
        data.historyLog.forEach(log => {
            allEvents.push({ type:'status', timeVal:parseHistoryTime(log.time).getTime(), timeStr:log.time, title:log.status, by:log.by, note:log.note });
        });
    }
    if (data.adjustments) {
        data.adjustments.forEach(adj => {
            let diff = adj.newVal - adj.oldVal;
            let oldCurrency = normalizeCurrency(adj.oldCurrency || adj.currency || getClaimCurrency(data));
            let newCurrency = normalizeCurrency(adj.newCurrency || adj.currency || getClaimCurrency(data));
            let currencyChanged = oldCurrency !== newCurrency;
            let txtDiff = currencyChanged ? `(Mata uang ${oldCurrency} → ${newCurrency}; tanpa konversi kurs)` : (diff > 0 ? `(Naik ${formatMoney(Math.abs(diff), newCurrency)})` : `(Turun ${formatMoney(Math.abs(diff), newCurrency)})`);
            let noteStr = `Data diubah dari ${formatMoney(adj.oldVal, oldCurrency)} menjadi ${formatMoney(adj.newVal, newCurrency)} ${txtDiff}.`;
            if (adj.note) noteStr += ` | Alasan: <strong>${adj.note}</strong>`;
            allEvents.push({ type:'adjust', timeVal:parseHistoryTime(adj.date).getTime(), timeStr:adj.date, title:'Penyesuaian Nominal', by:adj.by, note:noteStr });
        });
    }
    allEvents.sort((a,b) => b.timeVal - a.timeVal);
    if (!allEvents.length) {
        tlContainer.innerHTML = `<div class="timeline-empty">Belum ada riwayat status.</div>`;
        return;
    }
    tlContainer.innerHTML = allEvents.map(ev => {
        const tone = getTimelineTone(ev.title, ev.type);
        const ext = ev.note ? `<div class="timeline-note" style="border-left-color:${tone.color} !important;">${sanitizeTimelineNote(ev.note)}</div>` : '';
        return `<div class="timeline-item"><div class="timeline-dot" style="background:${tone.color} !important;"></div><div class="timeline-content"><span class="timeline-event-chip ${tone.cls}">${escapeTimelineText(tone.chip)}</span><strong>${escapeTimelineText(ev.title)}</strong><span>${escapeTimelineText(ev.timeStr)} · Oleh: ${formatActorUsernameHtml(ev.by)}</span>${ext}</div></div>`;
    }).join('');
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(tlContainer);
}

// --- SLA ENGINE (KERJA H+1, SKIP WEEKEND/HOLIDAY) ---
const DEFAULT_SLA_SETTINGS = Object.freeze({
    startOffsetDays: 1,
    weekendDays: [0, 6],
    greenMaxDays: 3,
    warningMaxDays: 7,
    achievementTargetPercent: 90,
    defaultMode: 'working_days',
    timezone: 'Asia/Jakarta'
});
window.slaSettings = { ...DEFAULT_SLA_SETTINGS, weekendDays: [...DEFAULT_SLA_SETTINGS.weekendDays] };

function normalizeSlaSettings(data) {
    const raw = data || {};
    const startOffsetDays = Number(raw.startOffsetDays) === 0 ? 0 : 1;
    const weekendDays = [...new Set((Array.isArray(raw.weekendDays) ? raw.weekendDays : DEFAULT_SLA_SETTINGS.weekendDays)
        .map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a,b) => a-b);
    const greenInput = Number(raw.greenMaxDays);
    const warningInput = Number(raw.warningMaxDays);
    const greenMaxDays = Math.max(0, Math.min(99, Number.isFinite(greenInput) ? Math.trunc(greenInput) : DEFAULT_SLA_SETTINGS.greenMaxDays));
    const warningCandidate = Number.isFinite(warningInput) ? Math.trunc(warningInput) : DEFAULT_SLA_SETTINGS.warningMaxDays;
    const warningMaxDays = Math.max(greenMaxDays + 1, Math.min(365, warningCandidate));
    const targetInput = Number(raw.achievementTargetPercent);
    const achievementTargetPercent = Math.max(1, Math.min(100, Number.isFinite(targetInput) ? Math.round(targetInput) : DEFAULT_SLA_SETTINGS.achievementTargetPercent));
    return {
        startOffsetDays,
        weekendDays,
        greenMaxDays,
        warningMaxDays,
        achievementTargetPercent,
        defaultMode: raw.defaultMode === 'calendar_days' ? 'calendar_days' : 'working_days',
        timezone: 'Asia/Jakarta',
        updatedAtMs: Number(raw.updatedAtMs) || 0,
        updatedBy: String(raw.updatedBy || '')
    };
}

function applySlaSettings(data) {
    window.slaSettings = normalizeSlaSettings(data);
    window.slaMode = window.slaSettings.defaultMode;
    const selectedText = document.getElementById('sla-selected-text');
    if(selectedText) selectedText.innerText = window.slaMode === 'calendar_days' ? '📅 Tanggal Kalender' : '🏢 Hari Kerja (Standar)';
    renderSlaSettingsPanel();
    if(window.currentOpenMenu === 'master-calendar') renderSlaCalendar();
    scheduleRealtimeViewRefresh();
}

const DEFAULT_SLA_HOLIDAYS = [
    "2026-01-01", "2026-02-17", "2026-03-20", "2026-03-21", 
    "2026-03-22", "2026-03-23", "2026-04-03", "2026-05-01", 
    "2026-05-14", "2026-05-27", "2026-06-01", "2026-06-16", 
    "2026-08-17", "2026-08-25", "2026-12-25"
];
let slaCalendarEntries = DEFAULT_SLA_HOLIDAYS.map(date => ({ date, label: 'Libur nasional (bootstrap 2026)' }));
window.slaHolidayDates = new Set(DEFAULT_SLA_HOLIDAYS);
window.slaCalendarMeta = {};

function normalizeSlaCalendarEntries(entries) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : []).map(item => {
        if(typeof item === 'string') return { date: item, label: 'Libur nasional' };
        return { date: String(item && item.date || '').trim(), label: String(item && item.label || '').trim() };
    }).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && !seen.has(item.date) && seen.add(item.date))
      .sort((a,b) => a.date.localeCompare(b.date));
}

function applySlaCalendar(data) {
    slaCalendarEntries = normalizeSlaCalendarEntries(data && data.entries);
    window.slaHolidayDates = new Set(slaCalendarEntries.map(item => item.date));
    window.slaCalendarMeta = data || {};
    if(window.currentOpenMenu === 'master-calendar') renderSlaCalendar();
    scheduleRealtimeViewRefresh();
}

function getDefaultSlaCalendarPayload() {
    return {
        entries: normalizeSlaCalendarEntries(slaCalendarEntries),
        timezone: 'Asia/Jakarta',
        weekendDays: [...window.slaSettings.weekendDays],
        updatedAtMs: Date.now(),
        updatedBy: sessionUser || 'bootstrap'
    };
}

let slaCalendarViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function slaDateToIso(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

function parseSlaIsoDate(isoDate) {
    const parts = String(isoDate || '').split('-').map(Number);
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
}

function formatSlaDisplayDate(isoDate, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
    const parsed = parseSlaIsoDate(isoDate);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('id-ID', options) : isoDate;
}

function renderSlaCalendarVisuals() {
    const grid = document.getElementById('sla-calendar-month-grid');
    if(!grid) return;
    const viewYear = slaCalendarViewDate.getFullYear();
    const viewMonth = slaCalendarViewDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = slaDateToIso(today);
    const holidayMap = new Map(slaCalendarEntries.map(item => [item.date, item]));

    const monthLabel = document.getElementById('sla-calendar-month-label');
    if(monthLabel) monthLabel.innerText = slaCalendarViewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    syncSlaPeriodPicker(viewYear, viewMonth);

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const firstGridDate = new Date(viewYear, viewMonth, 1 - mondayOffset);
    let cells = '';
    for(let index = 0; index < 42; index++) {
        const date = new Date(firstGridDate);
        date.setDate(firstGridDate.getDate() + index);
        const iso = slaDateToIso(date);
        const holiday = holidayMap.get(iso);
        const isWeekend = window.slaSettings.weekendDays.includes(date.getDay());
        const classes = ['sla-day-cell'];
        if(date.getMonth() !== viewMonth) classes.push('outside-month');
        if(isWeekend) classes.push('weekend');
        if(holiday) classes.push('holiday');
        if(iso === todayIso) classes.push('today');
        const title = holiday ? `${formatSlaDisplayDate(iso)} — ${holiday.label}` : formatSlaDisplayDate(iso);
        cells += `<div class="${classes.join(' ')}" title="${escapeSystemText(title)}"><span class="sla-day-number">${date.getDate()}</span>${holiday ? `<span class="sla-day-label">${escapeSystemText(holiday.label || 'Hari libur')}</span>` : ''}</div>`;
    }
    grid.innerHTML = cells;

    const currentYear = today.getFullYear();
    const upcoming = slaCalendarEntries.filter(item => item.date >= todayIso);
    const yearEntries = slaCalendarEntries.filter(item => item.date.startsWith(`${currentYear}-`));
    const totalEl = document.getElementById('sla-calendar-total-count');
    const yearEl = document.getElementById('sla-calendar-year-count');
    const upcomingEl = document.getElementById('sla-calendar-upcoming-count');
    if(totalEl) totalEl.innerText = slaCalendarEntries.length;
    if(yearEl) yearEl.innerText = yearEntries.length;
    if(upcomingEl) upcomingEl.innerText = upcoming.length;

    const upcomingList = document.getElementById('sla-calendar-upcoming-list');
    if(upcomingList) {
        const nextEntries = upcoming.slice(0, 6);
        upcomingList.innerHTML = nextEntries.length ? nextEntries.map(item => {
            const date = parseSlaIsoDate(item.date);
            const month = date.toLocaleDateString('id-ID', { month: 'short' }).replace('.', '');
            return `<div class="sla-upcoming-item"><div class="sla-upcoming-date"><strong>${date.getDate()}</strong><span>${month}</span></div><div><strong>${escapeSystemText(item.label || 'Hari libur')}</strong><span>${formatSlaDisplayDate(item.date, { weekday: 'long', year: 'numeric' })}</span></div></div>`;
        }).join('') : '<div class="sla-upcoming-empty"><span>✅</span><strong>Tidak ada libur mendatang</strong><small>Daftar saat ini sudah melewati tanggal hari ini.</small></div>';
    }
}

// Pemilih periode melengkapi tombol maju/mundur: rentang tahunnya mengikuti
// tahun berjalan, tahun yang sedang dilihat, dan tahun pada daftar hari libur,
// sehingga tanggal libur lama tetap dapat dibuka.
function getSlaPeriodYearRange(viewYear) {
    const years = new Set([new Date().getFullYear(), viewYear]);
    (slaCalendarEntries || []).forEach(item => {
        const year = parseInt(String(item && item.date || '').slice(0, 4), 10);
        if(Number.isFinite(year)) years.add(year);
    });
    const min = Math.min(...years) - 2;
    const max = Math.max(...years) + 3;
    const list = [];
    for(let year = min; year <= max; year++) list.push(year);
    return list;
}

function syncSlaPeriodPicker(viewYear, viewMonth) {
    const monthSelect = document.getElementById('sla-period-month');
    const yearSelect = document.getElementById('sla-period-year');
    if(!monthSelect || !yearSelect) return;
    if(monthSelect.options.length !== 12) {
        monthSelect.innerHTML = Array.from({ length: 12 }, (unused, index) => {
            const name = new Date(2000, index, 1).toLocaleDateString('id-ID', { month: 'long' });
            return `<option value="${index}">${name}</option>`;
        }).join('');
    }
    const years = getSlaPeriodYearRange(viewYear);
    const rendered = [...yearSelect.options].map(option => Number(option.value));
    if(rendered.length !== years.length || rendered.some((year, index) => year !== years[index])) {
        yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
    }
    monthSelect.value = String(viewMonth);
    yearSelect.value = String(viewYear);
}

function setSlaCalendarPeriod() {
    const monthSelect = document.getElementById('sla-period-month');
    const yearSelect = document.getElementById('sla-period-year');
    if(!monthSelect || !yearSelect) return;
    const month = parseInt(monthSelect.value, 10);
    const year = parseInt(yearSelect.value, 10);
    if(!Number.isFinite(month) || !Number.isFinite(year)) return;
    slaCalendarViewDate = new Date(year, month, 1);
    renderSlaCalendarVisuals();
}
window.setSlaCalendarPeriod = setSlaCalendarPeriod;

function changeSlaCalendarMonth(offset) {
    slaCalendarViewDate = new Date(slaCalendarViewDate.getFullYear(), slaCalendarViewDate.getMonth() + Number(offset || 0), 1);
    renderSlaCalendarVisuals();
}

function goToCurrentSlaMonth() {
    const today = new Date();
    slaCalendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    renderSlaCalendarVisuals();
}

function renderSlaCalendar() {
    const tbody = document.getElementById('tbody-sla-calendar');
    if(!tbody) return;
    const editable = isAppAdmin();
    const actions = document.getElementById('sla-calendar-admin-actions');
    if(actions) actions.style.display = editable ? 'flex' : 'none';
    tbody.innerHTML = '';
    slaCalendarEntries.forEach((item, index) => addSlaHolidayRow(item.date, item.label, false));
    if(!slaCalendarEntries.length) tbody.innerHTML = '<tr class="sla-calendar-empty"><td colspan="4" style="text-align:center; color:#888;">Belum ada hari libur tambahan.</td></tr>';
    renderSlaCalendarVisuals();
    renderSlaSettingsPanel();
    const meta = document.getElementById('sla-calendar-meta');
    if(meta) {
        const updated = window.slaCalendarMeta.updatedAtMs ? new Date(window.slaCalendarMeta.updatedAtMs).toLocaleString('id-ID') : '-';
        meta.innerText = `Zona waktu: Asia/Jakarta | Terakhir diperbarui: ${updated} | Oleh: ${formatActorUsername(window.slaCalendarMeta.updatedBy)}`;
    }
}

function addSlaHolidayRow(date = '', label = '', focus = true) {
    if(focus && !requireAdmin()) return;
    const tbody = document.getElementById('tbody-sla-calendar');
    if(!tbody) return;
    const empty = tbody.querySelector('.sla-calendar-empty');
    if(empty) empty.remove();
    const editable = isAppAdmin();
    const tr = document.createElement('tr');
    tr.className = 'sla-holiday-row';
    tr.innerHTML = `<td class="sla-row-number" style="text-align:center;"></td>
        <td><input type="date" class="sla-holiday-date" value="${date}" ${editable ? '' : 'disabled'}></td>
        <td><input type="text" class="sla-holiday-label" value="${String(label).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" placeholder="Contoh: Libur nasional / cuti bersama" ${editable ? '' : 'disabled'}></td>
        <td style="text-align:center;">${editable ? '<button class="btn-icon" title="Hapus tanggal" onclick="this.closest(\'tr\').remove(); renumberSlaCalendarRows();">🗑️</button>' : '-'}</td>`;
    tbody.appendChild(tr);
    renumberSlaCalendarRows();
    if(focus) tr.querySelector('.sla-holiday-date').focus();
}

function renumberSlaCalendarRows() {
    document.querySelectorAll('#tbody-sla-calendar .sla-row-number').forEach((cell, index) => { cell.innerText = index + 1; });
}

async function saveSlaCalendar() {
    if(!requireAdmin()) return;
    const entries = [];
    const seen = new Set();
    for(const [index, row] of [...document.querySelectorAll('#tbody-sla-calendar .sla-holiday-row')].entries()) {
        const date = row.querySelector('.sla-holiday-date').value.trim();
        const label = row.querySelector('.sla-holiday-label').value.trim();
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showToast(`Baris ${index + 1}: tanggal belum valid.`, 'error');
        if(seen.has(date)) return showToast(`Tanggal ${date} tercatat lebih dari sekali.`, 'error');
        seen.add(date);
        entries.push({ date, label: label || 'Hari libur' });
    }
    const payload = { entries: normalizeSlaCalendarEntries(entries), timezone: 'Asia/Jakarta', weekendDays: [...window.slaSettings.weekendDays], updatedAtMs: Date.now(), updatedBy: sessionUser };
    try {
        await runTrackedDataUpdate('Menyimpan Kalender SLA', () => window.fbSetDoc(window.fbDoc(window.firebaseDb, 'appData', 'slaCalendar'), payload));
        applySlaCalendar(payload);
        logActivity(sessionUser, `Pembaruan Kalender SLA: ${payload.entries.length} tanggal libur`);
        showToast('Kalender SLA berhasil disimpan.', 'success');
    } catch(error) {
        console.error('[SLA Calendar] Gagal menyimpan:', error);
        showToast('Kalender SLA gagal disimpan. Pastikan akun memiliki peran Admin dan izin Firebase telah diterapkan.', 'error');
    }
}

function renderSlaSettingsPanel() {
    const panel = document.getElementById('sla-engine-admin-panel');
    if(!panel) return;
    panel.style.display = isAppAdmin() ? 'block' : 'none';
    const settings = normalizeSlaSettings(window.slaSettings);
    const policy = document.getElementById('sla-policy-active-text');
    if(policy) policy.innerText = `Mulai H+${settings.startOffsetDays}; hijau sampai ${settings.greenMaxDays} hari; kuning sampai ${settings.warningMaxDays} hari; merah mulai ${settings.warningMaxDays + 1} hari; target perusahaan ${settings.achievementTargetPercent}%.`;
    if(!isAppAdmin()) return;
    const setValue = (id, value) => { const el = document.getElementById(id); if(el) el.value = String(value); };
    setValue('sla-setting-start-offset', settings.startOffsetDays);
    setValue('sla-setting-green-max', settings.greenMaxDays);
    setValue('sla-setting-warning-max', settings.warningMaxDays);
    setValue('sla-setting-red-start', settings.warningMaxDays + 1);
    setValue('sla-setting-achievement-target', settings.achievementTargetPercent);
    setValue('sla-setting-default-mode', settings.defaultMode);
    document.querySelectorAll('.sla-weekend-checkbox').forEach(cb => { cb.checked = settings.weekendDays.includes(Number(cb.value)); });
    const meta = document.getElementById('sla-settings-meta');
    if(meta) meta.innerText = settings.updatedAtMs
        ? `Konfigurasi terakhir: ${new Date(settings.updatedAtMs).toLocaleString('id-ID')} oleh ${formatActorUsername(settings.updatedBy)}`
        : 'Menggunakan konfigurasi awal sistem.';
}

function collectSlaSettingsForm() {
    const weekendDays = [...document.querySelectorAll('.sla-weekend-checkbox:checked')].map(cb => Number(cb.value));
    return {
        startOffsetDays: Number(document.getElementById('sla-setting-start-offset').value),
        weekendDays,
        greenMaxDays: Number(document.getElementById('sla-setting-green-max').value),
        warningMaxDays: Number(document.getElementById('sla-setting-warning-max').value),
        achievementTargetPercent: Number(document.getElementById('sla-setting-achievement-target').value),
        defaultMode: document.getElementById('sla-setting-default-mode').value
    };
}

function updateSlaRulePreview() {
    const warningInput = document.getElementById('sla-setting-warning-max');
    const redStartInput = document.getElementById('sla-setting-red-start');
    if(redStartInput) redStartInput.value = String(Math.max(1, (Number(warningInput && warningInput.value) || 0) + 1));
}

async function saveSlaSettings() {
    if(!requireAdmin()) return;
    const rawSettings = collectSlaSettingsForm();
    if(!Number.isInteger(rawSettings.greenMaxDays) || rawSettings.greenMaxDays < 0 || rawSettings.greenMaxDays > 99) return showToast('Batas hijau harus bilangan bulat 0–99.', 'error');
    if(!Number.isInteger(rawSettings.warningMaxDays) || rawSettings.warningMaxDays <= rawSettings.greenMaxDays || rawSettings.warningMaxDays > 365) return showToast('Batas kuning harus bilangan bulat, lebih besar dari hijau, dan maksimal 365.', 'error');
    if(!Number.isInteger(rawSettings.achievementTargetPercent) || rawSettings.achievementTargetPercent < 1 || rawSettings.achievementTargetPercent > 100) return showToast('Target perusahaan harus berupa bilangan bulat 1–100 persen.', 'error');
    const settings = normalizeSlaSettings(rawSettings);
    const payload = { ...settings, updatedAtMs: Date.now(), updatedBy: sessionUser };
    try {
        await runTrackedDataUpdate('Menyimpan Mesin SLA', () => window.fbSetDoc(window.fbDoc(window.firebaseDb, 'appData', 'slaSettings'), payload));
        applySlaSettings(payload);
        logActivity(sessionUser, `Pembaruan Mesin SLA: H+${payload.startOffsetDays}; hijau sampai ${payload.greenMaxDays} hari; kuning sampai ${payload.warningMaxDays} hari; merah mulai ${payload.warningMaxDays + 1} hari; target ${payload.achievementTargetPercent}%; mode ${payload.defaultMode}`);
        showToast('Konfigurasi mesin SLA berhasil disimpan.', 'success');
    } catch(error) {
        console.error('[SLA Settings] Gagal menyimpan:', error);
        showToast('Konfigurasi SLA gagal disimpan. Pastikan akun memiliki peran Admin dan izin Firebase telah diterapkan.', 'error');
    }
}

function getSlaCategory(days, settings = window.slaSettings) {
    const normalized = normalizeSlaSettings(settings);
    if(days <= normalized.greenMaxDays) return { key: 'green', label: 'Sangat Baik', icon: '🟢', color: '#28a745' };
    if(days <= normalized.warningMaxDays) return { key: 'warning', label: 'Perlu Perhatian', icon: '🟡', color: '#ffc107' };
    return { key: 'late', label: 'Terlambat', icon: '🔴', color: '#dc3545' };
}

function calculateSlaRange(startInput, endInput, mode = window.slaMode, holdPeriods = [], settingsInput = window.slaSettings) {
    const startBase = parseReportingDate(startInput);
    const endBase = parseReportingDate(endInput);
    if(!startBase || !endBase || endBase < startBase) return { days: 0, countedDates: [], skippedDates: [], valid: false };
    const settings = normalizeSlaSettings(settingsInput);
    const countedDates = [], skippedDates = [];
    const curDate = new Date(startBase);
    curDate.setDate(curDate.getDate() + settings.startOffsetDays);
    while(curDate <= endBase) {
        const countable = mode === 'calendar_days' || isWorkingDay(curDate, settings);
        const onHold = holdPeriods.some(period => curDate >= period.start && curDate <= period.end);
        const iso = slaDateToIso(curDate);
        if(countable && !onHold) countedDates.push(iso); else skippedDates.push(iso);
        curDate.setDate(curDate.getDate() + 1);
    }
    return { days: countedDates.length, countedDates, skippedDates, valid: true };
}

function testSlaEngine() {
    if(!requireAdmin()) return;
    const start = document.getElementById('sla-test-submit-date').value;
    const end = document.getElementById('sla-test-end-date').value;
    const mode = document.getElementById('sla-test-mode').value;
    const resultEl = document.getElementById('sla-test-result');
    const draftSettings = normalizeSlaSettings(collectSlaSettingsForm());
    const result = calculateSlaRange(start, end, mode, [], draftSettings);
    if(!result.valid) {
        resultEl.innerHTML = '<strong>Data uji belum valid.</strong><span>Tanggal selesai harus sama atau setelah tanggal submit.</span>';
        resultEl.className = 'sla-test-result invalid';
        return;
    }
    const category = getSlaCategory(result.days, draftSettings);
    resultEl.className = `sla-test-result ${category.key}`;
    resultEl.innerHTML = `<strong>${category.icon} ${result.days} hari — ${category.label}</strong><span>${result.countedDates.length} tanggal dihitung; ${result.skippedDates.length} tanggal tidak dihitung. Target perusahaan: ${draftSettings.achievementTargetPercent}%.</span>`;
}

function isWorkingDay(dateObj, settings = window.slaSettings) {
    let day = dateObj.getDay();
    const weekendDays = settings && Array.isArray(settings.weekendDays)
        ? settings.weekendDays
        : normalizeSlaSettings(settings).weekendDays;
    if (weekendDays.includes(day)) return false; 
    let d = String(dateObj.getDate()).padStart(2, '0');
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let y = dateObj.getFullYear();
    if (window.slaHolidayDates && window.slaHolidayDates.has(`${y}-${m}-${d}`)) return false; 
    return true; 
}

function parseHistoryTime(timeStr) {
    let cleanStr = timeStr.replace(/,/g, '').replace(/\./g, ':');
    let months = {'Jan':0, 'Feb':1, 'Mar':2, 'Apr':3, 'Mei':4, 'May':4, 'Jun':5, 'Jul':6, 'Agu':7, 'Agt':7, 'Aug':7, 'Sep':8, 'Okt':9, 'Oct':9, 'Nov':10, 'Des':11, 'Dec':11};
    let parts = cleanStr.split(' ');
    if(parts.length >= 3) {
        return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    }
    return new Date();
}

function calculateSLADays(item) {
    if (!item.tglSubmit) return 0;
    let holdPeriods = [];
    let holdStart = null;
    
    let logs = [];
    if (item.historyLog) {
        logs = [...item.historyLog].sort((a, b) => parseHistoryTime(a.time).getTime() - parseHistoryTime(b.time).getTime());
    }
    
    logs.forEach(log => {
        let stat = log.status.toLowerCase();
        let logDate = parseHistoryTime(log.time);
        logDate.setHours(0,0,0,0);
        
        if (stat.includes('revisi') || stat.includes('confirm')) {
            if (!holdStart) holdStart = logDate;
        } 
        else if (stat.includes('in process') || stat.includes('waiting approval') || stat.includes('posted') || stat.includes('cleared') || stat.includes('reversed')) {
            if (holdStart) {
                holdPeriods.push({ start: holdStart, end: logDate });
                holdStart = null;
            }
        }
    });
    
    let endBase = new Date(); 
    endBase.setHours(0,0,0,0);
    
    if (hasEverReachedPosted(item) && item.postedAt) {
        let pAt = item.postedAt.replace(',', '').split(' ')[0].split('/');
        if(pAt.length === 3) {
            endBase = new Date(pAt[2], pAt[1]-1, pAt[0]);
            endBase.setHours(0,0,0,0);
        }
    }
    if (holdStart) holdPeriods.push({ start: holdStart, end: endBase }); 
    return calculateSlaRange(item.tglSubmit, endBase, window.slaMode, holdPeriods).days;
}

function renderSLABadge(item) {
    if(typeof isCanceledClaim === 'function' && isCanceledClaim(item)) return `<span class="badge status-canceled" title="Claim inactive dan tidak dihitung dalam SLA/statistik">Inactive</span>`;
    let sla = calculateSLADays(item);
    let isPaused = (item.statusClaim === 'Revisi');
    let modeTxt = window.slaMode === 'calendar_days' ? 'Kalender' : 'Kerja';
    const category = getSlaCategory(sla);
    
    if(isFinalClaimStatus(item.statusClaim)) return `<span class="badge" style="background:#155724; color:white;" title="Final SLA (${modeTxt})">✅ ${sla} Hari</span>`;
    
    let icon = isPaused ? '⏸️' : category.icon;
    let bg = isPaused ? '#6c757d' : category.color;
    let color = (category.key === 'warning' && !isPaused) ? '#333' : 'white';
    
    return `<span class="badge" style="background:${bg}; color:${color};" title="SLA (${modeTxt}): ${sla} Hari">${icon} ${sla} Hari</span>`;
}        

// --- CLAIM INPUT LOGIC ---
        let isHeaderHidden = false;
        function toggleHeaderDisplay() {
            let grid = document.getElementById('header-form-grid'); let btn = document.getElementById('btn-toggle-hdr');
            if(isHeaderHidden) { grid.style.maxHeight = '500px'; grid.style.opacity = '1'; grid.style.margin = '0 0 25px 0'; btn.innerText = "👁️ Sembunyikan Header"; } 
            else { grid.style.maxHeight = '0'; grid.style.opacity = '0'; grid.style.margin = '0'; btn.innerText = "👁️ Tampilkan Header"; }
            isHeaderHidden = !isHeaderHidden;
        }
        
        function handleHeaderEnter(e) { if(e.key === "Enter") { e.preventDefault(); let fDate = document.querySelector('#tbody-line-items tr .line-tgl'); if(fDate) fDate.focus(); } }
        function handleAmountEnter(e, inputElem) {
            if(e.key === "Enter") {
                e.preventDefault(); let curr = inputElem.closest('tr'); let next = curr.nextElementSibling;
                if(!next) { addNewLineRow(); next = curr.nextElementSibling; }
                if(next) next.querySelector('.line-tgl').focus();
            }
        }
        function toggleNoteInput(btn) {
            
            let tr = btn.closest('tr');
         
            let noteInput = tr.querySelector('.line-note');
            
            if(noteInput) {
                noteInput.style.display = noteInput.style.display === 'none' ? 'block' : 'none';
                if(noteInput.style.display === 'block') noteInput.focus();
            }
}
        function autoBalanceHeader() { document.getElementById('hdr-amount-total').value = document.getElementById('txt-line-total').innerText; calculateBalance(); showToast('Total baris telah disamakan secara otomatis.', 'info'); }

        function setFormState(readOnly) {
            let inputs = document.querySelectorAll('#menu-claim-input input:not(.modal-trigger), #menu-claim-input select, #menu-claim-input textarea');
            inputs.forEach(i => i.disabled = readOnly);
            
            document.getElementById('btn-add-row').style.display = readOnly ? 'none' : 'inline-block';
            document.getElementById('btn-del-row').style.display = 'none'; 
            document.getElementById('btn-save-rekap').style.display = readOnly ? 'none' : 'inline-block';
            document.getElementById('btn-simulate').style.display = readOnly ? 'none' : 'inline-block';
            
            // Perbaikan: Tambahin pengecekan if (el) biar gak crash
            let btnHdrDoc = document.getElementById('hdr-doc-no');
if(btnHdrDoc) btnHdrDoc.disabled = readOnly;
            
            let actionBtns = document.querySelectorAll('#menu-claim-input .btn-icon');
            actionBtns.forEach(b => b.disabled = readOnly);
            
            let data = dbRekap.find(i => i.id === currentEditingId);
            if(data && data.adjustments && data.adjustments.length > 0) {
                document.getElementById('btn-view-adjust').style.display = 'inline-block';
            } else {
                document.getElementById('btn-view-adjust').style.display = 'none';
            }
            document.getElementById('btn-add-adjust').style.display = (currentEditingId && !readOnly) ? 'inline-block' : 'none';
        }

        function resetFormAdd() {
            currentEditingId = null; viewMode = false; document.getElementById('form-title').innerText = "📝 Form Input Data Jurnal";
            ['hdr-nama','hdr-nik','hdr-amount-total','hdr-tgl-submit','hdr-doc-no','hdr-no-pr'].forEach(id => {
                let el = document.getElementById(id);
                if(el) {
                    if(id === 'hdr-doc-no') { el.dataset.value = ''; el.value = '📄 + Input Ref Doc'; }
                    else { el.value = ''; }
                }
            });
            
            document.getElementById('hdr-tgl-proses').value = getTodayString();
            ensureCurrencyOption(document.getElementById('hdr-currency'), 'IDR');
            handleCurrencyChange('standard');
            document.getElementById('hdr-entitas').value = 'AIO';
            document.getElementById('hdr-nama').readOnly = true; document.getElementById('hdr-entitas').disabled = true;
            document.getElementById('hdr-nama').style.backgroundColor = '#e9ecef'; document.getElementById('hdr-entitas').style.backgroundColor = '#e9ecef';
            document.getElementById('hdr-nama').style.color = '#666'; document.getElementById('hdr-entitas').style.color = '#666';
            document.getElementById('tbody-line-items').innerHTML = ''; updateGLDropdownOptions();
            for(let i=0; i<10; i++) addNewLineRow(); // 10 Baris Otomatis
            calculateBalance(); updateSelectionSum();
            if(isHeaderHidden) toggleHeaderDisplay(); 
            setFormState(false);
            document.getElementById('btn-view-adjust').style.display = 'none';
        }

      function addNewLineRow(lineId = '') {
            let tbody = document.getElementById('tbody-line-items'); let tr = document.createElement('tr');
            tr.dataset.lineId = lineId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`);
            tr.innerHTML = `
                <td style="text-align:center; vertical-align:middle; padding:0;"><span class="drag-handle" style="cursor:grab; color:#888; font-size:18px;" title="Tahan & geser">☰</span></td>
                <td style="text-align:center; vertical-align:middle; padding:0;"><input type="checkbox" class="row-checkbox" onclick="toggleLineRowCheck()"></td>
                <td style="position:relative; padding:0;">
                    <input type="text" class="line-input line-tgl" placeholder="DD/MM/YYYY" maxlength="10" oninput="autoFormatDate(this)" onblur="autoFormatDate(this, true)">
                    <div class="fill-handle" title="Tarik ke bawah untuk menyalin sel"></div>
                </td>
                <td style="position:relative; padding:0;">
                    <input type="text" class="line-input line-gl" placeholder="Masukkan GL" autocomplete="off">
                    <div class="fill-handle" title="Tarik ke bawah untuk menyalin sel"></div>
                </td>
                <td style="padding:0; position:relative;">
                    <input type="text" class="line-input line-amount" placeholder="0" oninput="formatRupiahInput(this); calculateBalance()" onkeydown="handleAmountEnter(event, this)">
                    <div class="fill-handle" title="Tarik ke bawah untuk menyalin sel"></div>
                    <input type="text" class="line-note" placeholder="Catatan penyesuaian" style="display:none;">
                </td>
                <td style="text-align:center; padding-top:4px;">
                    <button class="btn-icon" onclick="toggleNoteInput(this)" title="Tambahkan catatan" style="font-size:14px;">💬</button>
                </td>
            `;
            tbody.appendChild(tr);
        }

        function calculateBalance() {
            let currency = normalizeCurrency(document.getElementById('hdr-currency').value);
            let hdr = parseCurrencyAmount(document.getElementById('hdr-amount-total').value, currency); let tot = 0;
            document.querySelectorAll('.line-amount').forEach(inp => tot += parseCurrencyAmount(inp.value, currency));
            document.getElementById('txt-line-total').innerText = formatAmountValue(tot, currency);
            let ind = document.getElementById('balance-indicator');
            if(amountsEqual(hdr, tot, currency) && hdr > 0) { 
                ind.innerText = "Seimbang ✓"; 
                ind.className = "badge balanced"; 
                return true; 
            } else { 
                let selisih = Math.abs(hdr - tot);
                ind.innerText = "Belum Seimbang (Selisih: " + formatMoney(selisih, currency) + ")"; 
                ind.className = "badge unbalanced"; 
                return false; 
            }
        }

        function validateDates(tglP, tglS) {
            if(!isValidDateString(tglP) || !isValidDateString(tglS)) return false;
            let ok = true;
            document.querySelectorAll('#tbody-line-items tr').forEach(row => {
                let glEl = row.querySelector('.line-gl'); let amtEl = row.querySelector('.line-amount'); let tglEl = row.querySelector('.line-tgl');
                if(glEl && amtEl && tglEl) {
                    let currency = normalizeCurrency(document.getElementById('hdr-currency').value);
                    if(glEl.value.trim() || parseCurrencyAmount(amtEl.value, currency) !== 0) { if(!isValidDateString(tglEl.value)) ok = false; }
                }
            });
            return ok;
        }

        async function saveRekap() {
            if(!requireClaimEditor()) return;
let tempId = currentEditingId;
            let existingOldData = null;
            if (tempId) {
                let found = dbRekap.find(i => i.id === tempId);
                if (found) existingOldData = JSON.parse(JSON.stringify(found));
            }
            if(existingOldData && isClaimFinanciallyLocked(existingOldData)) return showToast('Data terkunci (Posted/Paid/Hold) dan bersifat baca-saja. Gunakan alur koreksi yang sesuai.', 'error');
            let hdrNamaEl = document.getElementById('hdr-nama');
            let nama = hdrNamaEl ? toTitleCase(hdrNamaEl.value.trim()) : ""; 
            let nik = document.getElementById('hdr-nik').value.trim(); 
            let entitas = document.getElementById('hdr-entitas').value;
            let mataUang = normalizeCurrency(document.getElementById('hdr-currency').value);
            let totalHeader = parseCurrencyAmount(document.getElementById('hdr-amount-total').value, mataUang);
            let tglP = document.getElementById('hdr-tgl-proses').value; 
            let tglS = document.getElementById('hdr-tgl-submit').value;
            let docNoEl = document.getElementById('hdr-doc-no');
       			      let docNoVal = docNoEl ? (docNoEl.dataset.value || "") : "";
            let prEl = document.getElementById('hdr-no-pr');
            let noPR = prEl ? prEl.value.trim() : "";
            
            if(!nama || !nik || totalHeader <= 0) return showToast('Data header belum lengkap atau nominal bernilai nol.', 'error');
            if(!validateDates(tglP, tglS)) return showToast('Tanggal tidak valid. Pastikan format DD/MM/YYYY telah sesuai.', 'error');
            if(parseDateString(tglS) > parseDateString(tglP)) {
                customAlert('Tanggal Submit tidak boleh melewati Tanggal Proses.');
                return;
            }

            let lineData = [];
            document.querySelectorAll('#tbody-line-items tr').forEach(row => {
                let glEl = row.querySelector('.line-gl');
                let amtEl = row.querySelector('.line-amount');
                let tglEl = row.querySelector('.line-tgl');
                let noteEl = row.querySelector('.line-note');
                
                if(glEl && amtEl && tglEl && noteEl) {
                    let gl = glEl.value.trim(); 
                    let amt = parseCurrencyAmount(amtEl.value, mataUang);
                    let note = noteEl.value.trim();
                    if(gl || amt !== 0) lineData.push({ id: row.dataset.lineId || `line-${Date.now()}-${lineData.length}`, tgl: tglEl.value, gl: gl, amount: amt, note: note });
                }
            });
            
            if(lineData.length === 0) return showToast('Isi minimal satu baris rincian.', 'error');

            let existing = dbRekap.find(i => i.id === currentEditingId);
            let statusBaru = existing ? existing.statusClaim : "In Process"; 
            let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            
            // Auto Archive logic
            let isArc = existing ? existing.isArchived : false;
            if(statusBaru === 'Posted') {
                isArc = true;
            }

            let claimData = { ...(existing || {}),
                nama, nik, entitas, tipe: document.getElementById('hdr-tipe').value, statusClaim: statusBaru, 
                tglProses: tglP, tglSubmit: tglS, docNo: docNoVal, noPR: noPR,
                mataUang, totalHeader, isBalanced: calculateBalance(), lines: lineData, inputBy: existing ? existing.inputBy : sessionUser, isQuick: false, isArchived: isArc,
                createdAtMs: existing && existing.createdAtMs ? existing.createdAtMs : Date.now(), updatedAtMs: Date.now(),
                workflowTimestamps: existing && existing.workflowTimestamps ? existing.workflowTimestamps : { processStartedAt: Date.now() },
                historyLog: existing && existing.historyLog ? existing.historyLog : [{status: "In Process", time: timeNow, by: sessionUser}]
            };

            // Detailed Adjustment Tracking logic
            if(existing) {
                let adjList = existing.adjustments || [];
                
                let oldLines = existing.lines || [];
                let newLines = claimData.lines || [];
                let maxL = Math.max(oldLines.length, newLines.length);
                for(let i=0; i<maxL; i++) {
                    let oL = oldLines[i] || { gl: '-', amount: 0, note: '' };
                    let nL = newLines[i] || { gl: '-', amount: 0, note: '' };
                    
                    // Rekam jika ada beda Nominal, beda GL, atau beda Komen
                    if((oL.amount !== nL.amount) || (oL.gl !== nL.gl) || (oL.note !== nL.note)) {
                        if(oL.amount === 0 && nL.amount === 0 && oL.gl === '-' && nL.gl === '-' && !nL.note) continue;
                        
                        let targetGL = (nL.gl && nL.gl !== '-') ? nL.gl : oL.gl;
                        adjList.push({
                            type: 'Line', 
                            row: i + 1, 
                            lineId: nL.id || oL.id || null,
                            gl: targetGL, 
                            oldVal: oL.amount, 
                            newVal: nL.amount, 
                            oldCurrency: getClaimCurrency(existing),
                            newCurrency: mataUang,
                            date: timeNow, 
                            by: sessionUser, 
                            note: nL.note,
                            oldGL: oL.gl,     // <--- SEKARANG IKUT DICATAT
                            oldNote: oL.note  // <--- SEKARANG IKUT DICATAT
                        });
                    }
                }
                claimData.adjustments = adjList;
            }

            if(existing) {
                if(existing.postedAt) claimData.postedAt = existing.postedAt; 
                if(existing.postedBy) claimData.postedBy = existing.postedBy;
                if(existing.reviseStep) claimData.reviseStep = existing.reviseStep; 
                if(existing.reviseTime) claimData.reviseTime = existing.reviseTime;
                if(existing.reviseNote) claimData.reviseNote = existing.reviseNote; 
                if(existing.reviseTimestamp) claimData.reviseTimestamp = existing.reviseTimestamp;
                if(existing.waitingApprovalAt) claimData.waitingApprovalAt = existing.waitingApprovalAt;
                claimData.id = currentEditingId; dbRekap[dbRekap.findIndex(i => i.id === currentEditingId)] = claimData;
            } else { claimData.id = Date.now(); dbRekap.push(claimData); }
            
// Audit Trail Eksekusi
            if (tempId && existingOldData) {
                let updatedData = dbRekap.find(i => i.id === tempId);
                if (updatedData) {
                    let changes = detectFieldChanges(existingOldData, updatedData);
                    if (changes) {
                        updatedData.historyLog.push({
                            status: "✏️ Pembaruan Data Formulir", 
                            time: timeNow, by: sessionUser,
                            note: `Rincian yang diubah:<br><div style="margin-top:4px; font-size:11px;">${changes}</div>`
                        });
                    }
                }
            }

            try {
                await saveDataToLocal({ claimIds: [claimData.id] });
            } catch (error) {
                console.error('[Claim] Gagal menyimpan:', error);
                if(await window.restoreClaimsAfterConflict(error)) return;
                return showToast('Data gagal disimpan ke perangkat. Form tetap dibuka.', 'error');
            }
            const addedAdjustment = !!existingOldData && (claimData.adjustments || []).length > (existingOldData.adjustments || []).length;
            const stayAfterAdjustment = Number(window.adjustmentStayClaimId) === Number(claimData.id) || addedAdjustment;
            logActivity(sessionUser, existing ? `Pembaruan Input Klaim ID: ${claimData.id}` : `Penambahan Klaim Baru ID: ${claimData.id}`);

            if(statusBaru === 'Posted') showRTPAnimation();
            if(stayAfterAdjustment) {
                currentEditingId = claimData.id;
                window.adjustmentStayClaimId = null;
                showToast('Perubahan dan adjustment berhasil disimpan. Data tetap terbuka.', 'success');
                return claimData.id;
            }
            currentEditingId = null;
            runLoader("Menyimpan...", () => { changeMenu('claim-rekap'); showToast('Data berhasil disimpan', 'success'); });
        }

        function openEditRoute(id, readOnly = false) {
             let data = dbRekap.find(i => i.id === id); if(!data) return;
             if(sessionRole === 'finance' || sessionRole === 'viewer') {
                 openStatusModal(id);
                 return;
             }
             readOnly = readOnly || isClaimFinanciallyLocked(data);
             if (data.isQuick) openEditQuickRekap(id, readOnly);
             else openEditRekap(id, readOnly);
        }

        function setQuickFormState(readOnly) {
            let inputs = document.querySelectorAll('#menu-claim-quick input:not(.modal-trigger), #menu-claim-quick select, #menu-claim-quick textarea');
            inputs.forEach(i => i.disabled = readOnly);
            
            // Perbaikan: Tambahin pengecekan if (el) biar gak crash
            let btnQkDoc = document.getElementById('qk-doc-no');
if(btnQkDoc) btnQkDoc.disabled = readOnly;
            
            document.getElementById('btn-save-quick').style.display = readOnly ? 'none' : 'inline-block';
            
            let data = dbRekap.find(i => i.id === currentEditingId);
            if(data && data.adjustments && data.adjustments.length > 0) {
                document.getElementById('btn-qk-view-adjust').style.display = 'inline-block';
            } else {
                document.getElementById('btn-qk-view-adjust').style.display = 'none';
            }
            let btnQkAdd = document.getElementById('btn-qk-add-adjust');
            if(btnQkAdd) btnQkAdd.style.display = (currentEditingId && !readOnly) ? 'inline-block' : 'none';
            updateQuickWorkflowControls();
}

        function getQuickFormComparableState() {
            const value = id => {
                const element = document.getElementById(id);
                return element ? String(element.value || '').trim() : '';
            };
            const currency = normalizeCurrency(value('qk-currency') || 'IDR');
            const docElement = document.getElementById('qk-doc-no');
            return {
                tglProses: value('qk-tgl-proses'), tglSubmit: value('qk-tgl-submit'), tipe: value('qk-tipe'),
                noPR: value('qk-no-pr'), nik: value('qk-nik'), nama: value('qk-nama'), entitas: value('qk-entitas'),
                mataUang: currency, totalHeader: parseCurrencyAmount(value('qk-amount'), currency),
                docNo: String(docElement && docElement.dataset.value || ''), quickNote: value('qk-notes')
            };
        }

        function hasQuickFormUnsavedChanges() {
            const claim = dbRekap.find(item => Number(item.id) === Number(currentEditingId));
            if(!claim) return true;
            const form = getQuickFormComparableState();
            const stored = {
                tglProses: String(claim.tglProses || ''), tglSubmit: String(claim.tglSubmit || ''), tipe: String(claim.tipe || ''),
                noPR: String(claim.noPR || ''), nik: String(claim.nik || ''), nama: String(claim.nama || ''), entitas: String(claim.entitas || ''),
                mataUang: getClaimCurrency(claim), totalHeader: Number(claim.totalHeader) || 0,
                docNo: String(claim.docNo || ''), quickNote: String(claim.quickNote || '')
            };
            return Object.keys(stored).some(key => key === 'totalHeader'
                ? !amountsEqual(form[key], stored[key], form.mataUang)
                : String(form[key]) !== String(stored[key]));
        }

        function updateQuickWorkflowControls() {
            const badge = document.getElementById('qk-current-status');
            const hint = document.getElementById('qk-workflow-hint');
            const button = document.getElementById('btn-qk-change-status');
            if(!badge || !hint || !button) return;
            const claim = dbRekap.find(item => Number(item.id) === Number(currentEditingId));
            if(!claim) {
                badge.className = 'badge status-process';
                badge.innerText = 'Belum Tersimpan';
                hint.innerText = 'Klaim baru akan disimpan terlebih dahulu, kemudian panel alur status akan dibuka.';
                button.innerText = '💾 Simpan & Ubah Status';
                button.style.display = canEditClaims() ? 'inline-flex' : 'none';
                button.disabled = !!window.quickWorkflowActionInProgress;
                return;
            }
            const transitions = getAllowedStatusTransitions(claim);
            badge.className = `badge ${getClaimStatusClass(claim.statusClaim)}`;
            badge.innerText = claim.statusClaim || 'Tanpa Status';
            hint.innerText = transitions.length
                ? 'Perubahan status menggunakan validasi, peran, audit, dan progres yang sama dengan modul lainnya.'
                : 'Status ini bersifat baca-saja untuk peran Anda. Linimasa tetap dapat ditinjau.';
            button.innerText = transitions.length ? '🔄 Ubah Status' : '👁️ Lihat Status & Linimasa';
            button.style.display = 'inline-flex';
            button.disabled = !!window.quickWorkflowActionInProgress;
        }

        function handleQuickStatusAction() {
            if(window.quickWorkflowActionInProgress) return showToast('Proses alur status pada Input Cepat sedang berlangsung.', 'info');
            const claim = dbRekap.find(item => Number(item.id) === Number(currentEditingId));
            if(claim && !hasQuickFormUnsavedChanges()) {
                openStatusModal(claim.id);
                return;
            }
            if(!canEditClaims()) return showToast('Perubahan formulir harus disimpan oleh Accounting atau Admin terlebih dahulu.', 'error');

            const executeSaveThenStatus = async () => {
                window.quickWorkflowActionInProgress = true;
                updateQuickWorkflowControls();
                try { await saveQuickRekap({ stayOnForm:true, openStatusAfterSave:true }); }
                finally { window.quickWorkflowActionInProgress = false; updateQuickWorkflowControls(); }
            };
            if(claim) customConfirm('Terdapat perubahan pada Input Cepat yang belum disimpan. Simpan perubahan terlebih dahulu, kemudian lanjutkan ke alur status?', executeSaveThenStatus);
            else executeSaveThenStatus();
        }
        function openEditQuickRekap(id, readOnly = false) {
             let data = dbRekap.find(i => i.id === id); if(!data) return;
             currentEditingId = id; viewMode = readOnly;
             
             document.getElementById('qk-tgl-proses').value = data.tglProses; document.getElementById('qk-tgl-submit').value = data.tglSubmit;
             
             updateGLDropdownOptions();
             let qkSel = document.getElementById('qk-tipe');
             // Cek kalau tipe pengajuannya belum ada di opsi, tambahin dadakan biar nggak blank
             if (data.tipe && !Array.from(qkSel.options).some(opt => opt.value === data.tipe)) {
                 qkSel.innerHTML += `<option value="${data.tipe}">${data.tipe}</option>`;
             }
             qkSel.value = data.tipe;

             ensureCurrencyOption(document.getElementById('qk-currency'), data.mataUang || 'IDR');
             handleCurrencyChange('quick');
             document.getElementById('qk-nik').value = data.nik;
             document.getElementById('qk-nama').value = data.nama; document.getElementById('qk-entitas').value = data.entitas || 'AIO';
             document.getElementById('qk-amount').value = formatEditableAmountValue(data.totalHeader, data.mataUang || 'IDR');
	     // Reset & Deteksi Kotak Kuning
             let noteInput = document.getElementById('qk-adj-note');
             if(noteInput) { noteInput.style.display = 'none'; noteInput.value = ''; }
             
             document.getElementById('qk-amount').oninput = function() {
                 formatRupiahInput(this);
                 if (currentEditingId) {
                     let existing = dbRekap.find(i => i.id === currentEditingId);
                     if (existing && noteInput) {
                         let currentCurrency = normalizeCurrency(document.getElementById('qk-currency').value);
                         let currentVal = parseCurrencyAmount(this.value, currentCurrency);
                         if (!amountsEqual(currentVal, existing.totalHeader, currentCurrency) || getClaimCurrency(existing) !== currentCurrency) noteInput.style.display = 'block';
                         else { noteInput.style.display = 'none'; noteInput.value = ''; }
                     }
                 }
             };
             
             let docEl = document.getElementById('qk-doc-no'); 
             if(docEl) { docEl.dataset.value = data.docNo || ''; docEl.value = data.docNo ? "👁️ Lihat Ref No Doc" : "📄 + Input Ref Doc"; } 
             let prEl = document.getElementById('qk-no-pr'); if(prEl) prEl.value = data.noPR || '';
             
             document.getElementById('qk-notes').value = data.quickNote || '';
             
             if(data.nik === '0000') {
                 document.getElementById('qk-nama').readOnly = false; document.getElementById('qk-entitas').disabled = false;
                 document.getElementById('qk-nama').style.backgroundColor = '#fff'; document.getElementById('qk-entitas').style.backgroundColor = '#fff';
                 document.getElementById('qk-nama').style.color = '#333'; document.getElementById('qk-entitas').style.color = '#333';
             } else {
                 document.getElementById('qk-nama').readOnly = true; document.getElementById('qk-entitas').disabled = true;
                 document.getElementById('qk-nama').style.backgroundColor = '#e9ecef'; document.getElementById('qk-entitas').style.backgroundColor = '#e9ecef';
                 document.getElementById('qk-nama').style.color = '#666'; document.getElementById('qk-entitas').style.color = '#666';
             }

             if(data.adjustments && data.adjustments.length > 0) {
                 document.getElementById('btn-qk-view-adjust').style.display = 'inline-block';
                 document.getElementById('qk-adjust-badge').innerText = data.adjustments.length;
             } else {
                 document.getElementById('btn-qk-view-adjust').style.display = 'none';
             }

             changeMenu('claim-quick'); setQuickFormState(readOnly);
        }

        function openEditRekap(id, readOnly = false) {
            let data = dbRekap.find(i => i.id === id); if(!data) return;
            currentEditingId = id; viewMode = readOnly;
             let titlePrefix = readOnly ? "👁️ Lihat Klaim:" : "✏️ Ubah Klaim:";
            document.getElementById('form-title').innerText = `${titlePrefix} ${data.nama} (Status: ${data.statusClaim})`;
            
            document.getElementById('hdr-tgl-proses').value = data.tglProses; document.getElementById('hdr-tgl-submit').value = data.tglSubmit;
            
            let docEl = document.getElementById('hdr-doc-no'); 
            if(docEl) { docEl.dataset.value = data.docNo || ''; docEl.value = data.docNo ? "👁️ Lihat Ref No Doc" : "📄 + Input Ref Doc"; }
            let prEl = document.getElementById('hdr-no-pr'); if(prEl) prEl.value = data.noPR || '';

            updateGLDropdownOptions();
            let hdrSel = document.getElementById('hdr-tipe');
            if (data.tipe && !Array.from(hdrSel.options).some(opt => opt.value === data.tipe)) {
                hdrSel.innerHTML += `<option value="${data.tipe}">${data.tipe}</option>`;
            }
            hdrSel.value = data.tipe; 
            
            ensureCurrencyOption(document.getElementById('hdr-currency'), data.mataUang || 'IDR');
            handleCurrencyChange('standard');
            document.getElementById('hdr-nama').value = data.nama; document.getElementById('hdr-nik').value = data.nik;
            document.getElementById('hdr-entitas').value = data.entitas || 'AIO'; document.getElementById('hdr-amount-total').value = formatEditableAmountValue(data.totalHeader, data.mataUang || 'IDR');

            if(data.nik === '0000') { 
                document.getElementById('hdr-nama').readOnly = false; document.getElementById('hdr-entitas').disabled = false; 
                document.getElementById('hdr-nama').style.backgroundColor = '#fff'; document.getElementById('hdr-entitas').style.backgroundColor = '#fff'; 
                document.getElementById('hdr-nama').style.color = '#333'; document.getElementById('hdr-entitas').style.color = '#333'; 
            } else { 
                document.getElementById('hdr-nama').readOnly = true; document.getElementById('hdr-entitas').disabled = true; 
                document.getElementById('hdr-nama').style.backgroundColor = '#e9ecef'; document.getElementById('hdr-entitas').style.backgroundColor = '#e9ecef'; 
                document.getElementById('hdr-nama').style.color = '#666'; document.getElementById('hdr-entitas').style.color = '#666'; 
            }

            if(data.adjustments && data.adjustments.length > 0) {
                document.getElementById('btn-view-adjust').style.display = 'inline-block';
                document.getElementById('adjust-badge').innerText = data.adjustments.length;
            } else {
                document.getElementById('btn-view-adjust').style.display = 'none';
            }

            updateGLDropdownOptions(); let tbody = document.getElementById('tbody-line-items'); tbody.innerHTML = '';
            
            if(data.lines && data.lines.length > 0) {
                data.lines.forEach(l => { 
                    addNewLineRow(l.id || ''); let lr = tbody.lastElementChild; 
                    lr.querySelector('.line-tgl').value = l.tgl; lr.querySelector('.line-gl').value = l.gl; lr.querySelector('.line-amount').value = formatEditableAmountValue(l.amount, data.mataUang || 'IDR'); 
                    if(l.note) { let nInp = lr.querySelector('.line-note'); nInp.style.display='block'; nInp.value = l.note; }
                });
            }
            if(!readOnly) { for(let i=0; i<(10 - (data.lines?data.lines.length:0)); i++) addNewLineRow(); } 
            
            calculateBalance(); updateSelectionSum(); changeMenu('claim-input');
            if(isHeaderHidden) toggleHeaderDisplay(); 
            setFormState(readOnly);
        }

        // --- QUICK RECAP ---
        function resetQuickForm() {
            currentEditingId = null; viewMode = false;
            ['qk-nama','qk-nik','qk-amount','qk-tgl-submit','qk-notes','qk-doc-no','qk-no-pr'].forEach(id => {
                let el = document.getElementById(id);
                if(el) {
                    if(id === 'qk-doc-no') { el.dataset.value = ''; el.value = '📄 + Input Ref Doc'; }
                    else { el.value = ''; }
                }
            });
            
            document.getElementById('qk-tgl-proses').value = getTodayString();
            ensureCurrencyOption(document.getElementById('qk-currency'), 'IDR');
            handleCurrencyChange('quick');
            document.getElementById('qk-entitas').value = 'AIO';
            document.getElementById('qk-nama').readOnly = true; document.getElementById('qk-entitas').disabled = true;
            document.getElementById('qk-nama').style.backgroundColor = '#e9ecef'; document.getElementById('qk-entitas').style.backgroundColor = '#e9ecef';
            updateGLDropdownOptions();
            setQuickFormState(false);
            document.getElementById('btn-qk-view-adjust').style.display = 'none';
        }
        async function saveQuickRekap(options = null) {
            if(!requireClaimEditor()) return;
            const saveOptions = options && typeof options === 'object' ? options : {};
let tempId = currentEditingId;
            let existingOldData = null;
            if (tempId) {
                let found = dbRekap.find(i => i.id === tempId);
                if (found) existingOldData = JSON.parse(JSON.stringify(found));
            }
            if(existingOldData && isClaimFinanciallyLocked(existingOldData)) return showToast('Data terkunci (Posted/Paid/Hold) dan bersifat baca-saja. Gunakan alur koreksi yang sesuai.', 'error');
            let qkNamaEl = document.getElementById('qk-nama');
            let nama = qkNamaEl ? toTitleCase(qkNamaEl.value.trim()) : ""; 
            let nik = document.getElementById('qk-nik').value.trim(); 
            let entitas = document.getElementById('qk-entitas').value;
            let mataUang = normalizeCurrency(document.getElementById('qk-currency').value);
            let totalHeader = parseCurrencyAmount(document.getElementById('qk-amount').value, mataUang);
            let tglP = document.getElementById('qk-tgl-proses').value; 
            let tglS = document.getElementById('qk-tgl-submit').value;
            
	    let docNoEl = document.getElementById('qk-doc-no');
            		  let docNoVal = docNoEl ? (docNoEl.dataset.value || "") : "";
            let prEl = document.getElementById('qk-no-pr');
            let noPR = prEl ? prEl.value.trim() : "";
            
            if(!nama || !nik || totalHeader <= 0) return showToast('Data header belum lengkap atau nominal bernilai nol.', 'error');
            
            if(!isValidDateString(tglP) || !isValidDateString(tglS)) return showToast('Tanggal tidak valid.', 'error');
            if(parseDateString(tglS) > parseDateString(tglP)) {
                customAlert('Tanggal Submit tidak boleh melewati Tanggal Proses.');
                return;
            }

            let existing = dbRekap.find(i => i.id === currentEditingId);
            let statusBaru = existing ? existing.statusClaim : "In Process"; 
            let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            
let adjNoteInput = document.getElementById('qk-adj-note');
            let adjNote = adjNoteInput ? adjNoteInput.value.trim() : "";
            let quickValueChanged = existing && (!amountsEqual(existing.totalHeader, totalHeader, mataUang) || getClaimCurrency(existing) !== mataUang);
            if (quickValueChanged && !adjNote) {
                return showToast('Alasan perubahan nominal pada kotak kuning wajib diisi.', 'error');
            }

            // Auto Archive logic
            let isArc = existing ? existing.isArchived : false;
            if(statusBaru === 'Posted') {
                isArc = true;
            }

            let claimData = { ...(existing || {}),
                nama, nik, entitas, tipe: document.getElementById('qk-tipe').value, statusClaim: statusBaru, 
                tglProses: tglP, tglSubmit: tglS, docNo: docNoVal, noPR: noPR,
                mataUang, totalHeader, isBalanced: true, lines: [], inputBy: existing ? existing.inputBy : sessionUser, isQuick: true, quickNote: document.getElementById('qk-notes').value.trim(), isArchived: isArc,
                createdAtMs: existing && existing.createdAtMs ? existing.createdAtMs : Date.now(), updatedAtMs: Date.now(),
                workflowTimestamps: existing && existing.workflowTimestamps ? existing.workflowTimestamps : { processStartedAt: Date.now() },
                historyLog: existing && existing.historyLog ? existing.historyLog : [{status: "In Process", time: timeNow, by: sessionUser}]
            };

            // Handling Adjustment Tracking
            if(existing) {
                let adjList = existing.adjustments || [];
                if(quickValueChanged) {
                    adjList.push({ type: 'Line', row: 1, gl: 'Total Amount (Quick)', oldVal: existing.totalHeader, newVal: totalHeader, oldCurrency: getClaimCurrency(existing), newCurrency: mataUang, date: timeNow, by: sessionUser, note: adjNote });
                }
                claimData.adjustments = adjList;
            }

            if(existing) {
                if(existing.postedAt) claimData.postedAt = existing.postedAt; 
                if(existing.postedBy) claimData.postedBy = existing.postedBy;
                if(existing.reviseStep) claimData.reviseStep = existing.reviseStep; 
                if(existing.reviseTime) claimData.reviseTime = existing.reviseTime;
                if(existing.reviseNote) claimData.reviseNote = existing.reviseNote; 
                if(existing.reviseTimestamp) claimData.reviseTimestamp = existing.reviseTimestamp;
                if(existing.waitingApprovalAt) claimData.waitingApprovalAt = existing.waitingApprovalAt;
                claimData.id = currentEditingId; dbRekap[dbRekap.findIndex(i => i.id === currentEditingId)] = claimData;
            } else { claimData.id = Date.now(); dbRekap.push(claimData); }
            
// Audit Trail Eksekusi
            if (tempId && existingOldData) {
                let updatedData = dbRekap.find(i => i.id === tempId);
                if (updatedData) {
                    let changes = detectFieldChanges(existingOldData, updatedData);
                    if (changes) {
                        updatedData.historyLog.push({
                            status: "✏️ Pembaruan Data Formulir", 
                            time: timeNow, by: sessionUser,
                            note: `Rincian yang diubah:<br><div style="margin-top:4px; font-size:11px;">${changes}</div>`
                        });
                    }
                }
            }

            try {
                await saveDataToLocal({ claimIds: [claimData.id] });
            } catch (error) {
                console.error('[Claim] Gagal menyimpan quick claim:', error);
                if(await window.restoreClaimsAfterConflict(error)) return;
                return showToast('Data gagal disimpan ke perangkat. Form tetap dibuka.', 'error');
            }
            const savedClaimId = claimData.id;
            logActivity(sessionUser, existing ? `Pembaruan Input Cepat Klaim ID: ${claimData.id}` : `Penambahan Klaim melalui Input Cepat ID: ${claimData.id}`);

            if(statusBaru === 'Posted') showRTPAnimation();
            const adjustmentChanged = !!existingOldData && (claimData.adjustments || []).length > (existingOldData.adjustments || []).length;
            const stayAfterAdjustment = Number(window.adjustmentStayClaimId) === Number(savedClaimId) || adjustmentChanged;
            if(saveOptions.stayOnForm || saveOptions.openStatusAfterSave || stayAfterAdjustment) {
                currentEditingId = savedClaimId;
                viewMode = false;
                updateQuickWorkflowControls();
                if(stayAfterAdjustment) window.adjustmentStayClaimId = null;
                showToast(stayAfterAdjustment ? 'Perubahan dan adjustment berhasil disimpan. Data tetap terbuka.' : 'Perubahan Input Cepat berhasil disimpan pada perangkat.', 'success');
                if(saveOptions.openStatusAfterSave) openStatusModal(savedClaimId);
                return savedClaimId;
            }
            currentEditingId = null;
            runLoader("Menyimpan...", () => { changeMenu('claim-rekap'); showToast('Data tersimpan', 'success'); });
            return savedClaimId;
        }

        // --- REKAP & HISTORY TABLE RENDER ---
        function openHistoryTimeline(id) {
            let data = dbRekap.find(i => i.id === id); if(!data) return;
            document.getElementById('modal-claim-id').value = id;
            document.getElementById('modal-status-edit-area').style.display = 'none';
            document.getElementById('btn-save-status').style.display = 'none';

            let tlContainer = document.getElementById('timeline-list');
            renderMergedTimelineContent(data, tlContainer);
            document.getElementById('modal-status').style.display = 'flex';
        }

        // --- HIST PAGINATION ---
        let histCurrentPage = 1; let histRowsPerPage = 20;
        function changeHistRows() { histRowsPerPage = parseInt(document.getElementById('hist-rows-per-page').value); histCurrentPage = 1; renderHistoryTable(); }
        function nextHistPage() { histCurrentPage++; renderHistoryTable(); }
        function prevHistPage() { if(histCurrentPage > 1) { histCurrentPage--; renderHistoryTable(); } }

        // Tombol daftar/folder kini satu segmented control, jadi status aktif
        // ditandai lewat class .is-active, bukan dengan menukar warna tombol.
        function setListViewSwitch(activeId, inactiveId) {
            const active = document.getElementById(activeId);
            const inactive = document.getElementById(inactiveId);
            if(active) active.classList.add('is-active');
            if(inactive) inactive.classList.remove('is-active');
        }
        window.setListViewSwitch = setListViewSwitch;

        function toggleHistoryView(mode) {
            const useFolder = mode === 'folder';
            const listView = document.getElementById('history-list-view');
            const folderView = document.getElementById('history-folder-view');
            if(listView) listView.style.display = useFolder ? 'none' : 'block';
            if(folderView) folderView.style.display = useFolder ? 'block' : 'none';
            setListViewSwitch(useFolder ? 'btn-view-folder' : 'btn-view-list', useFolder ? 'btn-view-list' : 'btn-view-folder');
            if(useFolder) {
                const baseData = dbRekap.filter(item => isCurrentHistoryClaim(item));
                renderHistoryFolder(getFilteredAndSortedData('history', baseData));
            }
        }
        window.toggleHistoryView = toggleHistoryView;

        function buildClaimStatusBadge(item) {
            const transitions = getAllowedStatusTransitions(item);
            const canChange = transitions.length > 0 && (canEditClaims() || canManageFinanceWorkflow());
            return canChange
                ? `<span class="badge ${getClaimStatusClass(item.statusClaim)} clickable" onclick="openStatusModal(${item.id})">${item.statusClaim} ✏️</span>`
                : `<span class="badge ${getClaimStatusClass(item.statusClaim)}" title="Status klaim">${item.statusClaim}</span>`;
        }

// ==========================================
// TAMPILAN FOLDER (Rekapitulasi, Riwayat, Revisi)
// Tiga modul memakai kerangka yang sama supaya kepala folder, jumlah item,
// dan animasi bukanya konsisten. Status buka/tutup disimpan pada kelas
// .is-open, bukan pada style inline, agar dapat diatur lewat CSS saja.
// ==========================================
window.toggleFolderGroup = function(trigger) {
    const group = trigger && trigger.closest ? trigger.closest('.folder-group') : null;
    if(!group) return;
    const open = group.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
};

function buildFolderGroup({ icon = '\u{1F4C1}', title = '', subtitle = '', count = 0, countLabel = 'Item', body = '', open = false }) {
    const safeTitle = escapeTimelineText(String(title));
    const safeSubtitle = subtitle ? `<small>${escapeTimelineText(String(subtitle))}</small>` : '';
    return `<div class="folder-group${open ? ' is-open' : ''}">
        <button type="button" class="folder-header" onclick="toggleFolderGroup(this)" aria-expanded="${open ? 'true' : 'false'}">
            <span class="folder-header-icon" aria-hidden="true">${icon}</span>
            <span class="folder-header-copy"><strong>${safeTitle}</strong>${safeSubtitle}</span>
            <span class="folder-header-count">${count} ${translateUiText(countLabel)}</span>
            <span class="folder-header-chevron" aria-hidden="true">\u2304</span>
        </button>
        <div class="folder-content">${body}</div>
    </div>`;
}
window.buildFolderGroup = buildFolderGroup;

        function buildHistoryFolderHTML(folderTitle, items) {
            let html = `<div class="table-responsive" style="border:none;">
            <table class="std-table">
                <thead>
                    <tr>
                        <th width="80" style="text-align:center;">Aksi</th>
<th width="80">No. <span class="th-filter-icon" onclick="openExcelFilter(event, 'noPR_extNo', 'history')">▼</span></th>
<th>Tgl RTP <span class="th-filter-icon" onclick="openExcelFilter(event, 'postedAtDate', 'history')">▼</span></th>
                        <th>Jam RTP <span class="th-filter-icon" onclick="openExcelFilter(event, 'postedAtTime', 'history')">▼</span></th>
                        <th>PIC Posted <span class="th-filter-icon" onclick="openExcelFilter(event, 'postedBy', 'history')">▼</span></th>
                        <th>Tgl Pymnt <span class="th-filter-icon" onclick="openExcelFilter(event, 'paymentAtDate', 'history')">▼</span></th>
                        <th>PIC Pymnt <span class="th-filter-icon" onclick="openExcelFilter(event, 'paymentBy', 'history')">▼</span></th>
                        <th>Ref Pymnt <span class="th-filter-icon" onclick="openExcelFilter(event, 'paymentReference', 'history')">▼</span></th>
                        <th>NIK <span class="th-filter-icon" onclick="openExcelFilter(event, 'nik', 'history')">▼</span></th>
                        <th>Karyawan <span class="th-filter-icon" onclick="openExcelFilter(event, 'nama', 'history')">▼</span></th>
                        <th>Entitas <span class="th-filter-icon" onclick="openExcelFilter(event, 'entitas', 'history')">▼</span></th>
                        <th>Tipe Pengajuan <span class="th-filter-icon" onclick="openExcelFilter(event, 'tipe', 'history')">▼</span></th>
                        <th>Tgl Proses <span class="th-filter-icon" onclick="openExcelFilter(event, 'tglProses', 'history')">▼</span></th>
                        <th>Tgl Submit <span class="th-filter-icon" onclick="openExcelFilter(event, 'tglSubmit', 'history')">▼</span></th>
                        <th style="text-align:center;">SLA (Submit-RTP) <span class="th-filter-icon" onclick="openExcelFilter(event, 'slaDays', 'history')">▼</span></th>
                        <th>Total Amount <span class="th-filter-icon" onclick="openExcelFilter(event, 'totalHeader', 'history')">▼</span></th>
                        <th>Diinput Oleh <span class="th-filter-icon" onclick="openExcelFilter(event, 'inputBy', 'history')">▼</span></th>
                        <th>Status <span class="th-filter-icon" onclick="openExcelFilter(event, 'statusClaim', 'history')">▼</span></th>
                    </tr>
                </thead>
                <tbody>`;
            
            items.forEach(item => {
                let ent = item.entitas || '-'; 
let tipeInfo = item.tipe + (item.extNo ? `<br><span class="badge status-process" style="font-size:10px; font-weight:bold; background:#0050A0; color:white; padding:2px 4px; margin-top:3px; display:inline-block;">🔢 No: ${item.extNo}</span>` : '');
                let detailBtn = '';
if (item.detailNota) {
    detailBtn = `<button class="btn" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Lihat Rincian Nota">🧾</button>`;
} else if (!isClaimFinanciallyLocked(item) && canEditClaims()) {
    detailBtn = `<button class="btn" style="background:#eef4fc; color:#0050A0; border:1px solid #cce0f5; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Buat Rincian Nota">➕</button>`;
} else {
    detailBtn = `<button class="btn" style="background:#f8f9fa; color:#6c757d; border:1px solid #dee2e6; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; opacity:0.6; cursor:not-allowed; margin-left:4px;" title="Detail kosong (Sudah Posted)" disabled>🧾 </button>`;
}

let actionBtns = buildClaimActionCell(item, { withTimeline: true, withReverse: true, withFinance: true });               let rtpArr = item.postedAt ? item.postedAt.replace(',', '').split(' ') : ['-', '-'];

                html += `<tr>
                    <td>${actionBtns}</td>
                    <td><strong>${item.noPR || item.extNo || '-'}</strong></td>
                    <td><strong style="color:#155724;">${rtpArr[0]}</strong></td>
                    <td><span style="font-size:11px; color:#555;">${rtpArr[1] ? rtpArr[1].replace(/\./g, ':') : '-'}</span></td>
                    <td><strong>${formatActorUsernameHtml(item.postedBy)}</strong></td>
                    <td><strong style="color:#00677f;">${formatPaymentDate(item)}</strong></td>
                    <td>${formatActorUsernameHtml(item.paymentBy)}</td>
                    <td>${formatPaymentReference(item)}</td>
                    <td>${item.nik}</td>
                    <td><strong>${item.nama}</strong></td>
                    <td><span class="badge status-revise">${ent}</span></td>
                    <td>${tipeInfo}</td>
                    <td>${item.tglProses || '-'}</td>
                    <td>${item.tglSubmit}</td>
                    <td style="text-align:center;">${renderSLABadge(item)}</td>
                    <td><strong style="color:#0050A0;">${formatClaimMoney(item)}</strong></td>
                    <td><span style="font-size:11px;color:#666;">${formatActorUsernameHtml(item.inputBy)}</span></td>
                    <td><span class="badge ${getClaimStatusClass(item.statusClaim)}">${item.statusClaim}</span></td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
            return buildFolderGroup({ icon:'\u{1F5C2}\uFE0F', title: folderTitle, count: items.length, countLabel:'data', body: html });
        }
function buildReviseFolderHTML(folderTitle, items, isArchived) {
    let chkClass = isArchived ? 'revise-arsip-checkbox' : 'revise-active-checkbox';
    let html = `<div class="table-responsive" style="border:none;">
        <table class="std-table">
            <thead>
                <tr>
                    <th width="30"><input type="checkbox" onclick="toggleSelectAll(this, '${chkClass}')"></th>
                    <th width="70">Aksi</th>
<th width="80">No. <span class="th-filter-icon" onclick="openExcelFilter(event, 'noPR_extNo', 'revise')">▼</span></th>
                    <th style="text-align:center;">SLA <span class="th-filter-icon" onclick="openExcelFilter(event, 'slaDays', 'revise')">▼</span></th>
                    <th>Tgl Submit</th>
                    <th>NIK</th>
                    <th>Karyawan</th>
                    <th>Entitas</th>
                    <th>Tipe</th>
                    <th>Amount</th>
                    <th>Tgl Pymnt</th>
                    <th>Target Tindak Lanjut</th>
                    <th>Status & Keterangan</th>
                </tr>
            </thead>
            <tbody>`;
    items.forEach(item => {
        html += buildReviseRowHTML(item, isArchived);
    });
    html += `</tbody></table></div>`;
    return buildFolderGroup({ icon: isArchived ? '\u{1F4E6}' : '\u{1F5C2}\uFE0F', title: folderTitle, count: items.length, countLabel:'data', body: html });
}
        function renderHistoryFolder(filteredData) {
            let container = document.getElementById('history-folder-view');
            container.innerHTML = '';
            if(filteredData.length === 0) {
                container.innerHTML = '<p style="font-style:italic; color:#777;">Tidak ada data historis.</p>';
                return;
            }

            let groupsArchived = {};
            filteredData.forEach(d => {
                let p = d.postedAt ? d.postedAt.split(' ')[0].split('/') : [];
                let yr = p.length === 3 ? p[2] : 'Unknown';
                let mo = p.length === 3 ? p[1] : 'Unknown';
                if(!groupsArchived[yr]) groupsArchived[yr] = {};
                if(!groupsArchived[yr][mo]) groupsArchived[yr][mo] = [];
                groupsArchived[yr][mo].push(d);
            });

            let arsipHtmlStr = "";
            Object.keys(groupsArchived).sort((a,b)=>b.localeCompare(a)).forEach(yr => {
                const months = groupsArchived[yr];
                const monthKeys = Object.keys(months).sort((a,b)=>b.localeCompare(a));
                const inner = monthKeys.map(mo => buildHistoryFolderHTML(`Bulan: ${mo}`, months[mo])).join('');
                const total = monthKeys.reduce((sum, mo) => sum + months[mo].length, 0);
                arsipHtmlStr += buildFolderGroup({
                    icon: '\u{1F4C5}', title: yr, subtitle: translateUiText('Tahun Posted'),
                    count: total, countLabel: 'data', body: inner
                });
            });
            container.innerHTML = arsipHtmlStr;
        }

        function renderHistoryTable() {
            let tbodyHist = document.getElementById('tbody-history-table');
            tbodyHist.innerHTML = '';

            renderFinanceQueueSummaries();
            let baseData = dbRekap.filter(i => isCurrentHistoryClaim(i));
            let filteredHistArr = getFilteredAndSortedData('history', baseData);

            // Folder view cukup dirender saat benar-benar terlihat.
            if(document.getElementById('history-folder-view').style.display !== 'none') renderHistoryFolder(filteredHistArr);

            let totalRows = filteredHistArr.length;
            let maxPage = Math.ceil(totalRows / histRowsPerPage) || 1;
            if(histCurrentPage > maxPage) histCurrentPage = maxPage;
            if(histCurrentPage < 1) histCurrentPage = 1;

            document.getElementById('hist-page-info').innerText = `Halaman ${histCurrentPage} dari ${maxPage} (${totalRows} Data)`;

            let startIdx = (histCurrentPage - 1) * histRowsPerPage;
            let pagedHist = filteredHistArr.slice(startIdx, startIdx + histRowsPerPage);

            pagedHist.forEach(item => {
                let ent = item.entitas || '-'; 
let tipeInfo = item.tipe + (item.extNo ? `<br><span class="badge status-process" style="font-size:10px; font-weight:bold; background:#0050A0; color:white; padding:2px 4px; margin-top:3px; display:inline-block;">🔢 No: ${item.extNo}</span>` : '');
                
                let detailBtn = '';
if (item.detailNota) {
    detailBtn = `<button class="btn" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Lihat Rincian Nota">🧾</button>`;
} else if (!isClaimFinanciallyLocked(item) && canEditClaims()) {
    detailBtn = `<button class="btn" style="background:#eef4fc; color:#0050A0; border:1px solid #cce0f5; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Buat Rincian Nota">➕</button>`;
} else {
    detailBtn = `<button class="btn" style="background:#f8f9fa; color:#6c757d; border:1px solid #dee2e6; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; opacity:0.6; cursor:not-allowed; margin-left:4px;" title="Detail kosong (Sudah Posted)" disabled>🧾</button>`;
}

let actionBtns = buildClaimActionCell(item, { withTimeline: true, withReverse: true, withFinance: true });             
                let adjBadge = (item.adjustments && item.adjustments.length > 0) ? `<br><span style="font-size:10px; color:#dc3545; font-weight:bold;">[Disesuaikan]</span>` : '';
                
                let rtpArr = [getExcelFilterCellValue(item, 'postedAtDate'), getExcelFilterCellValue(item, 'postedAtTime')];

                tbodyHist.innerHTML += `<tr>
                    <td class="selection-only-column"><input type="checkbox" class="history-checkbox" data-id="${item.id}"></td>
                    <td>${actionBtns}</td>
                    <td><strong>${item.noPR || item.extNo || '-'}</strong></td>
                    <td><strong style="color:#155724;">${rtpArr[0]}</strong></td>
                    <td><span style="font-size:11px; color:#555;">${rtpArr[1] ? rtpArr[1].replace(/\./g, ':') : '-'}</span></td>
                    <td><strong>${formatActorUsernameHtml(item.postedBy)}</strong></td>
                    <td><strong style="color:#00677f;">${formatPaymentDate(item)}</strong></td>
                    <td>${formatActorUsernameHtml(item.paymentBy)}</td>
                    <td>${formatPaymentReference(item)}</td>
                    <td>${item.nik}</td>
                    <td><strong>${item.nama}</strong></td>
                    <td><span class="badge status-revise">${ent}</span></td>
                    <td>${tipeInfo}</td>
                    <td>${item.tglProses || '-'}</td>
                    <td>${item.tglSubmit}</td>
                    <td style="text-align:center;">${renderSLABadge(item)}</td>
                    <td>${formatClaimMoney(item)}${adjBadge}</td>
                    <td><span style="font-size:11px;color:#666;">${formatActorUsernameHtml(item.inputBy)}</span></td>
                    <td><span class="badge ${getClaimStatusClass(item.statusClaim)}">${item.statusClaim}</span></td>
                </tr>`;
            });
        }

tableFilters['waiting'] = {}; tableSorts['waiting'] = {col:'id', dir:'DESC'};
window.waitingCurrentPage = 1; window.waitingRowsPerPage = 20;

// PIC Proses pada Waiting Approval adalah orang yang memindahkan claim ke
// antrean persetujuan, bukan yang pertama kali menginput datanya. Nilainya
// diambil dari entri historyLog terakhir yang berpindah ke Waiting Approval;
// bila jejaknya belum ada (data lama), barulah jatuh ke inputBy.
window.getWaitingApprovalActor = function(item) {
    const log = Array.isArray(item && item.historyLog) ? item.historyLog : [];
    for(let i = log.length - 1; i >= 0; i--) {
        const status = String(log[i] && log[i].status || '').toLowerCase();
        if(status.includes('waiting approval') || status.includes('menunggu persetujuan')) {
            const actor = log[i].by || log[i].user;
            if(actor) return actor;
        }
    }
    return item && item.inputBy;
};

window.renderWaitingTable = function() {
    let tbody = document.getElementById('tbody-main-waiting'); if (!tbody) return; tbody.innerHTML = '';
    let baseData = dbRekap.filter(i => i.statusClaim === 'Waiting Approval' || i.statusClaim === 'Confirm');
    let filteredArr = getFilteredAndSortedData('waiting', baseData);
    let totalRows = filteredArr.length; let maxPage = Math.ceil(totalRows / window.waitingRowsPerPage) || 1;
    if(window.waitingCurrentPage > maxPage) window.waitingCurrentPage = maxPage; if(window.waitingCurrentPage < 1) window.waitingCurrentPage = 1;
    let pageInfo = document.getElementById('waiting-page-info'); if(pageInfo) pageInfo.innerText = `Halaman ${window.waitingCurrentPage} dari ${maxPage} (${totalRows} Data)`;
    let startIdx = (window.waitingCurrentPage - 1) * window.waitingRowsPerPage; let pagedData = filteredArr.slice(startIdx, startIdx + window.waitingRowsPerPage);
    if (pagedData.length === 0) { tbody.innerHTML = '<tr><td colspan="13" class="table-empty-state">🎉 Kosong! Tidak ada dokumen yang menunggu approval.</td></tr>'; return; }

    pagedData.forEach(item => {
        let ent = item.entitas || '-';
let actionBtns = buildRekapActionCell(item, true);
        let tipeInfo = item.tipe + (item.extNo ? `<br><span class="badge status-process" style="font-size:10px; font-weight:bold; background:#0050A0; color:white; padding:2px 4px; margin-top:3px; display:inline-block;">🔢 No: ${item.extNo}</span>` : '');
        let slaTxt = typeof renderSLABadge === 'function' ? renderSLABadge(item) : 'SLA';
        let waitTime = "-"; if (item.waitingApprovalAt) { let d = new Date(item.waitingApprovalAt); if (!isNaN(d.getTime())) waitTime = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear(); else waitTime = item.waitingApprovalAt; }
        tbody.innerHTML += `<tr><td class="selection-only-column"><input type="checkbox" class="waiting-checkbox" data-id="${item.id}"></td><td>${actionBtns}</td><td><strong>${item.noPR || item.extNo || '-'}</strong></td><td>${item.nik}</td><td><strong>${item.nama}</strong></td><td><span class="badge status-revise">${ent}</span></td><td>${tipeInfo}</td><td>${item.tglProses || '-'}</td><td>${item.tglSubmit}</td><td style="text-align:center;">${slaTxt}</td><td><strong style="color:#0050A0;">${formatClaimMoney(item)}</strong></td><td><span class="rekap-input-by">${formatActorUsernameHtml(getWaitingApprovalActor(item))}</span></td><td><span class="badge" style="background:#ff9800; color:white;">${waitTime}</span></td></tr>`;
    });
};


window.inProcessCurrentPage = Number(window.inProcessCurrentPage) || 1;
window.inProcessRowsPerPage = Number(window.inProcessRowsPerPage) || 20;
window.canceledCurrentPage = Number(window.canceledCurrentPage) || 1;
window.canceledRowsPerPage = Number(window.canceledRowsPerPage) || 20;

window.renderInProcessTable = function() {
    const tbody = document.getElementById('tbody-in-process');
    if(!tbody) return;
    const baseData = dbRekap.filter(item => ['In Process', 'Returned by Finance'].includes(String(item.statusClaim || '')) && !isCanceledClaim(item));
    const filtered = getFilteredAndSortedData('in-process', baseData);
    const maxPage = Math.ceil(filtered.length / window.inProcessRowsPerPage) || 1;
    window.inProcessCurrentPage = Math.min(Math.max(1, window.inProcessCurrentPage), maxPage);
    const start = (window.inProcessCurrentPage - 1) * window.inProcessRowsPerPage;
    const pageRows = filtered.slice(start, start + window.inProcessRowsPerPage);
    const pageInfo = document.getElementById('in-process-page-info');
    if(pageInfo) pageInfo.textContent = `Halaman ${window.inProcessCurrentPage} / ${maxPage} (${filtered.length} Data)`;
    if(!pageRows.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Tidak ada claim aktif pada filter ini.</td></tr>';
        return;
    }
    tbody.innerHTML = pageRows.map(item => `<tr>
        <td><strong>${escapeTimelineText(item.noPR || item.extNo || '-')}</strong></td>
        <td>${escapeTimelineText(item.tglProses || '-')}</td>
        <td>${escapeTimelineText(item.tglSubmit || '-')}</td>
        <td>${escapeTimelineText(item.nik || '-')}</td>
        <td><strong>${escapeTimelineText(item.nama || '-')}</strong></td>
        <td>${escapeTimelineText(item.entitas || '-')}</td>
        <td>${escapeTimelineText(item.tipe || '-')}</td>
        <td><strong>${formatClaimMoney(item)}</strong></td>
        <td>${buildClaimStatusBadge(item)}</td>
    </tr>`).join('');
};

window.openClaimNoteDetail = function(id, type = 'cancel') {
    const item = dbRekap.find(row => Number(row.id) === Number(id));
    if(!item) return;
    const title = document.getElementById('note-detail-title');
    const body = document.getElementById('note-detail-body');
    const meta = document.getElementById('note-detail-meta');
    if(!title || !body || !meta) return;
    const isCancel = type === 'cancel';
    title.textContent = isCancel ? 'Detail Catatan Cancel' : 'Detail Catatan';
    const note = isCancel ? (item.cancelReason || '-') : (item.reviseNote || item.quickNote || '-');
    meta.innerHTML = `<span>${escapeTimelineText(item.noPR || item.extNo || item.id)}</span><span>${escapeTimelineText(item.nama || '-')}</span>`;
    body.textContent = note;
    document.getElementById('modal-note-detail').style.display = 'flex';
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(document.getElementById('modal-note-detail'));
};

window.renderCanceledTable = function() {
    const tbody = document.getElementById('tbody-canceled');
    if(!tbody) return;
    const baseData = dbRekap.filter(item => isCanceledClaim(item));
    const filtered = getFilteredAndSortedData('canceled', baseData);
    const maxPage = Math.ceil(filtered.length / window.canceledRowsPerPage) || 1;
    window.canceledCurrentPage = Math.min(Math.max(1, window.canceledCurrentPage), maxPage);
    const start = (window.canceledCurrentPage - 1) * window.canceledRowsPerPage;
    const pageRows = filtered.slice(start, start + window.canceledRowsPerPage);
    const pageInfo = document.getElementById('canceled-page-info');
    if(pageInfo) pageInfo.textContent = `Halaman ${window.canceledCurrentPage} / ${maxPage} (${filtered.length} Data)`;
    if(!pageRows.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:#94a3b8;">Tidak ada claim canceled pada filter ini.</td></tr>';
        return;
    }
    tbody.innerHTML = pageRows.map(item => {
        // Bentuknya disamakan dengan kolom catatan pada modul Revisi: badge status,
        // waktu pembaruan, lalu kotak catatan dengan tombol Detail yang melebarkan teks.
        const formattedReason = window.formatLongNote(item.cancelReason || '-');
        return `<tr>
            <td><strong>${escapeTimelineText(item.noPR || item.extNo || '-')}</strong></td>
            <td>${escapeTimelineText(formatCanceledDate(item))}</td>
            <td>${formatActorUsernameHtml(item.canceledBy)}</td>
            <td>${escapeTimelineText(item.tglSubmit || '-')}</td>
            <td>${escapeTimelineText(item.nik || '-')}</td>
            <td><strong>${escapeTimelineText(item.nama || '-')}</strong></td>
            <td>${escapeTimelineText(item.entitas || '-')}</td>
            <td>${escapeTimelineText(item.tipe || '-')}</td>
            <td><strong>${formatClaimMoney(item)}</strong></td>
            <td class="wrap-text">
                <div class="strict-wrap">${buildClaimStatusBadge(item)}
                <div class="claim-note-updated">🕒 ${translateUiText('Pembaruan')}: ${escapeTimelineText(formatCanceledDate(item))}</div>
                <div class="claim-note-box">${translateUiText('Catatan')}: ${formattedReason}</div></div>
            </td>
        </tr>`;
    }).join('');
};

        // --- REKAP PAGINATION & 2 VIEWS RENDER ---
        // Status halaman Rekapitulasi. Dideklarasikan di scope global classic script
        // agar renderRekapTable(), pagination, dan reset filter memakai state yang sama.
        let rekapCurrentPage = 1;
        let rekapRowsPerPage = 20;
        window.getRekapPageState = () => ({ page: rekapCurrentPage, rows: rekapRowsPerPage });

        function changeRekapRows() {
            const select = document.getElementById('rekap-rows-per-page');
            rekapRowsPerPage = Math.max(1, parseInt(select && select.value, 10) || 20);
            rekapCurrentPage = 1;
            renderRekapTable();
        }
        function nextRekapPage() { rekapCurrentPage++; renderRekapTable(); }
        function prevRekapPage() { if(rekapCurrentPage > 1) { rekapCurrentPage--; renderRekapTable(); } }
        window.changeRekapRows = changeRekapRows;
        window.nextRekapPage = nextRekapPage;
        window.prevRekapPage = prevRekapPage;

        function toggleRekapView(mode) {
            const listView = document.getElementById('rekap-list-view');
            const folderView = document.getElementById('rekap-folder-view');
            const listBtn = document.getElementById('btn-rekap-list');
            const folderBtn = document.getElementById('btn-rekap-folder');
            if(!listView || !folderView) return;
            const useFolder = mode === 'folder';
            listView.style.display = useFolder ? 'none' : 'block';
            folderView.style.display = useFolder ? 'block' : 'none';
            if(listBtn) listBtn.classList.toggle('is-active', !useFolder);
            if(folderBtn) folderBtn.classList.toggle('is-active', useFolder);
            if(useFolder) renderRekapFolder(getFilteredAndSortedData('rekap', dbRekap));
        }
        window.toggleRekapView = toggleRekapView;

        // Baris aksi dipakai bersama oleh tampilan daftar dan tampilan folder
        // supaya kedua tampilan tidak pernah berbeda aturan hak akses.
        // Satu daftar aksi untuk seluruh tabel klaim. Setiap layar memilih aksi
        // tambahan yang relevan lewat options, tetapi aturan hak aksesnya sama.
        function getClaimActions(item, options = {}) {
            const { withStatus = false, withTimeline = false, withReverse = false, withFinance = false } = options;
            const locked = isClaimFinanciallyLocked(item);
            const canChangeStatus = getAllowedStatusTransitions(item).length > 0;
            const actions = [];

            actions.push(locked || !canEditClaims()
                ? { icon:'👁️', label:'Lihat data', run:`openEditRoute(${item.id}, true)` }
                : { icon:'✏️', label:'Ubah data', run:`openEditRoute(${item.id})` });

            if(withTimeline) actions.push({ icon:'🕒', label:'Linimasa status', run:`openHistoryTimeline(${item.id})` });
            if(withStatus && canChangeStatus) actions.push({ icon:'🔄', label:'Ubah Status', run:`openStatusModal(${item.id})` });
            if(withFinance && canManageFinanceWorkflow() && canChangeStatus) actions.push({ icon:'💳', label:'Tindakan Finance', run:`openStatusModal(${item.id})`, tone:'finance' });
            if(withReverse && isAppAdmin() && item.statusClaim === 'Posted') actions.push({ icon:'↩', label:'Batalkan Posted', run:`reverseClaim(${item.id})`, tone:'warning' });

            if(item.detailNota) actions.push({ icon:'🧾', label:'Lihat Rincian Nota', run:`searchAndLoadDetail(${item.id})`, tone:'ready' });
            else if(!locked && canEditClaims()) actions.push({ icon:'➕', label:'Buat Rincian Nota', run:`searchAndLoadDetail(${item.id})`, tone:'add' });
            else actions.push({ icon:'🧾', label:'Detail kosong (Sudah Posted)', disabled:true });

            if(isAppAdmin() && !locked) actions.push({ icon:'🗑️', label:'Hapus', run:`deleteClaim(${item.id})`, tone:'danger' });
            // Aksi khusus satu layar, misalnya arsip pada Pemantauan Revisi.
            if(options.withArchive && canEditClaims() && !isFinalClaimStatus(item.statusClaim)) {
                actions.push(options.isArchived
                    ? { icon:'📤', label:'Kembalikan ke daftar aktif', run:`toggleArchive(${item.id})` }
                    : { icon:'📦', label:'Arsipkan', run:`toggleArchive(${item.id})` });
            }
            return actions;
        }
        window.getClaimActions = getClaimActions;

        // Aksi baris diringkas menjadi satu tombol. Menunya dirender ke body
        // dengan position:fixed karena tabel memakai overflow:auto, sehingga
        // menu yang tertanam di dalam sel akan terpotong.
        function buildClaimActionCell(item, options = {}) {
            const encoded = escapeTimelineText(JSON.stringify(options || {}));
            return `<div class="claim-action-cell"><button type="button" class="claim-action-trigger" data-claim-action-trigger="${item.id}"
                onclick="toggleClaimActionMenu(event, ${item.id}, '${encoded}')"
                aria-haspopup="menu" aria-expanded="false"
                title="${translateUiText('Aksi')}" aria-label="${translateUiText('Aksi')}"><span aria-hidden="true">⋯</span></button></div>`;
        }
        window.buildClaimActionCell = buildClaimActionCell;

        // Nama lama dipertahankan agar pemanggil yang sudah ada tetap bekerja.
        function buildRekapActionCell(item, withStatus = false) {
            return buildClaimActionCell(item, { withStatus });
        }

        function closeClaimActionMenu() {
            const menu = document.getElementById('claim-action-menu');
            if(menu) menu.remove();
            document.querySelectorAll('[data-claim-action-trigger][aria-expanded="true"]')
                .forEach(button => button.setAttribute('aria-expanded', 'false'));
            document.removeEventListener('click', handleClaimActionOutside, true);
            document.removeEventListener('keydown', handleClaimActionKey, true);
            window.removeEventListener('resize', closeClaimActionMenu);
            window.removeEventListener('scroll', closeClaimActionMenu, true);
        }
        window.closeClaimActionMenu = closeClaimActionMenu;

        function handleClaimActionOutside(event) {
            const menu = document.getElementById('claim-action-menu');
            if(!menu) return closeClaimActionMenu();
            if(menu.contains(event.target) || event.target.closest('[data-claim-action-trigger]')) return;
            closeClaimActionMenu();
        }
        function handleClaimActionKey(event) {
            if(event.key === 'Escape') closeClaimActionMenu();
        }

        window.runClaimAction = function(index) {
            const menu = document.getElementById('claim-action-menu');
            if(!menu) return;
            const action = (menu.__claimActions || [])[index];
            closeClaimActionMenu();
            if(action && action.run) new Function(action.run)();
        };

        window.toggleClaimActionMenu = function(event, id, encodedOptions) {
            event.preventDefault();
            event.stopPropagation();
            const trigger = event.currentTarget;
            const alreadyOpen = trigger.getAttribute('aria-expanded') === 'true';
            closeClaimActionMenu();
            if(alreadyOpen) return;

            const item = dbRekap.find(row => Number(row.id) === Number(id));
            if(!item) return;
            let options = {};
            try { options = JSON.parse(encodedOptions || '{}'); } catch(_) { options = {}; }
            const actions = getClaimActions(item, options);
            if(!actions.length) return;

            const menu = document.createElement('div');
            menu.id = 'claim-action-menu';
            menu.className = 'claim-action-menu';
            menu.setAttribute('role', 'menu');
            menu.__claimActions = actions;
            menu.innerHTML = actions.map((action, index) => `<button type="button" role="menuitem" class="claim-action-item${action.tone ? ' tone-' + action.tone : ''}"
                ${action.disabled ? 'disabled' : `onclick="runClaimAction(${index})"`}>
                <span class="claim-action-icon" aria-hidden="true">${action.icon}</span><span>${escapeTimelineText(translateUiText(action.label))}</span></button>`).join('');
            document.body.appendChild(menu);

            const rect = trigger.getBoundingClientRect();
            const width = menu.offsetWidth;
            const height = menu.offsetHeight;
            // Menu dijaga tetap di dalam layar, dan dibalik ke atas bila ruang bawah kurang.
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            const top = rect.bottom + 6 + height > window.innerHeight
                ? Math.max(8, rect.top - height - 6)
                : rect.bottom + 6;
            menu.style.left = `${Math.round(left)}px`;
            menu.style.top = `${Math.round(top)}px`;
            trigger.setAttribute('aria-expanded', 'true');

            document.addEventListener('click', handleClaimActionOutside, true);
            document.addEventListener('keydown', handleClaimActionKey, true);
            window.addEventListener('resize', closeClaimActionMenu);
            window.addEventListener('scroll', closeClaimActionMenu, true);
        };

        function renderRekapFolder(filteredData) {
            const container = document.getElementById('rekap-folder-view');
            if(!container) return;
            const rows = Array.isArray(filteredData) ? filteredData : [];
            if(rows.length === 0) {
                container.innerHTML = `<p class="rekap-folder-empty">${translateUiText('Tidak ada data rekapitulasi.')}</p>`;
                return;
            }

            const groups = {};
            rows.forEach(row => {
                const parts = row.tglProses ? String(row.tglProses).split('/') : [];
                const key = parts.length === 3 ? `${parts[2]} - ${parts[1]}` : translateUiText('Tanpa Tanggal Proses');
                (groups[key] = groups[key] || []).push(row);
            });

            const headerCells = [
                ['Aksi', ''], ['No.', 'noPR_extNo'], ['NIK', 'nik'], ['Nama Karyawan', 'nama'],
                ['Entitas', 'entitas'], ['Tipe Pengajuan', 'tipe'], ['Tgl Proses', 'tglProses'],
                ['Tgl Submit', 'tglSubmit'], ['SLA', 'slaDays'], ['Total Amount', 'totalHeader'],
                ['Tgl Pymnt', 'paymentAtDate'], ['PIC Pymnt', 'paymentBy'], ['Diinput Oleh', 'inputBy'],
                ['Status Data', 'statusClaim']
            ].map(([label, key]) => key
                ? `<th>${translateUiText(label)} <span class="th-filter-icon" onclick="openExcelFilter(event, '${key}', 'rekap')">▼</span></th>`
                : `<th width="70">${translateUiText(label)}</th>`).join('');

            container.innerHTML = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(key => {
                const body = groups[key].map(item => `<tr>
                        <td>${buildRekapActionCell(item)}</td>
                        <td><strong>${escapeTimelineText(item.noPR || item.extNo || '-')}</strong></td>
                        <td>${escapeTimelineText(item.nik || '-')}</td>
                        <td><strong>${escapeTimelineText(item.nama || '-')}</strong></td>
                        <td><span class="badge status-revise">${escapeTimelineText(item.entitas || '-')}</span></td>
                        <td>${escapeTimelineText(item.tipe || '-')}</td>
                        <td>${escapeTimelineText(item.tglProses || '-')}</td>
                        <td>${escapeTimelineText(item.tglSubmit || '-')}</td>
                        <td style="text-align:center;">${renderSLABadge(item)}</td>
                        <td><strong class="rekap-amount">${formatClaimMoney(item)}</strong></td>
                        <td>${escapeTimelineText(formatPaymentDate(item))}</td>
                        <td>${formatActorUsernameHtml(item.paymentBy)}</td>
                        <td><span class="rekap-input-by">${formatActorUsernameHtml(item.inputBy)}</span></td>
                        <td>${buildClaimStatusBadge(item)}</td>
                    </tr>`).join('');
                return buildFolderGroup({
                    icon: '\u{1F5C2}\uFE0F',
                    title: key,
                    subtitle: translateUiText('Bulan/Tahun Proses'),
                    count: groups[key].length,
                    body: `<div class="table-responsive" style="border:none;"><table class="std-table"><thead><tr>${headerCells}</tr></thead><tbody>${body}</tbody></table></div>`
                });
            }).join('');
        }
        window.renderRekapFolder = renderRekapFolder;

        function renderRekapTable() {
            const tbodyRekap = document.getElementById('tbody-main-rekap');
            if(!tbodyRekap) return;

            const filteredArr = getFilteredAndSortedData('rekap', dbRekap);

            // Hindari membangun ratusan baris folder ketika pengguna sedang memakai list view.
            const folderView = document.getElementById('rekap-folder-view');
            if(folderView && folderView.style.display !== 'none') renderRekapFolder(filteredArr);

            const totalRows = filteredArr.length;
            const maxPage = Math.ceil(totalRows / rekapRowsPerPage) || 1;
            if(rekapCurrentPage > maxPage) rekapCurrentPage = maxPage;
            if(rekapCurrentPage < 1) rekapCurrentPage = 1;

            const pageInfo = document.getElementById('rekap-page-info');
            if(pageInfo) pageInfo.innerText = `Halaman ${rekapCurrentPage} dari ${maxPage} (${totalRows} Data)`;

            const startIdx = (rekapCurrentPage - 1) * rekapRowsPerPage;
            const pagedData = filteredArr.slice(startIdx, startIdx + rekapRowsPerPage);

            if(pagedData.length === 0) {
                tbodyRekap.innerHTML = `<tr><td colspan="15" class="table-empty-state">${translateUiText('Tidak ada data rekapitulasi pada periode ini.')}</td></tr>`;
                return;
            }

            tbodyRekap.innerHTML = pagedData.map(item => {
                const adjBadge = (item.adjustments && item.adjustments.length > 0)
                    ? `<br><span class="rekap-adjust-badge">[${translateUiText('Disesuaikan')}]</span>`
                    : '';
                return `<tr>
                    <td class="selection-only-column"><input type="checkbox" class="rekap-checkbox" data-id="${item.id}"></td>
                    <td>${buildRekapActionCell(item)}</td>
                    <td><strong>${escapeTimelineText(item.noPR || item.extNo || '-')}</strong></td>
                    <td>${escapeTimelineText(item.nik || '-')}</td>
                    <td><strong>${escapeTimelineText(item.nama || '-')}</strong></td>
                    <td><span class="badge status-revise">${escapeTimelineText(item.entitas || '-')}</span></td>
                    <td>${escapeTimelineText(item.tipe || '-')}</td>
                    <td>${escapeTimelineText(item.tglProses || '-')}</td>
                    <td>${escapeTimelineText(item.tglSubmit || '-')}</td>
                    <td style="text-align:center;">${renderSLABadge(item)}</td>
                    <td>${formatClaimMoney(item)}${adjBadge}</td>
                    <td>${escapeTimelineText(formatPaymentDate(item))}</td>
                    <td>${formatActorUsernameHtml(item.paymentBy)}</td>
                    <td><span class="rekap-input-by">${formatActorUsernameHtml(item.inputBy)}</span></td>
                    <td>${buildClaimStatusBadge(item)}</td>
                </tr>`;
            }).join('');
        }
        window.renderRekapTable = renderRekapTable;
        function deleteClaim(id) {
            if(!requireAdmin()) return;
            customConfirm("Apakah Anda yakin ingin menghapus data klaim ini secara permanen?", async () => {
                const backup = clonePlain(dbRekap);
                dbRekap = dbRekap.filter(i => i.id !== id); 
                try { await saveDataToLocal({ claimIds: [id] }); }
                catch(error) {
                    if(await window.restoreClaimsAfterConflict(error)) return;
                    dbRekap = backup; await dbSyncClaimRows([id]).catch(() => {});
                    return showToast('Penghapusan gagal disimpan lokal; data dikembalikan.', 'error');
                }
                logActivity(sessionUser, `Penghapusan Permanen Klaim ID: ${id}`);
                
                // Refresh seluruh view agar sinkron secara universal
                renderRekapTable(); 
                renderHistoryTable(); 
                renderReviseConfirm();
                if(window.currentOpenMenu === 'super-find') renderSuperFindTable();
                
                showToast('Data berhasil dihapus.', 'success');
            }); 
        }

        // --- REVERSE SATU CLAIM (ADMIN) ---
        function reverseClaim(id) {
    if(!requireAdmin()) return;
    let index = dbRekap.findIndex(i => i.id === id);
    if(index < 0) return;
    if(dbRekap[index].statusClaim !== 'Posted') {
        openStatusModal(id);
        return showToast('Status Paid/Hold harus dikoreksi melalui Tindakan Finance agar alasan audit tercatat.', 'info');
    }
    const targetStatus = 'In Process';
    customConfirm(`Apakah Anda yakin ingin membatalkan status Posted dan mengembalikan data ini ke '${targetStatus}'?`, async () => {
        if(index !== -1) {
            const backup = clonePlain(dbRekap[index]);
            dbRekap[index].statusClaim = targetStatus;
            delete dbRekap[index].postedAt;
            delete dbRekap[index].postedBy;
            if(dbRekap[index].workflowTimestamps) delete dbRekap[index].workflowTimestamps.completedAt;
            dbRekap[index].isArchived = false;
            
            // --- FIX: Bersihkan jejak atribut revisi ---
            dbRekap[index].reviseStep = null;
            dbRekap[index].reviseTime = null;
            dbRekap[index].reviseTimestamp = null;
            dbRekap[index].reviseNote = null;
            // -------------------------------------------

            let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            if(!dbRekap[index].historyLog) dbRekap[index].historyLog = [];
            dbRekap[index].historyLog.push({status: `Reversed to ${targetStatus}`, time: timeNow, by: sessionUser});
            
            try { await saveDataToLocal({ claimIds: [id] }); }
            catch(error) {
                if(await window.restoreClaimsAfterConflict(error)) return;
                dbRekap[index] = backup; await dbSyncClaimRows([id]).catch(() => {});
                return showToast('Pembatalan status gagal disimpan pada perangkat; data telah dikembalikan.', 'error');
            }
            logActivity(sessionUser, `Pembatalan Status Posted Klaim ID ${id}: kembali ke ${targetStatus}`);
            renderHistoryTable(); renderRekapTable(); renderReviseConfirm(); showToast('Status Posted berhasil dibatalkan.', 'success');
        }
    });
}

        // --- REVISE & CONFIRM MENU ---
        let reviseViewMode = 'list';
        function toggleReviseView(mode) {
            reviseViewMode = mode;
            
            // Toggle Display List vs Folder for Active Section
            document.getElementById('revise-active-list-view').style.display = mode === 'list' ? 'block' : 'none';
            document.getElementById('revise-active-folder-view').style.display = mode === 'folder' ? 'block' : 'none';
            
            // Toggle Display List vs Folder for Arsip Section
            document.getElementById('revise-arsip-list-view').style.display = mode === 'list' ? 'block' : 'none';
            document.getElementById('revise-arsip-folder-view').style.display = mode === 'folder' ? 'block' : 'none';
            
            setListViewSwitch(mode === 'list' ? 'btn-rev-list' : 'btn-rev-folder', mode === 'list' ? 'btn-rev-folder' : 'btn-rev-list');
            renderReviseConfirm();
        }

        async function toggleArchive(id) {
            if(!requireClaimEditor()) return;
            let index = dbRekap.findIndex(i => i.id === id);
            if(index !== -1) {
                let item = dbRekap[index];
                if(!isFinalClaimStatus(item.statusClaim) && item.reviseStep !== 'Cleared') {
                    return customAlert('Hanya data berstatus Posted atau pada tahap Cleared yang dapat diarsipkan.');
                }
                const backup = clonePlain(item);
                dbRekap[index].isArchived = !dbRekap[index].isArchived;
                try { await saveDataToLocal({ claimIds: [id] }); }
                catch(error) {
                    if(await window.restoreClaimsAfterConflict(error)) return;
                    dbRekap[index] = backup; await dbSyncClaimRows([id]).catch(() => {});
                    return showToast('Perubahan arsip gagal disimpan ke perangkat.', 'error');
                }
                logActivity(sessionUser, dbRekap[index].isArchived ? `Arsipkan Data ID: ${id}` : `Aktifkan Kembali Data ID: ${id}`);
                renderReviseConfirm();
                showToast(dbRekap[index].isArchived ? '📦 Data berhasil diarsipkan.' : '📤 Data berhasil dikembalikan ke daftar aktif.', 'success');
            }
        }

        function buildReviseRowHTML(item, isArchived) {
    let now = Date.now(); let followUpHtml = ''; let followUpDateTxt = '-';
    if((item.statusClaim === 'Revisi' || item.statusClaim === 'Waiting Approval') && item.reviseTimestamp) {
        let diffDays = Math.floor((now - item.reviseTimestamp) / (1000 * 60 * 60 * 24)); let target = new Date(item.reviseTimestamp + (3 * 24 * 60 * 60 * 1000));
        let targetStr = `${target.getDate().toString().padStart(2, '0')} ${target.toLocaleString('id-ID', { month: 'short' })} ${target.getFullYear()}`;
        if(diffDays >= 3) { followUpDateTxt = `<span style="color:#dc3545; font-weight:bold;">${targetStr}<br>(Terlambat)</span>`; followUpHtml = `<div style="margin-top:5px;"><span class="badge" style="background:#dc3545; color:white;">🚨 Memerlukan Tindak Lanjut</span></div>`; } else { followUpDateTxt = `<span style="color:#856404; font-weight:bold;">${targetStr}</span>`; }
    } else if (isFinalClaimStatus(item.statusClaim) || item.reviseStep === 'Cleared') {
        followUpDateTxt = `<span class="badge status-posted">Selesai</span>`; followUpHtml = `<div style="margin-top:5px;"><span class="badge" style="background:#28a745; color:white;">✅ Terselesaikan (Posted)</span></div>`;
    }

    let sClass = getClaimStatusClass(item.statusClaim);
    let lastUpdateTxt = isFinalClaimStatus(item.statusClaim) ? (item.paymentAt || item.postedAt) : (item.reviseTime || '-');
    let btnStatus = `<span class="badge ${sClass} clickable" onclick="openStatusModal(${item.id})">${item.statusClaim} ✏️</span>`;
    let adjBadge = (item.adjustments && item.adjustments.length > 0) ? `<br><span style="font-size:10px; color:#dc3545; font-weight:bold;">[Disesuaikan]</span>` : '';
    let btnArch = canEditClaims() && !isFinalClaimStatus(item.statusClaim) ? (isArchived ? `<button class="btn-icon" onclick="toggleArchive(${item.id})" title="Kembalikan ke daftar aktif">📤</button>` : `<button class="btn-icon" onclick="toggleArchive(${item.id})" title="Arsipkan">📦</button>`) : '';
    let detailBtn = '';
if (item.detailNota) {
    detailBtn = `<button class="btn" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Lihat Rincian Nota">🧾</button>`;
} else if (!isClaimFinanciallyLocked(item) && canEditClaims()) {
    detailBtn = `<button class="btn" style="background:#eef4fc; color:#0050A0; border:1px solid #cce0f5; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Buat Rincian Nota">➕</button>`;
} else {
    detailBtn = `<button class="btn" style="background:#f8f9fa; color:#6c757d; border:1px solid #dee2e6; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; opacity:0.6; cursor:not-allowed; margin-left:4px;" title="Detail kosong (Sudah Posted)" disabled>🧾</button>`;
}

let editBtn = isFinalClaimStatus(item.statusClaim) || !canEditClaims() ? '' : `<button class="btn-icon" onclick="openEditRoute(${item.id}, false)" title="Ubah data">✏️</button>`;
let chkClass = isArchived ? 'revise-arsip-checkbox' : 'revise-active-checkbox';

let slaContent = renderSLABadge(item);
let formattedNote = window.formatLongNote(item.reviseNote || '-');

    return `<tr>
        <td class="selection-only-column"><input type="checkbox" class="${chkClass}" data-id="${item.id}"></td>
        <td>${buildClaimActionCell(item, { withStatus: true, withArchive: true, isArchived: !!isArchived })}</td>
        <td><strong>${item.noPR || item.extNo || '-'}</strong></td>
        <td style="text-align:center;">${slaContent}</td><td>${item.tglSubmit}</td><td>${item.nik}</td><td><strong>${item.nama}</strong></td>
        <td><span class="badge status-revise">${item.entitas||'-'}</span></td><td>${item.tipe}</td>
        <td><strong style="color:#0050A0;">${formatClaimMoney(item)}</strong>${adjBadge}</td>
        <td>${formatPaymentDate(item)}</td>
        <td>${followUpDateTxt}</td>
        <td class="wrap-text">
            <div class="strict-wrap">${btnStatus} <strong style="color:#856404; font-size:11px;">(${item.reviseStep||'-'})</strong>
            <div style="font-size:10px; color:#777; margin-top:3px;">🕒 Pembaruan: ${lastUpdateTxt}</div>
            <div style="font-size:11px; color:#555; background:#f9f9f9; padding:6px; border:1px dashed #ccc; margin-top:4px; border-radius:4px; line-height:1.5;">Catatan: ${formattedNote}</div>
            ${followUpHtml}</div>
        </td>
    </tr>`;
}

                let revActPage = 1; let revActRows = 20;
let revArsPage = 1; let revArsRows = 20;

function renderReviseConfirm() {
    let baseData = typeof window.getReviseBaseData === 'function' ? window.getReviseBaseData() : dbRekap;
    let filteredData = getFilteredAndSortedData('revise', baseData);

    // ACTIVE: Hanya yang saat ini berstatus 'Revisi'
    let activeData = filteredData.filter(i => i.statusClaim === 'Revisi');
    // ARSIP: Yang sudah Posted atau Cleared (Dan punya sejarah revisi sesuai filter getReviseBaseData)
    let archivedData = filteredData.filter(i => isFinalClaimStatus(i.statusClaim) || i.reviseStep === 'Cleared');

    // PAGINASI ACTIVE
    let actMax = Math.ceil(activeData.length / revActRows) || 1;
    if(revActPage > actMax) revActPage = actMax;
    if(revActPage < 1) revActPage = 1;
    let actInfo = document.getElementById('rev-act-page-info');
    if(actInfo) actInfo.innerText = `Halaman ${revActPage} dari ${actMax} (${activeData.length} Data)`;

    let actStart = (revActPage - 1) * revActRows;
    let pagedActive = activeData.slice(actStart, actStart + revActRows);

    let activeListTbody = document.getElementById('tbody-revise-active-list');
    if(activeListTbody) {
        activeListTbody.innerHTML = '';
        if(pagedActive.length === 0) activeListTbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:15px; color:#777; font-style:italic;">Tidak ada histori data revisi/confirm yang aktif.</td></tr>';
        else { let htmlStr = ""; pagedActive.forEach(item => { htmlStr += buildReviseRowHTML(item, false); }); activeListTbody.innerHTML = htmlStr; }
    }

    // PAGINASI ARSIP
    let arsMax = Math.ceil(archivedData.length / revArsRows) || 1;
    if(revArsPage > arsMax) revArsPage = arsMax;
    if(revArsPage < 1) revArsPage = 1;
    let arsInfo = document.getElementById('rev-ars-page-info');
    if(arsInfo) arsInfo.innerText = `Halaman ${revArsPage} dari ${arsMax} (${archivedData.length} Data)`;

    let arsStart = (revArsPage - 1) * revArsRows;
    let pagedArsip = archivedData.slice(arsStart, arsStart + revArsRows);

    let arsipListTbody = document.getElementById('tbody-revise-arsip-list');
    if(arsipListTbody) {
        arsipListTbody.innerHTML = '';
        if(pagedArsip.length === 0) arsipListTbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:15px; color:#777; font-style:italic;">Belum ada data yang diarsipkan.</td></tr>';
        else { let htmlStr = ""; pagedArsip.forEach(item => { htmlStr += buildReviseRowHTML(item, true); }); arsipListTbody.innerHTML = htmlStr; }
    }

    // FOLDER VIEWS
    let activeFolderContainer = document.getElementById('revise-active-folder-view');
    if(activeFolderContainer) {
        activeFolderContainer.innerHTML = '';
        if (activeData.length > 0) {
            let groupsActive = {};
            activeData.forEach(d => { 
                let p = d.tglProses ? d.tglProses.split('/') : [];
                let ym = p.length === 3 ? `${p[2]} - ${p[1]}` : 'Unknown';
                if(!groupsActive[ym]) groupsActive[ym] = []; 
                groupsActive[ym].push(d); 
            });
            let activeHtmlStr = "";
            Object.keys(groupsActive).sort((a,b) => b.localeCompare(a)).forEach(ym => {
                activeHtmlStr += buildFolderGroup({
                    icon: '\u{1F4C5}', title: ym, subtitle: translateUiText('Bulan/Tahun Proses'),
                    count: groupsActive[ym].length, countLabel: 'data', open: true,
                    body: buildReviseFolderHTML(`Data Group: ${ym}`, groupsActive[ym], false)
                });
            });
            activeFolderContainer.innerHTML = activeHtmlStr;
        } else activeFolderContainer.innerHTML = '<p style="font-size:12px; color:#777; font-style:italic;">Tidak ada histori data revisi/confirm yang aktif.</p>';
    }

    let arsipFolderContainer = document.getElementById('revise-arsip-folder-view');
    if(arsipFolderContainer) {
        arsipFolderContainer.innerHTML = '';
        if(archivedData.length > 0) {
            let groupsArchived = {};
            archivedData.forEach(d => { 
                let p = d.tglProses ? d.tglProses.split('/') : []; let yr = p.length === 3 ? p[2] : 'Unknown'; let mo = p.length === 3 ? p[1] : 'Unknown';
                if(!groupsArchived[yr]) groupsArchived[yr] = {}; if(!groupsArchived[yr][mo]) groupsArchived[yr][mo] = [];
                groupsArchived[yr][mo].push(d); 
            });
            let arsipHtmlStr = "";
            Object.keys(groupsArchived).sort((a,b)=>b.localeCompare(a)).forEach(yr => {
                const months = groupsArchived[yr];
                const monthKeys = Object.keys(months).sort((a,b)=>b.localeCompare(a));
                const inner = monthKeys.map(mo => buildReviseFolderHTML(`Bulan: ${mo}`, months[mo], true)).join('');
                const total = monthKeys.reduce((sum, mo) => sum + months[mo].length, 0);
                arsipHtmlStr += buildFolderGroup({
                    icon: '\u{1F4E6}', title: yr, subtitle: translateUiText('Tahun Proses'),
                    count: total, countLabel: 'data', body: inner
                });
            });
            arsipFolderContainer.innerHTML = arsipHtmlStr;
        } else arsipFolderContainer.innerHTML = '<p style="font-size:12px; color:#777; font-style:italic;">Belum ada data yang diarsipkan.</p>';
    }

    let now = Date.now();
    let alertCount = activeData.filter(i => (i.statusClaim === 'Revisi' || i.statusClaim === 'Confirm') && i.reviseTimestamp && Math.floor((now - i.reviseTimestamp)/(1000*60*60*24)) >= 3).length;
    if(alertCount > 0 && window.currentOpenMenu === 'claim-revise' && !window.hasAlertedRevise) {
        showToast(`🚨 Peringatan: Terdapat ${alertCount} data yang memerlukan tindak lanjut lebih dari tiga hari.`, 'error'); window.hasAlertedRevise = true;
    }
}

        // --- MODAL UBAH STATUS & TIMELINE ---
function getAllowedStatusTransitions(data) {
    if(!data || sessionRole === 'viewer') return [];
    const current = data.statusClaim;
    if(typeof isCanceledClaim === 'function' && isCanceledClaim(data)) return canEditClaims() ? ['In Process'] : [];
    if(canManageFinanceWorkflow() && current === 'Posted') return ['Paid', 'Hold', 'Returned by Finance'];
    if(canManageFinanceWorkflow() && current === 'Hold') return ['Paid', 'Posted', 'Returned by Finance'];
    if(canManageFinanceWorkflow() && current === 'Paid') {
        if(isFinanceRole() && String(data.paymentBy || '').toLowerCase() !== getCurrentActorIdentity()) return [];
        return ['Posted'];
    }
    if(isFinanceRole()) return [];
    if(canEditClaims() && !isFinalClaimStatus(current)) return ['In Process', 'Revisi', 'Waiting Approval', 'Posted', 'Canceled'];
    return [];
}

// Modal Status berubah menjadi hanya-baca begitu tidak ada transisi yang
// diizinkan. Tanpa keterangan, Finance yang membuka claim Paid milik rekannya
// hanya melihat modal kosong dan mengira aplikasinya bermasalah.
function getStatusTransitionBlockReason(data) {
    if(!data || sessionRole === 'viewer') return 'Peran Anda hanya dapat melihat status dan linimasa klaim ini.';
    if(String(data.statusClaim || '') === 'Paid' && isFinanceRole()
        && String(data.paymentBy || '').toLowerCase() !== getCurrentActorIdentity()) {
        return 'Pembatalan Paid hanya dapat dilakukan oleh Finance yang mencatat pembayaran ini atau oleh Admin.';
    }
    if(isFinanceRole()) return 'Finance hanya dapat mengubah status pada klaim yang sudah berstatus Posted, Hold, atau Paid.';
    if(typeof isFinalClaimStatus === 'function' && isFinalClaimStatus(data.statusClaim)) {
        return 'Klaim yang sudah final hanya dapat diubah melalui alur Finance.';
    }
    return 'Tidak ada perubahan status yang tersedia untuk peran Anda pada klaim ini.';
}

function isFinanceWorkflowTransition(oldStatus, newStatus) {
    return (oldStatus === 'Posted' && ['Paid', 'Hold', 'Returned by Finance'].includes(newStatus))
        || (oldStatus === 'Hold' && ['Paid', 'Posted', 'Returned by Finance'].includes(newStatus))
        || (oldStatus === 'Paid' && newStatus === 'Posted');
}

const STATUS_TRANSITION_PRESENTATION = Object.freeze({
    'In Process': { icon:'▶', tone:'process', label:'In Process', description:'Lanjutkan proses Accounting' },
    Revisi: { icon:'↺', tone:'revision', label:'Revisi', description:'Kembalikan untuk perbaikan' },
    'Waiting Approval': { icon:'⌛', tone:'waiting', label:'Menunggu Persetujuan', description:'Kirim ke antrean persetujuan' },
    Posted: { icon:'✓', tone:'posted', label:'Posted', description:'Selesaikan proses RTP' },
    Canceled: { icon:'×', tone:'canceled', label:'Canceled', description:'Nonaktifkan claim dan keluarkan dari statistik' },
    Paid: { icon:'◆', tone:'paid', label:'Paid', description:'Catat penyelesaian pembayaran' },
    Hold: { icon:'Ⅱ', tone:'hold', label:'Hold', description:'Tahan proses dengan alasan' },
    'Returned by Finance': { icon:'↩', tone:'returned', label:'Dikembalikan ke Accounting', description:'Kembalikan untuk tindak lanjut' }
});

function renderStatusTransitionChoices(allowed, selectedStatus) {
    const container = document.getElementById('modal-status-choices');
    const select = document.getElementById('modal-select-status');
    if(!container || !select) return;
    container.replaceChildren();
    allowed.forEach(status => {
        const presentation = STATUS_TRANSITION_PRESENTATION[status] || { icon:'•', tone:'default', label:status, description:'Ubah status klaim' };
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `status-transition-choice status-tone-${presentation.tone}`;
        button.dataset.statusValue = status;
        button.setAttribute('role', 'radio');
        const selected = status === selectedStatus;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
        button.innerHTML = `<span class="status-transition-icon" aria-hidden="true">${presentation.icon}</span><span class="status-transition-copy"><strong>${presentation.label}</strong><small>${presentation.description}</small></span><span class="status-transition-check" aria-hidden="true">✓</span>`;
        button.addEventListener('click', () => window.selectStatusTransition(status));
        container.appendChild(button);
    });
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(container);
}

function selectStatusTransition(status) {
    const id = parseInt(document.getElementById('modal-claim-id').value);
    const item = dbRekap.find(row => Number(row.id) === id);
    const allowed = getAllowedStatusTransitions(item);
    if(!allowed.includes(status)) return showToast('Perubahan status ini tidak diizinkan untuk peran Anda.', 'error');
    const select = document.getElementById('modal-select-status');
    select.value = status;
    document.querySelectorAll('#modal-status-choices .status-transition-choice').forEach(button => {
        const selected = button.dataset.statusValue === status;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
    toggleReviseSub();
}

function openStatusModal(id) {
    const data = dbRekap.find(item => item.id === id); if(!data) return;
    const allowed = getAllowedStatusTransitions(data);
    document.getElementById('modal-claim-id').value = id;
    const statusSelect = document.getElementById('modal-select-status');
    [...statusSelect.options].forEach(option => { option.hidden = !allowed.includes(option.value); });
    statusSelect.value = allowed.includes(data.statusClaim) ? data.statusClaim : (allowed[0] || data.statusClaim);
    const currentStatus = document.getElementById('modal-current-status');
    if(currentStatus) {
        currentStatus.textContent = data.statusClaim || '-';
        currentStatus.className = `badge ${getClaimStatusClass(data.statusClaim)}`;
    }
    renderStatusTransitionChoices(allowed, statusSelect.value);

    const readOnly = allowed.length === 0;
    document.getElementById('modal-status-edit-area').style.display = readOnly ? 'none' : 'block';
    const readOnlyNote = document.getElementById('modal-status-readonly-note');
    if(readOnlyNote) {
        readOnlyNote.textContent = readOnly ? getStatusTransitionBlockReason(data) : '';
        readOnlyNote.style.display = readOnly ? 'block' : 'none';
    }
    const saveStatusButton = document.getElementById('btn-save-status');
    saveStatusButton.style.display = readOnly ? 'none' : 'inline-flex';
    saveStatusButton.disabled = false;
    document.getElementById('modal-payment-reference').value = '';
    document.getElementById('modal-finance-reason').value = '';
    const cancelReasonInput = document.getElementById('modal-cancel-reason');
    if(cancelReasonInput) cancelReasonInput.value = '';
    const reactivateReasonInput = document.getElementById('modal-reactivate-reason');
    if(reactivateReasonInput) reactivateReasonInput.value = '';
    if((data.statusClaim === 'Revisi' || data.statusClaim === 'Waiting Approval') && data.reviseStep) {
        document.getElementById('modal-select-revise').value = data.reviseStep;
        document.getElementById('modal-revise-notes').value = data.reviseNote || '';
    } else document.getElementById('modal-revise-notes').value = '';
    toggleReviseSub();

    renderMergedTimelineContent(data, document.getElementById('timeline-list'));
    const realStatusCount = (data.historyLog || []).filter(isWorkflowStatusLog).length;
    const btnUndo = document.getElementById('btn-undo-status');
    if(btnUndo) btnUndo.style.display = (isAppAdmin() && realStatusCount > 1 && !isClaimFinanciallyLocked(data) && data.statusClaim !== 'Returned by Finance') ? 'inline-block' : 'none';
    document.getElementById('modal-status').style.display = 'flex';
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(document.getElementById('modal-status'));

    const timeInput = document.getElementById('modal-custom-time');
    if(timeInput) {
        timeInput.value = '';
        if(timeInput._flatpickr) timeInput._flatpickr.clear();
    }
    setTimeout(() => {
        if(typeof window.ensureWorksheetCalendar === 'function') window.ensureWorksheetCalendar('#modal-custom-time', {
            enableTime: true, dateFormat: 'Y-m-d H:i', time_24hr: true, disableMobile: true,
            onChange(selectedDates, dateStr, instance) { if(selectedDates.length) setTimeout(() => instance.close(), 200); }
        });
    }, 100);
}

window.selectStatusTransition = selectStatusTransition;

function toggleReviseSub() {
    const select = document.getElementById('modal-select-status');
    const stat = select ? select.value : '';
    const id = parseInt(document.getElementById('modal-claim-id').value);
    const item = dbRekap.find(row => row.id === id);
    const oldStatus = item ? item.statusClaim : '';
    const financeAction = isFinanceWorkflowTransition(oldStatus, stat);
    document.getElementById('modal-revise-options').style.display = stat === 'Revisi' ? 'block' : 'none';
    const cancelOptions = document.getElementById('modal-cancel-options');
    if(cancelOptions) cancelOptions.style.display = stat === 'Canceled' ? 'block' : 'none';
    const reactivateOptions = document.getElementById('modal-reactivate-options');
    if(reactivateOptions) reactivateOptions.style.display = oldStatus === 'Canceled' && stat === 'In Process' ? 'block' : 'none';
    document.getElementById('modal-finance-options').style.display = financeAction ? 'block' : 'none';
    document.getElementById('modal-payment-reference-group').style.display = financeAction && stat === 'Paid' ? 'block' : 'none';
    const reasonRequired = financeAction && (stat === 'Hold' || stat === 'Returned by Finance' || (oldStatus === 'Paid' && stat === 'Posted') || (oldStatus === 'Hold' && stat === 'Posted'));
    document.getElementById('modal-finance-reason-group').style.display = reasonRequired ? 'block' : 'none';
    const label = document.getElementById('modal-finance-reason-label');
    if(label) label.innerHTML = `${stat === 'Hold' ? 'Alasan Hold' : stat === 'Returned by Finance' ? 'Alasan Pengembalian ke Accounting' : oldStatus === 'Paid' ? 'Alasan Pembatalan Paid' : 'Catatan Pelepasan Hold'} <span style="color:#dc3545;">*</span>`;
    const hints = {
        Paid: 'Paid mencatat penyelesaian pembayaran pada lembar kerja. Referensi wajib diisi; sistem ini tidak mengirimkan dana.',
        Hold: 'Hold mengunci nilai klaim. Finance wajib mencantumkan alasan agar tindak lanjut tercatat dengan jelas.',
        'Returned by Finance': 'Pengembalian membuka kembali klaim agar Accounting dapat memperbaiki data. Finance tetap tidak dapat mengubah nominal.',
        Posted: oldStatus === 'Paid' ? 'Pembatalan Paid menghapus pembayaran aktif, tetapi referensi dan alasannya tetap tersimpan dalam linimasa.' : 'Pelepasan Hold mengembalikan klaim ke antrean Posted.'
    };
    document.getElementById('modal-finance-action-hint').innerText = financeAction ? (hints[stat] || '') : '';
}

window.saveStatus = async function() {
    if(window.statusSaveInProgress) return showToast('Status sedang disimpan. Mohon tunggu.', 'info');
    const id = parseInt(document.getElementById('modal-claim-id').value);
    const index = dbRekap.findIndex(item => item.id === id);
    if(index < 0) return;
    let stat = document.getElementById('modal-select-status').value;
    const oldStatus = dbRekap[index].statusClaim;
    const allowed = getAllowedStatusTransitions(dbRekap[index]);
    if(!allowed.includes(stat)) return showToast('Perubahan status ini tidak diizinkan untuk peran Anda.', 'error');
    const financeAction = isFinanceWorkflowTransition(oldStatus, stat);
    if(financeAction && !canManageFinanceWorkflow()) return showToast('Tindakan Finance hanya dapat dilakukan oleh Finance atau Admin.', 'error');
    if(!financeAction && !requireClaimEditor()) return;

    const revStep = document.getElementById('modal-select-revise').value;
    const revNote = document.getElementById('modal-revise-notes').value.trim();
    const paymentReference = document.getElementById('modal-payment-reference').value.trim();
    const financeReason = document.getElementById('modal-finance-reason').value.trim();
    const cancelReason = String(document.getElementById('modal-cancel-reason')?.value || '').trim();
    const reactivateReason = String(document.getElementById('modal-reactivate-reason')?.value || '').trim();
    if(stat === 'Revisi' && !revNote) return showToast('Alasan revisi wajib diisi.', 'error');
    if(stat === 'Canceled' && !cancelReason) return showToast('Alasan cancel wajib diisi.', 'error');
    if(oldStatus === 'Canceled' && stat === 'In Process' && !reactivateReason) return showToast('Alasan reverse cancel wajib diisi.', 'error');
    if(financeAction && stat === 'Paid' && !paymentReference) return showToast('Referensi pembayaran wajib diisi sebelum status diubah menjadi Paid.', 'error');
    const needsFinanceReason = financeAction && (stat === 'Hold' || stat === 'Returned by Finance' || (oldStatus === 'Paid' && stat === 'Posted') || (oldStatus === 'Hold' && stat === 'Posted'));
    if(needsFinanceReason && !financeReason) return showToast('Alasan atau catatan Finance wajib diisi untuk tindakan ini.', 'error');

    let revisionCleared = stat === 'Revisi' && revStep === 'Cleared';
    if(revisionCleared) stat = 'In Process';
    if(!financeAction && stat === 'Posted') {
        const completionErrors = validateClaimForCompletion(dbRekap[index]);
        if(completionErrors.length) return showCompletionErrors(dbRekap[index], completionErrors);
    }

    const timeInput = document.getElementById('modal-custom-time');
    const actionDate = timeInput && timeInput.value ? new Date(timeInput.value.replace(' ', 'T')) : new Date();
    if(Number.isNaN(actionDate.getTime())) return showToast('Tanggal/jam perubahan status tidak valid.', 'error');
    const timeStrHistory = actionDate.toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
    const timeStrWorkflow = actionDate.toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
    const timeMs = actionDate.getTime();
    const actor = getCurrentActorIdentity();
    const backup = clonePlain(dbRekap[index]);
    const saveButton = document.getElementById('btn-save-status');
    const originalButtonText = saveButton.innerText;
    window.statusSaveInProgress = true;
    saveButton.disabled = true;
    saveButton.innerText = 'Menyimpan...';

    try {
        const item = dbRekap[index];
        if(!item.workflowTimestamps) item.workflowTimestamps = {};
        if(!item.historyLog) item.historyLog = [];
        let logStatus = revisionCleared ? 'Revisi - Cleared' : stat;
        let logNote = '';
        let actionType = financeAction ? 'finance-workflow' : 'accounting-workflow';

        if(financeAction) {
            item.reviseStep = null; item.reviseTime = null; item.reviseTimestamp = null; item.reviseNote = null;
            if(stat === 'Paid') {
                if(oldStatus === 'Hold') {
                    delete item.holdReason; delete item.holdAt; delete item.holdAtMs; delete item.holdBy;
                    delete item.workflowTimestamps.holdAt;
                }
                item.statusClaim = 'Paid'; item.isArchived = true;
                item.paymentAt = timeStrWorkflow; item.paymentAtMs = timeMs;
                item.paymentDate = actionDate.toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'});
                item.paymentBy = actor; item.paymentReference = paymentReference;
                item.workflowTimestamps.paidAt = timeMs;
                logNote = `Ref Pymnt: ${paymentReference}${oldStatus === 'Hold' ? ' | Diproses dari status Hold.' : ''}`;
            } else if(stat === 'Hold') {
                item.statusClaim = 'Hold'; item.isArchived = true;
                item.holdReason = financeReason; item.holdAt = timeStrWorkflow; item.holdAtMs = timeMs; item.holdBy = actor;
                item.workflowTimestamps.holdAt = timeMs;
                logNote = financeReason;
            } else if(stat === 'Returned by Finance') {
                item.statusClaim = 'Returned by Finance'; item.isArchived = false;
                item.returnReason = financeReason; item.returnedAt = timeStrWorkflow; item.returnedAtMs = timeMs; item.returnedBy = actor;
                item.workflowTimestamps.returnedAt = timeMs;
                if(oldStatus === 'Hold') {
                    delete item.holdReason; delete item.holdAt; delete item.holdAtMs; delete item.holdBy;
                    delete item.workflowTimestamps.holdAt;
                }
                logNote = financeReason;
            } else if(oldStatus === 'Paid' && stat === 'Posted') {
                item.lastPaymentCancellation = {
                    reason: financeReason, cancelledAt: timeStrWorkflow, cancelledAtMs: timeMs, cancelledBy: actor,
                    paymentReference: item.paymentReference || '-', paymentDate: formatPaymentDate(item), paymentBy: item.paymentBy || '-'
                };
                const oldReference = item.paymentReference || '-';
                delete item.paymentAt; delete item.paymentAtMs; delete item.paymentDate; delete item.paymentBy; delete item.paymentReference;
                delete item.workflowTimestamps.paidAt;
                item.statusClaim = 'Posted'; item.isArchived = true;
                logStatus = 'Cancelled Paid → Posted';
                logNote = `${financeReason} | Referensi pembayaran sebelumnya: ${oldReference}`;
            } else if(oldStatus === 'Hold' && stat === 'Posted') {
                item.lastHoldRelease = { reason: financeReason, releasedAt: timeStrWorkflow, releasedAtMs: timeMs, releasedBy: actor, previousHoldReason: item.holdReason || '-' };
                delete item.holdReason; delete item.holdAt; delete item.holdAtMs; delete item.holdBy;
                delete item.workflowTimestamps.holdAt;
                item.statusClaim = 'Posted'; item.isArchived = true;
                logStatus = 'Released Hold → Posted';
                logNote = financeReason;
            }
        } else {
            if(oldStatus === 'Canceled' && stat === 'In Process') {
                item.statusClaim = 'In Process';
                item.isInactive = false;
                item.isArchived = false;
                item.reactivateReason = reactivateReason;
                item.reactivatedAt = timeStrWorkflow;
                item.reactivatedAtMs = timeMs;
                item.reactivatedBy = actor;
                item.workflowTimestamps.reactivatedAt = timeMs;
                logStatus = 'Canceled → In Process';
                logNote = reactivateReason;
                actionType = 'accounting-cancel-reverse';
            } else if(stat === 'Canceled') {
                item.statusClaim = 'Canceled';
                item.isInactive = true;
                item.isArchived = true;
                item.cancelReason = cancelReason;
                item.canceledAt = timeStrWorkflow;
                item.canceledAtMs = timeMs;
                item.canceledBy = actor;
                item.workflowTimestamps.canceledAt = timeMs;
                item.reviseStep = null; item.reviseTime = null; item.reviseTimestamp = null; item.reviseNote = null;
                logStatus = 'Canceled';
                logNote = cancelReason;
                actionType = 'accounting-cancel';
            } else {
                if(stat === 'In Process' && !item.workflowTimestamps.processStartedAt) item.workflowTimestamps.processStartedAt = timeMs;
                if(stat === 'Revisi') item.workflowTimestamps.revisionAt = timeMs;
                if(stat === 'Waiting Approval') item.workflowTimestamps.waitingApprovalAt = timeMs;
                if(stat === 'Posted') item.workflowTimestamps.completedAt = timeMs;
                if(revisionCleared) item.workflowTimestamps.revisionClearedAt = timeMs;
                if(stat === 'Waiting Approval' && oldStatus !== 'Waiting Approval') item.waitingApprovalAt = timeMs;
                item.statusClaim = stat;
                if(stat === 'Revisi') {
                    item.reviseStep = revStep; item.reviseNote = revNote; item.reviseTime = timeStrHistory; item.reviseTimestamp = timeMs;
                    logStatus = `${stat} - ${revStep}`; logNote = revNote;
                } else {
                    item.reviseStep = null; item.reviseTime = null; item.reviseTimestamp = null; item.reviseNote = null;
                    if(revisionCleared && revNote) logNote = revNote;
                }
                item.isArchived = stat === 'Posted';
                if(stat === 'Posted') { item.postedAt = timeStrWorkflow; item.postedBy = actor; }
            }
        }

        const logEntry = {status: logStatus, time: timeStrHistory, by: actor, actionType};
        if(logNote) logEntry.note = logNote;
        if(paymentReference && stat === 'Paid') logEntry.paymentReference = paymentReference;
        item.historyLog.push(logEntry);

        await saveDataToLocal({ claimIds: [id] });
        logActivity(sessionUser, `Pembaruan Status Klaim ID ${id}: ${oldStatus} → ${item.statusClaim}${paymentReference ? ` | Referensi: ${paymentReference}` : ''}`).catch(() => {});
        if(window.currentOpenMenu === 'claim-quick' && Number(currentEditingId) === Number(id)) {
            viewMode = !canEditClaims() || isClaimFinanciallyLocked(item);
            setQuickFormState(viewMode);
        }
        closeModal('modal-status'); refreshActiveViewSilently();
        if(item.statusClaim === 'Posted' && !financeAction) showRTPAnimation();
        else showToast(`Status berhasil diperbarui menjadi ${item.statusClaim}.`, 'success');
    } catch(error) {
        if(await window.restoreClaimsAfterConflict(error)) return;
        dbRekap[index] = backup;
        await dbSyncClaimRows([id]).catch(() => {});
        showToast('Perubahan status gagal disimpan lokal; data dikembalikan.', 'error');
    } finally {
        window.statusSaveInProgress = false;
        saveButton.disabled = false;
        saveButton.innerText = originalButtonText;
    }
};

        // --- CORE ENGINE SUPER FIND ---
function compressDocNumbers(val) {
            if (!val) return "";
            // Tangkap semua deretan angka (baik pakai koma, spasi, enter)
            let numbers = val.match(/\d+/g);
            if (!numbers) return "";
            
            // Hapus duplikat dan urutkan tanpa merusak angka 0 di depan (String mode)
            let unique = [...new Set(numbers)].sort((a, b) => {
                if (a.length !== b.length) return a.length - b.length;
                return a.localeCompare(b);
            });
            
            if (unique.length === 0) return "";
            
            let result = [];
            let firstStr = unique[0];
            result.push(firstStr);
            
            for (let i = 1; i < unique.length; i++) {
                let currentStr = unique[i];
                // Jika panjang sama dan lebih dari 3 digit, ringkas sisakan 3 digit terakhir
                if (currentStr.length === firstStr.length && firstStr.length > 3) {
                    let prefixLen = firstStr.length - 3;
                    if (firstStr.substring(0, prefixLen) === currentStr.substring(0, prefixLen)) {
                        result.push(currentStr.substring(prefixLen));
                    } else {
                        result.push(currentStr);
                        firstStr = currentStr;
                    }
                } else {
                    result.push(currentStr);
                    firstStr = currentStr;
                }
            }
            // Jadikan outputnya dihias Koma + Spasi
            return result.join(", ");
        }        

// --- FIREBASE REAL-TIME ENGINE P6 FINAL: cache-first + delta, satu claim = satu dokumen ---
const CLAIMS_COLLECTION = 'claims';
const CLAIM_DELETIONS_COLLECTION = 'claimDeletions';
const CLAIM_CACHE_SCHEMA = 'P6-FINAL-DELTA-1';
const CLAIM_CACHE_SCHEMA_KEY = 'otsukaClaimCacheSchema_v16';
const CLAIM_CACHE_COUNT_KEY = 'otsukaClaimCacheCount_v16';
const CLAIM_SYNC_WATERMARK_KEY = 'otsukaClaimSyncWatermark_v16';
const CLAIM_DELETE_WATERMARK_KEY = 'otsukaClaimDeleteWatermark_v16';
const CLAIM_DIRTY_IDS_KEY = 'otsukaClaimDirtyIds_v16';
const CLAIM_PENDING_DELETIONS_KEY = 'otsukaClaimPendingDeletions_v16';
const CLAIM_DELTA_OVERLAP_MS = 5 * 60 * 1000;
let claimBaseline = new Map();
let pendingClaimIds = new Set();
let dirtyClaimIds = new Set();
let pendingClaimDeletions = new Map();
let locallyCachedClaimIds = new Set();
let locallyCachedMasterKeys = new Set();
let claimPersistenceQueue = Promise.resolve();
let localPersistenceHealthy = true;
let cloudPersistenceQueue = Promise.resolve();
let cloudRetryAttempt = 0;
let cloudSyncAutoRetryBlocked = false;
let pendingClaimRetryDelayMs = 0;
let claimsSnapshotInitialized = false;
let masterDataBaselines = { gl: '', karyawan: '' };
let postSaveMaintenanceTimer = null;
let realtimeRefreshTimer = null;
let pendingClaimRetryTimer = null;
let automaticBackupTimer = null;
let lastAutomaticBackupAtMs = 0;
let cloudListenerGeneration = 0;
let claimSnapshotQueue = Promise.resolve();
let globalDataProgressCounter = 0;
let activeGlobalDataProgressId = 0;
let globalDataProgressHideTimer = null;
window.unsubClaims = null; window.unsubClaimDeletions = null; window.unsubGL = null; window.unsubKar = null; window.unsubLogs = null; window.unsubLogState = null; window.unsubCalendar = null;

function clonePlain(value) { return JSON.parse(JSON.stringify(value)); }
function parseStoredJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value === null ? fallback : value;
    } catch(error) {
        return fallback;
    }
}
function readClaimSyncState() {
    dirtyClaimIds = new Set((parseStoredJson(CLAIM_DIRTY_IDS_KEY, []) || []).map(String));
    pendingClaimDeletions = new Map((parseStoredJson(CLAIM_PENDING_DELETIONS_KEY, []) || [])
        .filter(entry => entry && entry.id !== undefined)
        .map(entry => [String(entry.id), { id: String(entry.id), baseline: entry.baseline ? clonePlain(entry.baseline) : null }]));
}
function persistClaimSyncState() {
    try {
        localStorage.setItem(CLAIM_DIRTY_IDS_KEY, JSON.stringify(Array.from(dirtyClaimIds)));
        localStorage.setItem(CLAIM_PENDING_DELETIONS_KEY, JSON.stringify(Array.from(pendingClaimDeletions.values())));
    } catch(error) {
        console.warn('[Claim Sync] Status antrean lokal tidak dapat disimpan:', error);
    }
}
function getStoredSyncNumber(key) {
    const raw = localStorage.getItem(key);
    if(raw === null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
}
function isClaimDeltaCacheReady() {
    const storedCount = getStoredSyncNumber(CLAIM_CACHE_COUNT_KEY);
    return localStorage.getItem(CLAIM_CACHE_SCHEMA_KEY) === CLAIM_CACHE_SCHEMA
        && storedCount === dbRekap.length
        && getStoredSyncNumber(CLAIM_SYNC_WATERMARK_KEY) !== null
        && getStoredSyncNumber(CLAIM_DELETE_WATERMARK_KEY) !== null;
}
function updateClaimCacheCount() {
    if(localStorage.getItem(CLAIM_CACHE_SCHEMA_KEY) !== CLAIM_CACHE_SCHEMA) return;
    try { localStorage.setItem(CLAIM_CACHE_COUNT_KEY, String(dbRekap.length)); } catch(error) {}
}
function commitClaimCacheMetadata(claimWatermark, deletionWatermark = null) {
    try {
        localStorage.setItem(CLAIM_CACHE_SCHEMA_KEY, CLAIM_CACHE_SCHEMA);
        localStorage.setItem(CLAIM_CACHE_COUNT_KEY, String(dbRekap.length));
        if(Number.isFinite(Number(claimWatermark))) localStorage.setItem(CLAIM_SYNC_WATERMARK_KEY, String(Number(claimWatermark)));
        if(Number.isFinite(Number(deletionWatermark))) localStorage.setItem(CLAIM_DELETE_WATERMARK_KEY, String(Number(deletionWatermark)));
    } catch(error) {
        console.warn('[Claim Sync] Metadata cache tidak dapat disimpan:', error);
    }
}
function initializeClaimCacheState() {
    readClaimSyncState();
    claimBaseline = new Map((dbRekap || []).map(item => {
        const claim = normalizeClaimRecord(item);
        return [String(claim.id), clonePlain(claim)];
    }));
}
function stableStringify(value) {
    if(Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if(value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
function initializePersistenceBaselines() {
    masterDataBaselines.gl = stableStringify(masterGL || []);
    masterDataBaselines.karyawan = stableStringify(masterKaryawan || []);
}
function schedulePostSaveMaintenance() {
    if(postSaveMaintenanceTimer) clearTimeout(postSaveMaintenanceTimer);
    postSaveMaintenanceTimer = setTimeout(() => {
        postSaveMaintenanceTimer = null;
        const run = () => {
            calcStats();
            renderDashboardUrgent();
            updateStorageSizeDisplay();
        };
        if(typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1200 });
        else setTimeout(run, 0);
    }, 350);
}
function scheduleAutomaticBackup() {
    if(automaticBackupTimer) clearTimeout(automaticBackupTimer);
    const minimumIntervalMs = 5 * 60 * 1000;
    const delay = Math.max(1200, minimumIntervalMs - (Date.now() - lastAutomaticBackupAtMs));
    automaticBackupTimer = setTimeout(() => {
        automaticBackupTimer = null;
        const run = async () => {
            const result = await autoBackupRotation('automatic-throttled');
            if(result) lastAutomaticBackupAtMs = Date.now();
        };
        if(typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
        else setTimeout(run, 0);
    }, delay);
}
function scheduleRealtimeViewRefresh() {
    if(realtimeRefreshTimer) return;
    realtimeRefreshTimer = setTimeout(() => {
        realtimeRefreshTimer = null;
        refreshActiveViewSilently();
    }, 32);
}
function normalizeClaimRecord(item) {
    let claim = clonePlain(item || {});
    claim.nama = String(claim.nama || '').trim();
    claim.nik = String(claim.nik || '').trim();
    claim.statusClaim = String(claim.statusClaim || 'In Process');
    claim.tglProses = String(claim.tglProses || '');
    claim.tglSubmit = String(claim.tglSubmit || '');
    claim.totalHeader = Number(claim.totalHeader) || 0;
    claim.mataUang = normalizeCurrency(claim.mataUang || 'IDR');
    claim._version = Number(claim._version) || 0;
    if(!claim.workflowTimestamps || typeof claim.workflowTimestamps !== 'object' || Array.isArray(claim.workflowTimestamps)) claim.workflowTimestamps = {};
    // Dokumen lama dapat menyimpan historyLog sebagai objek berindeks, bukan
    // array. Seluruh pembaca menganggapnya array, dan rules pun menuntut list,
    // jadi bentuknya diseragamkan di satu tempat ini.
    if(claim.historyLog !== undefined) {
        const entries = Array.isArray(claim.historyLog)
            ? claim.historyLog
            : (claim.historyLog && typeof claim.historyLog === 'object'
                ? Object.keys(claim.historyLog)
                    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
                    .map(key => claim.historyLog[key])
                : []);
        // Setiap pembaca menganggap time dan status berupa string; entri lama
        // dapat kehilangan salah satunya sehingga seluruh tabel gagal dirender.
        claim.historyLog = entries
            .filter(entry => entry && typeof entry === 'object')
            .map(entry => ({ ...entry, time: String(entry.time || ''), status: String(entry.status || '') }));
    }
    if(Array.isArray(claim.detailNota && claim.detailNota.rows)) {
        claim.detailNota.rows = claim.detailNota.rows.map((row, index) => ({
            ...row,
            rowId: row.rowId || `detail-row-${claim.id}-${index}`,
            amtNota: typeof row.amtNota === 'number' ? row.amtNota : parseCurrencyAmount(row.amtNota, claim.mataUang),
            amtClaim: row.amtClaim === '' || row.amtClaim === null || row.amtClaim === undefined ? null : (typeof row.amtClaim === 'number' ? row.amtClaim : parseCurrencyAmount(row.amtClaim, claim.mataUang))
        }));
    }
    delete claim._syncConflict;
    delete claim._updatedAt;
    return claim;
}

function claimComparable(item) {
    let claim = normalizeClaimRecord(item);
    delete claim._version; delete claim._updatedAtMs; delete claim._updatedBy;
    return stableStringify(claim);
}

// ==========================================
// BACKUP AMAN DAN SINGLE SOURCE OF TRUTH
// ==========================================
const FINAL_RELEASE = 'P6-FINAL';
const BACKUP_SCHEMA_VERSION = 2;

function summarizeCurrencyTotals(claims) {
    const totals = {};
    (claims || []).forEach(rawClaim => {
        const claim = normalizeClaimRecord(rawClaim);
        const currency = normalizeCurrency(claim.mataUang || 'IDR');
        totals[currency] = (totals[currency] || 0) + (Number(claim.totalHeader) || 0);
    });
    return Object.fromEntries(Object.keys(totals).sort().map(currency => [currency, totals[currency]]));
}

async function sha256Hex(value) {
    if(!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') return null;
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function buildBackupPayload(reason = 'manual') {
    const claims = clonePlain(dbRekap).map(normalizeClaimRecord).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const payload = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        systemRelease: FINAL_RELEASE,
        sourceOfTruth: CLAIMS_COLLECTION,
        recoveryPolicy: 'merge-upsert-no-delete',
        exportDate: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        reason,
        claims,
        masterData: {
            gl: clonePlain(masterGL),
            karyawan: clonePlain(masterKaryawan)
        },
        manifest: {
            claimCount: claims.length,
            claimIds: claims.map(claim => String(claim.id)),
            totalsByCurrency: summarizeCurrencyTotals(claims),
            generatedBy: sessionUser || 'system-local',
            rolesIncluded: false
        }
    };
    const payloadSha256 = await sha256Hex(stableStringify(payload));
    payload.integrity = { algorithm: 'SHA-256', payloadSha256: payloadSha256 || 'unavailable' };
    return payload;
}

function normalizeBackupPayload(rawPayload) {
    const errors = [];
    const previousFormat = Number(rawPayload && rawPayload.schemaVersion) !== BACKUP_SCHEMA_VERSION;
    const rawClaims = Array.isArray(rawPayload && rawPayload.claims)
        ? rawPayload.claims
        : (Array.isArray(rawPayload && rawPayload.db) ? rawPayload.db : null);
    const rawGl = Array.isArray(rawPayload && rawPayload.masterData && rawPayload.masterData.gl)
        ? rawPayload.masterData.gl
        : (Array.isArray(rawPayload && rawPayload.gl) ? rawPayload.gl : null);
    const rawKar = Array.isArray(rawPayload && rawPayload.masterData && rawPayload.masterData.karyawan)
        ? rawPayload.masterData.karyawan
        : (Array.isArray(rawPayload && rawPayload.kar) ? rawPayload.kar : null);
    if(!rawClaims) errors.push('Daftar claim tidak ditemukan.');
    if(!rawGl) errors.push('Master GL tidak ditemukan.');
    if(!rawKar) errors.push('Master karyawan tidak ditemukan.');

    const seenIds = new Set();
    const claims = (rawClaims || []).map((rawClaim, index) => {
        const id = rawClaim && rawClaim.id !== null && rawClaim.id !== undefined ? String(rawClaim.id).trim() : '';
        if(!id || id.includes('/')) errors.push(`Claim urutan ${index + 1}: ID kosong/tidak valid.`);
        else if(seenIds.has(id)) errors.push(`Claim ID ${id} muncul lebih dari sekali.`);
        else seenIds.add(id);
        const rawTotal = Number(rawClaim && rawClaim.totalHeader);
        if(!Number.isFinite(rawTotal) || rawTotal < 0) errors.push(`Claim ${id || index + 1}: totalHeader harus angka nol atau positif.`);
        const currency = normalizeCurrency(rawClaim && rawClaim.mataUang || 'IDR');
        if(!/^[A-Z]{3}$/.test(currency)) errors.push(`Claim ${id || index + 1}: kode mata uang tidak valid.`);
        return normalizeClaimRecord({ ...rawClaim, mataUang: currency });
    });

    return {
        valid: errors.length === 0,
        errors,
        previousFormat,
        claims,
        gl: clonePlain(rawGl || []),
        karyawan: clonePlain(rawKar || []),
        raw: rawPayload || {}
    };
}

async function verifyBackupIntegrity(normalizedPayload) {
    const expected = normalizedPayload.raw && normalizedPayload.raw.integrity && normalizedPayload.raw.integrity.payloadSha256;
    if(!expected || expected === 'unavailable') return { verified: null, message: 'File lama/tanpa hash; validasi struktur tetap dijalankan.' };
    const copy = clonePlain(normalizedPayload.raw);
    delete copy.integrity;
    const actual = await sha256Hex(stableStringify(copy));
    if(!actual) return { verified: null, message: 'Browser tidak mendukung pemeriksaan hash.' };
    return { verified: actual === expected, message: actual === expected ? 'Hash SHA-256 cocok.' : 'Hash SHA-256 tidak cocok; file mungkin berubah/rusak.' };
}

function mergeMasterRecords(currentRows, backupRows, keyName) {
    const merged = new Map();
    (currentRows || []).forEach(row => merged.set(String(row && row[keyName] || '').trim(), clonePlain(row)));
    (backupRows || []).forEach(row => {
        const key = String(row && row[keyName] || '').trim();
        if(key) merged.set(key, clonePlain(row));
    });
    merged.delete('');
    return Array.from(merged.values());
}

function buildRestorePlan(normalizedPayload, currentClaims = dbRekap) {
    const currentMap = new Map((currentClaims || []).map(claim => [String(claim.id), normalizeClaimRecord(claim)]));
    const mergedMap = new Map(currentMap);
    let createCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;
    let protectedFinalCount = 0;
    const changedIds = [];
    const protectedFinalIds = [];
    normalizedPayload.claims.forEach(backupClaim => {
        const id = String(backupClaim.id);
        const currentClaim = currentMap.get(id);
        if(!currentClaim) createCount++;
        else if(claimComparable(currentClaim) === claimComparable(backupClaim)) unchangedCount++;
        else if(isClaimFinanciallyLocked(currentClaim)) {
            protectedFinalCount++;
            protectedFinalIds.push(id);
            return;
        } else updateCount++;
        if(!currentClaim || claimComparable(currentClaim) !== claimComparable(backupClaim)) {
            const restoredClaim = normalizeClaimRecord(backupClaim);
            if(currentClaim) restoredClaim._version = currentClaim._version;
            else restoredClaim._version = 0;
            mergedMap.set(id, restoredClaim);
            changedIds.push(id);
        }
    });
    return {
        createCount,
        updateCount,
        unchangedCount,
        protectedFinalCount,
        protectedFinalIds,
        changedIds,
        deleteCount: 0,
        retainedCurrentCount: Math.max(0, currentMap.size - normalizedPayload.claims.filter(claim => currentMap.has(String(claim.id))).length),
        mergedClaims: Array.from(mergedMap.values()),
        mergedGl: mergeMasterRecords(masterGL, normalizedPayload.gl, 'gl'),
        mergedKaryawan: mergeMasterRecords(masterKaryawan, normalizedPayload.karyawan, 'nik')
    };
}

async function applyRestorePlan(plan, sourceLabel) {
    const beforeGl = clonePlain(masterGL);
    const beforeKaryawan = clonePlain(masterKaryawan);
    dbRekap = plan.mergedClaims.sort((a, b) => Number(a.id) - Number(b.id));
    masterGL = plan.mergedGl;
    masterKaryawan = plan.mergedKaryawan;
    try {
        await saveDataToLocal({ claimIds: plan.changedIds || [] });
        logActivity(sessionUser, `Pemulihan Tanpa Penghapusan ${sourceLabel}: baru=${plan.createCount}; diperbarui=${plan.updateCount}; dihapus=0`);
        showToast(`Pemulihan selesai: ${plan.createCount} data baru, ${plan.updateCount} data dipulihkan, dan tidak ada data yang dihapus.`, 'success');
        refreshActiveViewSilently();
        renderBackupLog();
        return true;
    } catch(error) {
        console.error('[Restore] Sinkronisasi belum tuntas:', error);
        if(typeof window.restoreClaimsAfterConflict === 'function') await window.restoreClaimsAfterConflict(error);
        // Hanya rollback item restore yang tidak berhasil. Item yang sudah
        // mempunyai baseline baru berarti sudah tersimpan di cloud.
        const changedIds = new Set(plan.changedIds || []);
        dbRekap = dbRekap.filter(localClaim => {
            const id = String(localClaim.id);
            if(!changedIds.has(id)) return true;
            const baseline = claimBaseline.get(id);
            if(!baseline) return false;
            if(claimComparable(localClaim) !== claimComparable(baseline)) Object.assign(localClaim, clonePlain(baseline));
            return true;
        });
        masterGL = beforeGl;
        masterKaryawan = beforeKaryawan;
        await Promise.all([
            dbSyncClaimRows(plan.changedIds || []),
            dbSaveAll('gl', masterGL),
            dbSaveAll('karyawan', masterKaryawan)
        ]).catch(() => {});
        showToast('Pemulihan belum selesai. Data cloud yang lebih baru tetap dipertahankan; silakan periksa lalu ulangi.', 'error');
        return false;
    }
}

async function autoBackupRotation(reason = 'automatic') {
    try {
        const backupData = await buildBackupPayload(reason);
        const db = await dbPromise;
        await new Promise((resolve, reject) => {
            const tx = db.transaction('backups', 'readwrite');
            tx.objectStore('backups').put(backupData);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        const backups = await dbGetAll('backups');
        const sorted = backups.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if(sorted.length > 7) {
            await Promise.all(sorted.slice(7).map(item => dbDelete('backups', item.date)));
        }
        return backupData;
    } catch(error) {
        console.error('[Backup] Gagal membuat backup lokal:', error);
        return null;
    }
}

async function forceBackup() {
    if(!requireAdmin()) return;
    const result = await autoBackupRotation('manual-local');
    await renderBackupLog();
    showToast(result ? 'Cadangan lokal tervalidasi berhasil dibuat.' : 'Cadangan lokal gagal dibuat.', result ? 'success' : 'error');
}

async function renderBackupLog() {
    const tbody = document.getElementById('tbody-backup-log');
    if(!tbody) return;
    tbody.innerHTML = '';
    try {
        const backups = (await dbGetAll('backups')).sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if(!backups.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#777;">Belum terdapat cadangan lokal.</td></tr>';
            return;
        }
        backups.forEach(item => {
            const count = Number((item.manifest && item.manifest.claimCount) ?? (Array.isArray(item.claims) ? item.claims.length : (Array.isArray(item.db) ? item.db.length : 0)));
            const schema = item.schemaVersion ? `v${item.schemaVersion}` : 'format lama';
            tbody.innerHTML += `<tr><td>${escapeSystemText(item.date)}</td><td>${schema}</td><td>${count}</td><td><button class="btn btn-warning" style="font-size:11px; padding:4px 8px;" onclick="recoverBackup('${escapeSystemText(item.date)}')">♻️ Pulihkan dan Gabungkan</button></td></tr>`;
        });
    } catch(error) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#dc3545;">Cadangan lokal gagal dibaca.</td></tr>';
    }
}

async function recoverBackup(dateKey) {
    if(!requireAdmin()) return;
    const backups = await dbGetAll('backups');
    const target = backups.find(item => item.date === dateKey);
    if(!target) return showToast('Versi cadangan tidak ditemukan.', 'error');
    const normalized = normalizeBackupPayload(target);
    if(!normalized.valid) return customAlert(`Cadangan tidak valid:\n\n${normalized.errors.slice(0, 10).join('\n')}`);
    const integrity = await verifyBackupIntegrity(normalized);
    if(integrity.verified === false) return customAlert(`Pemulihan dibatalkan.\n\n${integrity.message}`);
    const plan = buildRestorePlan(normalized);
    customConfirm(`Apakah Anda ingin memulihkan cadangan ${dateKey} dengan mode aman?\n\nBaru: ${plan.createCount}\nDiperbarui: ${plan.updateCount}\nTidak berubah: ${plan.unchangedCount}\nPosted/Paid/Hold yang dilindungi dan tidak ditimpa: ${plan.protectedFinalCount}\nData saat ini yang tidak ada dalam cadangan tetap disimpan: ${plan.retainedCurrentCount}\nDihapus: 0`, async () => {
        await applyRestorePlan(plan, `backup lokal ${dateKey}`);
    });
}

async function downloadJSONBackup() {
    if(!requireAdmin()) return;
    const exportData = await buildBackupPayload('manual-download');
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `Backup_Worksheet_P6_FINAL_${exportData.date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    showToast('Cadangan JSON skema 2 beserta manifes dan hash berhasil diunduh.', 'success');
}

async function restoreJSONBackup(event) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if(!file) return;
    if(!requireAdmin()) { input.value = ''; return; }
    try {
        const rawPayload = JSON.parse(await file.text());
        const normalized = normalizeBackupPayload(rawPayload);
        if(!normalized.valid) throw new Error(normalized.errors.slice(0, 10).join('\n'));
        const integrity = await verifyBackupIntegrity(normalized);
        if(integrity.verified === false) throw new Error(integrity.message);
        const plan = buildRestorePlan(normalized);
        const formatNote = normalized.previousFormat ? '\nFile format lama diterima dan akan dinormalisasi ke schema 2.' : `\n${integrity.message}`;
        customConfirm(`Apakah Anda ingin melakukan pemulihan dengan mode gabung/perbarui tanpa penghapusan?\n\nBaru: ${plan.createCount}\nDiperbarui: ${plan.updateCount}\nTidak berubah: ${plan.unchangedCount}\nPosted/Paid/Hold yang dilindungi dan tidak ditimpa: ${plan.protectedFinalCount}\nData saat ini yang tetap dipertahankan: ${plan.retainedCurrentCount}\nDihapus: 0${formatNote}`, async () => {
            await applyRestorePlan(plan, `file ${file.name}`);
        });
    } catch(error) {
        customAlert(`File cadangan ditolak.\n\n${error.message || 'Format JSON tidak valid.'}`);
    } finally {
        input.value = '';
    }
}

function setCloudSyncState(state, textValue) {
    let el = document.getElementById('db-last-sync');
    if(!el) return;
    const colors = { syncing:'#d39e00', live:'#28a745', error:'#dc3545', local:'#6c757d' };
    el.innerText = textValue;
    el.style.color = colors[state] || '#777';
}

function paintGlobalDataProgress(id, percent, label, detail, state = 'working') {
    if(id !== activeGlobalDataProgressId) return;
    const root = document.getElementById('global-data-progress');
    if(!root) return;
    const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    const icons = { working:'☁️', pending:'⏳', success:'✅', error:'⚠️' };
    root.hidden = false;
    root.className = `global-data-progress is-${state}`;
    const icon = document.getElementById('global-data-progress-icon');
    const labelEl = document.getElementById('global-data-progress-label');
    const percentEl = document.getElementById('global-data-progress-percent');
    const detailEl = document.getElementById('global-data-progress-detail');
    const bar = document.getElementById('global-data-progress-bar');
    const track = document.getElementById('global-data-progress-track');
    if(icon) icon.textContent = icons[state] || icons.working;
    if(labelEl) labelEl.textContent = label || 'Memperbarui data...';
    if(percentEl) percentEl.textContent = `${safePercent}%`;
    if(detailEl) detailEl.textContent = detail || '';
    if(bar) bar.style.width = `${safePercent}%`;
    if(track) track.setAttribute('aria-valuenow', String(safePercent));
}

function startGlobalDataProgress(label, detail, state = 'working') {
    if(globalDataProgressHideTimer) clearTimeout(globalDataProgressHideTimer);
    const id = ++globalDataProgressCounter;
    activeGlobalDataProgressId = id;
    paintGlobalDataProgress(id, 0, label, detail, state);
    return id;
}

function updateGlobalDataProgress(id, percent, label, detail, state = 'working') {
    paintGlobalDataProgress(id, percent, label, detail, state);
}

function finishGlobalDataProgress(id, label = 'Data sudah lengkap', detail = 'Perangkat dan cloud sudah sinkron.') {
    if(id !== activeGlobalDataProgressId) return;
    paintGlobalDataProgress(id, 100, label, detail, 'success');
    globalDataProgressHideTimer = setTimeout(() => {
        if(id !== activeGlobalDataProgressId) return;
        const root = document.getElementById('global-data-progress');
        if(root) root.hidden = true;
        activeGlobalDataProgressId = 0;
    }, 1800);
}

function failGlobalDataProgress(id, percent, label, detail) {
    paintGlobalDataProgress(id, percent, label || 'Pembaruan cloud tertunda', detail || 'Data lokal tetap aman dan akan dicoba lagi.', 'error');
}

async function runTrackedDataUpdate(label, task) {
    const progressId = startGlobalDataProgress(label, 'Mengirim 1 pembaruan ke cloud...');
    try {
        const result = await task();
        finishGlobalDataProgress(progressId, `${label} selesai`, 'Cloud sudah menerima pembaruan.');
        return result;
    } catch(error) {
        failGlobalDataProgress(progressId, 0, `${label} gagal`, 'Cloud belum menerima pembaruan. Silakan coba lagi.');
        throw error;
    }
}
window.startGlobalDataProgress = startGlobalDataProgress;
window.updateGlobalDataProgress = updateGlobalDataProgress;
window.finishGlobalDataProgress = finishGlobalDataProgress;
window.failGlobalDataProgress = failGlobalDataProgress;
window.runTrackedDataUpdate = runTrackedDataUpdate;

function escapeSystemText(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function firestoreMillis(value) {
    if(!value) return 0;
    if(typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
    if(Number.isFinite(Number(value.seconds))) return (Number(value.seconds) * 1000) + Math.floor((Number(value.nanoseconds) || 0) / 1000000);
    if(value instanceof Date) return value.getTime();
    return Number(value) || 0;
}

function claimFromDocument(claimDoc) {
    const raw = claimDoc.data();
    const claim = normalizeClaimRecord({ ...raw, id: raw.id ?? Number(claimDoc.id) });
    const serverMs = firestoreMillis(raw._updatedAt);
    if(serverMs > 0) claim._updatedAtMs = serverMs;
    return claim;
}

function sortClaimsById(items) {
    return items.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

function isClaimLocallyDirty(id, localClaim, baseline = claimBaseline.get(String(id))) {
    const key = String(id);
    return dirtyClaimIds.has(key)
        || pendingClaimIds.has(key)
        || pendingClaimDeletions.has(key)
        || (!!localClaim && !!baseline && claimComparable(localClaim) !== claimComparable(baseline));
}

function markClaimChangesPending(changedClaims, deletedClaims) {
    (changedClaims || []).forEach(claim => dirtyClaimIds.add(String(claim.id)));
    (deletedClaims || []).forEach(([id, baseline]) => {
        const key = String(id);
        dirtyClaimIds.delete(key);
        pendingClaimDeletions.set(key, { id: key, baseline: baseline ? clonePlain(baseline) : null });
    });
    persistClaimSyncState();
}

function hasPendingCloudPersistence() {
    const masterPending = sessionRole === 'admin' && (
        stableStringify(masterGL || []) !== masterDataBaselines.gl
        || stableStringify(masterKaryawan || []) !== masterDataBaselines.karyawan
    );
    return dirtyClaimIds.size > 0 || pendingClaimDeletions.size > 0 || masterPending;
}

function schedulePendingClaimSync(delayMs = 80) {
    if(!localPersistenceHealthy || cloudSyncAutoRetryBlocked || !hasPendingCloudPersistence()) return;
    const safeDelay = Math.max(0, Number(delayMs) || 0);
    if(pendingClaimRetryTimer) {
        if(safeDelay >= pendingClaimRetryDelayMs) return;
        clearTimeout(pendingClaimRetryTimer);
    }
    pendingClaimRetryDelayMs = safeDelay;
    pendingClaimRetryTimer = setTimeout(() => {
        pendingClaimRetryTimer = null;
        pendingClaimRetryDelayMs = 0;
        // Cloud selalu menunggu seluruh transaksi IndexedDB yang sudah antre.
        // Ini menjaga janji local-first saat pengguna melakukan edit beruntun.
        const task = cloudPersistenceQueue.then(() => claimPersistenceQueue).then(() => flushPendingCloudSync());
        cloudPersistenceQueue = task.catch(error => console.warn('[Claim Sync] Antrean cloud belum dapat dikirim:', error));
        window.lastCloudPersistencePromise = task;
    }, safeDelay);
}

async function applyFullClaimSnapshot(snapshot) {
    const localMap = new Map((dbRekap || []).map(item => [String(item.id), normalizeClaimRecord(item)]));
    const remoteMap = new Map();
    let maxWatermark = 0;
    snapshot.docs.forEach(claimDoc => {
        const remoteClaim = claimFromDocument(claimDoc);
        remoteMap.set(claimDoc.id, remoteClaim);
        maxWatermark = Math.max(maxWatermark, Number(remoteClaim._updatedAtMs) || 0);
    });

    const merged = [];
    remoteMap.forEach((remoteClaim, id) => {
        if(pendingClaimDeletions.has(id)) return;
        const localClaim = localMap.get(id);
        if(!localClaim) {
            merged.push(remoteClaim);
            return;
        }
        const sameContent = claimComparable(localClaim) === claimComparable(remoteClaim);
        const localVersion = Number(localClaim._version) || 0;
        const remoteVersion = Number(remoteClaim._version) || 0;
        if(sameContent) dirtyClaimIds.delete(id);
        const preserveLocal = !sameContent
            && (dirtyClaimIds.has(id) || pendingClaimIds.has(id) || localVersion >= remoteVersion);
        if(preserveLocal && !sameContent) dirtyClaimIds.add(id);
        merged.push(preserveLocal ? localClaim : remoteClaim);
    });
    localMap.forEach((localClaim, id) => {
        if(remoteMap.has(id) || pendingClaimDeletions.has(id)) return;
        if(dirtyClaimIds.has(id) || pendingClaimIds.has(id) || Number(localClaim._version) === 0) {
            dirtyClaimIds.add(id);
            merged.push(localClaim);
        }
    });

    claimBaseline = remoteMap;
    dbRekap = sortClaimsById(merged);
    await dbSaveAll('claims', dbRekap);
    const nowMs = Date.now();
    commitClaimCacheMetadata(maxWatermark || nowMs, getStoredSyncNumber(CLAIM_DELETE_WATERMARK_KEY) ?? nowMs);
    persistClaimSyncState();
    claimsSnapshotInitialized = true;
    schedulePendingClaimSync();
    return { changed: true, maxWatermark };
}

async function applyIncrementalClaimSnapshot(snapshot) {
    const localMap = new Map((dbRekap || []).map(item => [String(item.id), item]));
    const upserts = [];
    const deletes = [];
    let maxWatermark = getStoredSyncNumber(CLAIM_SYNC_WATERMARK_KEY) || 0;

    snapshot.docChanges().forEach(change => {
        const id = change.doc.id;
        const localClaim = localMap.get(id) || null;
        const oldBaseline = claimBaseline.get(id);
        if(change.type === 'removed') {
            claimBaseline.delete(id);
            if(localClaim && !isClaimLocallyDirty(id, localClaim, oldBaseline)) {
                localMap.delete(id);
                deletes.push(localClaim.id);
            }
            return;
        }

        const remoteClaim = claimFromDocument(change.doc);
        maxWatermark = Math.max(maxWatermark, Number(remoteClaim._updatedAtMs) || 0);
        claimBaseline.set(id, clonePlain(remoteClaim));
        if(pendingClaimDeletions.has(id)) return;
        if(localClaim && claimComparable(localClaim) === claimComparable(remoteClaim)) dirtyClaimIds.delete(id);
        if(localClaim && isClaimLocallyDirty(id, localClaim, oldBaseline)) return;
        if(!localClaim || stableStringify(localClaim) !== stableStringify(remoteClaim)) {
            localMap.set(id, remoteClaim);
            upserts.push(remoteClaim);
        }
    });

    dbRekap = sortClaimsById(Array.from(localMap.values()));
    await Promise.all([dbPutMany('claims', upserts), dbDeleteMany('claims', deletes)]);
    if(maxWatermark > 0) localStorage.setItem(CLAIM_SYNC_WATERMARK_KEY, String(maxWatermark));
    updateClaimCacheCount();
    persistClaimSyncState();
    claimsSnapshotInitialized = true;
    schedulePendingClaimSync();
    return { changed: upserts.length > 0 || deletes.length > 0, maxWatermark };
}

async function applyClaimDeletionSnapshot(snapshot) {
    const localMap = new Map((dbRekap || []).map(item => [String(item.id), item]));
    const deletes = [];
    let maxWatermark = getStoredSyncNumber(CLAIM_DELETE_WATERMARK_KEY) || 0;

    snapshot.docChanges().forEach(change => {
        if(change.type === 'removed') return;
        const data = change.doc.data() || {};
        const id = String(data.claimId ?? change.doc.id);
        const deletedAtMs = firestoreMillis(data.deletedAt) || Number(data.deletedAtMs) || 0;
        maxWatermark = Math.max(maxWatermark, deletedAtMs);
        const localClaim = localMap.get(id);
        const localUpdatedAtMs = Number(localClaim && localClaim._updatedAtMs) || 0;
        if(localClaim && !dirtyClaimIds.has(id) && !pendingClaimIds.has(id) && deletedAtMs >= localUpdatedAtMs) {
            localMap.delete(id);
            deletes.push(localClaim.id);
            claimBaseline.delete(id);
        }
        if(pendingClaimDeletions.has(id)) pendingClaimDeletions.delete(id);
    });

    if(deletes.length) {
        dbRekap = sortClaimsById(Array.from(localMap.values()));
        await dbDeleteMany('claims', deletes);
        updateClaimCacheCount();
    }
    if(maxWatermark > 0) localStorage.setItem(CLAIM_DELETE_WATERMARK_KEY, String(maxWatermark));
    persistClaimSyncState();
    return { changed: deletes.length > 0, maxWatermark };
}

function buildClaimDeltaQuery() {
    const watermark = getStoredSyncNumber(CLAIM_SYNC_WATERMARK_KEY) || Date.now();
    return window.fbQuery(
        window.fbCollection(window.firebaseDb, CLAIMS_COLLECTION),
        window.fbWhere('_updatedAt', '>=', new Date(Math.max(0, watermark - CLAIM_DELTA_OVERLAP_MS))),
        window.fbOrderBy('_updatedAt', 'asc')
    );
}

function ensureActivityLogSubscription(generation = cloudListenerGeneration) {
    if(!isAppAdmin() || typeof window.fbOnSnapshot !== 'function' || typeof window.fbCollection !== 'function') return;
    if(typeof window.unsubLogState !== 'function' && typeof window.fbDoc === 'function') {
        const cleanupStateRef = window.fbDoc(window.firebaseDb, 'appData', 'activityLogState');
        window.unsubLogState = window.fbOnSnapshot(cleanupStateRef, snapshot => {
            if(generation !== cloudListenerGeneration || !snapshot.exists()) return;
            const cutoffMs = Number(snapshot.data() && snapshot.data().cutoffMs) || 0;
            if(cutoffMs > 0 && typeof window.applyActivityLogCleanupCutoff === 'function') window.applyActivityLogCleanupCutoff(cutoffMs);
        }, error => console.error('[Activity Log] Cleanup state listener gagal:', error));
    }
    if(typeof window.unsubLogs === 'function') return;
    const activityWatermark = typeof getActivityLogSyncWatermark === 'function' ? getActivityLogSyncWatermark() : 0;
    const logsRef = activityWatermark > 0
        ? window.fbQuery(
            window.fbCollection(window.firebaseDb, 'activityLogs'),
            window.fbWhere('ts', '>=', Math.max(0, activityWatermark - CLAIM_DELTA_OVERLAP_MS)),
            window.fbOrderBy('ts', 'asc')
        )
        : window.fbQuery(
            window.fbCollection(window.firebaseDb, 'activityLogs'),
            window.fbOrderBy('ts', 'desc'),
            window.fbLimit(2000)
        );
    window.unsubLogs = window.fbOnSnapshot(logsRef, snapshot => {
        if(generation !== cloudListenerGeneration) return;
        const changes = snapshot.docChanges();
        const removedIds = new Set(changes.filter(change => change.type === 'removed').map(change => String(change.doc.id)));
        const remoteLogs = changes
            .filter(change => change.type !== 'removed')
            .map(change => ({ id: change.doc.id, ...change.doc.data() }));
        const latestRemoteTs = remoteLogs.reduce((max, log) => Math.max(max, Number(log.ts) || 0), activityWatermark || 0);
        const keptLocal = activityLogs.filter(entry => !removedIds.has(String(entry && (entry.eventId || entry.id) || '')));
        cacheActivityLogs(mergeActivityLogRows(remoteLogs, keptLocal, activityLogOutbox));
        if(typeof setActivityLogSyncWatermark === 'function') setActivityLogSyncWatermark(latestRemoteTs || Date.now());
    }, error => console.error('[Activity Log] Listener gagal:', error));
}
window.ensureActivityLogSubscription = ensureActivityLogSubscription;

function subscribeToClaimChanges(claimsRef, deltaMode, generation, syncBtn, progressId = 0) {
    return window.fbOnSnapshot(claimsRef, snapshot => {
        if(generation !== cloudListenerGeneration) return;
        const realtimeCount = typeof snapshot.docChanges === 'function' ? snapshot.docChanges().length : snapshot.docs.length;
        const snapshotProgressId = progressId || (realtimeCount > 0 && !activeGlobalDataProgressId
            ? startGlobalDataProgress('Menerima update realtime', `Menerapkan ${realtimeCount} perubahan ke layar ini...`)
            : 0);
        if(snapshotProgressId) updateGlobalDataProgress(snapshotProgressId, 35, 'Membaca update cloud', 'Menerapkan perubahan terbaru ke cache lokal...');
        claimSnapshotQueue = claimSnapshotQueue.then(async () => {
            if(generation !== cloudListenerGeneration) return;
            const firstFullSnapshot = !deltaMode && !claimsSnapshotInitialized;
            const result = deltaMode
                ? await applyIncrementalClaimSnapshot(snapshot)
                : (firstFullSnapshot ? await applyFullClaimSnapshot(snapshot) : await applyIncrementalClaimSnapshot(snapshot));
            const now = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
            setCloudSyncState('live', `${now} (${deltaMode || firstFullSnapshot ? 'Delta' : 'Live'})`);
            const syncEl = document.getElementById('db-last-sync');
            if(syncEl) syncEl.title = deltaMode
                ? 'Cache lokal aktif; Firestore hanya membaca data baru atau yang berubah.'
                : 'Bootstrap cache selesai; listener penuh langsung diganti menjadi delta.';
            if(syncBtn) setCloudSyncButtonState('live');
            if(result && result.changed) scheduleRealtimeViewRefresh();
            if(snapshotProgressId) finishGlobalDataProgress(snapshotProgressId, 'Data cloud sudah diperbarui', result && result.changed ? 'Perubahan terbaru sudah tampil.' : 'Tidak ada perubahan baru.');

            // Full read hanya satu kali untuk membentuk cache P6. Begitu selesai,
            // listener koleksi penuh ditutup dan sesi yang sama langsung memakai delta.
            if(firstFullSnapshot && generation === cloudListenerGeneration) {
                if(typeof window.unsubClaims === 'function') window.unsubClaims();
                window.unsubClaims = subscribeToClaimChanges(buildClaimDeltaQuery(), true, generation, syncBtn, 0);
            }
        }).catch(error => {
            console.error('[Firebase] Gagal menerapkan perubahan claim:', error);
            setCloudSyncState('error', 'Sinkronisasi Gagal');
            if(syncBtn) setCloudSyncButtonState('error');
            if(snapshotProgressId) failGlobalDataProgress(snapshotProgressId, 35, 'Gagal membaca update cloud', 'Cache lokal tetap dapat digunakan. Coba tekan Sync lagi.');
        });
    }, error => {
        if(generation !== cloudListenerGeneration) return;
        console.error('[Firebase] Claims listener error:', error);
        setCloudSyncState('error', 'Sinkronisasi Gagal');
        if(syncBtn) setCloudSyncButtonState('error');
        if(progressId) failGlobalDataProgress(progressId, 0, 'Koneksi cloud bermasalah', 'Cache lokal tetap dapat digunakan. Coba tekan Sync lagi.');
    });
}

function loadFromCloud() {
    const generation = ++cloudListenerGeneration;
    cloudSyncAutoRetryBlocked = false;
    const progressId = startGlobalDataProgress('Membaca update cloud', 'Menghubungkan cache lokal dengan Firestore...');
    const syncBtn = document.getElementById('btn-cloud-sync');
    if(syncBtn) setCloudSyncButtonState('busy');

    const cacheReady = isClaimDeltaCacheReady();
    const deleteWatermark = getStoredSyncNumber(CLAIM_DELETE_WATERMARK_KEY) || Date.now();
    const claimsRef = cacheReady
        ? buildClaimDeltaQuery()
        : window.fbCollection(window.firebaseDb, CLAIMS_COLLECTION);
    const claimDeletionsRef = window.fbQuery(
        window.fbCollection(window.firebaseDb, CLAIM_DELETIONS_COLLECTION),
        window.fbWhere('deletedAt', '>=', new Date(Math.max(0, deleteWatermark - CLAIM_DELTA_OVERLAP_MS))),
        window.fbOrderBy('deletedAt', 'asc')
    );
    const glRef = window.fbDoc(window.firebaseDb, 'appData', 'gl');
    const karRef = window.fbDoc(window.firebaseDb, 'appData', 'karyawan');
    const calendarRef = window.fbDoc(window.firebaseDb, 'appData', 'slaCalendar');
    const slaSettingsRef = window.fbDoc(window.firebaseDb, 'appData', 'slaSettings');
    [window.unsubClaims, window.unsubClaimDeletions, window.unsubGL, window.unsubKar, window.unsubLogs, window.unsubLogState, window.unsubCalendar, window.unsubSlaSettings]
        .forEach(unsub => { if(typeof unsub === 'function') unsub(); });
    window.unsubLogs = null;
    window.unsubLogState = null;
    claimsSnapshotInitialized = false;
    claimSnapshotQueue = Promise.resolve();

    window.unsubClaims = subscribeToClaimChanges(claimsRef, cacheReady, generation, syncBtn, progressId);

    window.unsubClaimDeletions = window.fbOnSnapshot(claimDeletionsRef, snapshot => {
        if(generation !== cloudListenerGeneration) return;
        claimSnapshotQueue = claimSnapshotQueue.then(async () => {
            const result = await applyClaimDeletionSnapshot(snapshot);
            if(result.changed) scheduleRealtimeViewRefresh();
        }).catch(error => console.error('[Claim Sync] Listener penghapusan gagal diterapkan:', error));
    }, error => console.error('[Claim Sync] Listener penghapusan gagal:', error));

    window.unsubGL = window.fbOnSnapshot(glRef, async docSnap => {
        if(generation !== cloudListenerGeneration || !docSnap.exists()) return;
        const incoming = clonePlain(docSnap.data().data || []);
        const signature = stableStringify(incoming);
        if(signature === masterDataBaselines.gl) return;
        masterGL = incoming;
        masterDataBaselines.gl = signature;
        await dbSaveAll('gl', masterGL);
        updateGLDropdownOptions();
        if(window.currentOpenMenu === 'master-gl') renderMasterGL();
    });
    window.unsubKar = window.fbOnSnapshot(karRef, async docSnap => {
        if(generation !== cloudListenerGeneration || !docSnap.exists()) return;
        const incoming = clonePlain(docSnap.data().data || []);
        const signature = stableStringify(incoming);
        if(signature === masterDataBaselines.karyawan) return;
        masterKaryawan = incoming;
        masterDataBaselines.karyawan = signature;
        await dbSaveAll('karyawan', masterKaryawan);
        if(window.currentOpenMenu === 'master-karyawan') renderMasterKaryawan();
    });
    window.unsubCalendar = window.fbOnSnapshot(calendarRef, docSnap => {
        if(generation !== cloudListenerGeneration) return;
        if(docSnap.exists()) applySlaCalendar(docSnap.data());
        else if(isAppAdmin()) window.fbSetDoc(calendarRef, getDefaultSlaCalendarPayload()).catch(error => console.error('[SLA Calendar] Bootstrap gagal:', error));
    }, error => console.error('[SLA Calendar] Listener gagal:', error));
    window.unsubSlaSettings = window.fbOnSnapshot(slaSettingsRef, docSnap => {
        if(generation !== cloudListenerGeneration) return;
        if(docSnap.exists()) applySlaSettings(docSnap.data());
        else if(isAppAdmin()) {
            const payload = { ...normalizeSlaSettings(DEFAULT_SLA_SETTINGS), updatedAtMs: Date.now(), updatedBy: sessionUser || 'bootstrap' };
            window.fbSetDoc(slaSettingsRef, payload).catch(error => console.error('[SLA Settings] Bootstrap gagal:', error));
        }
    }, error => console.error('[SLA Settings] Listener gagal:', error));
    if(isAppAdmin() && window.currentOpenMenu === 'master-user') ensureActivityLogSubscription(generation);
}

// normalizeClaimRecord() merapikan bentuk data setiap kali payload dibangun:
// nama dan NIK di-trim, totalHeader dijadikan angka, mata uang diseragamkan,
// dan detailNota.rows ditulis ulang. Untuk claim lama hasilnya berbeda dari
// dokumen yang tersimpan di cloud walaupun pengguna tidak menyentuh field itu.
//
// Rules alur Finance (Paid, Hold, Return, Batal Bayar, Lepas Hold) memakai
// workflowFieldsOnly(), yang menolak update begitu ada satu field di luar
// daftar alur ikut berubah. Satu spasi di ujung nama pun cukup membuat
// seluruh perubahan status ditolak, padahal di layar terlihat berhasil.
//
// Karena itu setiap field yang secara makna tidak berubah dikirim ulang
// persis seperti nilai yang sudah ada di cloud, apa pun tipe simpannya, selama
// bentuknya masih memenuhi validClaimShape(). Field meta dikecualikan:
// nilainya memang sengaja diperbarui setiap kali payload dikirim.
const CLAIM_SYNC_META_FIELDS = new Set(['_version', '_updatedAt', '_updatedAtMs', '_updatedBy']);
// Payload dikirim dengan set() penuh, sehingga field yang tidak ikut dikirim
// otomatis terhapus di cloud. Hanya field berikut yang memang pernah dihapus
// oleh aksi pengguna: alur Finance (Batal Bayar, Lepas Hold), pembatalan
// status oleh Admin, dan penghapusan rincian nota. Field lain yang ada di
// cloud tetapi tidak ada pada salinan lokal berarti salinan lokalnya yang
// tertinggal, bukan penghapusan yang disengaja, jadi nilainya dipertahankan.
// Tanpa penjagaan ini satu field asing saja membuat workflowFieldsOnly()
// menolak seluruh perubahan status.
const CLAIM_REMOVABLE_FIELDS = new Set([
    'paymentAt', 'paymentAtMs', 'paymentDate', 'paymentBy', 'paymentReference',
    'holdReason', 'holdAt', 'holdAtMs', 'holdBy',
    'postedAt', 'postedBy', 'detailNota'
]);
// validClaimShape() menuntut bentuk tertentu untuk sebagian field. Dokumen lama
// bisa menyimpannya di luar bentuk itu, misalnya kode mata uang huruf kecil atau
// total header berupa teks. Payload wajib memuatnya dalam bentuk yang sah, tetapi
// mengirim hasil normalisasi membuat workflowFieldsOnly() melihatnya sebagai
// perubahan di luar alur. Kedua syarat itu hanya bisa dipenuhi bersamaan apabila
// rules mengizinkan perbaikan bentuk; daftar ini dipakai untuk mengenali
// perbaikan tersebut dan melaporkannya jika rules yang terpasang belum mendukung.
const CLAIM_SHAPE_REPAIRABLE_FIELDS = ['nama', 'nik', 'statusClaim', 'totalHeader', 'mataUang'];
function isClaimShapeLegalValue(field, value) {
    if(field === 'nama' || field === 'nik' || field === 'statusClaim') return typeof value === 'string';
    if(field === 'totalHeader') return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    if(field === 'mataUang') return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
    return true;
}

// Bentuk simpan yang membuat dokumen tidak dapat diperbarui sama sekali:
// rules membaca resource.data._version sebagai angka, jadi nilai bertipe lain
// membuat seluruh aturan update gagal dievaluasi sebelum cabang mana pun dicoba.
function describeUnwritableClaimShape(remoteRaw) {
    if(!remoteRaw) return '';
    const version = remoteRaw._version;
    if(version !== undefined && !(typeof version === 'number' && Number.isInteger(version))) {
        return `_version tersimpan sebagai ${typeof version === 'string' ? 'teks' : typeof version}`;
    }
    return '';
}

// Field alur kerja adalah satu-satunya yang boleh berubah pada transisi status.
// Selebihnya dikembalikan persis seperti yang tersimpan di cloud, apa pun tipenya,
// supaya tidak ada satu pun selisih di luar alur.
function preserveIncidentalClaimFields(nextClaim, remoteClaim, remoteRaw) {
    if(!nextClaim || !remoteClaim || !remoteRaw) return { repairedFields: [] };
    const repairedFields = [];
    const fields = new Set([...Object.keys(nextClaim), ...Object.keys(remoteRaw)]);
    fields.forEach(field => {
        if(CLAIM_SYNC_META_FIELDS.has(field)) return;
        const remoteHasField = Object.prototype.hasOwnProperty.call(remoteRaw, field);
        // Kedua sisi dibandingkan dalam bentuk yang sudah dinormalisasi. Kalau
        // sama, isinya tidak diubah pengguna dan nilai asli cloud dipertahankan
        // supaya hasil normalisasi tidak pernah muncul sebagai perubahan.
        if(stableStringify(nextClaim[field]) === stableStringify(remoteClaim[field])) {
            if(!remoteHasField) { delete nextClaim[field]; return; }
            if(isClaimShapeLegalValue(field, remoteRaw[field])) {
                nextClaim[field] = clonePlain(remoteRaw[field]);
                return;
            }
            // Nilai simpannya melanggar validClaimShape(), sehingga tidak dapat
            // dikirim ulang apa adanya. Hasil normalisasi yang dipakai, dan
            // field ini dicatat sebagai perbaikan bentuk.
            if(CLAIM_SHAPE_REPAIRABLE_FIELDS.includes(field)) repairedFields.push(field);
            return;
        }
        // Cloud menyimpan field yang tidak dikenal salinan lokal ini dan bukan
        // field yang dapat dihapus aksi pengguna. Menghapusnya di cloud tidak
        // pernah diminta, jadi nilainya dikirim ulang apa adanya.
        if(remoteHasField
            && !Object.prototype.hasOwnProperty.call(nextClaim, field)
            && !CLAIM_REMOVABLE_FIELDS.has(field)) nextClaim[field] = clonePlain(remoteRaw[field]);
    });
    return { repairedFields };
}
window.preserveIncidentalClaimFields = preserveIncidentalClaimFields;

// Sebab penolakan bentuk dicatat per claim selama transaksi berjalan supaya
// pesan kegagalan dapat menyebutkan field yang membuat cloud menolak.
const claimShapeDiagnostics = new Map();

async function saveOneClaimWithVersion(localClaim) {
    const id = String(localClaim.id);
    const sentComparable = claimComparable(localClaim);
    const baseline = claimBaseline.get(id);
    const baselineVersion = baseline ? Number(baseline._version) || 0 : 0;
    const docRef = window.fbDoc(window.firebaseDb, CLAIMS_COLLECTION, id);
    pendingClaimIds.add(id);
    try {
        // Claim baru tidak membutuhkan transaction.get(). Rules memastikan _version=1
        // hanya boleh membuat dokumen yang belum ada, sehingga tidak dapat menimpa data.
        if(baselineVersion === 0 && Number(localClaim._version) === 0) {
            const nextClaim = normalizeClaimRecord(localClaim);
            nextClaim._version = 1;
            nextClaim._updatedAtMs = Date.now();
            nextClaim._updatedBy = sessionUser;
            try {
                await window.fbSetDoc(docRef, { ...nextClaim, _updatedAt: window.fbServerTimestamp() });
            } catch(error) {
                if(error && (error.code === 'permission-denied' || error.code === 'already-exists') && window.fbGetDoc) {
                    const remoteSnap = await window.fbGetDoc(docRef).catch(() => null);
                    if(remoteSnap && remoteSnap.exists()) {
                        const conflict = new Error(`CREATE_CONFLICT:${id}`);
                        conflict.code = 'claim-conflict';
                        conflict.claimId = id;
                        conflict.remoteClaim = claimFromDocument(remoteSnap);
                        throw conflict;
                    }
                }
                throw error;
            }
            await acknowledgeSavedClaim(id, localClaim, sentComparable, nextClaim);
            return;
        }

        const savedClaim = await window.fbRunTransaction(window.firebaseDb, async transaction => {
            const remoteSnap = await transaction.get(docRef);
            const remoteClaim = remoteSnap.exists() ? claimFromDocument(remoteSnap) : null;
            const remoteVersion = remoteClaim ? Number(remoteClaim._version) || 0 : 0;

            if(remoteSnap.exists() && (!baseline || remoteVersion !== baselineVersion)) {
                const conflict = new Error(`CONFLICT:${id}`);
                conflict.code = 'claim-conflict'; conflict.claimId = id; conflict.remoteClaim = remoteClaim;
                throw conflict;
            }
            if(!remoteSnap.exists() && baseline) {
                const conflict = new Error(`REMOTE_DELETED:${id}`);
                conflict.code = 'claim-conflict'; conflict.claimId = id; conflict.remoteDeleted = true;
                throw conflict;
            }

            const remoteRaw = remoteSnap.exists() ? remoteSnap.data() : null;
            const nextClaim = normalizeClaimRecord(localClaim);
            const { repairedFields } = preserveIncidentalClaimFields(nextClaim, remoteClaim, remoteRaw);
            claimShapeDiagnostics.set(id, {
                repairedFields,
                unwritable: describeUnwritableClaimShape(remoteRaw),
                noPR: localClaim.noPR || localClaim.extNo || id
            });
            nextClaim._version = remoteVersion + 1;
            nextClaim._updatedAtMs = Date.now(); nextClaim._updatedBy = sessionUser;
            transaction.set(docRef, { ...nextClaim, _updatedAt: window.fbServerTimestamp() });
            return nextClaim;
        });
        claimShapeDiagnostics.delete(id);
        await acknowledgeSavedClaim(id, localClaim, sentComparable, savedClaim);
    } catch(error) {
        // Penolakan permanen pada dokumen berbentuk lama punya sebab yang
        // sangat spesifik; sebabnya dilekatkan supaya pesan ke pengguna dapat
        // menyebut field yang bermasalah, bukan sekadar "ditolak cloud".
        if(error && error.code === 'permission-denied') {
            const diagnostic = claimShapeDiagnostics.get(id);
            if(diagnostic) error.claimShapeDiagnostic = diagnostic;
        }
        throw error;
    } finally { pendingClaimIds.delete(id); claimShapeDiagnostics.delete(id); }
}

async function acknowledgeSavedClaim(id, sentClaim, sentComparable, savedClaim) {
    Object.assign(sentClaim, savedClaim);
    claimBaseline.set(id, clonePlain(savedClaim));
    const liveClaim = dbRekap.find(item => String(item.id) === id);
    if(liveClaim && claimComparable(liveClaim) === sentComparable) {
        Object.assign(liveClaim, savedClaim);
        dirtyClaimIds.delete(id);
        await dbPutMany('claims', [liveClaim]);
    } else if(liveClaim) {
        // Ada edit baru ketika request sebelumnya masih terbang. Baseline cloud
        // dinaikkan, tetapi edit terbaru tetap berada di antrean berikutnya.
        dirtyClaimIds.add(id);
    } else {
        dirtyClaimIds.delete(id);
    }
    persistClaimSyncState();
}

async function deleteOneClaimWithVersion(id, baseline) {
    const docRef = window.fbDoc(window.firebaseDb, CLAIMS_COLLECTION, id);
    const deletionRef = window.fbDoc(window.firebaseDb, CLAIM_DELETIONS_COLLECTION, id);
    const baselineVersion = Number(baseline && baseline._version) || 0;
    pendingClaimIds.add(id);
    try {
        await window.fbRunTransaction(window.firebaseDb, async transaction => {
            const remoteSnap = await transaction.get(docRef);
            const remoteVersion = remoteSnap.exists() ? Number(remoteSnap.data()._version) || 0 : baselineVersion;
            if(remoteSnap.exists() && remoteVersion !== baselineVersion) {
                const conflict = new Error(`DELETE_CONFLICT:${id}`);
                conflict.code = 'claim-conflict'; conflict.claimId = id;
                conflict.remoteClaim = claimFromDocument(remoteSnap);
                throw conflict;
            }
            const deletedAtMs = Date.now();
            transaction.set(deletionRef, {
                claimId: id,
                sourceVersion: remoteVersion,
                deletedAtMs,
                deletedAt: window.fbServerTimestamp(),
                deletedBy: getCurrentActorIdentity()
            });
            if(remoteSnap.exists()) transaction.delete(docRef);
        });
        claimBaseline.delete(id);
        pendingClaimDeletions.delete(id);
        if(dbRekap.some(item => String(item.id) === String(id))) dirtyClaimIds.add(String(id));
        else dirtyClaimIds.delete(String(id));
        persistClaimSyncState();
    } finally { pendingClaimIds.delete(id); }
}

async function runWithConcurrency(items, worker, limit = 4, onSettled = null) {
    const failures = [];
    for(let start = 0; start < items.length; start += limit) {
        const group = items.slice(start, start + limit);
        const results = await Promise.allSettled(group.map(worker));
        results.forEach(result => {
            if(result.status === 'rejected') failures.push(result.reason);
            if(typeof onSettled === 'function') onSettled(result);
        });
    }
    return failures;
}

function collectClaimPersistenceChanges(claims, baselineMap, targetIds = null) {
    const currentMap = new Map((claims || []).map(item => [String(item.id), item]));
    const scopedIds = targetIds instanceof Set ? new Set(Array.from(targetIds, String)) : null;
    if(scopedIds) {
        dirtyClaimIds.forEach(id => scopedIds.add(String(id)));
        pendingClaimDeletions.forEach((_entry, id) => scopedIds.add(String(id)));
    }
    const candidates = scopedIds
        ? Array.from(scopedIds).map(id => currentMap.get(id)).filter(Boolean)
        : (claims || []);
    const changedClaims = candidates.filter(item => {
        const id = String(item.id);
        const baseline = baselineMap.get(id);
        return dirtyClaimIds.has(id) || !baseline || claimComparable(item) !== claimComparable(baseline);
    });
    const deletedMap = new Map();
    pendingClaimDeletions.forEach((entry, id) => {
        // Jika caller mengembalikan claim ke cache setelah kegagalan jaringan,
        // penghapusan dianggap dibatalkan dan tidak boleh terkirim belakangan.
        if(currentMap.has(id)) {
            pendingClaimDeletions.delete(id);
            return;
        }
        deletedMap.set(id, entry.baseline || baselineMap.get(id) || null);
    });
    baselineMap.forEach((baseline, id) => {
        if((!scopedIds || scopedIds.has(id)) && !currentMap.has(id)) deletedMap.set(id, baseline);
    });
    const deletedClaims = Array.from(deletedMap.entries());
    return { currentMap, changedClaims, deletedClaims };
}

async function persistCurrentState(options = null) {
    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    let now = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    const hintedIds = options && Array.isArray(options.claimIds) ? new Set(options.claimIds.map(String)) : null;
    const { changedClaims, deletedClaims } = collectClaimPersistenceChanges(dbRekap, claimBaseline, hintedIds);
    const glSignature = stableStringify(masterGL || []);
    const employeeSignature = stableStringify(masterKaryawan || []);
    const glChanged = glSignature !== masterDataBaselines.gl;
    const employeeChanged = employeeSignature !== masterDataBaselines.karyawan;
    const hasLocalChanges = changedClaims.length > 0 || deletedClaims.length > 0 || glChanged || employeeChanged;
    const progressId = hasLocalChanges
        ? startGlobalDataProgress('Menyimpan perubahan', 'Menulis data terbaru ke perangkat...')
        : 0;
    markClaimChangesPending(changedClaims, deletedClaims);
    const claimsNeedingLocalWrite = changedClaims.filter(claim => !locallyCachedClaimIds.has(String(claim.id)));
    const glNeedsLocalWrite = glChanged && !locallyCachedMasterKeys.has('gl');
    const employeeNeedsLocalWrite = employeeChanged && !locallyCachedMasterKeys.has('karyawan');

    try {
        await Promise.all([
            dbPutMany('claims', claimsNeedingLocalWrite),
            dbDeleteMany('claims', deletedClaims.map(([id, baseline]) => baseline && baseline.id !== undefined ? baseline.id : id)),
            glNeedsLocalWrite ? dbSaveAll('gl', masterGL) : Promise.resolve(),
            employeeNeedsLocalWrite ? dbSaveAll('karyawan', masterKaryawan) : Promise.resolve()
        ]);
    } catch(error) {
        localPersistenceHealthy = false;
        if(progressId) failGlobalDataProgress(progressId, 0, 'Penyimpanan lokal gagal', 'Perubahan belum aman di perangkat. Coba simpan kembali.');
        throw error;
    }
    localPersistenceHealthy = true;
    changedClaims.forEach(claim => locallyCachedClaimIds.delete(String(claim.id)));
    if(glChanged) locallyCachedMasterKeys.delete('gl');
    if(employeeChanged) locallyCachedMasterKeys.delete('karyawan');
    if(sessionRole !== 'admin') {
        if(glChanged) masterDataBaselines.gl = glSignature;
        if(employeeChanged) masterDataBaselines.karyawan = employeeSignature;
    }
    updateClaimCacheCount();
    const localFinishedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try { localStorage.setItem('otsukaDBUpdate_v16', now); }
    catch(error) { console.warn('[Cache] Waktu update tidak dapat dicatat:', error); }
    let updateEl = document.getElementById('db-last-update'); if(updateEl) updateEl.innerText = now;
    schedulePostSaveMaintenance();
    if(changedClaims.length || deletedClaims.length || glChanged || employeeChanged) scheduleAutomaticBackup();

    if(!window.firebaseDb || !window.fbRunTransaction) {
        setCloudSyncState('local', `${now} (Lokal)`);
        window.lastSavePerformance = { localMs: Math.round(localFinishedAt - startedAt), cloudMs: null, totalMs: Math.round(localFinishedAt - startedAt), changedClaims: changedClaims.length, deletedClaims: deletedClaims.length };
        if(progressId) updateGlobalDataProgress(progressId, 100, 'Aman di perangkat', 'Cloud belum tersambung; antrean akan dikirim saat koneksi tersedia.', 'pending');
        return { localSaved:true, cloudQueued:false };
    }
    window.lastSavePerformance = {
        localMs: Math.round(localFinishedAt - startedAt), cloudMs: null,
        totalMs: Math.round(localFinishedAt - startedAt), changedClaims: changedClaims.length, deletedClaims: deletedClaims.length
    };
    const cloudQueued = hasLocalChanges && hasPendingCloudPersistence();
    if(cloudQueued) {
        cloudSyncAutoRetryBlocked = false;
        setCloudSyncState('syncing', 'Antrean cloud...');
        if(progressId) updateGlobalDataProgress(progressId, 25, 'Tersimpan di perangkat', 'Tampilan sudah diperbarui · menunggu pengiriman cloud...', 'pending');
        schedulePendingClaimSync(40);
    } else if(hasLocalChanges) {
        setCloudSyncState('local', `${now} (Lokal)`);
        if(progressId) finishGlobalDataProgress(progressId, 'Perubahan lokal sudah selesai', 'Tidak ada pembaruan cloud yang perlu dikirim.');
    }
    return { localSaved:true, cloudQueued };
}

async function flushPendingCloudSync() {
    if(!localPersistenceHealthy || !window.firebaseDb || !window.fbRunTransaction || !hasPendingCloudPersistence()) return false;
    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const { changedClaims, deletedClaims } = collectClaimPersistenceChanges(dbRekap, claimBaseline, null);
    const claimSnapshots = changedClaims.map(claim => clonePlain(claim));
    const deletionSnapshots = deletedClaims.map(([id, baseline]) => [id, baseline ? clonePlain(baseline) : null]);
    const glSnapshot = clonePlain(masterGL || []);
    const employeeSnapshot = clonePlain(masterKaryawan || []);
    const glSignature = stableStringify(glSnapshot);
    const employeeSignature = stableStringify(employeeSnapshot);
    const glChanged = sessionRole === 'admin' && glSignature !== masterDataBaselines.gl;
    const employeeChanged = sessionRole === 'admin' && employeeSignature !== masterDataBaselines.karyawan;
    const masterTasks = [];
    if(glChanged) masterTasks.push({ key:'gl', data:glSnapshot, signature:glSignature });
    if(employeeChanged) masterTasks.push({ key:'karyawan', data:employeeSnapshot, signature:employeeSignature });
    const totalTasks = claimSnapshots.length + deletionSnapshots.length + masterTasks.length;
    if(totalTasks === 0) return false;

    const progressId = startGlobalDataProgress('Memperbarui cloud', `0 dari ${totalTasks} perubahan terkirim...`);
    setCloudSyncState('syncing', 'Menyinkronkan...');
    let completedTasks = 0;
    const tick = () => {
        completedTasks++;
        updateGlobalDataProgress(
            progressId,
            (completedTasks / totalTasks) * 100,
            'Memperbarui cloud',
            `${completedTasks} dari ${totalTasks} perubahan sudah diproses...`
        );
    };

    const syncErrors = [
        ...await runWithConcurrency(claimSnapshots, claim => saveOneClaimWithVersion(claim), 4, tick),
        ...await runWithConcurrency(deletionSnapshots, ([id, baseline]) => deleteOneClaimWithVersion(id, baseline), 4, tick),
        ...await runWithConcurrency(masterTasks, async task => {
            await window.fbSetDoc(window.fbDoc(window.firebaseDb, 'appData', task.key), { data: task.data });
            if(task.key === 'gl' && stableStringify(masterGL || []) === task.signature) masterDataBaselines.gl = task.signature;
            if(task.key === 'karyawan' && stableStringify(masterKaryawan || []) === task.signature) masterDataBaselines.karyawan = task.signature;
        }, 2, tick)
    ];

    if(syncErrors.length) {
        const aggregateError = syncErrors[0];
        aggregateError.syncErrors = syncErrors;
        const conflictErrors = syncErrors.filter(error => error && error.code === 'claim-conflict');
        if(conflictErrors.length) await window.restoreClaimsAfterConflict(aggregateError);
        const nonConflictErrors = syncErrors.filter(error => !error || error.code !== 'claim-conflict');
        const retryableCodes = new Set(['aborted', 'cancelled', 'deadline-exceeded', 'internal', 'resource-exhausted', 'unavailable', 'unknown']);
        const retryableErrors = nonConflictErrors.filter(error => !error || !error.code || retryableCodes.has(String(error.code)));
        const permanentErrors = nonConflictErrors.filter(error => error && error.code && !retryableCodes.has(String(error.code)));
        if(permanentErrors.length) {
            cloudRetryAttempt = 0;
            cloudSyncAutoRetryBlocked = true;
            console.error('[Firebase] Sinkronisasi ditolak dan tidak akan diulang otomatis:', permanentErrors[0]);
            setCloudSyncState('error', 'Sync perlu diperiksa');
            failGlobalDataProgress(progressId, (completedTasks / totalTasks) * 100, 'Cloud menolak pembaruan', 'Data lokal aman · periksa akses/rules, lalu tekan Sync untuk mencoba kembali.');
            // Penolakan permanen menghentikan percobaan ulang otomatis. Tanpa
            // pemberitahuan, perubahan terlihat berhasil di layar padahal cloud
            // masih menyimpan versi lama, jadi kegagalannya diberitahukan.
            const shapeIssue = permanentErrors.map(error => error && error.claimShapeDiagnostic).find(Boolean);
            if(shapeIssue && shapeIssue.unwritable) {
                showToast(`Claim ${shapeIssue.noPR} tidak dapat diperbarui: ${shapeIssue.unwritable}. Dokumen ini perlu diperbaiki langsung di Firestore.`, 'error');
            } else if(shapeIssue && shapeIssue.repairedFields && shapeIssue.repairedFields.length) {
                showToast(`Claim ${shapeIssue.noPR} tersimpan dengan format lama pada ${shapeIssue.repairedFields.join(', ')}. Perubahan ditolak cloud; deploy firestore.rules versi terbaru agar perbaikan format diizinkan.`, 'error');
            } else {
                showToast(`${permanentErrors.length} perubahan ditolak cloud dan belum tersimpan. Data lokal aman; tekan Sinkronkan untuk mencoba lagi.`, 'error');
            }
            return false;
        }
        if(retryableErrors.length) {
            cloudRetryAttempt++;
            const retryDelay = Math.min(30000, 1500 * Math.pow(2, Math.min(cloudRetryAttempt - 1, 4)));
            console.error('[Firebase] Sinkronisasi latar gagal; antrean lokal dipertahankan:', retryableErrors[0]);
            setCloudSyncState('error', 'Sync tertunda');
            failGlobalDataProgress(progressId, (completedTasks / totalTasks) * 100, 'Cloud belum lengkap', `Data lokal aman · dicoba lagi otomatis dalam ${Math.ceil(retryDelay / 1000)} detik.`);
            schedulePendingClaimSync(retryDelay);
            return false;
        }
        cloudRetryAttempt = 0;
        failGlobalDataProgress(progressId, 100, 'Konflik data diselesaikan', 'Versi cloud terbaru dipertahankan. Silakan periksa klaim yang diberi tahu.');
        return false;
    }

    cloudRetryAttempt = 0;
    persistClaimSyncState();
    const finishedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const previousLocalMs = Number(window.lastSavePerformance && window.lastSavePerformance.localMs) || 0;
    window.lastSavePerformance = {
        ...(window.lastSavePerformance || {}),
        cloudMs: Math.round(finishedAt - startedAt),
        totalMs: previousLocalMs + Math.round(finishedAt - startedAt),
        changedClaims: claimSnapshots.length,
        deletedClaims: deletionSnapshots.length
    };
    if(hasPendingCloudPersistence()) {
        updateGlobalDataProgress(progressId, 100, 'Update baru masuk antrean', 'Perubahan terbaru akan dikirim pada tahap berikutnya.', 'pending');
        schedulePendingClaimSync(40);
        return true;
    }
    const now = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    const syncEl = document.getElementById('db-last-sync');
    if(syncEl) syncEl.title = `Simpan lokal ${previousLocalMs} ms; cloud ${window.lastSavePerformance.cloudMs} ms; ${totalTasks} perubahan.`;
    setCloudSyncState('live', `${now} (Cloud)`);
    finishGlobalDataProgress(progressId, 'Semua perubahan sudah tersinkron', `${totalTasks} perubahan diterima cloud.`);
    return true;
}
window.flushPendingCloudSync = flushPendingCloudSync;
window.addEventListener('online', () => {
    if(hasPendingCloudPersistence()) schedulePendingClaimSync(0);
});

window.saveDataToLocal = function(options = null) {
    const task = claimPersistenceQueue.then(() => persistCurrentState(options));
    claimPersistenceQueue = task.catch(() => {});
    return task;
};

window.restoreClaimsAfterConflict = async function(error) {
    const errors = error && Array.isArray(error.syncErrors) ? error.syncErrors : [error];
    const conflicts = errors.filter(item => item && item.code === 'claim-conflict');
    if(!conflicts.length) return false;

    const refs = [];
    conflicts.forEach(conflict => {
        const id = String(conflict.claimId || '');
        if(!id) return;
        refs.push(id);
        const localIdx = dbRekap.findIndex(item => String(item.id) === id);
        dirtyClaimIds.delete(id);
        pendingClaimDeletions.delete(id);
        if(conflict.remoteDeleted) {
            if(localIdx >= 0) dbRekap.splice(localIdx, 1);
            claimBaseline.delete(id);
            return;
        }
        const remoteClaim = conflict.remoteClaim ? normalizeClaimRecord(conflict.remoteClaim) : claimBaseline.get(id);
        if(remoteClaim) {
            if(localIdx >= 0) dbRekap[localIdx] = clonePlain(remoteClaim);
            else dbRekap.push(clonePlain(remoteClaim));
            claimBaseline.set(id, clonePlain(remoteClaim));
        }
    });
    dbRekap.sort((a,b) => Number(a.id) - Number(b.id));
    await dbSyncClaimRows(refs);
    updateClaimCacheCount();
    persistClaimSyncState();
    setCloudSyncState('error', 'Konflik - versi cloud dipakai');
    refreshActiveViewSilently();
    customAlert(`Konflik terdeteksi pada ${refs.length} klaim.\n\nPengguna lain telah lebih dahulu mengubah data yang sama. Versi cloud terbaru dipertahankan agar tidak tertimpa. Silakan periksa kembali klaim terkait sebelum menyimpan ulang.`);
    return true;
};

function reconcileClaimSyncMarkersWithCache(items = dbRekap) {
    const currentMap = new Map((items || []).map(item => [String(item.id), item]));
    let changed = false;
    Array.from(dirtyClaimIds).forEach(id => {
        const current = currentMap.get(id);
        const baseline = claimBaseline.get(id);
        if(current && baseline && claimComparable(current) === claimComparable(baseline)) {
            dirtyClaimIds.delete(id);
            changed = true;
        }
    });
    Array.from(pendingClaimDeletions.keys()).forEach(id => {
        if(currentMap.has(id)) {
            pendingClaimDeletions.delete(id);
            changed = true;
        }
    });
    if(changed) persistClaimSyncState();
}
// ==========================================
//        INDEXEDDB CORE TRANSMISSION
// ==========================================
const DB_NAME = "OtsukaClaimDB";
const DB_VERSION = 2; // Versi dinaikkan untuk mengizinkan pembuatan tabel Backup

const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('claims')) db.createObjectStore('claims', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('gl')) db.createObjectStore('gl', { keyPath: 'gl' });
        if (!db.objectStoreNames.contains('karyawan')) db.createObjectStore('karyawan', { keyPath: 'nik' });
        if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'date' }); // TABEL BARU UNTUK BACKUP
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

async function dbSaveAll(store, dataArray) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        os.clear(); 
        dataArray.forEach(item => os.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAll(store) {
    const db = await dbPromise;
    return new Promise((resolve) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
    });
}

async function dbDelete(store, id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}    
// --- ENGINE UTILITY UNTUK EXCEL PASTE REKAP V2 ---
function parseExcelV2DateStr(dateStr) {
    if(dateStr === null || dateStr === undefined || String(dateStr).trim() === '') return null;
    let raw = String(dateStr).trim();

    // Excel serial date, contoh 46200.
    if(/^\d{5}(?:\.\d+)?$/.test(raw)) {
        let serial = Number(raw);
        if(!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
        let excelEpoch = new Date(Date.UTC(1899, 11, 30));
        let result = new Date(excelEpoch.getTime() + Math.floor(serial) * 86400000);
        if(Number.isNaN(result.getTime())) return null;
        return `${String(result.getUTCDate()).padStart(2,'0')}/${String(result.getUTCMonth()+1).padStart(2,'0')}/${result.getUTCFullYear()}`;
    }

    let iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if(iso) return buildValidatedDate(iso[3], iso[2], iso[1]);

    let parts = raw.toLowerCase().split(/[-/\s]+/).filter(Boolean);
    if(parts.length !== 3) return null;
    let months = {'jan':'01','feb':'02','mar':'03','apr':'04','mei':'05','may':'05','jun':'06','jul':'07','agu':'08','agt':'08','aug':'08','sep':'09','okt':'10','oct':'10','nov':'11','des':'12','dec':'12'};
    let monthPart = months[parts[1]] || (/^\d{1,2}$/.test(parts[1]) ? parts[1] : null);
    if(!monthPart) return null;
    let yearPart = parts[2];
    if(/^\d{2}$/.test(yearPart)) yearPart = `20${yearPart}`;
    if(!/^\d{4}$/.test(yearPart)) return null;
    return buildValidatedDate(parts[0], monthPart, yearPart);
}

async function dbPutMany(store, dataArray) {
    if(!Array.isArray(dataArray) || dataArray.length === 0) return;
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        dataArray.forEach(item => os.put(item));
        tx.oncomplete = () => {
            if(store === 'claims') reconcileClaimSyncMarkersWithCache(dataArray);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function dbDeleteMany(store, ids) {
    if(!Array.isArray(ids) || ids.length === 0) return;
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        ids.forEach(id => os.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Menyamakan cache lokal hanya untuk claim yang benar-benar disentuh.
// Penulisan penuh tetap dipakai satu kali saat bootstrap cache awal.
async function dbSyncClaimRows(ids, sourceRows = dbRekap) {
    const keys = new Set((ids || []).map(String));
    if(!keys.size) return;
    const rowsById = new Map((sourceRows || []).map(item => [String(item.id), item]));
    const upserts = [];
    const deletes = [];
    keys.forEach(id => {
        const row = rowsById.get(id);
        if(row) upserts.push(row);
        else deletes.push(id);
    });
    await Promise.all([dbPutMany('claims', upserts), dbDeleteMany('claims', deletes)]);
    updateClaimCacheCount();
}

function buildValidatedDate(day, month, year) {
    let d = Number(day), m = Number(month), y = Number(year);
    if(!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
    let date = new Date(y, m - 1, d);
    if(date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${String(y).padStart(4,'0')}`;
}

// Mesin Paste Excel V2
let dailyImportInProgress = false;

function setDailyImportStatus(message, state = '') {
    const status = document.getElementById('daily-import-status');
    if(!status) return;
    status.textContent = message || '';
    status.className = `daily-import-status${state ? ` is-${state}` : ''}`;
}

function dailyImportErrorText(errorRows, emptyPrefix = '') {
    const rows = (errorRows || []).slice(0, 10).map(message => String(message || ''));
    const remainder = errorRows.length > 10 ? '\n...dan lainnya' : '';
    return `${emptyPrefix}${rows.join('\n')}${remainder}`;
}

window.updateDailyRecapCounter = function() {
    const area = document.getElementById('excel-v2-area');
    const counter = document.getElementById('daily-recap-row-count');
    if(!area || !counter) return;
    const rows = String(area.value || '').split(/\r\n|\n|\r/).filter(row => row.trim()).length;
    counter.textContent = `${rows} baris siap dibaca`;
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(counter);
};

// Rekap Harian P6 FINAL: parsing terindeks, cache lokal dahulu, sinkronisasi delta menyusul.
async function processExcelV2Data() {
    if(!requireClaimEditor()) return;
    if(dailyImportInProgress) return showToast('Impor sebelumnya masih sedang diproses.', 'info');
    const input = document.getElementById('excel-v2-area');
    const button = document.getElementById('btn-process-excel-v2');
    const txt = input.value.trim();
    if(!txt) return showToast('Area input masih kosong. Silakan tempel data Excel terlebih dahulu.', 'error');

    dailyImportInProgress = true;
    if(button) { button.disabled = true; button.innerText = '⏳ Membaca Data...'; }
    setDailyImportStatus('Memvalidasi data...', 'working');
    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const previousClaimLength = dbRekap.length;
    const previousGlLength = masterGL.length;

    try {
        const rows = txt.split(/\r\n|\n|\r/);
        let skippedCount = 0;
        const errorRows = [];
        const newClaims = [];
        const existingRefs = new Set();
        const existingIds = new Set(dbRekap.map(item => String(item.id)));
        const employeeByNik = new Map(masterKaryawan.map(employee => [String(employee.nik || '').trim(), employee]));
        const knownGlTypes = new Set(masterGL.map(item => String(item.tipe || '').trim().toLowerCase()).filter(Boolean));
        dbRekap.forEach(item => {
            if(item.extNo) existingRefs.add(String(item.extNo).trim());
            if(item.noPR) existingRefs.add(String(item.noPR).trim());
        });

        const timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
        const tglProses = getTodayString();
        const createdBaseMs = Date.now();
        let nextId = createdBaseMs;

        rows.forEach((rowStr, idx) => {
            if(!rowStr.trim()) return;
            const cols = rowStr.split('\t');
            if(cols.length < 8) {
                errorRows.push(`Baris ${idx + 1}: hanya ${cols.length} kolom, minimal 8 kolom`);
                return;
            }

            const extNo = cols[0] ? cols[0].trim() : '';
            if(!extNo) { errorRows.push(`Baris ${idx + 1}: nomor pengajuan kosong`); return; }
            if(existingRefs.has(extNo)) { skippedCount++; return; }

            const rawSubDate = cols[1] ? cols[1].trim() : '';
            const tipe = cols[2] ? toTitleCase(cols[2].trim()) : 'Operasional';
            const cleanNik = cols[3] ? cols[3].trim() : '';
            let nama = cols[4] ? toTitleCase(cols[4].trim()) : 'No Name';
            const departemen = cols[5] ? cols[5].trim() : '';
            const rawAmount = cols[7] ? cols[7].trim() : '0';
            if(!cleanNik) { errorRows.push(`Baris ${idx + 1}: NIK kosong`); return; }

            const employee = employeeByNik.get(cleanNik);
            let entitas = 'AIO';
            if(employee) { nama = employee.nama; entitas = employee.entitas || 'AIO'; }

            const currRaw = cols[6] ? cols[6].trim().toUpperCase() : 'IDR';
            const curr = normalizeCurrency(currRaw);
            if(!/^[A-Z]{3}$/.test(currRaw) || curr !== currRaw) {
                errorRows.push(`Baris ${idx + 1}: mata uang '${currRaw || '-'}' tidak valid`);
                return;
            }
            const totalHeader = parseCurrencyAmount(rawAmount, curr);
            if(!(totalHeader > 0)) { errorRows.push(`Baris ${idx + 1}: nominal '${rawAmount}' tidak valid`); return; }

            let tglSubmit = parseExcelV2DateStr(rawSubDate);
            if(!tglSubmit) { errorRows.push(`Baris ${idx + 1}: tanggal '${rawSubDate || '-'}' tidak valid`); return; }
            if(parseDateString(tglSubmit) > parseDateString(tglProses)) {
                errorRows.push(`Baris ${idx + 1}: tanggal submit melewati hari proses`);
                return;
            }
            const rawDueDate = cols[8] ? cols[8].trim() : '';
            const dueDate = rawDueDate ? parseExcelV2DateStr(rawDueDate) : '';
            if(rawDueDate && !dueDate) { errorRows.push(`Baris ${idx + 1}: due date '${rawDueDate}' tidak valid`); return; }

            const glKey = tipe.toLowerCase();
            if(tipe && !knownGlTypes.has(glKey)) {
                knownGlTypes.add(glKey);
                masterGL.push({ tipe, gl: 'Auto Imported' });
            }
            while(existingIds.has(String(nextId))) nextId++;
            const claimId = nextId++;
            existingIds.add(String(claimId));
            existingRefs.add(extNo);
            const createdAtMs = createdBaseMs + idx;
            newClaims.push({
                id: claimId, extNo, nama, nik: cleanNik, entitas, tipe, mataUang: curr,
                statusClaim: 'In Process', tglProses, tglSubmit, docNo: '', noPR: extNo,
                departemen, dueDate: dueDate || rawDueDate, totalHeader, isBalanced: true, lines: [], inputBy: sessionUser, isQuick: true, quickNote: '', isArchived: false,
                createdAtMs, updatedAtMs: createdAtMs, workflowTimestamps: { processStartedAt: createdAtMs }, _version: 0,
                historyLog: [{status: 'In Process (Impor Otomatis Sistem)', time: timeNow, by: sessionUser}]
            });
        });

        const importedCount = newClaims.length;
        if(importedCount === 0) {
            masterGL.splice(previousGlLength);
            setDailyImportStatus('', '');
            if(skippedCount > 0 && errorRows.length === 0) {
                showToast(`Gagal memproses. Seluruh ${skippedCount} data tersebut sudah terdaftar di sistem.`, 'info');
            } else if(errorRows.length > 0) {
                customAlert(dailyImportErrorText(errorRows, 'Tidak ada data valid.\n'));
            } else {
                showToast('Format matriks data tidak sesuai. Mohon periksa kembali.', 'error');
            }
            return;
        }

        dbRekap.push(...newClaims);
        setDailyImportStatus(`Menyimpan ${importedCount} data ke cache lokal...`, 'working');
        try {
            await Promise.all([
                dbPutMany('claims', newClaims),
                masterGL.length !== previousGlLength ? dbSaveAll('gl', masterGL) : Promise.resolve()
            ]);
            newClaims.forEach(claim => locallyCachedClaimIds.add(String(claim.id)));
            if(masterGL.length !== previousGlLength) locallyCachedMasterKeys.add('gl');
        } catch(error) {
            dbRekap.splice(previousClaimLength);
            masterGL.splice(previousGlLength);
            await dbDeleteMany('claims', newClaims.map(claim => claim.id)).catch(() => {});
            newClaims.forEach(claim => locallyCachedClaimIds.delete(String(claim.id)));
            locallyCachedMasterKeys.delete('gl');
            setDailyImportStatus('Cache lokal gagal disimpan.', 'warning');
            throw error;
        }

        input.value = '';
        if(typeof window.updateDailyRecapCounter === 'function') window.updateDailyRecapCounter();
        if(typeof rekapCurrentPage !== 'undefined') rekapCurrentPage = 1;
        changeMenu('claim-rekap');
        schedulePostSaveMaintenance();
        const visibleAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        window.lastDailyImportPerformance = {
            rows: rows.length,
            imported: importedCount,
            skipped: skippedCount,
            invalid: errorRows.length,
            visibleMs: Math.round(visibleAt - startedAt),
            cloudMs: null
        };

        let msg = `${importedCount} data baru sudah tampil di Rekapitulasi.`;
        if(skippedCount > 0) msg += ` ${skippedCount} duplikat dilewati.`;
        if(errorRows.length > 0) msg += ` ${errorRows.length} baris invalid tidak diimpor.`;
        showToast(`${msg} Sinkronisasi cloud berjalan.`, 'success');
        setDailyImportStatus(`${importedCount} data tampil · sinkronisasi cloud...`, 'working');
        if(errorRows.length > 0) customAlert(dailyImportErrorText(errorRows, 'Baris yang tidak diimpor:\n'));

        saveDataToLocal({ claimIds: newClaims.map(claim => claim.id) }).then(() => {
            setDailyImportStatus(`${importedCount} data aman di perangkat · sinkronisasi cloud berjalan.`, 'success');
            logActivity(sessionUser, `Impor Rekap Harian: ${importedCount} berhasil, ${skippedCount} dilewati`).catch(() => {});
        }).catch(error => {
            console.error('[Import Rekap Harian] Gagal menyiapkan antrean sinkronisasi:', error);
            setDailyImportStatus('Data claim aman di cache · master lokal perlu diperiksa.', 'warning');
        });
    } catch(error) {
        console.error('[Import Rekap Harian] Gagal:', error);
        showToast('Impor gagal disimpan. Data tidak dimasukkan ke Rekapitulasi.', 'error');
    } finally {
        dailyImportInProgress = false;
        if(button) { button.disabled = false; button.innerText = '⚡ Proses & Masuk Rekapitulasi'; }
    }
}

// ==========================================================
// LOGIKA CENTANG MEMORI (TOGGLE ALL LINTAS HALAMAN & FILTER)
// ==========================================================

// 1. Inisialisasi Keranjang Memori
window.globalSelections = {
    'rekap': new Set(),
    'history': new Set(),
    'waiting': new Set(),
    'revise-active': new Set(),
    'revise-arsip': new Set()
};

// 2. TANGKAP: Kalau user nyentang manual satu-satu
document.addEventListener('change', function(e) {
    let className = e.target.className;
    if(typeof className === 'string' && className.includes('-checkbox')) {
        let module = className.replace('-checkbox', '');
        if(window.globalSelections[module]) {
            let id = parseInt(e.target.getAttribute('data-id'));
            if(e.target.checked) {
                window.globalSelections[module].add(id);
            } else {
                window.globalSelections[module].delete(id);
                // Matikan master centang di header kalau ada 1 yang batal
                let master = document.querySelector(`thead input[onclick*="${className}"]`);
                if(master) master.checked = false;
            }
        }
    }
});

// 3. MATA-MATA (OBSERVER): Auto-centang saat user pindah halaman (Pagination)
const tableObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if(node.nodeType === 1) { 
                    node.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        let className = cb.className;
                        if(typeof className === 'string' && className.includes('-checkbox')) {
                            let module = className.replace('-checkbox', '');
                            if(window.globalSelections[module]) {
                                let id = parseInt(cb.getAttribute('data-id'));
                                // Kalau ID-nya ada di keranjang, paksa centang nyala
                                if(window.globalSelections[module].has(id)) cb.checked = true;
                            }
                        }
                    });
                }
            });
        }
    });
});

// Tempelkan mata-mata ke semua tabel di modul utama
['tbody-main-rekap', 'tbody-history-table', 'tbody-main-waiting', 'tbody-revise-active-list', 'tbody-revise-arsip-list'].forEach(id => {
    let tbody = document.getElementById(id);
    if(tbody) tableObserver.observe(tbody, { childList: true });
});

// 5. Fungsi Aksi Massal (Bulk) membaca dari keranjang lintas halaman.
window.bulkPosted = function(source = 'rekap') {
    if(!requireClaimEditor()) return;
    let ids = typeof getScopedSelectedIds === 'function'
        ? getScopedSelectedIds(source)
        : (source === 'revise'
            ? [...Array.from(window.globalSelections['revise-active']), ...Array.from(window.globalSelections['revise-arsip'])]
            : Array.from(window.globalSelections[source] || []));
    
    if(ids.length === 0) return showToast('Pilih minimal satu data yang akan diubah menjadi Posted.', 'error');

    const invalidClaims = ids.map(id => dbRekap.find(item => item.id === id)).filter(Boolean)
        .map(item => ({ item, errors: validateClaimForCompletion(item) })).filter(result => result.errors.length > 0);
    if(invalidClaims.length > 0) {
        const details = invalidClaims.slice(0, 8).map(({item, errors}) => `${item.noPR || item.extNo || item.id}: ${errors[0]}`).join('\n');
        return customAlert(`${invalidClaims.length} data belum dapat diselesaikan. Perbaiki dahulu:\n\n${details}${invalidClaims.length > 8 ? '\n...dan lainnya' : ''}`);
    }
    
    // Kita panggil modal konfirmasi bawaan dan suntik UI kalender ke dalamnya
    let confirmModal = document.getElementById('custom-confirm');
    document.getElementById('confirm-msg').innerHTML = `Terdapat <b>${ids.length} data</b> yang siap di post.<br><br>
    <div style="text-align:left; font-size:12px; font-weight:bold; color:#0050A0; margin-bottom:5px;">📅 Set Tanggal (Opsional):</div>
    <input type="text" id="bulk-rtp-date" placeholder="Biarkan kosong untuk Live Time (Saat Ini)" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; text-align:center; font-weight:bold; background:#eef4fc; color:#0050A0; cursor:pointer;">`;

    // Aktifkan Flatpickr pada input yang baru disuntikkan
    setTimeout(() => {
        window.ensureWorksheetCalendar("#bulk-rtp-date", { enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true });
    }, 50);

    // Sambungkan modal konfirmasi ke eksekusi Bulk Post.
    confirmAction = async () => {
        let customDateVal = document.getElementById('bulk-rtp-date').value;
        // Jika ada input kalender, pakai itu. Jika kosong, pakai waktu live.
        let actionDate = customDateVal ? new Date(customDateVal.replace(' ', 'T')) : new Date();
        if(Number.isNaN(actionDate.getTime())) return showToast('Tanggal atau jam perubahan massal ke Posted tidak valid.', 'error');

        let count = 0;
        const postedIds = [];
        let timeNowHistory = actionDate.toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
        let timeNowRTP = actionDate.toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

        ids.forEach(id => {
            let index = dbRekap.findIndex(i => i.id === id);
            if(index !== -1 && !isClaimFinanciallyLocked(dbRekap[index])) {
                dbRekap[index].statusClaim = 'Posted'; 
                dbRekap[index].postedAt = timeNowRTP; 
                dbRekap[index].postedBy = sessionUser; 
                dbRekap[index].isArchived = true;
                if(!dbRekap[index].workflowTimestamps) dbRekap[index].workflowTimestamps = {};
                dbRekap[index].workflowTimestamps.completedAt = actionDate.getTime();
                if(!dbRekap[index].historyLog) dbRekap[index].historyLog = []; 
                dbRekap[index].historyLog.push({status: "Posted", time: timeNowHistory, by: sessionUser});
                postedIds.push(id);
                count++;
            }
        });
        
        if(count > 0) { 
            // Kosongkan keranjang checklist
            if (source === 'revise') { window.globalSelections['revise-active'].clear(); window.globalSelections['revise-arsip'].clear(); }
            else { window.globalSelections[source].clear(); }
            document.querySelectorAll(`thead input[type="checkbox"]`).forEach(cb => cb.checked = false);
            
            try { await saveDataToLocal({ claimIds: postedIds }); }
            catch(error) {
                if(await window.restoreClaimsAfterConflict(error)) return;
                return showToast('Perubahan status massal gagal disimpan pada perangkat.', 'error');
            }
            logActivity(sessionUser, `Perubahan Massal ke Posted dari Modul ${source}: ${count} data`);
            refreshActiveViewSilently(); showRTPAnimation(); 
        } else { 
            showToast('Tidak ada data terpilih yang dapat diubah menjadi Posted.', 'info'); 
        }
    };

    // Munculkan Modal
    confirmModal.style.display = 'flex';
    setTimeout(() => {
        let btnBatal = confirmModal.querySelector('.btn-secondary');
        if (btnBatal) btnBatal.focus(); // Cegah double-enter accident
    }, 100);
};

window.bulkReverse = function() {
    if(!requireAdmin()) return;
    let selectedIds = typeof getScopedSelectedIds === 'function' ? getScopedSelectedIds('history') : Array.from(window.globalSelections['history']);
    let ids = selectedIds.filter(id => dbRekap.some(item => item.id === id && item.statusClaim === 'Posted'));
    if(ids.length === 0) return showToast('Pembatalan massal hanya berlaku untuk status Posted. Paid/Hold wajib dikoreksi satu per satu dengan alasan audit.', 'error');
    
    customConfirm(`Apakah Anda yakin ingin membatalkan status Posted pada ${ids.length} data dan mengembalikannya ke In Process?`, async () => {
        const backup = clonePlain(dbRekap);
        let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
        ids.forEach(id => {
            let index = dbRekap.findIndex(i => i.id === id);
            if(index !== -1) {
                const targetStatus = 'In Process';
                dbRekap[index].statusClaim = targetStatus;
                delete dbRekap[index].postedAt; delete dbRekap[index].postedBy; dbRekap[index].isArchived = false;
                if(dbRekap[index].workflowTimestamps) delete dbRekap[index].workflowTimestamps.completedAt;
                dbRekap[index].reviseStep = null; dbRekap[index].reviseTime = null; dbRekap[index].reviseTimestamp = null; dbRekap[index].reviseNote = null;
                if(!dbRekap[index].historyLog) dbRekap[index].historyLog = []; 
                dbRekap[index].historyLog.push({status: `Reversed to ${targetStatus}`, time: timeNow, by: sessionUser});
            }
        });
        try { await saveDataToLocal({ claimIds: ids }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            dbRekap = backup; await dbSyncClaimRows(ids).catch(() => {});
            return showToast('Pembatalan massal gagal disimpan pada perangkat; data telah dikembalikan.', 'error');
        }
        logActivity(sessionUser, `Pembatalan Massal Status Posted: ${ids.length} data`);
        window.globalSelections['history'].clear();
        document.querySelectorAll(`thead input[type="checkbox"]`).forEach(cb => cb.checked = false);
        renderHistoryTable(); renderRekapTable(); renderReviseConfirm(); showToast('Status Posted pada data terpilih berhasil dibatalkan.', 'success');
    });
};

window.bulkDelete = function(modulSource) {
    if(!requireAdmin()) return;
    let ids = typeof getScopedSelectedIds === 'function' ? getScopedSelectedIds(modulSource) : Array.from(window.globalSelections[modulSource] || []);
    if(ids.length === 0) return showToast('Pilih minimal satu data untuk dihapus.', 'error');
    
    customConfirm(`Apakah Anda yakin ingin menghapus ${ids.length} data yang dipilih secara permanen?`, async () => {
        const backup = clonePlain(dbRekap);
        dbRekap = dbRekap.filter(i => !ids.includes(i.id));
        try { await saveDataToLocal({ claimIds: ids }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            dbRekap = backup; await dbSyncClaimRows(ids).catch(() => {});
            return showToast('Penghapusan massal gagal disimpan lokal; data dikembalikan.', 'error');
        }
        logActivity(sessionUser, `Penghapusan Massal Data Terpilih pada ${modulSource} (${ids.length} data)`);
        window.globalSelections[modulSource].clear();
        document.querySelectorAll(`thead input[type="checkbox"]`).forEach(cb => cb.checked = false);
        if(modulSource === 'rekap') renderRekapTable();
        if(modulSource === 'history') renderHistoryTable();
        if(modulSource === 'waiting' && typeof window.renderWaitingTable === 'function') window.renderWaitingTable();
        showToast('Data yang dipilih berhasil dihapus.', 'success');
    });
};

window.bulkDeleteRevise = function() {
    if(!requireAdmin()) return;
    let ids = typeof getScopedSelectedIds === 'function'
        ? getScopedSelectedIds('revise')
        : [...Array.from(window.globalSelections['revise-active']), ...Array.from(window.globalSelections['revise-arsip'])];
    if(ids.length === 0) return showToast('Pilih minimal satu data revisi untuk dihapus.', 'error');
    
    customConfirm(`Apakah Anda yakin ingin menghapus ${ids.length} data revisi/konfirmasi yang dipilih secara permanen dari database?`, async () => {
        const backup = clonePlain(dbRekap);
        dbRekap = dbRekap.filter(i => !ids.includes(i.id));
        try { await saveDataToLocal({ claimIds: ids }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            dbRekap = backup; await dbSyncClaimRows(ids).catch(() => {});
            return showToast('Penghapusan massal gagal disimpan lokal; data dikembalikan.', 'error');
        }
        logActivity(sessionUser, `Penghapusan Massal Data Terpilih pada Modul Revisi (${ids.length} data)`);
        window.globalSelections['revise-active'].clear();
        window.globalSelections['revise-arsip'].clear();
        document.querySelectorAll(`thead input[type="checkbox"]`).forEach(cb => cb.checked = false);
        renderReviseConfirm(); 
        showToast(`${ids.length} data yang dipilih berhasil dihapus.`, 'success');
    });
};

// ==========================================================
// ANALISIS FAKTOR KETERLAMBATAN SLA
// ==========================================================

function renderSlaDelayInsight(type, label, extraLabel) {
    // Bersihkan analisis sebelumnya.
    let oldInsight = document.getElementById('ai-insight-box');
    if (oldInsight) oldInsight.remove();

    // Tampilkan analisis hanya untuk kategori SLA kuning dan merah.
    if (type === 'sla' && !label.includes('Sangat Baik')) {
        let breakdownTableContainer = document.getElementById('tbody-breakdown').closest('.std-table').parentElement;
        
        const baseData = filterAnalyticsByRange(dbRekap, window.filterDatesStatistik);

        let filtered = baseData.filter(d => {
            const category = getSlaCategory(calculateSLADays(d));
            if (label.includes('Perhatian') && category.key === 'warning') return true;
            if (label.includes('Terlambat') && category.key === 'late') return true;
            return false;
        });

        if (filtered.length > 0) {
            let totalLama = filtered.length;
            let countRevisi = 0; let countLamaWaiting = 0; let countPureLama = 0;

            filtered.forEach(d => {
                // Faktor 1: riwayat revisi.
                let adaRevisi = d.historyLog && d.historyLog.some(l => l.status.toLowerCase().includes('revisi'));
                if (adaRevisi) countRevisi++;
                
                // Faktor 2: menunggu persetujuan selama dua hari atau lebih.
                let waitTime = 0;
                if (d.historyLog) {
                    let waitLog = d.historyLog.find(l => l.status.includes('Waiting Approval'));
                    let postLog = d.historyLog.find(l => l.status === 'Posted');
                    if (waitLog && postLog) {
                        let dWait = parseHistoryTime(waitLog.time); let dPost = parseHistoryTime(postLog.time);
                        waitTime = Math.floor((dPost - dWait) / (1000 * 60 * 60 * 24));
                    } else if (waitLog && !postLog) {
                        let dWait = parseHistoryTime(waitLog.time);
                        waitTime = Math.floor((Date.now() - dWait) / (1000 * 60 * 60 * 24));
                    }
                }
                if (waitTime >= 2) countLamaWaiting++; 
                
                // Faktor 3: durasi proses di luar revisi dan waktu persetujuan.
                if (!adaRevisi && waitTime < 2) countPureLama++;
            });

            let pctRevisi = Math.round((countRevisi / totalLama) * 100);
            let pctWaiting = Math.round((countLamaWaiting / totalLama) * 100);
            let pctPure = Math.round((countPureLama / totalLama) * 100);

            // Susun kesimpulan analitik.
            let analisaTeks = `Mendeteksi <b>${totalLama} dokumen</b> di kategori ini. `;
            if (pctRevisi > pctWaiting && pctRevisi > pctPure) analisaTeks += `🚨 <b>Faktor Dominan:</b> Tingginya frekuensi dokumen yang memerlukan revisi.`;
            else if (pctWaiting > pctRevisi && pctWaiting > pctPure) analisaTeks += `⏳ <b>Faktor Dominan:</b> Lamanya proses persetujuan.`;
            else analisaTeks += `⚙️ <b>Faktor Dominan:</b> Lamanya durasi pemrosesan dokumen.`;

            // Cetak Banner UI
            let insightHtml = `
            <div id="ai-insight-box" style="margin: 0 20px 15px 20px; background:linear-gradient(135deg, #fff9e6, #fff3cd); border:1px solid #ffeeba; border-left:5px solid #d39e00; padding:15px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.05); animation: fadeIn 0.4s ease;">
                <div style="font-size:14px; color:#856404; margin-bottom:10px;"><b>📊 Analisis:</b> ${analisaTeks}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #ffeeba; flex:1; min-width:120px; text-align:center;">
                        <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold;">Akibat Revisi</div>
                        <div style="font-size:22px; color:#dc3545; font-weight:900;">${pctRevisi}%</div>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #ffeeba; flex:1; min-width:120px; text-align:center;">
                        <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold;">Menunggu Persetujuan</div>
                        <div style="font-size:22px; color:#ff9800; font-weight:900;">${pctWaiting}%</div>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #ffeeba; flex:1; min-width:120px; text-align:center;">
                        <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold;">Durasi Proses</div>
                        <div style="font-size:22px; color:#0050A0; font-weight:900;">${pctPure}%</div>
                    </div>
                </div>
            </div>`;
            
            breakdownTableContainer.insertAdjacentHTML('beforebegin', insightHtml);
        }
    }
};

window.openModalAddAdjust = function() {
        if(!requireClaimEditor()) return;
        // Harus save data awal dulu supaya sistem punya landasan ID buat nyatet log
        if(!currentEditingId) {
            return showToast('Silakan simpan data sebagai Draft terlebih dahulu sebelum melakukan penyesuaian.', 'error');
        }
        const data = dbRekap.find(item => item.id === currentEditingId);
        if(!data || isClaimFinanciallyLocked(data)) return showToast('Data terkunci (Posted/Paid/Hold) bersifat baca-saja.', 'error');
        const currencyLabel = document.getElementById('adj-currency-label');
        if(currencyLabel) currencyLabel.innerText = getClaimCurrency(data);
        document.getElementById('adj-nominal').value = '';
        document.getElementById('adj-alasan').value = '';
        document.getElementById('modal-add-adjust').style.display = 'flex';
    };

   window.executeAddAdjust = async function() {
        if(!requireClaimEditor()) return;
        if(window.adjustmentSaveInProgress) return showToast('Penyesuaian sebelumnya masih dalam proses penyimpanan.', 'info');
        let index = dbRekap.findIndex(i => i.id === currentEditingId);
        if (index === -1) return;
        let data = dbRekap[index];
        if(isClaimFinanciallyLocked(data)) return showToast('Data terkunci (Posted/Paid/Hold) bersifat baca-saja.', 'error');
        let currency = getClaimCurrency(data);
        let nominal = parseCurrencyAmount(document.getElementById('adj-nominal').value, currency);
        let tipe = document.getElementById('adj-tipe').value;
        let alasan = document.getElementById('adj-alasan').value.trim();

        if (nominal <= 0 || !alasan) {
            return showToast('Nominal dan alasan wajib diisi.', 'error');
        }

        let oldTotal = data.totalHeader;
        let realNominal = tipe === 'minus' ? -Math.abs(nominal) : Math.abs(nominal);
        let newTotal = oldTotal + realNominal;
        if(newTotal <= 0) return showToast('Penyesuaian menyebabkan total header bernilai nol atau negatif sehingga tidak dapat disimpan.', 'error');

        let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});

        // 1. Simpan ke database memory (Hanya ke array adjustments)
        if(!data.adjustments) data.adjustments = [];
        const adjustmentId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const manualLineId = data.isQuick ? null : `adjustment-${adjustmentId}`;
        data.adjustments.push({
            adjustmentId,
            type: 'Manual',
            lineId: manualLineId,
            row: '-',
            gl: 'Multiple Adjustment',
            oldVal: oldTotal,
            newVal: newTotal,
            currency,
            date: timeNow,
            by: sessionUser,
            note: alasan
        });

        data.totalHeader = newTotal;
        
// --- 2. UPDATE UI LAYAR BELAKANG SECARA DIAM-DIAM (SILENT) ---
        if(data.isQuick) {
            let elQkAmt = document.getElementById('qk-amount');
            if(elQkAmt) elQkAmt.value = formatEditableAmountValue(newTotal, currency);
            
            // FIX: Paksa munculkan tombol history (kuning) kalau sebelumnya masih ngumpet
            let btnQkView = document.getElementById('btn-qk-view-adjust');
            if(btnQkView) btnQkView.style.display = 'inline-block';
            
            let badge = document.getElementById('qk-adjust-badge');
            if(badge) badge.innerText = data.adjustments.length;
        } else {
            // Update angka total header UI
            let elHdrAmt = document.getElementById('hdr-amount-total');
            if(elHdrAmt) elHdrAmt.value = formatEditableAmountValue(newTotal, currency);
            
            // FIX: Paksa munculkan tombol history (kuning) di form standard
            let btnView = document.getElementById('btn-view-adjust');
            if(btnView) btnView.style.display = 'inline-block';

            let badge = document.getElementById('adjust-badge');
            if(badge) badge.innerText = data.adjustments.length;
            
            // Generate line item baru otomatis di layar belakang
            if(!data.lines) data.lines = [];
            data.lines.push({ id: manualLineId, tgl: getTodayString(), gl: 'Adjustment System', amount: realNominal, note: alasan });

            let tbody = document.getElementById('tbody-line-items');
            if (tbody) {
                addNewLineRow(manualLineId);
                let lr = tbody.lastElementChild;
                lr.querySelector('.line-tgl').value = getTodayString(); 
                lr.querySelector('.line-gl').value = 'Adjustment System'; 
                lr.querySelector('.line-amount').value = formatEditableAmountValue(realNominal, currency); 
                let nInp = lr.querySelector('.line-note'); 
                if(nInp) { nInp.style.display='block'; nInp.value = alasan; }
                calculateBalance(); // Update status balance hijau/merah
            }
        }

        window.adjustmentSaveInProgress = true;
        try {
            await saveDataToLocal({ claimIds: [data.id] });
            window.adjustmentStayClaimId = data.id;
            logActivity(sessionUser, `Penyesuaian Berulang Klaim ID ${data.id} sebesar ${formatMoney(realNominal, currency)}`);
        } catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            return showToast('Penyesuaian gagal disimpan pada perangkat.', 'error');
        } finally {
            window.adjustmentSaveInProgress = false;
        }
        
        // --- 3. KOSONGKAN FORM UNTUK INPUT SELANJUTNYA & FOKUS KEMBALI ---
        document.getElementById('adj-nominal').value = '';
        document.getElementById('adj-alasan').value = '';
        document.getElementById('adj-nominal').focus();

        // Modal tetap terbuka, user tinggal ketik lagi atau tekan Esc
        showToast('Penyesuaian berhasil disimpan. Silakan lanjutkan input atau tekan Esc untuk menutup.', 'success');
    };

// --- ENGINE PRESET KALENDER STATISTIK ---
window.applyPresetStatistik = function(val) {
    const input = document.getElementById('filter-date-statistik');
    const fp = input && input._flatpickr;
    if (val === 'all_time') {
        window.filterDatesStatistik = [];
        if(fp) fp.clear(false);
        if (typeof renderStatistikData === 'function') renderStatistikData();
        return;
    }
    else if (val === 'custom') {
        if(fp) fp.open();
        return;
    }

    const range = getReportingPresetRange(val);
    if(!range) return;
    window.filterDatesStatistik = range;
    if(fp) fp.setDate(range, true);
    else if (typeof renderStatistikData === 'function') renderStatistikData();
};

// --- ENGINE EXECUTIVE SUMMARY DASHBOARD ---
window.applyPresetExec = function(val) {
    const input = document.getElementById('filter-date-exec');
    const fp = input && input._flatpickr;
    if (val === 'custom') { if(fp) fp.open(); return; }
    const range = getReportingPresetRange(val);
    if(!range) return;
    window.filterDatesExec = range;
    if(fp) fp.setDate(range, true);
    else if(typeof renderExecutiveDashboard === 'function') renderExecutiveDashboard();
};

// --- MESIN PORTAL DRILL-DOWN ---
window.executeDrillDown = function(targetMenu, statusFilterArr) {
    let execDates = window.filterDatesExec || [];
    let targetModule = targetMenu;
    if(targetMenu === 'claim-rekap') targetModule = 'rekap';
    if(targetMenu === 'claim-revise') targetModule = 'revise';
    if(targetMenu === 'waiting-approval') targetModule = 'waiting';
    if(targetMenu === 'history') targetModule = 'history';

    // 1. Tembak tanggal kalender modul tujuan agar sinkron dengan Exec
    if(targetModule === 'rekap') { window.filterDatesRekap = execDates; let f = document.getElementById('filter-date-rekap'); if(f && f._flatpickr) f._flatpickr.setDate(execDates, false); }
    if(targetModule === 'revise') { window.filterDatesRevisi = execDates; let f = document.getElementById('filter-revisi-statistik'); if(f && f._flatpickr) f._flatpickr.setDate(execDates, false); }
    if(targetModule === 'waiting') { window.filterDatesWaiting = execDates; let f = document.getElementById('filter-date-waiting'); if(f && f._flatpickr) f._flatpickr.setDate(execDates, false); }
    if(targetModule === 'history') { window.filterDatesHistory = execDates; let f = document.getElementById('filter-date-history'); if(f && f._flatpickr) f._flatpickr.setDate(execDates, false); }

    // 2. Suntikkan Filter Status
    tableFilters[targetModule] = {}; 
    if (statusFilterArr && statusFilterArr.length > 0) {
        tableFilters[targetModule]['statusClaim'] = statusFilterArr.map(s => s.toLowerCase());
    }

    // 3. Pindah Dimensi
    updateFilterIconHighlight(targetModule);
    changeMenu(targetMenu);
    showToast('Membuka rincian data berdasarkan urutan yang dipilih.', 'success');
};
// --- MESIN MODAL DETAIL EXECUTIVE ---
window.openExecSlaDetail = function(h, k, m, denum) {
    let pctH = denum > 0 ? Math.round((h/denum)*100) : 0;
    let pctK = denum > 0 ? Math.round((k/denum)*100) : 0;
    let pctM = denum > 0 ? Math.round((m/denum)*100) : 0;
    const pctAchieved = denum > 0 ? Math.round(((h + k) / denum) * 100) : 0;
    const companyTarget = Number(window.slaSettings.achievementTargetPercent) || 90;

    document.getElementById('exec-detail-title').innerText = '📊 Distribusi Pencapaian SLA';
    document.getElementById('exec-detail-body').innerHTML = `
        <div style="margin-bottom:15px; font-size:13px; color:#64748b; line-height:1.5;">Berikut adalah rincian kecepatan proses berdasarkan filter periode yang Anda pilih:</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:12px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
            <span style="color:#166534; font-weight:bold;">🟢 Sangat Baik (≤ ${window.slaSettings.greenMaxDays} Hari)</span> 
            <strong style="color:#15803d; font-size:16px;">${pctH}% <span style="font-size:11px; font-weight:normal; color:#166534;">(${h} Dokumen)</span></strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:12px; background:#fefce8; border-radius:8px; border:1px solid #fef08a;">
            <span style="color:#854d0e; font-weight:bold;">🟡 Perlu Perhatian (${window.slaSettings.greenMaxDays + 1}-${window.slaSettings.warningMaxDays} Hari)</span> 
            <strong style="color:#a16207; font-size:16px;">${pctK}% <span style="font-size:11px; font-weight:normal; color:#854d0e;">(${k} Dokumen)</span></strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:12px; background:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
            <span style="color:#991b1b; font-weight:bold;">🔴 Terlambat (> ${window.slaSettings.warningMaxDays} Hari)</span> 
            <strong style="color:#b91c1c; font-size:16px;">${pctM}% <span style="font-size:11px; font-weight:normal; color:#991b1b;">(${m} Dokumen)</span></strong>
        </div>
        <div style="padding:12px; background:#eef4fc; border-radius:8px; border:1px solid #cce0f5; color:#0050A0;"><strong>Pencapaian SLA: ${pctAchieved}%</strong><br><span>Target perusahaan: ${companyTarget}% — ${pctAchieved >= companyTarget ? 'Tercapai' : 'Belum tercapai'}.</span></div>
    `;
    let btn = document.getElementById('exec-detail-btn');
    btn.innerText = '📈 Lihat Grafik Analitik Penuh';
    btn.style.background = 'linear-gradient(135deg, #0050A0, #003d7a)';
    btn.onclick = function() { closeModal('modal-exec-detail'); changeMenu('statistik'); };
    const modal = document.getElementById('modal-exec-detail');
    modal.style.display = 'flex';
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(modal);
};

window.openExecRevDetail = function(rev, qty) {
    let pct = qty > 0 ? ((rev/qty)*100).toFixed(1) : 0;
    document.getElementById('exec-detail-title').innerText = '⚠️ Rasio Dokumen Revisi';
    document.getElementById('exec-detail-body').innerHTML = `
        <div style="margin-bottom:15px; font-size:13px; color:#64748b; line-height:1.5;">Perbandingan jumlah dokumen yang bermasalah terhadap total pengajuan di periode ini:</div>
        <div style="text-align:center; margin-bottom:20px; padding:15px; background:white; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
            <div style="font-size:42px; font-weight:900; color:#dc3545; line-height:1;">${pct}%</div>
            <div style="font-size:12px; color:#94a3b8; font-weight:bold; text-transform:uppercase; margin-top:5px;">Tingkat Kesalahan Dokumen</div>
        </div>
        <div style="display:flex; justify-content:space-between; padding:12px 10px; border-bottom:1px dashed #cbd5e1; color:#334155;">
            <span>Total Pengajuan Masuk:</span> <strong style="font-size:15px;">${qty} Dokumen</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding:12px 10px; color:#334155;">
            <span>Total Dokumen Direvisi:</span> <strong style="color:#dc3545; font-size:15px;">${rev} Dokumen</strong>
        </div>
    `;
    let btn = document.getElementById('exec-detail-btn');
    btn.innerText = '📂 Susur Data ke Halaman Revisi';
    btn.style.background = 'linear-gradient(135deg, #dc3545, #b02a37)';
    btn.onclick = function() { closeModal('modal-exec-detail'); executeDrillDown('claim-revise', ['Revisi', 'Confirm']); };
    const modal = document.getElementById('modal-exec-detail');
    modal.style.display = 'flex';
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(modal);
};

// --- UPDATE: FUNGSI EXPORT EXCEL (WITH SLA ROW) ---
window.exportExecutiveExcel = function() {
    let range = window.filterDatesExec;
    if (!range || range.length !== 2) return showToast('Pilih rentang tanggal terlebih dahulu.', 'error');
    
    const currentRange = normalizeReportingRange(range);
    const previousRange = getPreviousReportingRange(currentRange);
    if(!currentRange || !previousRange) return showToast('Rentang tanggal tidak valid.', 'error');
    const [cpStart, cpEnd] = currentRange;
    const [ppStart, ppEnd] = previousRange;
    const comparisonRanges = getManagementComparisonRanges();

    // Pastikan penampung ini juga ditambahkan SLA
    let cp = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let pp = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let mtd = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let lm = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let ly = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };

    dbRekap.forEach(d => {
        if(typeof isClaimActiveForAnalytics === 'function' && !isClaimActiveForAnalytics(d)) return;
        const dDate = reportingDateForClaim(d); if(!dDate) return;

        let isRev = d.statusClaim === 'Revisi' || d.statusClaim === 'Confirm' || (d.historyLog && d.historyLog.some(l => l.status.toLowerCase().includes('revisi'))) ? 1 : 0;
        let isPost = hasEverReachedPosted(d) ? 1 : 0;
        
        let sla = typeof calculateSLADays === 'function' ? calculateSLADays(d) : 0;
        let slaAchieved = getSlaCategory(sla).key === 'late' ? 0 : 1;
        
        if (isDateInReportingRange(dDate, currentRange)) { cp.qty++; addAmountToCurrencyMap(cp.amounts, d); cp.rev += isRev; cp.posted += isPost; cp.slaNum += slaAchieved; cp.slaDenum++; }
        else if (isDateInReportingRange(dDate, previousRange)) { pp.qty++; addAmountToCurrencyMap(pp.amounts, d); pp.rev += isRev; pp.posted += isPost; pp.slaNum += slaAchieved; pp.slaDenum++; }
        
        if (isDateInReportingRange(dDate, comparisonRanges.mtd)) { mtd.qty++; addAmountToCurrencyMap(mtd.amounts, d); mtd.rev += isRev; mtd.posted += isPost; mtd.slaNum += slaAchieved; mtd.slaDenum++; }
        if (isDateInReportingRange(dDate, comparisonRanges.lmtd)) { lm.qty++; addAmountToCurrencyMap(lm.amounts, d); lm.rev += isRev; lm.posted += isPost; lm.slaNum += slaAchieved; lm.slaDenum++; }
        if (isDateInReportingRange(dDate, comparisonRanges.sply)) { ly.qty++; addAmountToCurrencyMap(ly.amounts, d); ly.rev += isRev; ly.posted += isPost; ly.slaNum += slaAchieved; ly.slaDenum++; }
    });

    const calcPctStr = (c, p) => {
        if (p === 0) return c > 0 ? "100.0%" : "0.0%";
        let val = ((c - p) / p) * 100;
        return val.toFixed(1) + "%";
    };

    let slaCp = cp.slaDenum > 0 ? Math.round((cp.slaNum / cp.slaDenum) * 100) : 0;
    let slaPp = pp.slaDenum > 0 ? Math.round((pp.slaNum / pp.slaDenum) * 100) : 0;
    let slaMtd = mtd.slaDenum > 0 ? Math.round((mtd.slaNum / mtd.slaDenum) * 100) : 0;
    let slaLm = lm.slaDenum > 0 ? Math.round((lm.slaNum / lm.slaDenum) * 100) : 0;
    let slaLy = ly.slaDenum > 0 ? Math.round((ly.slaNum / ly.slaDenum) * 100) : 0;
    const companyTarget = Number(window.slaSettings.achievementTargetPercent) || 90;

    const currencies = [...new Set([...Object.keys(cp.amounts), ...Object.keys(pp.amounts), ...Object.keys(mtd.amounts), ...Object.keys(lm.amounts), ...Object.keys(ly.amounts)])].sort();
    const amountRows = currencies.map(currency => ({
        "Komponen Analisis": `Total Nilai Pengajuan (${currency})`,
        "Periode Aktif (CP)": cp.amounts[currency] || 0, "Periode Sebelumnya (PP)": pp.amounts[currency] || 0, "Pertumbuhan vs PP": calcPctStr(cp.amounts[currency] || 0, pp.amounts[currency] || 0),
        "MTD (Bulan Ini)": mtd.amounts[currency] || 0, "MTD Sebelumnya (PMTD)": lm.amounts[currency] || 0, "Pertumbuhan vs PMTD": calcPctStr(mtd.amounts[currency] || 0, lm.amounts[currency] || 0),
        "Periode Sama Tahun Lalu (SPLY)": ly.amounts[currency] || 0, "Pertumbuhan vs SPLY": calcPctStr(mtd.amounts[currency] || 0, ly.amounts[currency] || 0)
    }));

    let printData = [
        {
            "Komponen Analisis": "Total Volume Pengajuan (Dok)",
            "Periode Aktif (CP)": cp.qty, "Periode Sebelumnya (PP)": pp.qty, "Pertumbuhan vs PP": calcPctStr(cp.qty, pp.qty),
            "MTD (Bulan Ini)": mtd.qty, "MTD Sebelumnya (PMTD)": lm.qty, "Pertumbuhan vs PMTD": calcPctStr(mtd.qty, lm.qty),
            "Periode Sama Tahun Lalu (SPLY)": ly.qty, "Pertumbuhan vs SPLY": calcPctStr(mtd.qty, ly.qty)
        },
        ...amountRows,
        {
            "Komponen Analisis": "Total Dokumen Posted (Selesai)",
            "Periode Aktif (CP)": cp.posted, "Periode Sebelumnya (PP)": pp.posted, "Pertumbuhan vs PP": calcPctStr(cp.posted, pp.posted),
            "MTD (Bulan Ini)": mtd.posted, "MTD Sebelumnya (PMTD)": lm.posted, "Pertumbuhan vs PMTD": calcPctStr(mtd.posted, lm.posted),
            "Periode Sama Tahun Lalu (SPLY)": ly.posted, "Pertumbuhan vs SPLY": calcPctStr(mtd.posted, ly.posted)
        },
        {
            "Komponen Analisis": "Total Dokumen Direvisi",
            "Periode Aktif (CP)": cp.rev, "Periode Sebelumnya (PP)": pp.rev, "Pertumbuhan vs PP": calcPctStr(cp.rev, pp.rev),
            "MTD (Bulan Ini)": mtd.rev, "MTD Sebelumnya (PMTD)": lm.rev, "Pertumbuhan vs PMTD": calcPctStr(mtd.rev, lm.rev),
            "Periode Sama Tahun Lalu (SPLY)": ly.rev, "Pertumbuhan vs SPLY": calcPctStr(mtd.rev, ly.rev)
        },
        {
            "Komponen Analisis": `Pencapaian SLA (%) · Target ${companyTarget}%`,
            "Periode Aktif (CP)": slaCp + "%", "Periode Sebelumnya (PP)": slaPp + "%", "Pertumbuhan vs PP": calcPctStr(slaCp, slaPp),
            "MTD (Bulan Ini)": slaMtd + "%", "MTD Sebelumnya (PMTD)": slaLm + "%", "Pertumbuhan vs PMTD": calcPctStr(slaMtd, slaLm),
            "Periode Sama Tahun Lalu (SPLY)": slaLy + "%", "Pertumbuhan vs SPLY": calcPctStr(slaMtd, slaLy)
        }
    ];

    let ws = XLSX.utils.json_to_sheet(printData);
    ws['!cols'] = [{wch: 35}, {wch: 18}, {wch: 18}, {wch: 15}, {wch: 18}, {wch: 18}, {wch: 15}, {wch: 18}, {wch: 15}];
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ringkasan Eksekutif");
    XLSX.writeFile(wb, `Laporan_Ringkasan_Eksekutif_${new Date().toISOString().split('T')[0]}.xlsx`);
    logActivity(sessionUser, `Ekspor Ringkasan Eksekutif: ${cp.qty} klaim pada periode aktif`).catch(() => {});
    showToast('File Excel berhasil disiapkan.', 'success');
};
// --- UPDATE: ENGINE EXECUTIVE SUPREME (WITH SLA ROW) ---
window.renderExecutiveDashboard = function() {
    let container = document.getElementById('exec-dashboard-content');
    if(!container) return;

    let range = window.filterDatesExec;
    if (!range || range.length !== 2) return;
    
    const currentRange = normalizeReportingRange(range);
    const previousRange = getPreviousReportingRange(currentRange);
    if(!currentRange || !previousRange) return;
    const [cpStart, cpEnd] = currentRange;
    const [ppStart, ppEnd] = previousRange;
    const comparisonRanges = getManagementComparisonRanges();
    
    let ppLabel = `${ppStart.toLocaleDateString('id-ID')} - ${ppEnd.toLocaleDateString('id-ID')}`;

    let cp = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0, slaH:0, slaK:0, slaM:0 };
    let pp = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0, slaH:0, slaK:0, slaM:0 };
    
    // Tambahan penampung untuk SLA MTD, LM, LY
    let mtd = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let lm = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };
    let ly = { qty:0, amounts:{}, rev:0, posted:0, slaNum:0, slaDenum:0 };

    dbRekap.forEach(d => {
        if(typeof isClaimActiveForAnalytics === 'function' && !isClaimActiveForAnalytics(d)) return;
        const dDate = reportingDateForClaim(d); if(!dDate) return;

        let isRev = d.statusClaim === 'Revisi' || d.statusClaim === 'Confirm' || (d.historyLog && d.historyLog.some(l => l.status.toLowerCase().includes('revisi'))) ? 1 : 0;
        let isPost = hasEverReachedPosted(d) ? 1 : 0;
        
        let sla = typeof calculateSLADays === 'function' ? calculateSLADays(d) : 0;
        const slaCategory = getSlaCategory(sla);
        let slaAchieved = slaCategory.key === 'late' ? 0 : 1;
        let isH = slaCategory.key === 'green' ? 1 : 0; let isK = slaCategory.key === 'warning' ? 1 : 0; let isM = slaCategory.key === 'late' ? 1 : 0;

        if (isDateInReportingRange(dDate, currentRange)) {
            cp.qty++; addAmountToCurrencyMap(cp.amounts, d); cp.rev += isRev; cp.posted += isPost;
            cp.slaNum += slaAchieved; cp.slaDenum++; cp.slaH += isH; cp.slaK += isK; cp.slaM += isM;
        } else if (isDateInReportingRange(dDate, previousRange)) {
            pp.qty++; addAmountToCurrencyMap(pp.amounts, d); pp.rev += isRev; pp.posted += isPost;
            pp.slaNum += slaAchieved; pp.slaDenum++;
        }
        
        if (isDateInReportingRange(dDate, comparisonRanges.mtd)) { mtd.qty++; addAmountToCurrencyMap(mtd.amounts, d); mtd.rev += isRev; mtd.posted += isPost; mtd.slaNum += slaAchieved; mtd.slaDenum++; }
        if (isDateInReportingRange(dDate, comparisonRanges.lmtd)) { lm.qty++; addAmountToCurrencyMap(lm.amounts, d); lm.rev += isRev; lm.posted += isPost; lm.slaNum += slaAchieved; lm.slaDenum++; }
        if (isDateInReportingRange(dDate, comparisonRanges.sply)) { ly.qty++; addAmountToCurrencyMap(ly.amounts, d); ly.rev += isRev; ly.posted += isPost; ly.slaNum += slaAchieved; ly.slaDenum++; }
    });

    const calcPct = (curr, past) => past === 0 ? (curr > 0 ? 100 : 0) : ((curr - past) / past) * 100;
    // Delta ditampilkan sebagai chip berwarna. isRevLogic membalik makna warna
    // karena kenaikan jumlah revisi adalah sinyal buruk, bukan baik.
    const formatPct = (pct, isRevLogic = false) => {
        if (pct > 0) return `<span class="exec-delta ${isRevLogic ? 'is-bad' : 'is-good'}">▲ ${pct.toFixed(1)}%</span>`;
        if (pct < 0) return `<span class="exec-delta ${isRevLogic ? 'is-good' : 'is-bad'}">▼ ${Math.abs(pct).toFixed(1)}%</span>`;
        return `<span class="exec-delta is-flat">▪ 0%</span>`;
    };

    // isPct memberi imbuhan "%" untuk baris SLA yang bukan nilai mata uang.
    const buildRow = (label, c, p, cmtd, clm, cly, currencyCode, isRevLogic, isPct = false) => {
        const format = (val) => currencyCode ? formatMoney(val, currencyCode) : (isPct ? `${val}%` : val.toLocaleString('id-ID'));
        return `
        <tr>
            <th scope="row" class="exec-row-label">${label}</th>
            <td class="exec-cell-primary">${format(c)}</td>
            <td class="exec-cell-muted">${format(p)}</td>
            <td class="exec-cell-delta">${formatPct(calcPct(c, p), isRevLogic)}</td>
            <td class="exec-cell-primary exec-group-start">${format(cmtd)}</td>
            <td class="exec-cell-muted">${format(clm)}</td>
            <td class="exec-cell-delta">${formatPct(calcPct(cmtd, clm), isRevLogic)}</td>
            <td class="exec-cell-muted exec-group-start">${format(cly)}</td>
            <td class="exec-cell-delta">${formatPct(calcPct(cmtd, cly), isRevLogic)}</td>
        </tr>`;
    };

    const currencies = [...new Set([...Object.keys(cp.amounts), ...Object.keys(pp.amounts), ...Object.keys(mtd.amounts), ...Object.keys(lm.amounts), ...Object.keys(ly.amounts)])].sort();
    const currencyRowsHtml = currencies.length ? currencies.map(currency => buildRow(
        `Total Nilai Pengajuan (${currency})`, cp.amounts[currency] || 0, pp.amounts[currency] || 0,
        mtd.amounts[currency] || 0, lm.amounts[currency] || 0, ly.amounts[currency] || 0, currency, false
    )).join('') : buildRow('Total Nilai Pengajuan', 0, 0, 0, 0, 0, 'IDR', false);

    let slaCp = cp.slaDenum > 0 ? Math.round((cp.slaNum / cp.slaDenum) * 100) : 0;
    let slaPp = pp.slaDenum > 0 ? Math.round((pp.slaNum / pp.slaDenum) * 100) : 0;
    let slaMtd = mtd.slaDenum > 0 ? Math.round((mtd.slaNum / mtd.slaDenum) * 100) : 0;
    let slaLm = lm.slaDenum > 0 ? Math.round((lm.slaNum / lm.slaDenum) * 100) : 0;
    let slaLy = ly.slaDenum > 0 ? Math.round((ly.slaNum / ly.slaDenum) * 100) : 0;
    
    const companyTarget = Number(window.slaSettings.achievementTargetPercent) || 90;
    let slaColor = slaCp >= companyTarget ? '#34d399' : '#f87171';
    let revRatioCp = cp.qty > 0 ? ((cp.rev / cp.qty) * 100).toFixed(1) : 0;
    let revRatioPp = pp.qty > 0 ? ((pp.rev / pp.qty) * 100).toFixed(1) : 0;

    container.innerHTML = `
        <div class="exec-period-strip">
            <span class="exec-period-icon" aria-hidden="true">📊</span>
            <div><strong>Periode Analisis Saat Ini (CP)</strong><span>${cpStart.toLocaleDateString('id-ID')} s/d ${cpEnd.toLocaleDateString('id-ID')}</span></div>
            <div class="exec-period-previous"><strong>Periode Sebelumnya (PP)</strong><span>${ppLabel}</span></div>
        </div>

        <section class="exec-kpi-grid" aria-label="Indikator utama manajemen">
            <article class="exec-kpi-card exec-kpi-volume" onclick="executeDrillDown('claim-rekap', [])" role="button" tabindex="0">
                <div class="exec-kpi-head"><span>Total Pengajuan</span><span class="exec-kpi-action" title="Klik untuk lihat data">🔍</span></div>
                <div class="exec-kpi-value">${cp.qty.toLocaleString('id-ID')} <small>Dok</small></div>
                <div class="exec-kpi-trend">${formatPct(calcPct(cp.qty, pp.qty), false)}<span>vs periode sebelumnya</span></div>
                <div class="exec-kpi-foot">Sebelumnya <strong>${pp.qty.toLocaleString('id-ID')} Dok</strong></div>
            </article>

            <article class="exec-kpi-card exec-kpi-amount" onclick="executeDrillDown('claim-rekap', [])" role="button" tabindex="0">
                <div class="exec-kpi-head"><span>Nilai Pengajuan</span><span class="exec-kpi-action" title="Klik untuk lihat data">🔍</span></div>
                <div class="exec-kpi-value exec-kpi-money">${formatCurrencyTotals(cp.amounts, true)}</div>
                <div class="exec-kpi-sub">Tidak dijumlahkan lintas mata uang.</div>
                <div class="exec-kpi-foot exec-kpi-foot-stack"><span>Sebelumnya</span><strong>${formatCurrencyTotals(pp.amounts, true)}</strong></div>
            </article>

            <article class="exec-kpi-card exec-kpi-posted" onclick="executeDrillDown('history', [])" role="button" tabindex="0">
                <div class="exec-kpi-head"><span>Dokumen Selesai (Posted)</span><span class="exec-kpi-action" title="Klik untuk lihat data">🔍</span></div>
                <div class="exec-kpi-value">${cp.posted.toLocaleString('id-ID')} <small>Dok</small></div>
                <div class="exec-kpi-trend">${formatPct(calcPct(cp.posted, pp.posted), false)}<span>vs periode sebelumnya</span></div>
                <div class="exec-kpi-foot">Sebelumnya <strong>${pp.posted.toLocaleString('id-ID')} Dok</strong></div>
            </article>
        </section>

        <section class="exec-insight-grid" aria-label="Insight SLA dan revisi">
            <article class="exec-insight-card exec-sla-card">
                <div class="exec-insight-watermark" aria-hidden="true">⏱️</div>
                <div class="exec-insight-head">
                    <div><span class="exec-insight-eyebrow">SERVICE LEVEL</span><h4>Pencapaian SLA (≤ ${window.slaSettings.warningMaxDays} Hari)</h4></div>
                    <button type="button" class="exec-detail-chip" onclick="openExecSlaDetail(${cp.slaH}, ${cp.slaK}, ${cp.slaM}, ${cp.slaDenum})">🔍 Buka Detail</button>
                </div>
                <div class="exec-insight-value" style="--exec-accent:${slaColor};">${slaCp}%</div>
                <div class="exec-target-line"><span>Target Perusahaan</span><strong>≥ ${companyTarget}%</strong></div>
                <div class="exec-insight-metrics"><div><span>Periode Sebelumnya (PP)</span><strong>${slaPp}%</strong></div><div><span>Tepat Waktu (CP)</span><strong>${cp.slaNum} / ${cp.slaDenum} dokumen</strong></div></div>
            </article>

            <article class="exec-insight-card exec-revision-card">
                <div class="exec-insight-watermark" aria-hidden="true">⚠️</div>
                <div class="exec-insight-head">
                    <div><span class="exec-insight-eyebrow">QUALITY SIGNAL</span><h4>Rasio Dokumen Bermasalah (Revisi)</h4></div>
                    <button type="button" class="exec-detail-chip" onclick="openExecRevDetail(${cp.rev}, ${cp.qty})">🔍 Buka Detail</button>
                </div>
                <div class="exec-insight-value" style="--exec-accent:#ff9aa6;">${revRatioCp}%</div>
                <div class="exec-insight-note">Semakin kecil nilainya, semakin baik.</div>
                <div class="exec-insight-metrics"><div><span>Periode Sebelumnya (PP)</span><strong>${revRatioPp}%</strong></div><div><span>Kasus Revisi (CP)</span><strong>${cp.rev} / ${cp.qty} dokumen</strong></div></div>
            </article>
        </section>

        <section class="exec-section-card exec-table-card">
            <div class="exec-section-head"><div><span class="exec-section-icon" aria-hidden="true">▤</span><div><h4>Ringkasan Tabel Perbandingan</h4><small>CP, PP, MTD, PMTD, dan periode sama tahun lalu</small></div></div><button class="btn exec-mini-export" onclick="exportExecutiveExcel()">↧ Unduh Excel</button></div>
            <p class="exec-table-hint"><span aria-hidden="true">↔</span> Geser tabel ke samping untuk melihat kolom MTD dan tahun lalu.</p>
            <div class="table-responsive exec-table-wrap">
                <table class="std-table exec-comparison-table">
                    <thead>
                        <tr class="exec-group-row">
                            <th scope="col" rowspan="2" class="exec-row-label-head">Komponen Analisis</th>
                            <th scope="colgroup" colspan="3">Periode Berjalan</th>
                            <th scope="colgroup" colspan="3" class="exec-group-start">Month to Date</th>
                            <th scope="colgroup" colspan="2" class="exec-group-start">Tahun Lalu</th>
                        </tr>
                        <tr>
                            <th scope="col">Periode Aktif (CP)</th><th scope="col">Periode Sebelumnya (PP)</th><th scope="col">Pertumbuhan vs PP</th><th scope="col" class="exec-group-start">MTD (Bulan Ini)</th><th scope="col">MTD Sebelumnya (PMTD)</th><th scope="col">Pertumbuhan vs PMTD</th><th scope="col" class="exec-group-start">Periode Sama Tahun Lalu</th><th scope="col">Pertumbuhan vs SPLY</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buildRow('Total Volume Pengajuan (Dok)', cp.qty, pp.qty, mtd.qty, lm.qty, ly.qty, null, false)}
                        ${currencyRowsHtml}
                        ${buildRow('Total Dokumen Posted (Selesai)', cp.posted, pp.posted, mtd.posted, lm.posted, ly.posted, null, false)}
                        ${buildRow('Total Dokumen Direvisi', cp.rev, pp.rev, mtd.rev, lm.rev, ly.rev, null, true)}
                        ${buildRow(`Pencapaian SLA (%) · Target ${companyTarget}%`, slaCp, slaPp, slaMtd, slaLm, slaLy, null, false, true)}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="exec-section-card exec-chart-card">
            <div class="exec-section-head"><div><span class="exec-section-icon exec-chart-icon" aria-hidden="true">↗</span><div><h4>Analisis Perbandingan Tren</h4><small>Perbandingan indikator utama antara CP dan PP</small></div></div><span class="exec-chart-badge">CP vs PP</span></div>
            <div class="exec-chart-wrap"><canvas id="exec-modern-chart"></canvas></div>
        </section>
    `;

    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(container);

    setTimeout(() => {
        const canvas = document.getElementById('exec-modern-chart');
        if (!canvas) return;
        const uiText = window.translateUiText || (value => value);
        if (window.execModernChart) window.execModernChart.destroy();
        const chartContext = canvas.getContext('2d');
        const cpGradient = chartContext.createLinearGradient(0, 0, 0, 320);
        cpGradient.addColorStop(0, '#0b83bd'); cpGradient.addColorStop(1, '#56c1d7');
        const ppGradient = chartContext.createLinearGradient(0, 0, 0, 320);
        ppGradient.addColorStop(0, '#91a9ba'); ppGradient.addColorStop(1, '#c7d4dd');
        let gQty = pp.qty === 0 ? (cp.qty > 0 ? 100 : 0) : ((cp.qty - pp.qty) / pp.qty * 100);
        let gPosted = pp.posted === 0 ? (cp.posted > 0 ? 100 : 0) : ((cp.posted - pp.posted) / pp.posted * 100);
        let gRev = pp.rev === 0 ? (cp.rev > 0 ? 100 : 0) : ((cp.rev - pp.rev) / pp.rev * 100);
        let gSla = slaPp === 0 ? (slaCp > 0 ? 100 : 0) : ((slaCp - slaPp) / slaPp * 100);
        let growths = [gQty, gPosted, gRev, gSla];

        window.execModernChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Volume Pengajuan (Dok)', 'Dokumen Selesai (Posted)', 'Dokumen Direvisi', 'Pencapaian SLA (%)'].map(uiText),
                datasets: [
                    { label: uiText('Periode Aktif (CP)'), data: [cp.qty, cp.posted, cp.rev, slaCp], backgroundColor: cpGradient, borderColor:'#087fbd', borderWidth:1, borderRadius:10, borderSkipped:false, barPercentage:.64, categoryPercentage:.68 },
                    { label: uiText('Periode Sebelumnya (PP)'), data: [pp.qty, pp.posted, pp.rev, slaPp], backgroundColor: ppGradient, borderColor:'#8ba4b5', borderWidth:1, borderRadius:10, borderSkipped:false, barPercentage:.64, categoryPercentage:.68 }
                ]
            },
            plugins: [{
                id: 'executiveDataLabels',
                afterDatasetsDraw(chart) {
                    const {ctx} = chart; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    [0,1].forEach(datasetIndex => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        meta.data.forEach((element, index) => {
                            const val = chart.data.datasets[datasetIndex].data[index];
                            if(val <= 0) return;
                            ctx.font = '800 10px sans-serif';
                            ctx.fillStyle = datasetIndex === 0 ? '#087fbd' : '#688294';
                            ctx.fillText(index === 3 ? `${val}%` : val, element.x, element.y - 6);
                        });
                    });
                    const metaCP = chart.getDatasetMeta(0), metaPP = chart.getDatasetMeta(1);
                    metaCP.data.forEach((elCP, index) => {
                        const elPP = metaPP.data[index]; const pct = growths[index];
                        const isRevLogic = index === 2;
                        let color = '#71869a';
                        if(pct > 0) color = isRevLogic ? '#c94f60' : '#15966b';
                        else if(pct < 0) color = isRevLogic ? '#15966b' : '#c94f60';
                        const text = `${pct > 0 ? '▲ +' : (pct < 0 ? '▼ ' : '▪ ')}${Math.abs(pct).toFixed(1)}%`;
                        let topY = Math.min(elCP.y, elPP.y) - 24; if(topY < 18) topY = 18;
                        ctx.fillStyle = color; ctx.font = '800 11px sans-serif'; ctx.fillText(text, (elCP.x + elPP.x) / 2, topY);
                    });
                    ctx.restore();
                }
            }],
            options: {
                responsive:true, maintainAspectRatio:false, layout:{padding:{top:40,right:8,left:4}},
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{position:'bottom',labels:{usePointStyle:true,pointStyle:'circle',boxWidth:8,boxHeight:8,padding:18,color:'#5f788b',font:{size:10,weight:'700'}}},
                    tooltip:{backgroundColor:'#0f2f46',titleColor:'#fff',bodyColor:'#d9edf7',padding:12,cornerRadius:10,callbacks:{label(context){ return context.dataIndex === 3 ? `${context.dataset.label}: ${context.parsed.y}%` : `${context.dataset.label}: ${context.parsed.y} ${uiText('Dokumen')}`; }}}
                },
                scales:{
                    y:{beginAtZero:true,grid:{color:'rgba(103,139,162,.12)',drawBorder:false},border:{display:false},ticks:{precision:0,color:'#71869a',font:{size:10}},title:{display:true,text:uiText('Nilai / Volume'),color:'#71869a',font:{size:10,weight:'700'}}},
                    x:{grid:{display:false},border:{display:false},ticks:{color:'#5f788b',font:{size:10,weight:'700'},maxRotation:0,minRotation:0}}
                }
            }
        });
    }, 100);
};

// --- GLOBAL SLA MODE STATE ---
window.slaMode = 'working_days';

window.changeSlaMode = function(mode) {
    window.slaMode = mode;
    let modeTxt = mode === 'working_days' ? 'Hari Kerja' : 'Tanggal Kalender';
    logActivity(sessionUser, `Mengubah Mode SLA Global menjadi: ${modeTxt}`);
    
    // Refresh otomatis seluruh elemen UI agar perubahan langsung terlihat tanpa reload
    if (typeof calcStats === 'function') calcStats();
    if (typeof renderDashboardUrgent === 'function') renderDashboardUrgent();
    if (typeof refreshActiveViewSilently === 'function') refreshActiveViewSilently();
    if (window.currentOpenMenu === 'executive' && typeof renderExecutiveDashboard === 'function') renderExecutiveDashboard();
    
    showToast(`Mode perhitungan SLA berhasil diubah menjadi ${modeTxt}.`, 'success');
};

// --- INITIALIZE FLATPICKR & UPGRADE SUPER FIND ---
window.filterDatesSuperFind = [];

onWorksheetReady(function() {
    setTimeout(() => {
        let fpElement = document.getElementById('filter-date-super-find');
        if(fpElement) {
            let today = new Date();
            let firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            let lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Set state awal ke bulan berjalan
            window.filterDatesSuperFind = [firstDay, lastDay];

            window.ensureWorksheetCalendar("#filter-date-super-find", {
                mode: "range", 
                dateFormat: "Y-m-d", 
                altInput: true, 
                altFormat: "d M Y",
                altInputClass: "sf-date-modern",
                defaultDate: [firstDay, lastDay], // UI Kalender langsung keisi bulan ini
                locale: {
                    rangeSeparator: " ➔ ",
                    months: { shorthand: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], longhand: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"] }
                },
                onChange: function(selectedDates, dateStr, instance) { 
                    window.filterDatesSuperFind = selectedDates; 
                    
                    // Pilihan manual dari kalender menandai preset sebagai custom.
                    const presetSelect = document.getElementById('preset-period-super-find');
                    if (presetSelect && instance.isOpen) presetSelect.value = 'custom';

                    if(typeof executeSuperFind === 'function') executeSuperFind(false); 
                }
            });
        }
    }, 1000);
});

// FUNGSI PRESET DROP-DOWN
window.applyPresetSuperFind = function(val) {
    const input = document.getElementById('filter-date-super-find');
    const fp = input && input._flatpickr;
    if (val === 'custom') {
        if(fp) fp.open();
        return;
    }
    const range = getReportingPresetRange(val);
    if(!range) return;
    window.filterDatesSuperFind = range;
    if(fp) fp.setDate(range, true);
    else if(typeof executeSuperFind === 'function') executeSuperFind(false);
}

// FUNGSI RESET BERSIH SUPER FIND
// Update Tampilan Bersih pas di-Reset (Biar center juga)
window.resetSuperFind = function() {
    const preset = document.getElementById('preset-period-super-find');
    if(preset) preset.value = 'custom';
    
    let fp = document.getElementById('filter-date-super-find');
    if (fp && fp._flatpickr) fp._flatpickr.clear();
    window.filterDatesSuperFind = [];
    
    let searchInput = document.getElementById('sf-search-input');
    if (searchInput) { searchInput.value = ''; syncWsSearchState(searchInput); }
    
    const resultTitle = document.getElementById('sf-result-title');
    if(resultTitle) resultTitle.style.display = 'none';

    const tbody = document.getElementById('tbody-super-find');
    if(tbody) tbody.innerHTML = '';
    showSuperFindState('waiting');

    showToast('Filter dan pencarian telah diatur ulang.', 'info');
};

// LOGIKA BARU: Keyword & Tanggal WAJIB diisi
window.executeSuperFind = function(isManual = false) {
    let keyword = document.getElementById('sf-search-input').value.trim();
    let hasDate = window.filterDatesSuperFind && window.filterDatesSuperFind.length === 2;

    // Syarat 1: Harus pilih tanggal dulu!
    if(!hasDate) {
        if (isManual) showToast('Silakan pilih rentang Tanggal Submit terlebih dahulu.', 'error');
        return;
    }
    
    // Syarat 2: Harus ketik keyword (nama/NIK)
    if(!keyword) {
        if (isManual) showToast('Silakan masukkan NIK, nama, atau nomor dokumen terlebih dahulu.', 'error');
        return;
    }
    
    // Bikin format teks keterangan hasil pencarian yang keren
    let d1 = window.filterDatesSuperFind[0].toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    let d2 = window.filterDatesSuperFind[1].toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    
    document.getElementById('sf-keyword-text').innerHTML = `"${keyword}" <span style="color:#64748b; font-weight:normal;">(Tgl Submit: ${d1} - ${d2})</span>`;
    document.getElementById('sf-result-title').style.display = 'block';
    
    tableFilters['super-find'] = {};
    updateFilterIconHighlight('super-find');
    renderSuperFindTable();
    if(isManual) logActivity(sessionUser, `Pencarian klaim dijalankan untuk periode ${d1} s.d. ${d2}`).catch(() => {});
};

// Empty state hidup di luar tabel supaya baris header tidak ikut tampil
// ketika belum ada hasil; tabel baru dimunculkan saat benar-benar ada data.
window.showSuperFindState = function(state, total = 0) {
    const emptyState = document.getElementById('sf-empty-state');
    const tableWrap = document.getElementById('sf-table-container');
    const counter = document.getElementById('sf-result-count');
    const hasResults = state === 'results';

    if(tableWrap) tableWrap.style.display = hasResults ? 'block' : 'none';
    if(counter) {
        counter.hidden = !hasResults;
        if(hasResults) counter.textContent = `${total.toLocaleString('id-ID')} klaim ditemukan`;
    }
    if(!emptyState) return;
    emptyState.style.display = hasResults ? 'none' : 'flex';
    if(hasResults) return;

    const waiting = state === 'waiting';
    emptyState.innerHTML = `
        <div class="sf-state-icon ${waiting ? 'waiting' : 'not-found'}">${waiting ? '🔍' : '📭'}</div>
        <div class="sf-state-title${waiting ? '' : ' is-empty'}">${waiting ? 'Menunggu Pencarian' : 'Data Tidak Ditemukan'}</div>
        <div class="sf-state-desc">${waiting
            ? 'Silakan pilih periode tanggal submit dan ketik kata kunci NIK/Nama, lalu tekan tombol Cari Data.'
            : 'Tidak ada riwayat klaim yang cocok dengan kata kunci dan periode tersebut. Coba periksa kembali NIK/Nama atau sesuaikan filter Anda.'}</div>`;
    if(typeof window.applyWorksheetTranslations === 'function') window.applyWorksheetTranslations(emptyState);
};

// Modifikasi Render Tabel buat UI Empty State Modern & Beneran Center
window.renderSuperFindTable = function() {
    let tbody = document.getElementById('tbody-super-find');
    if(!tbody) return;
    tbody.innerHTML = '';

    let keyword = (document.getElementById('sf-search-input')?.value || "").toLowerCase().trim();
    let hasDate = window.filterDatesSuperFind && window.filterDatesSuperFind.length === 2;

    // TAMPILAN 1: Menunggu Pencarian (Belum isi form lengkap)
    if(!keyword || !hasDate) {
        showSuperFindState('waiting');
        const resultTitle = document.getElementById('sf-result-title');
        if(resultTitle) resultTitle.style.display = 'none';
        return;
    }

    let start = window.filterDatesSuperFind[0];
    let end = window.filterDatesSuperFind[1];
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    // FILTER GANDA: Cek Keyword DAN Cek Tanggal Submit
    let baseData = dbRekap.filter(i => {
        let matchKeyword = (i.nik || "").toString().toLowerCase().includes(keyword) || 
                           (i.nama || "").toString().toLowerCase().includes(keyword) ||
                           (i.noPR || "").toString().toLowerCase().includes(keyword) ||
                           (i.extNo || "").toString().toLowerCase().includes(keyword);
        
        if (!matchKeyword) return false;

        let tDate = i.tglSubmit; 
        if (!tDate) return false; 
        let p = tDate.split('/'); 
        if (p.length !== 3) return false;
        
        let dDate = new Date(p[2], p[1]-1, p[0]); 
        dDate.setHours(0,0,0,0);
        
        return dDate.getTime() >= start.getTime() && dDate.getTime() <= end.getTime();
    });
    
    let processedData = getFilteredAndSortedData('super-find', baseData);

    // TAMPILAN 2: Data Tidak Ditemukan
    if(processedData.length === 0) {
        showSuperFindState('not-found');
        return;
    }

    showSuperFindState('results', processedData.length);

    processedData.forEach(item => {
        let ent = item.entitas || '-';
let sClass = getClaimStatusClass(item.statusClaim);
        
        let detailBtn = '';
if (item.detailNota) {
    detailBtn = `<button class="btn" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Lihat Rincian Nota">🧾</button>`;
} else if (!isClaimFinanciallyLocked(item) && canEditClaims()) {
    detailBtn = `<button class="btn" style="background:#eef4fc; color:#0050A0; border:1px solid #cce0f5; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:4px;" onclick="searchAndLoadDetail(${item.id})" title="Buat Rincian Nota">➕</button>`;
} else {
    detailBtn = `<button class="btn" style="background:#f8f9fa; color:#6c757d; border:1px solid #dee2e6; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; opacity:0.6; cursor:not-allowed; margin-left:4px;" title="Detail kosong (Sudah Posted)" disabled>🧾</button>`;
}
if(sessionRole === 'viewer') detailBtn = '';

let actionBtn = buildClaimActionCell(item, { withFinance: true });
        const liveFinanceAction = canManageFinanceWorkflow() && getAllowedStatusTransitions(item).length > 0;
        let btnStatus = getAllowedStatusTransitions(item).length > 0
            ? `<span class="badge ${sClass} clickable" onclick="openStatusModal(${item.id})" title="${liveFinanceAction ? 'Ubah status Finance secara langsung' : 'Ubah status'}">${item.statusClaim} ✏️</span>`
            : `<span class="badge ${sClass}" title="Status klaim">${item.statusClaim}</span>`;
        let adjBadge = (item.adjustments && item.adjustments.length > 0) ? `<br><span style="font-size:10px; color:#dc3545; font-weight:bold;">[Disesuaikan]</span>` : '';
        let rtpArr = item.postedAt ? item.postedAt.replace(',', '').split(' ') : ['-', '-'];
        let tglRTP = rtpArr[0] !== '-' ? `<strong style="color:#155724;">${rtpArr[0]}</strong>` : '-';

        tbody.innerHTML += `<tr>
            <td>${actionBtn}</td>
            <td><strong>${item.noPR || item.extNo || '-'}</strong></td>
            <td>${item.nik}</td>
            <td><strong>${item.nama}</strong></td>
            <td><span class="badge status-revise">${ent}</span></td>
            <td>${item.tipe}${item.extNo ? `<br><span class="badge status-process" style="font-size:10px; font-weight:bold; background:#0050A0; color:white; padding:2px 4px; margin-top:3px; display:inline-block;">🔢 No: ${item.extNo}</span>` : ''}</td>
            <td>${item.tglProses || '-'}</td>
            <td>${item.tglSubmit}</td>
            <td>${tglRTP}</td>
            <td><strong style="color:#00677f;">${formatPaymentDate(item)}</strong></td>
            <td>${formatPaymentReference(item)}</td>
            <td><strong style="color:#0050A0;">${formatClaimMoney(item)}</strong>${adjBadge}</td>
            <td>${btnStatus}</td>
        </tr>`;
    });
};
// =========================================================
// FITUR BARU: KOLOM WAITING APPROVAL PASCA REVISI DI EXCEL
// =========================================================

// 1. Helper Pelacak History Log Cerdas (Versi Format DD/MM/YYYY)
window.getWaitingApprovalAfterRevise = function(item) {
    if (!item.historyLog) return "-";
    let hasRevisi = false;
    let waitingTime = "-";

    for (let i = 0; i < item.historyLog.length; i++) {
        let stat = (item.historyLog[i].status || "").toLowerCase();
        
        if (stat.includes('revisi')) {
            hasRevisi = true;
        }
        
        // FIX: Tangkap juga jika dokumen langsung "Posted" setelah revisi
        if (hasRevisi && (stat.includes('waiting approval') || stat.includes('posted'))) {
            let rawTime = item.historyLog[i].time || "";
            
            // Potong bagian jam setelah koma (cth: "24 Jul 2026, 10.53" -> "24 Jul 2026")
            let datePart = rawTime.split(',')[0].trim(); 
            let dmy = datePart.split(' ');
            
            // Konversi ke format DD/MM/YYYY
            if(dmy.length === 3) {
                let d = dmy[0].padStart(2, '0'); // Biar kalau tanggal 1 jadi 01
                let mStr = dmy[1].toLowerCase();
                let y = dmy[2];
                
                let monthMap = {
                    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mei': '05', 'jun': '06',
                    'jul': '07', 'agu': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'des': '12',
                    'aug': '08', 'oct': '10', 'dec': '12' // Jaga-jaga kalau bahasa Inggris
                };
                
                let m = monthMap[mStr] || '01';
                waitingTime = `${d}/${m}/${y}`; // Hasil: 24/07/2026
            } else {
                // Jaga-jaga kalau format aslinya udah beda, lempar mentahnya aja tanpa jam
                waitingTime = datePart; 
            }
        }
    }
    return waitingTime;
};

function stripExportMarkup(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/<br\s*\/?\s*>/gi, ' | ').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() || '-';
}

function formatWorkflowHistoryForExport(item) {
    if(!Array.isArray(item && item.historyLog) || item.historyLog.length === 0) return '-';
    return item.historyLog.map(log => {
        const reference = log.paymentReference ? ` | Ref: ${log.paymentReference}` : '';
        const note = log.note ? ` | Catatan: ${stripExportMarkup(log.note)}` : '';
        return `${log.time || '-'} | ${log.status || '-'} | ${formatActorUsername(log.by)}${reference}${note}`;
    }).join(' || ');
}

function getExportRtpParts(item) {
    if(typeof getExcelFilterCellValue === 'function') {
        return {
            date: getExcelFilterCellValue(item, 'postedAtDate'),
            time: getExcelFilterCellValue(item, 'postedAtTime')
        };
    }
    const parts = String(item && item.postedAt || '').replace(',', '').trim().split(/\s+/);
    return { date: parts[0] || '-', time: parts[1] ? parts[1].replace(/\./g, ':') : '-' };
}

function getExportPeriodInfo(source) {
    const range = typeof getActiveModuleDateRange === 'function' ? getActiveModuleDateRange(source) : null;
    const normalized = normalizeReportingRange(range);
    const basis = source === 'history' ? 'Tanggal RTP'
        : (source === 'canceled' ? 'Tanggal Cancel'
            : (source === 'super-find' ? 'Tanggal Submit'
                : (source === 'revise' ? 'Semua Waktu (tanpa pagar tanggal)' : 'Tanggal Proses')));
    if(!normalized) return { basis, period:'Semua Waktu' };
    const format = date => date.toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'});
    return { basis, period:`${format(normalized[0])} s.d. ${format(normalized[1])}` };
}

const WAITING_APPROVAL_FINANCE_EXPORT_FIELDS = new Set([
    'Tgl Pymnt', 'PIC Pymnt', 'Ref Pymnt', 'Tanggal Hold', 'PIC Hold', 'Hold Reason',
    'Tanggal Return Finance', 'PIC Return Finance', 'Alasan Return Finance', 'Cancel Paid Terakhir',
    'PIC Cancel Paid', 'Alasan Cancel Paid', 'Tgl Pymnt Dibatalkan', 'PIC Pymnt Dibatalkan',
    'Ref Pymnt Dibatalkan', 'Release Hold Terakhir', 'PIC Release Hold', 'Catatan Release Hold',
    'Hold Reason Sebelumnya'
]);

function removeWaitingApprovalFinanceExportFields(row, source) {
    if(source !== 'waiting') return row;
    return Object.fromEntries(Object.entries(row).filter(([key]) => !WAITING_APPROVAL_FINANCE_EXPORT_FIELDS.has(key)));
}

function buildClaimSummaryExportRow(item, source = '') {
    const rtp = getExportRtpParts(item);
    const cancellation = item.lastPaymentCancellation || {};
    const holdRelease = item.lastHoldRelease || {};
    const row = {
        // BLOK ACCOUNTING: identitas, nilai, proses, SLA, dan koreksi.
        'Claim ID': item.id,
        'No. Pengajuan': item.noPR || item.extNo || '-',
        'NIK': item.nik || '-',
        'Nama Karyawan': item.nama || '-',
        'Entitas': item.entitas || '-',
        'Tipe Pengajuan': item.tipe || '-',
        'Tanggal Proses': item.tglProses || '-',
        'Tanggal Submit': item.tglSubmit || '-',
        'Mata Uang': getClaimCurrency(item),
        'Total Amount': Number(item.totalHeader) || 0,
        'Ref Doc No': item.docNo || '-',
        'Input By': formatActorUsername(item.inputBy),
        'Quick Notes': item.quickNote || '-',
        'Status Terkini': item.statusClaim || '-',
        'Tgl Cancel': typeof formatCanceledDate === 'function' ? formatCanceledDate(item) : (item.canceledAt || '-'),
        'PIC Cancel': formatActorUsername(item.canceledBy),
        'Alasan Cancel': item.cancelReason || '-',
        'Tanggal RTP': rtp.date,
        'Jam RTP': rtp.time,
        'PIC Posted': formatActorUsername(item.postedBy),
        'Returning Reason Accounting': typeof window.getReturningReason === 'function' ? window.getReturningReason(item) : '-',
        'Tanggal Feedback User': typeof getTglFeedback === 'function' ? getTglFeedback(item) : '-',
        'Tanggal Masuk Approval Pasca Revisi': typeof window.getWaitingApprovalAfterRevise === 'function' ? window.getWaitingApprovalAfterRevise(item) : '-',
        'SLA Submit-RTP (Hari)': isCanceledClaim(item) ? '-' : (typeof calculateSLADays === 'function' ? calculateSLADays(item) : 0),
        'History Adjustment & Catatan': typeof window.getAdjustmentHistoryText === 'function' ? stripExportMarkup(window.getAdjustmentHistoryText(item)) : '-',

        // BLOK FINANCE: seluruh payment, hold, return, cancel, dan release berada di kanan Accounting.
        'Tgl Pymnt': formatPaymentDate(item),
        'PIC Pymnt': formatActorUsername(item.paymentBy),
        'Ref Pymnt': formatPaymentReference(item),
        'Tanggal Hold': formatWorkflowDate(item, 'holdAt', 'holdAtMs'),
        'PIC Hold': formatActorUsername(item.holdBy),
        'Hold Reason': item.holdReason || '-',
        'Tanggal Return Finance': formatWorkflowDate(item, 'returnedAt', 'returnedAtMs'),
        'PIC Return Finance': formatActorUsername(item.returnedBy),
        'Alasan Return Finance': item.returnReason || '-',
        'Cancel Paid Terakhir': cancellation.cancelledAt || '-',
        'PIC Cancel Paid': formatActorUsername(cancellation.cancelledBy),
        'Alasan Cancel Paid': cancellation.reason || '-',
        'Tgl Pymnt Dibatalkan': cancellation.paymentDate || '-',
        'PIC Pymnt Dibatalkan': formatActorUsername(cancellation.paymentBy),
        'Ref Pymnt Dibatalkan': cancellation.paymentReference || '-',
        'Release Hold Terakhir': holdRelease.releasedAt || '-',
        'PIC Release Hold': formatActorUsername(holdRelease.releasedBy),
        'Catatan Release Hold': holdRelease.reason || '-',
        'Hold Reason Sebelumnya': holdRelease.previousHoldReason || '-',

        // BLOK KONTROL SISTEM: audit teknis selalu paling kanan.
        'Timeline Workflow': formatWorkflowHistoryForExport(item),
        'Versi Data': Number(item._version) || 0,
        'Terakhir Diubah Oleh': formatActorUsername(item._updatedBy)
    };
    return removeWaitingApprovalFinanceExportFields(row, source);
}

function buildClaimDetailExportRows(item, source = '') {
    const rtp = getExportRtpParts(item);
    const base = {
        // BLOK ACCOUNTING DAN IDENTITAS CLAIM.
        'Claim ID': item.id,
        'No. Pengajuan': item.noPR || item.extNo || '-',
        'NIK': item.nik || '-',
        'Nama Karyawan': item.nama || '-',
        'Entitas': item.entitas || '-',
        'Tipe Pengajuan': item.tipe || '-',
        'Tanggal Proses': item.tglProses || '-',
        'Status Terkini': item.statusClaim || '-',
        'Tgl Cancel': typeof formatCanceledDate === 'function' ? formatCanceledDate(item) : (item.canceledAt || '-'),
        'PIC Cancel': formatActorUsername(item.canceledBy),
        'Alasan Cancel': item.cancelReason || '-',
        'Tanggal RTP': rtp.date,
        'Jam RTP': rtp.time,
        'PIC Posted': formatActorUsername(item.postedBy),
        'Mata Uang': getClaimCurrency(item),
        'Total Header': Number(item.totalHeader) || 0,
        'Ref Doc No': item.docNo || '-'
    };
    const finance = source === 'waiting' ? {} : {
        // BLOK FINANCE DILETAKKAN SETELAH SELURUH RINCIAN ACCOUNTING.
        'Tgl Pymnt': formatPaymentDate(item),
        'PIC Pymnt': formatActorUsername(item.paymentBy),
        'Ref Pymnt': formatPaymentReference(item)
    };
    const rows = [];
    (item.lines || []).forEach((line, index) => rows.push({
        ...base, 'Jenis Detail': 'Worksheet Line', 'Urutan Detail': index + 1,
        'Tanggal Transaksi': line.tgl || '-', 'GL Account': line.gl || '-', 'Hal': '-', 'Deskripsi': line.desc || '-',
        'Amount Worksheet Line': Number(line.amount) || 0, 'Amount Nota': '', 'Amount Claim Nota': '',
        'Status Detail Nota': item.detailNota && item.detailNota.status || '-', 'Catatan Detail': line.note || '-',
        ...finance
    }));
    (item.detailNota && item.detailNota.rows || []).forEach((row, index) => rows.push({
        ...base, 'Jenis Detail': 'Rincian Nota', 'Urutan Detail': index + 1,
        'Tanggal Transaksi': row.tgl || '-', 'GL Account': '-', 'Hal': row.hal || '-', 'Deskripsi': row.desc || '-',
        'Amount Worksheet Line': '',
        'Amount Nota': typeof row.amtNota === 'number' ? row.amtNota : parseCurrencyAmount(row.amtNota, getClaimCurrency(item)),
        'Amount Claim Nota': row.amtClaim === null || row.amtClaim === '' || row.amtClaim === undefined ? '' : (typeof row.amtClaim === 'number' ? row.amtClaim : parseCurrencyAmount(row.amtClaim, getClaimCurrency(item))),
        'Status Detail Nota': item.detailNota.status || '-', 'Catatan Detail': row.note || '-',
        ...finance
    }));
    if(rows.length === 0) rows.push({
        ...base, 'Jenis Detail': 'Ringkasan Klaim / Input Cepat', 'Urutan Detail': 1,
        'Tanggal Transaksi': '-', 'GL Account': '-', 'Hal': '-', 'Deskripsi': item.quickNote || '-',
        'Amount Worksheet Line': '', 'Amount Nota': '', 'Amount Claim Nota': '',
        'Status Detail Nota': '-', 'Catatan Detail': 'Claim tidak mempunyai line item atau rincian nota.',
        ...finance
    });
    return rows;
}

function setExportColumnWidths(worksheet, rows) {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    worksheet['!cols'] = headers.map(header => ({ wch: Math.min(48, Math.max(12, header.length + 2, ...rows.slice(0, 200).map(row => String(row[header] ?? '').length + 2))) }));
}

// Satu fungsi export utama: data terpilih atau data yang benar-benar lolos filter layar.
window.exportDataXLSX = function(mode, source) {
    const selectedIds = source === 'revise'
        ? [...Array.from(window.globalSelections['revise-active'] || []), ...Array.from(window.globalSelections['revise-arsip'] || [])]
        : Array.from(window.globalSelections[source] || []);
    let scopedData;
    if(typeof getFilteredRowsForSource === 'function') scopedData = getFilteredRowsForSource(source);
    else {
        let rawBaseData = dbRekap;
        if(source === 'history') rawBaseData = dbRekap.filter(item => isCurrentHistoryClaim(item));
        else if(source === 'canceled') rawBaseData = dbRekap.filter(item => isCanceledClaim(item));
        else if(source === 'in-process') rawBaseData = dbRekap.filter(item => ['In Process','Returned by Finance'].includes(String(item.statusClaim || '')) && !isCanceledClaim(item));
        else if(source === 'revise') rawBaseData = typeof window.getReviseBaseData === 'function' ? window.getReviseBaseData() : dbRekap;
        else if(source === 'waiting') rawBaseData = dbRekap.filter(item => item.statusClaim === 'Waiting Approval' || item.statusClaim === 'Confirm');
        scopedData = typeof getFilteredAndSortedData === 'function' ? getFilteredAndSortedData(source, rawBaseData) : rawBaseData;
    }
    let baseData = scopedData;
    if(selectedIds.length) {
        const selectedSet = new Set(selectedIds.map(String));
        baseData = scopedData.filter(item => selectedSet.has(String(item.id)));
        if(!baseData.length) return showToast('Pilihan lama berada di luar periode/filter aktif. Pilih ulang data yang ingin diekspor.', 'error');
    }
    if(!baseData.length) return showToast('Tidak terdapat data untuk diekspor.', 'error');
    if(!['summary', 'detail'].includes(mode)) return showToast('Mode ekspor tidak dikenali.', 'error');

    const printData = mode === 'summary'
        ? baseData.map(item => buildClaimSummaryExportRow(item, source))
        : baseData.flatMap(item => buildClaimDetailExportRows(item, source));
    const sheetName = mode === 'summary' ? 'Summary Claim' : 'Detail Claim';
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(printData);
    setExportColumnWidths(worksheet, printData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const totals = Object.entries(getCurrencyTotals(baseData)).sort(([a],[b]) => a.localeCompare(b)).map(([currency, amount]) => ({ 'Mata Uang': currency, 'Total Amount': amount, 'Jumlah Claim': baseData.filter(item => getClaimCurrency(item) === currency).length }));
    const totalsSheet = XLSX.utils.json_to_sheet(totals);
    totalsSheet['!cols'] = [{wch:14}, {wch:20}, {wch:14}];
    XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Kontrol Total Valas');

    const periodInfo = getExportPeriodInfo(source);
    const meta = [{
        'Modul Sumber': source,
        'Mode Export': mode,
        'Basis Data': selectedIds.length ? 'Data dicentang dalam periode/filter aktif' : 'Sesuai filter dan urutan layar',
        'Basis Tanggal Filter': periodInfo.basis,
        'Periode Aktif': periodInfo.period,
        'Scope Status': source === 'history' ? 'Status saat ini: Posted, Paid, atau Hold' : (source === 'canceled' ? 'Status Canceled / inactive' : 'Mengikuti modul sumber'),
        'Jumlah Claim': baseData.length,
        'Jumlah Baris Export': printData.length,
        'Waktu Export': new Date().toLocaleString('id-ID'),
        'Diekspor Oleh': getCurrentActorUsername(),
        'Susunan Kolom': 'Accounting → Finance → Kontrol Sistem'
    }];
    const metaSheet = XLSX.utils.json_to_sheet(meta);
    setExportColumnWidths(metaSheet, meta);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata Export');

    const dateStamp = new Date().toISOString().slice(0,10);
    XLSX.writeFile(workbook, `Export_${mode}_${source}_${dateStamp}.xlsx`);
    logActivity(sessionUser, `Ekspor Excel ${mode} dari modul ${source}: ${baseData.length} klaim / ${printData.length} baris`).catch(() => {});
    showToast(`Ekspor Excel berhasil: ${baseData.length} klaim dan ${printData.length} baris.`, 'success');
};
// ==========================================
// MODUL SUPER: DETAIL PENGAJUAN (NOTA)
// ==========================================
let currentDetailClaimId = null;

// Poin 1 & 2: Fungsi Reset Tampilan tanpa lempar ke Menu Lain
window.closeDetailModule = function() {
    currentDetailClaimId = null;
    document.getElementById('detail-header-info').style.display = 'none';
    document.getElementById('detail-table-area').style.display = 'none';
    document.getElementById('det-empty-state').style.display = 'flex'; // Munculkan estetika kosong
    document.getElementById('tbody-detail-items').innerHTML = '';
    const detSearch = document.getElementById('det-search-ref');
    detSearch.value = '';
    syncWsSearchState(detSearch);
    document.getElementById('det-revise-note').value = '';
    document.getElementById('btn-det-adjust').style.display = 'none';
};

// Poin 3: Munculkan Input Alasan jika pilih Revisi
window.toggleDetReviseNote = function() {
    let stat = document.getElementById('det-hdr-status-select').value;
    document.getElementById('det-revise-note-container').style.display = (stat === 'Revisi') ? 'block' : 'none';
};

window.searchAndLoadDetail = function(autoId = null) {
    let idToSearch = autoId;
    if(!idToSearch) {
        let kw = document.getElementById('det-search-ref').value.trim().toLowerCase();
        if(!kw) return showToast('Masukkan nomor referensi atau NIK terlebih dahulu.', 'error');
        let found = dbRekap.find(i => (i.noPR||'').toLowerCase().includes(kw) || (i.extNo||'').toLowerCase().includes(kw));
        if(!found) return showToast('Pengajuan tidak ditemukan.', 'error');
        idToSearch = found.id;
    }

    let data = dbRekap.find(i => i.id === idToSearch);
    if(!data) return;

    currentDetailClaimId = data.id;
    
    // Tampilkan Tabel, Sembunyikan Empty State
    document.getElementById('det-empty-state').style.display = 'none';
    // Kartu ringkasan kini memakai .detail-card (blok) dengan grid di dalamnya,
    // sehingga penataan kolomnya diurus CSS dan tetap satu kolom di layar kecil.
    document.getElementById('detail-header-info').style.display = 'block';
    document.getElementById('detail-table-area').style.display = 'block';

    document.getElementById('det-hdr-nik').value = data.nik;
    document.getElementById('det-hdr-nama').value = data.nama;
    document.getElementById('det-hdr-entitas').value = data.entitas || '-';
document.getElementById('det-hdr-tipe').value = data.tipe;
    document.getElementById('det-hdr-currency').value = getClaimCurrency(data);
    document.getElementById('det-currency-label').innerText = getClaimCurrency(data);
    document.getElementById('det-hdr-amount').value = formatClaimMoney(data);

    let statusSel = document.getElementById('det-hdr-status-select');
    statusSel.value = data.statusClaim;
    toggleDetReviseNote(); // Trigger pengecekan note revisi
    
    // Reset Note Revisi
    document.getElementById('det-revise-note').value = data.reviseNote || '';

    let tbody = document.getElementById('tbody-detail-items');
    tbody.innerHTML = '';

    let isReadOnly = isClaimFinanciallyLocked(data) || sessionRole === 'viewer';
    statusSel.disabled = isReadOnly;
    
    let rows = (data.detailNota && data.detailNota.rows) ? data.detailNota.rows : [];
    if(rows.length > 0) {
        rows.forEach(r => addNewDetailRow(r.hal, r.desc, r.tgl, r.amtNota, r.amtClaim, r.note, isReadOnly, r.rowId || ''));
    } else {
        for(let i=0; i<10; i++) addNewDetailRow('','','','','','', isReadOnly);
    }

    calculateDetailBalance();
    
    let inputs = document.querySelectorAll('#detail-table-area input.line-input, #detail-table-area textarea.line-input');
    inputs.forEach(i => i.readOnly = isReadOnly);
    document.getElementById('btn-det-add-row').style.display = isReadOnly ? 'none' : 'inline-block';
    document.getElementById('det-action-buttons').style.display = isReadOnly ? 'none' : 'flex';
    document.getElementById('btn-det-delete').style.display = (!data.detailNota || isReadOnly) ? 'none' : 'inline-block';
    document.getElementById('btn-det-del-row').style.display = 'none';

    changeMenu('claim-detail');
};

window.addNewDetailRow = function(hal='', desc='', tgl='', amtN='', amtC='', note='', isReadOnly=false, rowId='') {
    let tbody = document.getElementById('tbody-detail-items'); 
    let tr = document.createElement('tr');
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    let currency = getClaimCurrency(data);
    tr.dataset.rowId = rowId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `detail-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    let notaDisplay = amtN === '' || amtN === null || amtN === undefined ? '' : formatEditableAmountValue(typeof amtN === 'number' ? amtN : parseCurrencyAmount(amtN, currency), currency);
    let claimDisplay = amtC === '' || amtC === null || amtC === undefined ? '' : formatEditableAmountValue(typeof amtC === 'number' ? amtC : parseCurrencyAmount(amtC, currency), currency);
    
    let noteHtml = '';
    if (isReadOnly) {
        let formattedNote = window.formatLongNote(note || '-');
        noteHtml = `<div style="padding:6px; min-width: 200px; display: flex; align-items: flex-start; height: 100%;"><div style="font-size:11px; color:#555; background:#f9f9f9; padding:6px; border:1px dashed #ccc; border-radius:4px; line-height:1.5; width:100%; word-break: break-word;">${note ? formattedNote : '-'}</div></div><input type="hidden" class="line-input det-note" value="${note}">`;
    } else {
        noteHtml = `<textarea class="line-input det-note" placeholder="Tulis catatan..." style="width:100%; height:100%; min-height:35px; border:none; background:transparent; padding:8px; resize:vertical; font-family:inherit; font-size:13px; line-height:1.4; outline:none;">${note}</textarea>`;
    }

    tr.innerHTML = `
        <td style="text-align:center; padding:0;"><span class="drag-handle" style="cursor:${isReadOnly ? 'default' : 'grab'}; color:#888;">${isReadOnly ? '•' : '☰'}</span></td>
        <td style="text-align:center; padding:0;"><input type="checkbox" class="det-row-checkbox" onclick="toggleLineRowCheckDet()" ${isReadOnly ? 'disabled' : ''}></td>
        <td style="padding:0;"><input type="text" class="line-input det-hal" placeholder="-" value="${hal}" style="text-align:center;"></td>
        <td style="padding:0;"><input type="text" class="line-input det-desc" placeholder="Masukkan deskripsi" value="${desc}"></td>
        <td style="padding:0;"><input type="text" class="line-input det-tgl" placeholder="DDMM" maxlength="10" oninput="autoFormatDate(this)" onblur="autoFormatDate(this, true)" value="${tgl}"></td>
        <td style="padding:0;"><input type="text" class="line-input det-amt-n" placeholder="-" oninput="formatRupiahInput(this); calculateDetailBalance()" value="${notaDisplay}"></td>
        <td style="padding:0; background:#fcf8e3;"><input type="text" class="line-input det-amt-c" placeholder="-" oninput="formatRupiahInput(this); calculateDetailBalance()" value="${claimDisplay}" style="background:transparent; color:#856404;"></td>
        <td style="padding:0; vertical-align:top;">${noteHtml}</td>
    `;
    tbody.appendChild(tr);
};

window.toggleAllLineRowDet = function(master) {
    document.querySelectorAll('.det-row-checkbox').forEach(cb => cb.checked = master.checked);
    document.getElementById('btn-det-del-row').style.display = master.checked ? 'inline-block' : 'none';
};

window.toggleLineRowCheckDet = function() {
    let anyChecked = document.querySelectorAll('.det-row-checkbox:checked').length > 0;
    document.getElementById('btn-det-del-row').style.display = anyChecked ? 'inline-block' : 'none';
};

window.deleteSelectedDetailRows = function() {
    if(!requireClaimEditor()) return;
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    let lockedRows = Array.from(document.querySelectorAll('.det-row-checkbox:checked'))
        .map(cb => cb.closest('tr')).filter(tr => !amountsEqual(getDetailAppliedTarget(data, tr.dataset.rowId), 0, getClaimCurrency(data)));
    if(lockedRows.length) return showToast('Baris yang telah memiliki penyesuaian harus dinetralkan terlebih dahulu (Amount Klaim = Amount Nota), kemudian jalankan penyesuaian.', 'error');
    document.querySelectorAll('.det-row-checkbox:checked').forEach(cb => cb.closest('tr').remove());
    document.getElementById('btn-det-del-row').style.display = 'none';
    calculateDetailBalance();
};

function getDetailAppliedTarget(data, rowId) {
    if(!data || !Array.isArray(data.adjustments) || !rowId) return 0;
    const related = data.adjustments.filter(adj => adj.detailRowId === rowId && adj.detailTargetDiff !== undefined);
    return related.length ? Number(related[related.length - 1].detailTargetDiff) || 0 : 0;
}

window.calculateDetailBalance = function() {
    if(!currentDetailClaimId) return;
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    let currency = getClaimCurrency(data);
    let hdr = parseFloat(data.totalHeader) || 0;
    let totNota = 0;

    document.querySelectorAll('.det-amt-n').forEach(inp => totNota += parseCurrencyAmount(inp.value, currency));
    document.getElementById('txt-det-total').innerText = formatAmountValue(totNota, currency);

    let ind = document.getElementById('det-balance-indicator');
    let btnAdj = document.getElementById('btn-det-adjust');

    if(amountsEqual(hdr, totNota, currency) && hdr > 0) { 
        ind.innerText = "Seimbang ✓"; ind.className = "badge balanced"; 
    } else { 
        let selisih = Math.abs(hdr - totNota);
        ind.innerText = "Belum Seimbang (Selisih: " + formatMoney(selisih, currency) + ")"; 
        ind.className = "badge unbalanced"; 
    }

    let hasDifferences = false;
    document.querySelectorAll('#tbody-detail-items tr').forEach(tr => {
        let n = parseCurrencyAmount(tr.querySelector('.det-amt-n').value, currency);
        let cStr = tr.querySelector('.det-amt-c').value.trim();
        let c = cStr === '' ? n : parseCurrencyAmount(cStr, currency);
        let targetDiff = c - n;
        let appliedTarget = getDetailAppliedTarget(data, tr.dataset.rowId);
        if(!amountsEqual(targetDiff, appliedTarget, currency)) hasDifferences = true;
    });
    btnAdj.style.display = (hasDifferences && !isClaimFinanciallyLocked(data) && sessionRole !== 'viewer') ? 'inline-block' : 'none';
};

window.executeDetailAdjustments = function() {
    if(!requireClaimEditor()) return;
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    if(!data || isClaimFinanciallyLocked(data)) return showToast('Data final hanya dapat dibaca.', 'error');
    let currency = getClaimCurrency(data);
    let adjustmentsToApply = [];
    
    document.querySelectorAll('#tbody-detail-items tr').forEach((tr, index) => {
        let hal = tr.querySelector('.det-hal').value.trim() || '-';
        let desc = tr.querySelector('.det-desc').value.trim() || `Baris ${index+1}`;
        let n = parseCurrencyAmount(tr.querySelector('.det-amt-n').value, currency);
        let cStr = tr.querySelector('.det-amt-c').value.trim();
        let c = cStr === '' ? n : parseCurrencyAmount(cStr, currency);
        let targetDiff = c - n;
        let previousTarget = getDetailAppliedTarget(data, tr.dataset.rowId);
        let incrementalDiff = targetDiff - previousTarget;
        if(!amountsEqual(incrementalDiff, 0, currency)) {
            adjustmentsToApply.push({
                rowId: tr.dataset.rowId, desc: `Hal: ${hal} - ${desc}`, n, c,
                previousTarget, targetDiff, diff: incrementalDiff, note: tr.querySelector('.det-note').value.trim()
            });
        }
    });

    if(adjustmentsToApply.length === 0) return showToast('Tidak terdapat perbedaan antara Amount Nota dan Amount Klaim untuk disesuaikan.', 'info');

    let totalDiff = adjustmentsToApply.reduce((sum, adj) => sum + adj.diff, 0);
    if((Number(data.totalHeader) || 0) + totalDiff <= 0) return showToast('Penyesuaian menyebabkan total header bernilai nol atau negatif sehingga tidak dapat disimpan.', 'error');
    
    customConfirm(`Sistem menemukan ${adjustmentsToApply.length} perubahan penyesuaian. Nilai tambahan yang akan diterapkan: ${formatMoney(totalDiff, currency)}. Apakah proses dilanjutkan?`, async () => {
        let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
        if(!data.adjustments) data.adjustments = [];
        let currentHeader = data.totalHeader;

        // Snapshot rincian disimpan sebagai Draft agar sumber adjustment tidak hilang saat modul ditutup.
        const currentRows = collectDetailRowsFromForm(data);
        data.detailNota = { ...(data.detailNota || {}), status: 'Draft', rows: currentRows, by: sessionUser, time: timeNow };

        adjustmentsToApply.forEach(adj => {
            let newVal = currentHeader + adj.diff;
            let adjustmentId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : `adj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            data.adjustments.push({
                adjustmentId, type: 'Detail', row: '-', detailRowId: adj.rowId, detailTargetDiff: adj.targetDiff,
                sourceKey: `detail:${adj.rowId}:${adj.n}:${adj.c}`, gl: `Detail Selisih Nota: ${adj.desc}`,
                oldVal: currentHeader, newVal: newVal, currency, date: timeNow, by: sessionUser,
                note: `Target selisih baris berubah dari ${formatMoney(adj.previousTarget, currency)} menjadi ${formatMoney(adj.targetDiff, currency)}. Nota ${formatMoney(adj.n, currency)}, Claim/Approve ${formatMoney(adj.c, currency)}. Ket: ${adj.note}`
            });
            currentHeader = newVal;
        });

        data.totalHeader = currentHeader;
        data.updatedAtMs = Date.now();
        try { await saveDataToLocal({ claimIds: [data.id] }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            return showToast('Penyesuaian gagal disimpan pada perangkat.', 'error');
        }
        document.getElementById('det-hdr-amount').value = formatClaimMoney(data);
        calculateDetailBalance(); 
        showToast(`${adjustmentsToApply.length} penyesuaian berhasil dicatat.`, 'success');
    });
};

window.saveDetailData = function(status) {
    if(!requireClaimEditor()) return;
    if(!currentDetailClaimId) return;
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    if(!data || isClaimFinanciallyLocked(data)) return showToast('Data final hanya dapat dibaca.', 'error');
    const preparedRows = collectDetailRowsFromForm(data);

    if(status === 'Final') {
        const finalErrors = validateDetailRowsForFinal(data, preparedRows);
        if(finalErrors.length) return customAlert(`Rincian belum dapat difinalisasi:\n• ${finalErrors.join('\n• ')}`);
    }
    
    // Poin 3: Popup Validasi Alasan Revisi kalau dipilih "Revisi"
    let newStatus = document.getElementById('det-hdr-status-select').value;
    let reviseNoteInput = document.getElementById('det-revise-note').value.trim();
    if(newStatus === 'Posted') return showToast('Penyelesaian dilakukan melalui menu Status setelah rincian berstatus Final.', 'error');
    if(newStatus === 'Revisi' && !reviseNoteInput) {
        customAlert('Kolom Alasan Revisi wajib diisi sebelum status diubah menjadi Revisi.');
        document.getElementById('det-revise-note').focus();
        return;
    }

    if(status === 'Draft' && data.detailNota && data.detailNota.status === 'Final') {
        customConfirm('Data telah berstatus Final. Apakah Anda yakin ingin mengembalikan rincian ini ke status Draft?', () => {
            processSaveDetail(data, status, newStatus, reviseNoteInput, preparedRows);
        });
    } else {
        processSaveDetail(data, status, newStatus, reviseNoteInput, preparedRows);
    }
};

// --- Fungsi Save Detail: Poin 1 & 5 (Catat History & PIC) ---
async function processSaveDetail(data, status, newStatus, reviseNoteInput, preparedRows = null) {
    let rows = preparedRows || collectDetailRowsFromForm(data);

    if(rows.length === 0) return showToast('Isi minimal satu baris rincian.', 'error');

    let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
    
    // Simpan data beserta PIC yang nge-save
    data.detailNota = { ...(data.detailNota || {}), status: status, rows: rows, by: sessionUser, time: timeNow };
    data.updatedAtMs = Date.now();

    if(newStatus === 'Revisi') data.reviseNote = reviseNoteInput;

    if(!data.historyLog) data.historyLog = [];
    
    // Poin 5: Masukkan aktivitas Edit Rincian Nota ke History Log Pengajuan (Timeline)
    data.historyLog.push({status: "Update Rincian Nota", time: timeNow, by: sessionUser, note: `Detail nota diperbarui dan disimpan sebagai ${status}.`});
    
    if(newStatus !== data.statusClaim && !isClaimFinanciallyLocked(data)) {
        data.statusClaim = newStatus;
        let logEntry = {status: newStatus, time: timeNow, by: sessionUser, note: 'Status diubah saat memproses Detail Pengajuan'};
        
        if(newStatus === 'Revisi') {
            data.reviseStep = 'Feedback User'; 
            data.reviseTime = timeNow; 
            data.reviseTimestamp = new Date().getTime();
            logEntry.status = `Revisi - Feedback User`;
            logEntry.note = reviseNoteInput;
        } else {
            data.reviseStep = null; data.reviseTime = null; 
            data.reviseTimestamp = null; data.reviseNote = null;
        }
        if(!data.workflowTimestamps) data.workflowTimestamps = {};
        if(newStatus === 'Revisi') data.workflowTimestamps.revisionAt = Date.now();
        if(newStatus === 'Waiting Approval') {
            data.workflowTimestamps.waitingApprovalAt = Date.now();
            data.waitingApprovalAt = Date.now();
        }
        data.historyLog.push(logEntry);
    }

    try { await saveDataToLocal({ claimIds: [data.id] }); }
    catch(error) {
        if(await window.restoreClaimsAfterConflict(error)) return;
        return showToast('Rincian gagal disimpan pada perangkat.', 'error');
    }
    logActivity(sessionUser, `Pembaruan Rincian Nota Klaim ID: ${data.id} (${status})`);
    closeDetailModule(); 
    showToast(`Rincian berhasil disimpan sebagai ${status}.`, 'success');
}

// --- Fungsi Hapus Detail: Poin 5 (Catat History) ---
window.deleteDetailData = function() {
    if(!requireClaimEditor()) return;
    let currentData = dbRekap.find(i => i.id === currentDetailClaimId);
    if(!currentData || isClaimFinanciallyLocked(currentData)) return showToast('Data final hanya dapat dibaca.', 'error');
    const detailAdjustmentRows = new Set((currentData.adjustments || []).filter(adj => adj.detailRowId).map(adj => adj.detailRowId));
    const hasAppliedDetailAdjustment = Array.from(detailAdjustmentRows).some(rowId => !amountsEqual(getDetailAppliedTarget(currentData, rowId), 0, getClaimCurrency(currentData)));
    if(hasAppliedDetailAdjustment) return showToast('Rincian belum dapat dihapus karena masih terdapat penyesuaian aktif. Netralkan Amount Klaim, kemudian jalankan penyesuaian terlebih dahulu.', 'error');
    customConfirm('Apakah Anda yakin ingin menghapus seluruh rincian nota ini?', async () => {
        let data = dbRekap.find(i => i.id === currentDetailClaimId);
        const backup = clonePlain(data);
        if(data) {
            delete data.detailNota;
            
            let timeNow = new Date().toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            if(!data.historyLog) data.historyLog = [];
            data.historyLog.push({status: "Hapus Rincian Nota", time: timeNow, by: sessionUser, note: `Seluruh detail nota dihapus/dibersihkan.`});
        }
        try { await saveDataToLocal({ claimIds: [data.id] }); }
        catch(error) {
            if(await window.restoreClaimsAfterConflict(error)) return;
            const restoreIdx = dbRekap.findIndex(item => item.id === backup.id);
            if(restoreIdx >= 0) dbRekap[restoreIdx] = backup;
            await dbSyncClaimRows([data.id]).catch(() => {});
            return showToast('Penghapusan detail gagal disimpan lokal; data dikembalikan.', 'error');
        }
        logActivity(sessionUser, `Penghapusan Rincian Nota Klaim ID: ${data.id}`);
        closeDetailModule();
        showToast('Rincian pengajuan berhasil dihapus.', 'success');
    });
};

window.openDetailSimulate = function() {
    let data = dbRekap.find(i => i.id === currentDetailClaimId);
    let currency = getClaimCurrency(data);
    let summary = {}; let grand = 0;
    document.querySelectorAll('#tbody-detail-items tr').forEach(tr => {
        let desc = tr.querySelector('.det-desc').value.trim() || 'Unspecified Description';
        let amt = parseCurrencyAmount(tr.querySelector('.det-amt-n').value, currency); 
        if(amt > 0) { if(!summary[desc]) summary[desc] = 0; summary[desc] += amt; grand += amt; }
    });

    let tbody = document.getElementById('tbody-simulate'); tbody.innerHTML = '';
    if(Object.keys(summary).length === 0) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Belum ada data amount nota.</td></tr>';
    else { for(let key in summary) { tbody.innerHTML += `<tr><td style="padding:8px 10px; border-bottom:1px solid #eee;"><strong>${key}</strong></td><td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(summary[key], currency)}</td></tr>`; } }
    document.getElementById('sim-grand-total').innerText = formatMoney(grand, currency);
    document.getElementById('modal-simulate').style.display = 'flex';
};

window.exportDetailExcel = function() {
    if(!currentDetailClaimId) return; let data = dbRekap.find(i => i.id === currentDetailClaimId);
    if(!data.detailNota || data.detailNota.rows.length === 0) return showToast('Belum terdapat data yang tersimpan.', 'error');

    let printData = [];
    const currency = getClaimCurrency(data);
    data.detailNota.rows.forEach((r, index) => { printData.push({
        // ACCOUNTING DAN RINCIAN NOTA DI KIRI.
        "Claim ID": data.id, "No Pengajuan": data.noPR || data.extNo || "-", "NIK": data.nik || '-', "Nama Karyawan": data.nama,
        "Entitas": data.entitas || '-', "Tipe Pengajuan": data.tipe || '-', "Status Claim": data.statusClaim || '-', "Status Detail Nota": data.detailNota.status || '-',
        "Urutan": index + 1, "Hal": r.hal || '-', "Deskripsi": r.desc || '-', "Tgl Transaksi": r.tgl || '-', "Mata Uang": currency,
        "Amount Nota": typeof r.amtNota === 'number' ? r.amtNota : parseCurrencyAmount(r.amtNota, currency),
        "Amount Claim": r.amtClaim === null || r.amtClaim === '' ? '' : (typeof r.amtClaim === 'number' ? r.amtClaim : parseCurrencyAmount(r.amtClaim, currency)),
        "Notes": r.note || '-',
        // FINANCE SELALU DI BAGIAN PALING KANAN.
        "Tgl Pymnt": formatPaymentDate(data), "PIC Pymnt": formatActorUsername(data.paymentBy), "Ref Pymnt": formatPaymentReference(data)
    }); });
    let ws = XLSX.utils.json_to_sheet(printData); let wb = XLSX.utils.book_new();
    setExportColumnWidths(ws, printData);
    XLSX.utils.book_append_sheet(wb, ws, "Rincian Nota"); XLSX.writeFile(wb, `Detail_Nota_${data.noPR || data.extNo || data.id}.xlsx`);
    logActivity(sessionUser, `Ekspor Rincian Nota Klaim ID ${data.id}: ${printData.length} baris`).catch(() => {});
    showToast('Rincian nota berhasil diekspor ke Excel.', 'success');
};


// ==========================================
// MODUL SUPER: REKAP CATATAN DETAIL (ARSIP)
// ==========================================
tableFilters['catatan-detail'] = {}; 
tableSorts['catatan-detail'] = {col:'id', dir:'DESC'};
window.catatanDetailCurrentPage = 1; 
window.catatanDetailRowsPerPage = 20;
window.filterDatesCatatanDetail = []; // Variabel Kalender Poin 4

// Inisialisasi Kalender
onWorksheetReady(function() {
    setTimeout(() => {
        let fpElement = document.getElementById('filter-date-catatan-detail');
        if (fpElement) {
            let today = new Date();
            let firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            let lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            window.filterDatesCatatanDetail = [firstDay, lastDay];

            window.ensureWorksheetCalendar("#filter-date-catatan-detail", {
                mode: "range", 
                dateFormat: "Y-m-d", 
                altInput: true, 
                altFormat: "d M Y", 
                altInputClass: "modern-flatpickr-input", // <--- FIX DISINI! Bikin center dan elegan
                defaultDate: [firstDay, lastDay],
                locale: { 
                    rangeSeparator: " ➔ ", 
                    months: { 
                        shorthand: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], 
                        longhand: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"] 
                    } 
                },
                onChange: function(selectedDates, dateStr, instance) { 
                    window.filterDatesCatatanDetail = selectedDates;
                    window.catatanDetailCurrentPage = 1;
                    const preset = document.getElementById('preset-period-catatan-detail');
                    if(preset && instance.isOpen) preset.value = 'custom';
                    renderCatatanDetailTable(); 
                }
            });
        }
    }, 1000);
});

window.renderCatatanDetailTable = function() {
    let tbody = document.getElementById('tbody-catatan-detail'); if(!tbody) return; tbody.innerHTML = '';
    
    // Ambil Data Base Khusus yang punya detailNota
    let baseData = dbRekap.filter(i => i.detailNota); 
    
    // Terapkan Filter Tanggal Proses/Submit (Poin 4)
    let range = window.filterDatesCatatanDetail;
    if (range && range.length === 2) {
        let start = range[0], end = range[1]; start.setHours(0,0,0,0); end.setHours(23,59,59,999);
        baseData = baseData.filter(item => {
            let targetDate = item.tglSubmit || item.tglProses; if (!targetDate) return false; 
            let p = targetDate.split('/'); if (p.length !== 3) return false;
            let dDate = new Date(p[2], p[1]-1, p[0]); dDate.setHours(0,0,0,0);
            return dDate.getTime() >= start.getTime() && dDate.getTime() <= end.getTime();
        });
    }

    let filteredArr = getFilteredAndSortedData('catatan-detail', baseData);

    let totalRows = filteredArr.length;
    let maxPage = Math.ceil(totalRows / window.catatanDetailRowsPerPage) || 1;
    if(window.catatanDetailCurrentPage > maxPage) window.catatanDetailCurrentPage = maxPage;
    if(window.catatanDetailCurrentPage < 1) window.catatanDetailCurrentPage = 1;

    let pageInfo = document.getElementById('cd-page-info');
    if(pageInfo) pageInfo.innerText = `Halaman ${window.catatanDetailCurrentPage} dari ${maxPage} (${totalRows} Data)`;

    let startIdx = (window.catatanDetailCurrentPage - 1) * window.catatanDetailRowsPerPage;
    let pagedData = filteredArr.slice(startIdx, startIdx + window.catatanDetailRowsPerPage);

    if(pagedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:20px; color:#999; font-style:italic;">Belum ada arsip detail nota.</td></tr>'; return;
    }

    pagedData.forEach(item => {
        // Satu-satunya aksi pada baris ini, jadi cukup tombol ikon ringkas
        // yang seukuran tombol aksi tabel lain, bukan tombol selebar kolom.
        let actionBtn = `<div class="claim-action-cell"><button type="button" class="claim-action-trigger" onclick="searchAndLoadDetail(${item.id})" title="Buka Rincian Nota" aria-label="Buka Rincian Nota">🧾</button></div>`;
let sClass = getClaimStatusClass(item.statusClaim);
        let btnStatus = `<span class="badge ${sClass}">${item.statusClaim}</span>`;
        let detailStat = item.detailNota.status || 'Draft';
        let dClass = detailStat === 'Final' ? 'status-posted' : 'status-waiting';
        let btnDetailStat = `<span class="badge ${dClass}">${detailStat}</span>`;
        
        let picDetail = formatActorUsernameHtml(item.detailNota.by); // Username pendek untuk tampilan
        let slaTxt = typeof renderSLABadge === 'function' ? renderSLABadge(item) : '-'; // Poin 3

        tbody.innerHTML += `<tr>
            <td>${actionBtn}</td>
            <td><strong>${item.noPR || item.extNo || '-'}</strong></td>
            <td>${item.nik}</td>
            <td><strong>${item.nama}</strong></td>
            <td>${item.tipe}</td>
            <td>${item.tglProses || '-'}</td>
            <td>${item.tglSubmit || '-'}</td>
            <td style="text-align:center;">${slaTxt}</td>
            <td><strong style="color:#0050A0;">${formatClaimMoney(item)}</strong></td>
            <td><span style="font-size:11px;color:#666;font-weight:bold;">${picDetail}</span></td>
            <td>${formatPaymentDate(item)}</td>
            <td>${btnStatus}</td>
            <td style="background:#f8fbff; text-align:center;">${btnDetailStat}</td>
        </tr>`;
    });
};

// ==========================================
// INTEGRASI KE MESIN UTAMA (SEARCH, FILTER & NAV)
// ==========================================
function getUniqueValuesCatatanDetail(module, colKey) {
    if(module === 'catatan-detail') {
        let baseData = dbRekap.filter(i => i.detailNota);
        let range = window.filterDatesCatatanDetail;
        if (range && range.length === 2) {
            let start = range[0], end = range[1]; start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            baseData = baseData.filter(item => {
                let targetDate = item.tglSubmit || item.tglProses; if (!targetDate) return false; 
                let p = targetDate.split('/'); if (p.length !== 3) return false;
                let dDate = new Date(p[2], p[1]-1, p[0]); dDate.setHours(0,0,0,0);
                return dDate.getTime() >= start.getTime() && dDate.getTime() <= end.getTime();
            });
        }
        
        let activeFilters = tableFilters[module] || {};
        let cascadedData = baseData.filter(item => {
            for(let fKey in activeFilters) {
                if (fKey === colKey) continue; 
                let allowedVals = activeFilters[fKey]; if(allowedVals.length === 0) return false;
                let itemVal = item[fKey];
                if(fKey === 'noPR_extNo') itemVal = item.noPR || item.extNo || '-';
                else if(fKey === 'statusDetail') itemVal = item.detailNota ? item.detailNota.status : '-';
                else if(fKey === 'picDetail') itemVal = formatActorUsername(item.detailNota ? item.detailNota.by : '-');
                else if(fKey === 'paymentAtDate') itemVal = formatPaymentDate(item);
                else if(fKey === 'totalHeader') itemVal = formatClaimMoney(item);
                else if(fKey === 'slaDays' && typeof calculateSLADays === 'function') itemVal = calculateSLADays(item) + ' Hari';
                itemVal = (itemVal || '-').toString().toLowerCase().trim(); 
                if(!allowedVals.includes(itemVal)) return false;
            }
            return true;
        });

        let vals = new Set();
        cascadedData.forEach(item => {
            let v = item[colKey];
            if (colKey === 'noPR_extNo') v = item.noPR || item.extNo || '-';
            else if (colKey === 'statusDetail') v = item.detailNota ? item.detailNota.status : '-';
            else if (colKey === 'picDetail') v = formatActorUsername(item.detailNota ? item.detailNota.by : '-');
            else if (colKey === 'paymentAtDate') v = formatPaymentDate(item);
            else if (colKey === 'totalHeader') v = formatClaimMoney(item);
            else if (colKey === 'slaDays' && typeof calculateSLADays === 'function') v = calculateSLADays(item) + ' Hari';
            vals.add((v || '-').toString().trim()); 
        });
        
        let valsArr = Array.from(vals);
        valsArr.sort((a, b) => {
            if (colKey === 'paymentAtDate') return parseDateString(a) - parseDateString(b);
            if (colKey === 'slaDays') return (parseFloat(a.replace(/[^0-9]/g, '')) || 0) - (parseFloat(b.replace(/[^0-9]/g, '')) || 0);
            return a.localeCompare(b);
        });
        return valsArr;
    }
    return [];
}

function getFilteredAndSortedDataCatatanDetail(module, baseData) {
    if(module === 'catatan-detail') {
        let filters = tableFilters[module] || {}; 
        let sortRule = tableSorts[module] || {col:'id', dir:'DESC'};

        let filtered = baseData.filter(item => {
            for(let key in filters) {
                let allowedVals = filters[key]; if(allowedVals.length === 0) return false;
                let itemVal = item[key];
                if(key === 'noPR_extNo') itemVal = item.noPR || item.extNo || '-';
                else if(key === 'statusDetail') itemVal = item.detailNota ? item.detailNota.status : '-';
                else if(key === 'picDetail') itemVal = formatActorUsername(item.detailNota ? item.detailNota.by : '-');
                else if(key === 'paymentAtDate') itemVal = formatPaymentDate(item);
                else if(key === 'totalHeader') itemVal = formatClaimMoney(item);
                else if (key === 'slaDays' && typeof calculateSLADays === 'function') itemVal = calculateSLADays(item) + ' Hari';
                itemVal = (itemVal || '-').toString().toLowerCase().trim(); 
                if(!allowedVals.includes(itemVal)) return false;
            }
            return true;
        });

        let searchInput = document.getElementById('search-' + module);
        if (searchInput && searchInput.value.trim() !== '') {
            let kw = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(item => {
                let statusDetail = item.detailNota ? item.detailNota.status : '';
                let target = `${item.nik||''} ${item.nama||''} ${item.noPR||''} ${item.extNo||''} ${item.tipe||''} ${item.statusClaim||''} ${statusDetail}`.toLowerCase();
                return target.includes(kw);
            });
        }

        filtered.sort((a,b) => {
            let valA = a[sortRule.col]; let valB = b[sortRule.col];
            if(sortRule.col === 'noPR_extNo') { valA = a.noPR || a.extNo || '-'; valB = b.noPR || b.extNo || '-'; }
            else if(sortRule.col === 'statusDetail') { valA = a.detailNota?a.detailNota.status:'-'; valB = b.detailNota?b.detailNota.status:'-'; }
            else if(sortRule.col === 'picDetail') { valA = formatActorUsername(a.detailNota?a.detailNota.by:'-'); valB = formatActorUsername(b.detailNota?b.detailNota.by:'-'); }
            else if(sortRule.col === 'paymentAtDate') { valA = parseDateString(formatPaymentDate(a)); valB = parseDateString(formatPaymentDate(b)); }
            else if(sortRule.col === 'id') { valA = parseInt(valA) || 0; valB = parseInt(valB) || 0; } 
            else if(sortRule.col === 'totalHeader') { valA = parseFloat((valA||"").toString().replace(/[^0-9]/g, ""))||0; valB = parseFloat((valB||"").toString().replace(/[^0-9]/g, ""))||0; }
            else if (sortRule.col === 'slaDays' && typeof calculateSLADays === 'function') { valA = calculateSLADays(a); valB = calculateSLADays(b); }
            else { valA = (valA||'').toString().toLowerCase().trim(); valB = (valB||'').toString().toLowerCase().trim(); }

            if(valA < valB) return sortRule.dir === 'ASC' ? -1 : 1;
            if(valA > valB) return sortRule.dir === 'ASC' ? 1 : -1; return 0;
        });
        return filtered;
    }
    return baseData;
}

// ==========================================
// ENGINE EXCEL, KEYBOARD NAV & DRAG UNTUK TABEL DETAIL (GLOBAL DELEGATION)
// ==========================================

window.selAnchorDet = null;
window.isDraggingDet = false;
window.startCellInputDet = null;
window.dragRowDet = null;

window.highlightRangeDet = function(startInp, endInp) {
    let table = document.getElementById('detail-items-table');
    if(!table || !startInp || !endInp) return;
    let r1 = startInp.closest('tr').rowIndex, r2 = endInp.closest('tr').rowIndex;
    let c1 = startInp.closest('td').cellIndex, c2 = endInp.closest('td').cellIndex;
    let minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    let minC = Math.min(c1, c2), maxC = Math.max(c1, c2);

    document.querySelectorAll('#tbody-detail-items .line-input').forEach(inp => inp.classList.remove('cell-selected'));
    for(let r = minR; r <= maxR; r++) {
        let row = table.rows[r]; if(!row) continue;
        for(let c = minC; c <= maxC; c++) {
            let cell = row.cells[c]; if(!cell) continue;
            let inp = cell.querySelector('.line-input'); if(inp) inp.classList.add('cell-selected');
        }
    }
};

// 1. TANGKAP KEYBOARD (PANAH, CTRL+D, DELETE) LINTAS DIMENSI
document.addEventListener('keydown', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return; 

    // Ctrl+D (Copy Cell Atas)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        let td = e.target.closest('td'); let tr = e.target.closest('tr');
        let rIdx = Array.from(tbody.children).indexOf(tr);
        let cIdx = Array.from(tr.children).indexOf(td);
        if (rIdx > 0) {
            let prevInp = tbody.children[rIdx - 1].children[cIdx].querySelector('.line-input');
            if (prevInp) {
                e.target.value = prevInp.value;
                if(e.target.classList.contains('det-amt-n') || e.target.classList.contains('det-amt-c')) { formatRupiahInput(e.target); calculateDetailBalance(); }
                if(e.target.classList.contains('det-tgl')) { autoFormatDate(e.target, true); }
                e.target.style.backgroundColor = '#d4edda'; setTimeout(() => e.target.style.backgroundColor = '', 300);
            }
        }
        return;
    }

    // Delete / Backspace (Hapus Area Blok)
    if(e.key === 'Delete' || e.key === 'Backspace') {
        let selected = document.querySelectorAll('#tbody-detail-items .line-input.cell-selected');
        if(selected.length > 1) {
            selected.forEach(inp => {
                inp.value = '';
                if(inp.classList.contains('det-amt-n') || inp.classList.contains('det-amt-c')) formatRupiahInput(inp);
            });
            if(typeof calculateDetailBalance === 'function') calculateDetailBalance(); 
            e.preventDefault(); return;
        }
    }

    // Panah Keyboard
    if(e.target.classList.contains('line-input')) {
        let tr = e.target.closest('tr'); let td = e.target.closest('td');
        let c = Array.from(tr.children).indexOf(td);
        let r = Array.from(tbody.children).indexOf(tr);
        let nextR = r, nextC = c; let move = false;

        if(e.key === 'ArrowUp') { 
            if(e.target.tagName === 'TEXTAREA' && e.target.value.includes('\n')) {} // Biarin nulis enter
            else { nextR = Math.max(0, r - 1); move = true; }
        }
        else if(e.key === 'ArrowDown') { 
            if(e.target.tagName === 'TEXTAREA' && e.target.value.includes('\n')) {} 
            else { nextR = Math.min(tbody.children.length - 1, r + 1); move = true; }
        }
        else if(e.key === 'ArrowLeft') {
            if(e.shiftKey || e.target.selectionStart === 0) { nextC = Math.max(2, c - 1); move = true; } 
        }
        else if(e.key === 'ArrowRight') {
            if(e.shiftKey || e.target.selectionEnd === e.target.value.length) { nextC = Math.min(tr.children.length - 1, c + 1); move = true; }
        }

        if(move) {
            let targetTd = tbody.children[nextR].children[nextC];
            let targetInp = targetTd ? targetTd.querySelector('.line-input') : null;
            if(targetInp && targetInp !== e.target) {
                e.preventDefault(); 
                if(e.shiftKey) {
                    if(!window.selAnchorDet) window.selAnchorDet = e.target;
                    targetInp.focus(); window.highlightRangeDet(window.selAnchorDet, targetInp);
                } else {
                    window.selAnchorDet = targetInp;
                    document.querySelectorAll('#tbody-detail-items .line-input').forEach(inp => inp.classList.remove('cell-selected'));
                    targetInp.classList.add('cell-selected');
                    targetInp.focus(); 
                }
            }
        }
    }
});

// 2. TANGKAP MOUSE (KLIK, DRAG, & BLOK SEL)
document.addEventListener('mousedown', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return;
    
    // Aktifasi atribut draggable pas kena ikon ☰
    if(e.target.classList.contains('drag-handle')) { 
        e.target.closest('tr').setAttribute('draggable', 'true'); 
        return; 
    }
    
    if(e.target.classList.contains('line-input')) {
        if(e.shiftKey) {
            e.preventDefault(); window.highlightRangeDet(window.selAnchorDet || e.target, e.target); e.target.focus();
        } else if (e.ctrlKey || e.metaKey) {
            window.isDraggingDet = false; window.selAnchorDet = e.target; e.target.classList.toggle('cell-selected');
        } else {
            window.isDraggingDet = true; window.selAnchorDet = e.target; window.startCellInputDet = e.target;
            document.querySelectorAll('#tbody-detail-items .line-input').forEach(inp => inp.classList.remove('cell-selected'));
            e.target.classList.add('cell-selected');
        }
    }
});

document.addEventListener('mouseover', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return;
    if(window.isDraggingDet && e.target.classList.contains('line-input')) { window.highlightRangeDet(window.startCellInputDet, e.target); }
});

document.addEventListener('mouseup', function(e) {
    if(e.target.classList.contains('drag-handle')) e.target.closest('tr').removeAttribute('draggable');
    window.isDraggingDet = false;
});

// 3. TANGKAP GESER BARIS (DRAG & DROP ROWS)
document.addEventListener('dragstart', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return;
    let tr = e.target.closest('tr');
    if(tr) { window.dragRowDet = tr; setTimeout(() => window.dragRowDet.classList.add('dragging'), 0); }
});

document.addEventListener('dragover', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || !window.dragRowDet || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return;
    e.preventDefault(); 
    let els = [...tbody.querySelectorAll('tr:not(.dragging)')];
    let afterElement = els.reduce((closest, child) => { 
        let box = child.getBoundingClientRect(); let offset = e.clientY - box.top - box.height / 2;
        return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
    
    if (afterElement == null) tbody.appendChild(window.dragRowDet); 
    else tbody.insertBefore(window.dragRowDet, afterElement);
});

document.addEventListener('dragend', function() {
    if(window.dragRowDet) { window.dragRowDet.classList.remove('dragging'); window.dragRowDet = null; }
});

// 4. TANGKAP COPY-PASTE EXCEL
document.addEventListener('paste', function(e) {
    let tbody = e.target.closest('#tbody-detail-items');
    if(!tbody || !e.target.classList.contains('line-input') || (typeof dataIsReadonly === 'function' && dataIsReadonly())) return;
    e.preventDefault();
    let clipboard = (e.clipboardData || window.clipboardData).getData('text');
    if(!clipboard) return;
    
    let rows = clipboard.split(/\r\n|\n|\r/).filter(r => r.trim() !== "");
    if(rows.length === 0) return;

    let selectedInputs = document.querySelectorAll('#tbody-detail-items .line-input.cell-selected');
    let currentTd = e.target.closest('td'); let tr = currentTd.closest('tr');
    let startRowIdx = Array.from(tbody.children).indexOf(tr);
    let startColIdx = Array.from(tr.children).indexOf(currentTd);

    if(selectedInputs.length > 1 && rows.length === 1) {
        let cellsToCopy = rows[0].split('\t');
        let selectedRowIndices = [...new Set(Array.from(selectedInputs).map(inp => inp.closest('tr').rowIndex))];
        let table = document.getElementById('detail-items-table');
        
        selectedRowIndices.forEach(rIdx => {
            let targetRow = table.rows[rIdx];
            if(!targetRow) return;
            cellsToCopy.forEach((cellStr, j) => {
                let targetTd = targetRow.cells[startColIdx + j];
                if(targetTd) {
                    let inp = targetTd.querySelector('.line-input');
                    if(inp) {
                        inp.value = cellStr.trim();
                        if(inp.classList.contains('det-amt-n') || inp.classList.contains('det-amt-c')) formatRupiahInput(inp);
                        if(inp.classList.contains('det-tgl')) autoFormatDate(inp, true);
                    }
                }
            });
        });
    } else {
        rows.forEach((rowStr, i) => {
            let cells = rowStr.split('\t');
            let targetRow = tbody.children[startRowIdx + i];
            if(!targetRow) { window.addNewDetailRow(); targetRow = tbody.lastElementChild; }

            cells.forEach((cellStr, j) => {
                let targetTd = targetRow.children[startColIdx + j];
                if(targetTd) {
                    let inp = targetTd.querySelector('.line-input');
                    if(inp) {
                        inp.value = cellStr.trim();
                        if(inp.classList.contains('det-amt-n') || inp.classList.contains('det-amt-c')) formatRupiahInput(inp);
                        if(inp.classList.contains('det-tgl')) autoFormatDate(inp, true);
                    }
                }
            });
        });
    }
    if(typeof calculateDetailBalance === 'function') calculateDetailBalance(); 
    showToast('Data Excel berhasil ditempel.', 'success');
});

// Bahasa hanya merender ulang visual aktif dari data lokal; tidak melakukan baca/tulis cloud.
document.addEventListener('worksheet:languagechange', function() {
    if(window.currentOpenMenu === 'statistik' && typeof window.renderStatistikData === 'function') {
        window.renderStatistikData();
        if(typeof window.renderTopRevisi === 'function') window.renderTopRevisi();
        if(typeof window.renderTopPengaju === 'function') window.renderTopPengaju();
    }
    if(window.currentOpenMenu === 'executive' && typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
    }
});
