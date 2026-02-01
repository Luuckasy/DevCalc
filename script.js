// --- ESTADO & CONFIG ---
const state = {
    usdRate: 5.00,
    manualRate: false,
    lastSource: 'robux',
    values: { robux: 0, grossUsd: 0, netBrl: 0, grossBrl: 0, totalTax: 0 },
    partners: [{ id: 1, name: 'Você', pct: 100 }],
    
    // NOVO: Presets de Jogos
    gamePresets: {}, 
    
    profiles: { from: [], bank: [] },
    logoData: null,
    items: [{ 
        desc: "Developer Exchange Program (DevEx):\nO Developer Exchange Program permite que as pessoas ganhem dinheiro criando experiências no Roblox.\n\nAtuo como desenvolvedor independente, publicando experiências (jogos) e conteúdos digitais próprios na plataforma.\nPresto serviços de criação e monetização de experiências virtuais, recebendo em Robux que são convertidos em moeda real através do programa oficial DevEx.\n\nNão há vínculo empregatício com a Roblox; trata-se de atividade autoral e autônoma.", 
        qty: 1, 
        price: 0 
    }],
    settings: { logoMode: 'img', logoColor: '#8a2be2', watermark: false }
};

const el = (id) => document.getElementById(id);
const elems = {
    robux: el('inp-robux'), usd: el('inp-usd'), brl: el('inp-brl'),
    devex: el('cfg-devex'), fee: el('cfg-fee'), tax: el('cfg-tax'), 
    extra: el('cfg-extra'), spread: el('cfg-spread'),
    usdRate: el('usd-rate'), btnLock: el('btn-lock'), btnRefresh: el('btn-refresh'),
    resGrossBrl: el('res-gross-brl'), resTotalTax: el('res-total-tax'), resNetBrl: el('res-net-brl'),
    effRateDisp: el('effective-rate-display'),
    pList: el('partners-list'), allocTotal: el('alloc-total'),
    // Presets Jogos
    selGamePreset: el('sel-game-preset'), btnSaveGame: el('btn-save-game'), btnDelGame: el('btn-del-game'),
    // Invoice UI
    modalInv: el('invoice-modal'), invTableBody: el('inv-table-body'), invTotalFinal: el('inv-total-final'),
    invDate: el('inv-date'), invNum: el('inv-num'), invFromName: el('inv-from-name'), invFromAddr: el('inv-from-address'), invBank: el('inv-bank-details'),
    selProFrom: el('sel-profile-from'), selProBank: el('sel-profile-bank'),
    logoTrigger: el('logo-trigger'), logoInput: el('logo-upload'), logoImg: el('logo-img'), logoText: el('logo-text'),
    logoInputText: el('logo-input-text'), btnModeImg: el('btn-mode-img'), btnModeText: el('btn-mode-text'),
    ctrlTextColor: el('ctrl-text-color'), inpLogoColor: el('inp-logo-color'),
    checkWatermark: el('check-watermark'), watermarkLayer: el('watermark-layer'), watermarkImg: el('watermark-img')
};

// --- AUTO RESIZE ---
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// --- CALCULADORA ---
function updateCalc(src) {
    if(src === 'config') src = state.lastSource; else state.lastSource = src;
    
    const officialRate = parseFloat(elems.usdRate.value) || 5.00;
    const devex = parseFloat(elems.devex.value);
    const fee = parseFloat(elems.fee.value) || 0;
    const taxPct = (parseFloat(elems.tax.value) || 0) + (elems.extra.checked ? 10 : 0);
    const spreadPct = parseFloat(elems.spread.value) || 0;

    const effectiveRate = officialRate * (1 - (spreadPct / 100));
    elems.effRateDisp.innerText = `R$ ${effectiveRate.toFixed(4)}`;

    let v = state.values;

    if (src === 'robux') {
        v.robux = parseFloat(elems.robux.value) || 0;
        v.grossUsd = v.robux * devex;
    } else if (src === 'usd') {
        v.grossUsd = parseFloat(elems.usd.value) || 0;
        v.robux = Math.ceil(v.grossUsd / devex);
    } else if (src === 'brl') {
        v.netBrl = parseFloat(elems.brl.value) || 0;
        const taxFactor = 1 - (taxPct / 100);
        v.grossBrl = taxFactor > 0 ? v.netBrl / taxFactor : 0;
        const netUsd = v.grossBrl / effectiveRate;
        v.grossUsd = netUsd > 0 ? netUsd + fee : 0;
        v.robux = Math.ceil(v.grossUsd / devex);
    }

    if (src !== 'brl') {
        const netUsd = Math.max(0, v.grossUsd - fee);
        v.grossBrl = netUsd * effectiveRate;
        v.netBrl = v.grossBrl * (1 - (taxPct / 100));
    }
    v.totalTax = v.grossBrl - v.netBrl;

    if(src !== 'robux') elems.robux.value = v.robux || '';
    if(src !== 'usd') elems.usd.value = v.grossUsd ? v.grossUsd.toFixed(2) : '';
    if(src !== 'brl') elems.brl.value = v.netBrl ? v.netBrl.toFixed(2) : '';

    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    elems.resGrossBrl.innerText = fmt(v.grossBrl);
    elems.resTotalTax.innerText = fmt(v.totalTax);
    elems.resNetBrl.innerText = fmt(v.netBrl);

    // Sync item 0 price if exists
    if(state.items.length > 0) {
        state.items[0].price = v.grossUsd;
        // Check if row 0 exists to update it visually
        const row0Input = document.querySelector('#inv-table-body tr:first-child input[step="0.01"]');
        if(row0Input) {
             // We just update the value in state, let the invoice render logic handle visual update when modal opens
             // or trigger a specific lightweight update if needed.
             // For now, simple state sync is enough.
        }
    }
    
    renderPartners();
    saveState();
}

// --- SÓCIOS ---
function renderPartners() {
    elems.pList.innerHTML = ''; let totalPct = 0;
    state.partners.forEach((p, idx) => {
        totalPct += p.pct;
        const pNet = state.values.netBrl * (p.pct / 100);
        const pTax = state.values.totalTax * (p.pct / 100);
        const row = document.createElement('div');
        row.className = 'partner-row';
        row.innerHTML = `<input class="p-name" value="${p.name}" onchange="updatePartner(${idx},'name',this.value)"><input type="number" class="p-pct" value="${p.pct}" onchange="updatePartner(${idx},'pct',this.value)"><span>%</span><div class="p-result"><div style="font-weight:bold;">${pNet.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><span style="font-size:0.7rem;">Imp: ${pTax.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>${idx > 0 ? `<button class="btn-del" onclick="removePartner(${idx})">×</button>` : ''}`;
        elems.pList.appendChild(row);
    });
    elems.allocTotal.innerText = totalPct + '%'; elems.allocTotal.style.color = totalPct !== 100 ? '#ff4d4d' : '#00e68e';
}
window.updatePartner = (i, f, v) => { if (f === 'pct') v = parseFloat(v) || 0; state.partners[i][f] = v; renderPartners(); saveState(); };
window.removePartner = (i) => { state.partners.splice(i, 1); renderPartners(); saveState(); };
el('btn-add-partner').addEventListener('click', () => { state.partners.push({ id: Date.now(), name: 'Sócio', pct: 0 }); renderPartners(); });

// --- PRESETS DE JOGOS (NOVO) ---
function renderGamePresets() {
    elems.selGamePreset.innerHTML = '<option value="">Carregar Jogo...</option>';
    Object.keys(state.gamePresets).forEach(key => {
        elems.selGamePreset.innerHTML += `<option value="${key}">${key}</option>`;
    });
}

elems.btnSaveGame.addEventListener('click', () => {
    const name = prompt("Nome do Jogo/Projeto (Ex: Tycoon 2):");
    if(!name) return;
    
    // Deep copy para salvar o estado atual dos sócios
    state.gamePresets[name] = JSON.parse(JSON.stringify(state.partners));
    renderGamePresets();
    saveState();
    alert(`Preset "${name}" salvo!`);
});

elems.selGamePreset.addEventListener('change', (e) => {
    const key = e.target.value;
    if(key && state.gamePresets[key]) {
        if(confirm(`Carregar divisão do jogo "${key}"?`)) {
            // Deep copy para carregar sem vincular referência
            state.partners = JSON.parse(JSON.stringify(state.gamePresets[key]));
            updateCalc('config'); // Recalcula tudo
        }
    }
});

elems.btnDelGame.addEventListener('click', () => {
    const key = elems.selGamePreset.value;
    if(!key) return alert("Selecione um jogo na lista para apagar.");
    
    if(confirm(`Tem certeza que deseja apagar o preset "${key}"?`)) {
        delete state.gamePresets[key];
        renderGamePresets();
        saveState();
    }
});


// --- INVOICE TABLE ---
function renderInvoiceTable() {
    elems.invTableBody.innerHTML = '';
    let grandTotal = 0;

    state.items.forEach((item, idx) => {
        const total = item.qty * item.price;
        grandTotal += total;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <textarea class="editable" 
                    oninput="updateItem(${idx}, 'desc', this.value); autoResize(this)" 
                    style="height:auto; min-height:40px;">${item.desc}</textarea>
            </td>
            <td style="text-align:center;">
                <input type="number" class="editable" value="${item.qty}" 
                    oninput="updateItem(${idx}, 'qty', this.value)" style="text-align:center;">
            </td>
            <td style="text-align:right;">
                <input type="text" class="editable" 
                    value="${item.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}" 
                    oninput="updateItem(${idx}, 'price', this.value)" 
                    style="text-align:right;">
            </td>
            <td style="text-align:right; font-weight:bold;" id="row-total-${idx}">
                $${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </td>
            <td class="no-print">
                ${idx > 0 ? `<button class="btn-rem-row" onclick="remItem(${idx})">×</button>` : ''}
            </td>
        `;
        elems.invTableBody.appendChild(tr);

        setTimeout(() => { const txt = tr.querySelector('textarea'); if(txt) autoResize(txt); }, 0);
    });

    updateGrandTotal();
}

function updateGrandTotal() {
    let grandTotal = 0;
    state.items.forEach(item => {
        grandTotal += (item.qty * item.price);
    });
    // Formatação consistente
    elems.invTotalFinal.innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

window.updateItem = (idx, field, val) => {
    // Se for preço ou quantidade, limpamos vírgulas antes de salvar
    if (field === 'qty' || field === 'price') {
        // Remove vírgulas para o JS entender o número (ex: "1,000.00" vira "1000.00")
        let cleanVal = val.replace(/,/g, '');
        state.items[idx][field] = parseFloat(cleanVal) || 0;
    } else {
        state.items[idx][field] = val;
    }

    // Atualiza visualmente o Total da Linha com formatação
    if (field === 'qty' || field === 'price') {
        const rowTotal = state.items[idx].qty * state.items[idx].price;
        const rowTotalEl = document.getElementById(`row-total-${idx}`);
        
        if (rowTotalEl) {
            // MUDANÇA: Aplica formatação visual (vírgulas) no total da linha em tempo real
            rowTotalEl.innerText = `$${rowTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        updateGrandTotal();
    }

    saveState();
};

window.remItem = (idx) => { state.items.splice(idx, 1); renderInvoiceTable(); };
el('btn-add-row').addEventListener('click', () => { state.items.push({ desc: "New Item", qty: 1, price: 0 }); renderInvoiceTable(); });

el('open-invoice').addEventListener('click', () => { 
    if(state.items.length > 0) state.items[0].price = state.values.grossUsd; 
    renderInvoiceTable(); 
    loadInvoiceData(); 
    elems.modalInv.style.display = 'flex'; 
});
var originalTitle = document.title;
el('close-invoice').addEventListener('click', () => elems.modalInv.style.display = 'none');
el('print-invoice').addEventListener('click', () => { document.title = el('inv-num').value; window.print(); document.title = originalTitle; });
el('btn-gen-id').addEventListener('click', () => { elems.invNum.value = `#INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`; saveInvoiceData(); });
elems.checkWatermark.addEventListener('change', (e) => { state.settings.watermark = e.target.checked; elems.watermarkLayer.style.display = e.target.checked ? 'flex' : 'none'; saveState(); });

const toggleLogoMode = (mode) => {
    state.settings.logoMode = mode;
    if(mode === 'img') { elems.btnModeImg.classList.add('active'); elems.btnModeText.classList.remove('active'); elems.logoTrigger.style.display = 'flex'; elems.logoInputText.style.display = 'none'; elems.ctrlTextColor.style.display = 'none'; } 
    else { elems.btnModeText.classList.add('active'); elems.btnModeImg.classList.remove('active'); elems.logoTrigger.style.display = 'none'; elems.logoInputText.style.display = 'block'; elems.ctrlTextColor.style.display = 'block'; }
    saveState();
};
elems.btnModeImg.addEventListener('click', () => toggleLogoMode('img'));
elems.btnModeText.addEventListener('click', () => toggleLogoMode('text'));
elems.inpLogoColor.addEventListener('input', (e) => { state.settings.logoColor = e.target.value; elems.logoInputText.style.color = e.target.value; saveState(); });

elems.logoTrigger.addEventListener('click', () => elems.logoInput.click());
elems.logoInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { state.logoData = ev.target.result; displayLogo(); saveInvoiceData(); }; reader.readAsDataURL(file); } });
function displayLogo() { if (state.logoData) { elems.logoImg.src = state.logoData; elems.logoImg.style.display = 'block'; elems.logoText.style.display = 'none'; elems.watermarkImg.src = state.logoData; } }

function renderProfiles() {
    elems.selProFrom.innerHTML = '<option value="">Carregar...</option>'; state.profiles.from.forEach((p, i) => elems.selProFrom.innerHTML += `<option value="${i}">${p.title}</option>`);
    elems.selProBank.innerHTML = '<option value="">Banco...</option>'; state.profiles.bank.forEach((p, i) => elems.selProBank.innerHTML += `<option value="${i}">${p.title}</option>`);
}
window.saveProfile = (type) => {
    const t = prompt("Nome do Perfil:"); if (!t) return;
    const d = type === 'from' ? { title: t, name: elems.invFromName.value, address: elems.invFromAddr.value } : { title: t, details: elems.invBank.value };
    if(type === 'from') state.profiles.from.push(d); else state.profiles.bank.push(d); renderProfiles(); saveState(); alert("Salvo!");
};
elems.selProFrom.addEventListener('change', (e) => {
    const i = e.target.value;
    if (i !== '') {
        const p = state.profiles.from[i];
        elems.invFromName.value = p.name;
        elems.invFromAddr.value = p.address;
        
        // Salva e ajusta altura imediatamente
        saveInvoiceData();
        setTimeout(() => autoResize(elems.invFromAddr), 0);
    }
});

elems.selProBank.addEventListener('change', (e) => {
    const i = e.target.value;
    if (i !== '') {
        elems.invBank.value = state.profiles.bank[i].details;
        
        // Salva e ajusta altura imediatamente
        saveInvoiceData();
        setTimeout(() => autoResize(elems.invBank), 0);
    }
});
function saveInvoiceData() { const d = { num: elems.invNum.value, date: elems.invDate.value, fromName: elems.invFromName.value, fromAddr: elems.invFromAddr.value, bank: elems.invBank.value, logo: state.logoData }; localStorage.setItem('devex_inv_data', JSON.stringify(d)); }
function loadInvoiceData() {
    const d = JSON.parse(localStorage.getItem('devex_inv_data'));
    if (d) {
        elems.invNum.value = d.num || '#INV-001';
        elems.invDate.value = d.date || '';
        elems.invFromName.value = d.fromName || '';
        elems.invFromAddr.value = d.fromAddr || ''; // Carrega o endereço
        elems.invBank.value = d.bank || '';         // Carrega o banco
        
        if (d.logo) { 
            state.logoData = d.logo; 
            displayLogo(); 
        }
    }
    if (!elems.invDate.value) {
        elems.invDate.value = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- CORREÇÃO AQUI: Força o ajuste de altura em todos os campos carregados ---
    setTimeout(() => {
        const allTextareas = document.querySelectorAll('textarea.editable');
        allTextareas.forEach(tx => {
            autoResize(tx);
        });
    }, 50); // Um pequeno delay para garantir que o navegador renderizou
}

function saveState() { 
    const d = { 
        manualRate: state.manualRate, usdRate: elems.usdRate.value, 
        lastSource: state.lastSource, devex: elems.devex.value, 
        fee: elems.fee.value, tax: elems.tax.value, extra: elems.extra.checked, spread: elems.spread.value, 
        partners: state.partners, 
        gamePresets: state.gamePresets, // SALVA OS PRESETS
        lastVal: elems.robux.value, 
        profiles: state.profiles, settings: state.settings 
    }; 
    localStorage.setItem('devex_v13', JSON.stringify(d)); 
    const toast = el('toast'); toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 1500); 
}

function loadState() {
    const d = JSON.parse(localStorage.getItem('devex_v13'));
    if (d) {
        state.manualRate = d.manualRate || false; state.lastSource = d.lastSource || 'robux'; state.profiles = d.profiles || { from: [], bank: [] }; state.settings = d.settings || state.settings;
        elems.usdRate.value = d.usdRate || 5.255; elems.devex.value = d.devex || 0.0038; elems.fee.value = d.fee || 26; elems.tax.value = d.tax || 10.82; elems.extra.checked = d.extra || false;
        elems.spread.value = d.spread || 2.0;
        
        state.gamePresets = d.gamePresets || {}; // Carrega Presets
        
        if (d.partners) state.partners = d.partners; 
        if (d.lastVal) { elems.robux.value = d.lastVal; setTimeout(() => updateCalc('robux'), 50); }
        
        elems.usdRate.disabled = !state.manualRate; el('btn-lock').innerText = state.manualRate ? '🔓' : '🔒';
        elems.checkWatermark.checked = state.settings.watermark; elems.watermarkLayer.style.display = state.settings.watermark ? 'flex' : 'none'; elems.inpLogoColor.value = state.settings.logoColor; elems.logoInputText.style.color = state.settings.logoColor; toggleLogoMode(state.settings.logoMode); renderProfiles();
        
        renderGamePresets(); // Atualiza o select de jogos
    } 
    loadInvoiceData();
}

elems.robux.addEventListener('input', () => updateCalc('robux')); elems.usd.addEventListener('input', () => updateCalc('usd')); elems.brl.addEventListener('input', () => updateCalc('brl'));
[elems.devex, elems.fee, elems.tax, elems.extra, elems.spread].forEach(x => x.addEventListener('input', () => updateCalc('config')));
el('btn-lock').addEventListener('click', () => { state.manualRate = !state.manualRate; elems.usdRate.disabled = !state.manualRate; el('btn-lock').innerText = state.manualRate ? '🔓' : '🔒'; if (!state.manualRate) fetchRate(); saveState(); });
elems.usdRate.addEventListener('input', () => updateCalc('config'));
async function fetchRate() { if (!state.manualRate) { el('btn-refresh').style.transform = 'rotate(180deg)'; try { const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL'); const d = await r.json(); elems.usdRate.value = parseFloat(d.USDBRL.bid).toFixed(3); } catch (e) {} setTimeout(() => el('btn-refresh').style.transform = 'rotate(0deg)', 500); updateCalc('config'); } }
el('btn-refresh').addEventListener('click', fetchRate);
[elems.invNum, elems.invDate, elems.invFromName, elems.invFromAddr, elems.invBank].forEach(x => x.addEventListener('input', saveInvoiceData));

loadState(); if (!state.manualRate) fetchRate();