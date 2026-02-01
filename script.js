// --- ESTADO & CONFIG ---
const state = {
    usdRate: 5.00,
    manualRate: false,
    lastSource: 'robux',
    values: { robux: 0, grossUsd: 0, netBrl: 0, grossBrl: 0, totalTax: 0 },
    partners: [{ id: 1, name: 'Você', pct: 100 }],
    profiles: { from: [], bank: [] },
    logoData: null,
    // TEXTO JURÍDICO ATUALIZADO (COMPLIANCE BANCÁRIO)
    items: [{ 
        desc: "Developer Exchange (DevEx) Program - Digital Services.\n\nAtuo como desenvolvedor independente na plataforma Roblox, criando experiências e conteúdos digitais. Os valores referem-se à monetização de propriedade intelectual e prestação de serviços de software.\n\nNão há vínculo empregatício com a Roblox Corporation; trata-se de exportação de serviços de tecnologia.", 
        qty: 1, 
        price: 0 
    }],
    settings: { logoMode: 'img', logoColor: '#8a2be2', watermark: false },
    gamePresets: {}
};

const el = (id) => document.getElementById(id);
const elems = {
    robux: el('inp-robux'), usd: el('inp-usd'), brl: el('inp-brl'),
    devex: el('cfg-devex'), fee: el('cfg-fee'), tax: el('cfg-tax'), extra: el('cfg-extra'), spread: el('cfg-spread'),
    usdRate: el('usd-rate'), btnLock: el('btn-lock'), btnRefresh: el('btn-refresh'),
    resGrossBrl: el('res-gross-brl'), resTotalTax: el('res-total-tax'), resNetBrl: el('res-net-brl'), effRateDisp: el('effective-rate-display'),
    pList: el('partners-list'), allocTotal: el('alloc-total'), selGamePreset: el('sel-game-preset'), btnSaveGame: el('btn-save-game'), btnDelGame: el('btn-del-game'),
    modalInv: el('invoice-modal'), invTableBody: el('inv-table-body'), invTotalFinal: el('inv-total-final'),
    invDate: el('inv-date'), invNum: el('inv-num'), invFromName: el('inv-from-name'), invFromAddr: el('inv-from-address'), invBank: el('inv-bank-details'),
    selProFrom: el('sel-profile-from'), selProBank: el('sel-profile-bank'),
    logoTrigger: el('logo-trigger'), logoInput: el('logo-upload'), logoImg: el('logo-img'), logoText: el('logo-text'),
    logoInputText: el('logo-input-text'), btnModeImg: el('btn-mode-img'), btnModeText: el('btn-mode-text'),
    ctrlTextColor: el('ctrl-text-color'), inpLogoColor: el('inp-logo-color'),
    checkWatermark: el('check-watermark'), watermarkLayer: el('watermark-layer'), watermarkImg: el('watermark-img')
};

function autoResize(textarea) { textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }

function updateCalc(src) {
    if(src === 'config') src = state.lastSource; else state.lastSource = src;
    const rate = parseFloat(elems.usdRate.value) || 5.00, devex = parseFloat(elems.devex.value);
    const fee = parseFloat(elems.fee.value) || 0, taxPct = (parseFloat(elems.tax.value) || 0) + (elems.extra.checked ? 10 : 0);
    const spreadPct = parseFloat(elems.spread.value) || 0;
    const effectiveRate = rate * (1 - (spreadPct / 100));
    elems.effRateDisp.innerText = `R$ ${effectiveRate.toFixed(4)}`;

    let v = state.values;
    if (src === 'robux') { v.robux = parseFloat(elems.robux.value) || 0; v.grossUsd = v.robux * devex; }
    else if (src === 'usd') { v.grossUsd = parseFloat(elems.usd.value) || 0; v.robux = Math.ceil(v.grossUsd / devex); }
    else if (src === 'brl') {
        v.netBrl = parseFloat(elems.brl.value) || 0; const f = 1 - (taxPct / 100); v.grossBrl = f > 0 ? v.netBrl / f : 0;
        const netUsd = v.grossBrl / effectiveRate; v.grossUsd = netUsd > 0 ? netUsd + fee : 0; v.robux = Math.ceil(v.grossUsd / devex);
    }
    if (src !== 'brl') { const netUsd = Math.max(0, v.grossUsd - fee); v.grossBrl = netUsd * effectiveRate; v.netBrl = v.grossBrl * (1 - (taxPct / 100)); }
    v.totalTax = v.grossBrl - v.netBrl;

    if(src !== 'robux') elems.robux.value = v.robux || ''; if(src !== 'usd') elems.usd.value = v.grossUsd ? v.grossUsd.toFixed(2) : ''; if(src !== 'brl') elems.brl.value = v.netBrl ? v.netBrl.toFixed(2) : '';
    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    elems.resGrossBrl.innerText = fmt(v.grossBrl); elems.resTotalTax.innerText = fmt(v.totalTax); elems.resNetBrl.innerText = fmt(v.netBrl);

    if(state.items.length > 0) { state.items[0].price = v.grossUsd; renderInvoiceTable(); }
    renderPartners(); saveState();
}

function renderPartners() {
    elems.pList.innerHTML = ''; let totalPct = 0;
    state.partners.forEach((p, idx) => {
        totalPct += p.pct; const pNet = state.values.netBrl * (p.pct / 100), pTax = state.values.totalTax * (p.pct / 100);
        elems.pList.innerHTML += `<div class="partner-row"><input class="p-name" value="${p.name}" onchange="updatePartner(${idx},'name',this.value)"><input type="number" class="p-pct" value="${p.pct}" onchange="updatePartner(${idx},'pct',this.value)"><span>%</span><div class="p-result"><div style="font-weight:bold;">${pNet.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><span style="font-size:0.7rem;">Imp: ${pTax.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>${idx > 0 ? `<button class="btn-del" onclick="removePartner(${idx})">×</button>` : ''}</div>`;
    });
    elems.allocTotal.innerText = totalPct + '%'; elems.allocTotal.style.color = totalPct !== 100 ? '#ff4d4d' : '#00e68e';
}
window.updatePartner = (i, f, v) => { if (f === 'pct') v = parseFloat(v) || 0; state.partners[i][f] = v; renderPartners(); saveState(); };
window.removePartner = (i) => { state.partners.splice(i, 1); renderPartners(); saveState(); };
el('btn-add-partner').addEventListener('click', () => { state.partners.push({ id: Date.now(), name: 'Sócio', pct: 0 }); renderPartners(); });

function renderGamePresets() {
    elems.selGamePreset.innerHTML = '<option value="">Carregar Jogo...</option>';
    if (state.gamePresets) Object.keys(state.gamePresets).forEach(key => elems.selGamePreset.innerHTML += `<option value="${key}">${key}</option>`);
}
if(elems.selGamePreset) {
    elems.btnSaveGame.addEventListener('click', () => { const name = prompt("Nome do Jogo:"); if(!name) return; if(!state.gamePresets) state.gamePresets = {}; state.gamePresets[name] = JSON.parse(JSON.stringify(state.partners)); renderGamePresets(); saveState(); alert("Salvo!"); });
    elems.btnDelGame.addEventListener('click', () => { const key = elems.selGamePreset.value; if(!key) return; if(confirm(`Apagar "${key}"?`)) { delete state.gamePresets[key]; renderGamePresets(); saveState(); } });
    elems.selGamePreset.addEventListener('change', (e) => { const key = e.target.value; if(key && state.gamePresets[key]) { if(confirm(`Carregar "${key}"?`)) { state.partners = JSON.parse(JSON.stringify(state.gamePresets[key])); updateCalc('config'); } } });
}

function renderInvoiceTable() {
    elems.invTableBody.innerHTML = ''; let grandTotal = 0;
    state.items.forEach((item, idx) => {
        const total = item.qty * item.price; grandTotal += total;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><textarea class="editable" oninput="updateItem(${idx}, 'desc', this.value); autoResize(this)" style="height:auto; min-height:40px;">${item.desc}</textarea></td>
            <td style="text-align:center;"><input type="number" class="editable" value="${item.qty}" oninput="updateItem(${idx}, 'qty', this.value)" style="text-align:center;"></td>
            <td style="text-align:right;"><input type="text" class="editable" value="${item.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}" oninput="updateItem(${idx}, 'price', this.value)" style="text-align:right;"></td>
            <td style="text-align:right; font-weight:bold;" id="row-total-${idx}">$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="no-print">${idx > 0 ? `<button class="btn-rem-row" onclick="remItem(${idx})">×</button>` : ''}</td>`;
        elems.invTableBody.appendChild(tr);
        setTimeout(() => { const txt = tr.querySelector('textarea'); if(txt) autoResize(txt); }, 50);
    });
    updateGrandTotal();
}
function updateGrandTotal() { let t = 0; state.items.forEach(i => t += (i.qty * i.price)); elems.invTotalFinal.innerText = `$${t.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
window.updateItem = (idx, field, val) => {
    if (field === 'qty' || field === 'price') { let clean = val.toString().replace(/,/g, ''); state.items[idx][field] = parseFloat(clean) || 0; } else { state.items[idx][field] = val; }
    if (field === 'qty' || field === 'price') { const tot = state.items[idx].qty * state.items[idx].price; const el = document.getElementById(`row-total-${idx}`); if(el) el.innerText = `$${tot.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; updateGrandTotal(); }
    saveState();
};
window.remItem = (idx) => { state.items.splice(idx, 1); renderInvoiceTable(); };
el('btn-add-row').addEventListener('click', () => { state.items.push({ desc: "Item...", qty: 1, price: 0 }); renderInvoiceTable(); });

el('open-invoice').addEventListener('click', () => { if(state.items.length > 0) state.items[0].price = state.values.grossUsd; renderInvoiceTable(); loadInvoiceData(); elems.modalInv.style.display = 'flex'; setTimeout(() => document.querySelectorAll('textarea.editable').forEach(tx => autoResize(tx)), 100); });
el('close-invoice').addEventListener('click', () => elems.modalInv.style.display = 'none');
el('print-invoice').addEventListener('click', () => window.print());
el('btn-gen-id').addEventListener('click', () => { elems.invNum.value = `#INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`; saveInvoiceData(); });
elems.checkWatermark.addEventListener('change', (e) => { state.settings.watermark = e.target.checked; elems.watermarkLayer.style.display = e.target.checked ? 'flex' : 'none'; saveState(); });

const toggleLogoMode = (mode) => { state.settings.logoMode = mode; if(mode === 'img') { elems.btnModeImg.classList.add('active'); elems.btnModeText.classList.remove('active'); elems.logoTrigger.style.display = 'flex'; elems.logoInputText.style.display = 'none'; elems.ctrlTextColor.style.display = 'none'; } else { elems.btnModeText.classList.add('active'); elems.btnModeImg.classList.remove('active'); elems.logoTrigger.style.display = 'none'; elems.logoInputText.style.display = 'block'; elems.ctrlTextColor.style.display = 'block'; } saveState(); };
elems.btnModeImg.addEventListener('click', () => toggleLogoMode('img')); elems.btnModeText.addEventListener('click', () => toggleLogoMode('text'));
elems.inpLogoColor.addEventListener('input', (e) => { state.settings.logoColor = e.target.value; elems.logoInputText.style.color = e.target.value; saveState(); });
elems.logoTrigger.addEventListener('click', () => elems.logoInput.click()); elems.logoInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => { state.logoData = ev.target.result; displayLogo(); saveInvoiceData(); }; r.readAsDataURL(f); } });
function displayLogo() { if (state.logoData) { elems.logoImg.src = state.logoData; elems.logoImg.style.display = 'block'; elems.logoText.style.display = 'none'; elems.watermarkImg.src = state.logoData; } }

function renderProfiles() { elems.selProFrom.innerHTML = '<option value="">Carregar...</option>'; state.profiles.from.forEach((p, i) => elems.selProFrom.innerHTML += `<option value="${i}">${p.title}</option>`); elems.selProBank.innerHTML = '<option value="">Banco...</option>'; state.profiles.bank.forEach((p, i) => elems.selProBank.innerHTML += `<option value="${i}">${p.title}</option>`); }
window.saveProfile = (type) => { const t = prompt("Nome:"); if (!t) return; const d = type === 'from' ? { title: t, name: elems.invFromName.value, address: elems.invFromAddr.value } : { title: t, details: elems.invBank.value }; if(type === 'from') state.profiles.from.push(d); else state.profiles.bank.push(d); renderProfiles(); saveState(); alert("Salvo!"); };
elems.selProFrom.addEventListener('change', (e) => { const i = e.target.value; if (i !== '') { const p = state.profiles.from[i]; elems.invFromName.value = p.name; elems.invFromAddr.value = p.address; saveInvoiceData(); setTimeout(() => autoResize(elems.invFromAddr), 0); } });
elems.selProBank.addEventListener('change', (e) => { const i = e.target.value; if (i !== '') { elems.invBank.value = state.profiles.bank[i].details; saveInvoiceData(); setTimeout(() => autoResize(elems.invBank), 0); } });

function saveInvoiceData() { const d = { num: elems.invNum.value, date: elems.invDate.value, fromName: elems.invFromName.value, fromAddr: elems.invFromAddr.value, bank: elems.invBank.value, logo: state.logoData }; localStorage.setItem('devex_inv_data', JSON.stringify(d)); }
function loadInvoiceData() { const d = JSON.parse(localStorage.getItem('devex_inv_data')); if (d) { elems.invNum.value = d.num || '#INV-001'; elems.invDate.value = d.date || ''; elems.invFromName.value = d.fromName || ''; elems.invFromAddr.value = d.fromAddr || ''; elems.invBank.value = d.bank || ''; if (d.logo) { state.logoData = d.logo; displayLogo(); } } if (!elems.invDate.value) elems.invDate.value = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); setTimeout(() => document.querySelectorAll('textarea.editable').forEach(tx => autoResize(tx)), 50); }
function saveState() { const d = { manualRate: state.manualRate, usdRate: elems.usdRate.value, lastSource: state.lastSource, devex: elems.devex.value, fee: elems.fee.value, tax: elems.tax.value, extra: elems.extra.checked, spread: elems.spread.value, partners: state.partners, gamePresets: state.gamePresets, lastVal: elems.robux.value, profiles: state.profiles, settings: state.settings }; localStorage.setItem('devex_v16', JSON.stringify(d)); const toast = el('toast'); toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 1500); }
function loadState() {
    const d = JSON.parse(localStorage.getItem('devex_v16'));
    if (d) {
        state.manualRate = d.manualRate || false; state.lastSource = d.lastSource || 'robux'; state.profiles = d.profiles || { from: [], bank: [] }; state.settings = d.settings || state.settings; state.gamePresets = d.gamePresets || {};
        elems.usdRate.value = d.usdRate || 5.255; elems.devex.value = d.devex || 0.0038; elems.fee.value = d.fee || 26; elems.tax.value = d.tax || 10.88; elems.extra.checked = d.extra || false; elems.spread.value = d.spread || 2.0;
        if (d.partners) state.partners = d.partners; if (d.lastVal) { elems.robux.value = d.lastVal; setTimeout(() => updateCalc('robux'), 50); }
        elems.usdRate.disabled = !state.manualRate; el('btn-lock').innerText = state.manualRate ? '🔓' : '🔒';
        elems.checkWatermark.checked = state.settings.watermark; elems.watermarkLayer.style.display = state.settings.watermark ? 'flex' : 'none'; elems.inpLogoColor.value = state.settings.logoColor; elems.logoInputText.style.color = state.settings.logoColor; toggleLogoMode(state.settings.logoMode); renderProfiles(); renderGamePresets();
    } loadInvoiceData();
}

elems.robux.addEventListener('input', () => updateCalc('robux')); elems.usd.addEventListener('input', () => updateCalc('usd')); elems.brl.addEventListener('input', () => updateCalc('brl'));
[elems.devex, elems.fee, elems.tax, elems.extra, elems.spread].forEach(x => x.addEventListener('input', () => updateCalc('config')));
el('btn-lock').addEventListener('click', () => { state.manualRate = !state.manualRate; elems.usdRate.disabled = !state.manualRate; el('btn-lock').innerText = state.manualRate ? '🔓' : '🔒'; if (!state.manualRate) fetchRate(); saveState(); });
elems.usdRate.addEventListener('input', () => updateCalc('config'));
async function fetchRate() { if (!state.manualRate) { el('btn-refresh').style.transform = 'rotate(180deg)'; try { const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL'); const d = await r.json(); elems.usdRate.value = parseFloat(d.USDBRL.bid).toFixed(3); } catch (e) {} setTimeout(() => el('btn-refresh').style.transform = 'rotate(0deg)', 500); updateCalc('config'); } }
el('btn-refresh').addEventListener('click', fetchRate);
[elems.invNum, elems.invDate, elems.invFromName, elems.invFromAddr, elems.invBank].forEach(x => x.addEventListener('input', saveInvoiceData));

loadState(); if (!state.manualRate) fetchRate();