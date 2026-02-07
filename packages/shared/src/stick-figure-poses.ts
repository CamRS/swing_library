import type { Handedness, PPosition } from "./models";
import {
  STICK_FIGURE_COORDINATE_SPACE,
  STICK_FIGURE_JOINT_ORDER,
  type StickFigureJointMap,
  type StickFigurePose,
  type StickFigurePoseDataset
} from "./stick-figure";

export const STICK_FIGURE_P_POSITION_ORDER: readonly PPosition[] = [
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "P7",
  "P8",
  "P9",
  "P10"
] as const;

const RIGHT_HANDED_POSE_JOINTS: Record<PPosition, StickFigureJointMap> = {
  P1: {
    head: { x: 0, y: 1.72, z: 0.12 },
    neck: { x: 0, y: 1.56, z: 0.09 },
    spineChest: { x: 0.01, y: 1.36, z: 0.06 },
    pelvis: { x: 0, y: 1.02, z: 0 },
    leftShoulder: { x: 0.18, y: 1.5, z: 0.08 },
    rightShoulder: { x: -0.18, y: 1.5, z: 0.08 },
    leftElbow: { x: 0.14, y: 1.25, z: 0.18 },
    rightElbow: { x: -0.08, y: 1.22, z: 0.2 },
    leftWrist: { x: 0.12, y: 1.03, z: 0.28 },
    rightWrist: { x: -0.04, y: 1, z: 0.3 },
    leftHip: { x: 0.12, y: 1, z: 0.02 },
    rightHip: { x: -0.12, y: 1, z: -0.02 },
    leftKnee: { x: 0.11, y: 0.56, z: 0.14 },
    rightKnee: { x: -0.11, y: 0.55, z: 0.1 },
    leftAnkle: { x: 0.1, y: 0.08, z: 0.22 },
    rightAnkle: { x: -0.1, y: 0.08, z: 0.18 }
  },
  P2: {
    head: { x: 0, y: 1.72, z: 0.11 },
    neck: { x: 0, y: 1.56, z: 0.08 },
    spineChest: { x: -0.01, y: 1.36, z: 0.04 },
    pelvis: { x: -0.01, y: 1.02, z: -0.01 },
    leftShoulder: { x: 0.17, y: 1.49, z: 0.07 },
    rightShoulder: { x: -0.19, y: 1.5, z: 0.05 },
    leftElbow: { x: 0.05, y: 1.28, z: 0.07 },
    rightElbow: { x: -0.2, y: 1.23, z: 0.12 },
    leftWrist: { x: -0.02, y: 1.11, z: -0.03 },
    rightWrist: { x: -0.22, y: 1.06, z: 0.02 },
    leftHip: { x: 0.11, y: 1, z: 0.01 },
    rightHip: { x: -0.13, y: 1, z: -0.03 },
    leftKnee: { x: 0.1, y: 0.56, z: 0.12 },
    rightKnee: { x: -0.12, y: 0.55, z: 0.08 },
    leftAnkle: { x: 0.1, y: 0.08, z: 0.2 },
    rightAnkle: { x: -0.1, y: 0.08, z: 0.16 }
  },
  P3: {
    head: { x: 0, y: 1.73, z: 0.1 },
    neck: { x: -0.01, y: 1.57, z: 0.07 },
    spineChest: { x: -0.04, y: 1.38, z: 0 },
    pelvis: { x: -0.02, y: 1.02, z: -0.02 },
    leftShoulder: { x: 0.13, y: 1.5, z: 0.03 },
    rightShoulder: { x: -0.21, y: 1.51, z: -0.01 },
    leftElbow: { x: -0.1, y: 1.41, z: -0.18 },
    rightElbow: { x: -0.3, y: 1.3, z: -0.08 },
    leftWrist: { x: -0.18, y: 1.45, z: -0.34 },
    rightWrist: { x: -0.34, y: 1.33, z: -0.24 },
    leftHip: { x: 0.1, y: 1, z: 0 },
    rightHip: { x: -0.14, y: 1, z: -0.04 },
    leftKnee: { x: 0.09, y: 0.57, z: 0.1 },
    rightKnee: { x: -0.13, y: 0.55, z: 0.05 },
    leftAnkle: { x: 0.1, y: 0.08, z: 0.18 },
    rightAnkle: { x: -0.11, y: 0.08, z: 0.13 }
  },
  P4: {
    head: { x: 0.01, y: 1.74, z: 0.09 },
    neck: { x: -0.02, y: 1.58, z: 0.05 },
    spineChest: { x: -0.07, y: 1.4, z: -0.04 },
    pelvis: { x: -0.03, y: 1.03, z: -0.03 },
    leftShoulder: { x: 0.1, y: 1.51, z: -0.01 },
    rightShoulder: { x: -0.23, y: 1.52, z: -0.06 },
    leftElbow: { x: -0.18, y: 1.52, z: -0.34 },
    rightElbow: { x: -0.28, y: 1.56, z: -0.28 },
    leftWrist: { x: -0.12, y: 1.66, z: -0.52 },
    rightWrist: { x: -0.23, y: 1.7, z: -0.48 },
    leftHip: { x: 0.09, y: 1.01, z: -0.01 },
    rightHip: { x: -0.15, y: 1.01, z: -0.06 },
    leftKnee: { x: 0.07, y: 0.58, z: 0.07 },
    rightKnee: { x: -0.14, y: 0.55, z: 0 },
    leftAnkle: { x: 0.09, y: 0.08, z: 0.15 },
    rightAnkle: { x: -0.11, y: 0.08, z: 0.08 }
  },
  P5: {
    head: { x: 0, y: 1.73, z: 0.1 },
    neck: { x: -0.01, y: 1.57, z: 0.06 },
    spineChest: { x: -0.03, y: 1.37, z: 0.03 },
    pelvis: { x: -0.01, y: 1.02, z: -0.01 },
    leftShoulder: { x: 0.14, y: 1.49, z: 0.04 },
    rightShoulder: { x: -0.2, y: 1.5, z: 0.02 },
    leftElbow: { x: 0, y: 1.42, z: -0.14 },
    rightElbow: { x: -0.24, y: 1.35, z: -0.1 },
    leftWrist: { x: -0.04, y: 1.32, z: -0.24 },
    rightWrist: { x: -0.2, y: 1.25, z: -0.16 },
    leftHip: { x: 0.11, y: 1, z: 0.01 },
    rightHip: { x: -0.13, y: 1, z: -0.03 },
    leftKnee: { x: 0.1, y: 0.57, z: 0.12 },
    rightKnee: { x: -0.12, y: 0.56, z: 0.05 },
    leftAnkle: { x: 0.1, y: 0.08, z: 0.2 },
    rightAnkle: { x: -0.1, y: 0.08, z: 0.12 }
  },
  P6: {
    head: { x: 0, y: 1.72, z: 0.12 },
    neck: { x: 0.01, y: 1.56, z: 0.08 },
    spineChest: { x: 0.02, y: 1.35, z: 0.1 },
    pelvis: { x: 0.01, y: 1.01, z: 0.01 },
    leftShoulder: { x: 0.17, y: 1.47, z: 0.11 },
    rightShoulder: { x: -0.17, y: 1.48, z: 0.09 },
    leftElbow: { x: 0.08, y: 1.27, z: 0.05 },
    rightElbow: { x: -0.14, y: 1.23, z: 0.08 },
    leftWrist: { x: 0.02, y: 1.08, z: -0.02 },
    rightWrist: { x: -0.12, y: 1.03, z: 0 },
    leftHip: { x: 0.12, y: 1, z: 0.03 },
    rightHip: { x: -0.12, y: 1, z: -0.01 },
    leftKnee: { x: 0.11, y: 0.57, z: 0.15 },
    rightKnee: { x: -0.11, y: 0.56, z: 0.08 },
    leftAnkle: { x: 0.1, y: 0.08, z: 0.23 },
    rightAnkle: { x: -0.1, y: 0.08, z: 0.15 }
  },
  P7: {
    head: { x: 0, y: 1.72, z: 0.14 },
    neck: { x: 0.02, y: 1.56, z: 0.11 },
    spineChest: { x: 0.04, y: 1.35, z: 0.14 },
    pelvis: { x: 0.03, y: 1.01, z: 0.04 },
    leftShoulder: { x: 0.19, y: 1.47, z: 0.15 },
    rightShoulder: { x: -0.15, y: 1.47, z: 0.13 },
    leftElbow: { x: 0.12, y: 1.2, z: 0.2 },
    rightElbow: { x: -0.08, y: 1.15, z: 0.22 },
    leftWrist: { x: 0.1, y: 1.02, z: 0.34 },
    rightWrist: { x: -0.02, y: 0.99, z: 0.32 },
    leftHip: { x: 0.13, y: 1, z: 0.06 },
    rightHip: { x: -0.11, y: 1, z: 0.02 },
    leftKnee: { x: 0.12, y: 0.58, z: 0.16 },
    rightKnee: { x: -0.1, y: 0.56, z: 0.11 },
    leftAnkle: { x: 0.11, y: 0.08, z: 0.24 },
    rightAnkle: { x: -0.09, y: 0.08, z: 0.18 }
  },
  P8: {
    head: { x: 0, y: 1.73, z: 0.15 },
    neck: { x: 0.02, y: 1.57, z: 0.13 },
    spineChest: { x: 0.05, y: 1.37, z: 0.19 },
    pelvis: { x: 0.04, y: 1.01, z: 0.07 },
    leftShoulder: { x: 0.22, y: 1.5, z: 0.23 },
    rightShoulder: { x: -0.12, y: 1.45, z: 0.17 },
    leftElbow: { x: 0.24, y: 1.36, z: 0.36 },
    rightElbow: { x: -0.02, y: 1.2, z: 0.3 },
    leftWrist: { x: 0.26, y: 1.46, z: 0.52 },
    rightWrist: { x: 0.04, y: 1.24, z: 0.42 },
    leftHip: { x: 0.14, y: 1, z: 0.09 },
    rightHip: { x: -0.1, y: 1, z: 0.04 },
    leftKnee: { x: 0.13, y: 0.58, z: 0.18 },
    rightKnee: { x: -0.09, y: 0.56, z: 0.12 },
    leftAnkle: { x: 0.12, y: 0.08, z: 0.25 },
    rightAnkle: { x: -0.08, y: 0.08, z: 0.18 }
  },
  P9: {
    head: { x: 0.01, y: 1.74, z: 0.16 },
    neck: { x: 0.03, y: 1.58, z: 0.15 },
    spineChest: { x: 0.07, y: 1.39, z: 0.23 },
    pelvis: { x: 0.05, y: 1.01, z: 0.1 },
    leftShoulder: { x: 0.24, y: 1.53, z: 0.28 },
    rightShoulder: { x: -0.1, y: 1.43, z: 0.2 },
    leftElbow: { x: 0.3, y: 1.56, z: 0.42 },
    rightElbow: { x: 0.06, y: 1.23, z: 0.36 },
    leftWrist: { x: 0.32, y: 1.68, z: 0.54 },
    rightWrist: { x: 0.16, y: 1.35, z: 0.46 },
    leftHip: { x: 0.15, y: 1, z: 0.11 },
    rightHip: { x: -0.09, y: 1, z: 0.06 },
    leftKnee: { x: 0.14, y: 0.58, z: 0.2 },
    rightKnee: { x: -0.08, y: 0.56, z: 0.13 },
    leftAnkle: { x: 0.12, y: 0.08, z: 0.26 },
    rightAnkle: { x: -0.07, y: 0.08, z: 0.18 }
  },
  P10: {
    head: { x: 0.02, y: 1.74, z: 0.17 },
    neck: { x: 0.04, y: 1.58, z: 0.16 },
    spineChest: { x: 0.08, y: 1.4, z: 0.24 },
    pelvis: { x: 0.06, y: 1.02, z: 0.11 },
    leftShoulder: { x: 0.25, y: 1.54, z: 0.3 },
    rightShoulder: { x: -0.09, y: 1.42, z: 0.21 },
    leftElbow: { x: 0.34, y: 1.6, z: 0.36 },
    rightElbow: { x: 0.1, y: 1.26, z: 0.34 },
    leftWrist: { x: 0.36, y: 1.58, z: 0.2 },
    rightWrist: { x: 0.22, y: 1.34, z: 0.32 },
    leftHip: { x: 0.16, y: 1, z: 0.12 },
    rightHip: { x: -0.08, y: 1, z: 0.07 },
    leftKnee: { x: 0.15, y: 0.58, z: 0.21 },
    rightKnee: { x: -0.08, y: 0.56, z: 0.14 },
    leftAnkle: { x: 0.13, y: 0.08, z: 0.27 },
    rightAnkle: { x: -0.07, y: 0.08, z: 0.19 }
  }
};

export function mirrorJointMapAcrossLeadAxis(
  joints: StickFigureJointMap
): StickFigureJointMap {
  const mirrored = {} as StickFigureJointMap;

  STICK_FIGURE_JOINT_ORDER.forEach((jointId) => {
    const source = joints[jointId];
    mirrored[jointId] = {
      x: -source.x,
      y: source.y,
      z: source.z
    };
  });

  return mirrored;
}

function createPose(
  position: PPosition,
  handedness: Handedness,
  joints: StickFigureJointMap
): StickFigurePose {
  return {
    position,
    handedness,
    coordinateSpace: STICK_FIGURE_COORDINATE_SPACE.id,
    joints
  };
}

function createPosePair(
  position: PPosition
): Record<Handedness, StickFigurePose> {
  const rightHandedJoints = RIGHT_HANDED_POSE_JOINTS[position];
  const leftHandedJoints = mirrorJointMapAcrossLeadAxis(rightHandedJoints);

  return {
    right: createPose(position, "right", rightHandedJoints),
    left: createPose(position, "left", leftHandedJoints)
  };
}

const poseEntries = STICK_FIGURE_P_POSITION_ORDER.map((position) => [
  position,
  createPosePair(position)
] as const);

export const INITIAL_STICK_FIGURE_POSE_DATASET: StickFigurePoseDataset = {
  id: "initial-p1-p10-static",
  version: "2026.02.06.1",
  coordinateSpace: STICK_FIGURE_COORDINATE_SPACE,
  poses: Object.fromEntries(poseEntries) as StickFigurePoseDataset["poses"]
};
