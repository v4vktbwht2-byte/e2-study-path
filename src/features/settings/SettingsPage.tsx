import { Link } from "react-router-dom";
import { PwaInstallPanel } from "../pwa";
import { Card, InlineAlert } from "../../shared/components";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  return (
    <article className={styles.page} aria-labelledby="settings-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>端末・保存・アプリ情報</p>
        <h1 id="settings-title" tabIndex={-1}>
          設定
        </h1>
        <p>
          インストール方法と端末の保存容量を確認できます。学習記録はこの端末内に保存されます。
        </p>
      </header>

      <InlineAlert tone="info" title="別の端末へは自動で移りません">
        機種変更やブラウザーデータ削除に備えて、データ管理から定期的にバックアップしてください。
      </InlineAlert>

      <PwaInstallPanel />

      <Card as="section" className={styles.linksCard} padding="large">
        <h2>保存容量・データ・使い方</h2>
        <p>
          保存容量の確認、永続保存、バックアップ、復元、録音だけの削除、アプリキャッシュの再構築はデータ管理にまとめています。
        </p>
        <nav className={styles.links} aria-label="設定の関連画面">
          <Link className={styles.link} to="/settings/data">
            保存容量とデータ管理を開く
          </Link>
          <Link className={styles.link} to="/help">
            インストール・オフラインのヘルプ
          </Link>
        </nav>
      </Card>
    </article>
  );
}
