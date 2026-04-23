// equipmaster.js — Equipment master dataset
// Source: EQUIPMASTER_v2_hardened_vrf_vrv.xlsx
// 185 equipment types, 13 categories, 314 manufacturers
// Regenerated 2026-04-23 — DO NOT edit manually

export const EQUIPMASTER = [
  {
    "equipment_type": "Air Handling Unit",
    "tag_prefix": "AHU",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Trane, Carrier, Daikin, York, Lennox, Temtrol, Engineered Air, Aaon, ClimateCraft, Huntair, Ventrol, Greenheck, Nortek, McQuay, Systemair",
    "quarterly_hours": 1.5,
    "semi_annual_hours": 3,
    "annual_hours": 6,
    "monthly_hours": 0.5,
    "description": "",
    "canonical_label": "Air Handling Unit",
    "canonical_tag": "AHU",
    "aliases": [
      "AHU",
      "Air Handler",
      "Air Handling Unit"
    ]
  },
  {
    "equipment_type": "Rooftop Unit",
    "tag_prefix": "RTU",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Carrier, Lennox, Trane, York, Aaon, Daikin, Rheem, ICP, Bryant, Tempstar, Goodman, Nordyne, Fujitsu, Hitachi",
    "quarterly_hours": 1.25,
    "semi_annual_hours": 2.5,
    "annual_hours": 5,
    "monthly_hours": 0.4167,
    "description": "",
    "canonical_label": "Rooftop Unit",
    "canonical_tag": "RTU",
    "aliases": [
      "RTU",
      "Rooftop Unit",
      "Roof Top Unit",
      "Rooftop"
    ]
  },
  {
    "equipment_type": "Fan Coil Unit",
    "tag_prefix": "FCU",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Daikin, Carrier, Trane, FirstCo, IEC, Williams, EnviroTec, Whalen, McQuay, Titus, Price",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Fan Coil Unit",
    "canonical_tag": "FCU",
    "aliases": [
      "FCU",
      "Fan Coil",
      "Fan Coil Unit"
    ]
  },
  {
    "equipment_type": "Variable Air Volume Box",
    "tag_prefix": "VAV",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Price, Titus, Nailor, Johnson Controls, Honeywell, Siemens, Krueger, Metal Industries, EnviroTec",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 0.75,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Variable Air Volume Box",
    "canonical_tag": "VAV",
    "aliases": [
      "VAV",
      "VAV Box",
      "Variable Air Volume Box",
      "VAV Terminal"
    ]
  },
  {
    "equipment_type": "Energy Recovery Ventilator",
    "tag_prefix": "ERV",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "RenewAire, Daikin, Trane, Greenheck, Fantech, Venmar, Lifebreath, Systemair, Broan, CaptiveAire",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2.5,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Energy Recovery Ventilator",
    "canonical_tag": "ERV",
    "aliases": [
      "ERV",
      "Energy Recovery Ventilator"
    ]
  },
  {
    "equipment_type": "Heat Recovery Ventilator",
    "tag_prefix": "HRV",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Lifebreath, Fantech, Venmar, Broan, Systemair, Panasonic, Aldes",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Heat Recovery Ventilator",
    "canonical_tag": "HRV",
    "aliases": [
      "HRV",
      "Heat Recovery Ventilator"
    ]
  },
  {
    "equipment_type": "Make Up Air Unit",
    "tag_prefix": "MUA",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Engineered Air, CaptiveAire, Greenheck, Aaon, Addison, Cambridge, Hastings, Modine, Reznor, Valent",
    "quarterly_hours": 1.5,
    "semi_annual_hours": 3,
    "annual_hours": 5,
    "monthly_hours": 0.5,
    "description": "",
    "canonical_label": "Make Up Air Unit",
    "canonical_tag": "MUA",
    "aliases": [
      "MUA",
      "MAU",
      "Make Up Air Unit",
      "Make-Up Air Unit",
      "Make Up Air"
    ]
  },
  {
    "equipment_type": "Exhaust Fan",
    "tag_prefix": "EF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Greenheck, Loren Cook, PennBarry, Twin City, Cook, Systemair, Fantech, Continental Fan, Acme",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Exhaust Fan",
    "canonical_tag": "EF",
    "aliases": [
      "EF",
      "Exhaust Fan",
      "Ex Fan"
    ]
  },
  {
    "equipment_type": "Inline Fan",
    "tag_prefix": "IF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Fantech, Greenheck, Systemair, S&P, Cook, Twin City, PennBarry",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Inline Fan",
    "canonical_tag": "IF",
    "aliases": [
      "IF",
      "Inline Fan",
      "In-Line Fan"
    ]
  },
  {
    "equipment_type": "Supply Fan",
    "tag_prefix": "SF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Greenheck, Twin City, Loren Cook, PennBarry, Cook, Chicago Blower, NYB",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Supply Fan",
    "canonical_tag": "SF",
    "aliases": [
      "SF",
      "Supply Fan"
    ]
  },
  {
    "equipment_type": "Return Fan",
    "tag_prefix": "RF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Greenheck, Twin City, Cook, Loren Cook, PennBarry",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Return Fan",
    "canonical_tag": "RF",
    "aliases": [
      "RF",
      "Return Fan"
    ]
  },
  {
    "equipment_type": "Unit Heater",
    "tag_prefix": "UH",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Reznor, Modine, Sterling, Engineered Air, Beacon Morris, Lennox, Cambridge",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Unit Heater",
    "canonical_tag": "UH",
    "aliases": [
      "UH",
      "Unit Heater"
    ]
  },
  {
    "equipment_type": "Electric Heater",
    "tag_prefix": "EH",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Stelpro, Qmark, Indeeco, Thermolec, King, Markel, Chromalox",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Electric Heater",
    "canonical_tag": "EH",
    "aliases": [
      "EH",
      "Electric Heater"
    ]
  },
  {
    "equipment_type": "Chiller",
    "tag_prefix": "CH",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Trane, Carrier, York, Daikin, McQuay, Multistack, Smardt, Dunham Bush, Climaveneta",
    "quarterly_hours": 2,
    "semi_annual_hours": 4,
    "annual_hours": 10,
    "monthly_hours": 0.6667,
    "description": "",
    "canonical_label": "Chiller",
    "canonical_tag": "CH",
    "aliases": [
      "CH",
      "Chiller",
      "Chilled Water Chiller"
    ]
  },
  {
    "equipment_type": "Cooling Tower",
    "tag_prefix": "CT",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "BAC, Marley, Evapco, Delta, Recold, Baltimore, Paharpur",
    "quarterly_hours": 2,
    "semi_annual_hours": 4,
    "annual_hours": 8,
    "monthly_hours": 0.6667,
    "description": "",
    "canonical_label": "Cooling Tower",
    "canonical_tag": "CT",
    "aliases": [
      "CT",
      "Cooling Tower",
      "Tower"
    ]
  },
  {
    "equipment_type": "Condensing Unit",
    "tag_prefix": "CU",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Carrier, Trane, Lennox, Copeland, Tecumseh, Bitzer, Heatcraft, Danfoss, Embraco",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2.5,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Condensing Unit",
    "canonical_tag": "CU",
    "aliases": [
      "CU",
      "Condensing Unit",
      "Outdoor Condensing Unit"
    ]
  },
  {
    "equipment_type": "Heat Pump",
    "tag_prefix": "HP",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Mitsubishi, Daikin, Fujitsu, LG, Samsung, Carrier, Trane, Bosch, Panasonic",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2.5,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Heat Pump",
    "canonical_tag": "HP",
    "aliases": [
      "HP",
      "Heat Pump"
    ]
  },
  {
    "equipment_type": "VRF Outdoor Unit",
    "tag_prefix": "VRF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Mitsubishi, Daikin, LG, Samsung, Toshiba, Fujitsu, Hitachi, Panasonic",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 3,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "VRF Outdoor Unit",
    "canonical_tag": "VRF",
    "aliases": [
      "VRF",
      "VRF Outdoor",
      "VRF Outdoor Unit",
      "VRF Condenser"
    ]
  },
  {
    "equipment_type": "VRF Indoor Unit",
    "tag_prefix": "IDU",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Mitsubishi, Daikin, LG, Samsung, Fujitsu, Toshiba",
    "quarterly_hours": 0.4,
    "semi_annual_hours": 0.8,
    "annual_hours": 1.25,
    "monthly_hours": 0.1333,
    "description": "",
    "canonical_label": "VRF Indoor Unit",
    "canonical_tag": "IDU",
    "aliases": [
      "IDU",
      "Indoor Unit",
      "VRF Indoor",
      "VRF Indoor Unit"
    ]
  },
  {
    "equipment_type": "CRAC Unit",
    "tag_prefix": "CRAC",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Liebert, Stulz, Schneider, Vertiv, Data Aire",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "CRAC Unit",
    "canonical_tag": "CRAC",
    "aliases": [
      "CRAC",
      "CRAC Unit",
      "Computer Room AC",
      "Precision AC"
    ]
  },
  {
    "equipment_type": "Humidifier",
    "tag_prefix": "HUM",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Nortec, Condair, Armstrong, DriSteem, Carel",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Humidifier",
    "canonical_tag": "HUM",
    "aliases": [
      "HUM",
      "Humidifier",
      "Steam Humidifier"
    ]
  },
  {
    "equipment_type": "Dehumidifier",
    "tag_prefix": "DHUM",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Dectron, Desert Aire, Munters, PoolPak, Seresco",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2.5,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Dehumidifier",
    "canonical_tag": "DHUM",
    "aliases": [
      "DHUM",
      "Dehumidifier"
    ]
  },
  {
    "equipment_type": "Kitchen Exhaust Fan",
    "tag_prefix": "KEF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "CaptiveAire, Halton, Greenheck, Gaylord, Accurex",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Kitchen Exhaust Fan",
    "canonical_tag": "KEF",
    "aliases": [
      "KEF",
      "Kitchen Exhaust Fan",
      "Kitchen EF",
      "Hood Exhaust Fan"
    ]
  },
  {
    "equipment_type": "Kitchen Make Up Air Unit",
    "tag_prefix": "KMUA",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "CaptiveAire, Halton, Greenheck, Engineered Air",
    "quarterly_hours": 1.25,
    "semi_annual_hours": 2.5,
    "annual_hours": 4,
    "monthly_hours": 0.4167,
    "description": "",
    "canonical_label": "Kitchen Make Up Air Unit",
    "canonical_tag": "KMUA",
    "aliases": [
      "KMUA",
      "Kitchen MUA",
      "Kitchen MAU",
      "Kitchen Make Up Air Unit"
    ]
  },
  {
    "equipment_type": "Stair Pressurization Fan",
    "tag_prefix": "SPF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Greenheck, Twin City, Cook, PennBarry",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Stair Pressurization Fan",
    "canonical_tag": "SPF",
    "aliases": [
      "SPF",
      "Stair Press Fan",
      "Stair Pressurization Fan",
      "Stairwell Pressurization Fan"
    ]
  },
  {
    "equipment_type": "Smoke Exhaust Fan",
    "tag_prefix": "SEF",
    "category": "HVAC_AIRSIDE",
    "manufacturers": "Greenheck, Twin City, Cook, PennBarry",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 2,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Smoke Exhaust Fan",
    "canonical_tag": "SEF",
    "aliases": [
      "SEF",
      "Smoke Exhaust Fan",
      "Smoke Fan",
      "Smoke Exhaust"
    ]
  },
  {
    "equipment_type": "Hot Water Boiler",
    "tag_prefix": "BLR",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Viessmann, Lochinvar, Raypak, Cleaver-Brooks, Weil-McLain, NTI, IBC, Bosch, Buderus, AERCO, Laars, Fulton",
    "quarterly_hours": 2,
    "semi_annual_hours": 4,
    "annual_hours": 8,
    "monthly_hours": 0.6667,
    "description": "",
    "canonical_label": "Hot Water Boiler",
    "canonical_tag": "BLR",
    "aliases": [
      "BLR",
      "Hot Water Boiler",
      "HW Boiler",
      "Boiler"
    ]
  },
  {
    "equipment_type": "Steam Boiler",
    "tag_prefix": "SBLR",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Cleaver-Brooks, Fulton, Weil-McLain, Columbia, Burnham, Miura",
    "quarterly_hours": 2,
    "semi_annual_hours": 4,
    "annual_hours": 10,
    "monthly_hours": 0.6667,
    "description": "",
    "canonical_label": "Steam Boiler",
    "canonical_tag": "SBLR",
    "aliases": [
      "SBLR",
      "Steam Boiler"
    ]
  },
  {
    "equipment_type": "Condensing Boiler",
    "tag_prefix": "CBLR",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Viessmann, Lochinvar, NTI, IBC, Bosch, Buderus, AERCO, Triangle Tube, Navien",
    "quarterly_hours": 1.5,
    "semi_annual_hours": 3,
    "annual_hours": 6,
    "monthly_hours": 0.5,
    "description": "",
    "canonical_label": "Condensing Boiler",
    "canonical_tag": "CBLR",
    "aliases": [
      "CBLR",
      "Condensing Boiler",
      "Mod-Con Boiler"
    ]
  },
  {
    "equipment_type": "Chiller",
    "tag_prefix": "CH",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Trane, Carrier, York, Daikin, McQuay, Multistack, Smardt, Dunham-Bush, Climaveneta",
    "quarterly_hours": 2,
    "semi_annual_hours": 4,
    "annual_hours": 10,
    "monthly_hours": 0.6667,
    "description": "",
    "canonical_label": "Chiller",
    "canonical_tag": "CH",
    "aliases": [
      "CH",
      "Chiller",
      "Chilled Water Chiller"
    ]
  },
  {
    "equipment_type": "Plate Heat Exchanger",
    "tag_prefix": "HX",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Alfa Laval, SWEP, Bell & Gossett, Armstrong, Tranter, API, GEA",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Plate Heat Exchanger",
    "canonical_tag": "HX",
    "aliases": [
      "HX",
      "Plate HX",
      "Plate Heat Exchanger"
    ]
  },
  {
    "equipment_type": "Shell and Tube Heat Exchanger",
    "tag_prefix": "HE",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Bell & Gossett, Armstrong, Taco, API, Alfa Laval, Xylem",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Shell and Tube Heat Exchanger",
    "canonical_tag": "HE",
    "aliases": [
      "HE",
      "Shell and Tube Heat Exchanger",
      "Shell & Tube Heat Exchanger",
      "Shell and Tube HX",
      "Shell & Tube HX"
    ]
  },
  {
    "equipment_type": "Heating Water Pump",
    "tag_prefix": "HWP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Taco, Armstrong, Bell & Gossett, Wilo, Xylem, KSB",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Heating Water Pump",
    "canonical_tag": "HWP",
    "aliases": [
      "HWP",
      "Heating Water Pump",
      "Htg Water Pump"
    ]
  },
  {
    "equipment_type": "Chilled Water Pump",
    "tag_prefix": "CHWP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Armstrong, Taco, B&G, Wilo, Xylem",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Chilled Water Pump",
    "canonical_tag": "CHWP",
    "aliases": [
      "CHWP",
      "Chilled Water Pump",
      "CHW Pump"
    ]
  },
  {
    "equipment_type": "Condenser Water Pump",
    "tag_prefix": "CWP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Armstrong, Taco, Bell & Gossett, Wilo",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Condenser Water Pump",
    "canonical_tag": "CWP",
    "aliases": [
      "CWP",
      "Condenser Water Pump",
      "Cond Water Pump"
    ]
  },
  {
    "equipment_type": "Secondary Pump",
    "tag_prefix": "SP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Taco, Armstrong, B&G, Wilo",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Secondary Pump",
    "canonical_tag": "SP",
    "aliases": [
      "SP",
      "Secondary Pump",
      "Secondary System Pump"
    ]
  },
  {
    "equipment_type": "Primary Pump",
    "tag_prefix": "PP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Taco, Armstrong, B&G, Wilo",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Primary Pump",
    "canonical_tag": "PP",
    "aliases": [
      "PP",
      "Primary Pump",
      "Primary System Pump"
    ]
  },
  {
    "equipment_type": "Booster Pump",
    "tag_prefix": "BP",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Grundfos, Armstrong, Taco, Xylem, Patterson, Aurora",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Booster Pump",
    "canonical_tag": "BP",
    "aliases": [
      "BP",
      "Booster Pump",
      "Pressure Booster Pump"
    ]
  },
  {
    "equipment_type": "Circulator Pump",
    "tag_prefix": "P",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Taco, Grundfos, B&G, Armstrong",
    "quarterly_hours": 0.4,
    "semi_annual_hours": 0.8,
    "annual_hours": 1.5,
    "monthly_hours": 0.1333,
    "description": "",
    "canonical_label": "Circulator Pump",
    "canonical_tag": "P",
    "aliases": [
      "P",
      "Circulator Pump",
      "Circ Pump",
      "Circulator"
    ]
  },
  {
    "equipment_type": "Expansion Tank",
    "tag_prefix": "ET",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Amtrol, Wessels, Taco, B&G, Armstrong, Watts",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Expansion Tank",
    "canonical_tag": "ET",
    "aliases": [
      "ET",
      "Expansion Tank",
      "Expansion Vessel"
    ]
  },
  {
    "equipment_type": "Compression Tank",
    "tag_prefix": "CTK",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Wessels, Taco, B&G, Armstrong",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Compression Tank",
    "canonical_tag": "CTK",
    "aliases": [
      "CTK",
      "Compression Tank"
    ]
  },
  {
    "equipment_type": "Air Separator",
    "tag_prefix": "AS",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Spirotherm, Taco, Bell & Gossett, Armstrong, Caleffi",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 0.75,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Air Separator",
    "canonical_tag": "AS",
    "aliases": [
      "AS",
      "Air Separator",
      "Air Sep"
    ]
  },
  {
    "equipment_type": "Dirt Separator",
    "tag_prefix": "DS",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Spirotherm, Caleffi, Taco, Armstrong",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 0.75,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Dirt Separator",
    "canonical_tag": "DS",
    "aliases": [
      "DS",
      "Dirt Separator",
      "Dirt Sep"
    ]
  },
  {
    "equipment_type": "Hydraulic Separator",
    "tag_prefix": "HS",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Caleffi, Taco, Viessmann, Spirotherm",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 0.75,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Hydraulic Separator",
    "canonical_tag": "HS",
    "aliases": [
      "HS",
      "Hydraulic Separator",
      "Hydro Separator",
      "Low Loss Header"
    ]
  },
  {
    "equipment_type": "Buffer Tank",
    "tag_prefix": "BT",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Axiom, Lochinvar, Amtrol, Wessels, Taco",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 1.5,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Buffer Tank",
    "canonical_tag": "BT",
    "aliases": [
      "BT",
      "Buffer Tank",
      "Buffer Vessel"
    ]
  },
  {
    "equipment_type": "Glycol Feeder",
    "tag_prefix": "GF",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Axiom, Sentinel, Precision Hydronics, Watts",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Glycol Feeder",
    "canonical_tag": "GF",
    "aliases": [
      "GF",
      "Glycol Feeder",
      "Glycol Fill Pot"
    ]
  },
  {
    "equipment_type": "Chemical Feeder",
    "tag_prefix": "CF",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Neptune, Sentinel, Axiom, Nalco",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Chemical Feeder",
    "canonical_tag": "CF",
    "aliases": [
      "CF",
      "Chemical Feeder",
      "Chemical Pot",
      "Chem Feeder"
    ]
  },
  {
    "equipment_type": "Pot Feeder",
    "tag_prefix": "PF",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Axiom, Neptune, Sentinel",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Pot Feeder",
    "canonical_tag": "PF",
    "aliases": [
      "PF",
      "Pot Feeder"
    ]
  },
  {
    "equipment_type": "Mixing Valve",
    "tag_prefix": "MV",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Caleffi, Watts, Honeywell, Leonard, Armstrong",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Mixing Valve",
    "canonical_tag": "MV",
    "aliases": [
      "MV",
      "Mixing Valve",
      "Tempering Valve"
    ]
  },
  {
    "equipment_type": "Balancing Valve",
    "tag_prefix": "BV",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "B&G, Caleffi, TA, Griswold, Watts",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Balancing Valve",
    "canonical_tag": "BV",
    "aliases": [
      "BV",
      "Balancing Valve",
      "Balance Valve"
    ]
  },
  {
    "equipment_type": "Control Valve",
    "tag_prefix": "CV",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Belimo, Honeywell, Siemens, Johnson Controls, Danfoss",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Control Valve",
    "canonical_tag": "CV",
    "aliases": [
      "CV",
      "Control Valve",
      "Automatic Control Valve"
    ]
  },
  {
    "equipment_type": "Zone Valve",
    "tag_prefix": "ZV",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Taco, Honeywell, Belimo, Danfoss",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Zone Valve",
    "canonical_tag": "ZV",
    "aliases": [
      "ZV",
      "Zone Valve"
    ]
  },
  {
    "equipment_type": "Triple Duty Valve",
    "tag_prefix": "TDV",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Taco, B&G, Armstrong, Watts",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 0.75,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Triple Duty Valve",
    "canonical_tag": "TDV",
    "aliases": [
      "TDV",
      "Triple Duty Valve",
      "Triple Duty"
    ]
  },
  {
    "equipment_type": "Strainer",
    "tag_prefix": "STR",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "Watts, Apollo, Mueller, Victaulic",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Strainer",
    "canonical_tag": "STR",
    "aliases": [
      "STR",
      "Strainer",
      "Y-Strainer",
      "Basket Strainer"
    ]
  },
  {
    "equipment_type": "Low Water Cutoff",
    "tag_prefix": "LWCO",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "McDonnell & Miller, Hydrolevel, Safgard",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Low Water Cutoff",
    "canonical_tag": "LWCO",
    "aliases": [
      "LWCO",
      "Low Water Cutoff",
      "Low-Water Cutoff"
    ]
  },
  {
    "equipment_type": "Condensate Neutralizer",
    "tag_prefix": "CN",
    "category": "HYDRONIC_PLANT",
    "manufacturers": "RectorSeal, Diversitech, JJM, Watts",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Condensate Neutralizer",
    "canonical_tag": "CN",
    "aliases": [
      "CN",
      "Condensate Neutralizer",
      "Neutralizer"
    ]
  },
  {
    "equipment_type": "Domestic Hot Water Heater",
    "tag_prefix": "WH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "AO Smith, Bradford White, Rheem, John Wood, Navien, Rinnai, Noritz, Bosch, Lochinvar, State",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Domestic Hot Water Heater",
    "canonical_tag": "WH",
    "aliases": [
      "WH",
      "Domestic Hot Water Heater",
      "Water Heater"
    ]
  },
  {
    "equipment_type": "Storage Tank",
    "tag_prefix": "DHWT",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "AO Smith, Lochinvar, Bradford White, Rheem, Amtrol, Wessels, Vaughn",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Storage Tank",
    "canonical_tag": "DHWT",
    "aliases": [
      "DHWT",
      "Storage Tank",
      "DHW Tank"
    ]
  },
  {
    "equipment_type": "Indirect Water Heater",
    "tag_prefix": "IWH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Viessmann, Lochinvar, SuperStor, Triangle Tube, NTI",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Indirect Water Heater",
    "canonical_tag": "IWH",
    "aliases": [
      "IWH",
      "Indirect Water Heater"
    ]
  },
  {
    "equipment_type": "Tankless Water Heater",
    "tag_prefix": "TWH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Navien, Rinnai, Noritz, Bosch, Takagi, IBC",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Tankless Water Heater",
    "canonical_tag": "TWH",
    "aliases": [
      "TWH",
      "Tankless Water Heater"
    ]
  },
  {
    "equipment_type": "DHW Recirculation Pump",
    "tag_prefix": "HWRP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Grundfos, Taco, Armstrong, Bell & Gossett, Wilo",
    "quarterly_hours": 0.4,
    "semi_annual_hours": 0.8,
    "annual_hours": 1.5,
    "monthly_hours": 0.1333,
    "description": "",
    "canonical_label": "DHW Recirculation Pump",
    "canonical_tag": "HWRP",
    "aliases": [
      "HWRP",
      "DHW Recirculation Pump",
      "Recirc Pump"
    ]
  },
  {
    "equipment_type": "Domestic Booster Pump",
    "tag_prefix": "DBP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Grundfos, Armstrong, Taco, Xylem, Aurora, Patterson",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Domestic Booster Pump",
    "canonical_tag": "DBP",
    "aliases": [
      "DBP",
      "Domestic Booster Pump",
      "Booster Pump"
    ]
  },
  {
    "equipment_type": "Booster Pump Package",
    "tag_prefix": "BPS",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Grundfos, Armstrong, Xylem, Patterson, Aurora, Wilo",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Booster Pump Package",
    "canonical_tag": "BPS",
    "aliases": [
      "BPS",
      "Booster Pump Package",
      "Booster Package"
    ]
  },
  {
    "equipment_type": "Pressure Reducing Valve",
    "tag_prefix": "PRV",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Watts, Apollo, Honeywell, Cash Acme, Wilkins",
    "quarterly_hours": 0.2,
    "semi_annual_hours": 0.4,
    "annual_hours": 0.75,
    "monthly_hours": 0.0667,
    "description": "",
    "canonical_label": "Pressure Reducing Valve",
    "canonical_tag": "PRV",
    "aliases": [
      "PRV",
      "Pressure Reducing Valve",
      "PR Valve"
    ]
  },
  {
    "equipment_type": "Backflow Preventer",
    "tag_prefix": "BFP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Watts, Wilkins, Febco, Ames, Zurn",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Backflow Preventer",
    "canonical_tag": "BFP",
    "aliases": [
      "BFP",
      "Backflow Preventer",
      "Backflow Assembly"
    ]
  },
  {
    "equipment_type": "Mixing Valve",
    "tag_prefix": "MV",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Watts, Caleffi, Leonard, Honeywell, Armstrong",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Mixing Valve",
    "canonical_tag": "MV",
    "aliases": [
      "MV",
      "Mixing Valve",
      "Tempering Valve"
    ]
  },
  {
    "equipment_type": "Expansion Tank",
    "tag_prefix": "ET",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Amtrol, Watts, Wessels, Taco, B&G",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Expansion Tank",
    "canonical_tag": "ET",
    "aliases": [
      "ET",
      "Expansion Tank",
      "Expansion Vessel"
    ]
  },
  {
    "equipment_type": "Water Softener",
    "tag_prefix": "WS",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Culligan, Canature, Pentair, EcoWater, Clack",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Water Softener",
    "canonical_tag": "WS",
    "aliases": [
      "WS",
      "Water Softener"
    ]
  },
  {
    "equipment_type": "Sand Filter",
    "tag_prefix": "SF",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Pentair, Culligan, Watts, Hayward",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Sand Filter",
    "canonical_tag": "SF",
    "aliases": [
      "SF",
      "Sand Filter"
    ]
  },
  {
    "equipment_type": "Cartridge Filter Housing",
    "tag_prefix": "CFH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Pentek, Watts, 3M, Culligan, Pentair",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Cartridge Filter Housing",
    "canonical_tag": "CFH",
    "aliases": [
      "CFH",
      "Cartridge Filter Housing",
      "Filter Housing"
    ]
  },
  {
    "equipment_type": "UV Sterilizer",
    "tag_prefix": "UV",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Trojan, Viqua, Wedeco, Sterilight",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "UV Sterilizer",
    "canonical_tag": "UV",
    "aliases": [
      "UV",
      "UV Sterilizer",
      "UV Unit"
    ]
  },
  {
    "equipment_type": "Reverse Osmosis",
    "tag_prefix": "RO",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Watts, Culligan, Pentair, AXEON, Puretec",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Reverse Osmosis",
    "canonical_tag": "RO",
    "aliases": [
      "RO",
      "Reverse Osmosis",
      "RO Unit"
    ]
  },
  {
    "equipment_type": "Water Meter",
    "tag_prefix": "WM",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Neptune, Sensus, Badger, Kamstrup, Itron",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Water Meter",
    "canonical_tag": "WM",
    "aliases": [
      "WM",
      "Water Meter"
    ]
  },
  {
    "equipment_type": "Gas Water Heater",
    "tag_prefix": "GWH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "AO Smith, Rheem, Bradford White, Lochinvar, Raypak",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Gas Water Heater",
    "canonical_tag": "GWH",
    "aliases": [
      "GWH",
      "Gas Water Heater"
    ]
  },
  {
    "equipment_type": "Electric Water Heater",
    "tag_prefix": "EWH",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Rheem, AO Smith, John Wood, Bradford White",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Electric Water Heater",
    "canonical_tag": "EWH",
    "aliases": [
      "EWH",
      "Electric Water Heater"
    ]
  },
  {
    "equipment_type": "Sewage Ejector Pump",
    "tag_prefix": "SEP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Liberty, Zoeller, Myers, Barnes, Hydromatic",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Sewage Ejector Pump",
    "canonical_tag": "SEP",
    "aliases": [
      "SEP",
      "Sewage Ejector Pump"
    ]
  },
  {
    "equipment_type": "Sewage Pump Package",
    "tag_prefix": "SPP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Liberty, Zoeller, Myers, Flygt, Hydromatic",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Sewage Pump Package",
    "canonical_tag": "SPP",
    "aliases": [
      "SPP",
      "Sewage Pump Package",
      "Duplex Sewage Package",
      "Sewage Package"
    ]
  },
  {
    "equipment_type": "Grinder Pump",
    "tag_prefix": "GP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Liberty, Zoeller, Myers, EOne",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Grinder Pump",
    "canonical_tag": "GP",
    "aliases": [
      "GP",
      "Grinder Pump"
    ]
  },
  {
    "equipment_type": "Lift Station",
    "tag_prefix": "LS",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Flygt, Liberty, Zoeller, Myers, Xylem",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Lift Station",
    "canonical_tag": "LS",
    "aliases": [
      "LS",
      "Lift Station",
      "Sewage Lift Station",
      "Wastewater Lift Station"
    ]
  },
  {
    "equipment_type": "Condensate Pump",
    "tag_prefix": "CP",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Little Giant, Diversitech, Rectorseal, Aspen",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Condensate Pump",
    "canonical_tag": "CP",
    "aliases": [
      "CP",
      "Condensate Pump",
      "Cond Pump",
      "Condensate Lift Pump"
    ]
  },
  {
    "equipment_type": "Grease Interceptor",
    "tag_prefix": "GI",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Schier, Zurn, Josam, Watts, Rockford",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 3,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Grease Interceptor",
    "canonical_tag": "GI",
    "aliases": [
      "GI",
      "Grease Interceptor"
    ]
  },
  {
    "equipment_type": "Grease Trap",
    "tag_prefix": "GT",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Schier, Zurn, Josam, Canplas",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 3,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Grease Trap",
    "canonical_tag": "GT",
    "aliases": [
      "GT",
      "Grease Trap"
    ]
  },
  {
    "equipment_type": "Oil Interceptor",
    "tag_prefix": "OI",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Zurn, Josam, Wade, Highland Tank",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 3,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Oil Interceptor",
    "canonical_tag": "OI",
    "aliases": [
      "OI",
      "Oil Interceptor"
    ]
  },
  {
    "equipment_type": "Solids Interceptor",
    "tag_prefix": "SI",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Zurn, Schier, Josam",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Solids Interceptor",
    "canonical_tag": "SI",
    "aliases": [
      "SI",
      "Solids Interceptor"
    ]
  },
  {
    "equipment_type": "Acid Neutralizer",
    "tag_prefix": "ANT",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Zurn, Watts, Schier, Josam",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Acid Neutralizer",
    "canonical_tag": "ANT",
    "aliases": [
      "ANT",
      "Acid Neutralizer",
      "Neutralizer"
    ]
  },
  {
    "equipment_type": "Plaster Interceptor",
    "tag_prefix": "PI",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Zurn, Josam, Schier",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Plaster Interceptor",
    "canonical_tag": "PI",
    "aliases": [
      "PI",
      "Plaster Interceptor"
    ]
  },
  {
    "equipment_type": "Sediment Interceptor",
    "tag_prefix": "SDI",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Schier, Zurn, Josam",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Sediment Interceptor",
    "canonical_tag": "SDI",
    "aliases": [
      "SDI",
      "Sediment Interceptor"
    ]
  },
  {
    "equipment_type": "Eye Wash Station",
    "tag_prefix": "EWS",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Haws, Bradley, Guardian",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Eye Wash Station",
    "canonical_tag": "EWS",
    "aliases": [
      "EWS",
      "Eye Wash Station",
      "Eyewash"
    ]
  },
  {
    "equipment_type": "Emergency Shower",
    "tag_prefix": "ES",
    "category": "PLUMBING_WATER_SYSTEMS",
    "manufacturers": "Haws, Bradley, Guardian",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Emergency Shower",
    "canonical_tag": "ES",
    "aliases": [
      "ES",
      "Emergency Shower"
    ]
  },
  {
    "equipment_type": "Sump Pump",
    "tag_prefix": "SMP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, Hydromatic, Little Giant, Flygt, Xylem, Barnes",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Sump Pump",
    "canonical_tag": "SMP",
    "aliases": [
      "SMP",
      "Sump Pump"
    ]
  },
  {
    "equipment_type": "Duplex Sump Pump",
    "tag_prefix": "DSP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, Flygt, Hydromatic, Xylem",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Duplex Sump Pump",
    "canonical_tag": "DSP",
    "aliases": [
      "DSP",
      "Duplex Sump Pump",
      "Duplex Sump",
      "Lead-Lag Sump Pump"
    ]
  },
  {
    "equipment_type": "Storm Pump",
    "tag_prefix": "STP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Flygt, Myers, Xylem, Barnes",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Storm Pump",
    "canonical_tag": "STP",
    "aliases": [
      "STP",
      "Storm Pump",
      "Stormwater Pump"
    ]
  },
  {
    "equipment_type": "Sewage Pump",
    "tag_prefix": "SWP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, Barnes, Flygt, Hydromatic",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Sewage Pump",
    "canonical_tag": "SWP",
    "aliases": [
      "SWP",
      "Sewage Pump",
      "Sanitary Pump",
      "Sewage Ejector Pump"
    ]
  },
  {
    "equipment_type": "Sewage Pump Package",
    "tag_prefix": "SPP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, Flygt, Xylem",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 4,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Sewage Pump Package",
    "canonical_tag": "SPP",
    "aliases": [
      "SPP",
      "Sewage Pump Package",
      "Duplex Sewage Package",
      "Sewage Package"
    ]
  },
  {
    "equipment_type": "Grinder Pump",
    "tag_prefix": "GP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, EOne, Barnes",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Grinder Pump",
    "canonical_tag": "GP",
    "aliases": [
      "GP",
      "Grinder Pump"
    ]
  },
  {
    "equipment_type": "Lift Station",
    "tag_prefix": "LS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Flygt, Xylem, Liberty, Zoeller, Myers, Barnes",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Lift Station",
    "canonical_tag": "LS",
    "aliases": [
      "LS",
      "Lift Station",
      "Sewage Lift Station",
      "Wastewater Lift Station"
    ]
  },
  {
    "equipment_type": "Sump Basin",
    "tag_prefix": "SB",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Orenco, Polylok, NDS",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Sump Basin",
    "canonical_tag": "SB",
    "aliases": [
      "SB",
      "Sump Basin",
      "Sump Pit"
    ]
  },
  {
    "equipment_type": "Sewage Basin",
    "tag_prefix": "SEB",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Liberty, Zoeller, Myers, Orenco, Polylok",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Sewage Basin",
    "canonical_tag": "SEB",
    "aliases": [
      "SEB",
      "Sewage Basin",
      "Sewage Pit",
      "Sanitary Basin"
    ]
  },
  {
    "equipment_type": "Catch Basin",
    "tag_prefix": "CB",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, NDS, ACO, Oldcastle, Contech, Mifab, Wade",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1.5,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Catch Basin",
    "canonical_tag": "CB",
    "aliases": [
      "CB",
      "Catch Basin"
    ]
  },
  {
    "equipment_type": "Area Drain",
    "tag_prefix": "AD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Wade, Josam, Jay R Smith, Mifab",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Area Drain",
    "canonical_tag": "AD",
    "aliases": [
      "AD",
      "Area Drain"
    ]
  },
  {
    "equipment_type": "Floor Drain",
    "tag_prefix": "FD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Wade, Josam, Jay R Smith, Mifab, Watts",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Floor Drain",
    "canonical_tag": "FD",
    "aliases": [
      "FD",
      "Floor Drain"
    ]
  },
  {
    "equipment_type": "Floor Sink",
    "tag_prefix": "FS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Wade, Josam, Smith, Mifab",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Floor Sink",
    "canonical_tag": "FS",
    "aliases": [
      "FS",
      "Floor Sink"
    ]
  },
  {
    "equipment_type": "Trench Drain",
    "tag_prefix": "TD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "ACO, Zurn, Mifab, Watts, NDS, Polylok",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 2,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Trench Drain",
    "canonical_tag": "TD",
    "aliases": [
      "TD",
      "Trench Drain",
      "Linear Trench Drain"
    ]
  },
  {
    "equipment_type": "Slot Drain",
    "tag_prefix": "SD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "ACO, Zurn, Mifab, Wade",
    "quarterly_hours": 0.2,
    "semi_annual_hours": 0.4,
    "annual_hours": 1.5,
    "monthly_hours": 0.0667,
    "description": "",
    "canonical_label": "Slot Drain",
    "canonical_tag": "SD",
    "aliases": [
      "SD",
      "Slot Drain"
    ]
  },
  {
    "equipment_type": "Channel Drain",
    "tag_prefix": "CD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "ACO, Zurn, Mifab, NDS",
    "quarterly_hours": 0.2,
    "semi_annual_hours": 0.4,
    "annual_hours": 1.5,
    "monthly_hours": 0.0667,
    "description": "",
    "canonical_label": "Channel Drain",
    "canonical_tag": "CD",
    "aliases": [
      "CD",
      "Channel Drain"
    ]
  },
  {
    "equipment_type": "Roof Drain",
    "tag_prefix": "RD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Wade, Josam, Jay R Smith, Mifab",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Roof Drain",
    "canonical_tag": "RD",
    "aliases": [
      "RD",
      "Roof Drain"
    ]
  },
  {
    "equipment_type": "Overflow Roof Drain",
    "tag_prefix": "ORD",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Wade, Josam, Smith",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Overflow Roof Drain",
    "canonical_tag": "ORD",
    "aliases": [
      "ORD",
      "Overflow Roof Drain",
      "Overflow Drain",
      "Emergency Roof Drain"
    ]
  },
  {
    "equipment_type": "Rainwater Leader",
    "tag_prefix": "RL",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "pipe system",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Rainwater Leader",
    "canonical_tag": "RL",
    "aliases": [
      "RL",
      "Rainwater Leader",
      "Leader",
      "Storm Leader"
    ]
  },
  {
    "equipment_type": "Cleanout",
    "tag_prefix": "CO",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Wade, Zurn, Josam, Smith, Mifab",
    "quarterly_hours": 0.05,
    "semi_annual_hours": 0.1,
    "annual_hours": 0.25,
    "monthly_hours": 0.0167,
    "description": "",
    "canonical_label": "Cleanout",
    "canonical_tag": "CO",
    "aliases": [
      "CO",
      "Cleanout",
      "Clean Out",
      "C/O"
    ]
  },
  {
    "equipment_type": "Backwater Valve",
    "tag_prefix": "BWV",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Mainline, Zurn, Josam, Canplas, Watts",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Backwater Valve",
    "canonical_tag": "BWV",
    "aliases": [
      "BWV",
      "Backwater Valve",
      "Sewer Backwater Valve"
    ]
  },
  {
    "equipment_type": "Oil Water Separator",
    "tag_prefix": "OWS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Highland Tank, Zurn, Mercer, Containment Solutions, ParkUSA",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 4,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Oil Water Separator",
    "canonical_tag": "OWS",
    "aliases": [
      "OWS",
      "Oil Water Separator",
      "O/W Separator",
      "Oil Separator"
    ]
  },
  {
    "equipment_type": "Sand Oil Interceptor",
    "tag_prefix": "SOI",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Zurn, Josam, Schier, Highland Tank",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 3,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Sand Oil Interceptor",
    "canonical_tag": "SOI",
    "aliases": [
      "SOI",
      "Sand Oil Interceptor",
      "Sand/Oil Interceptor"
    ]
  },
  {
    "equipment_type": "Neutralization Basin",
    "tag_prefix": "NB",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Schier, Watts, Zurn, Josam",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Neutralization Basin",
    "canonical_tag": "NB",
    "aliases": [
      "NB",
      "Neutralization Basin",
      "Acid Neutralization Basin"
    ]
  },
  {
    "equipment_type": "Storm Separator",
    "tag_prefix": "SWS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Contech, CDS, Oldcastle, Stormceptor",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 4,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Storm Separator",
    "canonical_tag": "SWS",
    "aliases": [
      "SWS",
      "Storm Separator",
      "Stormwater Separator"
    ]
  },
  {
    "equipment_type": "Rainwater Tank",
    "tag_prefix": "RWT",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Snyder, Xerxes, Norwesco, RainHarvest",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Rainwater Tank",
    "canonical_tag": "RWT",
    "aliases": [
      "RWT",
      "Rainwater Tank",
      "Harvest Tank",
      "Rainwater Storage Tank"
    ]
  },
  {
    "equipment_type": "Condensate Pump",
    "tag_prefix": "CP",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Little Giant, Diversitech, RectorSeal, Aspen",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Condensate Pump",
    "canonical_tag": "CP",
    "aliases": [
      "CP",
      "Condensate Pump",
      "Cond Pump",
      "Condensate Lift Pump"
    ]
  },
  {
    "equipment_type": "Drainage Lift Station",
    "tag_prefix": "DLS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Flygt, Xylem, Liberty, Zoeller, Myers",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Drainage Lift Station",
    "canonical_tag": "DLS",
    "aliases": [
      "DLS",
      "Drainage Lift Station",
      "Drain Lift Station"
    ]
  },
  {
    "equipment_type": "Manhole Pump Station",
    "tag_prefix": "PS",
    "category": "PLUMBING_DRAINAGE",
    "manufacturers": "Flygt, Xylem, Myers, Barnes",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Manhole Pump Station",
    "canonical_tag": "PS",
    "aliases": [
      "PS",
      "Manhole Pump Station",
      "Pump Station",
      "Site Pump Station"
    ]
  },
  {
    "equipment_type": "BAS Controller",
    "tag_prefix": "DDC",
    "category": "CONTROLS_BAS",
    "manufacturers": "Johnson Controls, Siemens, Honeywell, Schneider, Delta Controls, Distech, Alerton, Reliable, Tridium",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "BAS Controller",
    "canonical_tag": "DDC",
    "aliases": [
      "DDC",
      "BAS Controller",
      "DDC Controller"
    ]
  },
  {
    "equipment_type": "BAS Panel",
    "tag_prefix": "CP",
    "category": "CONTROLS_BAS",
    "manufacturers": "Johnson Controls, Siemens, Honeywell, Schneider, Delta, Distech, Reliable",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "BAS Panel",
    "canonical_tag": "CP",
    "aliases": [
      "CP",
      "BAS Panel",
      "Control Panel"
    ]
  },
  {
    "equipment_type": "Network Controller",
    "tag_prefix": "NC",
    "category": "CONTROLS_BAS",
    "manufacturers": "Tridium, JCI, Siemens, Honeywell, Schneider, Delta",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Network Controller",
    "canonical_tag": "NC",
    "aliases": [
      "NC",
      "Network Controller"
    ]
  },
  {
    "equipment_type": "VFD",
    "tag_prefix": "VFD",
    "category": "CONTROLS_BAS",
    "manufacturers": "ABB, Danfoss, Yaskawa, Schneider, Siemens, Eaton, Allen Bradley, Toshiba",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "VFD",
    "canonical_tag": "VFD",
    "aliases": [
      "VFD",
      "Variable Frequency Drive"
    ]
  },
  {
    "equipment_type": "Thermostat",
    "tag_prefix": "T",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Johnson Controls, Siemens, Schneider, Tekmar, Ecobee",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Thermostat",
    "canonical_tag": "T",
    "aliases": [
      "T",
      "Thermostat"
    ]
  },
  {
    "equipment_type": "Space Sensor",
    "tag_prefix": "TS",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Siemens, JCI, Schneider, Delta, Distech",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Space Sensor",
    "canonical_tag": "TS",
    "aliases": [
      "TS",
      "Space Sensor",
      "Temperature Sensor"
    ]
  },
  {
    "equipment_type": "Humidity Sensor",
    "tag_prefix": "HS",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Vaisala, Siemens, JCI, Schneider",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Humidity Sensor",
    "canonical_tag": "HS",
    "aliases": [
      "HS",
      "Humidity Sensor"
    ]
  },
  {
    "equipment_type": "Pressure Sensor",
    "tag_prefix": "PS",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Ashcroft, Dwyer, Siemens, Setra",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Pressure Sensor",
    "canonical_tag": "PS",
    "aliases": [
      "PS",
      "Pressure Sensor"
    ]
  },
  {
    "equipment_type": "Differential Pressure Sensor",
    "tag_prefix": "DPS",
    "category": "CONTROLS_BAS",
    "manufacturers": "Setra, Dwyer, Honeywell, Siemens, Ashcroft",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Differential Pressure Sensor",
    "canonical_tag": "DPS",
    "aliases": [
      "DPS",
      "Differential Pressure Sensor"
    ]
  },
  {
    "equipment_type": "Flow Switch",
    "tag_prefix": "FS",
    "category": "CONTROLS_BAS",
    "manufacturers": "McDonnell Miller, Taco, Dwyer, Gems, Honeywell",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Flow Switch",
    "canonical_tag": "FS",
    "aliases": [
      "FS",
      "Flow Switch"
    ]
  },
  {
    "equipment_type": "Flow Meter",
    "tag_prefix": "FM",
    "category": "CONTROLS_BAS",
    "manufacturers": "Onicon, Badger, Siemens, Krohne, Taco",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Flow Meter",
    "canonical_tag": "FM",
    "aliases": [
      "FM",
      "Flow Meter"
    ]
  },
  {
    "equipment_type": "Motorized Damper",
    "tag_prefix": "MD",
    "category": "CONTROLS_BAS",
    "manufacturers": "Belimo, Honeywell, Siemens, Ruskin, Greenheck, Nailor",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Motorized Damper",
    "canonical_tag": "MD",
    "aliases": [
      "MD",
      "Motorized Damper"
    ]
  },
  {
    "equipment_type": "Fire Damper",
    "tag_prefix": "FD",
    "category": "CONTROLS_BAS",
    "manufacturers": "Ruskin, Greenheck, Nailor, Prefco, Halton",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Fire Damper",
    "canonical_tag": "FD",
    "aliases": [
      "FD",
      "Fire Damper"
    ]
  },
  {
    "equipment_type": "Smoke Damper",
    "tag_prefix": "SD",
    "category": "CONTROLS_BAS",
    "manufacturers": "Ruskin, Greenheck, Nailor, Prefco, Halton",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Smoke Damper",
    "canonical_tag": "SD",
    "aliases": [
      "SD",
      "Smoke Damper"
    ]
  },
  {
    "equipment_type": "Fire Smoke Damper",
    "tag_prefix": "FSD",
    "category": "CONTROLS_BAS",
    "manufacturers": "Ruskin, Greenheck, Nailor, Halton",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Fire Smoke Damper",
    "canonical_tag": "FSD",
    "aliases": [
      "FSD",
      "Fire Smoke Damper"
    ]
  },
  {
    "equipment_type": "Control Valve Actuator",
    "tag_prefix": "ACT",
    "category": "CONTROLS_BAS",
    "manufacturers": "Belimo, Honeywell, Siemens, JCI, Danfoss",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.5,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Control Valve Actuator",
    "canonical_tag": "ACT",
    "aliases": [
      "ACT",
      "Control Valve Actuator",
      "Actuator"
    ]
  },
  {
    "equipment_type": "Control Valve",
    "tag_prefix": "CV",
    "category": "CONTROLS_BAS",
    "manufacturers": "Belimo, Honeywell, Siemens, Danfoss, Johnson Controls",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "",
    "canonical_label": "Control Valve",
    "canonical_tag": "CV",
    "aliases": [
      "CV",
      "Control Valve",
      "Automatic Control Valve"
    ]
  },
  {
    "equipment_type": "Gas Detector",
    "tag_prefix": "GD",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Bacharach, MSA, RKI, Sensidyne",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Gas Detector",
    "canonical_tag": "GD",
    "aliases": [
      "GD",
      "Gas Detector"
    ]
  },
  {
    "equipment_type": "CO Sensor",
    "tag_prefix": "CO",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Bacharach, Siemens, MSA",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "CO Sensor",
    "canonical_tag": "CO",
    "aliases": [
      "CO",
      "CO Sensor",
      "Carbon Monoxide Sensor"
    ]
  },
  {
    "equipment_type": "NO2 Sensor",
    "tag_prefix": "NO2",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Bacharach, Siemens",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "NO2 Sensor",
    "canonical_tag": "NO2",
    "aliases": [
      "NO2",
      "NO2 Sensor"
    ]
  },
  {
    "equipment_type": "Control Transformer",
    "tag_prefix": "XFMR",
    "category": "CONTROLS_BAS",
    "manufacturers": "Square D, Eaton, Siemens, Schneider",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Control Transformer",
    "canonical_tag": "XFMR",
    "aliases": [
      "XFMR",
      "Control Transformer",
      "Transformer"
    ]
  },
  {
    "equipment_type": "Relay Panel",
    "tag_prefix": "RP",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Siemens, JCI, Schneider",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Relay Panel",
    "canonical_tag": "RP",
    "aliases": [
      "RP",
      "Relay Panel"
    ]
  },
  {
    "equipment_type": "Interface Module",
    "tag_prefix": "IM",
    "category": "CONTROLS_BAS",
    "manufacturers": "Tridium, JCI, Siemens, Honeywell",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Interface Module",
    "canonical_tag": "IM",
    "aliases": [
      "IM",
      "Interface Module"
    ]
  },
  {
    "equipment_type": "BACnet Gateway",
    "tag_prefix": "GW",
    "category": "CONTROLS_BAS",
    "manufacturers": "Tridium, Schneider, Siemens, JCI",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "BACnet Gateway",
    "canonical_tag": "GW",
    "aliases": [
      "GW",
      "BACnet Gateway",
      "Gateway"
    ]
  },
  {
    "equipment_type": "Time Clock",
    "tag_prefix": "TC",
    "category": "CONTROLS_BAS",
    "manufacturers": "Intermatic, Honeywell, Siemens",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Time Clock",
    "canonical_tag": "TC",
    "aliases": [
      "TC",
      "Time Clock",
      "Timer"
    ]
  },
  {
    "equipment_type": "Level Sensor",
    "tag_prefix": "LS",
    "category": "CONTROLS_BAS",
    "manufacturers": "Gems, Dwyer, Siemens, Honeywell",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Level Sensor",
    "canonical_tag": "LS",
    "aliases": [
      "LS",
      "Level Sensor"
    ]
  },
  {
    "equipment_type": "Float Switch",
    "tag_prefix": "FLS",
    "category": "CONTROLS_BAS",
    "manufacturers": "SJE Rhombus, Dwyer, Gems, Liberty",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Float Switch",
    "canonical_tag": "FLS",
    "aliases": [
      "FLS",
      "Float Switch"
    ]
  },
  {
    "equipment_type": "Alarm Panel",
    "tag_prefix": "AP",
    "category": "CONTROLS_BAS",
    "manufacturers": "Honeywell, Siemens, Edwards, Notifier",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Alarm Panel",
    "canonical_tag": "AP",
    "aliases": [
      "AP",
      "Alarm Panel"
    ]
  },
  {
    "equipment_type": "Fuel Oil Tank",
    "tag_prefix": "FOT",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Highland Tank, Granby, Roth, ZCL, Containment Solutions",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Fuel Oil Tank",
    "canonical_tag": "FOT",
    "aliases": [
      "FOT",
      "Fuel Oil Tank"
    ]
  },
  {
    "equipment_type": "Day Tank",
    "tag_prefix": "DT",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Highland Tank, Generac, Simplex, Titan",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Day Tank",
    "canonical_tag": "DT",
    "aliases": [
      "DT",
      "Day Tank"
    ]
  },
  {
    "equipment_type": "Fuel Transfer Pump",
    "tag_prefix": "FTP",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Viking, Grundfos, Tuthill, Gorman Rupp",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Fuel Transfer Pump",
    "canonical_tag": "FTP",
    "aliases": [
      "FTP",
      "Fuel Transfer Pump"
    ]
  },
  {
    "equipment_type": "Fuel Filter",
    "tag_prefix": "FF",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Racor, Parker, Baldwin, Fleetguard",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Fuel Filter",
    "canonical_tag": "FF",
    "aliases": [
      "FF",
      "Fuel Filter"
    ]
  },
  {
    "equipment_type": "Fuel Regulator",
    "tag_prefix": "FR",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Maxitrol, Fisher, Honeywell",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Fuel Regulator",
    "canonical_tag": "FR",
    "aliases": [
      "FR",
      "Fuel Regulator"
    ]
  },
  {
    "equipment_type": "Diesel Generator",
    "tag_prefix": "GEN",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Cummins, Caterpillar, Kohler, Generac, MTU",
    "quarterly_hours": 1,
    "semi_annual_hours": 2,
    "annual_hours": 5,
    "monthly_hours": 0.3333,
    "description": "",
    "canonical_label": "Diesel Generator",
    "canonical_tag": "GEN",
    "aliases": [
      "GEN",
      "Diesel Generator",
      "Generator"
    ]
  },
  {
    "equipment_type": "Generator Radiator",
    "tag_prefix": "RAD",
    "category": "EMERGENCY_POWER_FUEL",
    "manufacturers": "Cummins, CAT, Generac",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Generator Radiator",
    "canonical_tag": "RAD",
    "aliases": [
      "RAD",
      "Generator Radiator",
      "Radiator"
    ]
  },
  {
    "equipment_type": "Chemical Feeder",
    "tag_prefix": "CF",
    "category": "CHEMICAL_TREATMENT",
    "manufacturers": "Nalco, ChemTreat, Neptune, Pulsafeeder",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Chemical Feeder",
    "canonical_tag": "CF",
    "aliases": [
      "CF",
      "Chemical Feeder",
      "Chemical Pot",
      "Chem Feeder"
    ]
  },
  {
    "equipment_type": "Side Stream Filter",
    "tag_prefix": "SSF",
    "category": "CHEMICAL_TREATMENT",
    "manufacturers": "Lakos, Eaton, Amiad, Parker",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Side Stream Filter",
    "canonical_tag": "SSF",
    "aliases": [
      "SSF",
      "Side Stream Filter"
    ]
  },
  {
    "equipment_type": "Conductivity Controller",
    "tag_prefix": "CC",
    "category": "CHEMICAL_TREATMENT",
    "manufacturers": "Walchem, LMI, Neptune, Honeywell",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Conductivity Controller",
    "canonical_tag": "CC",
    "aliases": [
      "CC",
      "Conductivity Controller"
    ]
  },
  {
    "equipment_type": "Chemical Pump",
    "tag_prefix": "CHP",
    "category": "CHEMICAL_TREATMENT",
    "manufacturers": "Pulsafeeder, LMI, Milton Roy",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Chemical Pump",
    "canonical_tag": "CHP",
    "aliases": [
      "CHP",
      "Chemical Pump"
    ]
  },
  {
    "equipment_type": "Cooling Tower Basin Heater",
    "tag_prefix": "BH",
    "category": "CHEMICAL_TREATMENT",
    "manufacturers": "Indeeco, Chromalox, Watlow",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Cooling Tower Basin Heater",
    "canonical_tag": "BH",
    "aliases": [
      "BH",
      "Cooling Tower Basin Heater",
      "Basin Heater"
    ]
  },
  {
    "equipment_type": "Pool Pump",
    "tag_prefix": "PP",
    "category": "POOL_EQUIPMENT",
    "manufacturers": "Pentair, Hayward, Sta-Rite, Goulds",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Pool Pump",
    "canonical_tag": "PP",
    "aliases": [
      "PP",
      "Pool Pump"
    ]
  },
  {
    "equipment_type": "Pool Filter",
    "tag_prefix": "PF",
    "category": "POOL_EQUIPMENT",
    "manufacturers": "Pentair, Hayward, Sta-Rite",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Pool Filter",
    "canonical_tag": "PF",
    "aliases": [
      "PF",
      "Pool Filter"
    ]
  },
  {
    "equipment_type": "Pool Heater",
    "tag_prefix": "PH",
    "category": "POOL_EQUIPMENT",
    "manufacturers": "Raypak, Lochinvar, Pentair, Laars",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "",
    "canonical_label": "Pool Heater",
    "canonical_tag": "PH",
    "aliases": [
      "PH",
      "Pool Heater"
    ]
  },
  {
    "equipment_type": "Chlorine Feeder",
    "tag_prefix": "CLF",
    "category": "POOL_EQUIPMENT",
    "manufacturers": "Pentair, Hayward, Pulsafeeder",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Chlorine Feeder",
    "canonical_tag": "CLF",
    "aliases": [
      "CLF",
      "Chlorine Feeder"
    ]
  },
  {
    "equipment_type": "UV Pool Unit",
    "tag_prefix": "UV",
    "category": "POOL_EQUIPMENT",
    "manufacturers": "Trojan, Wedeco, Viqua",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "UV Pool Unit",
    "canonical_tag": "UV",
    "aliases": [
      "UV",
      "UV Pool Unit",
      "UV Unit"
    ]
  },
  {
    "equipment_type": "Irrigation Pump",
    "tag_prefix": "IP",
    "category": "IRRIGATION",
    "manufacturers": "Grundfos, Goulds, Armstrong",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "",
    "canonical_label": "Irrigation Pump",
    "canonical_tag": "IP",
    "aliases": [
      "IP",
      "Irrigation Pump"
    ]
  },
  {
    "equipment_type": "Irrigation Controller",
    "tag_prefix": "IC",
    "category": "IRRIGATION",
    "manufacturers": "Rainbird, Hunter, Toro",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Irrigation Controller",
    "canonical_tag": "IC",
    "aliases": [
      "IC",
      "Irrigation Controller"
    ]
  },
  {
    "equipment_type": "Irrigation Backflow",
    "tag_prefix": "IBFP",
    "category": "IRRIGATION",
    "manufacturers": "Watts, Wilkins, Febco",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "",
    "canonical_label": "Irrigation Backflow",
    "canonical_tag": "IBFP",
    "aliases": [
      "IBFP",
      "Irrigation Backflow"
    ]
  },
  {
    "equipment_type": "Irrigation Valve",
    "tag_prefix": "IV",
    "category": "IRRIGATION",
    "manufacturers": "Rainbird, Hunter, Toro",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "",
    "canonical_label": "Irrigation Valve",
    "canonical_tag": "IV",
    "aliases": [
      "IV",
      "Irrigation Valve"
    ]
  },
  {
    "equipment_type": "Air Compressor",
    "tag_prefix": "AC",
    "category": "compressed air",
    "manufacturers": "Atlas Copco, Quincy, Ingersoll Rand, Kaeser",
    "quarterly_hours": 0.75,
    "semi_annual_hours": 1.5,
    "annual_hours": 3,
    "monthly_hours": 0.25,
    "description": "Compressed air",
    "canonical_label": "Air Compressor",
    "canonical_tag": "AC",
    "aliases": []
  },
  {
    "equipment_type": "Air Dryer",
    "tag_prefix": "AD",
    "category": "compressed air",
    "manufacturers": "Hankison, Parker, Atlas Copco",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "Dries air",
    "canonical_label": "Air Dryer",
    "canonical_tag": "AD",
    "aliases": []
  },
  {
    "equipment_type": "Air Receiver",
    "tag_prefix": "AR",
    "category": "compressed air",
    "manufacturers": "Manchester, Worthington",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Stores air",
    "canonical_label": "Air Receiver",
    "canonical_tag": "AR",
    "aliases": []
  },
  {
    "equipment_type": "Air Filter",
    "tag_prefix": "AF",
    "category": "compressed air",
    "manufacturers": "Parker, SMC, Norgren",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Filters air",
    "canonical_label": "Air Filter",
    "canonical_tag": "AF",
    "aliases": []
  },
  {
    "equipment_type": "Snow Melt Pump",
    "tag_prefix": "SMP",
    "category": "Radiant  Snowmelt",
    "manufacturers": "Grundfos, Taco, Armstrong",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "Circulates glycol",
    "canonical_label": "Snow Melt Pump",
    "canonical_tag": "SMP",
    "aliases": []
  },
  {
    "equipment_type": "Snow Melt Manifold",
    "tag_prefix": "SMM",
    "category": "Radiant  Snowmelt",
    "manufacturers": "Uponor, Viega, Watts",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Distributes loops",
    "canonical_label": "Snow Melt Manifold",
    "canonical_tag": "SMM",
    "aliases": []
  },
  {
    "equipment_type": "Radiant Pump",
    "tag_prefix": "RP",
    "category": "Radiant  Snowmelt",
    "manufacturers": "Taco, Grundfos, Armstrong",
    "quarterly_hours": 0.5,
    "semi_annual_hours": 1,
    "annual_hours": 2,
    "monthly_hours": 0.1667,
    "description": "Radiant heat",
    "canonical_label": "Radiant Pump",
    "canonical_tag": "RP",
    "aliases": []
  },
  {
    "equipment_type": "Radiant Manifold",
    "tag_prefix": "RM",
    "category": "Radiant  Snowmelt",
    "manufacturers": "Uponor, Viega, Watts",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Radiant distribution",
    "canonical_label": "Radiant Manifold",
    "canonical_tag": "RM",
    "aliases": []
  },
  {
    "equipment_type": "Pressure Gauge",
    "tag_prefix": "PG",
    "category": "Meters Gauges",
    "manufacturers": "Ashcroft, Wika, Dwyer",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Pressure reading",
    "canonical_label": "Pressure Gauge",
    "canonical_tag": "PG",
    "aliases": []
  },
  {
    "equipment_type": "Temperature Gauge",
    "tag_prefix": "TG",
    "category": "Meters Gauges",
    "manufacturers": "Ashcroft, Wika, Dwyer",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Temp reading",
    "canonical_label": "Temperature Gauge",
    "canonical_tag": "TG",
    "aliases": []
  },
  {
    "equipment_type": "Flow Meter",
    "tag_prefix": "FM",
    "category": "Meters Gauges",
    "manufacturers": "Onicon, Badger, Siemens",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Flow measurement",
    "canonical_label": "Flow Meter",
    "canonical_tag": "FM",
    "aliases": []
  },
  {
    "equipment_type": "Water Meter",
    "tag_prefix": "WM",
    "category": "Meters Gauges",
    "manufacturers": "Neptune, Sensus, Itron",
    "quarterly_hours": 0.25,
    "semi_annual_hours": 0.5,
    "annual_hours": 1,
    "monthly_hours": 0.0833,
    "description": "Water usage",
    "canonical_label": "Water Meter",
    "canonical_tag": "WM",
    "aliases": []
  },
  {
    "equipment_type": "Ball Valve",
    "tag_prefix": "BV",
    "category": "Valves",
    "manufacturers": "Apollo, Watts, Crane, Victaulic",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Isolation",
    "canonical_label": "Ball Valve",
    "canonical_tag": "BV",
    "aliases": []
  },
  {
    "equipment_type": "Butterfly Valve",
    "tag_prefix": "BFV",
    "category": "Valves",
    "manufacturers": "Victaulic, Bray, Keystone",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Isolation",
    "canonical_label": "Butterfly Valve",
    "canonical_tag": "BFV",
    "aliases": []
  },
  {
    "equipment_type": "Check Valve",
    "tag_prefix": "CV",
    "category": "Valves",
    "manufacturers": "Watts, Apollo, Victaulic",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Prevent reverse",
    "canonical_label": "Check Valve",
    "canonical_tag": "CV",
    "aliases": []
  },
  {
    "equipment_type": "Gate Valve",
    "tag_prefix": "GV",
    "category": "Valves",
    "manufacturers": "Crane, Nibco, Watts",
    "quarterly_hours": 0.1,
    "semi_annual_hours": 0.2,
    "annual_hours": 0.5,
    "monthly_hours": 0.0333,
    "description": "Isolation",
    "canonical_label": "Gate Valve",
    "canonical_tag": "GV",
    "aliases": []
  },
  {
    "equipment_type": "Control Valve",
    "tag_prefix": "CV",
    "category": "Valves",
    "manufacturers": "Belimo, Honeywell, Siemens",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "Modulating",
    "canonical_label": "Control Valve",
    "canonical_tag": "CV",
    "aliases": []
  },
  {
    "equipment_type": "Solenoid Valve",
    "tag_prefix": "SV",
    "category": "Valves",
    "manufacturers": "ASCO, Honeywell, Parker",
    "quarterly_hours": 0.15,
    "semi_annual_hours": 0.3,
    "annual_hours": 0.75,
    "monthly_hours": 0.05,
    "description": "Automatic valve",
    "canonical_label": "Solenoid Valve",
    "canonical_tag": "SV",
    "aliases": []
  }
];

export const EQUIPMASTER_CATEGORIES = ["HVAC_AIRSIDE","HYDRONIC_PLANT","PLUMBING_WATER_SYSTEMS","PLUMBING_DRAINAGE","CONTROLS_BAS","EMERGENCY_POWER_FUEL","CHEMICAL_TREATMENT","POOL_EQUIPMENT","IRRIGATION","compressed air","Radiant  Snowmelt","Meters Gauges","Valves"];

export const EQUIPMASTER_MANUFACTURERS = ["3M","ABB","ACO","AERCO","AO Smith","API","ASCO","AXEON","Aaon","Accurex","Acme","Addison","Aldes","Alerton","Alfa Laval","Allen Bradley","Ames","Amiad","Amtrol","Apollo","Armstrong","Ashcroft","Aspen","Atlas Copco","Aurora","Axiom","B&G","BAC","Bacharach","Badger","Baldwin","Baltimore","Barnes","Beacon Morris","Belimo","Bell & Gossett","Bitzer","Bosch","Bradford White","Bradley","Bray","Broan","Bryant","Buderus","Burnham","CAT","CDS","Caleffi","Cambridge","Canature","Canplas","CaptiveAire","Carel","Carrier","Cash Acme","Caterpillar","ChemTreat","Chicago Blower","Chromalox","Clack","Cleaver-Brooks","ClimateCraft","Climaveneta","Columbia","Condair","Containment Solutions","Contech","Continental Fan","Cook","Copeland","Crane","Culligan","Cummins","Daikin","Danfoss","Data Aire","Dectron","Delta","Delta Controls","Desert Aire","Distech","Diversitech","DriSteem","Dunham Bush","Dunham-Bush","Dwyer","EOne","Eaton","EcoWater","Ecobee","Edwards","Embraco","Engineered Air","EnviroTec","Evapco","Fantech","Febco","FirstCo","Fisher","Fleetguard","Flygt","Fujitsu","Fulton","GEA","Gaylord","Gems","Generac","Goodman","Gorman Rupp","Goulds","Granby","Greenheck","Griswold","Grundfos","Guardian","Halton","Hankison","Hastings","Haws","Hayward","Heatcraft","Highland Tank","Hitachi","Honeywell","Huntair","Hunter","Hydrolevel","Hydromatic","IBC","ICP","IEC","Indeeco","Ingersoll Rand","Intermatic","Itron","JCI","JJM","Jay R Smith","John Wood","Johnson Controls","Josam","KSB","Kaeser","Kamstrup","Keystone","King","Kohler","Krohne","Krueger","LG","LMI","Laars","Lakos","Lennox","Leonard","Liberty","Liebert","Lifebreath","Little Giant","Lochinvar","Loren Cook","MSA","MTU","Mainline","Manchester","Markel","Marley","Maxitrol","McDonnell & Miller","McDonnell Miller","McQuay","Mercer","Metal Industries","Mifab","Milton Roy","Mitsubishi","Miura","Modine","Mueller","Multistack","Munters","Myers","NDS","NTI","NYB","Nailor","Nalco","Navien","Neptune","Nibco","Nordyne","Norgren","Noritz","Nortec","Nortek","Norwesco","Notifier","Oldcastle","Onicon","Orenco","Paharpur","Panasonic","ParkUSA","Parker","Patterson","PennBarry","Pentair","Pentek","Polylok","PoolPak","Precision Hydronics","Prefco","Price","Pulsafeeder","Puretec","Qmark","Quincy","RKI","Racor","RainHarvest","Rainbird","Raypak","Recold","RectorSeal","Rectorseal","Reliable","RenewAire","Reznor","Rheem","Rinnai","Rockford","Roth","Ruskin","S&P","SJE Rhombus","SMC","SWEP","Safgard","Samsung","Schier","Schneider","Sensidyne","Sensus","Sentinel","Seresco","Setra","Siemens","Simplex","Smardt","Smith","Snyder","Spirotherm","Square D","Sta-Rite","State","Stelpro","Sterilight","Sterling","Stormceptor","Stulz","SuperStor","Systemair","TA","Taco","Takagi","Tecumseh","Tekmar","Tempstar","Temtrol","Thermolec","Titan","Titus","Toro","Toshiba","Trane","Tranter","Triangle Tube","Tridium","Trojan","Tuthill","Twin City","Uponor","Vaisala","Valent","Vaughn","Venmar","Ventrol","Vertiv","Victaulic","Viega","Viessmann","Viking","Viqua","Wade","Walchem","Watlow","Watts","Wedeco","Weil-McLain","Wessels","Whalen","Wika","Wilkins","Williams","Wilo","Worthington","Xerxes","Xylem","Yaskawa","York","ZCL","Zoeller","Zurn","pipe system"];

// ─── Lookup helpers (unchanged interface) ─────────────────────────────────────

export function findEquipType(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();

  // Pass 1: exact equipment_type or canonical_label match
  const exact = EQUIPMASTER.find(e =>
    e.equipment_type.toLowerCase() === n ||
    e.canonical_label.toLowerCase() === n
  );
  if (exact) return exact;

  // Pass 2: exact alias match
  const aliasExact = EQUIPMASTER.find(e =>
    e.aliases.some(a => a.toLowerCase() === n)
  );
  if (aliasExact) return aliasExact;

  // Pass 3: input contains full canonical_label — word-boundary safe
  const contains = EQUIPMASTER.find(e => {
    const et = e.canonical_label.toLowerCase();
    const idx = n.indexOf(et);
    if (idx === -1) return false;
    const before = idx === 0 ? '' : n[idx - 1];
    const after  = n[idx + et.length] || '';
    return (before === '' || before === ' ') && (after === '' || after === ' ');
  });
  if (contains) return contains;

  // Pass 4: canonical_label contains input — word-boundary safe
  const contained = EQUIPMASTER.find(e => {
    const et = e.canonical_label.toLowerCase();
    const idx = et.indexOf(n);
    if (idx === -1) return false;
    const before = idx === 0 ? '' : et[idx - 1];
    const after  = et[idx + n.length] || '';
    return (before === '' || before === ' ') && (after === '' || after === ' ');
  });
  return contained || null;
}

export function getStdHours(equipType, frequency) {
  const e = findEquipType(equipType);
  if (!e) return null;
  const map = {
    monthly:       e.monthly_hours,
    quarterly:     e.quarterly_hours,
    'semi-annual': e.semi_annual_hours,
    annual:        e.annual_hours,
  };
  return map[frequency] ?? e.quarterly_hours ?? null;
}

export function getEquipDefaults(equipType) {
  const e = findEquipType(equipType);
  if (!e) return null;
  return {
    tag_prefix:        e.tag_prefix,
    category:          e.category,
    quarterly_hours:   e.quarterly_hours,
    semi_annual_hours: e.semi_annual_hours,
    annual_hours:      e.annual_hours,
    monthly_hours:     e.monthly_hours,
    manufacturers:     e.manufacturers ? e.manufacturers.split(',').map(m => m.trim()).filter(Boolean) : [],
    description:       e.description,
    canonical_label:   e.canonical_label,
    canonical_tag:     e.canonical_tag,
    aliases:           e.aliases,
  };
}

export const CATEGORIES = EQUIPMASTER_CATEGORIES;
