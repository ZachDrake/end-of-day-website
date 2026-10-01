const CAUSE_CATALOG = {
  "Id.Item.WEPN_033": { name: "Bushmaster", category: "Assault rifle" },
  "Id.Item.A91": { name: "A-91", category: "Assault rifle" },
  "Id.Item.KH2002": { name: "KH-2002", category: "Assault rifle" },
  "Id.Item.TAR21": { name: "T-21", category: "Assault rifle" },
  "Id.Item.WEPN_029": { name: "Galil", category: "Assault rifle" },
  "Id.Item.AK74M": { name: "AK-74", category: "Assault rifle" },
  "Id.Item.M4": { name: "M4", category: "Assault rifle" },
  "Id.Item.WEPN_030": { name: "FAL", category: "Assault rifle" },

  "Id.Item.MP9": { name: "MP9", category: "SMG" },
  "Id.Item.SMG_03": { name: "PP-19", category: "SMG" },
  "Id.Item.WEPN_028": { name: "MP5", category: "SMG" },
  "Id.Item.Vector": { name: "Vector", category: "SMG" },

  "Id.Item.MP43": { name: "MP-43", category: "Shotgun" },
  "Id.Item.M500": { name: "M500", category: "Shotgun" },

  "Id.Item.M249": { name: "M249", category: "LMG" },
  "Id.Item.LMG_02": { name: "PKM", category: "LMG" },

  "Id.Item.SKS": { name: "SKS", category: "DMR" },
  "Id.Item.SVDM": { name: "SVD", category: "DMR" },
  "Id.Item.RFB": { name: "RFB", category: "DMR" },

  "Id.Item.WEPN_035": { name: "Scout", category: "Sniper" },
  "Id.Item.Mosin": { name: "Mosin", category: "Sniper" },
  "Id.Item.SV98": { name: "SV-98", category: "Sniper" },
  "Id.Item.MK22": { name: "MK-22", category: "Sniper" },
  "Id.Item.SR_04": { name: "AMR-50", category: "Sniper" },

  "Id.Item.CombatBow": { name: "Bow", category: "Bow" },

  "Id.Item.Glock17": { name: "Glock", category: "Pistol" },
  "Id.Item.Judge": { name: "Revolver", category: "Pistol" },
  "Id.Item.WEPN_032": { name: "GGX-18", category: "Pistol" },
  "Id.Item.WEPN_027": { name: "Deagle", category: "Pistol" },
  "Id.Item.WEPN_026": { name: "M1911", category: "Pistol" },

  "Id.Item.Launcher_04": { name: "Stinger", category: "Launcher" },
  "Id.Item.RPG7": { name: "RPG-7", category: "Launcher" },
  "Id.Item.CGM4": { name: "MAAWS", category: "Launcher" },
  "Id.Item.MMGL": { name: "MGL-40", category: "Launcher" },

  "ID.Item.BuildTool.Hammer.Small": { name: "S.Hammer", category: "Tool" },
  "ID.Item.BuildTool.Hammer.Medium": { name: "M.Hammer", category: "Tool" },
  "ID.Item.BuildTool.Hammer.Large": { name: "L.Hammer", category: "Tool" },
  "Id.Item.FuelCan": { name: "Fuelcan", category: "Tool" },
  "ID.Item.RepairTool.Wrench.Standard": { name: "Wrench", category: "Tool" },
  "Id.Item.Crowbar": { name: "Crowbar", category: "Tool" },
  "ID.Item.RepairTool.Drill.Heavy": { name: "H.Drill", category: "Tool" },
  "ID.Item.RepairTool.Drill.Light": { name: "L.Drill", category: "Tool" },
  "Id.Item.Fists": { name: "Fists", category: "Melee" },

  "Id.Item.Defibrillator.Standard": { name: "Defib", category: "Medicine" },
  "ID.Item.MedKit.Standard": { name: "Med. Bag", category: "Medicine" },
  "Id.Item.Bandage": { name: "Bandage", category: "Medicine" },
  "Id.Item.Resuscitator.Cheap": { name: "Resus", category: "Medicine" },
  "Id.Item.SuperBandage": { name: "Bandage", category: "Medicine" },
  "Id.Item.StimPen": { name: "Adrenaline", category: "Medicine" },

  "ID.Item.InfraredRangeFinder": { name: "IR-Bino", category: "Spotter" },
  "ID.Item.Binoculars": { name: "Bino", category: "Spotter" },
  "ID.Item.Monocular": { name: "Monocular", category: "Spotter" },
  "ID.Item.RangeFinder": { name: "Range Finder", category: "Spotter" },

  "Id.Item.C4Trigger": { name: "Detonator", category: "Explosive" },
  "Id.Item.C4Explosive": { name: "C4", category: "Explosive" },
  "Id.Item.IED.Trigger": { name: "IED", category: "Explosive" },
  "Id.Item.Claymore": { name: "Claymore", category: "Explosive" },
  "Id.Item.M67Grenade": { name: "HE Grenade", category: "Explosive" },
  "ID.Item.ATMine": { name: "AT Mine", category: "Explosive" },

  "ID.Item.SmokeGrenade.Orange": { name: "S-Orng", category: "Smoke" },
  "ID.Item.SmokeGrenade.Yellow": { name: "S-Yllw", category: "Smoke" },
  "ID.Item.SmokeGrenade.White": { name: "S-White", category: "Smoke" },
  "ID.Item.SmokeGrenade.Black": { name: "S-Black", category: "Smoke" },
  "ID.Item.SmokeGrenade.Red": { name: "S-Red", category: "Smoke" },
  "ID.Item.SmokeGrenade.Blue": { name: "S-Blue", category: "Smoke" },

  "Id.Vehicle.WeaponExtension.ROT_02.30mmCannon": { name: "30mm Cannon", category: "Vehicle" },
  "Id.Vehicle.WeaponExtension.TNK_01.Artillery": { name: "Artillery (TNK-01)", category: "Vehicle" },
  "Id.Vehicle.WeaponExtension.STN_03.MainBarrel": { name: "Main Barrel", category: "Emplacement" },
  "Id.Vehicle.WeaponExtension.ROT_02.122mm": { name: "122mm", category: "Vehicle" },
  "Id.Vehicle.WeaponExtension.WHL_02.SUV.RingTurret": { name: "SUV Ring Turret", category: "Vehicle" },
  "Id.Vehicle.WeaponExtension.ROT_03.MountedMachineGun": { name: "Mounted Machine Gun", category: "Vehicle" },
  "Id.Vehicle.WeaponExtension.ROT_03.RocketPods": { name: "Rocket Pods", category: "Vehicle" },

  "Vehicle.Variant.Air.Rotary.Littlebird.Default": { name: "Littlebird", category: "Vehicle" },
  "Vehicle.Variant.Air.Rotary.Littlebird.MountedMachineGuns": { name: "Littlebird (Machine Guns)", category: "Vehicle" },
  "Vehicle.Variant.Air.Rotary.Havoc.Default": { name: "Havoc", category: "Vehicle" },
  "Vehicle.Variant.Air.Rotary.ROT_04.Default": { name: "ROT-04", category: "Vehicle" },
  "Vehicle.Variant.Land.Wheeled.Humvee.Default": { name: "Humvee", category: "Vehicle" },
  "Vehicle.Variant.Land.Wheeled.Ural.Default": { name: "Ural", category: "Vehicle" },
  "Vehicle.Variant.Land.Wheeled.Kodiak.Pickup": { name: "Kodiak Pickup", category: "Vehicle" },
  "Vehicle.Variant.Land.Wheeled.Kodiak.MachineGun": { name: "Kodiak (Machine Gun)", category: "Vehicle" }
};

function fallbackName(rawCause) {
  const raw = String(rawCause ?? "").trim();
  if (!raw) return "Unknown";

  const parts = raw.split(".").filter(Boolean);
  const ignored = new Set(["Id", "ID", "Item", "Vehicle", "Variant", "Default"]);
  const useful = parts.filter((part) => !ignored.has(part));

  return useful.slice(-3).join(" \u00B7 ") || raw;
}

export function describeCause(rawCause) {
  const raw = String(rawCause ?? "").trim();

  if (!raw) {
    return {
      rawCause: null,
      name: "Unknown",
      category: "Other",
      identified: false
    };
  }

  const match = CAUSE_CATALOG[raw];

  if (match) {
    return {
      rawCause: raw,
      name: match.name,
      category: match.category,
      identified: !match.name.startsWith("Unidentified")
    };
  }

  return {
    rawCause: raw,
    name: fallbackName(raw),
    category: "Other",
    identified: false
  };
}
