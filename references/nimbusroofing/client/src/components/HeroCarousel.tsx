import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CarouselImage {
  src: string;
  alt: string;
  location: string;
  projectType: string;
  date: string;
}

const CAROUSEL_IMAGES: CarouselImage[] = [
  {
    src: "/carousel-real/IMG_2823.jpeg",
    alt: "Stunning turret roof installation with decorative brick detail - McKinney luxury home",
    location: "McKinney, TX",
    projectType: "Luxury Residential Roofing",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2825.jpeg",
    alt: "Beautiful aerial view of completed roof replacement with pool - McKinney residence",
    location: "McKinney, TX",
    projectType: "Complete Roof Replacement",
    date: "2024"
  },
  {
    src: "/carousel-real/5CC35CAD-69AD-4F2A-ACB9-898C8AD84472.jpeg",
    alt: "Nimbus Roofing yard sign at completed project - Professional residential roofing",
    location: "McKinney, TX",
    projectType: "Residential Roofing",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2826.jpeg",
    alt: "Ground-level view of Nimbus Roofing crew at work - Professional installation team",
    location: "McKinney, TX",
    projectType: "Professional Installation",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2824.jpeg",
    alt: "Aerial detail shot of turret roof with intricate brickwork - Premium craftsmanship",
    location: "McKinney, TX",
    projectType: "Custom Turret Roofing",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_0997.jpeg",
    alt: "Completed residential roof with dark shingles - Modern architectural design",
    location: "McKinney, TX",
    projectType: "Architectural Shingle Installation",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2223.jpeg",
    alt: "Beautiful brick home with new roof installation - Premium residential project",
    location: "McKinney, TX",
    projectType: "Premium Materials",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2207.jpeg",
    alt: "Luxury home with turret and premium architectural shingles - McKinney showcase project",
    location: "McKinney, TX",
    projectType: "Luxury Residential",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_0993.jpeg",
    alt: "Completed two-story residential roof with Nimbus yard sign - Professional craftsmanship",
    location: "McKinney, TX",
    projectType: "Complete Replacement",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_0996.jpeg",
    alt: "Beautiful custom home with mixed materials roof - Premium installation",
    location: "McKinney, TX",
    projectType: "Custom Roofing",
    date: "2024"
  },
  {
    src: "/carousel-real/IMG_2278.jpeg",
    alt: "Residential roof repair completion - Quality workmanship guaranteed",
    location: "McKinney, TX",
    projectType: "Roof Repair",
    date: "2024"
  }
];

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentImage = CAROUSEL_IMAGES[currentIndex];

  return (
    <div className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-slate-900">
      {/* Carousel Images */}
      <div className="relative w-full h-full">
        {CAROUSEL_IMAGES.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center">
        <div className="container">
          <div className="max-w-2xl text-white">
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30">
              <Hammer className="h-4 w-4 mr-2" />
              {currentImage.projectType}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              McKinney's Trusted Roofing Experts
            </h1>
            <p className="text-xl md:text-2xl mb-6 drop-shadow-md">
              Professional roofing services since 2015. Licensed, insured, and Owens Corning Preferred Contractor.
            </p>
            <div className="flex items-center gap-4 mb-8 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{currentImage.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{currentImage.date}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="tel:+12146126696">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                  Call (214) 612-6696
                </Button>
              </a>
              <a href="mailto:info@nimbusroofing.com">
                <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                  Email Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all z-10"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all z-10"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {CAROUSEL_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-6 right-6 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
        {currentIndex + 1} / {CAROUSEL_IMAGES.length}
      </div>
    </div>
  );
}
