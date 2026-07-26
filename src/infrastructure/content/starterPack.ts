import { pilotContentPack } from "../../content/pilot/pilotContentPack";
import { parseContentPackOrThrow } from "./validatePack";

export function loadStarterPack() {
  return parseContentPackOrThrow(pilotContentPack);
}
