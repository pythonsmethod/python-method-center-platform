import "server-only";

import { askAssistantTeam } from "@/lib/assistant/router";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  MedicalDigestArticle,
  MedicalDigestCategory,
  MedicalDigestIssue,
  OncologyDigestCategory
} from "@/lib/medical-digest/types";

type EuropePmcResult = {
  id?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  abstractText?: string;
  journalTitle?: string;
  firstPublicationDate?: string;
  pubYear?: string;
  pubType?: string;
};

type DraftArticle = {
  id: string;
  category: MedicalDigestCategory;
  title: string;
  abstract: string;
  journal: string;
  publishedAt: string;
  publicationType: string;
  sourceUrl: string;
  doi: string | null;
  pmid: string | null;
};

const SEARCHES: Array<{ category: OncologyDigestCategory; query: string }> = [
  {
    category: "therapeutics",
    query: '(oncology OR cancer OR neoplasm) AND (vaccine OR drug OR immunotherapy OR radiotherapy OR "cell therapy" OR technology OR device OR "novel therapy" OR investigational) AND HAS_ABSTRACT:Y'
  },
  {
    category: "complementary",
    query: '(oncology OR cancer OR neoplasm) AND ("complementary medicine" OR "integrative oncology" OR herbal OR "plant extract" OR "natural product" OR "traditional medicine" OR supplement OR "case report" OR remission) AND HAS_ABSTRACT:Y'
  },
  {
    category: "research",
    query: '(oncology OR cancer OR neoplasm) AND ("randomized controlled trial" OR "clinical trial" OR "systematic review" OR "meta-analysis" OR preclinical OR "phase I" OR "phase II" OR "phase III") AND HAS_ABSTRACT:Y'
  },
  {
    category: "practice",
    query: '(oncology OR cancer OR neoplasm) AND (guideline OR "standard of care" OR implementation OR "real-world" OR approved) AND HAS_ABSTRACT:Y'
  }
];

const DAY_MS = 86_400_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function issueDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const value = JSON.parse(cleaned) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function fetchCategory(
  category: MedicalDigestCategory,
  query: string,
  now: Date
): Promise<DraftArticle[]> {
  const from = isoDate(new Date(now.getTime() - 90 * DAY_MS));
  const to = isoDate(now);
  const fullQuery = `${query} AND FIRST_PDATE:[${from} TO ${to}]`;
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", fullQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("resultType", "core");
  url.searchParams.set("pageSize", "4");
  url.searchParams.set("sort", "CITED desc");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "PythonMethodCenter/1.0" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Europe PMC returned ${response.status}`);

  const payload = await response.json() as {
    resultList?: { result?: EuropePmcResult[] };
  };

  return (payload.resultList?.result ?? [])
    .filter((item) => item.title && item.abstractText)
    .map((item) => {
      const pmid = item.pmid?.trim() || null;
      const doi = item.doi?.trim() || null;
      const externalId = pmid || item.id?.trim() || doi || crypto.randomUUID();
      return {
        id: `${category}-${externalId}`,
        category,
        title: item.title!.trim(),
        abstract: item.abstractText!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        journal: item.journalTitle?.trim() || "Scientific publication",
        publishedAt: item.firstPublicationDate?.slice(0, 10) || item.pubYear || to,
        publicationType: item.pubType?.trim() || "Research article",
        sourceUrl: pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`
          : `https://europepmc.org/article/${encodeURIComponent(item.id || externalId)}`,
        doi,
        pmid
      };
    });
}

async function summarize(article: DraftArticle): Promise<MedicalDigestArticle> {
  const system = `You are the evidence editor for a private oncology research digest. Use only the supplied bibliographic record and abstract. Never infer patient-specific advice, causation, effectiveness beyond the study, regulatory approval, adoption in clinical practice, chemical composition, molecular formula, extraction method, or facts absent from the abstract. The editorial section is ${article.category}; describe the actual development or implementation stage only when the abstract states it. A case report, remission after a folk remedy, supplement, extract, or complementary intervention is an observation and must never be presented as proof that the intervention caused recovery. Use the term cure only if the source explicitly documents durable complete remission, and still state the evidence design. For compositionRu/compositionEn, list active ingredients, molecules, formula, formulation, extraction or manufacturing method only when explicitly stated; otherwise say that the abstract does not specify it. Return one valid JSON object with exactly these string keys: summaryRu, summaryEn, significanceRu, significanceEn, limitationsRu, limitationsEn, outcomeRu, outcomeEn, evidenceRu, evidenceEn, compositionRu, compositionEn. Each value must be 1-2 concise sentences. Russian fields must be entirely Russian; English fields entirely English. State uncertainty and study limitations explicitly. Do not use Markdown.`;
  const result = await askAssistantTeam(system, [{
    role: "user",
    content: `Title: ${article.title}\nJournal: ${article.journal}\nPublication date: ${article.publishedAt}\nPublication type: ${article.publicationType}\nAbstract:\n${article.abstract.slice(0, 7000)}`
  }], 900, "gpt");
  const parsed = result.status === "ok" ? jsonObject(result.reply) : null;

  const fallbackRu = "Автоматический разбор временно недоступен. Откройте первоисточник, чтобы прочитать аннотацию исследования.";
  const fallbackEn = "The automated review is temporarily unavailable. Open the primary source to read the study abstract.";

  return {
    ...article,
    summaryRu: asText(parsed?.summaryRu) || fallbackRu,
    summaryEn: asText(parsed?.summaryEn) || fallbackEn,
    significanceRu: asText(parsed?.significanceRu) || "Клиническое значение требует оценки по полному тексту исследования.",
    significanceEn: asText(parsed?.significanceEn) || "Clinical significance should be assessed from the full study text.",
    limitationsRu: asText(parsed?.limitationsRu) || "Ограничения не извлечены автоматически; требуется ручная проверка.",
    limitationsEn: asText(parsed?.limitationsEn) || "Limitations were not extracted automatically; manual review is required.",
    outcomeRu: asText(parsed?.outcomeRu) || "Заявленный результат требует проверки по полному тексту.",
    outcomeEn: asText(parsed?.outcomeEn) || "The reported outcome requires review of the full text.",
    evidenceRu: asText(parsed?.evidenceRu) || "Уровень доказательности не определён автоматически.",
    evidenceEn: asText(parsed?.evidenceEn) || "The evidence level was not determined automatically.",
    compositionRu: asText(parsed?.compositionRu) || "Состав, формула или способ получения в аннотации не указаны.",
    compositionEn: asText(parsed?.compositionEn) || "The abstract does not specify the composition, formula, or production method."
  };
}

export async function generateMedicalDigest(now = new Date()): Promise<MedicalDigestIssue> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service role is unavailable");

  const groups = await Promise.all(
    SEARCHES.map(({ category, query }) => fetchCategory(category, query, now))
  );
  const drafts = groups.flat().filter((article, index, all) => {
    const identity = article.pmid || article.doi || article.title.toLowerCase();
    return all.findIndex((candidate) =>
      (candidate.pmid || candidate.doi || candidate.title.toLowerCase()) === identity
    ) === index;
  });
  if (drafts.length === 0) throw new Error("No eligible primary-source articles were found");

  const articles = await Promise.all(drafts.map(summarize));
  const date = issueDate(now);
  const generatedAt = now.toISOString();
  const values = {
    issue_date: date,
    generated_at: generatedAt,
    source_count: articles.length,
    articles
  };
  const { data, error } = await supabase
    .from("medical_digest_issues")
    .upsert(values, { onConflict: "issue_date" })
    .select("id,issue_date,generated_at,source_count,articles")
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id as string,
    issueDate: data.issue_date as string,
    generatedAt: data.generated_at as string,
    sourceCount: data.source_count as number,
    articles: data.articles as MedicalDigestArticle[]
  };
}

export async function listMedicalDigestIssues(limit = 14): Promise<MedicalDigestIssue[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("medical_digest_issues")
    .select("id,issue_date,generated_at,source_count,articles")
    .order("issue_date", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    issueDate: row.issue_date as string,
    generatedAt: row.generated_at as string,
    sourceCount: row.source_count as number,
    articles: row.articles as MedicalDigestArticle[]
  }));
}

