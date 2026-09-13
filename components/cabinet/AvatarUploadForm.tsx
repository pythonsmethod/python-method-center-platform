"use client";

import { useActionState } from "react";
import { uploadProfileAvatar } from "@/lib/profile/actions";
import { initialProfileAvatarActionState } from "@/lib/profile/action-state";
import { ClientAvatar } from "@/components/cabinet/ClientAvatar";

type AvatarLabels = {
  camera: string;
  choose: string;
  hint: string;
  title: string;
  uploading: string;
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

  const submitSelectedFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit();
  };

  const picker = (camera: boolean) => (
    <form action={action} className="profile-avatar__picker">
      <label className={`button${camera ? " button--secondary" : ""}`}>
        {camera ? labels.camera : labels.choose}
        <input
          accept="image/jpeg,image/png,image/webp"
          capture={camera ? "user" : undefined}
          disabled={pending}
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
        {pending ? <p aria-live="polite">{labels.uploading}</p> : null}
        {state.message ? (
          <p aria-live="polite" className={`form-message form-message--${state.status}`} role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
