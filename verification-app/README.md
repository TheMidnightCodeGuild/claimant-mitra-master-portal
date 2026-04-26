## verification-app (Standalone Capture & Upload)

This is a standalone Next.js app intended to be deployed on **`verification.claimantmitra.com`** and serve only the verification capture/upload flow.

### Route
- **`/requestVerification/[id]`**

The main portal generates links like:
- `https://verification.claimantmitra.com/requestVerification/<userDocId>`

### Firebase
This app uses the same Firebase project as the main portal via `lib/firebase.js` (copied from the portal).

### What it does
- Loads the user doc from Firestore: `users/{id}`
- Shows the monologue marquee (Hindi script)
- Captures photos/videos using camera
- Lets user preview/delete selected media before upload
- Uploads to Storage under: `requestVerification/{id}/...`
- Updates Firestore:
  - `requestVerificationFiles` (append)
  - `requestVerificationUpdatedAt`
  - `VideoVerification: "Uploaded"`
- Redirects to `https://www.claimantmitra.com/` after successful upload

### Run locally
From this folder:

```bash
npm install
npm run dev
```

Then open:
- `http://localhost:3000/requestVerification/<someUserId>`

### Deploy
Deploy this app so `verification.claimantmitra.com` points to it and supports the route above.

Make sure Firebase rules allow public-by-link access for:
- reading `users/{id}`
- uploading to Storage `requestVerification/{id}/...`
- writing `requestVerificationFiles` and status fields

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
