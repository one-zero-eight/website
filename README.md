# Website | InNoHassle ecosystem

> https://innohassle.ru

[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=bugs)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)

## Table of contents

Did you know that GitHub supports table of
contents [by default](https://github.blog/changelog/2021-04-13-table-of-contents-support-in-markdown-files/) 🤔

## About

There are several services in the InNoHassle ecosystem for Innopolis University students.
You can access some of them through the InNoHassle website.

The website uses the API of services [InNoHassle-Events](https://github.com/one-zero-eight/InNoHassle-Events), [InNoHassle-MusicRoom](https://github.com/one-zero-eight/InNoHassle-MusicRoom).

### Services

- 🗓️ Schedule
  - 🔍 Check all academic groups, electives, sports sections, cleaning schedules
  - 📲 Export schedules to your favorite calendar app on your devices
  - 🌟 Add groups to favorites to see them in your personal account
  - 🙈 Hide and show groups in your personal account
  - 🔄 Choose the format of the schedule - for a day, for a week, or for a month
- 🎵 Music room
  - 📅 See all bookings of the music room on a separate page
  - 🧐 View your own bookings in your personal account
- 💰 Scholarship
  - 📊 Calculate your scholarship based on expected grades or GPA
  - 📈 Calculate what grades are needed to get the desired scholarship
  - ℹ️ Get detailed information about the types of scholarships at the University

### More features

- 🔑 Sign in to your personal account using your student email
- 📚 All relevant academic groups are on your personal dashboard
- 📴 Offline access to the website in case of a bad internet connection
- 🌙 Dark and 🌞 light theme of the interface

### Technologies

- [Node.js 18+](https://nodejs.org) & [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/) & [Next.js](https://nextjs.org/) (App router)
- Styling: [TailwindCSS](https://tailwindcss.com/), [Iconify](https://iconify.design/)
- Formatting and linting: [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged), [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- Data fetching: [Axios](https://axios-http.com/), [TanStack Query](https://tanstack.com/query/latest), [Orval](https://orval.dev/)
- Deployment: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/), [GitHub Actions](https://github.com/features/actions)
- Calendar: [FullCalendar](https://fullcalendar.io/), [ical.js](https://github.com/kewisch/ical.js)

## Development

### Getting started

1. Install Node.js 18+, npm
2. Install dependencies: `npm install`
3. Set up pre-commit hooks (for formatting and linting): `npm run prepare`
4. Copy environment variables file: `cp .env.example .env.local`
5. Edit variables in `.env.local` if you want to use a different API server
   > Do not change the ID of the trackers so that they are not enabled in development
6. Set up your IDE to autoformat code with Prettier and use ESLint

When the API types change, run `npm run orval` to generate new client types and functions.

### Run for development

1. Start development server: `npm run dev`
2. Open in the browser: http://localhost:3000
   > The page will be reloaded when you edit the code

In order to use the API of the production server, you need to change the SameSite parameter of the `token` cookie in the browser (set `None`).
Then the browser will be able to use the correct token to access the API from the local site.

### Run for production

1. Build the application: `npm run build`
2. Run the production-like server: `npm run start`
3. Open in the browser: http://localhost:3000

### Deployment

We use Docker with Docker Compose plugin to run the website on servers.

1. Copy the file with environment variables: `cp .env.example .env.local`
2. Change environment variables in the `.env.local` file
3. Install Docker with Docker Compose
4. Build a Docker image: `docker compose build --pull`
   > API server must be running (check URL in `.env.local` file) as Next.js will fetch all resources at build time
5. Run the container: `docker compose up --detach`
6. Open in the browser: http://localhost:3000

You can set up a Nginx reverse proxy to add SSL certificates for https.
