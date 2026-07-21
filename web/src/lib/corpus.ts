import { promises as fs } from "fs";
import path from "path";
import {
  fingerprintPython,
  fingerprintSimilarity,
  type CodeFingerprint,
} from "@/lib/fingerprint";

export type CorpusEntryMeta = {
  id: string;
  title: string;
  filename: string;
  license: string;
  source: string;
  description: string;
};

export type CorpusEntry = CorpusEntryMeta & {
  content: string;
  fingerprint: CodeFingerprint;
};

export type CorpusCandidate = {
  entry: CorpusEntry;
  fingerprintScore: number;
};

const CORPUS_ROOT = path.join(process.cwd(), "corpus");

export async function loadCorpus(): Promise<CorpusEntry[]> {
  const manifestRaw = await fs.readFile(
    path.join(CORPUS_ROOT, "manifest.json"),
    "utf8"
  );
  const manifest = JSON.parse(manifestRaw) as CorpusEntryMeta[];

  const entries = await Promise.all(
    manifest.map(async (meta) => {
      const content = await fs.readFile(
        path.join(CORPUS_ROOT, "files", meta.filename),
        "utf8"
      );
      return {
        ...meta,
        content,
        fingerprint: fingerprintPython(content),
      };
    })
  );

  return entries;
}

export function rankCorpusCandidates(
  suspectSource: string,
  corpus: CorpusEntry[],
  topK = 3
): CorpusCandidate[] {
  const suspectFp = fingerprintPython(suspectSource);

  return corpus
    .map((entry) => ({
      entry,
      fingerprintScore: fingerprintSimilarity(suspectFp, entry.fingerprint),
    }))
    .sort((a, b) => b.fingerprintScore - a.fingerprintScore)
    .slice(0, topK);
}
