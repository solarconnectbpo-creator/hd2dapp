import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { RoofingProvider } from "./context/RoofingContext";
import { AuthProvider } from "./context/AuthContext";

export default function AppRouter() {
  return (
    <AuthProvider>
      <RoofingProvider>
        <Toaster
          richColors
          closeButton
          position="top-center"
          theme="dark"
          toastOptions={{
            classNames: {
              toast:
                "hd2d-toast rounded-xl border border-white/[0.08] bg-[#12141a]/95 text-[#e7e9ea] shadow-xl shadow-black/40 backdrop-blur-md",
            },
          }}
        />
        <RouterProvider router={router} />
      </RoofingProvider>
    </AuthProvider>
  );
}

