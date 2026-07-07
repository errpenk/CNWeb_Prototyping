<?php
/**
 * Builds a public content snapshot for GitHub.
 */

defined('ABSPATH') || exit;

class LuxurEat_GitHub_Sync_Exporter {
    public function export() {
        $data = array(
            'schema' => 'luxureat.wordpress-export.v1',
            'exported_at_gmt' => gmdate('c'),
            'site' => $this->site(),
            'theme' => $this->theme(),
            'front_page' => $this->front_page(),
            'menus' => $this->menus(),
            'content' => array(
                'pages' => $this->posts('page'),
                'posts' => $this->posts('post'),
            ),
            'media' => $this->media(),
        );

        return apply_filters('luxureat_github_sync_export', $data);
    }

    private function site() {
        return array(
            'name' => get_bloginfo('name'),
            'description' => get_bloginfo('description'),
            'url' => home_url('/'),
            'language' => get_bloginfo('language'),
            'timezone' => wp_timezone_string(),
        );
    }

    private function theme() {
        $theme = wp_get_theme();

        return array(
            'name' => $theme->get('Name'),
            'version' => $theme->get('Version'),
            'stylesheet' => get_stylesheet(),
            'template' => get_template(),
        );
    }

    private function front_page() {
        $front_page_id = (int) get_option('page_on_front');
        $posts_page_id = (int) get_option('page_for_posts');

        return array(
            'show_on_front' => get_option('show_on_front'),
            'page_on_front' => $this->page_reference($front_page_id),
            'page_for_posts' => $this->page_reference($posts_page_id),
        );
    }

    private function page_reference($post_id) {
        if (!$post_id) {
            return null;
        }

        $post = get_post($post_id);
        if (!$post) {
            return null;
        }

        return array(
            'id' => (int) $post->ID,
            'slug' => $post->post_name,
            'title' => get_the_title($post),
            'url' => get_permalink($post),
        );
    }

    private function menus() {
        $locations = get_nav_menu_locations();
        $menus = array();

        foreach (wp_get_nav_menus() as $menu) {
            $items = wp_get_nav_menu_items($menu->term_id);

            $menus[] = array(
                'id' => (int) $menu->term_id,
                'name' => $menu->name,
                'slug' => $menu->slug,
                'locations' => $this->locations_for_menu($locations, (int) $menu->term_id),
                'items' => array_map(array($this, 'menu_item'), is_array($items) ? $items : array()),
            );
        }

        return $menus;
    }

    private function locations_for_menu($locations, $menu_id) {
        $matched = array();

        foreach ($locations as $location => $assigned_menu_id) {
            if ((int) $assigned_menu_id === $menu_id) {
                $matched[] = $location;
            }
        }

        return $matched;
    }

    private function menu_item($item) {
        return array(
            'id' => (int) $item->ID,
            'title' => $item->title,
            'url' => $item->url,
            'type' => $item->type,
            'object' => $item->object,
            'object_id' => (int) $item->object_id,
            'parent_id' => (int) $item->menu_item_parent,
            'order' => (int) $item->menu_order,
        );
    }

    private function posts($post_type) {
        $posts = get_posts(array(
            'post_type' => $post_type,
            'post_status' => 'publish',
            'numberposts' => -1,
            'orderby' => 'modified',
            'order' => 'DESC',
            'suppress_filters' => false,
        ));

        return array_map(array($this, 'post'), $posts);
    }

    private function post($post) {
        return array(
            'id' => (int) $post->ID,
            'type' => $post->post_type,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'title' => get_the_title($post),
            'excerpt' => $post->post_excerpt,
            'content' => $post->post_content,
            'url' => get_permalink($post),
            'date_gmt' => mysql2date('c', $post->post_date_gmt, false),
            'modified_gmt' => mysql2date('c', $post->post_modified_gmt, false),
        );
    }

    private function media() {
        $attachments = get_posts(array(
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'numberposts' => -1,
            'orderby' => 'modified',
            'order' => 'DESC',
            'suppress_filters' => false,
        ));

        return array_map(array($this, 'attachment'), $attachments);
    }

    private function attachment($attachment) {
        return array(
            'id' => (int) $attachment->ID,
            'title' => get_the_title($attachment),
            'caption' => $attachment->post_excerpt,
            'description' => $attachment->post_content,
            'mime_type' => $attachment->post_mime_type,
            'url' => wp_get_attachment_url($attachment->ID),
            'alt' => get_post_meta($attachment->ID, '_wp_attachment_image_alt', true),
            'modified_gmt' => mysql2date('c', $attachment->post_modified_gmt, false),
        );
    }
}
