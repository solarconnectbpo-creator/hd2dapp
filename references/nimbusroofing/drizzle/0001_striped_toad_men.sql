CREATE TABLE `backlinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceUrl` varchar(500) NOT NULL,
	`targetUrl` varchar(500) NOT NULL,
	`anchorText` varchar(255),
	`platform` varchar(100),
	`status` enum('active','pending','broken','removed') NOT NULL DEFAULT 'pending',
	`domainAuthority` int,
	`notes` text,
	`lastChecked` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backlinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`featuredImage` varchar(500),
	`authorId` int NOT NULL,
	`category` varchar(100),
	`tags` text,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`keywords` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogPosts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `chatConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`leadId` int,
	`visitorName` varchar(255),
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(20),
	`messages` text NOT NULL,
	`status` enum('active','converted','abandoned') NOT NULL DEFAULT 'active',
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatConversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatConversations_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`zipCode` varchar(10),
	`serviceType` varchar(100),
	`urgency` enum('low','medium','high','emergency') DEFAULT 'medium',
	`message` text,
	`source` varchar(50),
	`status` enum('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `neighborhoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`zipCodes` text,
	`description` text,
	`hoaRequirements` text,
	`averageProjectCost` int,
	`completedProjects` int NOT NULL DEFAULT 0,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`keywords` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `neighborhoods_id` PRIMARY KEY(`id`),
	CONSTRAINT `neighborhoods_name_unique` UNIQUE(`name`),
	CONSTRAINT `neighborhoods_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`projectName` varchar(255) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(20),
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`zipCode` varchar(10) NOT NULL,
	`neighborhood` varchar(100),
	`serviceType` varchar(100) NOT NULL,
	`projectValue` int,
	`status` enum('quoted','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'quoted',
	`startDate` timestamp,
	`completionDate` timestamp,
	`notes` text,
	`beforeImages` text,
	`afterImages` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`shortDescription` text,
	`fullDescription` text,
	`icon` varchar(100),
	`category` enum('residential','commercial','emergency','specialty') NOT NULL,
	`features` text,
	`pricing` text,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`keywords` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`customerName` varchar(255) NOT NULL,
	`customerLocation` varchar(100),
	`rating` int NOT NULL,
	`reviewText` text NOT NULL,
	`serviceType` varchar(100),
	`isPublished` boolean NOT NULL DEFAULT false,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`reviewDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
