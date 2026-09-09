import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecureVideoPlayer, toBunnyEmbedUrl } from "./SecureYouTubePlayer";

const expectedUrl = "https://player.mediadelivery.net/embed/692425/3eb1cf1d-2b7a-4f5d-8b7f-bf0d32e13e4d";

describe("toBunnyEmbedUrl", () => {
  it("accepts the Bunny Stream player embed URL stored in the database", () => {
    expect(toBunnyEmbedUrl(expectedUrl)).toBe(expectedUrl);
  });

  it("normalizes Bunny player play URLs to the Bunny player embed URL", () => {
    expect(
      toBunnyEmbedUrl("https://player.mediadelivery.net/play/692425/3eb1cf1d-2b7a-4f5d-8b7f-bf0d32e13e4d"),
    ).toBe(expectedUrl);
  });

  it("normalizes legacy Bunny iframe embed URLs to the Bunny player host", () => {
    expect(
      toBunnyEmbedUrl("https://iframe.mediadelivery.net/embed/692425/3eb1cf1d-2b7a-4f5d-8b7f-bf0d32e13e4d"),
    ).toBe(expectedUrl);
  });

  it("normalizes Bunny CDN play URLs to the Bunny player embed URL", () => {
    expect(
      toBunnyEmbedUrl("https://video.bunnycdn.com/play/692425/3eb1cf1d-2b7a-4f5d-8b7f-bf0d32e13e4d"),
    ).toBe(expectedUrl);
  });

  it("rejects unsupported non-Bunny URLs", () => {
    expect(toBunnyEmbedUrl("https://example.com/video")).toBeNull();
  });

  it("handles nullish values without throwing", () => {
    expect(toBunnyEmbedUrl(null)).toBeNull();
    expect(toBunnyEmbedUrl(undefined)).toBeNull();
  });
});

describe("SecureVideoPlayer", () => {
  it("passes the Bunny Stream URL to the iframe", () => {
    render(<SecureVideoPlayer url={expectedUrl} title="Demo class" autoplay={false} />);

    const iframe = screen.getByTitle("Demo class");
    expect(iframe).toHaveAttribute("src", expectedUrl);
    expect(iframe).toHaveAttribute("allowFullScreen");
  });
});
