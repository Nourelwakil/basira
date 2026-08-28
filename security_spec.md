# Security Specification

## 1. Data Invariants
- **Owner-Exclusive Isolation**: Any document under `/users/{userId}/datasets/{datasetId}` and `/users/{userId}/queries/{queryId}` can only be read, created, updated, or deleted if the authenticated user's `uid` strictly matches the `{userId}` path variable.
- **Strict Size/Type Limits**: Document ids, and text values must be bounded to prevent Denial-of-Wallet attacks.
- **Timestamp Integrity**: `uploadedAt` (for datasets) or `timestamp` (for queries) matching serverside validations or reasonable string dimensions.

## 2. The "Dirty Dozen" Violation Payloads
Here are the payloads designed to test and violate access control boundaries:

1. **Dataset Hijacking**: Creating a dataset under `/users/user_alice/datasets/dataset_1` with authenticated credentials of `user_bob`. (Expected: PERMISSION_DENIED)
2. **Query Hijacking**: Accessing queries under `/users/user_alice/queries/query_1` with credentials of `user_bob`. (Expected: PERMISSION_DENIED)
3. **Unauthenticated Read**: Fetching a dataset list without any authentication token. (Expected: PERMISSION_DENIED)
4. **Giant ID Injection**: Re-routing to an ID larger than 128 characters or containing SQL/XSS characters, e.g., `/users/user_alice/datasets/LONG_TRASH_BLOB...`. (Expected: PERMISSION_DENIED)
5. **PII Info Exfiltration**: Bob trying to query Alice's private private info subcategory. (Expected: PERMISSION_DENIED)
6. **Immutable Field Modification**: Overwriting a dataset's original `uploadedAt` timestamp during an update. (Expected: PERMISSION_DENIED)
7. **Invalid Dataset Type Payload**: Attempting to inject high-volume binary trash or non-string titles into `datasets.name`. (Expected: PERMISSION_DENIED)
8. **Malicious Query Schema**: Setting `chartType` payload to an unsanctioned value or a giant exploit payload. (Expected: PERMISSION_DENIED)
9. **Spam Creation**: Creating countless documents sequentially via automated client scripts exceeding maximum collection thresholds. (Expected: PERMISSION_DENIED or throttled)
10. **Unchecked List Queries**: Performing list queries on `/users/{userId}/datasets` passing another user's ID as filters. (Expected: PERMISSION_DENIED)
11. **Shadow State updates**: Sending a patch update including a ghost/shadow field not defined in standard properties. (Expected: PERMISSION_DENIED)
12. **Self-Promotion Admin Claims**: Setting the custom admin claims flags inside user data fields. (Expected: PERMISSION_DENIED)
