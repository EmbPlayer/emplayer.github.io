function getFormData() {
    return {
        startX_ro: document.getElementById('startX_ro').value,
        startX_in: document.getElementById('startX_in').value,
        startY_ro: document.getElementById('startY_ro').value,
        startY_in: document.getElementById('startY_in').value,
        endX_ro: document.getElementById('endX_ro').value,
        endX_in: document.getElementById('endX_in').value,
        endY_ro: document.getElementById('endY_ro').value,
        endY_in: document.getElementById('endY_in').value,
        len_ro: document.getElementById('len_ro').value,
        len_start_in: document.getElementById('len_start_in').value,
        len_end_in: document.getElementById('len_end_in').value,
        deg_1: document.getElementById('deg_1').value,
        deg_2: document.getElementById('deg_2').value,
        deg_3: document.getElementById('deg_3').value,
        deg_4: document.getElementById('deg_4').value
    };
}

// Rebuild deg_2, deg_3, deg_4 from deg_1 using the same formulas as calculateAction().
function reconstructDegreesFromDeg1(deg1Raw, startX, startY, endX, endY) {
    const EMPTY = { deg_1: '', deg_2: '', deg_3: '', deg_4: '' };
    const ZEROS = { deg_1: '0°', deg_2: '0°', deg_3: '0°', deg_4: '0°' };

    if (deg1Raw === undefined || deg1Raw === null || deg1Raw === '') {
        return EMPTY;
    }

    const deg1 = parseFloat(deg1Raw);
    if (isNaN(deg1) || !isFinite(deg1)) {
        return EMPTY;
    }

    const sX = parseFloat(startX) || 0;
    const sY = parseFloat(startY) || 0;
    const eX = parseFloat(endX) || 0;
    const eY = parseFloat(endY) || 0;
    const len = Math.sqrt((sX - eX) * (sX - eX) + (sY - eY) * (sY - eY));

    if (len < 1e-9) {
        return ZEROS;
    }

    let i;
    if (sY > eY) {
        i = sX > eX ? 1 : -1;
    } else {
        i = eX > sX ? 1 : -1;
    }

    const v2i = deg1 < 0 ? 1 : -1;
    const secondDegree = deg1 - 180 * i;
    const v2i_rev = secondDegree < 0 ? 1 : -1;

    return {
        deg_1: deg1Raw,
        deg_2: outPutFixer(deg1 + 360 * v2i) + "°",
        deg_3: outPutFixer(secondDegree) + "°",
        deg_4: outPutFixer(secondDegree + 360 * v2i_rev) + "°"
    };
}

// Rebuild len_ro from the read-only coordinates when it's not stored.
function reconstructLength(startX, startY, endX, endY) {
    const hasCoords =
        (startX !== undefined && startX !== null && startX !== '') ||
        (startY !== undefined && startY !== null && startY !== '') ||
        (endX !== undefined && endX !== null && endX !== '') ||
        (endY !== undefined && endY !== null && endY !== '');

    if (!hasCoords) return '';

    const sX = parseFloat(startX) || 0;
    const sY = parseFloat(startY) || 0;
    const eX = parseFloat(endX) || 0;
    const eY = parseFloat(endY) || 0;
    const dist = Math.sqrt((sX - eX) * (sX - eX) + (sY - eY) * (sY - eY));
    return outPutFixer(dist);
}

function setFormData(data) {
    document.getElementById('startX_ro').value = data.startX_ro || '';
    document.getElementById('startX_in').value = data.startX_in || '';
    document.getElementById('startY_ro').value = data.startY_ro || '';
    document.getElementById('startY_in').value = data.startY_in || '';
    
    document.getElementById('endX_ro').value = data.endX_ro || '';
    document.getElementById('endX_in').value = data.endX_in || '';
    document.getElementById('endY_ro').value = data.endY_ro || '';
    document.getElementById('endY_in').value = data.endY_in || '';

    // len_ro: use stored value if present; otherwise reconstruct from coordinates.
    let lenRo = data.len_ro;
    if (lenRo === undefined || lenRo === null || lenRo === '') {
        lenRo = reconstructLength(data.startX_ro, data.startY_ro, data.endX_ro, data.endY_ro);
    }
    document.getElementById('len_ro').value = lenRo;
    document.getElementById('len_start_in').value = data.len_start_in || '';
    document.getElementById('len_end_in').value = data.len_end_in || '';

    // Degrees: use stored values if all 4 exist; otherwise reconstruct from deg_1.
    const hasAllDegs = data.deg_1 && data.deg_2 && data.deg_3 && data.deg_4;
    let d1, d2, d3, d4;
    if (hasAllDegs) {
        d1 = data.deg_1;
        d2 = data.deg_2;
        d3 = data.deg_3;
        d4 = data.deg_4;
    } else {
        const r = reconstructDegreesFromDeg1(
            data.deg_1,
            data.startX_ro,
            data.startY_ro,
            data.endX_ro,
            data.endY_ro
        );
        d1 = r.deg_1;
        d2 = r.deg_2;
        d3 = r.deg_3;
        d4 = r.deg_4;
    }
    document.getElementById('deg_1').value = d1;
    document.getElementById('deg_2').value = d2;
    document.getElementById('deg_3').value = d3;
    document.getElementById('deg_4').value = d4;

    const mode = getCollectionDegreeMode(currentState.model, currentState.configType);
    document.getElementById('degreeModeSelect').value = mode;
    updateDegreeView();
    updateDialPointers();
}

function loadCurrentFormData() {
    if (currentState.model && currentState.configType && currentState.configValue) {
        const data = appData[currentState.model][`${currentState.configType}s`][currentState.configValue] || {};
        setFormData(data);
    } else {
        setFormData({}); 
    }
}

function reloadCurrentData() {
    if (!currentState.model || !currentState.configType || !currentState.configValue) {
        alert("No model/config is currently selected. Please select one first.");
        return;
    }

    const model = currentState.model;
    const type = currentState.configType;
    const value = currentState.configValue;

    if (committedData[model] &&
        committedData[model][`${type}s`] &&
        committedData[model][`${type}s`][value] !== undefined) {
        appData[model][`${type}s`][value] = JSON.parse(
            JSON.stringify(committedData[model][`${type}s`][value])
        );
    } else {
        appData[model][`${type}s`][value] = {};
    }

    if (committedData[model]) {
        if (committedData[model].frontDegreeMode === '12' || committedData[model].frontDegreeMode === '34') {
            appData[model].frontDegreeMode = committedData[model].frontDegreeMode;
        }
        if (committedData[model].backDegreeMode === '12' || committedData[model].backDegreeMode === '34') {
            appData[model].backDegreeMode = committedData[model].backDegreeMode;
        }
    }

    degreeCalib = committedDegreeCalib;

    updateCalibUI();
    loadCurrentFormData();
    persistToLocal();

    const menu = document.getElementById('dropdownMenu');
    if (menu && !menu.classList.contains('hidden')) {
        toggleMenu();
    }
}

function cleanAllInputFields() {
    Object.keys(appData).forEach(modelName => {
        const model = appData[modelName];
        if (!model) return;
        ['fronts', 'backs'].forEach(plural => {
            if (model[plural]) {
                Object.keys(model[plural]).forEach(configKey => {
                    const cfg = model[plural][configKey];
                    if (cfg && typeof cfg === 'object') {
                        cfg.startX_in = '';
                        cfg.startY_in = '';
                        cfg.endX_in = '';
                        cfg.endY_in = '';
                        cfg.len_start_in = '';
                        cfg.len_end_in = '';
                    }
                });
            }
        });
    });
}

function onDegreeModeChange() {
    updateDegreeView();
    updateDialPointers();
    const mode = document.getElementById('degreeModeSelect').value;
    if (currentState.model && (currentState.configType === 'front' || currentState.configType === 'back')) {
        setCollectionDegreeMode(currentState.model, currentState.configType, mode);
        persistToLocal();
    }
}

function updateDegreeView() {
    const mode = document.getElementById('degreeModeSelect').value;
    const d1 = document.getElementById('deg_1');
    const d2 = document.getElementById('deg_2');
    const d3 = document.getElementById('deg_3');
    const d4 = document.getElementById('deg_4');

    if (mode === '34') {
        d1.classList.add('hidden');
        d2.classList.add('hidden');
        d3.classList.remove('hidden');
        d4.classList.remove('hidden');
    } else {
        d1.classList.remove('hidden');
        d2.classList.remove('hidden');
        d3.classList.add('hidden');
        d4.classList.add('hidden');
    }
}

function toggleBackupModal() {
    const modal = document.getElementById('backupModal');
    const status = document.getElementById('backupStatus');
    status.classList.add('hidden');
    modal.classList.toggle('hidden');
}

function showBackupStatus(msg, isError = false) {
    const status = document.getElementById('backupStatus');
    status.textContent = msg;
    status.className = `text-xs text-center font-bold py-1.5 px-2 rounded-sm ${
        isError ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    }`;
    status.classList.remove('hidden');
}

function saveAction(manualSave = false) {
    const selectedMode = document.getElementById('degreeModeSelect').value;

    if (Object.keys(appData).length === 0) {
        const baseModelName = "Base Model";
        appData[baseModelName] = {
            fronts: { "1": {} },
            backs: {},
            frontDegreeMode: selectedMode,
            backDegreeMode: '34'
        };
        
        currentState.model = baseModelName;
        currentState.configType = "front";
        currentState.configValue = "1";
        
        appData[baseModelName].fronts["1"] = getFormData();

        if (manualSave) {
            cleanAllInputFields();
            committedData = JSON.parse(JSON.stringify(appData));
            committedDegreeCalib = degreeCalib;
            loadCurrentFormData();
        }

        persistToLocal();
        if (manualSave) flashSaveFeedback();

        renderAllLists();
        toggleVerticalList('list-models', document.querySelector('.tab-btn'));
        toggleMenu(); 
        updateScrollPadding();
        return;
    }

    if (currentState.model && currentState.configType && currentState.configValue) {
        appData[currentState.model][`${currentState.configType}s`][currentState.configValue] = getFormData();
        setCollectionDegreeMode(currentState.model, currentState.configType, selectedMode);

        if (manualSave) {
            cleanAllInputFields();
            committedData = JSON.parse(JSON.stringify(appData));
            committedDegreeCalib = degreeCalib;
            loadCurrentFormData();
        }

        persistToLocal();
        if (manualSave) flashSaveFeedback();
    } else {
        const firstModel = Object.keys(appData)[0];
        currentState.model = firstModel;
        const modelData = appData[firstModel];
        
        let saved = false;
        if (Object.keys(modelData.fronts).length > 0) {
            currentState.configType = "front";
            currentState.configValue = Object.keys(modelData.fronts)[0];
            saved = true;
        } else if (Object.keys(modelData.backs).length > 0) {
            currentState.configType = "back";
            currentState.configValue = Object.keys(modelData.backs)[0];
            saved = true;
        } else {
            currentState.configType = "front";
            currentState.configValue = "1";
            modelData.fronts["1"] = {};
            saved = true;
        }

        if (saved) {
            appData[currentState.model][`${currentState.configType}s`][currentState.configValue] = getFormData();
            setCollectionDegreeMode(currentState.model, currentState.configType, selectedMode);

            if (manualSave) {
                cleanAllInputFields();
                committedData = JSON.parse(JSON.stringify(appData));
                committedDegreeCalib = degreeCalib;
                loadCurrentFormData();
            }

            persistToLocal();
            if (manualSave) flashSaveFeedback();
            renderAllLists();
        }
    }
}

function renderAllLists() {
    renderList('list-models', Object.keys(appData), 'model');
    
    if (currentState.model && appData[currentState.model]) {
        renderList('list-front', Object.keys(appData[currentState.model].fronts), 'front');
        renderList('list-back', Object.keys(appData[currentState.model].backs), 'back');
    } else {
        renderList('list-front', [], 'front');
        renderList('list-back', [], 'back');
    }
    updateDisplayer();
}

function renderList(listId, items, type) {
    const list = document.getElementById(listId);
    list.innerHTML = ''; 

    if ((type === 'front' || type === 'back') && !currentState.model) {
        const msg = document.createElement('div');
        msg.className = "text-center text-sm text-slate-400 p-2 mb-2";
        msg.textContent = "Please select a Model first.";
        list.appendChild(msg);
        return; 
    }

    items.sort((a, b) => {
        if (type === 'front' || type === 'back') return parseInt(a, 10) - parseInt(b, 10);
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    items.forEach(name => {
        const isSelected = (type === 'model' && currentState.model === name) || 
                           (type === currentState.configType && currentState.configValue === name);
        const textClass = isSelected ? "text-[#38bdf8] font-bold" : "text-white hover:text-[#38bdf8]";

        const newItem = document.createElement('div');
        newItem.className = "list-item w-full bg-[#475569] px-3 py-1.5 rounded-sm border border-black/30 text-sm shadow-sm mb-2";
        newItem.innerHTML = `
            <div class="flex flex-row flex-nowrap items-center w-full gap-1 action-buttons">
                <span class="item-name flex-1 w-0 truncate pr-2 cursor-pointer transition-colors ${textClass}" onclick="selectItem('${type}', '${name}')">${name}</span>
                <button onclick="startRename(this, '${type}', '${name}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-blue-400 hover:bg-blue-400/20 rounded-sm transition-colors" title="Rename"><i class="bi bi-pencil-fill text-xs"></i></button>
                <button onclick="deleteItem('${type}', '${name}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-red-400 hover:bg-red-400/20 rounded-sm transition-colors" title="Delete"><i class="bi bi-x-lg text-xs"></i></button>
            </div>
        `;
        list.appendChild(newItem);
    });

    const addContainer = document.createElement('div');
    addContainer.className = "add-container mt-auto";
    addContainer.innerHTML = `
        <button onclick="startAdd('${type}')" class="w-full bg-[#334155] hover:bg-[#475569] border border-dashed border-[#38bdf8] text-[#38bdf8] text-sm py-2 rounded-sm transition-colors">
            + ADD ${type.toUpperCase()}
        </button>
    `;
    list.appendChild(addContainer);
}

function updateDisplayer() {
    const displayModel = document.getElementById('displayModel');
    const displayConfig = document.getElementById('displayConfig');

    if (currentState.model) {
        displayModel.textContent = currentState.model;
        displayModel.classList.remove('text-slate-500');
    } else {
        displayModel.textContent = "NO MODEL SELECTED";
        displayModel.classList.add('text-slate-500');
    }

    if (currentState.configType && currentState.configValue) {
        displayConfig.textContent = `${currentState.configType.toUpperCase()} - ${currentState.configValue}`;
        displayConfig.classList.remove('text-slate-500');
    } else {
        displayConfig.textContent = "NO CONFIG SELECTED";
        displayConfig.classList.add('text-slate-500');
    }
}

function selectItem(type, name) {
    if (currentState.model && currentState.configType && currentState.configValue) {
        if (appData[currentState.model] &&
            appData[currentState.model][`${currentState.configType}s`]) {
            appData[currentState.model][`${currentState.configType}s`][currentState.configValue] = getFormData();
        }
    }

    if (type === 'model' && name === currentState.model) {
        toggleMenu();
        return;
    }
    if ((type === 'front' || type === 'back') &&
        type === currentState.configType &&
        name === currentState.configValue) {
        toggleMenu();
        return;
    }

    if (type === 'model') {
        currentState.model = name;
        currentState.configType = null;
        currentState.configValue = null;
        setFormData({}); 
    } else if (type === 'front' || type === 'back') {
        currentState.configType = type;
        currentState.configValue = name;
        loadCurrentFormData(); 
    }
    
    persistToLocal();
    renderAllLists();
    toggleMenu(); 
}

function updateScrollPadding() {
    const menu = document.getElementById('dropdownMenu');
    const scrollArea = document.getElementById('mainScrollArea');
    setTimeout(() => {
        if (menu.classList.contains('hidden')) {
            scrollArea.style.paddingBottom = '12px';
        } else {
            scrollArea.style.paddingBottom = `${menu.offsetHeight + 16}px`;
        }
    }, 20);
}

function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    const icon = document.getElementById('menuIcon');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
        
        document.getElementById('listContainer').classList.add('hidden');
        document.getElementById('listContainer').classList.remove('flex');
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('bg-[#1e293b]', 'text-[#38bdf8]');
            btn.classList.add('bg-[#475569]', 'text-white');
        });
    }
    updateScrollPadding();
}

function toggleVerticalList(listId, btnElement) {
    const listContainer = document.getElementById('listContainer');
    const targetList = document.getElementById(listId);
    
    const isAlreadyOpen = !targetList.classList.contains('hidden') && !listContainer.classList.contains('hidden');

    document.querySelectorAll('.list-content').forEach(list => {
        list.classList.add('hidden');
        list.classList.remove('flex');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-[#1e293b]', 'text-[#38bdf8]');
        btn.classList.add('bg-[#475569]', 'text-white');
    });

    if (isAlreadyOpen) {
        listContainer.classList.add('hidden');
        listContainer.classList.remove('flex');
        updateScrollPadding();
        return;
    }

    listContainer.classList.remove('hidden');
    listContainer.classList.add('flex');
    targetList.classList.remove('hidden');
    targetList.classList.add('flex');

    btnElement.classList.remove('bg-[#475569]', 'text-white');
    btnElement.classList.add('bg-[#1e293b]', 'text-[#38bdf8]');
    
    updateScrollPadding();
}

function getArray(type) {
    if (type === 'model') return Object.keys(appData);
    if (currentState.model && appData[currentState.model]) {
        return Object.keys(appData[currentState.model][`${type}s`]);
    }
    return [];
}

function startAdd(type) {
    const listId = type === 'model' ? 'list-models' : (type === 'front' ? 'list-front' : 'list-back');
    const list = document.getElementById(listId);
    if (!list) return;

    const addBtnContainer = list.querySelector('.add-container');
    addBtnContainer.classList.add('hidden');

    const inputRow = document.createElement('div');
    inputRow.className = "add-input-row w-full bg-[#1e293b] border-2 border-[#38bdf8] px-3 py-1.5 rounded-sm text-white text-sm shadow-inner mb-2";
    inputRow.innerHTML = `
        <div class="flex flex-row flex-nowrap items-center w-full gap-1 action-buttons">
            <input type="text" class="inline-input flex-1 w-0 py-1 pr-2" placeholder="Type here..." autocomplete="off">
            <button onclick="saveNewItem(this, '${type}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-green-400 hover:bg-green-400/20 rounded-sm transition-colors" title="Save"><i class="bi bi-check-lg text-sm"></i></button>
            <button onclick="cancelAdd(this, '${type}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-red-400 hover:bg-red-400/20 rounded-sm transition-colors" title="Cancel"><i class="bi bi-x-lg text-xs"></i></button>
        </div>
    `;
    
    list.insertBefore(inputRow, addBtnContainer);
    const inputField = inputRow.querySelector('input');
    inputField.focus();

    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveNewItem(this, type);
    });
    updateScrollPadding();
}

function cancelAdd(btn, type) {
    btn.closest('.add-input-row').remove();
    const listId = type === 'model' ? 'list-models' : (type === 'front' ? 'list-front' : 'list-back');
    const list = document.getElementById(listId);
    if (list) {
        list.querySelector('.add-container').classList.remove('hidden');
    }
    updateScrollPadding();
}

function saveNewItem(btn, type) {
    const row = btn.closest('.add-input-row');
    const input = row.querySelector('input');
    let val = input.value.trim();
    const currentItems = getArray(type);
    
    if (val === "") { input.classList.add('error-border'); return; }

    if (type === 'front' || type === 'back') {
        let parsedNum = parseInt(val, 10);
        if (isNaN(parsedNum) || parsedNum < 1 || val !== parsedNum.toString()) {
            input.classList.add('error-border'); return;
        }
        val = parsedNum.toString();
    }

    if (currentItems.map(i => i.toLowerCase()).includes(val.toLowerCase())) { 
        input.classList.add('error-border'); return; 
    }

    if (type === 'model') {
        appData[val] = {
            fronts: {},
            backs: {},
            frontDegreeMode: '12',
            backDegreeMode: '34'
        };
        committedData[val] = {
            fronts: {},
            backs: {},
            frontDegreeMode: '12',
            backDegreeMode: '34'
        };
    } else {
        appData[currentState.model][`${type}s`][val] = {}; 
        if (committedData[currentState.model] && committedData[currentState.model][`${type}s`]) {
            committedData[currentState.model][`${type}s`][val] = {};
        }
    }

    persistToLocal();
    renderAllLists();
    updateScrollPadding();
}

function startRename(btn, type, oldName) {
    const item = btn.closest('.list-item');
    item.className = "list-item w-full bg-[#1e293b] border-2 border-[#38bdf8] px-3 py-1.5 rounded-sm text-white text-sm shadow-sm mb-2";
    item.innerHTML = `
        <div class="flex flex-row flex-nowrap items-center w-full gap-1 action-buttons">
            <input type="text" class="inline-input flex-1 w-0 py-1 pr-2" value="${oldName}" autocomplete="off">
            <button onclick="saveRename(this, '${type}', '${oldName}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-green-400 hover:bg-green-400/20 rounded-sm transition-colors" title="Save"><i class="bi bi-check-lg text-sm"></i></button>
            <button onclick="cancelRename(this, '${type}')" class="w-7 h-7 flex items-center justify-center shrink-0 text-red-400 hover:bg-red-400/20 rounded-sm transition-colors" title="Cancel"><i class="bi bi-x-lg text-xs"></i></button>
        </div>
    `;
    
    const inputField = item.querySelector('input');
    inputField.focus();
    inputField.setSelectionRange(0, inputField.value.length);
    inputField.addEventListener('keypress', function(e) { if (e.key === 'Enter') saveRename(this, type, oldName); });
    updateScrollPadding();
}

function cancelRename(btn, type) {
    renderAllLists(); 
    updateScrollPadding();
}

function saveRename(btn, type, oldName) {
    const item = btn.closest('.list-item');
    const input = item.querySelector('input');
    let val = input.value.trim();
    const currentItems = getArray(type);
    
    if (val.toLowerCase() === oldName.toLowerCase()) { cancelRename(btn, type); return; }
    if (val === "") { input.classList.add('error-border'); return; }

    if (type === 'front' || type === 'back') {
        let parsedNum = parseInt(val, 10);
        if (isNaN(parsedNum) || parsedNum < 1 || val !== parsedNum.toString()) {
            input.classList.add('error-border'); return;
        }
        val = parsedNum.toString();
    }

    if (currentItems.map(i => i.toLowerCase()).includes(val.toLowerCase())) { 
        input.classList.add('error-border'); return; 
    }

    if (type === 'model') {
        appData[val] = appData[oldName];
        delete appData[oldName];
        if (committedData[oldName]) {
            committedData[val] = committedData[oldName];
            delete committedData[oldName];
        }
        if (currentState.model === oldName) currentState.model = val;
    } else {
        appData[currentState.model][`${type}s`][val] = appData[currentState.model][`${type}s`][oldName];
        delete appData[currentState.model][`${type}s`][oldName];

        if (committedData[currentState.model] && committedData[currentState.model][`${type}s`]) {
            const oldCommitted = committedData[currentState.model][`${type}s`][oldName];
            if (oldCommitted !== undefined) {
                committedData[currentState.model][`${type}s`][val] = oldCommitted;
            }
            delete committedData[currentState.model][`${type}s`][oldName];
        }

        if (currentState.configType === type && currentState.configValue === oldName) {
            currentState.configValue = val;
        }
    }

    persistToLocal();
    renderAllLists();
    updateScrollPadding();
}

function deleteItem(type, name) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    if (type === 'model') {
        delete appData[name];
        if (committedData[name]) delete committedData[name];
        if (currentState.model === name) {
            currentState.model = null;
            currentState.configType = null;
            currentState.configValue = null;
            setFormData({});
        }
    } else {
        delete appData[currentState.model][`${type}s`][name];
        if (committedData[currentState.model] && committedData[currentState.model][`${type}s`]) {
            delete committedData[currentState.model][`${type}s`][name];
        }

        if (currentState.configType === type && currentState.configValue === name) {
            currentState.configType = null;
            currentState.configValue = null;
            setFormData({});
        }
    }

    persistToLocal();
    renderAllLists();
    updateScrollPadding();
}

// Global numeric validations setup on load with 500ms debounce delay
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocal();
    updateCalibUI();
    renderAllLists();
    loadCurrentFormData();
    updateScrollPadding();

    const numericInputs = document.querySelectorAll('.numeric-input');
    numericInputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.id === 'customCalibInput') {
                applyCustomCalib();
                return;
            }
            if ([46, 8, 9, 27, 13, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                (e.ctrlKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1) ||
                (e.metaKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1)) {
                return;
            }
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                if (e.key !== '.' && e.key !== '-') e.preventDefault();
            }
            if (e.key === '.' && this.value.includes('.')) e.preventDefault();
            if (e.key === '-') {
                if (this.selectionStart !== 0 || this.value.includes('-')) e.preventDefault();
            }
        });

        input.addEventListener('input', function() {
            const currentInput = this;
            
            if (currentInput._typingTimeout) {
                clearTimeout(currentInput._typingTimeout);
            }

            currentInput._typingTimeout = setTimeout(() => {
                let val = currentInput.value;
                val = val.replace(/[^0-9.-]/g, '');
                let isNegative = val.startsWith('-');
                if (isNegative) val = val.substring(1);
                val = val.replace(/-/g, '');
                let parts = val.split('.');
                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                    val = val.replace(/^0+(?=\d)/, '');
                } else if (val.startsWith('.')) {
                    val = '0' + val;
                }
                if (isNegative) currentInput.value = '-' + val;
                else currentInput.value = val;
            }, 500);
        });
    });
});
