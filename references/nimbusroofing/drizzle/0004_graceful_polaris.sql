CREATE TABLE `uploadedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`fileType` enum('xml','pdf','xlsx','other') NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100),
	`s3Key` varchar(500) NOT NULL,
	`s3Url` varchar(500) NOT NULL,
	`uploadedBy` int,
	`projectId` int,
	`documentType` varchar(100),
	`metadata` text,
	`processingStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploadedFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validationReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`address` text,
	`reportId` varchar(100),
	`complianceScore` int NOT NULL,
	`status` enum('compliant','warnings','non-compliant') NOT NULL,
	`discrepancies` text NOT NULL,
	`codeUpgrades` text NOT NULL,
	`summary` text NOT NULL,
	`estimatedUpgradeCost` int,
	`roofMeasurements` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `validationReports_id` PRIMARY KEY(`id`)
);
