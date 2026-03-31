import { useEffect, useState } from "react";
import { Star, Quote, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Review {
  name: string;
  rating: number;
  text: string;
  date: string;
}

interface ReviewsData {
  rating: number;
  totalReviews: number;
  reviews: Review[];
}

export default function CustomerReviews() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Load reviews from JSON file
    fetch("/reviews.json")
      .then((res) => res.json())
      .then((data) => setReviewsData(data))
      .catch((err) => console.error("Failed to load reviews:", err));
  }, []);

  useEffect(() => {
    // Auto-rotate reviews every 5 seconds
    const interval = setInterval(() => {
      if (reviewsData) {
        setCurrentIndex((prev) => (prev + 1) % reviewsData.reviews.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reviewsData]);

  if (!reviewsData) {
    return null;
  }

  const { rating, totalReviews, reviews } = reviewsData;

  // Show 3 reviews at a time
  const visibleReviews = [
    reviews[currentIndex],
    reviews[(currentIndex + 1) % reviews.length],
    reviews[(currentIndex + 2) % reviews.length],
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            What Our Customers Say
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-6 w-6 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-2xl font-bold">{rating}</span>
            <span className="text-gray-600">({totalReviews} reviews)</span>
          </div>
          <a
            href="https://maps.app.goo.gl/Wqk6cWVxb1Uu6Hpd8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <img
              src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
              alt="Google"
              className="h-6"
            />
            See all reviews on Google
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {visibleReviews.map((review, index) => (
            <Card
              key={`${review.name}-${index}`}
              className="hover:shadow-xl transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-2 mb-4">
                  <Quote className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex mb-2">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 line-clamp-4">
                      "{review.text}"
                    </p>
                    <div className="border-t pt-4">
                      <p className="font-semibold text-gray-900">{review.name}</p>
                      <p className="text-sm text-gray-500">{review.date}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2">
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-blue-600 w-8"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to review ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-lg text-gray-700 mb-6">
            Join 154+ satisfied customers in McKinney and North Texas
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
              asChild
            >
              <a href="/contact">Get Your Free Estimate</a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              asChild
            >
              <a href="tel:+12146126696">Call (214) 612-6696</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
