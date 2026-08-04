import type { Locale } from "@/lib/i18n/locale";
import type { PackageArtName } from "@/components/icons/PackageArt";
import type { EgyptianIconName } from "@/components/icons/EgyptianIcons";

// The shop's catalogue.
//
// Split into a spine and its wording: the spine holds what does not change
// with language — the identifier, the drawing, the state the product is
// actually in — and the wording holds what does. The identifier matters
// beyond display: it is what a waiting-list entry is filed under, and it
// must stay the same when the text is rewritten or translated.
//
// Nothing here has a price, because nothing here can be bought yet. When a
// product becomes real, its status moves to "available" and a price and a
// payment link join it — the page already renders around the status.

export type ShopStatus = "available" | "preparing" | "idea";

export const SHOP_ITEM_IDS = [
  "formula",
  "oil",
  "cream",
  "lotion",
  "book",
  "diary",
  "hoodie",
  "pendant"
] as const;

export type ShopItemId = (typeof SHOP_ITEM_IDS)[number];

export function isShopItemId(value: string): value is ShopItemId {
  return (SHOP_ITEM_IDS as readonly string[]).includes(value);
}

export type ShopItemSpine = {
  id: ShopItemId;
  art: PackageArtName;
  // The Latin line under the drawing. The same in both languages by
  // design: it is the name on the package, not a description of it.
  latin: string;
  status: ShopStatus;
};

export type ShopSectionSpine = {
  id: "formulas" | "care" | "knowledge" | "signs";
  icon: EgyptianIconName;
  items: ShopItemSpine[];
};

export const SHOP_SECTIONS: ShopSectionSpine[] = [
  {
    id: "formulas",
    icon: "ankh",
    items: [
      { id: "formula", art: "jar", latin: "PYTHON'S ELIXIR", status: "preparing" },
      { id: "oil", art: "dropper", latin: "ELIXIR OIL", status: "idea" }
    ]
  },
  {
    id: "care",
    icon: "water",
    items: [
      { id: "cream", art: "cream", latin: "ROYAL CREAM", status: "preparing" },
      { id: "lotion", art: "lotion", latin: "BODY LOTION", status: "preparing" }
    ]
  },
  {
    id: "knowledge",
    icon: "papyrus",
    items: [
      { id: "book", art: "book", latin: "THE METHOD", status: "preparing" },
      { id: "diary", art: "diary", latin: "DAILY LOG", status: "preparing" }
    ]
  },
  {
    id: "signs",
    icon: "cobra",
    items: [
      { id: "hoodie", art: "hoodie", latin: "PYTHON WEAR", status: "idea" },
      { id: "pendant", art: "pendant", latin: "SIGN OF LIFE", status: "idea" }
    ]
  }
];

type SectionText = { label: string; title: string; text: string };
type ItemText = { title: string; text: string };

type CatalogText = {
  sections: Record<ShopSectionSpine["id"], SectionText>;
  items: Record<ShopItemId, ItemText>;
};

const RU: CatalogText = {
  sections: {
    formulas: {
      label: "Формулы",
      title: "Формулы центра",
      text: "То, что Professor Python составляет сам. Сейчас формула отправляется вместе с тарифами сопровождения — здесь появится возможность заказать её отдельно."
    },
    care: {
      label: "Уход за телом",
      title: "Линия ухода",
      text: "Средства для ежедневного ухода в том же оформлении: чёрное стекло, золото, знаки центра."
    },
    knowledge: {
      label: "Знание",
      title: "Метод в руках",
      text: "То, что остаётся у человека и после сопровождения."
    },
    signs: {
      label: "Символы",
      title: "Знаки центра",
      text: "Для тех, кто прошёл путь и хочет носить его знак."
    }
  },
  items: {
    formula: {
      title: "Формула Professor Python",
      text: "Авторская формула центра в капсулах. Та самая, что входит в сопровождение."
    },
    oil: {
      title: "Масло-концентрат",
      text: "Концентрат в каплях — для тех, кому удобнее не в капсулах."
    },
    cream: {
      title: "Крем",
      text: "Питательный крем для лица и рук."
    },
    lotion: {
      title: "Лосьон для тела",
      text: "Лосьон для тела с лёгкой текстурой."
    },
    book: {
      title: "Книга метода",
      text: "Метод Professor Python по порядку: принципы, логика, разобранные случаи."
    },
    diary: {
      title: "Дневник состояния",
      text: "Ежедневные отметки, по которым видна динамика — и вам, и центру."
    },
    hoodie: {
      title: "Худи с Оком Гора",
      text: "Чёрное худи с золотым знаком центра."
    },
    pendant: {
      title: "Подвеска-анкх",
      text: "Анкх — знак жизни и символ центра."
    }
  }
};

const EN: CatalogText = {
  sections: {
    formulas: {
      label: "Formulas",
      title: "The centre's formulas",
      text: "What Professor Python composes himself. For now the formula is sent together with the support plans — here it will become possible to order it on its own."
    },
    care: {
      label: "Body care",
      title: "The care line",
      text: "Everyday care products in the same dress: black glass, gold, the signs of the centre."
    },
    knowledge: {
      label: "Knowledge",
      title: "The method in your hands",
      text: "What stays with a person after the support programme ends."
    },
    signs: {
      label: "Symbols",
      title: "The signs of the centre",
      text: "For those who have walked the road and want to wear its sign."
    }
  },
  items: {
    formula: {
      title: "Professor Python's formula",
      text: "The centre's own formula in capsules. The same one included in the support programme."
    },
    oil: {
      title: "Concentrated oil",
      text: "The concentrate in drops — for those who would rather not take capsules."
    },
    cream: {
      title: "Cream",
      text: "A nourishing cream for the face and hands."
    },
    lotion: {
      title: "Body lotion",
      text: "A body lotion with a light texture."
    },
    book: {
      title: "The book of the method",
      text: "Professor Python's method in order: the principles, the logic, cases worked through."
    },
    diary: {
      title: "Daily log",
      text: "Daily notes that make the change visible — to you and to the centre."
    },
    hoodie: {
      title: "Hoodie with the Eye of Horus",
      text: "A black hoodie with the centre's sign in gold."
    },
    pendant: {
      title: "Ankh pendant",
      text: "The ankh — the sign of life and the symbol of the centre."
    }
  }
};

export const SHOP_CATALOG: Record<Locale, CatalogText> = { ru: RU, en: EN };

// Every item, flattened, in the order they appear on the page — the order
// the waiting-list dropdown follows too.
export function listShopItems(): ShopItemSpine[] {
  return SHOP_SECTIONS.flatMap((section) => section.items);
}
