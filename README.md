# Routine

A habit tracker for iPhone:

- **Today**: a month calendar that turns greener the more habits you finish, plus total done, best day, current streak and longest streak. You can share the month as an image.
- **Habits**: Read 15 pages, Brush teeth, Sports and No TikTok to start with. Add your own, pick days, set a number goal.
- **Brain**: a morning warm-up with 10 quick sums or 3 "mate in 1" chess puzzles (439 checked puzzles).
- **Limits**: real Screen Time blocking. TikTok (or any app you pick) stays blocked until 20:00, then you get 10 minutes.
- Notifications at 7:30 (warm-up) and 21:00 (evening check).

It is a web app (plain JavaScript + Vite) inside a native iOS shell ([Capacitor](https://capacitorjs.com)), with a small Swift plugin for Screen Time.

## Run it on your iPhone

You need a Mac with Xcode 16 or newer, Node.js 18+, and an iPhone on iOS 16 or newer.

```bash
npm install
npm run ios          # builds the web app, copies it into ios/, opens Xcode
```

In Xcode:

1. Click **App** in the left sidebar, then the **App** target, then **Signing & Capabilities**.
2. Under **Team**, pick your Apple ID (a free one works for your own phone).
3. Change **Bundle Identifier** to something unique, like `com.yourname.routine`.
4. Plug in your iPhone, pick it at the top of the window, and press **Run** (▶).
5. On the iPhone, the first time: **Settings → General → VPN & Device Management** → trust your developer certificate. Also turn on **Developer Mode** if iPhone asks.

That gives you everything except Screen Time blocking. For that, do the next section.

> With a free Apple ID, apps you install yourself stop opening after 7 days. Press Run again in Xcode to renew them.

## Turn on Screen Time blocking

Screen Time needs two capabilities and one extra target. All in Xcode:

**1. Capabilities on the App target**

Signing & Capabilities → **+ Capability**, add:

- **Family Controls**
- **App Groups**, then add a group called `group.` + your bundle id, for example `group.com.yourname.routine`.

**2. The background monitor**

This part re-blocks the apps when your 10 minutes are up, even when Routine is closed.

1. **File → New → Target…** → search **Device Activity Monitor Extension** → Next.
2. Name it `RoutineMonitor` → Finish. If asked to activate the scheme, choose **Activate**.
3. Open the file Xcode made (`DeviceActivityMonitorExtension.swift` in the RoutineMonitor folder) and replace all of it with the contents of [`ios/RoutineMonitor/DeviceActivityMonitorExtension.swift`](ios/RoutineMonitor/DeviceActivityMonitorExtension.swift).
4. Select the **RoutineMonitor** target → Signing & Capabilities → add **Family Controls** and **App Groups** (tick the same group).

**3. Use your group name in the code**

If your group isn't `group.com.routine.habits`, change `appGroup` in both:

- `ios/App/App/RoutineShared.swift`
- the RoutineMonitor file from step 2

Run again. In the app, go to **Limits → Allow Screen Time access → Choose apps to limit**, pick TikTok, set the minutes and the unlock time, and switch on **Block with Screen Time**.

> Apple doesn't let free Apple IDs ("Personal Team") use every capability. If Xcode refuses Family Controls or App Groups, the rest of the app still works. Screen Time then needs the paid Apple Developer Program.

## Putting it on the App Store

This part needs the **Apple Developer Program ($99 per year)**.

1. Join at developer.apple.com/programs.
2. Screen Time apps need Apple's permission to ship: request the **Family Controls (Distribution)** entitlement at developer.apple.com/contact/request/family-controls-distribution. Apple usually answers within a few days to weeks.
3. In App Store Connect, create the app with your bundle id.
4. You need a **privacy policy URL**. Routine keeps all data on the phone and sends nothing anywhere, so it can be short.
5. In Xcode: **Product → Archive → Distribute App → App Store Connect**.
6. Add screenshots (6.7" and 6.1" iPhone), a description, and submit for review.

## Working on the code

```bash
npm run dev      # open http://localhost:5173 in a browser (no Screen Time / notifications there)
npm test         # streak, limit and puzzle checks
npm run sync     # after changing src/, copy it into the iOS app
```

| Folder | What's in it |
|---|---|
| `src/state.js` | Data, streaks, calendar levels, app time limits (no UI) |
| `src/native.js` | Storage, haptics, notifications, Screen Time, sharing, with browser fallbacks |
| `src/views/` | One file per screen, plus the settings and share sheets |
| `src/games/` | Quick maths and Mate in 1 |
| `src/puzzles.js` | The 439 mate-in-one positions |
| `ios/App/App/ScreenTimePlugin.swift` | Native Screen Time: access, app picker, schedule |
| `ios/RoutineMonitor/` | Code for the background monitor target |

Data is stored on the phone only (Capacitor Preferences). Settings → **Back up data** exports a JSON file; **Restore** reads it back.
