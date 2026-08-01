import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app is meant to be run as a Trimble Connect 3D Extension.
// It is served from your own domain and loaded into Trimble Connect's
// 3D Viewer via an extension manifest (see extension-manifest.json).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Trimble Connect loads extensions in an iframe from a different origin,
    // so during local development the dev server must allow that.
    cors: true,
  },
});
