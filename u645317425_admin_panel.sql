-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 13, 2026 at 08:20 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u645317425_admin_panel`
--

-- --------------------------------------------------------

--
-- Table structure for table `addons`
--

CREATE TABLE `addons` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `advice_requests`
--

CREATE TABLE `advice_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `preferred_time` datetime DEFAULT NULL,
  `message` text DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `advice_requests`
--

INSERT INTO `advice_requests` (`id`, `student_id`, `consultant_id`, `preferred_time`, `message`, `feedback`, `file_path`, `status`, `created_at`, `updated_at`) VALUES
(9, 45, 69, '2026-02-24 17:46:00', 'brffgsgfbfd', 'gfgngngngfnfn', 'advice/T9Aoxkzu2K2Lm8NXqI9ACmRQrCHuMvvcQsBtjaOX.docx', 'approved', '2026-02-23 12:16:35', '2026-02-23 12:18:15');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_test_reminders`
--

CREATE TABLE `appointment_test_reminders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_test_reminders`
--

INSERT INTO `appointment_test_reminders` (`id`, `student_id`, `title`, `appointment_date`, `appointment_time`, `description`, `status`, `file_path`, `created_at`, `updated_at`) VALUES
(7, 39, 'sdfsfsd', '2026-02-27', '15:18:00', 'go for check up', 'pending', NULL, '2026-02-23 03:43:57', '2026-02-23 11:53:03'),
(8, 45, 'Blood test', '2026-02-23', '17:26:00', 'cdcddvdsvd', 'pending', 'appointment_files/AJTjp4EQ88Z7RCKvWI6FVIn3bEhdEQFwYwIVHtly.pdf', '2026-02-23 11:56:55', '2026-02-23 11:56:55');

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `assignment_link` varchar(255) DEFAULT NULL,
  `assignment_category` varchar(255) DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `status` enum('active','deactive') NOT NULL DEFAULT 'active',
  `assignment_status` enum('pending','submitted','approved','rejected') DEFAULT NULL,
  `marks_obtained` varchar(100) DEFAULT NULL,
  `total_marks` varchar(100) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `quiz_for` varchar(100) NOT NULL DEFAULT 'quiz',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `student_id`, `title`, `description`, `assignment_link`, `assignment_category`, `deadline`, `status`, `assignment_status`, `marks_obtained`, `total_marks`, `updated_at`, `created_by`, `quiz_for`, `created_at`) VALUES
(1, 20, 'Math matices', 'Page layouts look better with something in each section. ', 'http://127.0.0.1:8000/assignments/create', NULL, '2025-12-10', 'active', 'pending', NULL, NULL, '2025-12-09 17:43:42', NULL, 'quiz', '2025-12-07 06:04:52'),
(2, 20, 'Hindi', 'Page layouts look better with something in each section. ', 'https://www.amazon.in/', NULL, '2025-12-18', 'active', '', NULL, NULL, '2025-12-14 07:04:21', NULL, 'quiz', '2025-12-07 06:04:52'),
(3, 20, 'Finance', 'Page layouts look better with something in each section. ', 'https://www.amazon.in/', NULL, '2025-12-22', 'active', 'pending', NULL, NULL, '2025-12-17 07:04:21', NULL, 'game_quiz', '2025-12-17 06:04:52'),
(4, 20, 'fgkdm', 'fdoildgj fdjlkgvj dklgjv lkd,jvlk,jgldskckjlkl', 'http://127.0.0.1:8000/assignments/create', NULL, '2025-12-31', 'active', '', NULL, NULL, '2025-12-21 12:33:20', NULL, 'quiz', '2025-12-21 18:02:33'),
(5, 24, 'Science', 'this is a science quiz', 'https://snuadmissions.com/?utm_source=SEO&utm_medium=Organic&utm_campaign=WebAdmissionPage', 'other', '2026-01-15', 'active', 'pending', '01', '100', '2026-01-13 18:54:31', NULL, 'game_quiz', '2026-01-13 18:40:55'),
(6, 18, 'English Speaking', NULL, 'https://snuadmissions.com/?utm_source=SEO&utm_medium=Organic&utm_campaign=WebAdmissionPage', 'finance', '2026-01-14', 'active', 'pending', NULL, NULL, '2026-01-13 18:55:16', NULL, 'game_quiz', '2026-01-13 18:48:39'),
(7, 7, 'English', 'okay', 'https://snuadmissions.com/?utm_source=SEO&utm_medium=Organic&utm_campaign=WebAdmissionPage', 'other', '2026-02-07', 'active', 'submitted', NULL, NULL, '2026-01-31 11:45:31', NULL, 'quiz', '2026-01-13 18:50:39'),
(8, 24, 'GK', NULL, 'https://snuadmissions.com/?utm_source=SEO&utm_medium=Organic&utm_campaign=WebAdmissionPage', 'other', '2026-01-14', 'deactive', 'pending', NULL, NULL, '2026-01-13 18:53:07', NULL, 'quiz', '2026-01-13 18:51:55'),
(17, 33, 'jaimataji', 'jaimataji', 'https://meet.google.com/', 'course', '2026-02-10', 'active', 'pending', NULL, NULL, '2026-02-08 12:17:52', NULL, 'quiz', '2026-02-08 12:17:09'),
(18, 33, 'adcadsc', 'jiamtaji', 'https://meet.google.com/', 'finance', '2026-02-17', 'active', 'submitted', '100', '1000', '2026-02-08 12:40:56', NULL, 'game_quiz', '2026-02-08 12:18:16'),
(19, 33, 'delhisehu', 'delhisehu', 'https://meet.google.com/', 'finance', '2026-02-10', 'active', 'submitted', NULL, NULL, '2026-02-08 12:50:57', NULL, 'quiz', '2026-02-08 12:27:56'),
(20, 33, 'nhimumbaisehu', 'nhimumbaisehu', 'https://meet.google.com/', 'finance', '2026-02-18', 'active', 'submitted', NULL, NULL, '2026-02-08 12:28:49', NULL, 'game_quiz', '2026-02-08 12:28:37'),
(21, 33, 'toperytest', NULL, 'https://meet.google.com/was-eoji-kxy', 'course', '2026-02-10', 'active', 'submitted', '40', '100', '2026-02-08 17:32:59', NULL, 'quiz', '2026-02-08 17:31:54'),
(22, 39, 'subject course', 'Fill', 'https://www.opera.com/?utm_source=bing&utm_medium=pa&utm_campaign=India%20-%20Brand%20-%20EN&msclkid=357952b0579913a0920b3b2a5bef70f4&utm_term=Opera&utm_content=Brand%20-%20Exact', 'course', '2026-02-23', 'active', 'submitted', '66', '123', '2026-02-21 20:11:52', 64, 'quiz', '2026-02-21 19:51:08'),
(24, 39, 'Game course', 'hlo', 'https://www.opera.com/?utm_source=bing&utm_medium=pa&utm_campaign=India%20-%20Brand%20-%20EN&msclkid=357952b0579913a0920b3b2a5bef70f4&utm_term=Opera&utm_content=Brand%20-%20Exact', 'course', '2026-02-23', 'deactive', 'submitted', '8', '100', '2026-02-22 15:47:24', 64, 'game_quiz', '2026-02-21 19:52:45'),
(25, 39, 'Game finance', 'hlo', 'https://www.opera.com/?utm_source=bing&utm_medium=pa&utm_campaign=India%20-%20Brand%20-%20EN&msclkid=357952b0579913a0920b3b2a5bef70f4&utm_term=Opera&utm_content=Brand%20-%20Exact', 'finance', '2026-02-23', 'active', 'submitted', '55', '99', '2026-02-21 20:06:09', 64, 'game_quiz', '2026-02-21 19:53:27'),
(26, 39, 'Select other', NULL, 'https://www.opera.com/?utm_source=bing&utm_medium=pa&utm_campaign=India%20-%20Brand%20-%20EN&msclkid=357952b0579913a0920b3b2a5bef70f4&utm_term=Opera&utm_content=Brand%20-%20Exact', 'other', '2026-02-23', 'deactive', 'submitted', NULL, NULL, '2026-02-21 20:07:31', 64, 'quiz', '2026-02-21 19:54:01'),
(27, 39, 'game other', 'hlo', 'https://www.opera.com/?utm_source=bing&utm_medium=pa&utm_campaign=India%20-%20Brand%20-%20EN&msclkid=357952b0579913a0920b3b2a5bef70f4&utm_term=Opera&utm_content=Brand%20-%20Exact', 'other', '2026-02-23', 'active', 'submitted', '55', '60', '2026-02-21 20:07:19', 64, 'game_quiz', '2026-02-21 19:54:43'),
(28, 41, 'sahi hai', 'https://meet.google.com/was-eoji-kxy', 'https://meet.google.com/was-eoji-kxy', 'finance', '2026-02-25', 'active', 'submitted', '50', '100', '2026-02-23 18:08:14', 64, 'quiz', '2026-02-23 17:29:15'),
(29, 41, 'qedcwe', 'https://meet.google.com/was-eoji-kxy', 'https://meet.google.com/was-eoji-kxy', 'course', '2026-02-26', 'deactive', 'pending', NULL, NULL, '2026-02-23 17:29:33', 64, 'quiz', '2026-02-23 17:29:33'),
(30, 41, 'real quiz', 'I don\'t know', 'https://meet.google.com/', 'course', '2026-03-07', 'active', 'pending', NULL, NULL, '2026-02-28 00:46:51', 64, 'quiz', '2026-02-28 00:46:13');

-- --------------------------------------------------------

--
-- Table structure for table `certificates`
--

CREATE TABLE `certificates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `certificate_file` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `certificates`
--

INSERT INTO `certificates` (`id`, `title`, `student_id`, `consultant_id`, `certificate_file`, `created_at`, `updated_at`) VALUES
(13, '12345', 39, 64, 'certificates/aqeLkNdZFWt0vZDlFN31YAtKvlyyjIWAcd05FuIr.pdf', '2026-02-22 15:27:43', '2026-02-22 15:27:43'),
(14, 'htrhtht', 45, 69, 'certificates/ih7amoNwjAX3ElNvnX1bAvm3NwL7leqpDZutrr9m.pdf', '2026-02-23 12:21:23', '2026-02-23 12:21:23');

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `receiver_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chats`
--

INSERT INTO `chats` (`id`, `sender_id`, `receiver_id`, `title`, `description`, `path`, `created_at`, `updated_at`) VALUES
(16, 65, 64, 'How r u', 'I need data of all the students', 'chatFiles/BgloDhWBrK523bAblq0EEMcEvwdmuzVJW0w31xGA.jpg', '2026-02-21 10:54:59', '2026-02-21 10:54:59'),
(19, 64, 65, 'bavsv', NULL, NULL, '2026-02-21 10:58:47', '2026-02-21 10:58:47'),
(20, 64, 65, 'palakkk', NULL, NULL, '2026-02-21 10:59:08', '2026-02-21 10:59:08'),
(21, 64, 65, 'papaka', NULL, NULL, '2026-02-21 10:59:17', '2026-02-21 10:59:17'),
(22, 64, 65, 'pakolsk', NULL, NULL, '2026-02-21 10:59:25', '2026-02-21 10:59:25'),
(23, 65, 64, 'Ajbab', 'anxnlxn', NULL, '2026-02-21 10:59:34', '2026-02-21 10:59:34'),
(24, 64, 65, 'palakajn', NULL, NULL, '2026-02-21 10:59:35', '2026-02-21 10:59:35'),
(25, 64, 65, 'apalaka', NULL, NULL, '2026-02-21 10:59:46', '2026-02-21 10:59:46'),
(26, 64, 65, 'aplaksjs', NULL, NULL, '2026-02-21 10:59:54', '2026-02-21 10:59:54'),
(27, 65, 64, 'jjj', 'mjj', NULL, '2026-02-21 10:59:56', '2026-02-21 10:59:56'),
(28, 64, 65, 'plalaka', NULL, NULL, '2026-02-21 11:00:12', '2026-02-21 11:00:12'),
(29, 65, 64, 'iuuu', 'nhhj', NULL, '2026-02-21 11:00:12', '2026-02-21 11:00:12'),
(30, 65, 64, 'hhhh', 'edge', NULL, '2026-02-21 11:00:26', '2026-02-21 11:00:26'),
(31, 65, 64, 'hhh', 'hhh', NULL, '2026-02-21 11:00:39', '2026-02-21 11:00:39'),
(32, 65, 69, 'hlo', 'bye', NULL, '2026-02-21 11:51:29', '2026-02-21 11:51:29'),
(33, 66, 69, 'hlo', 'hhhhhhh', NULL, '2026-02-21 19:08:18', '2026-02-21 19:08:18'),
(34, 66, 69, 'huiiii', 'gjgmbmbb', 'chatFiles/l95mbGUV2G3E68YyGlKV8lZHoqoZ65qb4fvl8kAE.png', '2026-02-21 19:08:57', '2026-02-21 19:08:57'),
(35, 64, 65, 'ds', NULL, NULL, '2026-02-22 15:10:41', '2026-02-22 15:10:41'),
(36, 66, 69, 'wcw', 'werwf', NULL, '2026-02-22 15:10:41', '2026-02-22 15:10:41'),
(37, 66, 64, 'dsd', NULL, NULL, '2026-02-28 02:29:04', '2026-02-28 02:29:04');

-- --------------------------------------------------------

--
-- Table structure for table `chat_files`
--

CREATE TABLE `chat_files` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`id`, `name`, `code`, `description`, `status`, `created_at`, `updated_at`) VALUES
(40, '12th', '12', NULL, 'active', '2026-02-21 11:03:29', '2026-02-21 11:03:29'),
(41, '11th', '11', NULL, 'active', '2026-02-21 18:00:13', '2026-02-21 18:00:13');

-- --------------------------------------------------------

--
-- Table structure for table `class_bookings`
--

CREATE TABLE `class_bookings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `teacher_id` bigint(20) UNSIGNED NOT NULL,
  `class_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `complains`
--

CREATE TABLE `complains` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL,
  `school_id` bigint(20) UNSIGNED DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `complains`
--

INSERT INTO `complains` (`id`, `teacher_id`, `school_id`, `consultant_id`, `title`, `description`, `file_path`, `created_at`, `updated_at`) VALUES
(6, 66, 63, 69, 'hajksdkja', 'sfsfsd', NULL, '2026-02-22 12:53:11', '2026-02-22 12:53:11'),
(7, 73, 67, 69, 'asdads', 'sfsfd', NULL, '2026-02-22 12:53:30', '2026-02-22 12:53:30');

-- --------------------------------------------------------

--
-- Table structure for table `consultant_profiles`
--

CREATE TABLE `consultant_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `consultant_student`
--

CREATE TABLE `consultant_student` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `subscription_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `consultent_student_documents`
--

CREATE TABLE `consultent_student_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscriptions_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`documents`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `consultent_student_documents`
--

INSERT INTO `consultent_student_documents` (`id`, `subscriptions_id`, `title`, `description`, `documents`, `created_at`, `updated_at`, `is_published`, `consultant_id`, `student_id`) VALUES
(9, 2, 'abc abc abc', 'ac bac abc baiba', '[\"consultantStudentDocument\\/documents\\/1769019117_TEST PDF.pdf\"]', '2026-01-21 18:11:57', '2026-01-21 18:11:57', 0, 19, 7);

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` bigint(20) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `user_type` varchar(50) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contact_messages`
--

INSERT INTO `contact_messages` (`id`, `full_name`, `email`, `phone`, `user_type`, `subject`, `message`, `created_at`) VALUES
(1, 'Test Name', 'test@gmail.com', '8888888888', 'school', 'abc ba cba c', 'jihi ioib oibnoib wefbiw', '2026-01-31 17:46:21'),
(2, 'test ', 'test2@gmail.com', '7788778878', 'parent', 'uuun ujb j sd kjsfds', 'fsfsfsfsfdsf x dgfdgfd', '2026-01-31 17:52:10'),
(3, 'bfsub', 'bubui@fbab.com', '3459843598', 'parent', 'geyubuf ', 'kjbu ', '2026-01-31 18:03:50'),
(4, 'hhhs ', 'qnno@gmail.co', '4353535345', 'parent', 'retre ege', 'vdggdfgd', '2026-01-31 18:06:43'),
(5, 'innini', 'inde@fon.com', '3453654353', 'parent', 'buibb  fsdf', 'ib kj fsdf wdsfsd', '2026-01-31 18:07:21'),
(6, 'Rishabh', 'rishabh@abc', '2342342342', 'parent', 'Urgent', 'need demo', '2026-02-04 14:14:16'),
(7, 'AndrewTut', 'no.reply.Lars-OlofOlsson@gmail.com', '7358511757', 'other', 'Giving feedback through the feedback form.', 'Salutations! wiserwits.in \r\n \r\nDid you know that it is possible to send business offer lawfully? \r\nWhen such business proposals are sent, no personal data is used, and messages are sent to forms specifically designed to receive messages and appeals securely. It is improbable for Feedback Forms messages to be marked as junk, since they are taken into great consideration. \r\nYou can now test out our service without having to pay. \r\nWe are able to dispatch up to 50,000 messages on your behalf. \r\n \r\nThe cost of sending one million messages is $59. \r\n \r\nThis letter is automatically generated. \r\n \r\nContact us. \r\nTelegram - https://t.me/FeedbackFormEU \r\nWhatsApp - +375259112693 \r\nWhatsApp  https://wa.me/+375259112693 \r\nWe only use chat for communication.', '2026-03-05 05:15:26');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `class_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `duration_hours` int(10) UNSIGNED DEFAULT NULL,
  `level` varchar(255) NOT NULL DEFAULT 'beginner',
  `image` varchar(255) DEFAULT NULL,
  `video_old` varchar(255) DEFAULT NULL,
  `videos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`videos`)),
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`documents`)),
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `type_of_course` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `title`, `slug`, `created_by`, `class_id`, `description`, `price`, `duration_hours`, `level`, `image`, `video_old`, `videos`, `documents`, `is_published`, `created_at`, `updated_at`, `type_of_course`) VALUES
(58, 'gen. know.', 'gen-know', 77, NULL, 'adjahf uafhiajwflqj7376764666576&%^*))&*', 0.00, 40, 'intermediate', 'courses/images/jKW8syWtFD4cgJ8kNLI93GuOjGjLE9g5DloVcWEO.png', NULL, '[]', '\"[\\\"courses\\\\\\/documents\\\\\\/vdB0i6XyP0bE5skhwyf4wQLxkmE0u5zsUzkSrKMb.pdf\\\"]\"', 0, '2026-02-23 11:32:13', '2026-02-23 11:32:47', 'course'),
(59, 'eng', 'eng', 77, NULL, 'dqwertyuioiuyds!@#$%^^345rfv', 0.00, NULL, 'intermediate', 'courses/images/G8C9i7wavoQ83cxBJQc04zeoPgiijaChUe3mMp0f.png', NULL, '[\"courses\\/videos\\/t8uI4x676X7Pi7bjyUTChKTpMj5zyJJPNZNIsav7.mp4\"]', '\"[\\\"courses\\\\\\/documents\\\\\\/LU6niMsQjd51ljVb0x90Yo3D7wKBL1IcYo2j1XTk.pdf\\\"]\"', 0, '2026-02-23 11:35:20', '2026-02-23 11:35:20', 'language'),
(60, 'AAASSS', 'aaasss', 23, NULL, 'cvbfxbfdbfdbdfdbfdbfd', 500.00, NULL, 'advanced', 'courses/images/MHlDW61GiIsZWma7pqbiiSenz1A4vSq7GnNFxHgZ.png', NULL, '[]', '\"[\\\"courses\\\\\\/documents\\\\\\/GQkwUrcaXeU26Hcw1KjHs9nhSVidoWAYHjsoyMEg.pdf\\\"]\"', 1, '2026-02-23 11:37:20', '2026-02-23 11:47:49', 'course'),
(61, 'new_courses', 'new-courses', 79, NULL, 'dqeqde. wdc sd', 0.00, 12, 'intermediate', 'courses/images/AKN7OeU7KkDemSwuIBP1fYk9RtLf1O7SgufHD7eO.png', NULL, '[]', '\"[]\"', 0, '2026-02-23 17:01:25', '2026-02-23 17:01:25', 'course');

-- --------------------------------------------------------

--
-- Table structure for table `course_feedback`
--

CREATE TABLE `course_feedback` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `course_id` bigint(20) UNSIGNED NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `feedback` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_feedback`
--

INSERT INTO `course_feedback` (`id`, `student_id`, `course_id`, `rating`, `feedback`, `created_at`, `updated_at`) VALUES
(6, 45, 60, 5, 'cbxbfdbdb', '2026-02-23 12:03:38', '2026-02-23 12:03:38');

-- --------------------------------------------------------

--
-- Table structure for table `diet_plan`
--

CREATE TABLE `diet_plan` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `shared_by_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `share_date` date NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `valid_upto` date NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diet_plan`
--

INSERT INTO `diet_plan` (`id`, `student_id`, `shared_by_id`, `title`, `share_date`, `file_path`, `valid_upto`, `created_at`, `updated_at`, `description`) VALUES
(12, 39, 64, 'sdfsfsf', '2026-03-11', NULL, '2026-03-14', '2026-02-23 03:38:28', '2026-02-23 03:38:28', NULL),
(13, 45, 69, '1st', '2026-02-23', 'students/P9v0F34vq4ioj6BjvQhSVHtlhK9ukhodhqEG13LH.pdf', '2026-02-25', '2026-02-23 11:50:43', '2026-02-23 11:50:43', '1st plan');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_consultations`
--

CREATE TABLE `doctor_consultations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `patient_name` varchar(255) NOT NULL,
  `problem` text NOT NULL,
  `doctor_name` varchar(255) DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `symptoms` text DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled') DEFAULT 'scheduled',
  `feedback` text DEFAULT NULL,
  `file_path` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_consultations`
--

INSERT INTO `doctor_consultations` (`id`, `student_id`, `patient_name`, `problem`, `doctor_name`, `scheduled_at`, `symptoms`, `status`, `feedback`, `file_path`, `created_at`, `updated_at`) VALUES
(8, 40, 'main hu doctor', 'nhi likhuga', NULL, '2026-02-16 00:08:00', 'mujhe chahiye doctor', 'completed', 'kya likhu teri yaad mein', 'doctorDoc/WxRJllniCzQ5Ig2p2AviQUnFoeqzAcszAX7Avk4T.pdf', '2026-02-22 15:35:47', '2026-02-22 15:36:35'),
(9, 45, 'Sarthak', 'csddvcvv', NULL, '2026-02-23 18:27:00', 'c c c c c', 'scheduled', NULL, NULL, '2026-02-23 11:57:32', '2026-02-23 11:57:32');

-- --------------------------------------------------------

--
-- Table structure for table `exam_report_cards`
--

CREATE TABLE `exam_report_cards` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `exam` varchar(100) DEFAULT NULL,
  `exam_date` date DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `marks_obtained` int(11) DEFAULT NULL,
  `max_marks` int(11) DEFAULT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exam_report_cards`
--

INSERT INTO `exam_report_cards` (`id`, `student_id`, `created_by`, `exam`, `exam_date`, `subject`, `marks_obtained`, `max_marks`, `grade`, `file_path`, `description`, `created_at`, `updated_at`) VALUES
(9, 39, 64, 'sdff', '2026-02-26', 'sfsfsd', 234, 500, 'D', NULL, NULL, '2026-02-23 03:47:51', '2026-02-23 03:47:51');

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `features`
--

CREATE TABLE `features` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lab_reports`
--

CREATE TABLE `lab_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `shared_by_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `share_date` date NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `valid_upto` date NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lab_reports`
--

INSERT INTO `lab_reports` (`id`, `student_id`, `shared_by_id`, `title`, `share_date`, `file_path`, `valid_upto`, `created_at`, `updated_at`, `description`) VALUES
(7, 39, 64, 'sfsfdsfsf', '2026-03-06', 'students/iRz1mc4NB0sFLlkcOh4FZHdymASD533dKicjV4gL.pdf', '2026-02-25', '2026-02-23 03:39:44', '2026-02-23 03:39:44', 'fsfdsfd'),
(8, 45, 69, '1st', '2026-02-24', 'students/q96wamcPNItvrXwLdGhTBFUcYUY9c8FP1jdTKz6Z.docx', '2026-02-25', '2026-02-23 11:51:43', '2026-02-23 11:51:43', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `live_classes`
--

CREATE TABLE `live_classes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `host_name` varchar(255) DEFAULT NULL,
  `student_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`student_ids`)),
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `class_type` enum('live','on-demand') DEFAULT 'live',
  `start_time` datetime DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `join_link` varchar(500) DEFAULT NULL,
  `status` enum('awaited','ongoing','completed') DEFAULT 'awaited',
  `recording_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `live_classes`
--

INSERT INTO `live_classes` (`id`, `course_id`, `title`, `description`, `host_name`, `student_ids`, `consultant_id`, `class_type`, `start_time`, `duration_minutes`, `join_link`, `status`, `recording_url`, `created_at`, `updated_at`) VALUES
(9, NULL, 'sdfsfs', NULL, 'fsdfs', '[\"39\"]', 64, 'live', '2026-02-26 08:00:00', 45, 'https://meet.google.com/', 'awaited', NULL, '2026-02-23 03:53:33', '2026-02-23 03:53:33'),
(10, NULL, 'sdfsf', NULL, 'fsdf', '[\"39\"]', 64, 'live', '2026-02-26 13:39:00', 32, 'https://meet.google.com/', 'awaited', NULL, '2026-02-23 04:05:35', '2026-02-23 04:05:35'),
(11, NULL, 'asdxas', 'adadas', 'assasa', '[\"41\"]', 64, 'live', '2026-02-23 02:05:00', 35, 'https://meet.google.com/was-eoji-kxy', 'awaited', NULL, '2026-02-23 17:33:00', '2026-02-23 17:33:00'),
(12, NULL, 'hello new', 'ascsacsa', 'sarthak', '[\"41\"]', 64, 'live', '2026-02-24 23:41:00', 20, 'https://meet.google.com/was-eoji-kxy', 'completed', NULL, '2026-02-23 18:11:25', '2026-02-23 18:12:37');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2014_10_12_200000_add_two_factor_columns_to_users_table', 1),
(4, '2019_08_19_000000_create_failed_jobs_table', 1),
(5, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(6, '2025_07_10_131016_create_sessions_table', 1),
(7, '2025_08_05_165540_create_products_table', 2),
(8, '2025_08_29_023431_create_roles_table', 3),
(9, '2025_08_30_132718_create_classes_table', 4),
(10, '2025_08_30_132857_create_students_table', 5),
(11, '2025_08_30_132737_create_sections_table', 6),
(12, '2025_08_31_041353_create_permissions_table', 7),
(13, '2025_07_10_145218_create_sessions_table', 8),
(14, '2025_09_01_200529_create_consultant_profiles_table', 8),
(15, '2025_09_01_200657_create_school_profiles_table', 8),
(16, '2025_09_01_200743_create_teacher_profiles_table', 8),
(17, '2025_09_01_200818_create_plans_table', 8),
(18, '2025_09_01_200844_create_student_subscriptions_table', 8),
(19, '2025_09_01_200913_create_addons_table', 8),
(20, '2025_09_01_200935_create_student_addons_table', 8),
(21, '2025_09_01_201055_create_teacher_availability_table', 8),
(22, '2025_09_01_201144_create_class_bookings_table', 8),
(23, '2025_09_03_172409_create_features_table', 9),
(24, '2025_09_07_031121_create_courses_table', 10),
(25, '2025_09_07_033604_add_class_id_to_courses_table', 11),
(26, '2025_09_07_050822_add_created_by_to_courses_table', 12);

-- --------------------------------------------------------

--
-- Table structure for table `parent_call_summaries`
--

CREATE TABLE `parent_call_summaries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `summary` text DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parent_call_summaries`
--

INSERT INTO `parent_call_summaries` (`id`, `student_id`, `consultant_id`, `summary`, `attachments`, `created_at`, `updated_at`) VALUES
(4, 33, 55, 'sdvdxsvfds', '[]', '2026-02-08 09:12:24', '2026-02-08 09:12:24'),
(5, 33, 55, 'fsvdf', '[\"1770542076_698853fce6288.pdf\"]', '2026-02-08 09:14:36', '2026-02-08 09:14:36'),
(6, 33, 55, 'xc vcx xc x', '[\"1770542095_6988540f530ac.pdf\"]', '2026-02-08 09:14:55', '2026-02-08 09:14:55'),
(7, 32, 55, 'asxsaxsa', '[\"1770572838_6988cc26a66f7.pdf\"]', '2026-02-08 17:47:18', '2026-02-08 17:47:18'),
(8, 32, 55, 'qwertyui', '[\"1770572852_6988cc34886fe.png\"]', '2026-02-08 17:47:32', '2026-02-08 17:47:32'),
(9, 45, 69, 'fbdhthttfgfgf', '[]', '2026-02-23 12:10:11', '2026-02-23 12:10:11'),
(10, 45, 69, 'dfbrrsgsgdsdsvds', '[]', '2026-02-23 12:10:56', '2026-02-23 12:10:56');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_requests`
--

CREATE TABLE `password_reset_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `status` enum('pending','completed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_requests`
--

INSERT INTO `password_reset_requests` (`id`, `student_id`, `email`, `status`, `created_at`, `updated_at`) VALUES
(4, 40, 'Sarthak99@gmail.com', 'completed', '2026-02-22 14:30:10', '2026-02-22 14:30:26');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_show` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `plans`
--

CREATE TABLE `plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_id` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`course_id`)),
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int(11) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `questionnaires`
--

CREATE TABLE `questionnaires` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `teacher_id` bigint(20) UNSIGNED NOT NULL,
  `school_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('pending_review','approved','rejected','published') NOT NULL DEFAULT 'pending_review',
  `consultant_remark` text DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `questionnaires`
--

INSERT INTO `questionnaires` (`id`, `teacher_id`, `school_id`, `student_id`, `consultant_id`, `title`, `description`, `file_path`, `status`, `consultant_remark`, `type`, `created_at`, `updated_at`) VALUES
(28, 66, 63, 40, 64, 'sdfsd', 'sdfsf', NULL, 'approved', NULL, 'academic_performance', '2026-02-22 14:17:11', '2026-02-22 14:24:43'),
(29, 66, 63, 39, 64, 'sdfsf', 'sdfsdf', NULL, 'pending_review', NULL, 'mental_parameters', '2026-02-22 14:33:57', '2026-02-22 14:59:04'),
(30, 66, 63, 41, 64, 'dsda', 'sdfdsfs', NULL, 'approved', NULL, 'academic_performance', '2026-02-28 02:07:07', '2026-02-28 02:08:44'),
(31, 66, 63, 41, 64, 'fdsfs1', NULL, NULL, 'approved', NULL, 'mental_parameters', '2026-02-28 02:09:56', '2026-02-28 02:10:20'),
(32, 66, 63, 41, 64, 'fsdfdsf', 'fsfs', 'questionnaires/6TBTv8NAFCqqpuAVnmF25WvzMP62tmvSMStkhH1M.pdf', 'pending_review', NULL, 'mental_parameters', '2026-03-06 17:54:53', '2026-03-06 17:54:53');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `slug`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'super-admin', '2025-08-29 22:17:30', '2025-08-29 22:17:30'),
(2, 'Admin', 'admin', '2025-08-29 22:24:20', '2025-08-29 22:24:20'),
(3, 'Consultant', 'consultant', '2025-08-29 22:25:45', '2025-08-29 22:25:45'),
(4, 'School', 'school', '2025-08-29 22:26:52', '2025-08-29 22:26:52'),
(5, 'School Teacher', 'school-teacher', '2025-08-29 22:27:05', '2025-08-29 22:27:05'),
(6, 'Individual Teacher', 'individual-teacher', '2025-08-29 22:27:23', '2025-08-29 22:27:23');

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `school_code` varchar(50) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `additional_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_info`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_profiles`
--

CREATE TABLE `school_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_teachers`
--

CREATE TABLE `school_teachers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `school_id` bigint(20) UNSIGNED NOT NULL,
  `teacher_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`teacher_ids`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_teachers`
--

INSERT INTO `school_teachers` (`id`, `school_id`, `teacher_ids`, `created_at`, `updated_at`) VALUES
(4, 52, '[59,60,62]', '2026-02-08 08:32:43', '2026-02-08 17:16:54'),
(5, 67, '[\"65\",\"73\",74,75]', '2026-02-21 10:34:48', '2026-02-22 18:17:06'),
(6, 63, '[\"66\",76]', '2026-02-21 11:23:19', '2026-02-23 03:17:12'),
(7, 70, '[\"71\"]', '2026-02-22 12:15:10', '2026-02-22 12:15:10');

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `class_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `room_no` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `class_id`, `name`, `room_no`, `status`, `created_at`, `updated_at`) VALUES
(46, 40, '12th A', NULL, 'active', '2026-02-21 11:03:41', '2026-02-21 11:03:41'),
(48, 41, '11 a', NULL, 'active', '2026-02-22 12:29:45', '2026-02-22 12:29:45');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` text NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `alternate_phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `guardian_name` varchar(255) DEFAULT NULL,
  `guardian_phone` varchar(20) DEFAULT NULL,
  `guardian_email` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','graduated','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `height` varchar(100) DEFAULT NULL,
  `weight` varchar(100) DEFAULT NULL,
  `blood_group` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `created_by`, `consultant_id`, `first_name`, `last_name`, `middle_name`, `gender`, `date_of_birth`, `email`, `password`, `phone`, `alternate_phone`, `address`, `city`, `state`, `country`, `postal_code`, `father_name`, `mother_name`, `guardian_name`, `guardian_phone`, `guardian_email`, `profile_image`, `status`, `created_at`, `updated_at`, `deleted_at`, `height`, `weight`, `blood_group`) VALUES
(39, 23, 69, 'Rishabh', 'Arya', NULL, 'Male', '1999-12-12', 'Rishabhstudent@gmail.com', '$2y$10$cmzC.hNCvhG6DczChbHCreQcNM2cCXwV0jxy8CfOFcD7WARu3kfDu', '9785666512', NULL, 'Kumher', 'deeg', 'Rajasthan', 'India', '321001', 'Satyendra singh', 'Usha devi', NULL, '8954347787', 'RK#$5@gmail.com', NULL, 'inactive', '2026-02-21 11:06:23', '2026-02-23 04:08:27', NULL, '176', '85', 'b+'),
(40, 67, 64, 'Sarthak', 'Jain', NULL, NULL, NULL, 'Sarthak99@gmail.com', '$2y$10$rbU1JKwrsrsDex8FhIeyrORlTbc7l3OLkvJh4AWcPzZR3x7DBDrmq', '6666667777', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1234567890', NULL, NULL, 'active', '2026-02-21 11:45:54', '2026-02-22 14:30:26', NULL, NULL, NULL, NULL),
(41, NULL, 64, 'Nnn', 'Nnn', NULL, NULL, NULL, 'nnn@gmail.com', '$2y$10$S3ah8o8qA1Hqwd963QXIy.HYrlc3b7d8GtmiixUcnsEHGZ6t6ubxK', '9988998899', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1234567890', NULL, 'students/jz5VbVHLqy8Hzfp248TtypzxtDknSz6f8Z2Vtstw.png', 'active', '2026-02-22 10:48:07', '2026-03-06 18:25:13', NULL, NULL, '33', NULL),
(42, 23, NULL, 'CHINMAY', 'JAIN', NULL, NULL, NULL, 'chinmayjain6810@gmail.com', '$2y$10$z.O6AJVBy1DDAOmr7uZqQ.6UdImmPahpI77JJJ9QdjN7//YcMkV3e', '8502967468', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-22 12:15:08', '2026-02-22 12:15:08', NULL, NULL, NULL, NULL),
(43, 23, NULL, 'jj', 'JK', NULL, NULL, NULL, 'jj@gmail.com', '$2y$10$co4FlwUU9JA7lej8/aBM8.CXeBgaqk7KXnUHGxAPYatjXwiogDR9C', '4354353535', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-22 15:26:01', '2026-02-22 15:26:01', NULL, NULL, NULL, NULL),
(44, 67, NULL, 'wedew', 'ewdwe', NULL, NULL, NULL, 'abcd@gmail.com', '$2y$10$QoVYAa01PHPFMemIVmZtvejOF5DqNczHThErhX9EEs0aV23vBp4ZS', '1223133232', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-22 18:19:57', '2026-02-22 18:19:57', NULL, NULL, NULL, NULL),
(45, 23, 69, 'Sarthak', 'Jain', NULL, NULL, NULL, 'Sarthak@gmail.com', '$2y$10$ajuNoFkNGdFcbvSmAjrkbe8FKsCl1Ju6XUrFjClA.c.ZmSQyTltHO', '1234567890', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-23 07:26:02', '2026-02-23 11:46:08', NULL, NULL, NULL, NULL),
(46, NULL, NULL, 'Ravi', 'Sharma', NULL, NULL, NULL, 'ravi@ctr.ism.bible', '$2y$10$YiOasBkgYZiBpTTmbFc4f.nbp7yuHZZp3nI5shLJwm8pP2eyiCenq', '8449961949', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-26 17:27:15', '2026-02-26 17:27:15', NULL, NULL, NULL, NULL),
(47, NULL, NULL, 'Deepak', 'Singh', NULL, NULL, NULL, 'dssps0000@gmail.com', '$2y$10$t/6HK1q/6ZeuA1hT/THXvOFp7xySWeCnS2dv96PjG0ZiSUyOwbXgO', '9902717450', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-26 17:27:29', '2026-02-26 17:27:29', NULL, NULL, NULL, NULL),
(48, NULL, NULL, 'Ankit', 'Chaudhary', NULL, NULL, NULL, 'ankit@gmial.cim', '$2y$10$U4ncrDv/2OEuVZXMrK3FdOLhk30OF1V7WGYNMTF5DYnTs3vSrVhnq', '6396290641', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-02 19:46:36', '2026-03-02 19:46:36', NULL, NULL, NULL, NULL),
(49, NULL, NULL, 'Anup', 'Sh', NULL, NULL, NULL, 'anupsharma08092001@gmail.com', '$2y$10$PlZlRVTEOQSdvU1H24cSqOZjqZbhyJElbZCDEivmfdWjdEy4pjS66', '8053884515', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-09 10:42:00', '2026-03-09 10:42:00', NULL, NULL, NULL, NULL),
(50, NULL, NULL, 'Rishabh', 'Kumar', NULL, NULL, NULL, 'Rishabh1@gmail.com', '$2y$10$Zwe3gyZtQfq4XaAPXrPGHu6G9pqpifvOJPlsEEfVxLb.UCF/SfpC6', '7890654321', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-09 12:50:52', '2026-03-09 12:50:52', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_academic_sessions`
--

CREATE TABLE `student_academic_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `school_id` bigint(20) UNSIGNED DEFAULT NULL,
  `class_id` bigint(20) UNSIGNED DEFAULT NULL,
  `section_id` bigint(20) UNSIGNED DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL,
  `session_year` varchar(20) NOT NULL,
  `admission_number` varchar(255) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `roll_number` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_academic_sessions`
--

INSERT INTO `student_academic_sessions` (`id`, `student_id`, `school_id`, `class_id`, `section_id`, `consultant_id`, `teacher_id`, `session_year`, `admission_number`, `admission_date`, `roll_number`, `start_date`, `end_date`, `remarks`, `created_at`, `updated_at`) VALUES
(33, 39, 63, 40, 46, NULL, NULL, '2025-2026', NULL, NULL, '12', '2026-02-21', '2026-02-21', NULL, '2026-02-21 11:06:23', '2026-02-21 11:46:38'),
(34, 40, 63, 41, 48, NULL, NULL, '2025-2026', NULL, NULL, '123', '2026-02-21', NULL, NULL, '2026-02-21 11:45:54', '2026-02-22 15:18:41'),
(35, 39, 63, 41, 48, NULL, NULL, '2025-2026', NULL, NULL, '14', '2026-02-21', NULL, NULL, '2026-02-21 11:46:38', '2026-02-22 15:12:24'),
(36, 42, 67, 41, NULL, NULL, NULL, '2025-2026', NULL, NULL, '13e231', '2026-02-22', NULL, NULL, '2026-02-22 12:15:08', '2026-02-22 12:15:08'),
(37, 43, 63, 40, 46, NULL, NULL, '2025-2026', NULL, NULL, '88nnn', '2026-02-22', NULL, NULL, '2026-02-22 15:26:01', '2026-02-22 15:26:01'),
(38, 44, 67, 40, NULL, NULL, NULL, '2025-2026', NULL, NULL, '23', '2026-02-22', NULL, NULL, '2026-02-22 18:19:57', '2026-02-22 18:19:57'),
(39, 45, 63, 40, 46, NULL, NULL, '2025-2026', NULL, NULL, '121', '2026-02-23', NULL, NULL, '2026-02-23 07:26:02', '2026-02-23 07:26:02'),
(40, 41, 63, 41, 48, NULL, NULL, '2025-2026', NULL, NULL, '0987654321', NULL, NULL, NULL, '2026-02-23 17:23:46', '2026-02-23 18:26:37');

-- --------------------------------------------------------

--
-- Table structure for table `student_addons`
--

CREATE TABLE `student_addons` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `addon_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_change_timing`
--

CREATE TABLE `student_change_timing` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `consultant_id` bigint(20) UNSIGNED NOT NULL,
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL,
  `course_id` bigint(20) UNSIGNED DEFAULT NULL,
  `live_class_id` bigint(20) UNSIGNED DEFAULT NULL,
  `student_request_time` time DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `description` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_change_timing`
--

INSERT INTO `student_change_timing` (`id`, `student_id`, `consultant_id`, `teacher_id`, `course_id`, `live_class_id`, `student_request_time`, `scheduled_time`, `description`, `comment`, `status`, `created_at`, `updated_at`) VALUES
(12, 41, 64, NULL, NULL, 11, '14:04:00', '15:05:00', 'reerverv', 'no slot avaialbe', 'cancelled', '2026-02-23 17:33:35', '2026-02-23 17:37:42'),
(13, 41, 64, NULL, NULL, 11, '00:07:00', '03:10:00', 'axadxad', 'bnkbhkb', 'completed', '2026-02-23 17:37:01', '2026-02-23 17:38:10');

-- --------------------------------------------------------

--
-- Table structure for table `student_courses`
--

CREATE TABLE `student_courses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `course_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_courses`
--

INSERT INTO `student_courses` (`id`, `student_id`, `course_id`, `created_at`, `updated_at`) VALUES
(15, 45, 58, '2026-02-23 11:33:47', '2026-02-23 11:33:47'),
(16, 45, 59, '2026-02-23 11:35:40', '2026-02-23 11:35:40'),
(17, 45, 60, '2026-02-23 11:37:49', '2026-02-23 11:37:49');

-- --------------------------------------------------------

--
-- Table structure for table `student_data_performances`
--

CREATE TABLE `student_data_performances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) DEFAULT NULL,
  `questionnaires_id` bigint(20) UNSIGNED NOT NULL,
  `academic_performance` tinyint(4) DEFAULT NULL,
  `competition` tinyint(4) DEFAULT NULL,
  `consistency` tinyint(4) DEFAULT NULL,
  `test_preparedness` tinyint(4) DEFAULT NULL,
  `class_engagement` tinyint(4) DEFAULT NULL,
  `subject_understanding` tinyint(4) DEFAULT NULL,
  `homework` tinyint(4) DEFAULT NULL,
  `grasping_ability` tinyint(4) DEFAULT NULL,
  `retention_power` tinyint(4) DEFAULT NULL,
  `conceptual_clarity` tinyint(4) DEFAULT NULL,
  `attention_span` tinyint(4) DEFAULT NULL,
  `learning_speed` tinyint(4) DEFAULT NULL,
  `peer_interaction` tinyint(4) DEFAULT NULL,
  `discipline` tinyint(4) DEFAULT NULL,
  `respect_for_authority` tinyint(4) DEFAULT NULL,
  `motivation_level` tinyint(4) DEFAULT NULL,
  `response_to_feedback` tinyint(4) DEFAULT NULL,
  `stamina` tinyint(4) DEFAULT NULL,
  `participation_in_sports` tinyint(4) DEFAULT NULL,
  `teamwork_in_games` tinyint(4) DEFAULT NULL,
  `fitness_level` tinyint(4) DEFAULT NULL,
  `interest_in_activities` tinyint(4) DEFAULT NULL,
  `initiative_in_projects` tinyint(4) DEFAULT NULL,
  `curiosity_level` tinyint(4) DEFAULT NULL,
  `problem_solving` tinyint(4) DEFAULT NULL,
  `extra_curricular` tinyint(4) DEFAULT NULL,
  `idea_generation` tinyint(4) DEFAULT NULL,
  `maths` tinyint(4) DEFAULT NULL,
  `science` tinyint(4) DEFAULT NULL,
  `english` tinyint(4) DEFAULT NULL,
  `social_studies` tinyint(4) DEFAULT NULL,
  `computer_science` tinyint(4) DEFAULT NULL,
  `suggestions` text DEFAULT NULL,
  `attachment_path` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_data_performances`
--

INSERT INTO `student_data_performances` (`id`, `student_id`, `questionnaires_id`, `academic_performance`, `competition`, `consistency`, `test_preparedness`, `class_engagement`, `subject_understanding`, `homework`, `grasping_ability`, `retention_power`, `conceptual_clarity`, `attention_span`, `learning_speed`, `peer_interaction`, `discipline`, `respect_for_authority`, `motivation_level`, `response_to_feedback`, `stamina`, `participation_in_sports`, `teamwork_in_games`, `fitness_level`, `interest_in_activities`, `initiative_in_projects`, `curiosity_level`, `problem_solving`, `extra_curricular`, `idea_generation`, `maths`, `science`, `english`, `social_studies`, `computer_science`, `suggestions`, `attachment_path`, `type`, `created_at`, `updated_at`) VALUES
(1, 40, 28, 1, 0, 3, 5, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'academic_performance', '2026-02-22 14:24:43', '2026-02-22 14:41:15'),
(2, 41, 30, 8, 6, 7, 5, 9, 8, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'academic_performance', '2026-02-28 02:08:44', '2026-02-28 02:08:44'),
(3, 41, 31, 0, 0, 0, 0, 0, 0, 0, 8, 6, 6, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 'mental_parameters', '2026-02-28 02:10:20', '2026-02-28 02:10:20');

-- --------------------------------------------------------

--
-- Table structure for table `student_health_records`
--

CREATE TABLE `student_health_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL,
  `height_cm` decimal(5,2) NOT NULL,
  `weight_kg` decimal(5,2) NOT NULL,
  `bmi` decimal(5,2) NOT NULL,
  `record_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_subscriptions`
--

CREATE TABLE `student_subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `school_id` bigint(20) UNSIGNED DEFAULT NULL,
  `teacher_type` enum('school','freelancer') DEFAULT 'school',
  `is_freelancer` tinyint(1) DEFAULT 0,
  `subject_specialization` varchar(50) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `experience` int(11) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `user_id`, `school_id`, `teacher_type`, `is_freelancer`, `subject_specialization`, `qualification`, `experience`, `bio`, `profile_image`, `created_at`, `updated_at`) VALUES
(4, 77, NULL, 'school', 0, 'JAT', 'JAT', 28, 'JAT', NULL, '2026-02-23 11:52:21', '2026-02-23 11:52:21');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_availabilities`
--

CREATE TABLE `teacher_availabilities` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `day_of_week` tinyint(3) UNSIGNED NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teacher_availabilities`
--

INSERT INTO `teacher_availabilities` (`id`, `user_id`, `day_of_week`, `start_time`, `end_time`, `created_at`, `updated_at`) VALUES
(5, 77, 0, '12:12:00', '14:03:00', '2026-02-23 11:52:21', '2026-02-23 11:52:21');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_details`
--

CREATE TABLE `teacher_details` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `subject_specialization` varchar(255) DEFAULT NULL,
  `experience` varchar(255) DEFAULT NULL,
  `number_of_hours` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teacher_feedbacks`
--

CREATE TABLE `teacher_feedbacks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subject` varchar(255) NOT NULL,
  `feedback` text NOT NULL,
  `attachments` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `student_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_feedbacks`
--

INSERT INTO `teacher_feedbacks` (`id`, `subject`, `feedback`, `attachments`, `created_by`, `created_at`, `updated_at`, `student_id`) VALUES
(8, 'hlo', 'hlo', NULL, 69, '2026-02-21 18:09:21', '2026-02-21 18:09:21', 39),
(9, 'hlo rishabh', 'hlo rishabh', 'students/ClI5HnnUcgnwpuJd124uxmp488tnL5YWK7y67ecZ.docx', 69, '2026-02-21 18:12:12', '2026-02-21 18:12:12', 39),
(10, 'sdfs', 'dsfsf', NULL, 64, '2026-02-22 16:07:56', '2026-02-22 16:07:56', 40),
(11, 'dadsa', 'fsfd fsfds fsfd', 'students/fKE0pa7jcmyZbAhJLTjJTMRBEHDsn6BxMtJxOXCq.pdf', 64, '2026-02-22 16:21:38', '2026-02-22 16:21:38', 40),
(12, 'sdffsfdsfsf', 'fsdf fsdfsf fsdfsdf', NULL, 64, '2026-02-23 03:36:33', '2026-02-23 03:36:33', 39),
(13, 'Hello', 'vsdvdvsdvsvsvsvsdvs', NULL, 69, '2026-02-23 11:46:22', '2026-02-23 11:46:22', 45),
(14, 'Hello', 'bsgefqfeethrgefqetege', NULL, 69, '2026-02-23 12:10:44', '2026-02-23 12:10:44', 45);

-- --------------------------------------------------------

--
-- Table structure for table `teacher_profiles`
--

CREATE TABLE `teacher_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('school','freelancer') NOT NULL,
  `school_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `two_factor_secret` text DEFAULT NULL,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `current_team_id` bigint(20) UNSIGNED DEFAULT NULL,
  `profile_photo_path` varchar(2048) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `phone_number` varchar(100) DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at`, `remember_token`, `current_team_id`, `profile_photo_path`, `created_at`, `updated_at`, `phone_number`, `role_id`, `consultant_id`, `created_by`) VALUES
(23, 'Rishabh Arya', 'Rishabh@gmail.com', NULL, '$2y$10$Q6zoelctJIObD6Y4nZyGz.b1h61ZxYTNjz8j4/IdHnsP7tTZTQbha', NULL, NULL, NULL, NULL, NULL, 'profile/F9FPcHE0eq0tF1wrz4nx2yt6wxPYNIBbzUv2SgoZ.jpg', '2025-11-21 12:17:59', '2026-02-21 10:03:37', '1234567890', 1, NULL, NULL),
(63, 'Sarthak School', 'Sarthakschool@gmail.com', NULL, '$2y$10$UmJZqaEVo/0xIWlEJFNS3OSfmeM/uOaIfyynpbc1PGjr257Lpahdi', NULL, NULL, NULL, NULL, NULL, 'profile/zDazoHGDRl2J4kI8Bg874mfdPpJTdMPQwU4MkC04.jpg', '2026-02-21 10:06:09', '2026-02-22 12:45:17', '1234567890', 4, NULL, NULL),
(64, 'Palak The Greatest', 'palakconsultant@gmail.com', NULL, '$2y$10$WUS22BmShBZ5OClltgIqeurv5DAsPGmY1tlzcGCuH3nD4RjDeqai2', NULL, NULL, NULL, NULL, NULL, 'profile/jseRIER6nPnTlCJtdJHdJ5exiHUgaoQX78GwA3rp.jpg', '2026-02-21 10:15:06', '2026-02-22 14:16:20', '9990266503', 3, NULL, NULL),
(65, 'Sarthak Teacher', 'sarthakteacher@gmail.com', NULL, '$2y$10$Hoj73NpczdSDxMk.ZkLtx.FTAZu7cnQ5ZEcQ7fLdVYFhoqAhtbtwm', NULL, NULL, NULL, NULL, NULL, 'profile/BMgZxIRdehIg2TXOPuehG7yTQZE5vZKG1VSplHNa.jpg', '2026-02-21 10:34:48', '2026-02-23 17:59:40', '1234567890', 5, NULL, 63),
(66, 'Sarthak New Teacher', 'Sarthaknew@gmail.com', NULL, '$2y$10$vm3dB04FrYl7Vg3ECKukV.YiiycA4fX.igRwpMrHDU5YIkVlFLLI2', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-21 11:17:04', '2026-02-22 14:23:28', '6789054321', 5, NULL, NULL),
(67, 'Sarthak New School', 'Sarthaknewschool@gmail.com', NULL, '$2y$10$zhEtitFjLjOlMctPA0sFYeYCDTAKYuyQL.4hoj7GhIKuaQ76NixRi', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-21 11:18:23', '2026-02-22 12:44:45', '2134567890', 4, NULL, NULL),
(69, 'Palak New Consultant', 'Palaknew@gmail.com', NULL, '$2y$10$svxxR.poOyohj889MhXK8.LSOeWTp1Cv/geM6F/p1JyOC/BC4kNWe', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-21 11:47:45', '2026-02-22 12:50:28', '5678904321', 3, NULL, NULL),
(72, 'CJ1', 'CJ@GMAIL.COM', NULL, '$2y$10$yHrQ/zo7aWEqq6LbkT6IDOWwy2BthMgxtJu8ALI/1BGU58gn..JZ.', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-22 12:26:05', '2026-02-22 12:26:05', '1234567890', 3, NULL, NULL),
(73, 'jjj', 'jjj@gmail.com', NULL, '$2y$10$p1pp9jdGzAoi0FEp9qGdFOP3.rvEiV7TLKsWpl2rCanhfvlYl/wRm', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-22 12:44:02', '2026-02-22 12:44:02', '4983759843', 5, NULL, NULL),
(74, 'ch.', 'cj_teacher@gmail.com', NULL, '$2y$10$qFUYKoB0xZ0VorLB8A6i2.x0JrdhcFfcdwVE9U3SyQW7zzrbSA5rS', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-22 18:16:18', '2026-02-22 18:23:21', '3245353332', 5, NULL, 67),
(75, '123', '123@gmail.com', NULL, '$2y$10$Tn8FBXT3oH0OGGEbDnuFReG13NkcM/1dqI5LlXQdnqnZuvy5kxcJC', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-22 18:17:06', '2026-02-22 18:17:06', '1234454343', 5, NULL, 67),
(76, 'huha', 'huha@gmail.com', NULL, '$2y$10$TVwl7R0iannsMURC7KS47OpRCTcZdDCN09UId1cY33iTUhQ6LIGt6', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-23 03:17:12', '2026-02-23 03:21:38', '3535345345', 5, NULL, 63),
(77, 'Yash Chaudhary', 'Yash@gmail.com', NULL, '$2y$10$ura0EAq06ssce10twccvHu/vc8.7THXG8PXb8fAyfEyJc/bW5PHqW', NULL, NULL, NULL, NULL, NULL, 'profile/2mLCXHNhN86wmFebGjLEeZq8r9upEpGB3fNgVKkz.jpg', '2026-02-23 11:23:44', '2026-02-28 02:34:44', '8727860426', 6, NULL, NULL),
(78, 'Sarthak', 'Sarthakk@gmail.com', NULL, '$2y$10$NiaRqdE/ovicEevf1EEDNe7MuOM0OwxQHl9eLMVoP6ngozhaMBHJ.', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-23 12:20:28', '2026-02-23 12:20:28', '1234567890', 2, NULL, NULL),
(79, 'course', 'course@gmail.com', NULL, '$2y$10$NAAvabDjEnA19dE5UmFAZeHPCMqwTMp/L3N0HRri/bX17WF3OQVwO', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-23 16:59:04', '2026-02-23 16:59:04', '1234567890', 6, NULL, NULL),
(80, 'Akelion', 'akelion@gmail.com', NULL, '$2y$10$Q6zoelctJIObD6Y4nZyGz.b1h61ZxYTNjz8j4/IdHnsP7tTZTQbha', NULL, NULL, NULL, NULL, NULL, '', '2025-11-21 12:17:59', '2026-02-21 10:03:37', '7657657650', 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `workshop_webinar_calendar`
--

CREATE TABLE `workshop_webinar_calendar` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `join_link` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `workshop_webinar_calendar`
--

INSERT INTO `workshop_webinar_calendar` (`id`, `title`, `student_id`, `start_date`, `join_link`, `description`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Yoga Workshop', 7, '2026-01-01', NULL, 'This is a yoga event workshop on the occasion of New Year', 19, '2026-01-31 10:23:05', '2026-01-31 10:23:05'),
(2, 'Run a Thon', 7, '2026-01-14', NULL, 'This is a marathon event on occasion of Makar Sankranti.', 19, '2026-01-31 10:23:53', '2026-01-31 10:23:53'),
(3, 'dqqwd', 33, '2026-02-17', NULL, 'dwqqd', 55, '2026-02-08 10:17:38', '2026-02-08 10:17:38'),
(4, 'vj vh', 33, '2026-02-18', NULL, 'm bj hkb', 55, '2026-02-08 12:00:49', '2026-02-08 12:00:54'),
(5, 'abc', 29, '2026-02-23', NULL, 'abc abc abc', 55, '2026-02-20 03:14:27', '2026-02-20 03:14:27'),
(6, 'abc abc abc abc', 29, '2026-02-26', NULL, 'ba cba cba cba cabca bac abca', 55, '2026-02-20 03:21:18', '2026-02-20 03:21:18'),
(7, 'abc abc abc abc', 33, '2026-02-26', NULL, 'ba cba cba cba cabca bac abca', 55, '2026-02-20 03:21:18', '2026-02-20 03:21:18'),
(8, 'asfa', 29, '2026-02-28', 'https://meet.google.com/', 'sffsfd  sdfsfds', 55, '2026-02-20 03:34:04', '2026-02-20 03:34:04'),
(9, 'sfd', 39, '2026-02-26', 'https://meet.google.com/', 'fsfd', 64, '2026-02-23 03:49:01', '2026-02-23 03:49:01'),
(10, 'sdfsfs', 39, '2026-02-26', 'https://meet.google.com/', NULL, 64, '2026-02-23 03:53:33', '2026-02-23 03:53:33'),
(11, 'sdfsf', 39, '2026-02-26', 'https://meet.google.com/', NULL, 64, '2026-02-23 04:05:35', '2026-02-23 04:05:35'),
(12, 'google.com', 45, '2026-02-23', 'https://www.msn.com/en-in/entertainment/bollywood/o-romeo-box-office-collection-day-9-shahid-kapoor-s-action-drama-earns-rs-62-46-crore-during-second-week/ar-AA1WP87a?uxmode=ruby&ocid=edgntpruby&pc=SCOODB&cvid=699c356aa1cb4c949acdb2b28eb11cc0&ei=7', 'dccadcd', 69, '2026-02-23 12:13:13', '2026-02-23 12:13:13'),
(13, 'asdxas', 41, '2026-02-23', 'https://meet.google.com/was-eoji-kxy', 'adadas', 64, '2026-02-23 17:33:00', '2026-02-23 17:33:00'),
(14, 'hello new', 41, '2026-02-24', 'https://meet.google.com/was-eoji-kxy', 'ascsacsa', 64, '2026-02-23 18:11:25', '2026-02-23 18:11:25');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addons`
--
ALTER TABLE `addons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `advice_requests`
--
ALTER TABLE `advice_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_advice_students` (`student_id`),
  ADD KEY `fk_advice_consultant` (`consultant_id`);

--
-- Indexes for table `appointment_test_reminders`
--
ALTER TABLE `appointment_test_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_reminder_student` (`student_id`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_assignments_created_by` (`created_by`);

--
-- Indexes for table `certificates`
--
ALTER TABLE `certificates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `certificates_consultant_id_foreign` (`consultant_id`);

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chats_receiver_id_foreign` (`receiver_id`),
  ADD KEY `chats_sender_id_receiver_id_index` (`sender_id`,`receiver_id`);

--
-- Indexes for table `chat_files`
--
ALTER TABLE `chat_files`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `classes_code_unique` (`code`);

--
-- Indexes for table `class_bookings`
--
ALTER TABLE `class_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_bookings_student_id_foreign` (`student_id`),
  ADD KEY `class_bookings_teacher_id_foreign` (`teacher_id`);

--
-- Indexes for table `complains`
--
ALTER TABLE `complains`
  ADD PRIMARY KEY (`id`),
  ADD KEY `complains_teacher_id_foreign` (`teacher_id`),
  ADD KEY `complains_school_id_foreign` (`school_id`),
  ADD KEY `complains_consultant_id_foreign` (`consultant_id`);

--
-- Indexes for table `consultant_profiles`
--
ALTER TABLE `consultant_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consultant_profiles_user_id_foreign` (`user_id`);

--
-- Indexes for table `consultant_student`
--
ALTER TABLE `consultant_student`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `consultent_student_documents`
--
ALTER TABLE `consultent_student_documents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `courses_slug_unique` (`slug`),
  ADD KEY `courses_class_id_foreign` (`class_id`),
  ADD KEY `courses_created_by_foreign` (`created_by`);

--
-- Indexes for table `course_feedback`
--
ALTER TABLE `course_feedback`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_feedback_student_course_unique` (`student_id`,`course_id`),
  ADD KEY `course_feedback_course_id_foreign` (`course_id`);

--
-- Indexes for table `diet_plan`
--
ALTER TABLE `diet_plan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_diet_plan_student_id` (`student_id`);

--
-- Indexes for table `doctor_consultations`
--
ALTER TABLE `doctor_consultations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exam_report_cards`
--
ALTER TABLE `exam_report_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_exam_report_cards_student` (`student_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `features`
--
ALTER TABLE `features`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lab_reports`
--
ALTER TABLE `lab_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lab_reports_student_id` (`student_id`);

--
-- Indexes for table `live_classes`
--
ALTER TABLE `live_classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_live_classes_course` (`course_id`),
  ADD KEY `fk_live_classes_consultant` (`consultant_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `parent_call_summaries`
--
ALTER TABLE `parent_call_summaries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Indexes for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `password_reset_requests_student_id_foreign` (`student_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `permissions_user_id_foreign` (`user_id`),
  ADD KEY `permissions_role_id_foreign` (`role_id`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Indexes for table `plans`
--
ALTER TABLE `plans`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `questionnaires`
--
ALTER TABLE `questionnaires`
  ADD PRIMARY KEY (`id`),
  ADD KEY `questionnaires_teacher_id_foreign` (`teacher_id`),
  ADD KEY `questionnaires_school_id_foreign` (`school_id`),
  ADD KEY `questionnaires_student_id_foreign` (`student_id`),
  ADD KEY `questionnaires_consultant_id_foreign` (`consultant_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_unique` (`name`),
  ADD UNIQUE KEY `roles_slug_unique` (`slug`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `school_code` (`school_code`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `school_profiles`
--
ALTER TABLE `school_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `school_profiles_user_id_foreign` (`user_id`);

--
-- Indexes for table `school_teachers`
--
ALTER TABLE `school_teachers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sections_class_id_foreign` (`class_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `students_email_unique` (`email`),
  ADD KEY `students_created_by_foreign` (`created_by`),
  ADD KEY `students_consultant_id_foreign` (`consultant_id`);

--
-- Indexes for table `student_academic_sessions`
--
ALTER TABLE `student_academic_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `teacher_id` (`teacher_id`),
  ADD KEY `consultant_id` (`consultant_id`),
  ADD KEY `student_academic_sessions_section_id_foreign` (`section_id`),
  ADD KEY `fk_school_user` (`school_id`);

--
-- Indexes for table `student_addons`
--
ALTER TABLE `student_addons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_addons_student_id_foreign` (`student_id`),
  ADD KEY `student_addons_addon_id_foreign` (`addon_id`);

--
-- Indexes for table `student_change_timing`
--
ALTER TABLE `student_change_timing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_change_timing_student_id_foreign` (`student_id`),
  ADD KEY `student_change_timing_consultant_id_foreign` (`consultant_id`),
  ADD KEY `student_change_timing_teacher_id_foreign` (`teacher_id`),
  ADD KEY `student_change_timing_course_id_foreign` (`course_id`),
  ADD KEY `student_change_timing_live_class_id_foreign` (`live_class_id`);

--
-- Indexes for table `student_courses`
--
ALTER TABLE `student_courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_course_unique` (`student_id`,`course_id`),
  ADD KEY `fk_student_courses_course` (`course_id`);

--
-- Indexes for table `student_data_performances`
--
ALTER TABLE `student_data_performances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_data_performances_questionnaires_id_foreign` (`questionnaires_id`);

--
-- Indexes for table `student_health_records`
--
ALTER TABLE `student_health_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_health_records_student_id_foreign` (`student_id`);

--
-- Indexes for table `student_subscriptions`
--
ALTER TABLE `student_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_subscriptions_student_id_foreign` (`student_id`),
  ADD KEY `student_subscriptions_plan_id_foreign` (`plan_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `school_id` (`school_id`);

--
-- Indexes for table `teacher_availabilities`
--
ALTER TABLE `teacher_availabilities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_availability_teacher_id_foreign` (`user_id`);

--
-- Indexes for table `teacher_feedbacks`
--
ALTER TABLE `teacher_feedbacks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_teacher_feedbacks_created_by` (`created_by`),
  ADD KEY `fk_teacher_feedbacks_student_id` (`student_id`);

--
-- Indexes for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_profiles_user_id_foreign` (`user_id`),
  ADD KEY `teacher_profiles_school_id_foreign` (`school_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_role_id_foreign` (`role_id`),
  ADD KEY `users_consultant_id_foreign` (`consultant_id`);

--
-- Indexes for table `workshop_webinar_calendar`
--
ALTER TABLE `workshop_webinar_calendar`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addons`
--
ALTER TABLE `addons`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `advice_requests`
--
ALTER TABLE `advice_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `appointment_test_reminders`
--
ALTER TABLE `appointment_test_reminders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `certificates`
--
ALTER TABLE `certificates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `chat_files`
--
ALTER TABLE `chat_files`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `class_bookings`
--
ALTER TABLE `class_bookings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `complains`
--
ALTER TABLE `complains`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `consultant_profiles`
--
ALTER TABLE `consultant_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `consultant_student`
--
ALTER TABLE `consultant_student`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `consultent_student_documents`
--
ALTER TABLE `consultent_student_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `course_feedback`
--
ALTER TABLE `course_feedback`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `diet_plan`
--
ALTER TABLE `diet_plan`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `doctor_consultations`
--
ALTER TABLE `doctor_consultations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `exam_report_cards`
--
ALTER TABLE `exam_report_cards`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `features`
--
ALTER TABLE `features`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `lab_reports`
--
ALTER TABLE `lab_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `live_classes`
--
ALTER TABLE `live_classes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `parent_call_summaries`
--
ALTER TABLE `parent_call_summaries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `plans`
--
ALTER TABLE `plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `questionnaires`
--
ALTER TABLE `questionnaires`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_profiles`
--
ALTER TABLE `school_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_teachers`
--
ALTER TABLE `school_teachers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `student_academic_sessions`
--
ALTER TABLE `student_academic_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `student_addons`
--
ALTER TABLE `student_addons`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_change_timing`
--
ALTER TABLE `student_change_timing`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `student_courses`
--
ALTER TABLE `student_courses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `student_data_performances`
--
ALTER TABLE `student_data_performances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `student_health_records`
--
ALTER TABLE `student_health_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `student_subscriptions`
--
ALTER TABLE `student_subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `teacher_availabilities`
--
ALTER TABLE `teacher_availabilities`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `teacher_feedbacks`
--
ALTER TABLE `teacher_feedbacks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `workshop_webinar_calendar`
--
ALTER TABLE `workshop_webinar_calendar`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `advice_requests`
--
ALTER TABLE `advice_requests`
  ADD CONSTRAINT `fk_advice_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_advice_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `appointment_test_reminders`
--
ALTER TABLE `appointment_test_reminders`
  ADD CONSTRAINT `fk_reminder_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `fk_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `certificates`
--
ALTER TABLE `certificates`
  ADD CONSTRAINT `certificates_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `chats_receiver_id_foreign` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chats_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_bookings`
--
ALTER TABLE `class_bookings`
  ADD CONSTRAINT `class_bookings_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_bookings_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teacher_profiles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `complains`
--
ALTER TABLE `complains`
  ADD CONSTRAINT `complains_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `complains_school_id_foreign` FOREIGN KEY (`school_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `complains_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `consultant_profiles`
--
ALTER TABLE `consultant_profiles`
  ADD CONSTRAINT `consultant_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `courses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_feedback`
--
ALTER TABLE `course_feedback`
  ADD CONSTRAINT `course_feedback_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_feedback_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `diet_plan`
--
ALTER TABLE `diet_plan`
  ADD CONSTRAINT `fk_diet_plan_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `exam_report_cards`
--
ALTER TABLE `exam_report_cards`
  ADD CONSTRAINT `fk_exam_report_cards_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lab_reports`
--
ALTER TABLE `lab_reports`
  ADD CONSTRAINT `fk_lab_reports_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `live_classes`
--
ALTER TABLE `live_classes`
  ADD CONSTRAINT `fk_live_classes_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_live_classes_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  ADD CONSTRAINT `password_reset_requests_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `permissions`
--
ALTER TABLE `permissions`
  ADD CONSTRAINT `permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questionnaires`
--
ALTER TABLE `questionnaires`
  ADD CONSTRAINT `questionnaires_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `questionnaires_school_id_foreign` FOREIGN KEY (`school_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questionnaires_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questionnaires_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schools`
--
ALTER TABLE `schools`
  ADD CONSTRAINT `schools_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `school_profiles`
--
ALTER TABLE `school_profiles`
  ADD CONSTRAINT `school_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `sections_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `students_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_academic_sessions`
--
ALTER TABLE `student_academic_sessions`
  ADD CONSTRAINT `fk_school_user` FOREIGN KEY (`school_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_academic_sessions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_academic_sessions_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_academic_sessions_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_academic_sessions_ibfk_4` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_academic_sessions_ibfk_5` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_academic_sessions_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_addons`
--
ALTER TABLE `student_addons`
  ADD CONSTRAINT `student_addons_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `addons` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_addons_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_change_timing`
--
ALTER TABLE `student_change_timing`
  ADD CONSTRAINT `student_change_timing_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_change_timing_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_change_timing_live_class_id_foreign` FOREIGN KEY (`live_class_id`) REFERENCES `live_classes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_change_timing_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_change_timing_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_courses`
--
ALTER TABLE `student_courses`
  ADD CONSTRAINT `fk_student_courses_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_student_courses_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_health_records`
--
ALTER TABLE `student_health_records`
  ADD CONSTRAINT `student_health_records_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_subscriptions`
--
ALTER TABLE `student_subscriptions`
  ADD CONSTRAINT `student_subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_subscriptions_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teachers_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `teacher_availabilities`
--
ALTER TABLE `teacher_availabilities`
  ADD CONSTRAINT `teacher_availability_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_feedbacks`
--
ALTER TABLE `teacher_feedbacks`
  ADD CONSTRAINT `fk_teacher_feedbacks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_teacher_feedbacks_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_teacher_feedbacks_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD CONSTRAINT `teacher_profiles_school_id_foreign` FOREIGN KEY (`school_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `teacher_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
