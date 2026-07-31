import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { egyptianIcons, type EgyptianIconName } from "@/components/icons/EgyptianIcons";

// Preview of the future shop. Not indexed until it carries real products:
// a store full of placeholders would cost trust rather than build it.
export const metadata: Metadata = {
  title: "Магазин — Python Method Center",
  robots: { index: false, follow: false }
};

type ShopItem = {
  icon: EgyptianIconName;
  title: string;
  text: string;
  note: string;
};

const items: ShopItem[] = [
  {
    icon: "ankh",
    title: "Формула Professor Python",
    text: "Авторская формула центра. Сейчас она отправляется как подарок вместе с тарифами сопровождения — здесь появится возможность заказать её отдельно.",
    note: "Готовится"
  },
  {
    icon: "cobra",
    title: "Программа восстановления",
    text: "Пошаговая программа под ваш случай: что делать по неделям, за чем следить, когда сверяться с командой.",
    note: "Готовится"
  },
  {
    icon: "papyrus",
    title: "Книга метода",
    text: "Метод Professor Python, изложенный по порядку: принципы, логика, разобранные случаи. Для тех, кто хочет понять, а не просто выполнять.",
    note: "Готовится"
  },
  {
    icon: "scales",
    title: "Разбор анализов",
    text: "Личный разбор от Professor Python без полного сопровождения: обратная связь по состоянию и рекомендации.",
    note: "Уже доступно"
  },
  {
    icon: "lotus",
    title: "Программа профилактики",
    text: "Для тех, кто пока здоров и хочет таким остаться. Поддержка ритма, сна, питания и восстановления сил.",
    note: "Готовится"
  },
  {
    icon: "water",
    title: "Дневник состояния",
    text: "Бумажный и электронный дневник: ежедневные отметки, по которым видно динамику — и вам, и центру.",
    note: "Готовится"
  },
  {
    icon: "scarab",
    title: "Наборы для близких",
    text: "Подарочный набор для того, кого вы хотите поддержать: доступ к платформе, дневник и первый шаг вместе.",
    note: "Идея"
  },
  {
    icon: "wingedSun",
    title: "Сопровождение семьи",
    text: "Когда восстанавливается один, меняется вся семья. Формат для тех, кто проходит путь рядом.",
    note: "Идея"
  }
];

export default function ShopPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Магазин"
        title="Магазин центра"
        description="Здесь будет всё, что центр предлагает помимо сопровождения: формула, программы, книга метода и материалы для тех, кто идёт этим путём. Витрина готовится — так она будет выглядеть."
      />

      <div className="shop-preview-note">
        <span className="shop-badge">Предпросмотр</span>
        <p>
          Это макет для команды: названия и описания — черновые, цен пока нет,
          купить ничего нельзя. Показываем, как магазин будет смотреться,
          чтобы решить, что войдёт в первую линейку.
        </p>
      </div>

      <section aria-label="Товары" className="shop-grid">
        {items.map((item) => {
          const Icon = egyptianIcons[item.icon];

          return (
            <article className="shop-card" key={item.title}>
              <div className="shop-card__icon">
                <Icon title={item.title} />
              </div>
              <span className={`shop-card__note${item.note === "Уже доступно" ? " shop-card__note--live" : ""}`}>
                {item.note}
              </span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

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
            Всё, что появится в магазине, — это поддержка восстановления, а не
            лекарства и не медицинские услуги. Центр не ставит диагнозы и не
            назначает лечение; сопровождение не заменяет наблюдение лечащего
            врача.
          </p>
        </div>
      </section>
    </div>
  );
}
