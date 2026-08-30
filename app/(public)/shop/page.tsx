import type { Metadata } from "next";
import { Link } from "@/components/LocaleLink";
import { PageHeader } from "@/components/PageHeader";
import { packageArt } from "@/components/icons/PackageArt";
import { egyptianIcons } from "@/components/icons/EgyptianIcons";
import { ShopNotifyButton } from "@/components/shop/ShopNotifyButton";
import { ShopWaitlist } from "@/components/shop/ShopWaitlist";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { SHOP_CATALOG, SHOP_SECTIONS, listShopItems } from "@/lib/shop/catalog";

// Not indexed while the line is being prepared: a store that cannot sell
// anything is not what a stranger should meet first in search. When the
// first product goes on sale, drop the robots block here and put /shop
// back into app/sitemap.ts.
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).shop;

  return {
    title: `${t.title} — Python Method Center`,
    description: t.description,
    robots: { index: false, follow: false }
  };
}

export default async function ShopPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).shop;
  const catalog = SHOP_CATALOG[locale];

  const waitlistOptions = [
    { value: "", label: t.waitlist.wholeLine },
    ...listShopItems().map((item) => ({
      value: item.id,
      label: catalog.items[item.id].title
    }))
  ];

  return (
    <div className="page-shell shop-page">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="shop-preview-note">
        <span className="shop-badge">{t.stageBadge}</span>
        <p>{t.stageText}</p>
      </div>

      {SHOP_SECTIONS.map((section) => {
        const Icon = egyptianIcons[section.icon];
        const sectionText = catalog.sections[section.id];

        return (
          <section
            aria-label={sectionText.title}
            className="shop-section"
            key={section.id}
          >
            <div className="shop-section__head">
              <span className="shop-section__icon">
                <Icon />
              </span>
              <div>
                <span className="panel__label">{sectionText.label}</span>
                <h2>{sectionText.title}</h2>
                <p>{sectionText.text}</p>
              </div>
            </div>

            <div className="shop-grid">
              {section.items.map((item) => {
                const Art = packageArt[item.art];
                const itemText = catalog.items[item.id];

                return (
                  <article
                    className="shop-card shop-card--product"
                    key={item.id}
                  >
                    <span
                      className={`shop-card__note${
                        item.status === "available"
                          ? " shop-card__note--live"
                          : ""
                      }`}
                    >
                      {t.status[item.status]}
                    </span>
                    <div className="shop-card__art">
                      <Art id={`art-${item.art}`} title={itemText.title} />
                    </div>
                    <span className="shop-card__latin">{item.latin}</span>
                    <h3>{itemText.title}</h3>
                    <p>{itemText.text}</p>
                    {item.status === "available" ? null : (
                      <ShopNotifyButton
                        itemId={item.id}
                        label={t.notifyButton}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <ShopWaitlist labels={t.waitlist} options={waitlistOptions} />

      <section className="panel-grid" aria-label={t.nextLabel}>
        <div className="panel panel--promo">
          <span className="panel__label">{t.nextLabel}</span>
          <h2>{t.nextTitle}</h2>
          <p>{t.nextText}</p>
          <div className="panel-actions">
            <Link className="button" href="/login">
              {t.nextStart}
            </Link>
            <Link className="button button--secondary" href="/payment">
              {t.nextPlans}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.limitsLabel}</span>
          <h2>{t.limitsTitle}</h2>
          <p>{t.limitsText}</p>
        </div>
      </section>
    </div>
  );
}
