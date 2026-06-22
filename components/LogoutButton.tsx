import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="button button--secondary" type="submit">
        Log out
      </button>
    </form>
  );
}
