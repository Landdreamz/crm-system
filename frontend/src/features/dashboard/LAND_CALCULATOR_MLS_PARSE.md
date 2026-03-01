# Land Calculator: Parse MLS # from HAR/Matrix paste

On the MLS page the number appears as **ML#: AU2421059** (with a colon). The parser must use the **full pasted text** so that line is included.

## Important

- **Pass the full pasted text** into `parseMLSFromHARText`. If your code only parses a substring (e.g. the part after "Address:"), the "ML#: AU2421059" line may be in the part you skip. Call `parseMLSFromHARText(fullPastedText)` once, then attach the result to the active listing object.

## Fix

1. **Open** `frontend/src/features/dashboard/components/LandCalculator.tsx`.

2. **Import the parser** (at the top):
   ```ts
   import { parseMLSFromHARText } from './landCalculatorParseMLS';
   ```

3. **Where you handle the pasted text for the active listing:**
   - As soon as you have the **full** pasted string (e.g. from a textarea or paste event), run:
     ```ts
     const mlsNumber = parseMLSFromHARText(fullPastedText);
     ```
   - When you build the object for the active listing (address, list price, etc.), set the MLS # field from that:
     ```ts
     // example – use whatever your active listing object and field name are
     activeListing.mlsNumber = mlsNumber;   // or mls, mlsId, etc.
     ```

4. **If you split the paste into sections** (e.g. by "Address:" or newlines), still run `parseMLSFromHARText` on the **full** string first (before splitting), then assign that value to the one active listing you’re filling. The "ML#:" line often appears near the top (e.g. before "Address:"), so it can be missed if you only parse a lower section.

The parser matches:
- `ML#:` or `ML# :` then optional space/tab, then the id (e.g. `AU2421059`)
- Fallback: `ML# ` (no colon) then the id

So **ML#: AU2421059** or **ML#:	AU2421059** (tab) will populate the MLS # field.
