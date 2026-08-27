# Fanourakis CMS site

## Upload once
Upload **all files and folders** from this package to the root of `georgefanour/fanourakis-site`, replacing the existing `index.html` and `.pages.yml`.

Keep the directory structure exactly as it is. In particular, do not remove the `content/*/index.json` files: the website uses them to load each CMS collection.

## Open the CMS
1. Go to https://app.pagescms.org
2. Sign in with the GitHub account that owns the repository.
3. Authorize the Pages CMS GitHub App for `fanourakis-site` when prompted.
4. Open the repository.
5. Use the Greek sections: **Ρυθμίσεις ιστοσελίδας**, **Μουσική / κυκλοφορίες**, **Live εμφανίσεις**, **Βίντεο**, **Φωτογραφίες**, and **Τύπος και συνεντεύξεις**.
6. Save/Publish in Pages CMS. It commits the change to GitHub; your hosting deployment then updates from that commit.

## Important
When you add a new item to Music, Live, Videos, Photos or Press from Pages CMS, also add its filename to that section's `content/<section>/index.json`. This is a one-time technical limitation of a static no-build setup. For a fully automatic list without touching an index file, configure Cloudflare Pages with a build command; then a build script can discover all files automatically.
