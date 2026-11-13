Here is the fully updated calculator.js file configured to meet your exact workflow:
 * On Click Calculate (calculateAction): It performs the calculation, updates the view, and saves all input values (including start/end lengths, X, and Y coordinates) so that when you switch between lines and reload, the inputs are correctly restored.
 * On Click Save (saveAction): When the explicit Save button is clicked, it saves the output data and cleans/resets all the input fields.
Full calculator.js Code
// Global configuration variables
let degreeCalib = 0; // Adjust if your setup requires a degree calibration offset
let currentLineId = "default_line"; // Change or bind this to your active line identifier if needed

/**
 * Formats numeric outputs to a standard decimal representation.
 */
function outPutFixer(val) {
    return typeof val === 'number' && !isNaN(val) ? val.toFixed(4) : val;
}

/**
 * Performs calculation logic, updates the display fields, 
 * and saves all input values so line states persist when switching.
 */
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
    document.getElementById('endY_ro').value = outPrevOutput(newEndY); // or outPutFixer
    document.getElementById('endY_ro').value = outPutFixer(newEndY);
    document.getElementById('len_ro').value = outPutFixer(currentLen);

    let v2i = firstDegree < 0 ? 1 : -1;
    let v2i_rev = secondDegree < 0 ? 1 : -1;

    document.getElementById('deg_1').value = valid ? outPutFixer(firstDegree) + "°" : "0°";
    document.getElementById('deg_2').value = valid ? outPutFixer(firstDegree + 360 * v2i) + "°" : "0°";
    document.getElementById('deg_3').value = valid ? outPutFixer(secondDegree) + "°" : "0°";
    document.getElementById('deg_4').value = valid ? outPutFixer(secondDegree + 360 * v2i_rev) + "°" : "0°";

    // Refresh UI elements
    updateDegreeView();
    updateDialPointers();

    // Automatically save all input values on calculate so they are remembered when switching lines
    saveAction(false); 
}

/**
 * Handles saving inputs/outputs and input cleaning.
 * @param {boolean} isManual - True if the user clicked the Save button, false if triggered automatically.
 */
function saveAction(isManual = true) {
    // Gather all current inputs
    let inputData = {
        startX: document.getElementById('startX_in').value,
        startY: document.getElementById('startY_in').value,
        endX: document.getElementById('endX_in').value,
        endY: document.getElementById('endY_in').value,
        lenStart: document.getElementById('len_start_in').value,
        lenEnd: document.getElementById('len_end_in').value
    };

    if (isManual) {
        // 1. SAVE OUTPUTS (and inputs) when the user clicks the explicit SAVE button
        let outputData = {
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

        // Example persistence logic (LocalStorage using line ID)
        localStorage.setItem('line_saved_outputs_' + currentLineId, JSON.stringify(outputData));
        localStorage.setItem('line_saved_inputs_' + currentLineId, JSON.stringify(inputData));
        console.log("Outputs saved successfully for line:", currentLineId);

        // 2. INPUT CLEANING: Clear/reset all input fields after manual save
        document.getElementById('startX_in').value = '';
        document.getElementById('startY_in').value = '';
        document.getElementById('endX_in').value = '';
        document.getElementById('endY_in').value = '';
        document.getElementById('len_start_in').value = '';
        document.getElementById('len_end_in').value = '';
        
        console.log("Input fields cleaned.");
    } else {
        // Automatic background save of inputs when calculate is pressed (for line switching persistence)
        localStorage.setItem('line_saved_inputs_' + currentLineId, JSON.stringify(inputData));
    }
}

/**
 * Helper function to load saved inputs when switching back to a line.
 */
function loadLineInputs(lineId) {
    currentLineId = lineId;
    let savedInputs = localStorage.getItem('line_saved_inputs_' + currentLineId);
    
    if (savedInputs) {
        let data = JSON.parse(savedInputs);
        document.getElementById('startX_in').value = data.startX || '';
        document.getElementById('startY_in').value = data.startY || '';
        document.getElementById('endX_in').value = data.endX || '';
        document.getElementById('endY_in').value = data.endY || '';
        document.getElementById('len_start_in').value = data.lenStart || '';
        document.getElementById('len_end_in').value = data.lenEnd || '';
    } else {
        // Clear inputs if nothing is saved for this line yet
        document.getElementById('startX_in').value = '';
        document.getElementById('startY_in').value = '';
        document.getElementById('endX_in').value = '';
        document.getElementById('endY_in').value = '';
        document.getElementById('len_start_in').value = '';
        document.getElementById('len_end_in').value = '';
    }
}

