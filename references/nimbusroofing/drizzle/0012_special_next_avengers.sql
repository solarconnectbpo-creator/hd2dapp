CREATE TABLE `customPrompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`promptText` text NOT NULL,
	`customizationFields` text,
	`createdBy` int NOT NULL,
	`isShared` boolean NOT NULL DEFAULT false,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customPrompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`promptId` int NOT NULL,
	`notes` text,
	`customDefaults` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptFavorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('storm_intelligence','market_research','product_research','seo_marketing','lead_management','insurance_claims','business_strategy','sales_support','emergency_operations','technology_research') NOT NULL,
	`useCase` text NOT NULL,
	`promptText` text NOT NULL,
	`customizationFields` text,
	`exampleOutput` text,
	`tags` text,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptId` int NOT NULL,
	`userId` int,
	`customizationValues` text,
	`copiedAt` timestamp NOT NULL DEFAULT (now()),
	`resultQuality` enum('excellent','good','fair','poor'),
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptUsageLogs_id` PRIMARY KEY(`id`)
);
