import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pilotContentPack } from "../src/content/pilot/pilotContentPack";
import { validateContentPack } from "../src/infrastructure/content/validatePack";

interface PackInput {
  readonly label: string;
  readonly input: unknown;
}

async function findJsonPackFiles() {
  const root = process.cwd();
  const files = [path.join(root, "contracts", "sample", "content-pack.sample.json")];
  const packDirectory = path.join(root, "src", "content", "packs");

  try {
    const entries = await readdir(packDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(path.join(packDirectory, entry.name));
      }
    }
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  return [...new Set(files)].sort();
}

async function main() {
  const packFiles = await findJsonPackFiles();
  const errors: string[] = [];
  const packInputs: PackInput[] = [
    {
      label: "src/content/pilot/pilotContentPack.ts (bundle)",
      input: pilotContentPack,
    },
  ];
  const totals = {
    vocabulary: 0,
    lessons: 0,
    exercises: 0,
    practiceSets: 0,
  };

  for (const filePath of packFiles) {
    const label = path.relative(process.cwd(), filePath);
    try {
      packInputs.push({
        label,
        input: JSON.parse(await readFile(filePath, "utf8")),
      });
    } catch (error) {
      errors.push(
        `${label}: JSONを解析できません (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  const summaries: string[] = [];

  for (const { label, input } of packInputs) {
    const result = validateContentPack(input);

    totals.vocabulary += result.validVocabulary.length;
    totals.lessons += result.validLessons.length;
    totals.exercises += result.validExercises.length;
    totals.practiceSets += result.validPracticeSets.length;
    summaries.push(
      `${label}: ${[
        `単語 ${result.validVocabulary.length}`,
        `レッスン ${result.validLessons.length}`,
        `演習 ${result.validExercises.length}`,
        `技能セット ${result.validPracticeSets.length}`,
      ].join(" / ")}`,
    );

    for (const issue of result.issues) {
      errors.push(
        `${label}: ${issue.scope}${issue.itemId ? `:${issue.itemId}` : ""}: ${issue.message}`,
      );
    }
  }

  if (packInputs.length === 0) {
    errors.push("教材パックがありません。");
  }

  if (errors.length > 0) {
    throw new Error(`教材検証に失敗しました。\n${errors.join("\n")}`);
  }

  console.log(summaries.join("\n"));
  console.log(
    [
      `教材検証成功: ${packInputs.length}パック`,
      `単語 ${totals.vocabulary}`,
      `レッスン ${totals.lessons}`,
      `演習 ${totals.exercises}`,
      `技能セット ${totals.practiceSets}`,
    ].join(" / "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
