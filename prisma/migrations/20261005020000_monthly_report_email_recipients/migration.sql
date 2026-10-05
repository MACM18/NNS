CREATE TABLE "monthly_report_email_recipients" (
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_report_email_recipients_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "monthly_report_email_recipients_last_sent_at_idx"
    ON "monthly_report_email_recipients"("last_sent_at");
