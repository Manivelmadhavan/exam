-- AlterTable
ALTER TABLE "exams" ADD COLUMN "languages" "Language"[] NOT NULL DEFAULT '{}'::"Language"[];

-- Existing exams keep access to all languages by default
UPDATE "exams" SET "languages" = ARRAY['PYTHON','JAVA','CPP']::"Language"[];