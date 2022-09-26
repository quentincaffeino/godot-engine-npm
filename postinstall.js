import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

async function extract(source, target) {
  const zip = new AdmZip(source);

  const zipEntries = zip.getEntries();
  for (const zipEntry of zipEntries) {
    zip.extractEntryTo(zipEntry, target, true, true);

    if (zipEntry.entryName.startsWith("Godot_")) {
      const godotBinPath = path.resolve(target, "godot");
      fs.renameSync(path.resolve(target, zipEntry.entryName), godotBinPath);
      fs.chmodSync(godotBinPath, 0o755);
    }
  }
}

const extractSource = "archives/Godot_v3.5-stable_x11.64.zip";
const extractTarget = "dist";
extract(path.resolve(extractSource), path.resolve(extractTarget));
