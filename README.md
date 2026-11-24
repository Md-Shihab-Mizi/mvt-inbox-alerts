# MVT Inbox Alerts

A Tampermonkey userscript that alerts you when a new **Listings and Contracts** request reaches the MVT Work Intake inbox.

Made by Md. Shihab Mizi.

## What it does

- Desktop notification (stays on screen until dismissed)
- Sound alert
- Red on-page banner listing the newest requests
- Unread count in the browser tab title, for example `(2) Inbox`
- Checks for new requests every 30 seconds
- Keeps you signed in while the tab is in the background

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Click this link: [Install MVT Inbox Alerts](https://github.com/Md-Shihab-Mizi/mvt-inbox-alerts/raw/main/mvt-inbox-alerts.user.js)
3. Tampermonkey opens an install page. Click **Install**.
4. Open the MVT Work Intake inbox and log in. The alerts panel appears in the bottom right corner.

## Using the panel

| Button | What it does |
| --- | --- |
| Test alert | Sends a sample alert so you can check sound and notifications |
| Mark seen | Clears the unread count and banner |
| Sound: on / off | Turns the sound alert on or off |
| Turn on desktop alerts | Asks the browser for notification permission |

Click the panel header to minimize or expand it.

## Notes

- Keep the inbox tab open (it can be in the background) for alerts to work.
- On first run, every existing request is marked as seen. Only new requests after that trigger alerts.
- If the status line turns red, reload the page or log in again.
