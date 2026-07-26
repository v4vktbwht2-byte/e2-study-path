import styles from "./RouterLoadingPage.module.css";

export function RouterLoadingPage() {
  return (
    <main className={styles.page} aria-busy="true">
      <p className={styles.message} role="status">
        E2 Study Path を読み込んでいます…
      </p>
    </main>
  );
}
