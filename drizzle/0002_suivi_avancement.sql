-- Suivi d'avancement partagé avec l'organisme, sur accord de l'étudiant.
--
-- share_progress : NULL = jamais répondu, true = accepté, false = refusé.
-- share_progress_at : date du dernier choix, preuve de l'accord.
-- found_company_at : date à laquelle l'étudiant a déclaré avoir trouvé une entreprise ; aucun nom
-- d'entreprise n'est stocké.
-- Le nombre de candidatures envoyées n'est pas stocké : il se calcule sur applications.sent_at.
ALTER TABLE "users" ADD COLUMN "share_progress" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_progress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "found_company_at" timestamp with time zone;
