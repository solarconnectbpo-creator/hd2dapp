import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Eye } from "lucide-react";
import { Link } from "wouter";

export default function Blog() {
  const { data: posts, isLoading } = trpc.blog.getPublished.useQuery({ limit: 50, offset: 0 });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner Blog</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            Expert insights on roofing, storm damage restoration, insurance claims, and home protection
            in McKinney, Texas and surrounding areas.
          </p>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="container mx-auto px-4 py-12">
        {!posts || posts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No blog posts available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {post.featuredImage && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Draft"}
                      <span className="mx-2">•</span>
                      <Eye className="h-4 w-4" />
                      {post.viewCount || 0} views
                    </div>
                    <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    {post.excerpt && (
                      <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {post.category && (
                      <Badge variant="secondary" className="mb-2">
                        {post.category}
                      </Badge>
                    )}
                    <Button variant="link" className="px-0">
                      Read More →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-12 mt-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Roofing Services?</h2>
          <p className="text-xl opacity-90 mb-6">
            Get a free inspection and estimate from McKinney's trusted roofing experts
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">Get Free Estimate</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="tel:+12146126696">(214) 612-6696</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
