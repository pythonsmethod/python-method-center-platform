export type DeliveryStatus = "preparing" | "shipped" | "problem";
export type DeliveryActionState = { status: "idle" | "error" | "success"; message: string };
export const initialDeliveryActionState: DeliveryActionState = { status: "idle", message: "" };

export type DeliveryProfile = {
  delivery_first_name: string | null;
  delivery_last_name: string | null;
  delivery_email: string | null;
  delivery_phone: string | null;
  delivery_country_code: string | null;
  delivery_region: string | null;
  delivery_city: string | null;
  delivery_street: string | null;
  delivery_building: string | null;
  delivery_unit: string | null;
  delivery_postal_code: string | null;
  delivery_instructions: string | null;
  delivery_confirmed_at: string | null;
};

export type DeliveryTask = {
  id: string;
  volunteer_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  delivery_address: string;
  delivery_instructions: string | null;
  quantity: number;
  status: DeliveryStatus;
  shipment_document_path: string | null;
  shipment_document_name: string | null;
  volunteer_comment: string | null;
  shipped_at: string | null;
  created_at: string;
};

export type DeliveryVolunteer = { id: string; full_name: string | null; email: string | null };

export const DELIVERY_PROFILE_COLUMNS = [
  "delivery_first_name", "delivery_last_name", "delivery_email",
  "delivery_phone", "delivery_country_code", "delivery_region",
  "delivery_city", "delivery_street", "delivery_building", "delivery_unit",
  "delivery_postal_code", "delivery_instructions", "delivery_confirmed_at"
].join(", ");
