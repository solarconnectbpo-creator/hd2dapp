CREATE TABLE `contentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('headline','subheading','hook','script','email','social') NOT NULL,
	`template` text NOT NULL,
	`keywords` text,
	`hashtags` text,
	`targetAudience` varchar(255),
	`platform` varchar(100),
	`campaignId` varchar(100),
	`usageCount` int NOT NULL DEFAULT 0,
	`performanceScore` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seoKeywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`searchVolume` int,
	`keywordDifficulty` int,
	`cpc` varchar(20),
	`intent` enum('informational','navigational','transactional','commercial'),
	`category` varchar(100),
	`currentRanking` int,
	`targetRanking` int,
	`serpFeatures` text,
	`relatedKeywords` text,
	`contentGenerated` boolean NOT NULL DEFAULT false,
	`blogPostId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastChecked` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seoKeywords_id` PRIMARY KEY(`id`),
	CONSTRAINT `seoKeywords_keyword_unique` UNIQUE(`keyword`)
);
