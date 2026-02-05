import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import type { SwingListItem } from "@swing/shared";

const SCREEN_PADDING = 20;
const TICK_SPACING = 12;
const MAJOR_TICK_EVERY = 5;

export function SwingDetailScreen({ route }: { route: any }) {
  const swing = route?.params?.swing as SwingListItem | undefined;
  const videoRef = useRef<Video>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastScrubFrame = useRef<number | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFrame, setScrubFrame] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();

  if (!swing) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Swing details not available.</Text>
      </View>
    );
  }

  const frameRate = swing.frameRate > 0 ? swing.frameRate : 60;
  const stepMs = 1000 / frameRate;
  const wheelWidth = Math.max(0, width - SCREEN_PADDING * 2);
  const wheelPadding = Math.max(0, wheelWidth / 2 - TICK_SPACING / 2);
  const targetVideoHeight = Math.max(
    0,
    (width - SCREEN_PADDING * 2) * (16 / 9)
  );
  const videoHeight = Math.min(targetVideoHeight, height * 0.52);
  const isLoaded = status?.isLoaded ?? false;
  const positionMs = isLoaded ? status.positionMillis : 0;
  const durationMs =
    isLoaded && status.durationMillis != null
      ? status.durationMillis
      : swing.durationMs;
  const totalFrames = durationMs
    ? Math.max(1, Math.round(durationMs / stepMs))
    : undefined;
  const displayFrameIndex =
    scrubFrame ?? Math.max(0, Math.round(positionMs / stepMs));
  const displayPositionMs =
    scrubFrame != null ? scrubFrame * stepMs : positionMs;
  const currentFrame = displayFrameIndex + 1;
  const isPlaying = isLoaded ? status.isPlaying : false;
  const controlsDisabled = !isLoaded || isScrubbing;

  const togglePlayback = async () => {
    if (!videoRef.current || !isLoaded) {
      return;
    }

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const formatMs = (value: number) => `${(value / 1000).toFixed(2)}s`;

  const ticks = useMemo(() => {
    if (!totalFrames) {
      return [];
    }

    return Array.from({ length: totalFrames }, (_, index) => (
      <View key={`tick-${index}`} style={styles.tick}>
        <View
          style={[
            styles.tickLine,
            index % MAJOR_TICK_EVERY === 0
              ? styles.tickLineMajor
              : styles.tickLineMinor
          ]}
        />
      </View>
    ));
  }, [totalFrames]);

  const handleScrubStart = async () => {
    setIsScrubbing(true);
    if (videoRef.current && isLoaded && isPlaying) {
      await videoRef.current.pauseAsync();
    }
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    setScrubFrame(null);
    lastScrubFrame.current = null;
  };

  const handleScroll = (offsetX: number) => {
    if (!totalFrames) {
      return;
    }

    const rawIndex = Math.round(offsetX / TICK_SPACING);
    const clampedIndex = Math.min(Math.max(rawIndex, 0), totalFrames - 1);
    if (lastScrubFrame.current === clampedIndex) {
      return;
    }

    lastScrubFrame.current = clampedIndex;
    setScrubFrame(clampedIndex);
    const targetMs = clampedIndex * stepMs;
    const clampedTargetMs =
      durationMs != null
        ? Math.min(Math.max(0, targetMs), durationMs)
        : Math.max(0, targetMs);

    if (!videoRef.current || !isLoaded) {
      return;
    }

    void videoRef.current.setPositionAsync(clampedTargetMs, {
      shouldPlay: false,
      toleranceMillisBefore: 0,
      toleranceMillisAfter: 0
    });
  };

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: swing.previewUrl }}
        ref={videoRef}
        style={[styles.video, { height: videoHeight }]}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={false}
        onPlaybackStatusUpdate={setStatus}
        progressUpdateIntervalMillis={Math.max(16, Math.round(stepMs))}
      />
      <View style={styles.controls}>
        <View style={styles.frameMeta}>
          <Text style={styles.frameLabel}>
            Frame {currentFrame}
            {totalFrames ? ` / ${totalFrames}` : ""}
          </Text>
          <Text style={styles.frameSubLabel}>
            {formatMs(displayPositionMs)}
            {durationMs ? ` / ${formatMs(durationMs)}` : ""}
          </Text>
        </View>
        <View style={styles.scrubber}>
          <View style={styles.scrubberIndicator} />
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            snapToInterval={TICK_SPACING}
            decelerationRate="fast"
            onScrollBeginDrag={handleScrubStart}
            onScrollEndDrag={handleScrubEnd}
            onMomentumScrollEnd={handleScrubEnd}
            onScroll={(event) =>
              handleScroll(event.nativeEvent.contentOffset.x)
            }
            contentContainerStyle={[
              styles.scrubberContent,
              { paddingHorizontal: wheelPadding }
            ]}
          >
            {ticks}
          </ScrollView>
        </View>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={togglePlayback}
            disabled={controlsDisabled}
            style={({ pressed }) => [
              styles.controlButton,
              styles.controlPrimary,
              controlsDisabled ? styles.controlButtonDisabled : null,
              pressed && !controlsDisabled ? styles.controlButtonPressed : null
            ]}
          >
            <Text style={[styles.controlText, styles.controlTextPrimary]}>
              {isPlaying ? "Pause" : "Play"}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title}>Swing {swing.id.slice(0, 6)}</Text>
        <Text style={styles.subtitle}>
          {new Date(swing.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SCREEN_PADDING,
    gap: 16,
    backgroundColor: "#FFFFFF"
  },
  video: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#DDE3E0"
  },
  controls: {
    gap: 12
  },
  frameMeta: {
    gap: 4
  },
  frameLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F1A17"
  },
  frameSubLabel: {
    color: "#5B6B66"
  },
  scrubber: {
    height: 96,
    borderRadius: 16,
    backgroundColor: "#F2F6F4",
    justifyContent: "center",
    overflow: "hidden"
  },
  scrubberContent: {
    alignItems: "center"
  },
  scrubberIndicator: {
    position: "absolute",
    left: "50%",
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: "#1E4E3D",
    borderRadius: 2
  },
  tick: {
    width: TICK_SPACING,
    alignItems: "center",
    justifyContent: "center"
  },
  tickLine: {
    width: 2,
    backgroundColor: "#8AA099",
    borderRadius: 2
  },
  tickLineMajor: {
    height: 38
  },
  tickLineMinor: {
    height: 22
  },
  controlsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  },
  controlButton: {
    flex: 0,
    minWidth: 120,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#E6ECEA"
  },
  controlPrimary: {
    backgroundColor: "#1E4E3D"
  },
  controlButtonPressed: {
    opacity: 0.8
  },
  controlButtonDisabled: {
    opacity: 0.5
  },
  controlText: {
    color: "#0F1A17",
    fontWeight: "600"
  },
  controlTextPrimary: {
    color: "#FFFFFF"
  },
  meta: {
    gap: 6
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F1A17"
  },
  subtitle: {
    color: "#5B6B66"
  },
  errorText: {
    color: "#9A2B2B",
    fontWeight: "600"
  }
});
