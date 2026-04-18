// js/modules/scope-library.js
// Pre-written PM scope text for common BC commercial mechanical equipment.
// Each key matches CONFIG.EQUIPMENT_TYPES. Frequencies: annual, semi-annual, quarterly, monthly.

export const SCOPE_LIBRARY = {

  'Boiler — Hot Water': {
    annual: [
      'Inspect and clean combustion chamber, heat exchanger surfaces, and fireside passages.',
      'Test, calibrate, and record all safety controls: high-limit aquastat, low-water cutoff, LWCO probe, and pressure relief valve operation.',
      'Inspect and clean burner assembly, flame sensor, and igniter; adjust air/fuel ratio.',
      'Verify gas manifold and pilot pressure against manufacturer specifications.',
      'Inspect and clean flue collector, vent connector, and confirm proper draft.',
      'Test and record operating supply and return water temperatures.',
      'Check expansion tank air pre-charge; replace tank if waterlogged.',
      'Inspect and operate circulating pump; check shaft seal and motor amps.',
      'Check all system pressure and temperature gauges; calibrate or tag defective gauges.',
      'Inspect isolation and zone valves; lubricate stems where applicable.',
      'Record operating CO and stack temperature; document combustion analysis.',
      'Provide written deficiency report with priority classifications.',
    ],
    'semi-annual': [
      'Inspect combustion chamber and heat exchanger for deposits or deterioration.',
      'Test high-limit and operating controls; verify setpoints.',
      'Inspect burner, flame sensor, and flue condition.',
      'Verify operating supply/return temperatures and record.',
      'Check expansion tank, pump seal, and circulator operation.',
      'Check system pressure and relief valve condition.',
      'Report deficiencies in writing.',
    ],
    quarterly: [
      'Visual burner inspection; verify operating pressure and temperatures.',
      'Test low-water cutoff and operating aquastat.',
      'Check circulating pump and seal condition.',
      'Verify flue is clear and vent terminal unobstructed.',
      'Document readings and report deficiencies.',
    ],
    monthly: [
      'Visual operational check; verify burner is firing correctly.',
      'Record supply, return temperatures, and system pressure.',
      'Test low-water cutoff.',
      'Check pump operation.',
      'Report any deficiencies immediately.',
    ],
  },

  'Boiler — Steam': {
    annual: [
      'Full combustion analysis; clean and adjust burner assembly.',
      'Inspect and clean fireside: combustion chamber, heat exchanger, and flue passages.',
      'Test all safety controls: LWCO, pressuretrol, pressure relief valve, and gauge glass.',
      'Inspect and clean water column and gauge glass.',
      'Test feedwater system and return trap station.',
      'Check steam traps throughout system; tag failed traps.',
      'Inspect all steam and return piping for leaks, corrosion, and insulation damage.',
      'Verify gas pressures at manifold and record combustion parameters.',
      'Perform water treatment analysis if applicable.',
      'Provide full written service report with deficiency list.',
    ],
    'semi-annual': [
      'Inspect burner, combustion chamber, and LWCO.',
      'Test pressuretrol and relief valve.',
      'Check steam traps on primary mains.',
      'Inspect water column and gauge glass.',
      'Record operating steam pressure and return temperatures.',
      'Report deficiencies in writing.',
    ],
    quarterly: [
      'Visual burner check and operating parameters.',
      'Test LWCO.',
      'Check steam pressure and visible trap conditions.',
      'Report deficiencies.',
    ],
  },

  'Chiller': {
    annual: [
      'Log and record all operating parameters: EWT/LWT, condenser in/out, suction and discharge pressures.',
      'Inspect and clean condenser coil or condenser tubes (scope per unit type).',
      'Check refrigerant charge; verify no loss from prior season.',
      'Inspect compressor oil level and condition; send oil sample if applicable.',
      'Check all safety controls: high/low pressure cutouts, flow switches, and freeze protection.',
      'Inspect and tighten all electrical connections; verify motor amps.',
      'Inspect evaporator barrel or DX coil for fouling.',
      'Check condenser fan blades, motor bearings, and belt drives where applicable.',
      'Verify control setpoints: LWT, differential, and demand limiting.',
      'Perform leak check on all refrigerant connections with electronic detector.',
      'Provide full commissioning report with operating parameter log.',
    ],
    'semi-annual': [
      'Log all operating parameters and compare to design.',
      'Inspect condenser coil/tubes; clean if fouled.',
      'Check refrigerant charge and oil level.',
      'Test safety controls.',
      'Inspect electrical connections and motor amps.',
      'Report deficiencies.',
    ],
  },

  'Cooling Tower': {
    annual: [
      'Drain, flush, and clean basin thoroughly; remove scale and biological deposits.',
      'Inspect and clean fill media; replace deteriorated sections.',
      'Inspect drift eliminators; replace if damaged.',
      'Clean and inspect spray nozzles or distribution system.',
      'Inspect fan assembly: blades, shaft, bearings, and gear reducer or drive belt.',
      'Check fan motor condition and amp draw.',
      'Inspect make-up valve, float, and overflow.',
      'Verify water treatment dosing equipment is operational.',
      'Test and calibrate bleed-off conductivity controller.',
      'Inspect all basin piping, strainers, and connections.',
      'Provide written service report; coordinate water treatment analysis.',
    ],
    'semi-annual': [
      'Inspect and clean basin; check for biological growth.',
      'Inspect fill media and drift eliminators.',
      'Check fan operation, motor, and belt/drive condition.',
      'Clean spray nozzles.',
      'Verify make-up and bleed-off operation.',
      'Report deficiencies.',
    ],
  },

  'AHU / RTU': {
    annual: [
      'Replace all filters (MERV per spec); record static pressure across filter bank.',
      'Inspect and clean supply and return fan wheels and housing.',
      'Check and re-tension belt drives; replace worn belts.',
      'Lubricate fan bearings and motor bearings per manufacturer spec.',
      'Inspect cooling coil and heating coil for fouling; clean with appropriate coil cleaner.',
      'Inspect drain pan and condensate drain; clean and treat for biological growth.',
      'Inspect and operate all dampers: OA, return, exhaust, and mixing.',
      'Check economizer operation and DX staging where applicable.',
      'Verify all controls: thermostat, discharge air sensor, humidistat, CO₂ where installed.',
      'Inspect duct connections and unit casing for leaks.',
      'Check all electrical connections; verify motor amps and VFD parameters if equipped.',
      'Provide written service report.',
    ],
    'semi-annual': [
      'Replace filters; record static pressures.',
      'Inspect coils and drain pan.',
      'Check belt tension and fan bearings.',
      'Lubricate bearings.',
      'Inspect dampers and verify economizer function.',
      'Record supply air temperature and verify controls.',
      'Report deficiencies.',
    ],
    quarterly: [
      'Replace or inspect filters.',
      'Check belt drives and bearings.',
      'Inspect drain pan.',
      'Verify unit operation and controls.',
      'Report deficiencies.',
    ],
    monthly: [
      'Inspect and replace filters as required.',
      'Verify unit operation.',
      'Check drain pan condition.',
      'Report deficiencies.',
    ],
  },

  'Make-Up Air Unit': {
    annual: [
      'Replace all filters; record static pressures.',
      'Inspect heat exchanger (gas-fired) or heating coil (hot water); clean if required.',
      'Check burner assembly, ignition, and flame sensor (gas-fired).',
      'Verify all controls: modulating gas valve, discharge air temperature, and setpoints.',
      'Inspect supply fan, motor, and drive assembly.',
      'Inspect and operate fresh air and relief dampers.',
      'Check economizer or enthalpy wheel if equipped.',
      'Verify unit interlocks and exhaust relationship.',
      'Provide written service report.',
    ],
    'semi-annual': [
      'Replace filters.',
      'Inspect burner and combustion assembly.',
      'Check heat exchanger.',
      'Verify controls and setpoints.',
      'Inspect fan and dampers.',
      'Report deficiencies.',
    ],
  },

  'Fan Coil Unit': {
    annual: [
      'Clean or replace filter; record static differential.',
      'Clean fan wheel and housing.',
      'Lubricate fan motor bearings if applicable.',
      'Clean coil fin surface.',
      'Inspect condensate pan and drain.',
      'Verify control valve operation (2-way or 3-way).',
      'Check thermostat operation and setpoints.',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Replace or clean filter.',
      'Inspect coil and drain pan.',
      'Verify valve and thermostat operation.',
      'Report deficiencies.',
    ],
    quarterly: [
      'Inspect filter; replace if required.',
      'Verify unit operation.',
      'Check drain pan.',
    ],
  },

  'Water Source Heat Pump': {
    annual: [
      'Record entering and leaving water temperatures and compare to design.',
      'Check refrigerant charge; inspect for leaks.',
      'Clean or replace filter.',
      'Clean coil surfaces.',
      'Check reversing valve operation in both heating and cooling modes.',
      'Inspect condensate pan and drain.',
      'Verify all controls and thermostat setpoints.',
      'Check electrical connections and motor amps.',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Replace filter.',
      'Check refrigerant charge and reversing valve.',
      'Record loop water temperatures.',
      'Inspect coil and drain pan.',
      'Verify controls.',
      'Report deficiencies.',
    ],
  },

  'Circulation Pump': {
    annual: [
      'Check pump and motor alignment.',
      'Inspect mechanical seal for leakage; replace if weeping.',
      'Lubricate motor bearings (grease-lubricated type).',
      'Check motor amp draw against nameplate FLA.',
      'Inspect coupling and flexible connectors.',
      'Verify pump rotation direction.',
      'Check isolation and balance valves.',
      'Record system differential pressure.',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Inspect mechanical seal condition.',
      'Check motor amps and bearing temperatures.',
      'Lubricate bearings if applicable.',
      'Verify operation and system pressure.',
      'Report deficiencies.',
    ],
    quarterly: [
      'Visual inspection of seal and motor.',
      'Record motor amps.',
      'Verify pump is running smoothly.',
    ],
  },

  'Plate Heat Exchanger': {
    annual: [
      'Inspect all connections for leaks.',
      'Check plate pack tightness (bolt torque).',
      'Verify approach temperatures on both circuits against design values.',
      'Inspect isolation valves and strainers.',
      'Clean strainers on both circuits.',
      'Report fouling indicators and recommend chemical cleaning if approach is degraded.',
    ],
    'semi-annual': [
      'Inspect connections and gaskets for leaks.',
      'Check approach temperatures.',
      'Clean strainers.',
      'Report deficiencies.',
    ],
  },

  'Expansion Tank': {
    annual: [
      'Verify system fill pressure against tank pre-charge specification.',
      'Check tank air charge (de-pressurize circuit and check with gauge).',
      'Inspect tank bladder for waterlogging (weight test).',
      'Check isolation valve and Schrader valve condition.',
      'Record findings and recommend replacement if bladder failure is confirmed.',
    ],
  },

  'Backflow Preventer': {
    annual: [
      'Perform annual test per AWWA standards and BC Plumbing Code requirements.',
      'Record test results on certified form.',
      'Inspect relief valve and check valves.',
      'Replace internal components if test fails.',
      'Provide signed test report for municipality records.',
    ],
  },

  'Pressure Reducing Valve': {
    annual: [
      'Check downstream pressure against setpoint.',
      'Inspect for leakage across valve seat.',
      'Verify strainer condition upstream.',
      'Test bypass operation if equipped.',
      'Adjust setpoint if required.',
      'Report if replacement is recommended due to age or internal wear.',
    ],
  },

  'Domestic Water Heater': {
    annual: [
      'Flush tank to remove sediment accumulation.',
      'Test temperature-pressure relief valve (TPRV); tag if not operational.',
      'Inspect anode rod; replace if more than 50% depleted.',
      'Check and adjust thermostat setpoint (minimum 60°C per BC code).',
      'Inspect burner or element condition.',
      'Inspect flue and draft hood (gas-fired).',
      'Check expansion tank if closed system.',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Test TPRV.',
      'Check thermostat setpoint.',
      'Inspect burner or element.',
      'Report deficiencies.',
    ],
  },

  'Exhaust Fan': {
    annual: [
      'Clean fan wheel and housing.',
      'Lubricate bearings (if applicable).',
      'Check belt drive condition and tension.',
      'Verify motor amp draw.',
      'Inspect damper operation.',
      'Verify CFM output against design (pitot or anemometer).',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Inspect fan wheel and housing.',
      'Check belt and bearings.',
      'Verify operation.',
      'Report deficiencies.',
    ],
  },

  'Split System / DX': {
    annual: [
      'Clean condenser coil; check for physical damage.',
      'Clean evaporator coil (accessible).',
      'Check refrigerant charge via subcooling/superheat method.',
      'Inspect condensate pan and drain line.',
      'Check electrical connections and capacitors.',
      'Verify controls and thermostat operation.',
      'Record operating parameters.',
      'Report deficiencies.',
    ],
    'semi-annual': [
      'Clean or inspect coils.',
      'Check refrigerant charge.',
      'Inspect drain pan.',
      'Verify controls.',
      'Report deficiencies.',
    ],
  },

  'VRF System': {
    annual: [
      'Log all operating parameters per manufacturer protocol.',
      'Inspect outdoor unit: fan, coil, compressor compartment.',
      'Check refrigerant charge using system diagnostics.',
      'Inspect all indoor unit filters and coils.',
      'Download fault codes and error log from controller.',
      'Verify all refrigerant line set connections for leakage.',
      'Check system controls, setpoints, and scheduling.',
      'Report deficiencies.',
    ],
  },

  'Other': {
    annual: [
      'Perform general inspection and operational check.',
      'Verify all safety controls are functional.',
      'Check for leaks, unusual wear, and signs of deterioration.',
      'Record operating parameters.',
      'Report deficiencies in writing.',
    ],
  },
};

export function getScopeText(equipType, frequency) {
  const entry = SCOPE_LIBRARY[equipType];
  if (!entry) return SCOPE_LIBRARY['Other'].annual;
  return entry[frequency] || entry['annual'] || SCOPE_LIBRARY['Other'].annual;
}
