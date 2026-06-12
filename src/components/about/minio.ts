export function getTelegramAvatarPath(telegram: string) {
  return `${import.meta.env.VITE_MINIO_URL}/about/avatars/${telegram}.webp`;
}
export function getImagePath(name: string) {
  return `${import.meta.env.VITE_MINIO_URL}/about/images/${name}`;
}
