import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import Constants from "expo-constants";
import * as Device from "expo-device";
import type {
  PPosition,
  SwingAnalysis,
  SwingAnalysisStatus,
  SwingListItem
} from "@swing/shared";
import { PrimaryButton } from "../components/PrimaryButton";
import { StickFigurePPositionViewer } from "../components/StickFigurePPositionViewer";
import {
  listSwingAnalyses,
  listSwingFrameTags,
  requestSwingAnalysis,
  upsertSwingFrameTags
} from "../lib/api";

const SCREEN_PADDING = 20;
const TICK_SPACING = 12;
const MAJOR_TICK_EVERY = 5;
const TAG_GAP = 10;
const POSITIONS: PPosition[] = [
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
];
const SIMULATOR_MEDIA_OVERRIDE =
  process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_ANALYZE_MEDIA === "1";
const ANALYZE_SHOW_VIDEO = process.env.EXPO_PUBLIC_ANALYZE_SHOW_VIDEO;
const ANALYZE_SHOW_3D = process.env.EXPO_PUBLIC_ANALYZE_SHOW_3D;
const ANALYZE_3D_BACKEND = process.env.EXPO_PUBLIC_ANALYZE_3D_BACKEND;

function resolveBooleanFlag(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "off") {
    return false;
  }

  return fallback;
}

type FrameTagDraft = {
  frameIndex: number;
  timestampMs: number;
};

export function SwingAnalyzeScreen({ route }: { route: any }) {
  const swing = route?.params?.swing as SwingListItem | undefined;
  const videoRef = useRef<Video>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastSyncedFrame = useRef<number | null>(null);
  const lastScrubFrame = useRef<number | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFrame, setScrubFrame] = useState<number | null>(null);
  const [frameTags, setFrameTags] = useState<
    Partial<Record<PPosition, FrameTagDraft>>
  >({});
  const [tagSyncState, setTagSyncState] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [tagSyncError, setTagSyncError] = useState<string | null>(null);
  const analysisPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const [analysisState, setAnalysisState] = useState<
    "idle" | "requesting" | "polling" | "completed" | "error"
  >("idle");
  const [analysisStatus, setAnalysisStatus] =
    useState<SwingAnalysisStatus | null>(null);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SwingAnalysis | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [mountThreeD, setMountThreeD] = useState(false);
  const { width, height } = useWindowDimensions();
  const iosPlatform = Constants.platform?.ios as { simulator?: boolean } | undefined;
  const isIosSimulator =
    Platform.OS === "ios" &&
    (iosPlatform?.simulator === true || !Device.isDevice) &&
    Constants.executionEnvironment !== "bare";
  const simulatorSafeMode = isIosSimulator && !SIMULATOR_MEDIA_OVERRIDE;
  const defaultShowVideo = !simulatorSafeMode;
  const defaultShow3D = isIosSimulator ? true : !simulatorSafeMode;
  const showVideo = resolveBooleanFlag(ANALYZE_SHOW_VIDEO, defaultShowVideo);
  const show3D = resolveBooleanFlag(ANALYZE_SHOW_3D, defaultShow3D);
  const requestedBackend = ANALYZE_3D_BACKEND?.trim().toLowerCase();
  const renderBackend =
    requestedBackend === "gl" || requestedBackend === "skia"
      ? requestedBackend
      : isIosSimulator
      ? "skia"
      : "gl";

  const frameRate = swing && swing.frameRate > 0 ? swing.frameRate : 60;
  const stepMs = 1000 / frameRate;
  const wheelWidth = Math.max(0, width - SCREEN_PADDING * 2);
  const wheelPadding = Math.max(0, wheelWidth / 2 - TICK_SPACING / 2);
  const tagChipWidth = Math.floor((wheelWidth - TAG_GAP * 2) / 3);
  const targetVideoHeight = Math.max(
    0,
    (width - SCREEN_PADDING * 2) * (16 / 9)
  );
  const videoHeight = Math.min(targetVideoHeight, height * 0.52);
  const isLoaded = status?.isLoaded ?? false;
  const positionMs = isLoaded ? status.positionMillis : 0;
  const fallbackDurationMs = swing?.durationMs ?? 0;
  const durationMs =
    isLoaded && status.durationMillis != null
      ? status.durationMillis
      : fallbackDurationMs;
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
  const tagDisabled = !isLoaded || !showVideo;
  const taggedPositions = useMemo(
    () => POSITIONS.filter((position) => Boolean(frameTags[position])),
    [frameTags]
  );

  useFocusEffect(
    useCallback(() => {
      if (!show3D) {
        setMountThreeD(false);
        return undefined;
      }

      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          setMountThreeD(true);
        }
      });

      return () => {
        cancelled = true;
        task.cancel();
        setMountThreeD(false);
      };
    }, [show3D])
  );

  const stopAnalysisPolling = () => {
    if (analysisPollTimerRef.current != null) {
      clearInterval(analysisPollTimerRef.current);
      analysisPollTimerRef.current = null;
    }
  };

  const pollAnalysisStatus = async (targetAnalysisId: string) => {
    if (!swing) {
      return;
    }

    try {
      const response = await listSwingAnalyses(swing.id);
      const matchingAnalysis = response.items.find(
        (item) => item.id === targetAnalysisId
      );
      if (!matchingAnalysis) {
        return;
      }

      setAnalysisResult(matchingAnalysis);
      setAnalysisStatus(matchingAnalysis.status);

      if (matchingAnalysis.status === "completed") {
        setAnalysisState("completed");
        setAnalysisError(null);
        stopAnalysisPolling();
        return;
      }

      if (matchingAnalysis.status === "failed") {
        setAnalysisState("error");
        setAnalysisError("Analysis failed.");
        stopAnalysisPolling();
        return;
      }

      setAnalysisState("polling");
    } catch (err) {
      setAnalysisState("error");
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to poll analysis status."
      );
      stopAnalysisPolling();
    }
  };

  const startAnalysisPolling = (targetAnalysisId: string) => {
    stopAnalysisPolling();
    setAnalysisState("polling");
    void pollAnalysisStatus(targetAnalysisId);
    analysisPollTimerRef.current = setInterval(() => {
      void pollAnalysisStatus(targetAnalysisId);
    }, 1500);
  };

  useEffect(() => {
    if (!swing) {
      return;
    }

    let isActive = true;

    const loadScreenData = async () => {
      stopAnalysisPolling();
      setTagSyncState("loading");
      setTagSyncError(null);
      setAnalysisError(null);
      try {
        const [tagResponse, analysisResponse] = await Promise.all([
          listSwingFrameTags(swing.id),
          listSwingAnalyses(swing.id)
        ]);
        if (!isActive) {
          return;
        }

        const nextTags: Partial<Record<PPosition, FrameTagDraft>> = {};
        tagResponse.tags.forEach((tag) => {
          nextTags[tag.position] = {
            frameIndex: tag.frameIndex,
            timestampMs: tag.timestampMs
          };
        });

        setFrameTags(nextTags);
        setTagSyncState("idle");

        const latestAnalysis = analysisResponse.items[0];
        if (!latestAnalysis) {
          setAnalysisJobId(null);
          setAnalysisResult(null);
          setAnalysisStatus(null);
          setAnalysisState("idle");
          return;
        }

        setAnalysisJobId(latestAnalysis.id);
        setAnalysisResult(latestAnalysis);
        setAnalysisStatus(latestAnalysis.status);

        if (latestAnalysis.status === "completed") {
          setAnalysisState("completed");
          return;
        }

        if (latestAnalysis.status === "failed") {
          setAnalysisState("error");
          setAnalysisError("Analysis failed.");
          return;
        }

        startAnalysisPolling(latestAnalysis.id);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setTagSyncState("error");
        setTagSyncError(
          err instanceof Error ? err.message : "Failed to load frame tags."
        );
      }
    };

    void loadScreenData();

    return () => {
      isActive = false;
      stopAnalysisPolling();
    };
  }, [swing?.id]);

  if (!swing) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Swing details not available.</Text>
      </View>
    );
  }

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
    lastSyncedFrame.current = null;
    if (videoRef.current && isLoaded && isPlaying) {
      await videoRef.current.pauseAsync();
    }
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    setScrubFrame(null);
    lastScrubFrame.current = null;
    lastSyncedFrame.current = null;
  };

  const handleScroll = (offsetX: number) => {
    if (!totalFrames || !isScrubbing) {
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

  const handlePlaybackStatusUpdate = (nextStatus: AVPlaybackStatus) => {
    setStatus(nextStatus);
    if (!nextStatus.isLoaded || isScrubbing) {
      return;
    }

    const nextDurationMs =
      nextStatus.durationMillis != null ? nextStatus.durationMillis : swing.durationMs;
    const nextTotalFrames = nextDurationMs
      ? Math.max(1, Math.round(nextDurationMs / stepMs))
      : undefined;
    const rawFrame = Math.round(nextStatus.positionMillis / stepMs);
    const clampedFrame = nextTotalFrames
      ? Math.min(Math.max(rawFrame, 0), nextTotalFrames - 1)
      : Math.max(rawFrame, 0);

    if (lastSyncedFrame.current === clampedFrame) {
      return;
    }

    lastSyncedFrame.current = clampedFrame;
    scrollRef.current?.scrollTo({
      x: clampedFrame * TICK_SPACING,
      animated: false
    });
  };

  const handleTagPosition = (position: PPosition) => {
    if (tagDisabled) {
      return;
    }

    setTagSyncState("idle");
    setTagSyncError(null);
    setFrameTags((prev) => ({
      ...prev,
      [position]: {
        frameIndex: displayFrameIndex,
        timestampMs: Math.round(displayPositionMs)
      }
    }));
  };

  const handleSaveTags = async () => {
    const tags = POSITIONS.flatMap((position) => {
      const tag = frameTags[position];
      if (!tag) {
        return [];
      }

      return [
        {
          position,
          frameIndex: tag.frameIndex,
          timestampMs: tag.timestampMs,
          setBy: "user" as const
        }
      ];
    });

    if (tags.length === 0) {
      return;
    }

    setTagSyncState("saving");
    setTagSyncError(null);
    try {
      const response = await upsertSwingFrameTags(swing.id, { tags });
      const nextTags: Partial<Record<PPosition, FrameTagDraft>> = {};

      response.tags.forEach((tag) => {
        nextTags[tag.position] = {
          frameIndex: tag.frameIndex,
          timestampMs: tag.timestampMs
        };
      });

      setFrameTags(nextTags);
      setTagSyncState("saved");
    } catch (err) {
      setTagSyncState("error");
      setTagSyncError(
        err instanceof Error ? err.message : "Failed to save frame tags."
      );
    }
  };

  const handleRequestAnalysis = async () => {
    setAnalysisError(null);
    setAnalysisState("requesting");

    try {
      const response = await requestSwingAnalysis(swing.id, {
        notes:
          taggedPositions.length > 0
            ? `Tagged positions: ${taggedPositions.join(", ")}`
            : "Requested without frame tags."
      });

      setAnalysisJobId(response.analysisId);
      setAnalysisStatus(response.status);
      startAnalysisPolling(response.analysisId);
    } catch (err) {
      setAnalysisState("error");
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to request analysis."
      );
    }
  };

  const analysisButtonLabel =
    analysisState === "requesting"
      ? "Requesting..."
      : analysisState === "polling"
      ? "Polling..."
      : analysisState === "completed"
      ? "Re-run Analysis"
      : "Run Initial Analysis";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {!showVideo ? (
        <View style={[styles.simulatorFallbackCard, { minHeight: videoHeight }]}>
          <Text style={styles.simulatorFallbackTitle}>
            Analyze video preview is disabled for this runtime.
          </Text>
          <Text style={styles.simulatorFallbackBody}>
            Toggle with `EXPO_PUBLIC_ANALYZE_SHOW_VIDEO=1` to force-enable while
            isolating crashes.
          </Text>
        </View>
      ) : (
        <>
          <Video
            source={{ uri: swing.previewUrl }}
            ref={videoRef}
            style={[styles.video, { height: videoHeight }]}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            isLooping
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            progressUpdateIntervalMillis={Math.max(8, Math.round(stepMs))}
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
        </>
      )}
      <View style={styles.tagSection}>
        <Text style={styles.sectionTitle}>Key Frames</Text>
        {showVideo ? (
          <Text style={styles.sectionHint}>
            Tap a position to tag the current frame. {taggedPositions.length}/10 tagged.
          </Text>
        ) : (
          <Text style={styles.sectionHint}>
            Enable video preview to use frame tagging controls.
          </Text>
        )}
        <View style={styles.tagGrid}>
          {POSITIONS.map((position) => {
            const tag = frameTags[position];
            const isTagged = Boolean(tag);
            return (
              <Pressable
                key={position}
                onPress={() => handleTagPosition(position)}
                disabled={tagDisabled}
                style={({ pressed }) => [
                  styles.tagChip,
                  { width: tagChipWidth },
                  isTagged ? styles.tagChipActive : null,
                  tagDisabled ? styles.tagChipDisabled : null,
                  pressed && !tagDisabled ? styles.tagChipPressed : null
                ]}
              >
                <Text
                  style={[
                    styles.tagChipLabel,
                    isTagged ? styles.tagChipLabelActive : null
                  ]}
                >
                  {position}
                </Text>
                <Text
                  style={[
                    styles.tagChipMeta,
                    isTagged ? styles.tagChipMetaActive : null
                  ]}
                >
                  {tag ? `Frame ${tag.frameIndex + 1}` : "Tag frame"}
                </Text>
                {tag ? (
                  <Text
                    style={[
                      styles.tagChipMeta,
                      isTagged ? styles.tagChipMetaActive : null
                    ]}
                  >
                    {formatMs(tag.timestampMs)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.tagActions}>
          <PrimaryButton
            label={tagSyncState === "saving" ? "Saving..." : "Save Tags"}
            onPress={handleSaveTags}
            disabled={
              taggedPositions.length === 0 ||
              tagSyncState === "saving" ||
              tagSyncState === "loading"
            }
          />
        </View>
        {tagSyncState === "loading" ? (
          <Text style={styles.statusText}>Loading saved tags...</Text>
        ) : null}
        {tagSyncState === "saved" ? (
          <Text style={styles.statusText}>Frame tags saved.</Text>
        ) : null}
        {tagSyncState === "error" && tagSyncError ? (
          <Text style={styles.errorText}>{tagSyncError}</Text>
        ) : null}
      </View>
      <View style={styles.analysisSection}>
        <Text style={styles.sectionTitle}>Initial Analysis</Text>
        <Text style={styles.sectionHint}>
          Request analysis and poll job status until completion.
        </Text>
        <PrimaryButton
          label={analysisButtonLabel}
          onPress={handleRequestAnalysis}
          disabled={analysisState === "requesting" || analysisState === "polling"}
        />
        {analysisJobId ? (
          <Text style={styles.analysisMeta}>Job: {analysisJobId.slice(0, 8)}</Text>
        ) : null}
        {analysisStatus ? (
          <Text style={styles.statusText}>Status: {analysisStatus}</Text>
        ) : null}
        {analysisError ? <Text style={styles.errorText}>{analysisError}</Text> : null}
        {analysisResult && analysisResult.status === "completed" ? (
          <View style={styles.analysisCard}>
            <Text style={styles.analysisSummary}>{analysisResult.summary}</Text>
            {analysisResult.recommendations.map((recommendation, index) => (
              <Text
                key={`analysis-recommendation-${index}`}
                style={styles.analysisRecommendation}
              >
                - {recommendation}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.stickFigureSection}>
        <Text style={styles.sectionTitle}>3D Stick Figure</Text>
        {!show3D ? (
          <Text style={styles.sectionHint}>
            3D preview is disabled for this runtime. Set
            ` EXPO_PUBLIC_ANALYZE_SHOW_3D=1 ` to enable the 3D section.
          </Text>
        ) : !mountThreeD ? (
          <View style={styles.threeDLoadingCard}>
            <Text style={styles.threeDLoadingText}>Preparing 3D viewport…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHint}>
              Switch between P1 through P10 to inspect the baseline pose sequence.
            </Text>
            <StickFigurePPositionViewer renderBackend={renderBackend} />
          </>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title}>Swing {swing.id.slice(0, 6)}</Text>
        <Text style={styles.subtitle}>
          {new Date(swing.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SCREEN_PADDING,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: "#FFFFFF"
  },
  video: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#DDE3E0"
  },
  simulatorFallbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0DBD6",
    backgroundColor: "#F3F7F5",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    gap: 6
  },
  simulatorFallbackTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1A17"
  },
  simulatorFallbackBody: {
    color: "#41534D",
    lineHeight: 18
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
  tagSection: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F1A17"
  },
  sectionHint: {
    color: "#5B6B66"
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TAG_GAP
  },
  tagActions: {
    marginTop: 6
  },
  tagChip: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8D4CF",
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    gap: 4
  },
  tagChipActive: {
    backgroundColor: "#1E4E3D",
    borderColor: "#1E4E3D"
  },
  tagChipPressed: {
    opacity: 0.85
  },
  tagChipDisabled: {
    opacity: 0.5
  },
  tagChipLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1A17"
  },
  tagChipLabelActive: {
    color: "#FFFFFF"
  },
  tagChipMeta: {
    fontSize: 12,
    color: "#5B6B66"
  },
  tagChipMetaActive: {
    color: "#D6E7E1"
  },
  statusText: {
    color: "#1E4E3D",
    fontWeight: "600"
  },
  analysisSection: {
    gap: 8
  },
  analysisMeta: {
    color: "#5B6B66",
    fontSize: 12
  },
  analysisCard: {
    backgroundColor: "#F3F8F6",
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  analysisSummary: {
    color: "#0F1A17",
    fontWeight: "600"
  },
  analysisRecommendation: {
    color: "#2E4940"
  },
  stickFigureSection: {
    gap: 8
  },
  threeDLoadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8D4CF",
    backgroundColor: "#F7FAF8",
    paddingVertical: 14,
    paddingHorizontal: 12
  },
  threeDLoadingText: {
    color: "#41534D",
    fontWeight: "600"
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
