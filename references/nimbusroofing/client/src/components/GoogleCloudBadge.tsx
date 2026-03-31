/**
 * Google Cloud Startup Partner Badge
 * Compliance-safe positioning that signals Google Cloud alignment
 * without claiming certification
 */

interface GoogleCloudBadgeProps {
  variant?: "hero" | "footer" | "technology";
  className?: string;
}

export default function GoogleCloudBadge({ variant = "hero", className = "" }: GoogleCloudBadgeProps) {
  if (variant === "footer") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <svg width="180" height="40" viewBox="0 0 180 40" xmlns="http://www.w3.org/2000/svg">
          <style>{`
            .bg { fill:#0f172a; stroke:#1f2937; stroke-width:1; rx:8; }
            .text { font-family:Inter, Arial; fill:#e5e7eb; }
            .title { font-size:10px; font-weight:600; }
            .sub { font-size:8px; fill:#9ca3af; }
          `}</style>
          <rect x="1" y="1" width="178" height="38" className="bg"/>
          <circle cx="16" cy="20" r="3" fill="#4285F4"/>
          <circle cx="24" cy="20" r="3" fill="#EA4335"/>
          <circle cx="32" cy="20" r="3" fill="#FBBC05"/>
          <circle cx="40" cy="20" r="3" fill="#34A853"/>
          <text x="55" y="18" className="text title">Built on Google Cloud</text>
          <text x="55" y="28" className="text sub">Cloud Run · Vertex AI</text>
        </svg>
      </div>
    );
  }

  if (variant === "technology") {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700 ${className}`}>
        <div className="flex items-start gap-6">
          {/* Google Dots Logo */}
          <div className="flex gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4285F4]"></div>
            <div className="w-4 h-4 rounded-full bg-[#EA4335]"></div>
            <div className="w-4 h-4 rounded-full bg-[#FBBC05]"></div>
            <div className="w-4 h-4 rounded-full bg-[#34A853]"></div>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              Built on Google Cloud
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Nimbus IQ is built on Google Cloud, leveraging Cloud Run for secure execution and 
              Vertex AI for multimodal, agentic inference. The platform is designed to scale 
              within the Google for Startups ecosystem.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Cloud Run", "Vertex AI", "Gemini", "Python"].map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-slate-700 text-gray-200 rounded-full text-xs font-medium border border-slate-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-gray-500">
            Google Cloud and Vertex AI are trademarks of Google LLC. Nimbus IQ is an independent 
            software platform built on Google Cloud infrastructure.
          </p>
        </div>
      </div>
    );
  }

  // Hero variant (default)
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg width="240" height="56" viewBox="0 0 240 56" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          .hero-bg { fill:#0f172a; stroke:#1f2937; stroke-width:1; rx:12; }
          .hero-text { font-family:Inter, Arial; fill:#e5e7eb; }
          .hero-title { font-size:13px; font-weight:600; }
          .hero-sub { font-size:10px; fill:#9ca3af; }
        `}</style>
        <rect x="1" y="1" width="238" height="54" className="hero-bg"/>
        <circle cx="22" cy="28" r="4" fill="#4285F4"/>
        <circle cx="34" cy="28" r="4" fill="#EA4335"/>
        <circle cx="46" cy="28" r="4" fill="#FBBC05"/>
        <circle cx="58" cy="28" r="4" fill="#34A853"/>
        <text x="75" y="25" className="hero-text hero-title">Built on Google Cloud</text>
        <text x="75" y="38" className="hero-text hero-sub">Startup Platform · Cloud Run · Vertex AI</text>
      </svg>
    </div>
  );
}
