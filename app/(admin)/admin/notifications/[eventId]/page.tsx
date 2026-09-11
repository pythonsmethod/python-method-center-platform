import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { GapReadToggle } from "@/components/founder/GapReadToggle";
import { getFounderState } from "@/lib/auth/require-founder";
import {
  gapAudienceLabel,
  gapLocaleLabel,
  gapTargetLabel,
  gapTopicLabel,
  notificationsCopy
} from "@/lib/assistant/escalation-copy";
import { getGapEvent } from "@/lib/assistant/escalation-store";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocale } from "@/lib/i18n/locale";
import { isUuid } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

type GapEventPageProps = {
  params: Promise<{ eventId: string }>;
};

// One recorded gap, in full. "In full" is four enumerated values and a
// timestamp — there is nothing else, by design.
export default async function FounderGapEventPage({ params }: GapEventPageProps) {
  const { eventId } = await params;
  const locale = await getLocale();
  const copy = notificationsCopy(locale);
  const auth = await getFounderState();

  if (auth.status === "forbidden" || auth.status === "unauthenticated") {
    notFound();
  }

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.setupText}
        />
        <p className="form-message form-message--error">
          {auth.missingEnvVars.join(", ")}
        </p>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.errorText}
        />
        <p className="form-message form-message--error">{auth.message}</p>
      </div>
    );
  }

  if (!isUuid(eventId)) {
    notFound();
  }

  const result = await getGapEvent(eventId, auth.userId);

  if (result.status === "absent") {
    notFound();
  }

  if (result.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.errorText}
        />
        <p className="form-message form-message--error">{copy.errorText}</p>
        <div className="panel-actions">
          <Link className="button button--secondary" href="/admin/notifications">
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  const { event } = result;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={gapTopicLabel(event.topic, locale)}
        description={event.read ? copy.read : copy.unread}
      />

      <section className="panel-grid" aria-label={copy.listLabel}>
        <div className="panel">
          <span className="panel__label">{copy.topic}</span>
          <h2>{gapTopicLabel(event.topic, locale)}</h2>
          <ul className="status-list">
            <li>
              {copy.audience}: {gapAudienceLabel(event.audience, locale)}
            </li>
            <li>
              {copy.target}: {gapTargetLabel(event.escalationTarget, locale)}
            </li>
            <li>
              {copy.language}: {gapLocaleLabel(event.locale, locale)}
            </li>
            <li>
              {copy.occurred}: {formatDateTime(event.createdAt, locale)}
            </li>
          </ul>
          <GapReadToggle
            eventId={event.id}
            labels={{ markRead: copy.markRead, markUnread: copy.markUnread }}
            read={event.read}
          />
        </div>

        <div className="panel">
          <span className="panel__label">{copy.draftTitle}</span>
          <h2>{event.knowledgeDraftId ? copy.draftTitle : copy.draftMissing}</h2>
          <p>{event.knowledgeDraftId ? copy.draftText : copy.draftMissing}</p>
          {event.knowledgeDraftId ? (
            <Link className="button button--secondary" href="/admin/assistant">
              {copy.draftLink}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="intake-section" aria-label={copy.privacyTitle}>
        <div className="panel">
          <span className="panel__label">{copy.privacyTitle}</span>
          <p>{copy.privacyText}</p>
        </div>
      </section>

      <div className="panel-actions">
        <Link className="button button--secondary" href="/admin/notifications">
          {copy.back}
        </Link>
      </div>
    </div>
  );
}
