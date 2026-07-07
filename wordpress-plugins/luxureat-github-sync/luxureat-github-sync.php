<?php
/**
 * Plugin Name: LuxurEat GitHub Sync
 * Description: Exports public WordPress content to a selected LuxurEat GitHub repository on demand.
 * Version: 0.1.0
 * Author: LuxurEat
 * License: GPL-2.0-or-later
 * Text Domain: luxureat-github-sync
 */

defined('ABSPATH') || exit;

define('LUXUREAT_GITHUB_SYNC_VERSION', '0.1.0');
define('LUXUREAT_GITHUB_SYNC_FILE', __FILE__);
define('LUXUREAT_GITHUB_SYNC_DIR', plugin_dir_path(__FILE__));

require_once LUXUREAT_GITHUB_SYNC_DIR . 'includes/class-luxureat-github-sync-exporter.php';
require_once LUXUREAT_GITHUB_SYNC_DIR . 'includes/class-luxureat-github-sync-github-client.php';
require_once LUXUREAT_GITHUB_SYNC_DIR . 'includes/class-luxureat-github-sync-admin.php';

add_action('plugins_loaded', array('LuxurEat_GitHub_Sync_Admin', 'init'));
