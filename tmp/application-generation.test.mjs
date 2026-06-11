import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApplicationContext,
  buildEmail,
  buildLetter,
  buildLinkedIn,
} from "../lib/application-generation.js";

const candidateProfile = {
  fullName: "Coraline Ticou",
  role: "Charge d'affaires",
  targetRole: "Charge d'affaires",
  preferredKeywords: ["charge d'affaires", "pilotage de projet"],
  location: "Toulouse",
  email: "ticoucoraline@gmail.com",
  phone: "",
  github: "",
  linkedin: "https://linkedin.com/in/coraline",
  summary:
    "Passionnee de dessin et de creation, j'aime imaginer et concevoir des espaces et coordonner des projets avec rigueur.",
  technicalSkills: ["Pilotage de projet", "Relation client", "Presentation de plans", "Coordination"],
  softSkills: ["Organisation", "Communication", "Autonomie"],
  experienceHighlights: [
    "Conception de plans et amenagements pour differents espaces.",
    "Coordination de projets et suivi des besoins clients.",
    "Presentation claire de propositions et ajustements selon les contraintes.",
  ],
  baseLetterTemplate:
    "Bonjour,\n\nJe souhaite vous proposer ma candidature car j'apprecie les environnements ou il faut comprendre un besoin, structurer les priorites et faire avancer un projet avec clarte.\n\nJe suis motivee par les postes qui demandent a la fois relationnel, rigueur et sens du concret.\n\nCordialement,\nCoraline Ticou",
};

test("buildApplicationContext changes angles depending on the offer", () => {
  const communicationJob = {
    title: "Assistant(e) Social Media & Creation de Contenu",
    company: "Believe",
    location: "Paris",
    contract: "Stage",
    source: "SmartRecruiters",
    job_description:
      "Writing and editing content in English and French, social media, storytelling, newsletters, internal campaigns and employee engagement.",
  };

  const constructionJob = {
    title: "Charge d'affaires agencement interieur",
    company: "Studio Amenagement",
    location: "Toulouse",
    contract: "CDI",
    source: "France Travail",
    job_description:
      "Suivi client, coordination des chantiers, lecture de plans, gestion des priorites, pilotage de projet et relation commerciale.",
  };

  const communicationContext = buildApplicationContext(communicationJob, candidateProfile);
  const constructionContext = buildApplicationContext(constructionJob, candidateProfile);

  assert.notDeepEqual(communicationContext.valueAngles, constructionContext.valueAngles);
  assert.match(communicationContext.missionsSummary, /social|contenu|storytelling|newsletter/i);
  assert.match(constructionContext.missionsSummary, /suivi client|chantier|plans|pilotage/i);
});

test("generated assets reuse relevant experience from the profile", () => {
  const job = {
    title: "Charge d'affaires agencement interieur",
    company: "Studio Amenagement",
    location: "Toulouse",
    contract: "CDI",
    source: "France Travail",
    job_description:
      "Suivi client, coordination des chantiers, lecture de plans, gestion des priorites et relation commerciale.",
  };

  const letter = buildLetter(job, candidateProfile);
  const email = buildEmail(job, candidateProfile);
  const linkedIn = buildLinkedIn(job, candidateProfile);

  assert.match(letter, /plans|clients|coordination/i);
  assert.match(email, /plans|clients|coordination/i);
  assert.match(linkedIn, /charge d'affaires/i);
});

test("letter generation reuses the candidate letter template tone when available", () => {
  const job = {
    title: "Charge d'affaires agencement interieur",
    company: "Studio Amenagement",
    location: "Toulouse",
    contract: "CDI",
    source: "France Travail",
    job_description:
      "Suivi client, coordination des chantiers, lecture de plans, gestion des priorites et relation commerciale.",
  };

  const letter = buildLetter(job, candidateProfile);

  assert.match(letter, /comprendre un besoin, structurer les priorites et faire avancer un projet avec clarte/i);
  assert.match(letter, /relationnel, rigueur et sens du concret/i);
});

test("letter uses a professional paragraph structure instead of a mechanical bullet list", () => {
  const job = {
    title: "Charge d'affaires agencement interieur",
    company: "Studio Amenagement",
    location: "Toulouse",
    contract: "CDI",
    source: "France Travail",
    job_description:
      "Suivi client, coordination des chantiers, lecture de plans, gestion des priorites et relation commerciale.",
  };

  const letter = buildLetter(job, candidateProfile);

  assert.match(letter, /Objet: Candidature - Charge d'affaires agencement interieur/i);
  assert.doesNotMatch(letter, /Pour ce poste, je peux apporter en priorite:\n-/i);
  assert.doesNotMatch(letter, /Ce que je retiens de votre besoin:/i);
  assert.match(letter, /Votre offre/i);
  assert.match(letter, /Je serais ravi d'echanger avec vous/i);
});

test("letter adapts its tone for alternance offers", () => {
  const job = {
    title: "Assistant charge d'affaires",
    company: "Atelier Projet",
    location: "Toulouse",
    contract: "Alternance",
    source: "France Travail",
    job_description:
      "Appui a la coordination de projets, relation client, suivi des dossiers et participation a la preparation des rendez-vous.",
  };

  const letter = buildLetter(job, candidateProfile);
  const email = buildEmail(job, candidateProfile);

  assert.match(letter, /alternance/i);
  assert.match(letter, /monter progressivement en responsabilite|apprendre vite et contribuer concretement/i);
  assert.match(email, /alternance/i);
});

test("letter adapts its tone for stage offers", () => {
  const job = {
    title: "Assistant coordination de projets",
    company: "Studio Interieur",
    location: "Bordeaux",
    contract: "Stage",
    source: "Jooble",
    job_description:
      "Participation au suivi de projets, aide a la preparation des supports, coordination et echanges avec les clients.",
  };

  const letter = buildLetter(job, candidateProfile);

  assert.match(letter, /stage/i);
  assert.match(letter, /cadre formateur|developper rapidement de bons reflexes professionnels/i);
});
