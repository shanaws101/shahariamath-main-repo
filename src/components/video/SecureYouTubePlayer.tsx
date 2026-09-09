interface SecureVideoPlayerProps {
  /** Bunny Stream embed URL stored in the database. */
  url: string | null | undefined;
  title?: string;
  autoplay?: boolean;
  className?: string;
}

const BUNNY_PLAYER_HOST = "player.mediadelivery.net";

/**
 * Normalizes Bunny Stream URLs stored in the database into a playable embed URL.
 *
 * The database column is still named youtube_url for legacy schema compatibility,
 * but the value is expected to be a Bunny Stream URL.
 */
export function toBunnyEmbedUrl(input: unknown): string | null {
  const value = String(input ?? "").trim();
  if (!value) return null;

  const embedMatch = value.match(
    /(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/([^/?#&\s]+)\/([^/?#&\s]+)/i,
  );
  if (embedMatch) {
    return `https://${BUNNY_PLAYER_HOST}/embed/${embedMatch[1]}/${embedMatch[2]}`;
  }

  const bunnyMatch = value.match(
    /video\.bunnycdn\.com\/(?:embed|play)\/([^/?#&\s]+)\/([^/?#&\s]+)/i,
  );
  if (bunnyMatch) {
    return `https://${BUNNY_PLAYER_HOST}/embed/${bunnyMatch[1]}/${bunnyMatch[2]}`;
  }

  return null;
}

export function SecureVideoPlayer({ url, title = "Class video", className = "" }: SecureVideoPlayerProps) {
  const src = toBunnyEmbedUrl(url);

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {src ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          referrerPolicy="origin-when-cross-origin"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/70">
          Invalid Bunny Stream URL
        </div>
      )}
    </div>
  );
}

// Backwards-compatible export while old imports are migrated.
export const SecureYouTubePlayer = SecureVideoPlayer;
