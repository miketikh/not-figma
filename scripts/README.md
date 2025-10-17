# Migration Scripts

This directory contains scripts for migrating data between different schema versions.

## migrate-to-canvases.ts

Migrates existing canvas objects from the old flat `canvasObjects` collection to the new multi-canvas nested structure (`canvases/{canvasId}/objects/{objectId}`).

### What it does

1. **Fetches all objects** from the old `canvasObjects` collection
2. **Groups objects by user** (using the `createdBy` field)
3. **Creates a "Default Canvas"** for each user with:
   - ID: `default-canvas-{userId}`
   - Name: "Default Canvas"
   - Dimensions: 1920x1080
4. **Copies objects** to new nested collection path:
   - From: `canvasObjects/{objectId}`
   - To: `canvases/default-canvas-{userId}/objects/{objectId}`
5. **Adds canvasId field** to each migrated object
6. **Preserves all existing data** - no data loss
7. **Uses batch writes** for data integrity
8. **Keeps old data** for rollback (DO NOT DELETE for 7 days)

### Usage

#### Dry Run (Preview Only)

Always run this first to preview changes without writing to Firestore:

```bash
npm run migrate:dry-run
```

This will show you:

- How many objects will be migrated
- How many users found
- How many canvases will be created
- Which objects belong to which user

#### Run Migration

After reviewing the dry run output:

```bash
npm run migrate
```

You will be prompted to confirm before any data is written.

### Safety Features

- **Dry run mode**: Preview changes without writing
- **Confirmation prompt**: Requires explicit "yes" to proceed
- **Batch writes**: Uses Firestore transactions for data integrity
- **Error handling**: Continues on individual errors, reports at end
- **Preserves old data**: Original collection remains untouched
- **Detailed logging**: Every action is logged with timestamps
- **Per-user processing**: Errors in one user's migration don't affect others

### Example Output

```
[2025-10-16T12:00:00.000Z] ℹ Starting migration (DRY RUN)
[2025-10-16T12:00:00.100Z] ℹ Fetching objects from "canvasObjects" collection...
[2025-10-16T12:00:00.500Z] ✓ Found 150 objects
[2025-10-16T12:00:00.510Z] ℹ Grouping objects by user...
[2025-10-16T12:00:00.520Z] ✓ Found 3 unique users
[2025-10-16T12:00:00.521Z] ℹ   User user123: 100 objects
[2025-10-16T12:00:00.522Z] ℹ   User user456: 40 objects
[2025-10-16T12:00:00.523Z] ℹ   User user789: 10 objects
[2025-10-16T12:00:00.600Z] ℹ [DRY RUN] Would create canvas: default-canvas-user123 for user: user123
...
[2025-10-16T12:00:01.000Z] ✓ Migration Preview Complete
Total objects in old collection: 150
Users found: 3
Canvases to be created: 3
Objects to be migrated: 150
Errors: 0

This was a DRY RUN. No data was written to Firestore.
Run without --dry-run flag to execute the migration.
```

### After Migration

1. **Verify the data**: Check the Firestore console to ensure all objects were migrated correctly
2. **Test the application**: Create, edit, and delete objects on the new canvases
3. **Keep old data for 7 days**: The original `canvasObjects` collection remains as backup
4. **Update security rules**: Ensure Firestore rules are updated for the new structure
5. **Monitor errors**: Check application logs for any issues

### Rollback

If you need to rollback:

1. The old `canvasObjects` collection still exists (unchanged)
2. Delete the new canvases and their objects
3. The application will fall back to the old structure (if fallback code is implemented in PR #13)

DO NOT delete the old `canvasObjects` collection until you've verified the migration succeeded and the application works correctly with the new structure for at least 7 days.

### Troubleshooting

**Q: Migration script can't find Firebase credentials**
A: Ensure your `.env.local` file exists and contains all required Firebase environment variables.

**Q: Permission denied errors**
A: Check your Firebase security rules. The migration script uses the Firebase Admin SDK credentials.

**Q: Some objects failed to migrate**
A: Check the error log at the end of migration. Objects that failed will be listed with reasons. You can re-run the migration - it will skip objects that already exist in the new structure.

**Q: Do I need to delete the old collection?**
A: No! Keep it for at least 7 days as a backup. Only delete after thoroughly verifying the migration succeeded.

### Environment Variables Required

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
```

### Technical Details

- **Batch size**: 500 objects per batch (Firestore limit)
- **Canvas ID format**: `default-canvas-{userId}`
- **Default canvas dimensions**: 1920x1080
- **Default canvas name**: "Default Canvas"
- **Runs on**: Node.js with tsx (TypeScript execution)
- **Dependencies**: firebase, @types/node
