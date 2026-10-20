-- Ajoute la colonne de photo du membre (data URL) à la table « Membre ».
-- Colonne nullable : les membres existants n'ont pas de photo.
ALTER TABLE "Membre" ADD COLUMN "photoDataUrl" TEXT;
