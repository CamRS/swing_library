import { describe, expect, it } from "vitest";
import { validateUploadRequest } from "../../src/lib/validation";

describe("validateUploadRequest", () => {
  it("returns errors for missing fields", () => {
    const details = validateUploadRequest({} as any);

    expect(details.fileName).toBe("required");
    expect(details.contentType).toBe("required");
    expect(details.sizeBytes).toBe("invalid");
    expect(details.durationMs).toBe("invalid");
    expect(details.frameRate).toBe("invalid");
    expect(details.width).toBe("invalid");
    expect(details.height).toBe("invalid");
    expect(details.angle).toBe("invalid");
  });

  it("accepts a valid payload", () => {
    const details = validateUploadRequest({
      fileName: "swing.mp4",
      contentType: "video/mp4",
      sizeBytes: 10,
      durationMs: 3000,
      frameRate: 60,
      width: 1080,
      height: 1920,
      angle: "down_the_line"
    });

    expect(Object.keys(details)).toHaveLength(0);
  });
});
