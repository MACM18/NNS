ALTER TABLE "line_details" ALTER COLUMN "dp" DROP NOT NULL;

CREATE TABLE "line_details_revisions" (
    "id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "actor_profile_id" TEXT NOT NULL,
    "changed_fields" TEXT[] NOT NULL,
    "before_values" JSONB NOT NULL,
    "after_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_details_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "line_details_revisions_line_id_created_at_idx" ON "line_details_revisions"("line_id", "created_at");

ALTER TABLE "line_details_revisions" ADD CONSTRAINT "line_details_revisions_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "line_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "line_details_revisions" ADD CONSTRAINT "line_details_revisions_actor_profile_id_fkey"
    FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
