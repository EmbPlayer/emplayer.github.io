// ==========================================
// CALCULATOR & DATA MANAGEMENT SCRIPT
// ==========================================

// Helper / Utility functions (Adjust as needed for your project structure)
function outPutFixer(val) {
    return typeof val === 'number' ? val.toFixed(4) : val;
}

function updateDegreeView() {
    // UI update logic for degrees
}

function updateDialPointers() {
    // UI update logic for dials
}

function updateCalibUI() {
    // UI update logic for calibration
}

function persistToLocal() {
    // Save state to localStorage or backend
    if (typeof appData !== 'undefined') {
        localStorage.setItem('appData', JSON.stringify(appData));
    }
}

function flashSaveFeedback() {
    // Visual indicator that save was successful
    console.log("Saved successfully!");
}

// 1. Calculate Action
function calculateAction() {
    let sX = parseFloat(document.getElementById('startX_in').value) || 0;
    let sY = parseFloat(document.getElementById('startY_in').value) || 0;
    let eX = parseFloat(document.getElementById('endX_in').value) || 0;
    let eY = parseFloat(document.getElementById('endY_in').value) || 0;
    
    let sResize = parseFloat(document.getElementById('len_start_in').value) || 0;
    let eResize = parseFloat(document.getElementById('len_end_in').value) || 0;

    let currentLen = Math.sqrt(Math.pow(sX - eX, 2) + Math.pow(sY - eY, 2));

    function functionMath(endN, startN, resizeValue, len) {
        if (len === 0) return 0;
        let n = resizeValue;
        let m = len + n;
        let val = (m * endN - n * startN) / (m - n);
        return isNaN(val) || !isFinite(val) ? 0 : val;
    }

    let newStartX = functionMath(sX, eX, sResize, currentLen);
    let newStartY = functionMath(sY, eY, sResize, currentLen);
    let newEndX = functionMath(eX, sX, eResize, currentLen);
    let newEndY = functionMath(eY, sY, eResize, currentLen);

    currentLen = currentLen + eResize + sResize;

    let i = 1;
    let uzun, kisa;
    
    if (newStartY > newEndY) {
        uzun = { x: newStartX, y: newStartY };
        kisa = { x: newEndX, y: newEndY };
    } else {
        uzun = { x: newEndX, y: newEndY };
        kisa = { x: newStartX, y: newStartY };
    }

    let x = uzun.x;
    let y = kisa.y;

    if (uzun.x > kisa.x) {
        i = 1;
    } else {
        i = -1;
    }

    let secondLendght = Math.sqrt(Math.pow(x - kisa.x, 2) + Math.pow(y - kisa.y, 2));
    let degreeCalib = window.degreeCalib || 0;
    let firstDegree = Math.acos(secondLendght / Math.abs(currentLen)) * (180 / Math.PI) + degreeCalib;
    
    let secondDegree = 0;
    let valid = !isNaN(firstDegree) && isFinite(firstDegree);

    if (valid) {
        if (Math.abs((firstDegree % 180) - 1) < 0.000001) {
            i = i * -1;
            firstDegree = firstDegree - 180 * i;
        } else {
            firstDegree = firstDegree * i;
        }
        secondDegree = firstDegree - 180 * i;
    } else {
        firstDegree = 0;
        secondDegree = 0;
    }

    // Populate read-only output fields
    document.getElementById('startX_ro').value = outPutFixer(newStartX);
    document.getElementById('startY_ro').value = outPutFixer(newStartY);
    document.getElementById('endX_ro').value = outPutFixer(newEndX);
    document.getElementById('endY_ro').value = outPutFixer(newEndY);
    document.getElementById('len_ro').value = outPutFixer(currentLen);

    let v2i = firstDegree < 0 ? 1 : -1;
    let v2i_rev = secondDegree < 0 ? 1 : -1;

    document.getElementById('deg_1').value = valid ? outPutFixer(firstDegree) + "°" : "0°";
    document.getElementById('deg_2').value = valid ? outPutFixer(firstDegree + 360 * v2i) + "°" : "0°";
    document.getElementById('deg_3').value = valid ? outPutFixer(secondDegree) + "°" : "0°";
    document.getElementById('deg_4').value = valid ? outPutFixer(secondDegree + 360 * v2i_rev) + "°" : "0°";

    updateDegreeView();
    updateDialPointers();
    
    // Automatically save current input state on calculation
    if (typeof saveAction === 'function') {
        saveAction(false);
    }
}

// 2. Load Form Data Action (When switching/opening a line)
function loadCurrentFormData() {
    if (!window.currentState || !window.currentState.model || !window.currentState.configType || !window.currentState.configValue) return;
    
    const record = window.appData?.[window.currentState.model]?.[window.currentState.configType + 's']?.[window.currentState.configValue];
    if (!record) return;

    // Load stored input values into input fields (_in)
    document.getElementById('startX_in').value = record.startX_in ?? '';
    document.getElementById('startY_in').value = record.startY_in ?? '';
    document.getElementById('endX_in').value = record.endX_in ?? '';
    document.getElementById('endY_in').value = record.endY_in ?? '';
    document.getElementById('len_start_in').value = record.len_start_in ?? '';
    document.getElementById('len_end_in').value = record.len_end_in ?? '';

    // Clear all output/calculated fields (_ro, deg_*) so the form looks uncalculated when reopened
    document.getElementById('startX_ro').value = '';
    document.getElementById('startY_ro').value = '';
    document.getElementById('endX_ro').value = '';
    document.getElementById('endY_ro').value = '';
    document.getElementById('len_ro').value = '';
    document.getElementById('deg_1').value = '';
    document.getElementById('deg_2').value = '';
    document.getElementById('deg_3').value = '';
    document.getElementById('deg_4').value = '';

    updateCalibUI();
}

// 3. Save Action (When clicking the save button)
function saveAction(isManualClick = true) {
    if (!window.currentState || !window.currentState.model || !window.currentState.configType || !window.currentState.configValue) return;

    // Clear input values in the saved record and store calculated output values instead
    const savedData = {
        startX_in: '',
        startY_in: '',
        endX_in: '',
        endY_in: '',
        len_start_in: '',
        len_end_in: '',
        
        // Save computed output values
        startX_ro: document.getElementById('startX_ro').value,
        startY_ro: document.getElementById('startY_ro').value,
        endX_ro: document.getElementById('endX_ro').value,
        endY_ro: document.getElementById('endY_ro').value,
        len_ro: document.getElementById('len_ro').value,
        deg_1: document.getElementById('deg_1').value,
        deg_2: document.getElementById('deg_2').value,
        deg_3: document.getElementById('deg_3').value,
        deg_4: document.getElementById('deg_4').value
    };

    if (!window.appData[window.currentState.model]) {
        window.appData[window.currentState.model] = {};
    }
    if (!window.appData[window.currentState.model][window.currentState.configType + 's']) {
        window.appData[window.currentState.model][window.currentState.configType + 's'] = {};
    }

    window.appData[window.currentState.model][window.currentState.configType + 's'][window.currentState.configValue] = savedData;
    persistToLocal();

    if (isManualClick) {
        flashSaveFeedback();
    }
}
