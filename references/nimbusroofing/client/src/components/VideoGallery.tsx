import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  url: string;
}

const videos: Video[] = [
  {
    id: "1",
    title: "Roof Installation Process",
    description: "Watch our expert team install a complete roofing system in McKinney, TX",
    url: "/videos/846088BB-F3A6-4897-8953-640AC86ED62D-video.mp4",
  },
  {
    id: "2",
    title: "Storm Damage Assessment",
    description: "Our professional storm damage inspection and assessment process",
    url: "/videos/AD2732F7-8C6F-46B8-9D8E-5C5FDA255D66-video.mp4",
  },
  {
    id: "3",
    title: "Quality Workmanship",
    description: "See the attention to detail that makes Nimbus Roofing the best in DFW",
    url: "/videos/E597F299-E5AE-4938-95FF-8FA35892BAD1-video.mp4",
  },
  {
    id: "4",
    title: "Commercial Roofing Project",
    description: "Large-scale commercial roofing installation for local business",
    url: "/videos/B40FFF76-BE42-43E1-9E17-A5EEB6A3FC72-video.mp4",
  },
];

export default function VideoGallery() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
            onClick={() => setSelectedVideo(video)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black">
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all flex items-center justify-center">
                    <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
                <p className="text-sm text-muted-foreground">{video.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedVideo && (
            <div className="relative">
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
                playsInline
              />
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedVideo.title}</h2>
                <p className="text-muted-foreground">{selectedVideo.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
