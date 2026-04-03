import { Link } from "react-router";
import { Home } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[min(560px,85dvh)] flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-black">Error</p>
        <h1 className="mb-2 text-6xl font-bold text-black">404</h1>
        <p className="mb-8 max-w-sm text-black">
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

