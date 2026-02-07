# Mobile App (React Native)

Expo-based React Native client for swing capture, browsing, analysis, and progress tracking.

Planned responsibilities:
- Upload swing videos and manage key-frame tagging.
- Render analysis overlays and 3D stick figure guidance.
- Display journey summaries, goals, and progress.

Dev notes:
- Set `EXPO_PUBLIC_API_URL` to reach the API from a device or simulator.
- Use the Auth screen to register/login and obtain a JWT.
- Analyze runtime toggles for crash isolation:
  - iOS simulator defaults: video off, 3D on via Skia backend.
  - `EXPO_PUBLIC_ANALYZE_SHOW_VIDEO=1|0` controls Analyze video mount.
  - `EXPO_PUBLIC_ANALYZE_SHOW_3D=1|0` controls Analyze 3D section mount.
  - `EXPO_PUBLIC_ANALYZE_3D_BACKEND=skia|gl` overrides Analyze 3D renderer.
  - `EXPO_PUBLIC_ENABLE_SIMULATOR_ANALYZE_MEDIA=1` bypasses simulator safe mode.
  - `EXPO_PUBLIC_ENABLE_SIMULATOR_3D=1` force-enables GL canvas on simulator (unstable; may crash).
