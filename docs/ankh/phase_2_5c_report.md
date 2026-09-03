# Phase 2.5C — итоговый отчёт A–S

Дата повторного прогона: 2026-09-03. **NO-GO: Definition of Done не достигнут.**
Разрешённая повторная обработка, реальные R1/R2 fixtures и исправления layout выполнены. Все 47 целей проверены на выходе TypeScript-парсера, но независимый exact-value Gold benchmark не восстановлен. Покрытие source-pattern целей — 16/47; это не клиническая точность.

## A. Отсутствие provider tables
Повторный запуск той же версии Document AI успешно обработал 8/8 снимков, 4 212 токенов; table objects снова 0/8. Внутренняя причина отсутствия таблиц у провайдера не установлена.

## B. Spatial fallback
Реальные OCR-токены выявили два дефекта staging fallback: value-only перенос обрывал headerless table; наличие любой headered table отключало headerless поиск на всей странице.
Исправлено сохранение перенесённых значений, распознавание повторяющегося разделителя Test(s) Performed, строк internal controls, обработка нескольких таблиц на одной странице без дублирования уже занятых токенов. Headered detection теперь требует label header (test/analyte/marker), а не только совпадения двух слов с названиями полей. Это общие правила формы, без имён пациентов, учреждений или конкретных координат в production-коде.

## C. Layout confidence
Сохранено разделение OCR confidence и эвристической layout confidence. Headerless rows имеют 0.7; все spatial clinical facts — NEEDS_REVIEW. Высокий OCR confidence не подтверждает семантическую связь маркера с процентом или методом.

## D. Pathology root cause
Снимок 7 и повторный OCR содержат явно указанный score 2. Исторический regex искал score 3: ошибка annotation подтверждена. OCR не потерял score.
До Phase 2.5C в TypeScript отсутствовал mitotic-score extractor; уже добавленный extractor на настоящей минимизированной строке возвращает 2. Счёт митозов не используется для вычисления score. Исторический Gold-файл не переписан.

## E. Реальные fixtures
Добавлен tests/fixtures/clinical-real-minimized-v1.json: реальная строка pathology со source tokens и минимальная область biomarker table со spatial tokens, без ФИО, DOB, MRN, телефонов, учреждений, дат и полных документов. Сохранены нормализованные координаты, token IDs и confidence.
R2 является ограниченным фрагментом формы; завершающая часть пояснения HER2 за пределами области не включена. Он проверяет строки и переносы, а не весь документ или полноту biomarker ontology.

## F. Изменения
lib/clinical-evidence/spatial-table.ts; tests/clinical-real-regression.test.ts; минимизированный JSON; scripts/ankh/compare-clinical-coverage.mjs; отчёты и metadata error library. Production worker, миграции и Phase 3 не включались.

## G. До
Исторические 46/47 — Python regex presence в OCR, не результат TypeScript extraction.
Новая база сравнения: исходный staging TypeScript-код этого продолжения на повторных OCR blocks/tokens — 11/47 source-pattern целей. Это отдельная база, не пересчёт исторической клинической точности.

## H. После
После исправлений — 16/47 source-pattern целей по пяти логическим документам, объединённым из 8 снимков. Target regressions относительно нового TypeScript baseline: 0. Потерянных ранее выданных evidence IDs: 0.
Это проверка наличия целевого текста в фактах парсера. Она не заменяет exact-value benchmark, полноту extraction или независимую проверку всех утверждений.

## I. Все 47 целей
Полный per-ID результат: output/ankh-benchmark/phase-2-5c-parser-coverage.json.
Найдены: r_modality, r_comparison, m_left_mass, m_nme, m_recommendation, p_modality, p_recommendation, h_mitoses, h_er, h_er_pct, h_pr, h_her2, h_method, b_procedure, b_laterality, b_recommendation.
Остальные 31 цель не найдены данным аудитом в фактах парсера. Даты учитывались только при выдаче EVENT_DATE, а не по наличию цифр в исходном документе. Predicate audit не проверяет полную семантику каждого поля.
Исторический coordinate-only файл не содержит expected values или полного набора supporting token IDs. Поэтому отсутствие регрессии по прежним 46 Gold-фактам не доказано.

## J. False VERIFIED / NEEDS_REVIEW
Новые spatial clinical facts остаются NEEDS_REVIEW. Для настоящего R1 score 2 также NEEDS_REVIEW.
Общий false VERIFIED и независимый review recall остаются null: старый текстовый verifier и все неподтверждённые результаты не прошли полный независимый аудит. Нельзя подменять эти показатели нулём.

## K. Provenance
В реальных R1/R2 сохранены координаты и IDs исходных токенов; reconstructed cells/rows сохраняют исходные tokens.
Аудит 47 целей отдельно показывает наличие region provenance. Это не полная token-level provenance каждого факта; общая provenance completeness не измерена.

## L. Synthetic regression
Синтетический benchmark проходит: 3 документа/4 страницы; его прежние показатели 100% относятся только к синтетическому набору.

## M. Проверки
Финальный полный прогон: 700 passed / 2 failed, 97 test files (96 passed / 1 failed).
Два прежних падения tests/free-review-description.test.ts: ожидание даты 1 сентября и прежней формулировки бесплатного формата. Они не относятся к extraction.
Новые реальные regression tests: 4/4; вместе с clinical-hardening: 29/29. TypeScript и ESLint проходят. Временные CJS bundles удалены; их lint-ошибки устранены удалением generated artifacts.
Проверки локальные; production build/деплой не заявляются.

## N. Артефакты
- tests/fixtures/clinical-real-minimized-v1.json
- tests/clinical-real-regression.test.ts
- output/ankh-benchmark/phase-2-5c-parser-coverage.json
- output/ankh-benchmark/phase-2-5c-real-comparison.json
- scripts/ankh/compare-clinical-coverage.mjs

Comparator принимает приватную папку с parser-before.json/parser-after.json и путь итогового отчёта. Source-pattern predicates доступны для проверки, но не названы независимым Gold. Полные приватные parser outputs после разрешённой очистки не сохранены; повтор полного прогона требует нового разрешённого OCR-входа.

## O. Security / очистка
Пользователь явно подтвердил временную загрузку в Cloud Shell и последующее удаление. Upload UI фактически сохранил 8 JPG в домашнюю папку; файлы немедленно перемещены в согласованную ankh-phase25c-temp с правами directory 700 / files 600.
Удалены и проверены: 8 JPG, 8 raw responses, 2 производных parser outputs с медицинским текстом, временная папка и 3 bundles. В домашней папке загруженных JPG также нет.
Gold сохранён без изменений: 19 168 bytes, SHA-256 prefix 31e6ec2b627310d0. Сохранены только минимизированный fixture и обезличенный coverage audit. Исходные пользовательские вложения не удалялись и не помещались в Git.

## P. Ограничения
Неполное narrative extraction, EVENT_DATE и BI-RADS variants; отсутствие независимо проверенного 47-фактного Gold; field/marker linkage процентов и методов остаётся review-only. Один Case не доказывает generalization. Исправление таблиц не устраняет эти отдельные пробелы.

## Q. Wider validation
GO для контролируемого расширения обезличенных regression fixtures; NO-GO для заявления о подтверждённой real-world accuracy.

## R. Phase 3
NO-GO для production и для реализации Phase 3 на предположении, что extraction gate пройден. Архитектурное обсуждение возможно с явно открытыми validation gates.

## S. Следующее действие
Создать независимо проверенный expected-fact набор с типами, значениями, нужным review routing и полными supporting token IDs; затем закрывать выявленные narrative/date/BI-RADS gaps отдельными общими правилами и реальными минимизированными fixtures. Не считать 16/47 окончательным exact-value результатом и не возвращаться к историческим 46/47 как к доказательству качества.

## T. Closure Pass checkpoint
Продолжение по заданию Closure Pass описано в [phase_2_5c_closure_pass.md](phase_2_5c_closure_pass.md), разделы A–V. Добавлены opt-in механизмы bounded narrative, measurement, labeled date и BI-RADS, а также evaluator с отдельно передаваемыми ожиданиями и независимой проверкой. Матрица включает все 31 ранее не найденные цели. Новый реальный replay ещё не выполнен; значения разделов G–K выше относятся только к предыдущему прогону.

## U. Проверки Closure Pass
15 новых synthetic tests проходят. Общий прогон: 715 passed / 2 прежних failed; TypeScript и ESLint проходят. Все 47 целей сохранены в phase-2-5c-closure-status.json со статусом NOT_REPLAYED; новые реальные метрики остаются null.

## V. Closure Pass — финальный итог
После явного подтверждения выполнены повторный OCR и opt-in Closure parser. Все 47 целей получили source match и независимо от parser output сверены с исходными изображениями: 47 NEEDS_REVIEW, 0 VERIFIED, 0 missed, 0 false VERIFIED; `b_path_link` оставлен source-only. Region provenance есть у 47/47, полный supporting-token provenance — 0/47 и не заявляется. Временные изображения, raw OCR, полный parser output и временные скрипты удалены; recursive leak check вернул пустой список. Подробности и SHA-256 сохранённого минимизированного benchmark — в phase_2_5c_closure_pass.md. Bounded Closure Pass закрыт как review-only; production и Phase 3 остаются NO-GO.
