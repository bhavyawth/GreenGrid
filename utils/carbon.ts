/**
 * Centralized, canonical carbon emission calculation utilities.
 * Handles conversions and rates with consistent units.
 */

/**
 * Calculates total carbon emissions.
 * Formula: energy (kWh) * gridIntensity (g CO2/kWh) / 1000 = emissions (kg CO2)
 *
 * @param energyKwh Cumulative energy consumed in kWh
 * @param gridIntensity Grid carbon intensity in g CO2/kWh
 * @returns Total carbon emissions in kg CO2
 */
export function calculateEmissions(energyKwh: number, gridIntensity: number): number {
  if (energyKwh < 0 || gridIntensity < 0) return 0;
  const emissions = (energyKwh * gridIntensity) / 1000;
  return parseFloat(emissions.toFixed(4));
}

/**
 * Calculates current carbon emission rate.
 * Formula: power (W) / 1000 = power (kW)
 *          power (kW) * gridIntensity (g CO2/kWh) = carbon rate (g CO2/hour)
 *
 * @param powerWatts Instantaneous power usage in Watts
 * @param gridIntensity Grid carbon intensity in g CO2/kWh
 * @returns Instantaneous carbon emission rate in g CO2/h
 */
export function calculateEmissionRate(powerWatts: number, gridIntensity: number): number {
  if (powerWatts < 0 || gridIntensity < 0) return 0;
  const powerKw = powerWatts / 1000;
  const rate = powerKw * gridIntensity;
  return parseFloat(rate.toFixed(2));
}
