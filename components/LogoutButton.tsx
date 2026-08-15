import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton({ label = "Выйти" }: { label?: string }) {
  return (
    <form action={logoutAction}>
      <button className="button button--secondary" type="submit">
        {label}
      </button>
    </form>
  );
}
