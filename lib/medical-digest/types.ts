export type MedicalDigestCategory =
  | "research"
  | "therapeutics"
  | "complementary"
  | "practice"
  // Kept only so oncology articles in already-saved issues remain readable.
  | "oncology"
  | "rehabilitation"
  | "discoveries"
  | "development";

export type OncologyDigestCategory =
  | "therapeutics"
  | "complementary"
  | "research"
  | "practice";

export type MedicalDigestArticle = {
  id: string;
  category: MedicalDigestCategory;
  title: string;
  summaryRu: string;
  summaryEn: string;
  significanceRu: string;
  significanceEn: string;
  limitationsRu: string;
  limitationsEn: string;
  outcomeRu: string;
  outcomeEn: string;
  evidenceRu: string;
  evidenceEn: string;
  compositionRu: string;
  compositionEn: string;
  journal: string;
  publishedAt: string;
  publicationType: string;
  sourceUrl: string;
  doi: string | null;
  pmid: string | null;
};

export type MedicalDigestIssue = {
  id: string;
  issueDate: string;
  generatedAt: string;
  articles: MedicalDigestArticle[];
  sourceCount: number;
};


