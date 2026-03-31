CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`permissions` text,
	`rateLimit` int DEFAULT 1000,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`totalRequests` int DEFAULT 0,
	`createdBy` varchar(255),
	`ipWhitelist` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `apiRequestLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKeyId` int,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`requestBody` text,
	`responseStatus` int,
	`responseBody` text,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`duration` int,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiRequestLogs_id` PRIMARY KEY(`id`)
);
