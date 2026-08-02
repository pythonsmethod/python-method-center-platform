import { NextResponse } from "next/server";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// The chat window asks for this when it opens: the previous conversation of
// the person who is signed in — theirs and no one else's. A visitor without
// an account simply gets an empty thread, because nothing was ever saved.
export async function GET() {
  const auth = await createSupabaseServerClient();

  if (!auth) {
    return NextResponse.json({ messages: [] });
  }

  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const result = await getOwnAssistantHistory(user.id);

  if (result.status === "error") {
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({
    messages: result.messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  });
}
