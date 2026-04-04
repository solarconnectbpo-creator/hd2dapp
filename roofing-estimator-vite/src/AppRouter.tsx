import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { RoofingProvider } from "./context/RoofingContext";
import { AuthProvider } from "./context/AuthContext";

export default function AppRouter() {
  return (
    <AuthProvider>
      <RoofingProvider>
        <Toaster richColors closeButton position="top-center" theme="dark" />
        <RouterProvider router={router} />
      </RoofingProvider>
    </AuthProvider>
  );
}

