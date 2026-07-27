import { Link } from "react-router-dom";
import { Card, InlineAlert } from "../../shared/components";
import styles from "./HelpPage.module.css";

export function HelpPage() {
  return (
    <article className={styles.page} aria-labelledby="help-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>インストール・オフライン・データ保存</p>
        <h1 id="help-title" tabIndex={-1}>
          ヘルプ
        </h1>
        <p>
          このアプリは、アカウントなしで端末内に学習記録を保存します。通常のWebアプリとしても、ホーム画面へ追加しても使えます。
        </p>
      </header>

      <InlineAlert tone="info" title="公式の英検教材ではありません">
        問題・音声・結果は本プロジェクトの学習用オリジナルです。公式問題や公式スコアではありません。
      </InlineAlert>

      <div className={styles.grid}>
        <Card as="section" className={styles.card} padding="large">
          <h2>Android・パソコンへ追加する</h2>
          <ol className={styles.steps}>
            <li>設定画面で「この端末に追加」を選びます。</li>
            <li>ブラウザーの確認画面でインストールを許可します。</li>
            <li>案内が出ない場合も、ブラウザーのメニューから追加できます。</li>
          </ol>
          <p>対応していない環境でも、すべての主要学習機能を使えます。</p>
          <Link className={styles.link} to="/settings">
            インストールと更新の設定を見る
          </Link>
        </Card>

        <Card as="section" className={styles.card} padding="large">
          <h2>iPhone・iPadへ追加する</h2>
          <ol className={styles.steps}>
            <li>Safariでこのアプリを開きます。</li>
            <li>共有ボタンを選びます。</li>
            <li>「ホーム画面に追加」を選び、右上の「追加」を押します。</li>
          </ol>
          <p>
            iOSやブラウザーのversionにより、ボタン名や位置が少し異なる場合があります。
          </p>
        </Card>

        <Card as="section" className={styles.card} padding="large">
          <h2>オフラインで使う</h2>
          <ul className={styles.notes}>
            <li>一度準備したアプリ本体と基本教材は、通信がなくても開けます。</li>
            <li>回答・復習・下書きは、オフラインでも端末内へ保存されます。</li>
            <li>まだ取得していない任意音声は、通信が戻ってから再生してください。</li>
          </ul>
          <p>
            画面上部に「オフラインで利用中」と出ても、保存済み教材の学習はそのまま続けられます。
          </p>
        </Card>

        <Card as="section" className={styles.card} padding="large">
          <h2>安全に更新する</h2>
          <ul className={styles.notes}>
            <li>更新があると、画面上部に案内が表示されます。</li>
            <li>学習中は自動で再読み込みしません。</li>
            <li>学習を終えた後に「保存して更新」を選んでください。</li>
          </ul>
          <p>
            未保存の書込みに失敗した場合は更新せず、現在の画面とデータを維持します。
          </p>
        </Card>

        <Card as="section" className={styles.card} padding="large">
          <h2>バックアップと削除</h2>
          <ul className={styles.notes}>
            <li>学習記録はversion付きJSONとして書き出せます。</li>
            <li>教材と再取得可能なキャッシュは書き出し対象外です。</li>
            <li>スピーキング録音は、明示的に選んだ場合だけ含まれます。</li>
          </ul>
          <Link className={styles.link} to="/settings/data">
            データ管理を開く
          </Link>
        </Card>

        <Card as="section" className={styles.card} padding="large">
          <h2>音声とマイク</h2>
          <ul className={styles.notes}>
            <li>マイクは録音開始を選ぶまで要求しません。</li>
            <li>拒否しても、文章入力や自己練習へ切り替えられます。</li>
            <li>Web Speechの声や発音は、端末とブラウザーにより異なります。</li>
          </ul>
          <p>録音は端末内に保存され、データ管理から録音だけを削除できます。</p>
        </Card>
      </div>

      <nav className={styles.links} aria-label="ヘルプの関連画面">
        <Link className={styles.link} to="/">
          今日の学習へ
        </Link>
        <Link className={styles.link} to="/settings">
          設定へ
        </Link>
        <Link className={styles.link} to="/settings/data">
          データ管理へ
        </Link>
      </nav>
    </article>
  );
}
