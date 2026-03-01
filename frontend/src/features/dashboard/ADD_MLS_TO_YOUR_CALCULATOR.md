# Add MLS parsing to your Land Calculator

Your HAR paste looks like: **`ML#:	AU2421059	List Price:	$130,000`** (tab between fields). The parser in `components/landCalculatorParseMLS.ts` is set up for this format.

**If you're on localhost and MLS still doesn't parse:** The dev server may be using a cached old Land Calculator. Clear the cache and restart: from the `frontend` folder run `rm -rf node_modules/.cache/babel-loader`, then stop the dev server (Ctrl+C) and start it again (`npm start`). Hard-refresh the browser (Cmd+Shift+R or Ctrl+Shift+R).

If the Land Evaluation Calculator you see in the app is **not** the one in `components/LandCalculator.tsx` (e.g. you have another file with the paste area and MAJOR_COUNTIES / flood zones), do this there:

## 1. Import the parser

At the top of that file:

```ts
import { parseMLSFromHARText } from './landCalculatorParseMLS';
```

(If the calculator lives in another folder, use the path to `landCalculatorParseMLS.ts`, e.g. `../components/landCalculatorParseMLS` or `./landCalculatorParseMLS`.)

## 2. Where you handle the pasted text

When you have the **full** pasted string (e.g. from your textarea or paste handler), run:

```ts
const mlsNumber = parseMLSFromHARText(fullPastedText);
```

Use the same variable that holds the entire paste (the string that contains "ML#:	AU2421059" and "List Price:" and "Address:", etc.).

## 3. Set the MLS # on the listing

When you build the active listing object or set state (e.g. address, list price, tax acc #), set the MLS # from that value:

```ts
// example – use whatever your state/object uses for MLS #
setActiveListing(prev => ({ ...prev, mlsNumber }));
// or: listing.mlsNumber = mlsNumber;
```

Make sure the field that shows "MLS #" in the UI is bound to this value (e.g. `value={activeListing.mlsNumber}`).

---

After this, paste the full HAR listing again; **AU2421059** should appear in the MLS # field.
