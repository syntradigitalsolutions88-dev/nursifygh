export type MassUnit = 'mcg' | 'mg' | 'g';
export type FrequencyCode = 'STAT' | 'OD' | 'BD' | 'TDS' | 'QID' | 'Q4H';

export interface CalculationResult {
    primaryValue: number;
    primaryUnit: string;
    secondaryValue?: number;
    secondaryUnit?: string;
    steps: string[];
    clinicalAlert?: string;
}

export interface CalcDrillQuestion {
    id: string;
    category: 'Oral/Liquid' | 'Weight-Based' | 'IV Drip Rate' | 'Reconstitution' | 'Obstetric Infusion';
    stem: string;
    answer: number;
    unit: string;
    tolerance: number;
    rationale: string[];
}

const MASS_TO_MG: Record<MassUnit, number> = {
    mcg: 0.001,
    mg: 1,
    g: 1000,
};

const DOSES_PER_DAY: Record<FrequencyCode, number> = {
    STAT: 1,
    OD: 1,
    BD: 2,
    TDS: 3,
    QID: 4,
    Q4H: 6,
};

export function normalizeToMg(value: number, unit: MassUnit): number {
    return value * MASS_TO_MG[unit];
}

/**
 * 1. Tablets, Capsules & Oral Suspensions (Desired / Have * Vehicle)
 */
export function calculateDesiredOverHave(params: {
    orderedDose: number;
    orderedUnit: MassUnit;
    availableStrength: number;
    availableUnit: MassUnit;
    vehicleVolume: number; // e.g., 1 for tablet, 5 for 5 mL syrup
    vehicleLabel: 'tablet(s)' | 'capsule(s)' | 'mL';
}): CalculationResult {
    const orderedMg = normalizeToMg(params.orderedDose, params.orderedUnit);
    const availableMg = normalizeToMg(params.availableStrength, params.availableUnit);

    if (availableMg <= 0) throw new Error('Available strength must be greater than zero.');

    const result = (orderedMg / availableMg) * params.vehicleVolume;
    const rounded = Number(result.toFixed(2));

    const steps: string[] = [];
    if (params.orderedUnit !== params.availableUnit) {
        steps.push(
            `1. Convert units: ${params.orderedDose} ${params.orderedUnit} = ${orderedMg} mg; ${params.availableStrength} ${params.availableUnit} = ${availableMg} mg.`
        );
    }
    steps.push(
        `Formula: (Desired ÷ Have) × Vehicle = (${orderedMg} mg ÷ ${availableMg} mg) × ${params.vehicleVolume} ${params.vehicleLabel} = ${rounded} ${params.vehicleLabel}`
    );

    return {
        primaryValue: rounded,
        primaryUnit: params.vehicleLabel,
        steps,
        clinicalAlert:
            params.vehicleLabel === 'tablet(s)' && rounded % 0.5 !== 0
                ? 'Check whether tablet is scored; consider liquid formulation if fractional dose cannot be split accurately.'
                : undefined,
    };
}

/**
 * 2. Weight-Based Dosing (mg/kg/day split by frequency OR single mg/kg/dose)
 */
export function calculateWeightBasedDose(params: {
    weightKg: number;
    dosePerKg: number;
    basis: 'per_day' | 'per_dose';
    frequency: FrequencyCode;
    stockMgPerMl?: number; // Optional: directly converts mg dose into mL to draw up
}): CalculationResult {
    if (params.weightKg <= 0 || params.dosePerKg <= 0) {
        throw new Error('Weight and dose per kg must be positive numbers.');
    }

    const totalBasisMg = params.weightKg * params.dosePerKg;
    const divisor = params.basis === 'per_day' ? DOSES_PER_DAY[params.frequency] : 1;
    const singleDoseMg = Number((totalBasisMg / divisor).toFixed(2));
    const dailyTotalMg =
        params.basis === 'per_day'
            ? Number(totalBasisMg.toFixed(2))
            : Number((totalBasisMg * DOSES_PER_DAY[params.frequency]).toFixed(2));

    const steps: string[] = [
        params.basis === 'per_day'
            ? `1. Total daily dose: ${params.weightKg} kg × ${params.dosePerKg} mg/kg/day = ${dailyTotalMg} mg/day.`
            : `1. Single dose: ${params.weightKg} kg × ${params.dosePerKg} mg/kg = ${singleDoseMg} mg/dose.`,
    ];

    if (params.basis === 'per_day' && divisor > 1) {
        steps.push(
            `2. Divide by ${params.frequency} (${divisor} doses/day): ${dailyTotalMg} mg ÷ ${divisor} = ${singleDoseMg} mg per dose.`
        );
    }

    let volumeMl: number | undefined;
    if (params.stockMgPerMl && params.stockMgPerMl > 0) {
        volumeMl = Number((singleDoseMg / params.stockMgPerMl).toFixed(2));
        steps.push(
            `3. Volume to administer (${params.stockMgPerMl} mg/mL): ${singleDoseMg} mg ÷ ${params.stockMgPerMl} mg/mL = ${volumeMl} mL.`
        );
    }

    return {
        primaryValue: singleDoseMg,
        primaryUnit: 'mg / dose',
        secondaryValue: volumeMl ?? dailyTotalMg,
        secondaryUnit: volumeMl !== undefined ? 'mL / dose' : 'mg / 24 hrs',
        steps,
    };
}

/**
 * 3. Ghana STG Severe Malaria IV/IM Artesunate Calculator
 * (< 20 kg = 3.0 mg/kg; >= 20 kg = 2.4 mg/kg; 60 mg vial -> 10 mg/mL IV or 20 mg/mL IM)
 */
export function calculateArtesunateGhanaSTG(weightKg: number, route: 'IV' | 'IM'): CalculationResult {
    const rate = weightKg < 20 ? 3.0 : 2.4;
    const doseMg = Number((weightKg * rate).toFixed(2));
    const concentration = route === 'IV' ? 10 : 20; // 6 mL total for IV, 3 mL total for IM
    const volumeMl = Number((doseMg / concentration).toFixed(2));
    const vialsNeeded = Math.ceil(doseMg / 60);

    return {
        primaryValue: volumeMl,
        primaryUnit: `mL (${route})`,
        secondaryValue: doseMg,
        secondaryUnit: 'mg / dose',
        steps: [
            `1. Ghana STG weight band (${weightKg < 20 ? '< 20 kg' : '≥ 20 kg'}): ${rate} mg/kg × ${weightKg} kg = ${doseMg} mg.`,
            route === 'IV'
                ? `2. IV Reconstitution (60 mg vial): Add 1 mL 5% Sodium Bicarbonate + 5 mL 0.9% Normal Saline = 6 mL total (10 mg/mL).`
                : `2. IM Reconstitution (60 mg vial): Add 1 mL 5% Sodium Bicarbonate + 2 mL 0.9% Normal Saline = 3 mL total (20 mg/mL).`,
            `3. Volume to withdraw: ${doseMg} mg ÷ ${concentration} mg/mL = ${volumeMl} mL (prepare ${vialsNeeded} × 60 mg vial${vialsNeeded > 1 ? 's' : ''}).`,
        ],
        clinicalAlert: 'Administer at 0 hr, 12 hrs, and 24 hrs (minimum 3 parenteral doses) before switching to full oral ACT course.',
    };
}

/**
 * 4. IV Drip Rate (gtt/min) & Infusion Pump Rate (mL/hr)
 */
export function calculateIvInfusion(params: {
    volumeMl: number;
    durationValue: number;
    durationUnit: 'hours' | 'minutes';
    dropFactor: 15 | 20 | 60; // 15 or 20 macro-drip, 60 pediatric burette/micro-drip
}): CalculationResult {
    const totalMinutes =
        params.durationUnit === 'hours' ? params.durationValue * 60 : params.durationValue;
    const totalHours = totalMinutes / 60;

    if (totalMinutes <= 0) throw new Error('Infusion duration must be greater than zero.');

    const exactDropsPerMin = (params.volumeMl * params.dropFactor) / totalMinutes;
    const roundedDropsPerMin = Math.round(exactDropsPerMin);
    const mlPerHour = Number((params.volumeMl / totalHours).toFixed(1));
    const secondsPerDrop = roundedDropsPerMin > 0 ? Number((60 / roundedDropsPerMin).toFixed(1)) : 0;

    return {
        primaryValue: roundedDropsPerMin,
        primaryUnit: 'drops/min (gtt/min)',
        secondaryValue: mlPerHour,
        secondaryUnit: 'mL/hr',
        steps: [
            `1. Total time in minutes: ${totalMinutes} min (${totalHours.toFixed(2)} hrs).`,
            `2. Gravity drip formula: (${params.volumeMl} mL × ${params.dropFactor} gtt/mL) ÷ ${totalMinutes} min = ${exactDropsPerMin.toFixed(2)} → ${roundedDropsPerMin} gtt/min.`,
            `3. Pacing check: 1 drop every ${secondsPerDrop} seconds | Pump rate: ${mlPerHour} mL/hr.`,
        ],
        clinicalAlert:
            params.dropFactor === 60
                ? 'Micro-drip (60 gtt/mL): Notice that drops/min equals mL/hr.'
                : undefined,
    };
}

/**
 * 5. Obstetric Oxytocin Titration (mU/min <-> mL/hr & gtt/min)
 */
export function calculateOxytocinInfusion(params: {
    oxytocinUnits: number; // e.g., 10 IU
    bagVolumeMl: number; // e.g., 1000 mL or 500 mL
    targetMilliUnitsPerMin: number; // e.g., 2, 4, 8, 12 mU/min
    dropFactor: 15 | 20 | 60;
}): CalculationResult {
    const totalMilliUnits = params.oxytocinUnits * 1000;
    const mUnitsPerMl = totalMilliUnits / params.bagVolumeMl;
    const mlPerMin = params.targetMilliUnitsPerMin / mUnitsPerMl;
    const mlPerHour = Number((mlPerMin * 60).toFixed(1));
    const dropsPerMin = Math.round(mlPerMin * params.dropFactor);

    return {
        primaryValue: dropsPerMin,
        primaryUnit: 'drops/min (gtt/min)',
        secondaryValue: mlPerHour,
        secondaryUnit: 'mL/hr',
        steps: [
            `1. Concentration: ${params.oxytocinUnits} IU (${totalMilliUnits} mU) in ${params.bagVolumeMl} mL = ${mUnitsPerMl} mU/mL.`,
            `2. Required mL/min: ${params.targetMilliUnitsPerMin} mU/min ÷ ${mUnitsPerMl} mU/mL = ${mlPerMin.toFixed(3)} mL/min (${mlPerHour} mL/hr).`,
            `3. Drip rate (${params.dropFactor} gtt/mL): ${mlPerMin.toFixed(3)} mL/min × ${params.dropFactor} = ${dropsPerMin} gtt/min.`,
        ],
        clinicalAlert: 'Monitor fetal heart rate and uterine contractions every 15–30 minutes; stop infusion if tachysystole (>5 contractions in 10 min) occurs.',
    };
}

/**
 * 6. Randomized N&MC Calculation Drill Generator
 */
export function generateCalculationDrill(): CalcDrillQuestion {
    const templates: (() => CalcDrillQuestion)[] = [
        () => {
            const vol = [500, 1000, 1500][Math.floor(Math.random() * 3)];
            const hrs = [4, 6, 8, 12][Math.floor(Math.random() * 4)];
            const df: 15 | 20 = Math.random() > 0.5 ? 20 : 15;
            const ans = Math.round((vol * df) / (hrs * 60));
            return {
                id: `drip-${Date.now()}`,
                category: 'IV Drip Rate',
                stem: `A patient with severe dehydration on the medical ward is prescribed ${vol} mL of Ringer's Lactate to infuse over ${hrs} hours. Using a standard giving set with a drop factor of ${df} gtt/mL, how many drops per minute should you regulate the infusion to? (Round to the nearest whole drop)`,
                answer: ans,
                unit: 'drops/min',
                tolerance: 1,
                rationale: [
                    `Formula: (Volume in mL × Drop factor) ÷ Time in minutes`,
                    `(${vol} × ${df}) ÷ (${hrs} × 60) = ${vol * df} ÷ ${hrs * 60} = ${((vol * df) / (hrs * 60)).toFixed(2)} → ${ans} drops/min.`,
                ],
            };
        },
        () => {
            const weight = [12, 14, 15, 18][Math.floor(Math.random() * 4)];
            const ans = Number(((weight * 3.0) / 10).toFixed(1));
            return {
                id: `art-${Date.now()}`,
                category: 'Weight-Based',
                stem: `A child weighing ${weight} kg is admitted with severe cerebral malaria. Per Ghana Standard Treatment Guidelines (3.0 mg/kg for children under 20 kg), you reconstitute a 60 mg Artesunate vial to a final IV concentration of 10 mg/mL (6 mL total). What volume (in mL) should you administer for the stat dose?`,
                answer: ans,
                unit: 'mL',
                tolerance: 0.1,
                rationale: [
                    `Required dose = ${weight} kg × 3.0 mg/kg = ${(weight * 3).toFixed(1)} mg.`,
                    `Volume = ${(weight * 3).toFixed(1)} mg ÷ 10 mg/mL = ${ans} mL.`,
                ],
            };
        },
        () => {
            const orderedG = [0.5, 0.75, 1.0][Math.floor(Math.random() * 3)];
            const ans = (orderedG * 1000) / 250;
            return {
                id: `oral-${Date.now()}`,
                category: 'Oral/Liquid',
                stem: `The prescriber orders Ciprofloxacin ${orderedG} g PO BD for a patient with typhoid fever. On the ward, you have Ciprofloxacin 250 mg tablets. How many tablets will you administer per dose?`,
                answer: ans,
                unit: 'tablets',
                tolerance: 0.05,
                rationale: [
                    `Convert grams to milligrams: ${orderedG} g × 1000 = ${orderedG * 1000} mg.`,
                    `(${orderedG * 1000} mg ÷ 250 mg) × 1 tablet = ${ans} tablets.`,
                ],
            };
        },
    ];

    return templates[Math.floor(Math.random() * templates.length)]();
}