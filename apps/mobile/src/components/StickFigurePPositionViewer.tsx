import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  Handedness,
  PPosition,
  StickFigureJointMap,
  StickFigureJointId
} from "@swing/shared";
import {
  INITIAL_STICK_FIGURE_POSE_DATASET,
  STICK_FIGURE_BONES,
  STICK_FIGURE_JOINT_ORDER,
  STICK_FIGURE_P_POSITION_ORDER
} from "@swing/shared";
import { SkiaStickFigureViewport } from "./SkiaStickFigureViewport";
import { ThreeDViewport } from "./ThreeDViewport";

type RenderBackend = "gl" | "skia";

type Props = {
  initialPosition?: PPosition;
  handedness?: Handedness;
  renderBackend?: RenderBackend;
  onPositionChange?: (position: PPosition) => void;
};

const JOINT_RADIUS = 0.03;

function BoneSegment({
  fromJoint,
  toJoint,
  joints
}: {
  fromJoint: StickFigureJointId;
  toJoint: StickFigureJointId;
  joints: StickFigureJointMap;
}) {
  const from = joints[fromJoint];
  const to = joints[toJoint];
  const positions = useMemo(
    () =>
      new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]),
    [from.x, from.y, from.z, to.x, to.y, to.z]
  );

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#D5DFEA" />
    </line>
  );
}

export function StickFigurePPositionViewer({
  initialPosition = "P1",
  handedness = "right",
  renderBackend = "gl",
  onPositionChange
}: Props) {
  const [selectedPosition, setSelectedPosition] = useState<PPosition>(
    initialPosition
  );
  const isIos = Platform.OS === "ios";
  const isSkia = renderBackend === "skia";
  const jointRadius = isIos ? 0.028 : JOINT_RADIUS;
  const sphereSegments = isIos ? 8 : 12;

  useEffect(() => {
    setSelectedPosition(initialPosition);
  }, [initialPosition]);

  const pose =
    INITIAL_STICK_FIGURE_POSE_DATASET.poses[selectedPosition][handedness];

  const handleSelectPosition = (position: PPosition) => {
    setSelectedPosition(position);
    onPositionChange?.(position);
  };

  return (
    <View style={styles.container}>
      {isSkia ? (
        <SkiaStickFigureViewport
          style={styles.viewport}
          joints={pose.joints}
          cameraPosition={[2.7, 1.9, 2.45]}
          cameraTarget={[0, 1.05, 0.04]}
          gridSize={6.4}
          gridDivisions={24}
        />
      ) : (
        <ThreeDViewport
          style={styles.viewport}
          cameraPosition={[2.7, 1.9, 2.45]}
          cameraTarget={[0, 1.05, 0.04]}
          gridSize={6.4}
          gridDivisions={isIos ? 24 : 36}
          ambientIntensity={isIos ? 0.35 : 0.45}
          directionalIntensity={isIos ? 0.82 : 1.15}
        >
          <group>
            {STICK_FIGURE_BONES.map((bone) => (
              <BoneSegment
                key={bone.id}
                fromJoint={bone.from}
                toJoint={bone.to}
                joints={pose.joints}
              />
            ))}
            {STICK_FIGURE_JOINT_ORDER.map((jointId) => {
              const joint = pose.joints[jointId];
              return (
                <mesh
                  key={`joint-${jointId}`}
                  position={[joint.x, joint.y, joint.z]}
                  castShadow={false}
                  receiveShadow={false}
                >
                  <sphereGeometry args={[jointRadius, sphereSegments, sphereSegments]} />
                  <meshLambertMaterial color="#F2F6FA" />
                </mesh>
              );
            })}
          </group>
        </ThreeDViewport>
      )}
      <Text style={styles.metaText}>
        Pose: {selectedPosition} ({handedness}-handed)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.positionRow}
      >
        {STICK_FIGURE_P_POSITION_ORDER.map((position) => {
          const isSelected = position === selectedPosition;
          return (
            <Pressable
              key={position}
              onPress={() => handleSelectPosition(position)}
              style={({ pressed }) => [
                styles.positionChip,
                isSelected ? styles.positionChipActive : null,
                pressed ? styles.positionChipPressed : null
              ]}
            >
              <Text
                style={[
                  styles.positionChipLabel,
                  isSelected ? styles.positionChipLabelActive : null
                ]}
              >
                {position}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10
  },
  viewport: {
    minHeight: 240
  },
  metaText: {
    color: "#2D3B36",
    fontWeight: "600"
  },
  positionRow: {
    gap: 8
  },
  positionChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A8B8B2",
    backgroundColor: "#F2F6F4",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  positionChipActive: {
    backgroundColor: "#1E4E3D",
    borderColor: "#1E4E3D"
  },
  positionChipPressed: {
    opacity: 0.82
  },
  positionChipLabel: {
    color: "#1A2A24",
    fontWeight: "700"
  },
  positionChipLabelActive: {
    color: "#FFFFFF"
  }
});
