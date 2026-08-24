-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canTransferLeads" BOOLEAN NOT NULL DEFAULT true,
    "canViewAllLeads" BOOLEAN NOT NULL DEFAULT false,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "companyName" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteLead" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ENQUIRY_FORM',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "cibilScore" TEXT,
    "loanAmount" TEXT,
    "loanType" TEXT,
    "employmentType" TEXT,
    "monthlyIncome" TEXT,
    "city" TEXT,
    "state" TEXT,
    "message" TEXT,
    "preferredCallbackTime" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "cibilScore" TEXT,
    "loanAmount" DOUBLE PRECISION,
    "loanType" TEXT,
    "employmentType" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "partnerId" TEXT,
    "createdById" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CALL',
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "meta" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTransfer" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "LeadTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ISSUE',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "leadId" TEXT,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_partnerId_key" ON "User"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteLead_leadId_key" ON "WebsiteLead"("leadId");

-- CreateIndex
CREATE INDEX "WebsiteLead_phone_idx" ON "WebsiteLead"("phone");

-- CreateIndex
CREATE INDEX "WebsiteLead_source_idx" ON "WebsiteLead"("source");

-- CreateIndex
CREATE INDEX "WebsiteLead_isUrgent_idx" ON "WebsiteLead"("isUrgent");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");

-- CreateIndex
CREATE INDEX "Note_leadId_idx" ON "Note"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledAt_idx" ON "FollowUp"("scheduledAt");

-- CreateIndex
CREATE INDEX "ActivityLog_leadId_idx" ON "ActivityLog"("leadId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "LeadTransfer_leadId_idx" ON "LeadTransfer"("leadId");

-- CreateIndex
CREATE INDEX "InternalRequest_requestedById_idx" ON "InternalRequest"("requestedById");

-- CreateIndex
CREATE INDEX "InternalRequest_status_idx" ON "InternalRequest"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteLead" ADD CONSTRAINT "WebsiteLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransfer" ADD CONSTRAINT "LeadTransfer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransfer" ADD CONSTRAINT "LeadTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransfer" ADD CONSTRAINT "LeadTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTransfer" ADD CONSTRAINT "LeadTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalRequest" ADD CONSTRAINT "InternalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalRequest" ADD CONSTRAINT "InternalRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
