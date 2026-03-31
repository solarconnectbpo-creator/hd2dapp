CREATE TABLE `automationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`triggerSource` varchar(255) NOT NULL,
	`payload` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`actionsTriggered` text,
	`errorMessage` text,
	`processingTimeMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `automationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`slug` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`seoKeywords` text,
	`metaDescription` text,
	`featuredImage` varchar(500),
	`category` varchar(100),
	`tags` text,
	`status` enum('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`generationPrompt` text,
	`publishDate` timestamp,
	`authorId` int,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `chatbotConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`userId` int,
	`messages` text NOT NULL,
	`resolved` boolean NOT NULL DEFAULT false,
	`escalatedToHuman` boolean NOT NULL DEFAULT false,
	`escalatedAt` timestamp,
	`feedback` enum('positive','negative','neutral'),
	`feedbackComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbotConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbotKnowledgeBase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(100),
	`confidence` int NOT NULL DEFAULT 0,
	`usageCount` int NOT NULL DEFAULT 0,
	`successRate` int NOT NULL DEFAULT 0,
	`source` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbotKnowledgeBase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenanceTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskName` varchar(255) NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`schedule` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRun` timestamp,
	`nextRun` timestamp,
	`lastStatus` enum('success','failed','skipped'),
	`lastDurationMs` int,
	`lastErrorMessage` text,
	`runCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceTasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenanceTasks_taskName_unique` UNIQUE(`taskName`)
);
