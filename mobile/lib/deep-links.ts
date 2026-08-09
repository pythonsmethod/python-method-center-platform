import * as Linking from 'expo-linking';

// Derived from the scheme in app.json rather than written out by hand.
// The previous literal said "pythonmethod://" while the app registers
// "pythonmethodcenter", so every recovery link opened nothing. Deriving it
// means the two cannot drift apart again.
export const PASSWORD_RESET_PATH = 'reset-password';

export const PASSWORD_RESET_REDIRECT_URL = Linking.createURL(PASSWORD_RESET_PATH);
