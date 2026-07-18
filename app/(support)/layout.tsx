import { AssistantWidget } from "@/components/assistant/AssistantWidget";

type SupportLayoutProps = {
  children: React.ReactNode;
};

export default function SupportLayout({ children }: SupportLayoutProps) {
  return (
    <>
      {children}
      <AssistantWidget />
    </>
  );
}
