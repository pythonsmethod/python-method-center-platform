type ClientAvatarProps = {
  className?: string;
  name: string;
  url?: string | null;
};

export function ClientAvatar({ className = "", name, url }: ClientAvatarProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span
      aria-label={name}
      className={`client-avatar${url ? " client-avatar--photo" : ""}${className ? ` ${className}` : ""}`}
      role="img"
      style={url ? { backgroundImage: `url(${JSON.stringify(url).slice(1, -1)})` } : undefined}
    >
      {url ? null : initial}
    </span>
  );
}
