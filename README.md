# InNoHassle Website

> https://innohassle.ru [![Website](https://img.shields.io/website?url=https%3A%2F%2Finnohassle.ru)](https://innohassle.ru)

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg) ](https://opensource.org/licenses/MIT)

[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=bugs)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=one-zero-eight_InNoHassle-Website&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=one-zero-eight_InNoHassle-Website)

## Project description

There are several services in the InNoHassle ecosystem for Innopolis University students.
You can access some of them through the InNoHassle website.

The website uses the API of services [InNoHassle-Events](https://github.com/one-zero-eight/InNoHassle-Events), [InNoHassle-MusicRoom](https://github.com/one-zero-eight/InNoHassle-MusicRoom).

### Services

1. Schedule
   - Check all academic groups, electives, sports sections, cleaning schedules
   - Export schedules to your favorite calendar app on your devices
   - Add groups to favorites to see them in your personal account
   - Hide and show groups in your personal account
   - Choose the format of the schedule - for a day, for a week, or for a month
2. Music room
   - See all bookings of the music room on a separate page
   - View your own bookings in your personal account
3. Scholarship
   - Calculate your scholarship based on expected grades or GPA
   - Calculate what grades are needed to get the desired scholarship
   - Get detailed information about the types of scholarships at the University

### More features

- Sign in to your personal account using your student email
- All relevant academic groups are on your personal dashboard
- Offline access to the website in case of a bad internet connection
- Dark and light theme of the interface

### Technologies

- Node.js, TypeScript
- React, Next.js (App router)
- Styling: TailwindCSS
- Data fetching: Axios, TanStack Query

## Development

### Getting started

- Install Node.js 18+, npm
- Install dependencies: `npm install`
- Copy environment variables file: `cp .env.example .env.local`
- Edit variables in `.env.local` if you want to use a different API server
  - Do not change the ID of the trackers so that they are not enabled in development
- Set up your IDE to autoformat code with Prettier and use ESLint

When the API types change, run `npm run orval` to generate new client types and functions.

### Development server

- Start development server: `npm run dev`
- Open in the browser: http://localhost:3000
  - The page will be reloaded when you edit the code

In order to use the API of the production server, you need to change the SameSite parameter of the `token` cookie in the browser (set `None`).
Then the browser will be able to use the correct token to access the API from the local site.

### Production server

- Build the application: `npm run build`
- Run the production-like server: `npm run start`
- Open in the browser: http://localhost:3000

### Production deployment

We use Docker with Docker Compose plugin to run the website on servers.

- Copy the file with environment variables: `cp .env.example .env.local`
- Change environment variables in the `.env.local` file
- Install Docker with Docker Compose
- Build a Docker image: `docker compose build --pull`
  - Note: API server must be running (check URL in `.env.local` file)
    as Next.js will fetch all resources at build time.
- Run the container: `docker compose up --detach`
- Open in the browser: http://localhost:3000

You can set up a Nginx reverse proxy to add SSL certificates for https.
