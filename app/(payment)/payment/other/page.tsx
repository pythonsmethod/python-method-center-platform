import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AltPaymentForm } from "@/components/payments/AltPaymentForm";
import { getAltPaymentBlocks } from "@/lib/payments/alt-methods";

export const dynamic = "force-dynamic";

// For everyone whose card Stripe cannot accept. Whole countries fall into
// this, and a person who is ready to pay and simply cannot is the most
// expensive visitor to lose.
export default async function OtherPaymentPage() {
  const blocks = getAltPaymentBlocks();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Другие способы оплаты"
        title="Если оплата картой не проходит"
        description="Так бывает: в некоторых странах карты просто не принимаются, и дело не в вас. Мы найдём способ — напишите нам, и мы пришлём реквизиты."
      />

      <div className="back-link">
        <Link className="button button--secondary" href="/payment">
          ← Вернуться к тарифам
        </Link>
      </div>

      {blocks.length > 0 ? (
        <section className="panel-grid" aria-label="Доступные способы">
          {blocks.map((block) => (
            <div className="panel" key={block.id}>
              <span className="panel__label">Способ оплаты</span>
              <h2>{block.title}</h2>
              <p>{block.hint}</p>
              <pre className="payment-details">{block.details}</pre>
            </div>
          ))}
        </section>
      ) : null}

      <section className="documents-section" aria-label="Запросить реквизиты">
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">Запрос</span>
              <h2>Напишите нам — подберём способ</h2>
              <p>
                Укажите страну и то, как вам удобно платить. Мы ответим на
                email в течение 24 часов в рабочие дни и пришлём реквизиты. Если
                из вашей страны у нас пока нет способа — скажем честно и
                предложим другой вариант.
              </p>
            </div>
            <AltPaymentForm consentLabel="Согласен(на) на обработку указанных контактных данных для ответа на этот запрос." />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">Как это будет</span>
              <h2>Что произойдёт дальше</h2>
            </div>
            <ol className="success-steps">
              <li>Вы отправляете запрос — это ни к чему вас не обязывает.</li>
              <li>Мы отвечаем на email и присылаем реквизиты для вашей страны.</li>
              <li>
                Вы оплачиваете удобным способом и присылаете подтверждение —
                скриншот или номер операции.
              </li>
              <li>
                Команда вручную отмечает оплату, и доступ к сопровождению
                открывается так же, как при оплате картой.
              </li>
            </ol>
            <p className="founder-hint">
              Оплата вне сайта проверяется человеком, поэтому доступ
              открывается не мгновенно, а после подтверждения — обычно в тот же
              рабочий день.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
