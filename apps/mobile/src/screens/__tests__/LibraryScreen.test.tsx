import { render, waitFor } from "@testing-library/react-native";
import { LibraryScreen } from "../LibraryScreen";
import { listSwings } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  listSwings: jest.fn()
}));

describe("LibraryScreen", () => {
  it("renders the library header", async () => {
    (listSwings as jest.Mock).mockResolvedValue({ items: [], nextCursor: undefined });

    const { getByText } = render(
      <LibraryScreen navigation={{ navigate: () => {}, addListener: () => () => {} }} />
    );

    await waitFor(() => expect(getByText("Your Swing Library")).toBeTruthy());
  });
});
