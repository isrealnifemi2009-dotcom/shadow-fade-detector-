# SHADOW FADE DETECTOR

Private WhatsApp and Telegram notice analyser with a black + blood-red interface.

## Important limitation
This is **not** a live platform ban lookup. WhatsApp and Telegram do not provide a public endpoint that lets an arbitrary website reliably check the complete ban status of any phone number or username. The app asks for a phone number and platform, but the number is only used as a reference and is masked in the result. It is not sent to WhatsApp or Telegram and is not used for a live lookup. The app analyses exact wording from an official notice that the user supplies. It reports temporary/permanent only when the text explicitly says so. Otherwise it returns “UNKNOWN SHADOW”. “SHADOWS UNTOUCHED” is shown only when the user says the account is working normally and no notice was entered; it is not independent verification.

Do not paste passwords, one-time codes, recovery codes, or private conversations.

## Run locally in Termux / Node.js

1. Install Node.js and unzip this project.
2. In the project folder, run:

   ```sh
   npm install
   ```

3. Set a private password and a long random session secret:

   ```sh
   export ACCESS_PASSWORD='replace-this-with-your-own-private-password'
   export SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
   ```

4. Start:

   ```sh
   npm start
   ```

5. Open `http://localhost:3000` in your browser.

Keep the terminal/server running while using the local site. Do not share your access password.

## Hosting online
Use a Node.js host that supports environment variables and HTTPS. Set:
- `ACCESS_PASSWORD` to a strong, unique password.
- `SESSION_SECRET` to a long random secret.
- `NODE_ENV` to `production`.

Deploy the project, install dependencies, and run `npm start`. Use HTTPS. Do not expose the site over plain HTTP on a public network. The included in-memory session store is suitable only for a small private prototype; for a persistent public deployment, configure a production session store and add stronger rate limiting.

## Files
- `server.js` — private login, session, and notice analysis API.
- `public/index.html` — responsive SHADOWS interface.
- `package.json` — Node dependencies.
