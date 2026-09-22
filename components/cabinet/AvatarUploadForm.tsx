"use client";

import { startTransition, useActionState, useState } from "react";
import { uploadProfileAvatar } from "@/lib/profile/actions";
import { initialProfileAvatarActionState } from "@/lib/profile/action-state";
import { ClientAvatar } from "@/components/cabinet/ClientAvatar";
import { prepareAvatarUpload } from "@/lib/profile/prepare-avatar";

type AvatarLabels = {
  camera: string;
  choose: string;
  hint: string;
  title: string;
  uploading: string;
  tooLarge: string;
  unsupported: string;
};

export function AvatarUploadForm({ avatarUrl, labels, name }: {
  avatarUrl: string | null;
  labels: AvatarLabels;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    uploadProfileAvatar,
    initialProfileAvatarActionState
  );
  const [clientError, setClientError] = useState("");
  const [preparing, setPreparing] = useState(false);

  const submitSelectedFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setClientError("");
    setPreparing(true);
    const prepared = await prepareAvatarUpload(file);
    setPreparing(false);
    if (prepared.status !== "ready") {
      setClientError(prepared.status === "too-large" ? labels.tooLarge : labels.unsupported);
      return;
    }

    const formData = new FormData();
    formData.set("avatar", prepared.file);
    startTransition(() => action(formData));
  };

  const picker = (camera: boolean) => (
    <form action={action} className="profile-avatar__picker">
      <label className={`button${camera ? " button--secondary" : ""}`}>
        {camera ? labels.camera : labels.choose}
        <input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          capture={camera ? "user" : undefined}
          disabled={pending || preparing}
          name="avatar"
          onChange={submitSelectedFile}
          type="file"
        />
      </label>
    </form>
  );

  return (
    <section className="profile-avatar" aria-labelledby="profile-avatar-title">
      <ClientAvatar className="profile-avatar__preview" name={name} url={avatarUrl} />
      <div>
        <h3 id="profile-avatar-title">{labels.title}</h3>
        <p>{labels.hint}</p>
        <div className="profile-avatar__actions">
          {picker(false)}
          {picker(true)}
        </div>
        {pending || preparing ? <p aria-live="polite">{labels.uploading}</p> : null}
        {clientError ? (
          <p aria-live="polite" className="form-message form-message--error" role="status">
            {clientError}
          </p>
        ) : null}
        {state.message ? (
          <p aria-live="polite" className={`form-message form-message--${state.status}`} role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
