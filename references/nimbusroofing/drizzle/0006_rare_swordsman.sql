CREATE TABLE `aiFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`messageId` int,
	`feedbackType` enum('thumbs_up','thumbs_down','correction','clarification','conversion','abandonment') NOT NULL,
	`userComment` text,
	`systemAnalysis` text,
	`improvementSuggestion` text,
	`wasImplemented` boolean NOT NULL DEFAULT false,
	`implementedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiLearnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`learningType` enum('faq','objection','pain_point','feature_request','knowledge_gap','successful_response','failed_response','industry_insight','competitor_mention','pricing_feedback') NOT NULL,
	`category` varchar(100),
	`question` text,
	`answer` text,
	`context` text,
	`confidence` int NOT NULL DEFAULT 50,
	`frequency` int NOT NULL DEFAULT 1,
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`isValidated` boolean NOT NULL DEFAULT false,
	`validatedBy` int,
	`validatedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiLearnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system','function') NOT NULL,
	`content` text NOT NULL,
	`functionName` varchar(255),
	`functionArgs` text,
	`functionResult` text,
	`tokens` int,
	`sentiment` varchar(50),
	`intent` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeBase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`source` varchar(500),
	`sourceType` enum('web_scrape','api','manual','ai_generated','conversation') NOT NULL,
	`keywords` text,
	`relevanceScore` int NOT NULL DEFAULT 50,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsed` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeBase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stormHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255),
	`eventType` varchar(100) NOT NULL,
	`severity` enum('Minor','Moderate','Severe','Extreme') NOT NULL,
	`location` varchar(255) NOT NULL,
	`county` varchar(100),
	`state` varchar(2) NOT NULL DEFAULT 'TX',
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`description` text,
	`hailSize` varchar(50),
	`windSpeed` int,
	`damageEstimate` int,
	`leadsGenerated` int DEFAULT 0,
	`contentGenerated` boolean DEFAULT false,
	`blogPostId` int,
	`seasonalPattern` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stormHistory_id` PRIMARY KEY(`id`),
	CONSTRAINT `stormHistory_eventId_unique` UNIQUE(`eventId`)
);
