"use client";

import { useState } from "react";
import { COUNTRY_CODES, countryFlag } from "@/lib/profile/identity";
import type { DeliveryProfile } from "@/lib/delivery/types";

export function DeliveryAddressFields({ locale, defaults }: {
  locale: "ru" | "en";
  defaults?: Partial<DeliveryProfile>;
}) {
  const [values, setValues] = useState(() => ({
    delivery_first_name: defaults?.delivery_first_name ?? "", delivery_last_name: defaults?.delivery_last_name ?? "",
    delivery_email: defaults?.delivery_email ?? "", delivery_phone: defaults?.delivery_phone ?? "",
    delivery_country_code: defaults?.delivery_country_code ?? "", delivery_region: defaults?.delivery_region ?? "",
    delivery_city: defaults?.delivery_city ?? "", delivery_street: defaults?.delivery_street ?? "",
    delivery_building: defaults?.delivery_building ?? "", delivery_unit: defaults?.delivery_unit ?? "",
    delivery_postal_code: defaults?.delivery_postal_code ?? "", delivery_instructions: defaults?.delivery_instructions ?? ""
  }));
  const field = (key: keyof typeof values) => ({ value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues(current => ({ ...current, [key]: event.target.value })) });
  const ru = locale === "ru";
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const countries = COUNTRY_CODES.map(code => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return <fieldset className="onboarding-guardian">
    <legend>{ru ? "Адрес для доставки" : "Delivery address"}</legend>
    <p className="onboarding-guardian__note">{ru
      ? "Укажите полные данные получателя. Они нужны для международной или внутренней отправки."
      : "Enter the recipient's complete details. They are required for international or domestic shipment."}</p>
    <div className="panel-grid">
      <label className="field"><span>{ru ? "Имя получателя" : "Recipient first name"}</span><input name="deliveryFirstName" {...field("delivery_first_name")} required /></label>
      <label className="field"><span>{ru ? "Фамилия получателя" : "Recipient last name"}</span><input name="deliveryLastName" {...field("delivery_last_name")} required /></label>
      <label className="field"><span>Email</span><input name="deliveryEmail" type="email" {...field("delivery_email")} required /></label>
      <label className="field"><span>{ru ? "Телефон с кодом страны" : "Phone with country code"}</span><input name="deliveryPhone" type="tel" placeholder="+7 700 000 00 00" {...field("delivery_phone")} required /></label>
      <label className="field"><span>{ru ? "Страна" : "Country"}</span><select name="deliveryCountryCode" {...field("delivery_country_code")} required><option disabled value="">{ru ? "Выберите страну" : "Select a country"}</option>{countries.map(c => <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>)}</select></label>
      <label className="field"><span>{ru ? "Область / регион / штат" : "Region / state / province"}</span><input name="deliveryRegion" {...field("delivery_region")} required /></label>
      <label className="field"><span>{ru ? "Город / населённый пункт" : "City / locality"}</span><input name="deliveryCity" {...field("delivery_city")} required /></label>
      <label className="field"><span>{ru ? "Улица" : "Street"}</span><input name="deliveryStreet" {...field("delivery_street")} required /></label>
      <label className="field"><span>{ru ? "Дом / строение" : "Building"}</span><input name="deliveryBuilding" {...field("delivery_building")} required /></label>
      <label className="field"><span>{ru ? "Квартира / офис / палата" : "Apartment / office / room"}</span><input name="deliveryUnit" {...field("delivery_unit")} /></label>
      <label className="field"><span>{ru ? "Почтовый индекс" : "Postal code"}</span><input name="deliveryPostalCode" {...field("delivery_postal_code")} required /></label>
    </div>
    <label className="field"><span>{ru ? "Дополнительные инструкции для доставки" : "Additional delivery instructions"}</span><textarea name="deliveryInstructions" rows={4} maxLength={1000} {...field("delivery_instructions")} placeholder={ru ? "Например: доставить в больницу, офис или оставить в пункте выдачи." : "For example: deliver to a hospital or office, or hold at a collection point."} /></label>
  </fieldset>;
}
