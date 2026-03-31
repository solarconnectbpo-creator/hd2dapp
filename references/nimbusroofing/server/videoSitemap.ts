import { getDb } from "./db";
import { blogPosts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface VideoMetadata {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  uploadDate: string; // ISO 8601 format
  contentUrl: string; // actual video file URL
}

// Hardcoded video metadata for existing videos
const VIDEO_METADATA: VideoMetadata[] = [

  {
    url: "https://nimbusroofing.com/videos/ai-generated-1",
    title: "AI-Powered Roof Inspection Technology",
    description: "See how Nimbus Roofing uses cutting-edge AI technology to analyze roof damage, detect issues invisible to the naked eye, and provide accurate estimates instantly.",
    thumbnailUrl: "https://nimbusroofing.com/videos/ai-generated-1-thumb.jpg",
    duration: 60,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/ai-generated-1.mp4",
  },
  {
    url: "https://nimbusroofing.com/videos/ai-generated-2",
    title: "Smart Roofing Solutions with Google Gemini AI",
    description: "Discover how Nimbus Roofing leverages Google Gemini AI to provide instant roof damage assessments, weather alerts, and personalized recommendations for DFW homeowners.",
    thumbnailUrl: "https://nimbusroofing.com/videos/ai-generated-2-thumb.jpg",
    duration: 90,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/ai-generated-2.mp4",
  },
  {
    url: "https://nimbusroofing.com/videos/project-showcase-1",
    title: "Luxury Home Roof Replacement - Stonebridge Ranch",
    description: "Premium roof replacement on a luxury home in Stonebridge Ranch. Features high-end architectural shingles, custom flashing, and meticulous attention to detail.",
    thumbnailUrl: "https://nimbusroofing.com/videos/846088BB-F3A6-4897-8953-640AC86ED62D-thumb.jpg",
    duration: 120,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/846088BB-F3A6-4897-8953-640AC86ED62D-video.mp4",
  },
  {
    url: "https://nimbusroofing.com/videos/project-showcase-2",
    title: "Commercial Roofing Project - McKinney Business District",
    description: "Large-scale commercial roofing installation featuring TPO membrane roofing system with 20-year warranty. Completed on schedule with zero business interruption.",
    thumbnailUrl: "https://nimbusroofing.com/videos/AD2732F7-8C6F-46B8-9D8E-5C5FDA255D66-thumb.jpg",
    duration: 150,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/AD2732F7-8C6F-46B8-9D8E-5C5FDA255D66-video.mp4",
  },
  {
    url: "https://nimbusroofing.com/videos/project-showcase-3",
    title: "Emergency Roof Repair - Hail Damage Response",
    description: "24-hour emergency response to severe hail damage. Watch our team provide temporary protection and complete permanent repairs within 48 hours.",
    thumbnailUrl: "https://nimbusroofing.com/videos/B40FFF76-BE42-43E1-9E17-A5EEB6A3FC72-thumb.jpg",
    duration: 100,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/B40FFF76-BE42-43E1-9E17-A5EEB6A3FC72-video.mp4",
  },
  {
    url: "https://nimbusroofing.com/videos/project-showcase-4",
    title: "Residential Roof Inspection Process",
    description: "Complete walkthrough of our comprehensive roof inspection process. Learn what our certified inspectors look for and how we document every detail.",
    thumbnailUrl: "https://nimbusroofing.com/videos/E597F299-E5AE-4938-95FF-8FA35892BAD1-thumb.jpg",
    duration: 90,
    uploadDate: new Date().toISOString(),
    contentUrl: "https://nimbusroofing.com/videos/E597F299-E5AE-4938-95FF-8FA35892BAD1-video.mp4",
  },
];

/**
 * Generate video sitemap XML
 */
export async function generateVideoSitemap(): Promise<string> {
  const videos = VIDEO_METADATA;

  const videoEntries = videos
    .map((video) => {
      return `
  <url>
    <loc>${escapeXml(video.url)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(video.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:content_loc>${escapeXml(video.contentUrl)}</video:content_loc>
      <video:duration>${video.duration}</video:duration>
      <video:publication_date>${video.uploadDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:uploader info="https://nimbusroofing.com">Nimbus Roofing</video:uploader>
      <video:live>no</video:live>
    </video:video>
  </url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${videoEntries}
</urlset>`;
}

/**
 * Generate VideoObject schema markup for a single video
 */
export function generateVideoSchema(video: VideoMetadata): object {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: `PT${video.duration}S`, // ISO 8601 duration format
    contentUrl: video.contentUrl,
    embedUrl: video.url,
    publisher: {
      "@type": "Organization",
      name: "Nimbus Roofing",
      logo: {
        "@type": "ImageObject",
        url: "https://nimbusroofing.com/logo.png",
      },
    },
  };
}

/**
 * Get all video metadata
 */
export function getAllVideos(): VideoMetadata[] {
  return VIDEO_METADATA;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
