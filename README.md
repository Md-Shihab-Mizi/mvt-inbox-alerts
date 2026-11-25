# MVT Inbox Alerts

A Tampermonkey userscript that alerts you when a new Listings and Contracts request reaches the MVT Work Intake inbox.

Made by Md. Shihab Mizi. Current version: 3.0.1

## What it does

- Desktop notification (stays on screen until dismissed)
- Sound alert
- Red on-page banner listing the newest requests
- Unread count in the browser tab title, for example `(2) Inbox`
- Checks for new requests every 30 seconds
- Keeps you signed in while the tab is in the background
- Works for any team member: it uses your own sign-in, and your settings are saved only in your browser

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension (Chrome or Edge).
2. Click this link: [Install MVT Inbox Alerts](https://raw.githubusercontent.com/Md-Shihab-Mizi/mvt-inbox-alerts/main/mvt-inbox-alerts.user.js)
3. Tampermonkey opens an install page. Click **Install**.
4. Open the MVT Work Intake site and log in with your own account. The alerts panel appears in the bottom right corner.
5. In the panel, click **Turn on desktop alerts**, then **Test alert**.

Already installed? Tampermonkey updates the script automatically. To update right away, open the Tampermonkey dashboard and click **Check for userscript updates**.

## Using the panel

| Button | What it does |
| --- | --- |
| Test alert | Sends a sample alert so you can check sound and notifications |
| Mark seen | Clears the unread count and banner |
| Sound: on / off | Turns the sound alert on or off |
| Turn on desktop alerts | Asks the browser for notification permission |

Click the panel header to minimize or expand it.

## Notes

- Keep one MVT Work Intake tab open (it can be in the background) for alerts to work.
- If you have several MVT tabs open, only one of them sends alerts, so you will not get the same alert twice. The other tabs show "Another MVT tab is watching". If that tab is closed, another one takes over.
- On first run, every existing request is marked as seen. Only new requests after that trigger alerts.
- If a different person signs in on the same browser, the script starts fresh for them.
- If desktop alerts are blocked, click the lock icon in the address bar, allow Notifications, then reload.
- If the status line turns red, read the message. "Signed out" means log in again. "Your account cannot open the inbox" means ask an MVT admin for inbox access. "Site server error" means the MVT site itself is having trouble.

## Changes in 3.0

- Works for every team member, not just one account
- Only one open tab sends alerts
- Starts fresh when a different account signs in
- Setup tip in the panel until desktop alerts are on
- Clearer error messages in the status line
