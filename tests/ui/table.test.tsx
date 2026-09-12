// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table } from "@/components/table";

describe("Table", () => {
  it("pose scope=\"col\" sur chaque en-tête", () => {
    render(
      <Table
        columns={[
          { key: "email", label: "E-mail" },
          { key: "joinedAt", label: "Inscrit le" },
        ]}
        rows={[{ email: "a@b.fr", joinedAt: "01/09/2026" }]}
      />,
    );
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header).toHaveAttribute("scope", "col");
    }
  });
});
