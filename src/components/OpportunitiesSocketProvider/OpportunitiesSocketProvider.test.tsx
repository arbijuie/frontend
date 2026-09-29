import { render, screen } from "@testing-library/react";
import OpportunitiesSocketProvider from "./OpportunitiesSocketProvider";
import { useOpportunitiesSocket } from "../../hooks/useOpportunitiesSocket";
import { useOpportunitiesTransport } from "../../hooks/useOpportunitiesTransport";
import { OPPORTUNITIES_QUERY_KEY } from "../../api/opportunities";
import { makeTransport } from "../../test-utils/transport-fixture";

vi.mock("../../hooks/useOpportunitiesSocket", () => ({
  useOpportunitiesSocket: vi.fn(),
}));

const mockedUseSocket = vi.mocked(useOpportunitiesSocket);

const Consumer = () => {
  const { transportState } = useOpportunitiesTransport();
  return <div>{transportState}</div>;
};

describe("OpportunitiesSocketProvider", () => {
  it("opens the socket once for the opportunities cache and shares its state", () => {
    mockedUseSocket.mockReturnValue(makeTransport({ transportState: "connected" }));

    render(
      <OpportunitiesSocketProvider>
        <Consumer />
      </OpportunitiesSocketProvider>
    );

    expect(screen.getByText("connected")).not.toBeNull();
    expect(mockedUseSocket).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: OPPORTUNITIES_QUERY_KEY })
    );
  });
});
