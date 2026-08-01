import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { packageArt, type PackageArtName } from "@/components/icons/PackageArt";
import { egyptianIcons, type EgyptianIconName } from "@/components/icons/EgyptianIcons";

// Preview of the future shop, in the black-and-gold Egyptian style
// Professor Python wants for the line. Not indexed until it carries real
// products: a store full of placeholders would cost trust, not build it.
export const metadata: Metadata = {
  title: "Магазин — Python Method Center",
  robots: { index: false, follow: false }
};

type ShopItem = {
  art: PackageArtName;
  title: string;
  latin: string;
  text: string;
  note: string;
};

type ShopSection = {
  icon: EgyptianIconName;
  label: string;
  title: string;
  text: string;
  items: ShopItem[];
};

const sections: ShopSection[] = [
  {
    icon: "ankh",
    label: "Формулы",
    title: "Формулы центра",
    text: "То, что Professor Python составляет сам. Сейчас формула отправляется как подарок с тарифами сопровождения — здесь появится возможность заказать её отдельно.",
    items: [
      {
        art: "jar",
        title: "Формула Professor Python",
        latin: "PYTHON'S ELIXIR",
        text: "Авторская формула центра в капсулах. Та самая, что входит в сопровождение.",
        note: "Готовится"
      },
      {
        art: "dropper",
        title: "Масло-концентрат",
        latin: "ELIXIR OIL",
        text: "Концентрат в каплях — для тех, кому удобнее не в капсулах.",
        note: "Идея"
      }
    ]
  },
  {
    icon: "water",
    label: "Уход за телом",
    title: "Линия ухода",
    text: "Средства для ежедневного ухода в том же оформлении: чёрное стекло, золото, знаки центра.",
    items: [
      {
        art: "cream",
        title: "Крем",
        latin: "ROYAL CREAM",
        text: "Питательный крем для лица и рук.",
        note: "Готовится"
      },
      {
        art: "lotion",
        title: "Лосьон для тела",
        latin: "BODY LOTION",
        text: "Лосьон для тела с лёгкой текстурой.",
        note: "Готовится"
      }
    ]
  },
  {
    icon: "papyrus",
    label: "Знание",
    title: "Метод в руках",
    text: "То, что остаётся у человека и после сопровождения.",
    items: [
      {
        art: "book",
        title: "Книга метода",
        latin: "THE METHOD",
        text: "Метод Professor Python по порядку: принципы, логика, разобранные случаи.",
        note: "Готовится"
      },
      {
        art: "diary",
        title: "Дневник состояния",
        latin: "DAILY LOG",
        text: "Ежедневные отметки, по которым видна динамика — и вам, и центру.",
        note: "Готовится"
      }
    ]
  },
  {
    icon: "cobra",
    label: "Символы",
    title: "Знаки центра",
    text: "Для тех, кто прошёл путь и хочет носить его знак.",
    items: [
      {
        art: "hoodie",
        title: "Худи с Оком Гора",
        latin: "PYTHON WEAR",
        text: "Чёрное худи с золотым знаком центра.",
        note: "Идея"
      },
      {
        art: "pendant",
        title: "Подвеска-анкх",
        latin: "SIGN OF LIFE",
        text: "Анкх — знак жизни и символ центра.",
        note: "Идея"
      }
    ]
  }
];

export default function ShopPage() {
  return (
    <div className="page-shell shop-page">
      <PageHeader
        eyebrow="Магазин"
        title="Магазин центра"
        description="Формулы, уход, книга метода и знаки центра — в одном оформлении: чёрное с золотом, знаки Египта, имя Professor Python. Витрина готовится — так она будет выглядеть."
      />

      <div className="shop-preview-note">
        <span className="shop-badge">Предпросмотр</span>
        <p>
          Макет для команды: упаковки нарисованы, названия и описания черновые,
          цен пока нет и купить ничего нельзя. Когда появятся настоящие фото
          продукции, они встанут на место этих рисунков.
        </p>
      </div>

      {sections.map((section) => {
        const Icon = egyptianIcons[section.icon];

        return (
          <section
            aria-label={section.title}
            className="shop-section"
            key={section.label}
          >
            <div className="shop-section__head">
              <span className="shop-section__icon">
                <Icon />
              </span>
              <div>
                <span className="panel__label">{section.label}</span>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </div>
            </div>

            <div className="shop-grid">
              {section.items.map((item) => {
                const Art = packageArt[item.art];

                return (
                  <article className="shop-card shop-card--product" key={item.title}>
                    <span
                      className={`shop-card__note${
                        item.note === "Уже доступно" ? " shop-card__note--live" : ""
                      }`}
                    >
                      {item.note}
                    </span>
                    <div className="shop-card__art">
                      <Art id={`art-${item.art}`} title={item.title} />
                    </div>
                    <span className="shop-card__latin">{item.latin}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="panel-grid" aria-label="Что дальше">
        <div className="panel panel--promo">
          <span className="panel__label">Пока магазин готовится</span>
          <h2>Путь начинается с разбора</h2>
          <p>
            Первый шаг не требует покупки: зарегистрируйтесь, заполните анкету и
            загрузите свои анализы — Professor Python лично посмотрит вашу
            ситуацию.
          </p>
          <div className="panel-actions">
            <Link className="button" href="/login">
              Начать путь
            </Link>
            <Link className="button button--secondary" href="/payment">
              Тарифы сопровождения
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Границы ответственности</span>
          <h2>Не замена лечения</h2>
          <p>
            Всё, что появится в магазине, — поддержка восстановления, а не
            лекарства и не медицинские услуги. Центр не ставит диагнозы и не
            назначает лечение; сопровождение не заменяет наблюдение лечащего
            врача.
          </p>
        </div>
      </section>
    </div>
  );
}
