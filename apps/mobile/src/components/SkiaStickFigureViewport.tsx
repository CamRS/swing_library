import { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from "react-native";
import { Canvas, Circle, Line, Rect, vec } from "@shopify/react-native-skia";
import type { StickFigureJointMap } from "@swing/shared";
import { STICK_FIGURE_BONES } from "@swing/shared";

type Vec3Tuple = [number, number, number];

type Props = {
  style?: StyleProp<ViewStyle>;
  joints: StickFigureJointMap;
  gridSize?: number;
  gridDivisions?: number;
  backgroundColor?: string;
  cameraPosition?: Vec3Tuple;
  cameraTarget?: Vec3Tuple;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
};

type ProjectedLine = {
  from: ProjectedPoint;
  to: ProjectedPoint;
  color: string;
  strokeWidth: number;
  depth: number;
};

const DEFAULT_CAMERA_POSITION: Vec3Tuple = [2.7, 1.9, 2.45];
const DEFAULT_CAMERA_TARGET: Vec3Tuple = [0, 1.05, 0.04];

const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };

function toVec3([x, y, z]: Vec3Tuple): Vec3 {
  return { x, y, z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len <= 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }

  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createCameraBasis(position: Vec3, target: Vec3) {
  const forward = normalize(subtract(target, position));
  let right = normalize(cross(forward, WORLD_UP));
  if (length(right) <= 1e-6) {
    right = { x: 1, y: 0, z: 0 };
  }
  const up = normalize(cross(right, forward));

  return { position, forward, right, up };
}

function projectPoint(
  point: Vec3,
  basis: ReturnType<typeof createCameraBasis>,
  width: number,
  height: number
): ProjectedPoint | null {
  const relative = subtract(point, basis.position);
  const cameraX = dot(relative, basis.right);
  const cameraY = dot(relative, basis.up);
  const cameraZ = dot(relative, basis.forward);

  if (cameraZ <= 0.05) {
    return null;
  }

  const fovRad = (38 * Math.PI) / 180;
  const focalLength = (height * 0.5) / Math.tan(fovRad / 2);
  const scale = focalLength / cameraZ;
  const centerY = height * 0.58;

  return {
    x: width * 0.5 + cameraX * scale,
    y: centerY - cameraY * scale,
    depth: cameraZ
  };
}

export function SkiaStickFigureViewport({
  style,
  joints,
  gridSize = 6.4,
  gridDivisions = 24,
  backgroundColor = "#2B2F35",
  cameraPosition = DEFAULT_CAMERA_POSITION,
  cameraTarget = DEFAULT_CAMERA_TARGET
}: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const projected = useMemo(() => {
    if (layout.width <= 0 || layout.height <= 0) {
      return { grid: [] as ProjectedLine[], bones: [] as ProjectedLine[], joints: [] as ProjectedPoint[] };
    }

    const basis = createCameraBasis(toVec3(cameraPosition), toVec3(cameraTarget));
    const half = gridSize / 2;

    const buildLine = (
      from: Vec3,
      to: Vec3,
      color: string,
      strokeWidth: number
    ): ProjectedLine | null => {
      const fromProjected = projectPoint(from, basis, layout.width, layout.height);
      const toProjected = projectPoint(to, basis, layout.width, layout.height);
      if (!fromProjected || !toProjected) {
        return null;
      }

      return {
        from: fromProjected,
        to: toProjected,
        color,
        strokeWidth,
        depth: (fromProjected.depth + toProjected.depth) / 2
      };
    };

    const gridLines: ProjectedLine[] = [];
    for (let i = 0; i <= gridDivisions; i += 1) {
      const ratio = i / gridDivisions;
      const offset = -half + ratio * gridSize;
      const isMajor = i % 6 === 0;
      const color = isMajor ? "#4C545E" : "#3D434B";

      const xLine = buildLine(
        { x: -half, y: 0, z: offset },
        { x: half, y: 0, z: offset },
        color,
        isMajor ? 1.2 : 1
      );
      if (xLine) {
        gridLines.push(xLine);
      }

      const zLine = buildLine(
        { x: offset, y: 0, z: -half },
        { x: offset, y: 0, z: half },
        color,
        isMajor ? 1.2 : 1
      );
      if (zLine) {
        gridLines.push(zLine);
      }
    }

    const xAxis = buildLine(
      { x: -half, y: 0.001, z: 0 },
      { x: half, y: 0.001, z: 0 },
      "#A34A4A",
      2
    );
    if (xAxis) {
      gridLines.push(xAxis);
    }

    const zAxis = buildLine(
      { x: 0, y: 0.001, z: -half },
      { x: 0, y: 0.001, z: half },
      "#5D8A4B",
      2
    );
    if (zAxis) {
      gridLines.push(zAxis);
    }

    const boneLines: ProjectedLine[] = STICK_FIGURE_BONES.flatMap((bone) => {
      const fromJoint = joints[bone.from];
      const toJoint = joints[bone.to];
      const line = buildLine(
        { x: fromJoint.x, y: fromJoint.y, z: fromJoint.z },
        { x: toJoint.x, y: toJoint.y, z: toJoint.z },
        "#D5DFEA",
        1.9
      );

      return line ? [line] : [];
    });

    const projectedJoints: ProjectedPoint[] = Object.values(joints)
      .map((joint) =>
        projectPoint(
          { x: joint.x, y: joint.y, z: joint.z },
          basis,
          layout.width,
          layout.height
        )
      )
      .filter((joint): joint is ProjectedPoint => joint != null);

    return {
      grid: gridLines.sort((a, b) => b.depth - a.depth),
      bones: boneLines.sort((a, b) => b.depth - a.depth),
      joints: projectedJoints.sort((a, b) => b.depth - a.depth)
    };
  }, [cameraPosition, cameraTarget, gridDivisions, gridSize, joints, layout.height, layout.width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout((previous) => {
      if (
        Math.abs(previous.width - width) < 0.5 &&
        Math.abs(previous.height - height) < 0.5
      ) {
        return previous;
      }

      return { width, height };
    });
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <Canvas style={styles.canvas}>
        <Rect
          x={0}
          y={0}
          width={Math.max(1, layout.width)}
          height={Math.max(1, layout.height)}
          color={backgroundColor}
        />
        {projected.grid.map((line, index) => (
          <Line
            key={`grid-${index}`}
            p1={vec(line.from.x, line.from.y)}
            p2={vec(line.to.x, line.to.y)}
            color={line.color}
            strokeWidth={line.strokeWidth}
          />
        ))}
        {projected.bones.map((line, index) => (
          <Line
            key={`bone-${index}`}
            p1={vec(line.from.x, line.from.y)}
            p2={vec(line.to.x, line.to.y)}
            color={line.color}
            strokeWidth={line.strokeWidth}
          />
        ))}
        {projected.joints.map((joint, index) => (
          <Circle
            key={`joint-${index}`}
            cx={joint.x}
            cy={joint.y}
            r={clamp(5.2 - joint.depth * 0.9, 2.2, 4.5)}
            color="#F2F6FA"
          />
        ))}
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
  canvas: {
    flex: 1
  }
});
