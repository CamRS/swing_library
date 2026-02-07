import type { Handedness, PPosition } from "./models";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type StickFigureJointId =
  | "head"
  | "neck"
  | "spineChest"
  | "pelvis"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle";

export interface StickFigureBone {
  id: string;
  from: StickFigureJointId;
  to: StickFigureJointId;
}

export type StickFigureJointMap = Record<StickFigureJointId, Vec3>;

export type StickFigureCoordinateSpaceId = "golfer_local_v1";

export interface StickFigureCoordinateSpace {
  id: StickFigureCoordinateSpaceId;
  units: "meters";
  originJoint: "pelvis";
  axes: {
    x: "lead_side_positive";
    y: "up_positive";
    z: "target_positive";
  };
  handednessRule: "mirror_x_for_left_handed";
}

export interface StickFigurePose {
  position: PPosition;
  handedness: Handedness;
  coordinateSpace: StickFigureCoordinateSpaceId;
  joints: StickFigureJointMap;
}

export interface StickFigurePoseDataset {
  id: string;
  version: string;
  coordinateSpace: StickFigureCoordinateSpace;
  poses: Record<PPosition, Record<Handedness, StickFigurePose>>;
}

export const STICK_FIGURE_JOINT_ORDER: readonly StickFigureJointId[] = [
  "head",
  "neck",
  "spineChest",
  "pelvis",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle"
] as const;

export const STICK_FIGURE_BONES: readonly StickFigureBone[] = [
  { id: "head-neck", from: "head", to: "neck" },
  { id: "neck-chest", from: "neck", to: "spineChest" },
  { id: "chest-pelvis", from: "spineChest", to: "pelvis" },
  { id: "chest-left-shoulder", from: "spineChest", to: "leftShoulder" },
  { id: "left-upper-arm", from: "leftShoulder", to: "leftElbow" },
  { id: "left-lower-arm", from: "leftElbow", to: "leftWrist" },
  { id: "chest-right-shoulder", from: "spineChest", to: "rightShoulder" },
  { id: "right-upper-arm", from: "rightShoulder", to: "rightElbow" },
  { id: "right-lower-arm", from: "rightElbow", to: "rightWrist" },
  { id: "pelvis-left-hip", from: "pelvis", to: "leftHip" },
  { id: "left-upper-leg", from: "leftHip", to: "leftKnee" },
  { id: "left-lower-leg", from: "leftKnee", to: "leftAnkle" },
  { id: "pelvis-right-hip", from: "pelvis", to: "rightHip" },
  { id: "right-upper-leg", from: "rightHip", to: "rightKnee" },
  { id: "right-lower-leg", from: "rightKnee", to: "rightAnkle" }
] as const;

export const STICK_FIGURE_COORDINATE_SPACE: StickFigureCoordinateSpace = {
  id: "golfer_local_v1",
  units: "meters",
  originJoint: "pelvis",
  axes: {
    x: "lead_side_positive",
    y: "up_positive",
    z: "target_positive"
  },
  handednessRule: "mirror_x_for_left_handed"
};
