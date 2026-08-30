type PageHeaderProps = {
  eyebrow: string;
  title: string;
  // Optional: some pages need only the title, and an empty paragraph
  // leaves a gap that reads as a mistake.
  description?: string;
  // A page may already carry its h1 above this block — /payment opens with
  // the promo panel and only names itself further down. Two h1 elements on
  // one page break the document outline, so such a page asks for a level 2
  // heading here. The styling is identical either way.
  headingLevel?: 1 | 2;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  headingLevel = 1
}: PageHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";

  return (
    <section className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
