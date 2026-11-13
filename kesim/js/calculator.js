// Global configuration variables
let degreeCalib = 0; // Adjust if your setup requires a degree calibration offset

/**
 * Formats numeric outputs to a standard decimal representation.
 */
function outPutFixer(val) {
    return typeof val === 'number' && !isNaN(val) ? val.toFixed(4) : val;
}

/**
 * Performs calculation logic based on inputs and updates the display fields.
 * This function no longer triggers automatic saving.
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
    
    // NOTE: saveAction(false) has been successfully removed from here.
}

/**
 * Handles explicit saves when the user clicks the save button.
 */
function saveAction(isManual = true) {
    if (isManual) {
        // Add your save/persistence logic here (e.g., localStorage, backend sync)
        console.log("Data explicitly saved by user.");
    }
}
