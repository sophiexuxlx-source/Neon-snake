/**
 * TaxFlow Canada - Marginal Tax & RRSP Planner
 * Personal Income Tax Brackets (2025 Tax Year)
 */

// ==========================================
// TAX BRACKET DEFINITIONS
// ==========================================

const taxData = {
    // Federal Brackets
    federal: [
        { threshold: 57375, rate: 0.145 },
        { threshold: 114750, rate: 0.205 },
        { threshold: 177882, rate: 0.260 },
        { threshold: 253414, rate: 0.290 },
        { threshold: null, rate: 0.330 }
    ],
    // Provincial Brackets
    provinces: {
        ON: {
            name: "Ontario",
            brackets: [
                { threshold: 57375, rate: 0.0505 },
                { threshold: 114750, rate: 0.0915 },
                { threshold: 177882, rate: 0.1116 },
                { threshold: 253414, rate: 0.1216 },
                { threshold: null, rate: 0.1316 }
            ]
        },
        BC: {
            name: "British Columbia",
            brackets: [
                { threshold: 49279, rate: 0.0506 },
                { threshold: 98560, rate: 0.0770 },
                { threshold: 113158, rate: 0.1050 },
                { threshold: 137407, rate: 0.1229 },
                { threshold: 186306, rate: 0.1470 },
                { threshold: null, rate: 0.2050 }
            ]
        },
        QC: {
            name: "Quebec",
            brackets: [
                { threshold: 53255, rate: 0.1400 },
                { threshold: 106495, rate: 0.1900 },
                { threshold: 129590, rate: 0.2400 },
                { threshold: null, rate: 0.2575 }
            ]
        },
        AB: {
            name: "Alberta",
            brackets: [
                { threshold: 60000, rate: 0.0800 },
                { threshold: 151234, rate: 0.1000 },
                { threshold: 216048, rate: 0.1200 },
                { threshold: 360080, rate: 0.1300 },
                { threshold: null, rate: 0.1400 }
            ]
        }
    }
};

// ==========================================
// CORE TAX CALCULATION ENGINE
// ==========================================

/**
 * Calculates basic progressive tax for a set of brackets
 */
function calculateBasicTax(income, brackets) {
    if (income <= 0) return 0;
    
    let tax = 0;
    let remaining = income;
    let prevThreshold = 0;
    
    for (let i = 0; i < brackets.length; i++) {
        const threshold = brackets[i].threshold;
        const rate = brackets[i].rate;
        
        if (threshold === null || remaining <= (threshold - prevThreshold)) {
            tax += remaining * rate;
            break;
        } else {
            const chunk = threshold - prevThreshold;
            tax += chunk * rate;
            remaining -= chunk;
            prevThreshold = threshold;
        }
    }
    return tax;
}

/**
 * Calculates Ontario Health Premium
 */
function calculateOntarioHealthPremium(income) {
    if (income <= 20000) return 0;
    if (income <= 36000) return Math.min(300, (income - 20000) * 0.06);
    if (income <= 48000) return 300 + Math.min(150, (income - 36000) * 0.06);
    if (income <= 72000) return 450 + Math.min(150, (income - 48000) * 0.06);
    if (income <= 200000) return 600 + Math.min(150, (income - 72000) * 0.25);
    return 750 + Math.min(150, (income - 200000) * 0.25);
}

/**
 * Computes full tax breakdown (federal and provincial) for a given income
 */
function calculateTaxBreakdown(income, provinceCode) {
    if (income <= 0) {
        return { federalTax: 0, provincialTax: 0, totalTax: 0 };
    }

    // 1. Calculate Basic Federal Tax
    let federalTax = calculateBasicTax(income, taxData.federal);

    // 2. Calculate Basic Provincial Tax
    const provData = taxData.provinces[provinceCode];
    let provincialTax = calculateBasicTax(income, provData.brackets);

    // 3. Apply Province-Specific Adjustments
    if (provinceCode === "ON") {
        // Ontario Surtax
        // 20% on basic provincial tax exceeding $6,350
        // Plus 36% on basic provincial tax exceeding $8,128
        let surtax = 0;
        if (provincialTax > 6350) surtax += (provincialTax - 6350) * 0.20;
        if (provincialTax > 8128) surtax += (provincialTax - 8128) * 0.36;
        provincialTax += surtax;

        // Add Ontario Health Premium
        provincialTax += calculateOntarioHealthPremium(income);
    } 
    else if (provinceCode === "QC") {
        // Quebec Federal Tax Abatement: 16.5% reduction in basic federal tax
        federalTax = federalTax * (1 - 0.165);
    }

    return {
        federalTax: federalTax,
        provincialTax: provincialTax,
        totalTax: federalTax + provincialTax
    };
}

/**
 * Estimates the combined marginal tax rate by calculating tax for income + $1
 */
function getMarginalTaxRate(income, provinceCode) {
    if (income < 0) return 0;
    
    // We compute the tax delta for a $100 range to smooth out any small rounding issues
    const delta = 100;
    const taxCurrent = calculateTaxBreakdown(income, provinceCode).totalTax;
    const taxFuture = calculateTaxBreakdown(income + delta, provinceCode).totalTax;
    
    return ((taxFuture - taxCurrent) / delta) * 100;
}

// ==========================================
// UI CONTROLLER
// ==========================================

const formatCAD = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatPercent = new Intl.NumberFormat('en-CA', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function updateDashboard() {
    const incomeInput = document.getElementById("annual-income");
    const provinceSelect = document.getElementById("province");
    const rrspInput = document.getElementById("rrsp-contribution");

    const rawIncome = parseFloat(incomeInput.value) || 0;
    const province = provinceSelect.value;
    const rawRrsp = parseFloat(rrspInput.value) || 0;

    // Constrain RRSP contribution to not exceed income
    const rrspContribution = Math.min(rawIncome, rawRrsp);
    const postRrspIncome = Math.max(0, rawIncome - rrspContribution);

    // Calculate tax profiles
    const taxBefore = calculateTaxBreakdown(rawIncome, province);
    const taxAfter = calculateTaxBreakdown(postRrspIncome, province);
    
    const marginalRate = getMarginalTaxRate(rawIncome, province);
    const rrspSavings = taxBefore.totalTax - taxAfter.totalTax;
    
    // Effective savings rate (prevent division by zero)
    const savingsRate = rrspContribution > 0 ? (rrspSavings / rrspContribution) * 100 : 0;
    
    const averageRateBefore = rawIncome > 0 ? (taxBefore.totalTax / rawIncome) * 100 : 0;
    const averageRateAfter = postRrspIncome > 0 ? (taxAfter.totalTax / postRrspIncome) * 100 : 0;

    // Update KPI panels
    document.getElementById("val-marginal-rate").textContent = `${marginalRate.toFixed(2)}%`;
    document.getElementById("lbl-marginal-desc").textContent = `Combined tax paid on your next dollar at $${formatCAD.format(rawIncome).replace("$", "")}`;
    
    document.getElementById("val-rrsp-savings").textContent = formatCAD.format(rrspSavings);
    document.getElementById("lbl-rrsp-efficiency").textContent = `Savings rate of ${savingsRate.toFixed(2)}% on your deduction`;
    
    document.getElementById("val-net-tax").textContent = formatCAD.format(taxAfter.totalTax);
    document.getElementById("lbl-tax-reduction").textContent = `Reduced from ${formatCAD.format(taxBefore.totalTax)} (Saved ${formatCAD.format(rrspSavings)})`;
    
    document.getElementById("val-average-rate").textContent = `${averageRateAfter.toFixed(2)}%`;
    document.getElementById("lbl-take-home").textContent = `Take-home pay: ${(100 - averageRateAfter).toFixed(2)}% of taxable income`;

    // Update Comparison Table
    document.getElementById("table-income-before").textContent = formatCAD.format(rawIncome);
    document.getElementById("table-income-after").textContent = formatCAD.format(postRrspIncome);
    document.getElementById("table-income-diff").textContent = formatCAD.format(-rrspContribution);

    document.getElementById("table-fed-before").textContent = formatCAD.format(taxBefore.federalTax);
    document.getElementById("table-fed-after").textContent = formatCAD.format(taxAfter.federalTax);
    document.getElementById("table-fed-diff").textContent = formatCAD.format(taxAfter.federalTax - taxBefore.federalTax);

    const provLabel = province === "QC" ? "Quebec Tax" : `${taxData.provinces[province].name} Tax`;
    document.getElementById("lbl-prov-tax-name").textContent = provLabel;
    
    document.getElementById("table-prov-before").textContent = formatCAD.format(taxBefore.provincialTax);
    document.getElementById("table-prov-after").textContent = formatCAD.format(taxAfter.provincialTax);
    document.getElementById("table-prov-diff").textContent = formatCAD.format(taxAfter.provincialTax - taxBefore.provincialTax);

    document.getElementById("table-total-before").textContent = formatCAD.format(taxBefore.totalTax);
    document.getElementById("table-total-after").textContent = formatCAD.format(taxAfter.totalTax);
    const taxDiff = taxAfter.totalTax - taxBefore.totalTax;
    document.getElementById("table-total-diff").textContent = formatCAD.format(taxDiff);
    document.getElementById("table-total-diff").className = taxDiff < 0 ? "text-positive" : ""; // tax reduction is positive for client

    const disposableBefore = rawIncome - taxBefore.totalTax;
    const disposableAfter = postRrspIncome - taxAfter.totalTax; // disposable income after taxes, pre-RRSP contribution cash out
    document.getElementById("table-disposable-before").textContent = formatCAD.format(disposableBefore);
    document.getElementById("table-disposable-after").textContent = formatCAD.format(disposableAfter);
    document.getElementById("table-disposable-diff").textContent = formatCAD.format(disposableAfter - disposableBefore);
    document.getElementById("table-disposable-diff").className = (disposableAfter - disposableBefore) >= 0 ? "text-positive" : "text-negative";

    // Update Split Chart Visuals
    const totalTax = taxAfter.totalTax;
    let fedPercent = 50;
    let provPercent = 50;

    if (totalTax > 0) {
        fedPercent = (taxAfter.federalTax / totalTax) * 100;
        provPercent = (taxAfter.provincialTax / totalTax) * 100;
    }

    document.getElementById("chart-fed-bar").style.width = `${fedPercent}%`;
    document.getElementById("chart-fed-label").textContent = `Federal (${fedPercent.toFixed(0)}%)`;
    
    document.getElementById("chart-prov-bar").style.width = `${provPercent}%`;
    document.getElementById("chart-prov-label").textContent = `Provincial (${provPercent.toFixed(0)}%)`;
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // Perform initial calculation
    updateDashboard();

    // Bind event listeners
    const calcBtn = document.getElementById("btn-calculate");
    if (calcBtn) {
        calcBtn.addEventListener("click", updateDashboard);
    }

    // Recalculate on inputs change for live interaction experience
    const inputs = ["annual-income", "province", "rrsp-contribution"];
    inputs.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener("input", updateDashboard);
            elem.addEventListener("change", updateDashboard);
        }
    });
});
