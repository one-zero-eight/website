<p align="center" style="background-color: white">
  <a href="https://innohassle.ru">
    <img alt="InNoHassle" height="300px" src="https://raw.githubusercontent.com/one-zero-eight/design/212a5c06590c4d469a0a894481c09915a4b1735f/logo/ing-white-outline-transparent.svg">
  </a>
</p>

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

The website uses the API of InNoHassle services: [Events](https://github.com/one-zero-eight/events), [Music Room](https://github.com/one-zero-eight/music-room), [Search](https://github.com/one-zero-eight/search).

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

- [Node.js](https://nodejs.org) & [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/) & [Vite](https://vitejs.dev/) & [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview)
- [Vue](https://vuejs.org/) & [Veaury](https://github.com/gloriasoft/veaury)
- Styling: [TailwindCSS](https://tailwindcss.com/), [Iconify](https://iconify.design/)
- Formatting and linting: [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged), [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- Data fetching: [OpenAPI Typescript](https://openapi-ts.dev/), [TanStack Query](https://tanstack.com/query/latest)
- Calendar: [FullCalendar](https://fullcalendar.io/), [ical.js](https://github.com/kewisch/ical.js)

## Development

### Set up for development

1. Install [Node.js 20+](https://nodejs.org), [pnpm](https://pnpm.io)
2. Install dependencies: `pnpm install`
3. Start development server: `pnpm run dev --host`
4. Open in the browser: https://local.innohassle.ru:3000
   > The page will be reloaded when you edit the code

> [!IMPORTANT]
> You must use HTTPS with domain https://local.innohassle.ru:3000 to access APIs with your account.

> [!TIP]
> When the API types change, you can run `pnpm run gen:api` to generate new client types and functions.

### Development preview on Android via USB (ADB)

Use this setup if you want to open the local dev version on a physical Android device over USB.

#### Prerequisites

- Enable Android developer options and USB debugging: [Configure on-device developer options](https://developer.android.com/studio/debug/dev-options)
- Install Android SDK Platform Tools (`adb`): [SDK Platform Tools release notes and downloads](https://developer.android.com/tools/releases/platform-tools)
- (Linux) If the device is not detected, check USB/device setup: [Run apps on a hardware device](https://developer.android.com/studio/run/device)

#### Step-by-step

1. Enable **USB debugging** on the Android device.
2. Connect Android to your computer via USB and keep the phone unlocked.
3. Run:
   ```bash
   adb devices
   ```
4. Make sure your device appears with `device` status.
   - If you see `unauthorized`, confirm the RSA fingerprint dialog on the phone and run `adb devices` again.
5. Forward port `3000` from Android to your computer:
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
6. Start the dev server on your computer:
   ```bash
   pnpm run dev --host
   ```
7. Open on Android: https://local.innohassle.ru:3000/

#### Quick troubleshooting

- Restart ADB server:
  ```bash
  adb kill-server && adb start-server
  ```
- Check active reverse rules:
  ```bash
  adb reverse --list
  ```
- Remove reverse rule for this port:
  ```bash
  adb reverse --remove tcp:3000
  ```

### Preview production build

1. Build the application: `pnpm run build`
2. Run the production-like server: `pnpm run preview --host`
3. Open in the browser: https://local.innohassle.ru:3000

### Project structure

- `src/` - main source code
  - `app/` - entry point of the application
    - `routes` - routing via [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
  - `components/` - components split by pages
  - `lib/` - utilities and domain-specific logic
  - `api/` - API clients and types
- `public/` - static files

## Contributing

We are open to contributions of any kind.
You can help us with code, bugs, design, documentation, media, new ideas, etc.
If you are interested in contributing, please read our [contribution guide](https://github.com/one-zero-eight/.github/blob/main/CONTRIBUTING.md).
