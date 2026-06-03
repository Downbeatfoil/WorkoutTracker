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
