"use client";

import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { openAnham } from "@/components/assistant/AnhamOpenButton";

type AssistantInviteLabels = {
  label: string;
  title: string;
  text: string;
  questions: string[];
  boundary: string;
};

// The invitation to talk to Анхам, in the cabinet.
//
// Everyone in the focus group registered and not one of them wrote to him.
// Looking at what they actually see explains it without any theory about
// motivation: after registering they land in the cabinet, where the whole
// screen is a message thread to the team under a heading, and Анхам is an
// unexplained figure travelling the edge of the screen. Nobody had been told
// who he is, what he can answer, that he replies at once or that he costs
// nothing. A person with a question did the obvious thing and wrote in the
// big visible box — to the team.
//
// So the invitation lives here, above that box, and it does two things the
// floating figure cannot: it says what he is for, and it offers a first
// question already written. The empty box is the real barrier, not
// willingness — a question that sends itself removes it, and the
// conversation starts with an answer rather than a blinking cursor.
export function AssistantInvite({ labels }: { labels: AssistantInviteLabels }) {
  return (
    <section className="assistant-invite" aria-label={labels.title}>
      <span className="assistant-invite__avatar" aria-hidden="true">
        <AnhamAvatar size={64} state="registered" />
      </span>

      <div className="assistant-invite__body">
        <span className="panel__label">{labels.label}</span>
        <h2>{labels.title}</h2>
        <p>{labels.text}</p>

        <div className="assistant-invite__questions">
          {labels.questions.map((question) => (
            <button
              className="assistant-invite__question"
              key={question}
              onClick={() => openAnham(question)}
              type="button"
            >
              {question}
            </button>
          ))}
        </div>

        {/* Said here rather than only inside the chat: someone who thinks
            this is Professor Python answering will read every word of it
            as his, and that is the one misunderstanding the platform
            cannot afford. */}
        <p className="assistant-invite__boundary">{labels.boundary}</p>
      </div>
    </section>
  );
}
