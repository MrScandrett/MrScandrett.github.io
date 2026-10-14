# Fake Book Google Drive setup

The dedicated button uses Google Identity Services and Google Picker, downloads
one selected score with Drive API, then passes it to the existing local importer.
No server or client secret is needed. Access tokens stay in memory; imported
scores remain in the browser's existing Fake Book storage.

## Activate

1. In one Google Cloud project, enable **Google Picker API** and **Google Drive API**.
2. Configure Google Auth Platform branding, audience and consent for ClassroomOS.
   Request only `https://www.googleapis.com/auth/drive.file`. In testing mode,
   add intended test accounts; choose the appropriate audience/publication status
   before rolling out to students. School administrators may restrict app access.
3. Create an OAuth client of type **Web application**. Add the site's exact origin
   (for example `https://mrscandrett.github.io`) to authorized JavaScript origins.
   Add `http://localhost:8080` separately if testing locally. Origins have no path.
4. Create an API key in the same project. Restrict it to Google Picker API and
   Google Drive API. For website restrictions include the class site's origin
   with `/*`, plus `https://docs.google.com/*` as required by Google's picker guide.
   Add the localhost origin only if needed for local tests.
5. Fill `clientId`, `apiKey`, and `appId` in
   `assets/js/lessons/fake-book-drive-config.js`. `appId` is the numeric Cloud
   project number. These are public browser values. **Never add a client secret.**

The first tap loads Google's libraries; the next tap opens sign-in directly from
the user gesture so mobile popup restrictions do not break the flow. The picker
uses a list view without a MIME filter, because score files may have generic MIME
types. Unsupported filenames receive an explanation before download.

## Verify before classroom use

On real iPhone Safari and desktop, sign in with a student/test account, select a
MusicXML score (including one in Shared with me), and verify score display and
playback. Test cancellation, denied consent, blocked popup, unsupported PDF,
expired session and download restrictions. Check that ordinary Choose file still
works. Desktop mobile emulation does not verify iPhone OAuth or Google's picker.

Official guide: https://developers.google.com/workspace/drive/picker/guides/web-picker
