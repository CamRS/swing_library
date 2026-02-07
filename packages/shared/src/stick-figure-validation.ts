import type { Handedness, PPosition } from "./models";
import {
  STICK_FIGURE_BONES,
  STICK_FIGURE_COORDINATE_SPACE,
  STICK_FIGURE_JOINT_ORDER,
  type StickFigurePose,
  type StickFigurePoseDataset
} from "./stick-figure";
import { STICK_FIGURE_P_POSITION_ORDER } from "./stick-figure-poses";

const BONE_LENGTH_MIN_METERS = 0.04;
const MIRROR_TOLERANCE_METERS = 0.005;

export interface StickFigureValidationIssue {
  path: string;
  code: string;
  message: string;
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function distance3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function buildPath(prefix: string, key: string) {
  return prefix ? `${prefix}.${key}` : key;
}

export function validateStickFigurePose(
  pose: StickFigurePose,
  pathPrefix = ""
): StickFigureValidationIssue[] {
  const issues: StickFigureValidationIssue[] = [];

  if (pose.coordinateSpace !== STICK_FIGURE_COORDINATE_SPACE.id) {
    issues.push({
      path: buildPath(pathPrefix, "coordinateSpace"),
      code: "invalid_coordinate_space",
      message: `Expected coordinate space ${STICK_FIGURE_COORDINATE_SPACE.id}.`
    });
  }

  STICK_FIGURE_JOINT_ORDER.forEach((jointId) => {
    const joint = pose.joints[jointId];

    if (!isFiniteNumber(joint.x) || !isFiniteNumber(joint.y) || !isFiniteNumber(joint.z)) {
      issues.push({
        path: buildPath(pathPrefix, `joints.${jointId}`),
        code: "invalid_joint_vector",
        message: "Joint coordinates must be finite numbers."
      });
    }
  });

  STICK_FIGURE_BONES.forEach((bone) => {
    const length = distance3(pose.joints[bone.from], pose.joints[bone.to]);
    if (length < BONE_LENGTH_MIN_METERS) {
      issues.push({
        path: buildPath(pathPrefix, `bones.${bone.id}`),
        code: "bone_too_short",
        message: `Bone length ${length.toFixed(4)}m is below ${BONE_LENGTH_MIN_METERS.toFixed(2)}m.`
      });
    }
  });

  return issues;
}

function validateCoordinateSpace(dataset: StickFigurePoseDataset) {
  const issues: StickFigureValidationIssue[] = [];
  const actual = dataset.coordinateSpace;
  const expected = STICK_FIGURE_COORDINATE_SPACE;

  if (actual.id !== expected.id) {
    issues.push({
      path: "coordinateSpace.id",
      code: "invalid_coordinate_space_id",
      message: `Expected ${expected.id}, received ${actual.id}.`
    });
  }

  if (actual.units !== expected.units) {
    issues.push({
      path: "coordinateSpace.units",
      code: "invalid_coordinate_units",
      message: `Expected ${expected.units}, received ${actual.units}.`
    });
  }

  if (actual.originJoint !== expected.originJoint) {
    issues.push({
      path: "coordinateSpace.originJoint",
      code: "invalid_origin_joint",
      message: `Expected ${expected.originJoint}, received ${actual.originJoint}.`
    });
  }

  if (actual.axes.x !== expected.axes.x) {
    issues.push({
      path: "coordinateSpace.axes.x",
      code: "invalid_axis_x",
      message: `Expected ${expected.axes.x}, received ${actual.axes.x}.`
    });
  }

  if (actual.axes.y !== expected.axes.y) {
    issues.push({
      path: "coordinateSpace.axes.y",
      code: "invalid_axis_y",
      message: `Expected ${expected.axes.y}, received ${actual.axes.y}.`
    });
  }

  if (actual.axes.z !== expected.axes.z) {
    issues.push({
      path: "coordinateSpace.axes.z",
      code: "invalid_axis_z",
      message: `Expected ${expected.axes.z}, received ${actual.axes.z}.`
    });
  }

  if (actual.handednessRule !== expected.handednessRule) {
    issues.push({
      path: "coordinateSpace.handednessRule",
      code: "invalid_handedness_rule",
      message: `Expected ${expected.handednessRule}, received ${actual.handednessRule}.`
    });
  }

  return issues;
}

function validateMirroredHandedness(
  position: PPosition,
  rightPose: StickFigurePose,
  leftPose: StickFigurePose
) {
  const issues: StickFigureValidationIssue[] = [];

  STICK_FIGURE_JOINT_ORDER.forEach((jointId) => {
    const rightJoint = rightPose.joints[jointId];
    const leftJoint = leftPose.joints[jointId];

    const xDelta = Math.abs(leftJoint.x + rightJoint.x);
    const yDelta = Math.abs(leftJoint.y - rightJoint.y);
    const zDelta = Math.abs(leftJoint.z - rightJoint.z);

    if (
      xDelta > MIRROR_TOLERANCE_METERS ||
      yDelta > MIRROR_TOLERANCE_METERS ||
      zDelta > MIRROR_TOLERANCE_METERS
    ) {
      issues.push({
        path: `poses.${position}.left.joints.${jointId}`,
        code: "invalid_handedness_mirror",
        message:
          "Left-handed pose should mirror right-handed pose across the lead-side axis."
      });
    }
  });

  return issues;
}

export function validateStickFigurePoseDataset(
  dataset: StickFigurePoseDataset
): StickFigureValidationIssue[] {
  const issues: StickFigureValidationIssue[] = [];

  issues.push(...validateCoordinateSpace(dataset));

  STICK_FIGURE_P_POSITION_ORDER.forEach((position) => {
    const pair = dataset.poses[position];
    if (!pair) {
      issues.push({
        path: `poses.${position}`,
        code: "missing_position_pose",
        message: `Missing pose data for ${position}.`
      });
      return;
    }

    (["right", "left"] as const).forEach((handedness: Handedness) => {
      const pose = pair[handedness];
      if (!pose) {
        issues.push({
          path: `poses.${position}.${handedness}`,
          code: "missing_handed_pose",
          message: `Missing ${handedness}-handed pose for ${position}.`
        });
        return;
      }

      if (pose.position !== position) {
        issues.push({
          path: `poses.${position}.${handedness}.position`,
          code: "position_mismatch",
          message: `Expected position ${position}, received ${pose.position}.`
        });
      }

      if (pose.handedness !== handedness) {
        issues.push({
          path: `poses.${position}.${handedness}.handedness`,
          code: "handedness_mismatch",
          message: `Expected handedness ${handedness}, received ${pose.handedness}.`
        });
      }

      issues.push(
        ...validateStickFigurePose(pose, `poses.${position}.${handedness}`)
      );
    });

    issues.push(
      ...validateMirroredHandedness(position, pair.right, pair.left)
    );
  });

  return issues;
}

export function isStickFigurePoseDatasetValid(dataset: StickFigurePoseDataset) {
  return validateStickFigurePoseDataset(dataset).length === 0;
}

export function assertValidStickFigurePoseDataset(dataset: StickFigurePoseDataset) {
  const issues = validateStickFigurePoseDataset(dataset);
  if (issues.length === 0) {
    return;
  }

  const formatted = issues
    .map((issue) => `${issue.path}: ${issue.code}`)
    .join("; ");
  throw new Error(`Invalid stick-figure pose dataset: ${formatted}`);
}
