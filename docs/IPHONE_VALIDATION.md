# Real iPhone validation checklist

Status: **not performed**. Playwright WebKit with an iPhone viewport is not a real iPhone or Home Screen installation test. Use a trusted HTTPS staging origin and two test invitations; do not expose local database/Mailpit ports or production secrets to a phone.

Record device, iOS version, browser version, origin/build ID, network, date, steps, result and failure evidence without tokens/private data.

1. In Safari, open the HTTPS site. Verify no certificate warning, readable layout at text zoom, visible focus with a hardware keyboard, VoiceOver labels/errors, and 44px controls. Check portrait/landscape and reduced motion.
2. Issue one invite using the operator tool. Open its fragment URL, enter the matching email, receive a real staging SMTP link, confirm once. Verify wrong email, expired/revoked invitation and reused link do not create accounts. Create the second account and confirm a third cannot enroll.
3. Navigate Home/Train/Ranks/Progress/Profile. Future features must say unavailable rather than show fake scores/logs. Verify only your own account identity is visible, including after logout and switching accounts.
4. Share -> Add to Home Screen. Check name, neutral icon, launch in standalone mode and safe-area navigation. Relaunch from icon; verify session persistence and expiry/revocation behavior. Installation UI varies by supported iOS version; record actual behavior.
5. Load online, close/reopen after installation, enable airplane mode and open a private page. Expect the public offline explanation only, with no email/token/private content. Reconnect and retry; expect real authentication flow. Offline workout logging is not yet implemented.
6. Sign out from standalone mode. Verify access to `/profile` and `/api/me` is denied; back navigation/relaunch must not expose a usable authenticated workspace. Revoke all sessions from operator terminal and repeat with another device's still-open page.
7. Verify no permission prompt for sound, push, camera, microphone or location appears in Phase 1. Denied capabilities must not affect basic navigation.
8. Exercise an unavailable database/SMTP staging service; UI shows actionable failure and no false success. Restore service and retry. Check server logs contain no invitation/login token, email body, cookies or health measurements.

Record failures as open release blockers. Do not claim installation, background execution or exact alerts from desktop browser emulation.
