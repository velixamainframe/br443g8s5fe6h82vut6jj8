-- CreateTable
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "callStatus" TEXT,
    "callDuration" INTEGER,
    "callResult" TEXT,
    "feedback" TEXT,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "shouldReschedule" BOOLEAN NOT NULL DEFAULT false,
    "rescheduledAt" TIMESTAMP(3),
    "isPendingDocs" BOOLEAN NOT NULL DEFAULT false,
    "transferredToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallSession_sessionToken_key" ON "CallSession"("sessionToken");

-- CreateIndex
CREATE INDEX "CallSession_leadId_idx" ON "CallSession"("leadId");

-- CreateIndex
CREATE INDEX "CallSession_userId_idx" ON "CallSession"("userId");

-- CreateIndex
CREATE INDEX "CallSession_sessionToken_idx" ON "CallSession"("sessionToken");

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_transferredToId_fkey" FOREIGN KEY ("transferredToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
