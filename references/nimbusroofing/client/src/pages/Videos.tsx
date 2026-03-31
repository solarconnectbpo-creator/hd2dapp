import { Helmet } from "react-helmet-async";
import { Play, Clock, Calendar } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  uploadDate: string;
  category: string;
}

const videos: Video[] = [
  {
    id: "ai-generated-1",
    title: "AI-Powered Roof Inspection Technology",
    description: "See how Nimbus Roofing uses cutting-edge AI technology to analyze roof damage, detect issues invisible to the naked eye, and provide accurate estimates instantly.",
    thumbnail: "/videos/ai-generated-1-thumb.jpg",
    videoUrl: "/videos/ai-generated-1.mp4",
    duration: "1:00",
    uploadDate: "2026-01-22",
    category: "Technology",
  },
  {
    id: "ai-generated-2",
    title: "Smart Roofing Solutions with Google Gemini AI",
    description: "Discover how Nimbus Roofing leverages Google Gemini AI to provide instant roof damage assessments, weather alerts, and personalized recommendations for DFW homeowners.",
    thumbnail: "/videos/ai-generated-2-thumb.jpg",
    videoUrl: "/videos/ai-generated-2.mp4",
    duration: "1:30",
    uploadDate: "2026-01-22",
    category: "Technology",
  },
  {
    id: "project-showcase-1",
    title: "Luxury Home Roof Replacement - Stonebridge Ranch",
    description: "Premium roof replacement on a luxury home in Stonebridge Ranch. Features high-end architectural shingles, custom flashing, and meticulous attention to detail.",
    thumbnail: "/videos/846088BB-F3A6-4897-8953-640AC86ED62D-thumb.jpg",
    videoUrl: "/videos/846088BB-F3A6-4897-8953-640AC86ED62D-video.mp4",
    duration: "2:00",
    uploadDate: "2026-01-22",
    category: "Residential",
  },
  {
    id: "project-showcase-2",
    title: "Commercial Roofing Project - McKinney Business District",
    description: "Large-scale commercial roofing installation featuring TPO membrane roofing system with 20-year warranty. Completed on schedule with zero business interruption.",
    thumbnail: "/videos/AD2732F7-8C6F-46B8-9D8E-5C5FDA255D66-thumb.jpg",
    videoUrl: "/videos/AD2732F7-8C6F-46B8-9D8E-5C5FDA255D66-video.mp4",
    duration: "2:30",
    uploadDate: "2026-01-22",
    category: "Commercial",
  },
  {
    id: "project-showcase-3",
    title: "Emergency Roof Repair - Hail Damage Response",
    description: "24-hour emergency response to severe hail damage. Watch our team provide temporary protection and complete permanent repairs within 48 hours.",
    thumbnail: "/videos/B40FFF76-BE42-43E1-9E17-A5EEB6A3FC72-thumb.jpg",
    videoUrl: "/videos/B40FFF76-BE42-43E1-9E17-A5EEB6A3FC72-video.mp4",
    duration: "1:40",
    uploadDate: "2026-01-22",
    category: "Emergency",
  },
  {
    id: "project-showcase-4",
    title: "Residential Roof Inspection Process",
    description: "Complete walkthrough of our comprehensive roof inspection process. Learn what our certified inspectors look for and how we document every detail.",
    thumbnail: "/videos/E597F299-E5AE-4938-95FF-8FA35892BAD1-thumb.jpg",
    videoUrl: "/videos/E597F299-E5AE-4938-95FF-8FA35892BAD1-video.mp4",
    duration: "1:30",
    uploadDate: "2026-01-22",
    category: "Inspection",
  },
];

export default function Videos() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const categories = ["All", ...new Set(videos.map((v) => v.category))];
  const filteredVideos = filter === "All" ? videos : videos.filter((v) => v.category === filter);

  // Generate VideoObject schema markup for SEO
  const videoSchemas = videos.map((video) => ({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: `https://nimbusroofing.com${video.thumbnail}`,
    uploadDate: video.uploadDate,
    duration: `PT${video.duration.replace(":", "M")}S`,
    contentUrl: `https://nimbusroofing.com${video.videoUrl}`,
    embedUrl: `https://nimbusroofing.com/videos/${video.id}`,
    publisher: {
      "@type": "Organization",
      name: "Nimbus Roofing",
      logo: {
        "@type": "ImageObject",
        url: "https://nimbusroofing.com/logo.png",
      },
    },
  }));

  return (
    <>
      <Helmet>
        <title>Roofing Videos - Project Showcases & Tutorials | Nimbus Roofing</title>
        <meta
          name="description"
          content="Watch our roofing project videos including installations, repairs, storm damage assessments, and AI-powered roof inspections. See the quality and precision of Nimbus Roofing in action."
        />
        <meta
          name="keywords"
          content="roofing videos, roof installation video, storm damage repair, roof inspection, McKinney roofing, DFW roofing contractor, AI roof inspection"
        />
        <link rel="canonical" href="https://nimbusroofing.com/videos" />
        
        {/* Video Schema Markup */}
        {videoSchemas.map((schema, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
        
        {/* Open Graph */}
        <meta property="og:title" content="Roofing Videos - Project Showcases | Nimbus Roofing" />
        <meta property="og:description" content="Watch our roofing project videos and see the quality of our work" />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content="https://nimbusroofing.com/videos" />
        <meta property="og:image" content="https://nimbusroofing.com/videos/roofing-project-1-thumb.jpg" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
          <div className="container">
            <h1 className="text-5xl font-bold mb-6">Roofing Project Videos</h1>
            <p className="text-xl text-blue-100 max-w-3xl">
              Watch our expert team in action. See real installations, repairs, and AI-powered inspections that showcase the quality and precision of Nimbus Roofing.
            </p>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="container py-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  filter === category
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Video Grid */}
        <div className="container pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="group cursor-pointer bg-card rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                onClick={() => setSelectedVideo(video)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-200 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white text-sm px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(video.uploadDate).toLocaleDateString()}
                    <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                      {video.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Player Modal */}
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-5xl p-0">
            {selectedVideo && (
              <div>
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full aspect-video bg-black"
                />
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedVideo.title}</h2>
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
