import { parseContentPackOrThrow } from "./validatePack";

export async function loadStarterPack() {
  const { pilotContentPack } = await import("../../content/pilot/pilotContentPack");
  return parseContentPackOrThrow(pilotContentPack);
}
