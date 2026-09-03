import { defineCollection, z } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
  // "content" covers both .md and .mdx entries once @astrojs/mdx is registered
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    // Thêm readingTime vào schema nhưng đặt là optional
    readingTime: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
