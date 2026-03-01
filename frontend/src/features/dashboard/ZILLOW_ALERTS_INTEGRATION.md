# Zillow Alerts tab – integration steps

The component `components/ZillowAlerts.tsx` is ready. Wire it into the dashboard as follows.

## 1. Add the section type (in `DashboardLayout.tsx`)

In the `Section` type union, add:

```ts
'Zillow Alerts'
```

## 2. Add the sidebar item

In the list of sidebar navigation items (where you have "Tasks", "Land Evaluation Calculator", etc.), add an entry for Zillow Alerts, e.g.:

```tsx
{ id: 'Zillow Alerts', label: 'Zillow Alerts', icon: <TrendingDownIcon /> }
```

(Import `TrendingDownIcon` from `@mui/icons-material` if needed.)

## 3. Add the route / content case

In the `renderContent()` switch (or equivalent), add:

```tsx
case 'Zillow Alerts':
  return <ZillowAlerts />;
```

At the top of the file, add:

```ts
import ZillowAlerts from './components/ZillowAlerts';
```

---

After this, the **Zillow Alerts** tab will show the placeholder. You can later replace the placeholder with real data from an API or import (see the component comment about Zillow data sources).
