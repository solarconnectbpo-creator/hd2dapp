import { Link } from "react-router";
import { Home } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[min(560px,85dvh)] flex-1 flex-col items-center justify-center bg-[#12141a] px-4 py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#71767b]">Not found</p>
        <h1 className="mb-2 bg-gradient-to-br from-white to-[#71767b] bg-clip-text text-6xl font-bold tracking-tight text-transparent">
          404
        </h1>
        <p className="mb-8 max-w-sm text-[#8b9199]">
          That page does not exist or was moved. Use the menu to pick a section.
        </p>
        <Link to="/">
          <Button>
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

