declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  env: { get(name: string): string | undefined };
};

const EXPECTED_SECRET_HASH =
  "51691e896a4b42c366f9bbee050f9f59947518ba86aa2aaeecd2c93bd8030e38";
const DESTINATION =
  "https://pythonmethodcenter.com/api/notifications/database";

type DatabaseEvent = {
  type?: unknown;
  table?: unknown;
  schema?: unknown;
  record?: { id?: unknown } | null;
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const suppliedSecret = request.headers.get("x-webhook-secret") ?? "";

  if (
    !suppliedSecret ||
    (await sha256(suppliedSecret)) !== EXPECTED_SECRET_HASH
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: DatabaseEvent;

  try {
    event = (await request.json()) as DatabaseEvent;
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (
    event.type !== "INSERT" ||
    event.schema !== "public" ||
    (event.table !== "profiles" && event.table !== "client_cases") ||
    typeof event.record?.id !== "string"
  ) {
    return new Response("Unsupported event", { status: 400 });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceKey) {
    return new Response("Service key unavailable", { status: 503 });
  }

  const response = await fetch(DESTINATION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey
    },
    body: JSON.stringify({
      type: "INSERT",
      table: event.table,
      schema: "public",
      record: { id: event.record.id }
    })
  });

  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
  });
});
