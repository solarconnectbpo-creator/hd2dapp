CREATE TABLE `automationWorkflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowName` varchar(255) NOT NULL,
	`workflowType` varchar(100) NOT NULL,
	`triggerType` varchar(100) NOT NULL,
	`triggerData` text,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`executionTimeMs` int,
	`errorMessage` text,
	`resultData` text,
	`makeScenarioId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `automationWorkflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailInbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255),
	`from` varchar(255) NOT NULL,
	`to` varchar(255) NOT NULL,
	`subject` text,
	`body` text,
	`category` enum('quote_request','complaint','general_inquiry','spam','urgent'),
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`sentiment` enum('positive','neutral','negative'),
	`aiSuggestion` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`respondedAt` timestamp,
	`respondedBy` int,
	`leadCreated` boolean NOT NULL DEFAULT false,
	`leadId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailInbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailInbox_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `phoneCalls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`twilioCallSid` varchar(100),
	`callerId` varchar(20) NOT NULL,
	`callerName` varchar(255),
	`direction` enum('inbound','outbound') NOT NULL,
	`status` enum('queued','ringing','in-progress','completed','busy','failed','no-answer') NOT NULL DEFAULT 'queued',
	`duration` int,
	`recordingUrl` text,
	`transcription` text,
	`aiSummary` text,
	`sentiment` enum('positive','neutral','negative'),
	`callType` varchar(50),
	`routedTo` varchar(100),
	`leadCreated` boolean NOT NULL DEFAULT false,
	`leadId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phoneCalls_id` PRIMARY KEY(`id`),
	CONSTRAINT `phoneCalls_twilioCallSid_unique` UNIQUE(`twilioCallSid`)
);
--> statement-breakpoint
CREATE TABLE `voicemails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneCallId` int,
	`callerId` varchar(20) NOT NULL,
	`callerName` varchar(255),
	`recordingUrl` text NOT NULL,
	`transcription` text,
	`aiSummary` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`sentiment` enum('positive','neutral','negative'),
	`isRead` boolean NOT NULL DEFAULT false,
	`respondedAt` timestamp,
	`respondedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voicemails_id` PRIMARY KEY(`id`)
);
