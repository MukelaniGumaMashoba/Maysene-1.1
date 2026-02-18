const pad = (n: number) => n.toString().padStart(2, "0");

export default function getExt(duration_seconds: number) {
  const hours = Math.floor(duration_seconds / 3600);
  const minutes = Math.floor((duration_seconds % 3600) / 60);
  const seconds = duration_seconds % 60;

  // if (seconds <= 60) {
  //   return `${pad(minutes)}:${pad(seconds)}`;
  // } else if (hours > 0) {
  //   return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  // } else if (minutes > 0) {
  //   return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  // } else {
  //   return `${seconds} secs`;
  // }

  return `${pad(minutes)}:${pad(seconds)}`;
}
