import { AssistantWidget } from "@/components/assistant/AssistantWidget";

type PaymentLayoutProps = {
  children: React.ReactNode;
};

export default function PaymentLayout({ children }: PaymentLayoutProps) {
  return (
    <>
      {children}
      <AssistantWidget />
    </>
  );
}
