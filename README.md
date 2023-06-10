# InNoHassle Website

> https://innohassle.ru

Currently, it provides only Schedule service
that lets Innopolis University students to find their group schedule and import into the calendar app.

Technology stack:

- Node.js
- TypeScript
- React, Next.js
- Tailwind CSS

The website uses API from https://github.com/one-zero-eight/InNoHassle-Parsers.
The schedule parser output should be available on `$NEXT_PUBLIC_API_URL/schedule`.
You can serve parser output via Nginx or any serving program.

## Deployment

Use Docker with Docker Compose plugin to run website on a server.
It will build Next.js website and run Next.js server on port 3000.

Firstly, configure environment variables.
Just copy contents of `.env.example` to `.env.local`.
Then you can configure `.env.local` for your deployment.

```bash
cp .env.example .env.local
```

Install Docker with Docker Compose and run it.

Note: API server must be running (check URL in `.env.local` file)
as Next.js will fetch all resources at build time.

```bash
docker compose build
docker compose up -d
```

Now open http://localhost:3000 in the browser to view the website.

You can configure Nginx to add SSL certificates and host multiple websites
by proxying requests from your domain to `http://127.0.0.1:3000`.

## Development

Firstly, configure environment variables.
Just copy contents of `.env.example` to `.env.local`.
Then you can configure `.env.local`.
Do not configure trackers IDs not to include them during development.

```bash
cp .env.example .env.local
```

Use npm to install dependencies and run development server.

```bash
npm install
npm run dev
```

Now open http://localhost:3000 in the browser to view the website.
The page will be reloaded when you make changes in files.
