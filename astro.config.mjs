import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

// Determine site URL based on environment
const getSiteURL = () => {
	// For GitHub Pages deployment
	if (process.env.GITHUB_PAGES_SITE) {
		return process.env.GITHUB_PAGES_SITE;
	}
	// For Vercel production deployment
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	// For Vercel preview deployment
	if (process.env.VERCEL_BRANCH_URL) {
		return `https://${process.env.VERCEL_BRANCH_URL}`;
	}
	// For local development
	return "http://localhost:4321";
};

// https://astro.build/config
export default defineConfig({
	site: getSiteURL(),
	base: "/",
	integrations: [react(), mdx(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
