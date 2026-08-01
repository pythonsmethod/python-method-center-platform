type PageHeaderProps = {
  eyebrow: string;
  title: string;
  // Optional: some pages need only the title, and an empty paragraph
  // leaves a gap that reads as a mistake.
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
