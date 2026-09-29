import type { CatalogLookup } from "@/lib/nexora/diagnostic-catalog/types";

/** Reference candidates have no review action and cannot change the source fact. */
export function DiagnosticCatalogDetails({ result, locale }: { result?: CatalogLookup; locale: "ru" | "en" }) {
  if (!result) return null;
  const ru = locale === "ru";
  const messages: Record<CatalogLookup["state"], string> = ru ? {
    candidates: `Варианты по названию: ${result.totalCandidates}.`,
    declared_code_found: "Указанный в источнике код найден в справочнике. Соответствие исследованию ещё не подтверждено.",
    declared_code_unknown: "Указанного кода нет в этой версии справочника.",
    conflicting_codes: "В названии указано несколько кодов. Нужно уточнить исследование.",
    unknown: "По этому названию совпадений не найдено. Это не означает, что исследования не существует.",
    unavailable: "Справочник временно недоступен. Исходные данные сохранены.",
    input_too_long: "Название слишком длинное для поиска. Нужна проверка исходной строки.",
  } : {
    candidates: `Name-based candidates: ${result.totalCandidates}.`,
    declared_code_found: "The source code is in the catalog. Its applicability to this test is not confirmed.",
    declared_code_unknown: "The source code is absent from this catalog version.",
    conflicting_codes: "The name contains multiple codes. The test needs clarification.",
    unknown: "No name match was found. This does not mean the test does not exist.",
    unavailable: "The catalog is temporarily unavailable. Source data is preserved.",
    input_too_long: "The name is too long for lookup. Review the source line.",
  };
  return <details className="case-picture__catalog">
    <summary>{ru ? "Справочник исследований" : "Diagnostic catalog"}</summary>
    <p>{messages[result.state]}</p>
    <p>{ru ? "Поиск" : "Lookup"}: {result.query}{result.queryBasis === "pmc_name_alias" ? (ru ? " · использован синоним PMC" : " · PMC synonym used") : result.queryBasis === "source_linked_test" ? (ru ? " · название из связанной строки источника" : " · name from the linked source line") : ""}</p>
    {result.candidates.length ? <>
      <p>{ru ? "Это справочные варианты для проверки с учётом материала, метода и контекста. Код автоматически не присваивается." : "These are reference candidates for review against specimen, method and context. No code is assigned automatically."}</p>
      <ul>{result.candidates.map(term => <li key={`${term.system}:${term.code}`}>
        <strong>{term.system === "PMC_FAMILY" ? (ru ? "Категория PMC" : "PMC category") : term.system} · {term.code}</strong>: {term.display}
        <br /><small>{ru ? "Версия источника" : "Source version"}: {term.version}{term.method ? ` · ${ru ? "Метод" : "Method"}: ${term.method}` : ""}{term.property ? ` · ${ru ? "Свойство" : "Property"}: ${term.property}` : ""}</small>
        {term.laboratory ? <p>{term.laboratory}</p> : null}
        {term.system === "GTR" ? <p>{term.testType === "Research" ? (ru ? "Исследовательская запись GTR" : "GTR research listing") : term.testType === "Clinical" ? (ru ? "Клиническая запись GTR" : "GTR clinical listing") : term.testType}. {ru ? "Сведения поданы участником реестра; NIH не подтверждает их точность и не рекомендует перечисленные тесты." : "Submitter-provided information; NIH does not verify its accuracy or endorse listed tests."}</p> : null}
        {term.copyrightNotice ? <small>{term.copyrightNotice}</small> : null}
      </li>)}</ul>
      {result.truncated ? <p>{ru ? `Показаны ${result.candidates.length} из ${result.totalCandidates}. Порядок не отражает клиническую пригодность; нужно уточнить название.` : `Showing ${result.candidates.length} of ${result.totalCandidates}. Order does not indicate clinical suitability; refine the name.`}</p> : null}
    </> : null}
    {result.unit ? <p>{ru ? "Единица из источника" : "Source unit"}: {result.unit.original}. {result.unit.listedCaseSensitiveCode
      ? (ru ? "Код есть в списке UCUM; пригодность для этого показателя не проверена." : "The code is in the UCUM list; suitability for this analyte is not checked.")
      : (ru ? "Код не найден в ограниченном списке UCUM. Это не проверка всей грамматики UCUM." : "The code is absent from the limited UCUM list. This is not a full UCUM grammar check.")}</p> : null}
    <small>{result.version}. {ru ? "Охват справочника неполный. Значения и единицы не пересчитываются." : "Catalog coverage is partial. Values and units are not converted."}</small>
    {result.candidates.some(term => term.system === "LOINC") ? <p><small>This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at <a href="https://loinc.org/license">http://loinc.org/license</a>. LOINC® is a registered United States trademark of Regenstrief Institute, Inc.</small></p> : null}
  </details>;
}
