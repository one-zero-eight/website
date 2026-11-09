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
- Styling: [TailwindCSS](https://tailwindcss.com/), [Iconify](https://iconify.design/)
- Formatting and linting: [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged), [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- Data fetching: [OpenAPI Typescript](https://openapi-ts.dev/), [TanStack Query](https://tanstack.com/query/latest)
- Calendar: [FullCalendar](https://fullcalendar.io/), [ical.js](https://github.com/kewisch/ical.js)
- i18n: [Lingui](https://lingui.dev/)

## Development

### Set up for development

1. Install [Node.js 20+](https://nodejs.org), [pnpm](https://pnpm.io)
2. Install dependencies: `pnpm install`
3. Start development server: `pnpm run dev`
4. Open in the browser: https://local.innohassle.ru:3000
   > The page will be reloaded when you edit the code

> [!IMPORTANT]
> You must use HTTPS with domain https://local.innohassle.ru:3000 to access APIs with your account.

> [!TIP]
> When the API types change, you can run `pnpm run gen:api` to generate new client types and functions.

> [!TIP]
> After adding UI strings wrapped in Lingui macros (`Trans` / `msg` / `t`), run `pnpm lingui:extract` and fill Russian `msgstr` in `src/locales/ru.po`.

### Proposing chat sources

In cAtIx Sources, choose **Propose a chat** to request a Telegram or MAX chat
for your verified study group or all cAtIx users. The chat administrator must
consent to indexing for the selected audience, including users outside the chat.
Requests use the existing `POST /sources/requests` payload
(`invite_link`, `group_code`, `comment`, `consent`) and require cAtIx administrator review.
Submitting does not join the chat. Approval queues the account worker to join the
Telegram or MAX chat automatically; MAX uses a user account, not an official bot,
and does not require administrator rights. A chat administrator may still need to
approve the join request. **Approved; queued to connect** is not proof of access;
**Waiting for chat access confirmation** can mean chat-side approval is pending.
Indexing and history loading start only after fresh access confirmation.
If a join times out, the worker reconciles current access without blindly repeating
the join. This moderated, approved join is the only exception to passive MAX
operation: no messages, read receipts, typing, or reactions are sent.
After deploying this change, restart the existing MAX account worker to process
already approved requests; no manual database update is needed. This describes the
workflow, not a claim of live MAX verification.

Telegram accepts public `t.me/username` and private `t.me/+HASH` or
`t.me/joinchat/HASH` links. MAX accepts public `max.ru/username` and private
`max.ru/join/HASH` links, optionally prefixed with `https://`. MAX names and
invitation tokens contain 1–128 ASCII letters, digits, underscores, or hyphens;
the bare `max.ru/join` path is invalid. MAX path case is preserved, and links are
submitted with `https://max.ru/`. Queries, fragments, trailing slashes, ports,
and `http://` are not supported. Private invitations are hidden in request
titles and messages.
Untitled requests display **Chat request**; their selected audience is shown separately.

Available source cards identify **Telegram** or **MAX** and link their title to
the chat: a normal public link takes priority, with a saved invitation used when
no public link is available. If neither is known, the title stays plain text.
The catalogue and its links remain limited to the user's allowed source audience;
proposal invitations stay hidden in request titles and messages.

### cAtIx chat

The empty chat offers editable examples for schedules, university rules,
announcements and available rooms. Selecting an example only fills and focuses
the composer; Send submits it. Drafts with text or attachments are not replaced.
Attachments support up to three PDF, TXT or image files, up to 10 MiB each.

Room Booking availability and Music Room service windows also produce booking
cards, even without a personal-schedule recommendation. Service-only offers say
that the personal calendar will be checked before booking. Rooms require a booking
subject; music windows require an explicit start and duration. Only the final Book
click submits consent; loading or choosing an interval does not create a booking.

Answers render Markdown during generation and keep the server status visible.
The backend supplies the answer and its structured `sources` separately. One compact
source list uses the server's citation numbers and preserves document titles,
clauses, sections, provenance and chat metadata. Archive buttons in that same list
open exact archive members without intercepting ordinary Markdown links.
Previously saved answers without structured sources remain readable with their
original text; the client does not clear chat history or drafts during the cutover.
Numeric references in completed answers link to their source in the same response;
source lists use the body text size. Code and existing Markdown links are unchanged.

History and the chat list offer explicit Retry after loading failures. Retrying
the same failed history load preserves the composer and attachments. Request
errors show HTTP, validation or network details without automatically repeating
a question or decision. An unconfirmed action result must be checked in the
service before trying again; this UI does not recover interrupted operations.

### cAtIx notification icon

System reply notifications use `public/catix-notification.png`, copied from the cAtIx logo (800×800 PNG).
The `icon` option in `src/components/search/ask/AskNotifications.tsx` applies to both service-worker and desktop notifications; favicon and PWA icons are independent.

### Development preview on Android via ADB (USB or Wi‑Fi)

Use this setup if you want to open the local dev version on a physical Android device over USB or Wi‑Fi.

#### Prerequisites

- Enable Android developer options and USB debugging: [Configure on-device developer options](https://developer.android.com/studio/debug/dev-options)
- Install Android SDK Platform Tools (`adb`): [SDK Platform Tools release notes and downloads](https://developer.android.com/tools/releases/platform-tools)
- (Linux) If the device is not detected, check USB/device setup: [Run apps on a hardware device](https://developer.android.com/studio/run/device)

#### 1. Connect the device

Pick one method:

**USB**

1. Enable **USB debugging**, plug in USB.
2. Run `adb devices` — status should be `device`.
   - If `unauthorized`, confirm the RSA dialog on the phone and run `adb devices` again.

**Wi‑Fi — Wireless debugging (Android 11+, preferred)**

1. Developer options → **Wireless debugging** → enable it.
2. Open **Pair device with pairing code**, note the IP, pairing port, and 6‑digit code.
3. On the computer:
   ```bash
   adb pair PHONE_IP:PAIRING_PORT
   ```
   Enter the pairing code when prompted.
4. Run `adb devices` — the device should already appear.

**Wi‑Fi — via USB first (Android versions older than 11)**

1. Connect via USB and confirm `adb devices` shows `device`.
2. Enable TCP mode, then connect over Wi‑Fi and unplug USB:
   ```bash
   adb tcpip 5555
   adb connect PHONE_IP:5555
   adb devices
   ```
   Use the phone’s LAN IP (Settings → About / Wi‑Fi details).

#### 2. Forward the port and open the app

Same for every connection method:

```bash
adb reverse tcp:3000 tcp:3000
pnpm run dev --host
```

Open on Android: https://local.innohassle.ru:3000/

> [!NOTE]
> For Wi‑Fi: phone and computer must be on the same network. If pairing or `adb connect` fails, try disabling VPN on the phone. After reconnecting Wi‑Fi or rebooting, you may need to pair / `adb connect` again, then re-run `adb reverse`.

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
