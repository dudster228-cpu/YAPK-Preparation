CREATE TABLE `translation_overrides` (
  `unit` text NOT NULL,
  `term` text NOT NULL,
  `ru` text NOT NULL,
  PRIMARY KEY (`unit`, `term`)
);
