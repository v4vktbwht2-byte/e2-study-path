import { Link, useLocation } from "react-router-dom";
import { Card, EmptyState } from "../shared/components";
import { FocusHeading } from "./FocusHeading";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  const { pathname } = useLocation();
  const actions = (
    <div className={styles.links}>
      <Link className={styles.link} to="/">
        今日の学習へ
      </Link>
      <Link className={styles.link} to="/help">
        ヘルプを見る
      </Link>
    </div>
  );

  return (
    <section className={styles.page} aria-labelledby="page-title">
      <FocusHeading id="page-title" className={styles.title}>
        ページが見つかりません
      </FocusHeading>
      <Card as="section" padding="large">
        <EmptyState
          title="指定された画面を開けませんでした"
          description="URLが変わったか、入力したアドレスが正しくない可能性があります。学習データは変更されていません。"
          actions={actions}
        />
      </Card>
      <p className={styles.path}>
        確認したルート: <code>{`/#${pathname}`}</code>
      </p>
    </section>
  );
}
