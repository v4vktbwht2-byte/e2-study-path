import { useMemo, useState } from "react";
import { Button, InlineAlert } from "../../shared/components";
import { supportsWebSpeech } from "./webSpeech";

export interface PronunciationButtonProps {
  text: string;
  speechRate?: number;
}

export function PronunciationButton({
  text,
  speechRate = 1,
}: PronunciationButtonProps) {
  const supported = useMemo(supportsWebSpeech, []);
  const [error, setError] = useState<string>();

  if (!supported) {
    return (
      <InlineAlert tone="info" title="音声を使えないため英文を表示します">
        <span lang="en">{text}</span>
      </InlineAlert>
    );
  }

  const speak = () => {
    try {
      setError(undefined);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = Math.min(1.5, Math.max(0.5, speechRate));
      window.speechSynthesis.speak(utterance);
    } catch {
      setError("音声を再生できませんでした。表示された英文で確認してください。");
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={speak} aria-label={`${text}を聞く`}>
        発音を聞く
      </Button>
      {error !== undefined ? (
        <InlineAlert tone="warning" role="alert">
          {error} <span lang="en">{text}</span>
        </InlineAlert>
      ) : null}
    </>
  );
}
