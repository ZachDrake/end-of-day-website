const CAUSE_CATALOG = {
  "Id.Item.WEPN_029": { name: "Mosin (AP)", category: "Marksman" },
  "Id.Item.AK74M": { name: "AK74", category: "Assault rifle" },
  "Id.Item.SVDM": { name: "SVD", category: "Marksman" },
  "Id.Item.SV98": { name: "SV98", category: "Sniper" },
  "Id.Item.M4": { name: "M4", category: "Assault rifle" },
  "Id.Item.Mosin": { name: "Mosin Nagant", category: "Sniper" },
  "Id.Item.SKS": { name: "SKS", category: "Marksman" },
  "Id.Item.MP9": { name: "AMP-9", category: "SMG" },
  "Id.Item.RFB": { name: "RFB", category: "Marksman" },
  "Id.Item.MK22": { name: "MK22", category: "Sniper" },
  "Id.Item.WEPN_035": { name: "Scout Rifle TD", category: "Marksman" },
  "Id.Item.WEPN_032": { name: "GGX 18", category: "Sidearm" },
  "Id.Item.M500": { name: "M500", category: "Shotgun" },
  "Id.Item.A91": { name: "A-91", category: "Assault rifle" },
  "Id.Item.M249": { name: "M249 SAW", category: "LMG" },
  "Id.Item.CGM4": { name: "MAAWS", category: "Launcher" },
  "Id.Item.M67Grenade": { name: "M67 Grenade", category: "Explosive" },
  "Id.Item.Glock17": { name: "GGX 17", category: "Sidearm" },
  "Id.Item.TAR21": { name: "T-21", category: "Assault rifle" },
  "Id.Item.MP43": { name: "MP43", category: "Shotgun" },
  "Id.Item.Launcher_04": { name: "9K333 Verba", category: "Launcher" },
  "Id.Item.SMG_03": { name: "PP-19 Vityaz", category: "SMG" },
  "Id.Item.WEPN_027": { name: "Desert Eagle (FMJ)", category: "Sidearm" },
  "Id.Item.Judge": { name: "Judge", category: "Sidearm" },
  "Id.Item.Defibrillator.Standard": { name: "Defibrillator", category: "Melee" },
  "Id.Item.KH2002": { name: "KH-2002", category: "Assault rifle" },
  "Id.Item.SR_04": { name: "SR 04", category: "Other" },
  "Id.Item.WEPN_028": { name: "MP5", category: "SMG" },
  "Id.Item.C4Explosive": { name: "C4", category: "Explosive" },
  "Id.Item.Claymore": { name: "Claymore", category: "Explosive" },
  "Id.Item.Fists": { name: "Fists", category: "Melee" },
  "Id.Item.RPG7": { name: "RPG-7", category: "Launcher" },
  "Id.Item.WEPN_026": { name: "M1911", category: "Sidearm" },
  "ID.Item.ATMine": { name: "AT Mine", category: "Explosive" },
  "ID.Item.BuildTool.Hammer.Large": { name: "Build Hammer (Large)", category: "Melee" },
  "ID.Item.BuildTool.Hammer.Medium": { name: "Build Hammer (Medium)", category: "Melee" },

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

  return useful.slice(-3).join(" · ") || raw;
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
