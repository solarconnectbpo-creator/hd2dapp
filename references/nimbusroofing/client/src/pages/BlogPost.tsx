import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Eye, ArrowLeft, Phone, Mail } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Streamdown } from "streamdown";
import { Helmet } from "react-helmet";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading } = trpc.blog.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || post.title} | Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</title>
        <meta
          name="description"
          content={post.metaDescription || post.excerpt || ""}
        />
        {post.keywords && <meta name="keywords" content={post.keywords} />}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta
          property="og:description"
          content={post.metaDescription || post.excerpt || ""}
        />
        {post.featuredImage && <meta property="og:image" content={post.featuredImage} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.metaTitle || post.title} />
        <meta
          name="twitter:description"
          content={post.metaDescription || post.excerpt || ""}
        />
        {post.featuredImage && <meta name="twitter:image" content={post.featuredImage} />}
        
        {/* Article metadata */}
        {post.publishedAt && (
          <meta
            property="article:published_time"
            content={new Date(post.publishedAt).toISOString()}
          />
        )}
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-6">
          <Button variant="ghost" asChild>
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="container mx-auto px-4 py-6">
            <div className="aspect-[21/9] overflow-hidden rounded-lg">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Article Content */}
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            {post.category && (
              <Badge variant="secondary" className="mb-4">
                {post.category}
              </Badge>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Draft"}
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {post.viewCount || 0} views
              </div>
            </div>
          </header>

          {/* Article Body */}
          <div className="prose prose-lg max-w-none mb-12">
            <Streamdown>{post.content}</Streamdown>
          </div>

          {/* Keywords */}
          {post.keywords && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.keywords.split(",").map((keyword, index) => (
                  <Badge key={index} variant="outline">
                    {keyword.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-primary text-primary-foreground rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 mb-6">
              Contact Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner today for a free inspection and estimate
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/contact">Get Free Estimate</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="tel:+12146126696">
                  <Phone className="mr-2 h-4 w-4" />
                  (214) 612-6696
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:info@nimbusroofing.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Us
                </a>
              </Button>
            </div>
          </div>
        </article>

        {/* Related Articles Section (Placeholder) */}
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">More Roofing Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/services/residential">
                <div className="text-left">
                  <div className="font-semibold mb-1">Residential Roofing</div>
                  <div className="text-xs text-muted-foreground">
                    Learn about our residential services
                  </div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/services/storm-damage">
                <div className="text-left">
                  <div className="font-semibold mb-1">Storm Damage</div>
                  <div className="text-xs text-muted-foreground">
                    Emergency storm damage restoration
                  </div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/contact">
                <div className="text-left">
                  <div className="font-semibold mb-1">Contact Us</div>
                  <div className="text-xs text-muted-foreground">
                    Get your free roofing estimate
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
