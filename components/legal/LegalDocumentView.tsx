import Link from "next/link";
import type { LegalDocument } from "@/lib/legal/policy-content";

type RelatedLink = {
  href: string;
  label: string;
};

type LegalDocumentViewProps = {
  doc: LegalDocument;
  updatedLabel: string;
  updatedDate: string;
  questionsPrefix: string;
  questionsLink: string;
  related: RelatedLink[];
};

// Shared by the privacy policy and the refund terms. The offer page keeps
// its own markup: it carries the version number and the archived edition,
// which these two do not have.
export function LegalDocumentView({
  doc,
  updatedLabel,
  updatedDate,
  questionsPrefix,
  questionsLink,
  related
}: LegalDocumentViewProps) {
  return (
    <article className="offer-doc">
      {doc.intro ? <p className="offer-doc__note">{doc.intro}</p> : null}

      <h2 className="offer-doc__title">{doc.title}</h2>
      <p className="offer-doc__subtitle">{doc.subtitle}</p>
      <p className="offer-doc__version">
        {updatedLabel} {updatedDate}
      </p>

      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs?.map((text) => (
            <p key={text.slice(0, 40)}>{text}</p>
          ))}
          {section.bullets ? (
            <ul>
              {section.bullets.map((item) => (
                <li key={item.slice(0, 40)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <p className="offer-doc__footer">{doc.footer}</p>

      <p className="offer-doc__ask">
        {questionsPrefix}
        <Link href="/support">{questionsLink}</Link>.
      </p>

      <p className="offer-doc__archive">
        {related.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </p>
    </article>
  );
}
