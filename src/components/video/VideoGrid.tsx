import VideoCard from "./VideoCard";
import type { ReactNode } from "react";
import type { Video } from "../../types";

export default function VideoGrid({
  videos,
  onOpen,
  showOwner,
  empty,
}: {
  videos: Video[];
  onOpen: (video: Video) => void;
  showOwner?: boolean;
  empty?: ReactNode;
}) {
  if (!videos.length) return empty ?? null;
  return (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} onOpen={onOpen} showOwner={showOwner} />
      ))}
    </div>
  );
}
