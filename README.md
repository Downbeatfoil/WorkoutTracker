# Workout Tracker

A minimal mobile-first workout tracker that can be deployed as a static website.

## What it does

- Stores workouts, notes, rest times, and progress in the browser with `localStorage`.
- Calculates estimated 1 rep max with the Epley formula:

```text
1RM = Weight * (1 + Reps / 30)
```

- Includes placeholder workouts and exercises until the real plan is added.
- Can be installed to a phone home screen from the browser after deployment.

## Local preview

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

## Deploying to Vercel

1. Create a new GitHub repository.
2. Upload these files to the repository.
3. Go to Vercel and choose `Add New Project`.
4. Import the GitHub repository.
5. Leave the build settings empty/default because this is a static site.
6. Deploy.

After deploy, Vercel gives you a public URL that you can open from your phone.
