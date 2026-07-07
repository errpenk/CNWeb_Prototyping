<?php
/**
 * Remove LuxurEat GitHub Sync stored settings.
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('luxureat_github_sync_options');
