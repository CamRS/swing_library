import { ReactNode, useEffect } from "react";
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Canvas, useThree } from "@react-three/fiber/native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";

type Vec3Tuple = [number, number, number];

type Props = {
  style?: StyleProp<ViewStyle>;
  gridSize?: number;
  gridDivisions?: number;
  backgroundColor?: string;
  cameraPosition?: Vec3Tuple;
  cameraTarget?: Vec3Tuple;
  ambientIntensity?: number;
  directionalIntensity?: number;
  children?: ReactNode;
};

const DEFAULT_CAMERA_POSITION: Vec3Tuple = [2.8, 1.9, 2.6];
const DEFAULT_CAMERA_TARGET: Vec3Tuple = [0, 1.05, 0];
const SIMULATOR_3D_OVERRIDE =
  process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_3D === "1";

function shouldDisableCanvas() {
  const iosPlatform = Constants.platform?.ios as { simulator?: boolean } | undefined;
  const isIosSimulator =
    Platform.OS === "ios" &&
    (iosPlatform?.simulator === true || !Device.isDevice);
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  return (isIosSimulator || isExpoGo) && !SIMULATOR_3D_OVERRIDE;
}

function CameraTarget({ target }: { target: Vec3Tuple }) {
  const { camera } = useThree();
  const [x, y, z] = target;

  useEffect(() => {
    camera.lookAt(x, y, z);
  }, [camera, x, y, z]);

  return null;
}

function BlenderStyleGrid({
  size,
  divisions
}: {
  size: number;
  divisions: number;
}) {
  const axisThickness = Math.max(0.006, size * 0.0015);

  return (
    <group>
      <gridHelper args={[size, divisions, "#5A616B", "#3C4149"]} />
      <mesh position={[0, 0.001, 0]}>
        <boxGeometry args={[size, axisThickness, axisThickness]} />
        <meshBasicMaterial color="#A34A4A" />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <boxGeometry args={[axisThickness, axisThickness, size]} />
        <meshBasicMaterial color="#5D8A4B" />
      </mesh>
    </group>
  );
}

export function ThreeDViewport({
  style,
  gridSize = 6,
  gridDivisions = 30,
  backgroundColor = "#2B2F35",
  cameraPosition = DEFAULT_CAMERA_POSITION,
  cameraTarget = DEFAULT_CAMERA_TARGET,
  ambientIntensity = 0.45,
  directionalIntensity = 1.15,
  children
}: Props) {
  const isIos = Platform.OS === "ios";
  const effectiveGridDivisions = isIos
    ? Math.min(gridDivisions, 24)
    : gridDivisions;
  const effectiveAmbientIntensity = isIos
    ? Math.min(ambientIntensity, 0.38)
    : ambientIntensity;
  const effectiveDirectionalIntensity = isIos
    ? Math.min(directionalIntensity, 0.9)
    : directionalIntensity;

  if (shouldDisableCanvas()) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>3D preview unavailable on this runtime.</Text>
        <Text style={styles.fallbackBody}>
          iOS Simulator can crash with GL rendering here. Use a physical iPhone
          or set `EXPO_PUBLIC_ENABLE_SIMULATOR_3D=1` to force-enable.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Canvas
        style={styles.canvas}
        frameloop="demand"
        camera={{
          fov: 38,
          near: 0.1,
          far: 100,
          position: cameraPosition
        }}
      >
        <color attach="background" args={[backgroundColor]} />
        <CameraTarget target={cameraTarget} />
        <ambientLight intensity={effectiveAmbientIntensity} />
        <directionalLight
          position={[4.2, 6.8, 2.4]}
          intensity={effectiveDirectionalIntensity}
          color="#FFFFFF"
        />
        {!isIos ? (
          <directionalLight
            position={[-2.4, 1.9, -3]}
            intensity={effectiveDirectionalIntensity * 0.35}
            color="#C7D2E0"
          />
        ) : null}
        <BlenderStyleGrid size={gridSize} divisions={effectiveGridDivisions} />
        {children}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 220,
    borderRadius: 14,
    overflow: "hidden"
  },
  fallbackContainer: {
    backgroundColor: "#2B2F35",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
    justifyContent: "center"
  },
  fallbackTitle: {
    color: "#E7EDF5",
    fontWeight: "700"
  },
  fallbackBody: {
    color: "#C7D2E0",
    lineHeight: 18
  },
  canvas: {
    flex: 1
  }
});
