import { AssistantWidget } from "@/components/assistant/AssistantWidget";

type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      {children}
      <AssistantWidget />
    </>
  );
}
