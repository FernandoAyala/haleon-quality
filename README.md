<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `OPENAI_API_KEY` in [.env.local](.env.local) to your OpenAI API key
3. Configure Firebase (optional but recommended for cloud storage):
   - See [FIREBASE_README.md](FIREBASE_README.md) for detailed setup instructions
   - Set Firebase credentials in [.env.local](.env.local)
4. Run the app:
   `npm run dev`

## Features

- 🎤 Real-time voice interaction with OpenAI Realtime API
- 💬 Text input for noisy environments
- 🔇 Mute control for audio responses
- 📝 Session history with Firebase cloud storage
- 🎯 Quality management context for Haleon manufacturing
- 🌐 Multi-device sync (with Firebase configured)
