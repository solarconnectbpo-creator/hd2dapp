CREATE TABLE `agentMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(100) NOT NULL,
	`metricDate` timestamp NOT NULL DEFAULT (now()),
	`tasksCompleted` int NOT NULL DEFAULT 0,
	`tasksFailed` int NOT NULL DEFAULT 0,
	`avgExecutionTimeMs` int,
	`accuracyScore` int,
	`totalCostCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`agentName` varchar(100) NOT NULL,
	`inputData` text NOT NULL,
	`outputData` text,
	`status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`priority` int NOT NULL DEFAULT 5,
	`errorMessage` text,
	`executionTimeMs` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `agentTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fraudPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pattern` text NOT NULL,
	`patternType` varchar(50) NOT NULL,
	`category` varchar(100) NOT NULL,
	`riskWeight` int NOT NULL DEFAULT 10,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`matchCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fraudPatterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insuranceClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`leadId` int,
	`claimNumber` varchar(255),
	`insuranceCompany` varchar(255),
	`uploadedFileUrl` text NOT NULL,
	`uploadedFileName` varchar(255),
	`ocrText` text,
	`lineItems` text,
	`missingItems` text,
	`fraudScore` int NOT NULL DEFAULT 0,
	`fraudFlags` text,
	`supplierPricing` text,
	`status` enum('pending','analyzing','reviewed','approved','rejected','disputed') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNotes` text,
	`reportUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`analyzedAt` timestamp,
	`reviewedAt` timestamp,
	CONSTRAINT `insuranceClaims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierPricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`itemCategory` varchar(100),
	`supplier` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`unit` varchar(50) NOT NULL DEFAULT 'each',
	`sku` varchar(100),
	`inStock` boolean NOT NULL DEFAULT true,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierPricing_id` PRIMARY KEY(`id`)
);
