// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { OfferTile } from "@/components/offer-tile";
import { Toast } from "@/components/toast";
import type { Application, Job } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const job: Job = {
  id: "job-1",
  title: "Électricien bâtiment H/F",
  company: "Spie Batignolles",
  location: "Vénissieux",
  contract: "CDI",
  source: "France Travail",
  sourceLabels: ["France Travail"],
  jobUrl: "https://exemple.test/offre",
  jobDescription: null,
  postedAt: "10/09/2026",
  score: 86,
  status: "Nouveau",
};

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    jobId: "job-1",
    jobUrl: job.jobUrl,
    jobTitle: job.title,
    company: job.company,
    jobScore: job.score,
    status: "Envoyé",
    updatedAt: "11/09/2026 09:12",
    sentAt: "11/09/2026 09:12",
    assets: { letter: true, email: true, linkedIn: true },
    content: {},
    ...overrides,
  };
}

function renderTile(ui: ReactElement) {
  return render(<Toast>{ui}</Toast>);
}

describe("OfferTile", () => {
  it("avec une candidature : tampon de l'état et lien vers la fiche", () => {
    renderTile(<OfferTile job={job} application={application()} />);

    expect(screen.getByText("Envoyé")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: job.title })).toHaveAttribute(
      "href",
      "/applications/app-1",
    );
    expect(screen.queryByRole("button", { name: "Préparer ma candidature" })).toBeNull();
  });

  it("sans candidature : étiquette « Nouveau » en bleu et bouton de préparation", () => {
    renderTile(<OfferTile job={job} />);

    const chip = screen.getByText("Nouveau");
    expect(chip.className).toMatch(/bg-klein-soft/);
    expect(chip.className).toMatch(/text-klein-deep/);
    expect(screen.getByRole("button", { name: "Préparer ma candidature" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: job.title })).toBeNull();
  });

  it("affiche le score et la ligne mono entreprise · lieu · contrat · source", () => {
    renderTile(<OfferTile job={job} />);

    expect(screen.getByText("86")).toBeInTheDocument();
    expect(
      screen.getByText("Spie Batignolles · Vénissieux · CDI · France Travail"),
    ).toBeInTheDocument();
  });

  it("une candidature sans score n'affiche aucun chiffre de correspondance", () => {
    renderTile(<OfferTile job={job} application={application({ jobScore: null })} />);

    expect(screen.queryByText("correspondance")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("une candidature envoyée dont la relance est prête porte le tampon « À relancer »", () => {
    renderTile(
      <OfferTile
        job={job}
        application={application({ content: { followupEmailText: "Bonjour," } })}
      />,
    );

    expect(screen.getByText("À relancer")).toBeInTheDocument();
  });
});
