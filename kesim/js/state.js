const STORAGE_KEY = 'coordinate_calculator_storage';

let appData = {};
let committedData = {};
let committedDegreeCalib = 90;
let degreeCalib = 90;
let currentState = {
    model: null,
    configType: null,
    configValue: null
};

function ensureModelDegreeModes(modelName) {
    if (!modelName || !appData[modelName]) return;
    if (appData[modelName].frontDegreeMode !== '12' && appData[modelName].frontDegreeMode !== '34') {
        appData[modelName].frontDegreeMode = '12';
    }
    if (appData[modelName].backDegreeMode !== '12' && appData[modelName].backDegreeMode !== '34') {
        appData[modelName].backDegreeMode = '34';
    }
}

function getCollectionDegreeMode(modelName, configType) {
    if (!modelName || !appData[modelName]) {
        return (configType === 'back') ? '34' : '12';
    }
    ensureModelDegreeModes(modelName);
    if (configType === 'front') return appData[modelName].frontDegreeMode;
    if (configType === 'back') return appData[modelName].backDegreeMode;
    return '12';
}

function setCollectionDegreeMode(modelName, configType, mode) {
    if (!modelName || !appData[modelName]) return;
    if (mode !== '12' && mode !== '34') return;
    ensureModelDegreeModes(modelName);

    if (configType === 'front') {
        appData[modelName].frontDegreeMode = mode;
    } else if (configType === 'back') {
        appData[modelName].backDegreeMode = mode;
    }
}

function persistToLocal() {
    try {
        const payload = {
            appData: appData,
            committedData: committedData,
            committedDegreeCalib: committedDegreeCalib,
            currentState: currentState,
            degreeCalib: degreeCalib
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
        console.error('Failed to save data to localStorage:', err);
    }
}

function loadFromLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            appData = parsed.appData || {};
            Object.keys(appData).forEach(m => ensureModelDegreeModes(m));

            if (parsed.committedData && typeof parsed.committedData === 'object') {
                committedData = JSON.parse(JSON.stringify(parsed.committedData));
            } else {
                committedData = JSON.parse(JSON.stringify(appData));
            }

            currentState = parsed.currentState || { model: null, configType: null, configValue: null };
            if (typeof parsed.degreeCalib === 'number' && isFinite(parsed.degreeCalib)) {
                degreeCalib = parsed.degreeCalib;
            }
            if (typeof parsed.committedDegreeCalib === 'number' && isFinite(parsed.committedDegreeCalib)) {
                committedDegreeCalib = parsed.committedDegreeCalib;
            } else {
                committedDegreeCalib = degreeCalib;
            }

            if (currentState.model && !appData[currentState.model]) {
                currentState = { model: null, configType: null, configValue: null };
            } else if (
                currentState.model &&
                currentState.configType &&
                currentState.configValue &&
                (!appData[currentState.model][`${currentState.configType}s`] ||
                 !appData[currentState.model][`${currentState.configType}s`][currentState.configValue])
            ) {
                currentState.configType = null;
                currentState.configValue = null;
            }
        }
    } catch (err) {
        console.error('Failed to load data from localStorage:', err);
    }
}

function flashSaveFeedback() {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    btn.classList.add('!bg-emerald-600', '!border-emerald-400');
    if (icon) {
        icon.classList.remove('bi-floppy');
        icon.classList.add('bi-check-lg');
    }
    setTimeout(() => {
        btn.classList.remove('!bg-emerald-600', '!border-emerald-400');
        if (icon) {
            icon.classList.remove('bi-check-lg');
            icon.classList.add('bi-floppy');
        }
    }, 600);
}

function buildExportPayload() {
    if (currentState.model && currentState.configType && currentState.configValue) {
        appData[currentState.model][`${currentState.configType}s`][currentState.configValue] = getFormData();
        setCollectionDegreeMode(
            currentState.model,
            currentState.configType,
            document.getElementById('degreeModeSelect').value
        );
        persistToLocal();
    }
    return JSON.stringify({ appData, currentState, degreeCalib }, null, 2);
}

function exportDataFile() {
    const jsonStr = buildExportPayload();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `coordinate-data-${dateTag}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBackupStatus('Backup file exported successfully.');
}

async function copyDataToClipboard() {
    const jsonStr = buildExportPayload();
    try {
        await navigator.clipboard.writeText(jsonStr);
        showBackupStatus('Data copied to clipboard!');
    } catch (e) {
        const area = document.getElementById('importJsonText');
        area.value = jsonStr;
        area.select();
        document.execCommand('copy');
        showBackupStatus('Data copied to clipboard!');
    }
}

function applyImportedPayload(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== 'object' || !parsed.appData) {
            showBackupStatus('Invalid backup format.', true);
            return;
        }
        appData = parsed.appData;
        Object.keys(appData).forEach(m => ensureModelDegreeModes(m));
        committedData = JSON.parse(JSON.stringify(appData));
        currentState = parsed.currentState || { model: null, configType: null, configValue: null };
        if (typeof parsed.degreeCalib === 'number' && isFinite(parsed.degreeCalib)) {
            degreeCalib = parsed.degreeCalib;
        }
        committedDegreeCalib = degreeCalib;
        persistToLocal();
        updateCalibUI();
        renderAllLists();
        loadCurrentFormData();
        showBackupStatus('Data restored successfully!');
        setTimeout(() => toggleBackupModal(), 900);
    } catch (err) {
        showBackupStatus('Could not read data. Check JSON format.', true);
    }
}

function importDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        applyImportedPayload(e.target.result);
        event.target.value = '';
    };
    reader.readAsText(file);
}

function importDataFromText() {
    const rawText = document.getElementById('importJsonText').value.trim();
    if (!rawText) {
        showBackupStatus('Please paste backup data first.', true);
        return;
    }
    applyImportedPayload(rawText);
    document.getElementById('importJsonText').value = '';
}
