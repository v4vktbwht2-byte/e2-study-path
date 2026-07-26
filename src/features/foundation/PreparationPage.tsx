import { Card, InlineAlert } from "../../shared/components";
import { FocusHeading } from "../../app/FocusHeading";
import { getFoundationRoute, type FoundationRouteId } from "../../app/routeCatalog";
import { Link, useLocation, useParams } from "react-router-dom";
import styles from "./PreparationPage.module.css";

interface PreparationPageProps {
  readonly routeId: FoundationRouteId;
}

const parameterLabels = {
  stageId: "ステージID",
  lessonId: "レッスンID",
  wordId: "単語ID",
} as const;

export function PreparationPage({ routeId }: PreparationPageProps) {
  const route = getFoundationRoute(routeId);
  const location = useLocation();
  const params = useParams();
  const parameterEntries = Object.entries(params).filter(
    (entry): entry is [keyof typeof parameterLabels, string] =>
      entry[0] in parameterLabels && typeof entry[1] === "string",
  );

  return (
    <article className={styles.page} aria-labelledby="page-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>{route.phase} で実装予定</p>
        <FocusHeading id="page-title" className={styles.title}>
          {route.title}
        </FocusHeading>
        <p className={styles.lead}>{route.purpose}</p>
        <p className={styles.routeText}>
          現在のルート: <code>{`/#${location.pathname}`}</code>
        </p>
      </header>

      {parameterEntries.length > 0 ? (
        <Card as="section" padding="medium" tone="muted">
          <h2 className={styles.sectionTitle}>選択中の項目</h2>
          <dl>
            {parameterEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{parameterLabels[key]}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <InlineAlert title="この画面は準備中です" tone="info">
        学習機能はまだ未実装です。{route.phase}{" "}
        で学習データと連携した実画面へ置き換えます。現在は、画面の目的とルート構成を確認できます。
      </InlineAlert>

      <Card as="section" padding="medium">
        <h2 className={styles.sectionTitle}>できるようになること</h2>
        <ul className={styles.featureList}>
          {route.plannedFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" padding="medium">
        <h2 id="related-route-title" className={styles.sectionTitle}>
          関連する画面
        </h2>
        <nav aria-labelledby="related-route-title">
          <ul className={styles.routeList}>
            {route.relatedRoutes.map((relatedRoute) => (
              <li key={relatedRoute.to}>
                <Link className={styles.routeLink} to={relatedRoute.to}>
                  <span className={styles.routeLinkTitle}>{relatedRoute.label}</span>
                  <span className={styles.routeLinkDescription}>
                    {relatedRoute.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Card>
    </article>
  );
}
