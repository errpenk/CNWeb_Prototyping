<?php
/**
 * Minimal GitHub Contents API client.
 */

defined('ABSPATH') || exit;

class LuxurEat_GitHub_Sync_GitHub_Client {
    private $token;

    public function __construct($token) {
        $this->token = trim((string) $token);
    }

    public function put_file($repository, $branch, $file_path, $content, $message) {
        $parts = explode('/', $repository, 2);
        if (count($parts) !== 2 || !$parts[0] || !$parts[1]) {
            return new WP_Error('luxureat_github_sync_bad_repository', 'Invalid GitHub repository.');
        }

        $owner = $parts[0];
        $repo = $parts[1];
        $encoded_path = implode('/', array_map('rawurlencode', explode('/', ltrim($file_path, '/'))));
        $url = sprintf(
            'https://api.github.com/repos/%s/%s/contents/%s',
            rawurlencode($owner),
            rawurlencode($repo),
            $encoded_path
        );

        $sha = $this->existing_sha($url, $branch);
        if (is_wp_error($sha)) {
            return $sha;
        }

        $body = array(
            'message' => $message,
            'content' => base64_encode($content),
            'branch' => $branch,
        );

        if ($sha) {
            $body['sha'] = $sha;
        }

        $response = wp_remote_request($url, array(
            'method' => 'PUT',
            'headers' => $this->headers(),
            'timeout' => 30,
            'body' => wp_json_encode($body),
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $decoded = json_decode(wp_remote_retrieve_body($response), true);

        if ($status < 200 || $status >= 300) {
            $message = isset($decoded['message']) ? $decoded['message'] : 'GitHub rejected the content update.';
            return new WP_Error('luxureat_github_sync_github_error', $message);
        }

        return array(
            'commit_url' => isset($decoded['commit']['html_url']) ? $decoded['commit']['html_url'] : '',
            'content_url' => isset($decoded['content']['html_url']) ? $decoded['content']['html_url'] : '',
        );
    }

    private function existing_sha($url, $branch) {
        $response = wp_remote_get(add_query_arg('ref', rawurlencode($branch), $url), array(
            'headers' => $this->headers(),
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status === 404) {
            return '';
        }

        $decoded = json_decode(wp_remote_retrieve_body($response), true);
        if ($status < 200 || $status >= 300) {
            $message = isset($decoded['message']) ? $decoded['message'] : 'GitHub could not read the current file.';
            return new WP_Error('luxureat_github_sync_github_error', $message);
        }

        return isset($decoded['sha']) ? $decoded['sha'] : '';
    }

    private function headers() {
        return array(
            'Accept' => 'application/vnd.github+json',
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
            'User-Agent' => 'LuxurEat-GitHub-Sync/' . LUXUREAT_GITHUB_SYNC_VERSION,
            'X-GitHub-Api-Version' => '2022-11-28',
        );
    }
}
