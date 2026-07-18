import { AssistantWidget } from "@/components/assistant/AssistantWidget";

type ClientLayoutProps = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      {children}
      <AssistantWidget />
    </>
  );
}
