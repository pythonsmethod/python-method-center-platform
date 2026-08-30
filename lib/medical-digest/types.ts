export type MedicalDigestCategory = "rehabilitation" | "oncology" | "discoveries";

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


