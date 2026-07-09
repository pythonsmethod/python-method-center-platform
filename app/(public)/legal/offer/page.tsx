import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { OFFER_DOCUMENT_URL, OFFER_VERSION } from "@/lib/legal/offer";

export const metadata: Metadata = {
  title: "Публичная оферта — Python Method"
};

export default function OfferPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Юридические документы"
        title="Публичная оферта"
        description="Действующая редакция договора публичной оферты Python Method. Принятие оферты фиксируется при отправке анкеты."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Документ</span>
          <h2>Оферта, версия {OFFER_VERSION}</h2>
          <p>
            Ознакомьтесь с полным текстом оферты до отправки анкеты и оплаты
            услуг. Отправляя анкету, вы подтверждаете принятие условий этой
            редакции документа.
          </p>
          <div className="panel-actions">
            <a
              className="button"
              href={OFFER_DOCUMENT_URL}
              rel="noreferrer"
              target="_blank"
            >
              Открыть оферту (PDF)
            </a>
          </div>
        </div>
      </section>

      <section className="panel-grid" aria-label="Просмотр документа">
        <object
          aria-label="Текст публичной оферты"
          data={OFFER_DOCUMENT_URL}
          style={{ border: "1px solid var(--line)", borderRadius: "12px", minHeight: "70vh", width: "100%" }}
          type="application/pdf"
        >
          <p className="empty-state">
            Встроенный просмотр PDF недоступен в этом браузере — используйте
            кнопку «Открыть оферту (PDF)» выше.
          </p>
        </object>
      </section>
    </div>
  );
}
