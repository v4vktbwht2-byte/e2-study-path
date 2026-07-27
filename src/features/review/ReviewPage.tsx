import { VocabularySessionPage, type VocabularySessionPageProps } from "../vocabulary";

export type ReviewPageProps = Omit<VocabularySessionPageProps, "mode">;

/**
 * 共通の単語セッションを期限復習モードとして公開するページ境界。
 * router側は単語機能と同じcontent/storeを注入できる。
 */
export function ReviewPage(props: ReviewPageProps) {
  return <VocabularySessionPage {...props} mode="due" />;
}
