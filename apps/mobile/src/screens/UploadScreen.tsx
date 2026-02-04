import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import type { VideoAngle } from "@swing/shared";
import {
  createSwing,
  requestSwingUpload,
  uploadToSignedUrl
} from "../lib/api";
import { PrimaryButton } from "../components/PrimaryButton";

const angleOptions: { label: string; value: VideoAngle }[] = [
  { label: "Down-the-line", value: "down_the_line" },
  { label: "Face-on", value: "face_on" },
  { label: "Other", value: "other" }
];

const frameRateOptions = [30, 60, 120];

type UploadStatus =
  | "idle"
  | "selecting"
  | "requesting"
  | "uploading"
  | "creating"
  | "done"
  | "error";

export function UploadScreen() {
  const [angle, setAngle] = useState<VideoAngle | null>(null);
  const [frameRate, setFrameRate] = useState<number | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(
    null
  );
  const [fileInfo, setFileInfo] = useState<FileSystem.FileInfo | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const durationMs = asset?.duration ?? 0;
  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
  const meetsLength = durationSec >= 3 && durationSec <= 10;

  const pickVideo = async () => {
    setStatus("selecting");
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("error");
      setError("Media library permission is required to select a video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1
    });

    if (result.canceled) {
      setStatus("idle");
      return;
    }

    const selected = result.assets[0];
    setAsset(selected);
    const info = await FileSystem.getInfoAsync(selected.uri, { size: true });
    setFileInfo(info);
    setStatus("idle");
  };

  const handleUpload = async () => {
    if (!asset || !angle || !frameRate) {
      setError("Select a video, angle, and frame rate before uploading.");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      if (!fileInfo?.size) {
        throw new Error("Unable to read file size.");
      }

      if (!asset.width || !asset.height) {
        throw new Error("Unable to read video dimensions.");
      }

      if (!durationMs) {
        throw new Error("Unable to read video duration.");
      }

      const fileName =
        asset.fileName ?? asset.uri.split("/").pop() ?? "swing.mp4";
      const contentType = asset.mimeType ?? "video/mp4";
      const sizeBytes = fileInfo.size;

      const uploadResponse = await requestSwingUpload({
        fileName,
        contentType,
        sizeBytes,
        durationMs,
        frameRate,
        width: asset.width,
        height: asset.height,
        angle
      });

      setStatus("uploading");
      const uploadResult = await uploadToSignedUrl(
        uploadResponse.uploadUrl,
        asset.uri,
        uploadResponse.requiredHeaders
      );

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      setStatus("creating");
      await createSwing({
        videoAssetId: uploadResponse.videoAsset.id,
        visibility: "private"
      });

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Swing</Text>
      <Text style={styles.subtitle}>
        Make sure your swing meets the upload requirements before selecting a
        video.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Requirements</Text>
        <Text style={styles.cardBody}>Angle: down-the-line or face-on.</Text>
        <Text style={styles.cardBody}>Length: 3–10 seconds.</Text>
        <Text style={styles.cardBody}>Frame rate: 60 fps preferred.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Angle</Text>
        <View style={styles.angleRow}>
          {angleOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setAngle(option.value)}
              style={[
                styles.anglePill,
                angle === option.value && styles.anglePillActive
              ]}
            >
              <Text
                style={[
                  styles.angleLabel,
                  angle === option.value && styles.angleLabelActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Frame Rate</Text>
        <View style={styles.angleRow}>
          {frameRateOptions.map((rate) => (
            <Pressable
              key={rate}
              onPress={() => setFrameRate(rate)}
              style={[
                styles.anglePill,
                frameRate === rate && styles.anglePillActive
              ]}
            >
              <Text
                style={[
                  styles.angleLabel,
                  frameRate === rate && styles.angleLabelActive
                ]}
              >
                {rate} fps
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Selected Video</Text>
        <Text style={styles.cardBody}>
          {asset?.fileName ?? asset?.uri ?? "No video selected."}
        </Text>
        {asset ? (
          <Text style={styles.cardHint}>
            Duration: {durationSec || "?"}s
            {durationSec ? (meetsLength ? " (ok)" : " (outside 3–10s)") : ""}
          </Text>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status !== "idle" && status !== "error" ? (
        <Text style={styles.status}>Status: {status}</Text>
      ) : null}

      <PrimaryButton label="Select Video" onPress={pickVideo} />
      <PrimaryButton
        label={status === "done" ? "Uploaded" : "Upload"}
        onPress={handleUpload}
        disabled={!asset || !angle || !frameRate || status === "uploading"}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F1A17"
  },
  subtitle: {
    fontSize: 16,
    color: "#3C4A46"
  },
  card: {
    backgroundColor: "#F4F6F5",
    borderRadius: 12,
    padding: 16,
    gap: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  cardBody: {
    color: "#4A5B55"
  },
  cardHint: {
    color: "#5B6B66",
    fontSize: 13
  },
  angleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  anglePill: {
    borderWidth: 1,
    borderColor: "#C3CCC8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  anglePillActive: {
    backgroundColor: "#1B3A2F",
    borderColor: "#1B3A2F"
  },
  angleLabel: {
    color: "#1B3A2F",
    fontSize: 14
  },
  angleLabelActive: {
    color: "#FFFFFF"
  },
  status: {
    color: "#1B3A2F",
    fontWeight: "600"
  },
  error: {
    color: "#9A2B2B",
    fontWeight: "600"
  }
});
