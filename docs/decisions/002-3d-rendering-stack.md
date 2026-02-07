# Decision: Mobile 3D Rendering Stack for P1-P10 Stick Figure

- Status: accepted
- Date: 2026-02-06
- Owners: core team

## Context
Phase 3 requires a 3D stick-figure renderer in the Swing Analyze screen with a Blender-like grid background. We need:
- A stack that works in our Expo-managed React Native app.
- Fast iteration for UI/layout work.
- A clear rule for when Expo Go is sufficient and when to switch to a development build.
- Reliable runtime expectations for simulator vs physical device testing.

## Decision
Use this stack for Phase 3:
- `@react-three/fiber/native` as the React renderer for 3D.
- `three` as the 3D engine.
- `expo-gl` (GLView) as the native WebGL surface.

Implementation direction:
- Start with procedural geometry (lines + spheres/capsules) for stick figure and grid.
- Do not depend on GLTF model loading in the first milestone.
- Keep the 3D component isolated (single reusable viewport component), then embed it in Swing Analyze split layout.

Expo runtime policy:
- Default to Expo Go for initial integration and quick UI iteration.
- Switch to a development build when either condition is true:
  - A required package introduces custom native code not available in Expo Go.
  - Rendering stability/performance in Expo Go is insufficient for reliable testing.

## Consequences
What gets easier:
- Declarative 3D scene composition in React components.
- Fast prototype loop for layout, camera, and pose switching.
- Minimal native setup for first implementation because `expo-gl` is already in Expo Go.

What gets harder:
- iOS simulator OpenGL reliability is limited for 3D workloads; physical-device validation is mandatory.
- If we later add native-only 3D/performance tooling, we must adopt dev builds and rebuild clients.
- Debugging GL issues requires care (for example, avoid depending on remote debug assumptions for GL execution).

## Alternatives Considered
- `expo-three` + imperative scene management:
  - Rejected for Phase 3 baseline because we want a React-first declarative component model.
- `@shopify/react-native-skia` 3D-like rendering:
  - Rejected because this task needs a true 3D camera space for stick-figure poses.
- Full native engine now (SceneKit/Metal/custom module):
  - Rejected due to implementation cost and loss of iteration speed at this phase.

## Expo Go vs Dev Build Notes
- Confirmed from Expo docs:
  - Expo Go supports native libraries included in the Expo SDK, and JS-only libraries without custom native code.
  - Development builds support all project native code and are the production-grade path.
- Confirmed from R3F docs:
  - React Native support uses `@react-three/fiber/native` and `expo-gl`/`expo-asset`.
  - iOS simulators can be unreliable for OpenGL ES; physical iOS testing is required.

## References
- Expo: Using libraries (`Expo Go` limits vs development builds):  
  `https://docs.expo.dev/workflow/using-libraries/`
- Expo: Add custom native code (Expo Go library constraint):  
  `https://docs.expo.dev/workflow/customizing/`
- Expo GLView (`expo-gl`) and "Included in Expo Go":  
  `https://docs.expo.dev/versions/latest/sdk/gl-view/`
- Expo: Switch from Expo Go to development build:  
  `https://docs.expo.dev/develop/development-builds/expo-go-to-dev-build/`
- React Three Fiber installation (React Native + expo-gl under the hood):  
  `https://r3f.docs.pmnd.rs/getting-started/installation`
