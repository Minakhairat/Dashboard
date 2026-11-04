import { KPIStats } from '../types';

export interface KPICalculationInput {
  plannedTimeMinutes: number; // Planned Production Time
  downtimeMinutes: number; // Stoppages / Downtime
  totalParts: number; // Total parts produced (actual production)
  rejectedParts: number; // Defective / Rework parts
  targetProduction: number; // Target / Planned production quantity
  idealCycleTimeSeconds: number; // Ideal cycle time per part in seconds (زمن الدورة المعياري)
}

/**
 * Calculates industrial KPIs based on standard Astemo / Fresh Engineering Essentials formulas:
 * 1. Availability % = (Operating Time / Planned Production Time) * 100
 * 2. Performance % = (Total Parts / (Operating Time / Ideal Cycle Time)) * 100
 * 3. Quality % = (Good Parts / Total Parts) * 100
 * 4. OEE % = (Availability % * Performance % * Quality %)
 * 5. Rejection % = (Rejected Parts / Total Parts) * 100
 * 6. Production Achievement % = (Actual Production / Target Production) * 100
 */
export function calculateKPIs(input: KPICalculationInput): KPIStats {
  const {
    plannedTimeMinutes,
    downtimeMinutes,
    totalParts,
    rejectedParts,
    targetProduction,
    idealCycleTimeSeconds,
  } = input;

  const validPlannedTime = Math.max(0, plannedTimeMinutes);
  const validDowntime = Math.min(validPlannedTime, Math.max(0, downtimeMinutes));
  const operatingTimeMinutes = Math.max(0, validPlannedTime - validDowntime);
  const operatingTimeSeconds = operatingTimeMinutes * 60;

  // Good parts
  const validTotalParts = Math.max(0, totalParts);
  const validRejected = Math.min(validTotalParts, Math.max(0, rejectedParts));
  const goodParts = Math.max(0, validTotalParts - validRejected);

  // 1. Availability %
  let availability = 0;
  if (validPlannedTime > 0) {
    availability = (operatingTimeMinutes / validPlannedTime) * 100;
  } else {
    availability = 100;
  }
  availability = Number(availability.toFixed(2));

  // 2. Performance %
  let performance = 0;
  if (operatingTimeSeconds > 0 && idealCycleTimeSeconds > 0) {
    const theoreticalMaxParts = operatingTimeSeconds / idealCycleTimeSeconds;
    if (theoreticalMaxParts > 0) {
      performance = (validTotalParts / theoreticalMaxParts) * 100;
    }
  } else if (validTotalParts > 0 && operatingTimeSeconds <= 0) {
    performance = 100;
  } else {
    performance = 0;
  }
  // Sanitize extreme values if zero operating time
  if (isNaN(performance) || !isFinite(performance)) performance = 0;
  performance = Number(performance.toFixed(2));

  // 3. Quality %
  let quality = 100;
  if (validTotalParts > 0) {
    quality = (goodParts / validTotalParts) * 100;
  }
  quality = Number(quality.toFixed(2));

  // 4. OEE % = (Availability / 100) * (Performance / 100) * (Quality / 100) * 100
  const oee = Number(((availability / 100) * (performance / 100) * (quality / 100) * 100).toFixed(2));

  // 5. Rejection % = (Rejected Parts / Total Parts) * 100
  let rejection = 0;
  if (validTotalParts > 0) {
    rejection = (validRejected / validTotalParts) * 100;
  }
  rejection = Number(rejection.toFixed(2));

  // 6. Production Achievement % = (Actual Production / Target Production) * 100
  let achievement = 0;
  if (targetProduction > 0) {
    achievement = (validTotalParts / targetProduction) * 100;
  } else if (validTotalParts > 0) {
    achievement = 100;
  }
  achievement = Number(achievement.toFixed(2));

  // Benchmark Thresholds from Chapter 20 / Episode 31:
  // OEE: Target >= 85%
  // Availability: Target >= 95%
  // Performance: Target >= 95%
  // Quality: Target >= 99%
  // Rejection: Target <= 1%
  // Production Achievement: Target >= 100%

  return {
    availability,
    availabilityStatus: availability >= 95 ? 'on-target' : 'action-required',
    performance,
    performanceStatus: performance >= 95 ? 'on-target' : 'action-required',
    quality,
    qualityStatus: quality >= 99 ? 'on-target' : 'action-required',
    oee,
    oeeStatus: oee >= 85 ? 'on-target' : 'action-required',
    rejection,
    rejectionStatus: rejection <= 1.0 ? 'on-target' : 'action-required',
    achievement,
    achievementStatus: achievement >= 100 ? 'on-target' : 'action-required',
    plannedTimeMinutes: validPlannedTime,
    operatingTimeMinutes,
    totalDowntimeMinutes: validDowntime,
    totalParts: validTotalParts,
    targetProduction,
    goodParts,
    rejectedParts: validRejected,
  };
}

/**
 * Format Arabic percentage with badge styling helper
 */
export function getStatusBadge(status: 'on-target' | 'action-required') {
  if (status === 'on-target') {
    return {
      text: 'ضمن المستهدف (On Target)',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      pill: 'bg-emerald-500',
    };
  }
  return {
    text: 'يتطلب إجراء (Action Required)',
    bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    pill: 'bg-rose-500',
  };
}
