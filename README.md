# mirkea.com - personal blog

My corner of the internet where I document building a product from scratch, lessons learned after 20 years in software, and whatever else earns a post.

Built with [Astro](https://astro.build/) and hosted on [GitHub Pages](https://pages.github.com/), with Cloudflare in front for CDN and web analytics. Theming courtesy of [astro-blog by William Cachamwri](https://github.com/williamcachamwri/astro-blog), comments via [Cusdis](https://cusdis.com/), and a Spotify "now playing" widget powered by a Cloudflare Worker to keep API keys off the client.

The whole thing went from idea to live in under a day - [here's how](https://mircea.io/blog/hello-world).

## Stack

| Concern         | Tool                                                         |
| --------------- | ------------------------------------------------------------ |
| Framework       | [Astro](https://astro.build/)                                |
| Hosting         | GitHub Pages                                                 |
| Theme           | [astro-blog](https://github.com/williamcachamwri/astro-blog) |
| CDN & analytics | Cloudflare                                                   |
| Comments        | [Cusdis](https://cusdis.com/)                                |
| Spotify widget  | Astro theme + Cloudflare Worker                              |

## Development

```bash
npm run dev      # start local dev server, bound to 0.0.0.0 (localhost + LAN IP printed in terminal)
npm run build    # production build
npm run preview  # preview production build locally
```

To test on your phone, connect it to the same Wi-Fi and open the Network URL printed by `npm run dev`.

## Publishing a post

Posts are written in my [PARA](https://fortelabs.com/blog/para/) setup, outside this repo.

Each post lives in a folder named `YYYY-MM-DD-slug/` and contains `_index.md` plus any images.

To bring a post into the repo, run the ingest script from WSL:

```bash
npm run ingest -- 2026-05-12-a-new-journey

# overwrite an already-ingested post
npm run ingest -- --force 2026-05-12-a-new-journey
```
