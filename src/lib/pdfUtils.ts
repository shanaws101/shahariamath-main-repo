export function getGoogleDriveEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return `https://drive.google.com/file/d/${match1[1]}/preview`;
  
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return `https://drive.google.com/file/d/${match2[1]}/preview`;

  const match3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match3 && match3[1]) return `https://drive.google.com/file/d/${match3[1]}/preview`;

  if (url.includes('drive.google.com') && url.includes('/preview')) {
    return url;
  }
  return null;
}
