CREATE TABLE `emailDeliveryLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`to` varchar(320) NOT NULL,
	`from` varchar(320) NOT NULL,
	`subject` text NOT NULL,
	`templateType` enum('callback_confirmation','lead_notification','sms_confirmation','custom') NOT NULL,
	`status` enum('queued','sent','delivered','bounced','failed','opened','clicked') NOT NULL DEFAULT 'queued',
	`bounceReason` text,
	`failureReason` text,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`deliveredAt` timestamp,
	`bouncedAt` timestamp,
	`sentAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailDeliveryLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailDeliveryLogs_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `emailEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailLogId` int NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`event` enum('processed','delivered','bounce','dropped','deferred','open','click','spam_report','unsubscribe') NOT NULL,
	`reason` text,
	`url` text,
	`userAgent` text,
	`ip` varchar(45),
	`timestamp` timestamp NOT NULL,
	`rawPayload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailEvents_id` PRIMARY KEY(`id`)
);
