# Fix: MLS # not parsing in Land Evaluation Calculator

The MLS number appears in the paste as **ML#: AU2421059**. The parser in `landCalculatorParseMLS.ts` correctly extracts it; you just need to call it from LandCalculator and assign the result to the active listing's MLS # field.

---

## Step 1: Add the import

At the **top** of `LandCalculator.tsx`, with the other imports, add:

```ts
import { parseMLSFromHARText } from './landCalculatorParseMLS';
```

---

## Step 2: Find where the active listing is parsed

In `LandCalculator.tsx`, search for where you parse the pasted text for the **active listing** (e.g. where you read "Address:", "List Price:", "Tax Acc #:", etc.). You might see:

- A function like `parseActiveListing`, `parseActive`, or similar
- Or inline regex/match for "Address:" or "List Price:"
- The variable that holds the **full pasted text** (e.g. from a textarea) — you need that full string

---

## Step 3: Get MLS # from the full pasted text and assign it

**Important:** Call `parseMLSFromHARText` with the **full** pasted text (the same string that contains "ML#: AU2421059"), not a substring.

**Option A — You have a function that parses the active listing and returns an object:**

Inside that function, add at the top (using the full pasted text):

```ts
const mlsNumber = parseMLSFromHARText(fullPastedText);  // use your variable name for the paste
```

Then when you build the return object, add the MLS field (use the exact property name your component uses for "MLS #"):

```ts
return {
  // ... your existing fields (address, listPrice, etc.)
  mlsNumber,   // or mls, mlsId, activeListingMls — whatever the UI expects
};
```

**Option B — You build the active listing object inline (e.g. in a handler):**

Where you have the full pasted string (e.g. `pasteText` or `copiedText`), add:

```ts
const mlsNumber = parseMLSFromHARText(pasteText);  // or whatever the variable is
```

Then when you set state or build the active listing object, include it:

```ts
setActiveListing(prev => ({
  ...prev,
  mlsNumber,   // or mls: mlsNumber, etc.
}));
```

---

## Step 4: Match the field name to the UI

In LandCalculator, find where the **MLS #** (or "ML#") value is displayed or bound (e.g. a TextField or read-only field). Use that **exact** property name when you assign. For example:

- If the field is `value={activeListing.mlsNumber}`, use `mlsNumber`.
- If it's `value={activeListing.mls}`, use `mls: mlsNumber`.

---

## Quick check

After integrating:

1. Paste the full HAR listing (including the line "ML#: AU2421059").
2. Trigger the parse (e.g. click Parse or whatever runs the active-listing parsing).
3. The MLS # field should show **AU2421059**.

The parser file is already in your repo:  
`frontend/src/features/dashboard/components/landCalculatorParseMLS.ts`
