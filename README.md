# IHE Transcribe (form)

A one-page form for starting a transcript run without signing in to GitHub. It's served by GitHub Pages at <https://jwollihe.github.io/ihe-transcribe/>. The form asks who the transcript is for. While the private repo's `DELIVER_TO` variable is set, the transcript (or a failure notice) goes to that one address, with the requester in the subject, for forwarding; without it, it goes straight to the requester.

This repo is public, so it holds nothing readable: the GitHub token is encrypted with a passphrase, and each request is encrypted before it's sent. The real work happens in the private repo `ihe-transcripts-lite`.

## How a request travels

1. **The form (`index.html`).** The passphrase decrypts `token.enc.json` in the browser. The request (audio link, email, nid, note) is encrypted with `payload-key.pem`, the public key.
2. **The token starts `forward.yml` here.** The token can only run workflows in this repo. This repo's logs are public, so they only show ciphertext.
3. **`forward.yml` passes the encrypted request on.** It uses the `FORWARD_TOKEN` secret to start `transcribe.yml` in the private repo, which holds the private key (`PAYLOAD_PRIVATE_KEY`), decrypts the request, runs, and emails the result through Resend.

If the passphrase leaks, the worst anyone can do is start runs (on Jordan's Claude subscription) and email transcripts to themselves. They can't read the private repo, its runs or its files. To limit even that, set the private repo's `ALLOWED_RECIPIENTS` variable.

## Files

- `index.html`, `style.css`, `crypto.js`: the form and its WebCrypto code
- `setup.html`: encrypts a new token with a passphrase, in the browser
- `token.enc.json`: the encrypted token (`{}` until setup)
- `payload-key.pem`: public key for requests; the private half is a secret in the private repo
- `.github/workflows/forward.yml`: the forwarder

## Changing the passphrase or renewing the token

Make a new fine-grained token (repo `ihe-transcribe` only, **Actions: Read and write**). Open `setup.html` on your own computer and encrypt it with the passphrase. Upload the downloaded `token.enc.json` over the old one (Add file → Upload files). Then revoke the old token on GitHub.
