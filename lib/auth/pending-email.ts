// Which address is waiting for its confirmation letter. Held in a cookie
// rather than in the URL so it stays out of the browser history and off
// the screen of whoever glances over the person's shoulder.
//
// Its own module because a "use server" file may export nothing but async
// functions, and both the sign-up action and the callback route need this
// name to agree.
export const PENDING_EMAIL_COOKIE = "pm_pending_email";
