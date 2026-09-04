export type PictureNoteState = "draft" | "confirmed";

export function canSavePictureNote(input: { isStaff: boolean; isKaren: boolean; state: PictureNoteState }): boolean {
  if (!input.isStaff) return false;
  return input.state === "draft" || input.isKaren;
}
