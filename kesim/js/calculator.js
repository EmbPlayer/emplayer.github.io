function outPutFixer(value) {
    if (isNaN(value) || !isFinite(value)) return "0";
    if (Math.abs(value % 1) > 0.000001) {
        return Number(value).toFixed(3);
    }
    return Math.floor(value).toString();
}

function updateCalibUI() {
    const display = document.getElementById('calibCurrentDisplay');
    if (display) {
        display.textContent = `${outPutFixer(degreeCalib)}°`;
    }

    document.querySelectorAll('.calib-preset-btn').forEach(btn => {
        const presetVal = parseFloat(btn.getAttribute('data-calib'));
        if (Math.abs(presetVal - degreeCalib) < 1e-6) {
            btn.classList.remove('bg-[#475569]', 'text-white');
            btn.classList.add('bg-[#1e293b]', 'text-[#38bdf8]', 'border-[#38bdf8]');
        } else {
            btn.classList.remove('bg-[#1e293b]', 'text-[#38bdf8]', 'border-[#38bdf8]');
            btn.classList.add('bg-[#475569]', 'text-white');
        }
    });
}

function setDegreeCalib(val) {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || !isFinite(parsed)) return;
    degreeCalib = parsed;
    updateCalibUI();
    const hasCoords =
        document.getElementById('startX_in').value !== '' ||
        document.getElementById('startY_in').value !== '' ||
        document.getElementById('endX_in').value !== '' ||
        document.getElementById('endY_in').value !== '';
    if (hasCoords) {
        calculateAction();
    }
}

function applyCustomCalib() {
    const input = document.getElementById('customCalibInput');
    const raw = input.value.trim();
    const parsed = parseFloat(raw);
    if (raw === '' || isNaN(parsed) || !isFinite(parsed)) {
        input.classList.add('error-border');
        setTimeout(() => input.classList.remove('error-border'), 800);
        return;
    }
    input.classList.remove('error-border');
    setDegreeCalib(parsed);
    input.value = '';
}

function updateDialPointers() {
    const mode = document.getElementById('degreeModeSelect').value;
    const p1 = document.getElementById('dialPointer1');
    const p2 = document.getElementById('dialPointer2');
    if (!p1 || !p2) return;

    let raw1 = mode === '34' ? document.getElementById('deg_3').value : document.getElementById('deg_1').value;
    let raw2 = mode === '34' ? document.getElementById('deg_4').value : document.getElementById('deg_2').value;

    let ang1 = parseFloat(raw1);
    let ang2 = parseFloat(raw2);

    if (!isNaN(ang1) && raw1 !== '') {
        p1.style.transform = `translateX(-50%) rotate(${ang1}deg)`;
    } else {
        p1.style.transform = `translateX(-50%) rotate(-45deg)`;
    }

    if (!isNaN(ang2) && raw2 !== '') {
        p2.style.transform = `translateX(-50%) rotate(${ang2}deg)`;
    } else {
        p2.style.transform = `translateX(-50%) rotate(45deg)`;
    }
}

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
}
