import { describe, expect, it } from "vitest";
import { parseMetadata, toIsoDate } from "@/lib/assistant/metadata";

describe("шапка документа", () => {
  it("читает семь полей и превращает даты в ISO, сохраняя напечатанное", () => {
    const h = parseMetadata(`ФИО: Дубровенко Анна Викторовна
ДАТА РОЖДЕНИЯ: 12.04.1980
ЛАБОРАТОРИЯ: Инвитро
НОМЕР: 123-45
ДАТА ЗАБОРА: 14.08.2026
ДАТА ОТЧЁТА: 2026-08-15
ЯЗЫК: русский`);

    expect(h.fullName).toBe("Дубровенко Анна Викторовна");
    expect(h.birthDate).toBe("1980-04-12");
    expect(h.birthDatePrinted).toBe("12.04.1980");
    expect(h.collectionDate).toBe("2026-08-14");
    expect(h.reportDate).toBe("2026-08-15");
    expect(h.accession).toBe("123-45");
  });

  it("прочерк — это отсутствие, а не значение", () => {
    const h = parseMetadata("ФИО: —\nДАТА РОЖДЕНИЯ: -\nЛАБОРАТОРИЯ:\nНОМЕР: —\nДАТА ЗАБОРА: —\nДАТА ОТЧЁТА: —\nЯЗЫК: —");

    expect(h.fullName).toBeNull();
    expect(h.collectionDate).toBeNull();
    expect(h.laboratory).toBeNull();
  });

  it("дату, которой не бывает, не выдумывает — но напечатанное оставляет", () => {
    // A wrong date puts a value in the wrong place on the line.
    expect(toIsoDate("31.02.2026")).toBeNull();
    const h = parseMetadata("ДАТА ЗАБОРА: 31.02.2026");

    expect(h.collectionDate).toBeNull();
    expect(h.collectionDatePrinted).toBe("31.02.2026");
  });

  it("Ё и Е в названии поля — одно и то же", () => {
    expect(parseMetadata("ДАТА ОТЧЕТА: 15.08.2026").reportDate).toBe("2026-08-15");
  });
});
