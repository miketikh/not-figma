# Firebase Account Linking Guide

## The Problem

Firebase treats each authentication provider (email/password, Google, Facebook, etc.) as **separate identities** even if they share the same email. So:
- User signs up with `user@gmail.com` + password → Creates User A (UID: abc123)
- Same user signs in with Google using `user@gmail.com` → Creates User B (UID: xyz789)

These are **two completely different users** in Firebase's system.

## Detection Strategies

### 1. **Proactive Detection (Recommended)**

When a user tries to sign in with Google, check if an account already exists with that email:

```typescript
// In signInWithGoogle function
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      // This specific error fires when account linking is needed
      // Get the email from the error
      const email = error.email;
      
      // Fetch sign-in methods for this email
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      // methods might be: ['password', 'google.com', etc.]
      // Show user: "An account exists with email@example.com. 
      // Please sign in with [password/Google/etc] first."
      
      throw new Error(`Account exists. Please sign in with ${methods[0]}`);
    }
  }
}
```

### 2. **Email Verification Check**

```typescript
// Before allowing Google sign-in, check if email exists
const email = result.user.email;
const signInMethods = await fetchSignInMethodsForEmail(auth, email);

if (signInMethods.length > 0 && !signInMethods.includes('google.com')) {
  // Account exists with different provider
  // Option 1: Block and tell user to use correct method
  // Option 2: Offer to link accounts
}
```

## Account Linking Patterns

### **Pattern 1: Automatic Linking (Risky)**

Automatically link accounts when same email is detected. **Not recommended** because:
- Security risk: Anyone with access to a Google account could take over a password account
- No user consent
- Could link wrong accounts if emails are recycled

### **Pattern 2: Link After Re-authentication (Best Practice)**

This is the **most secure** approach:

```typescript
// Step 1: User tries to sign in with Google
const googleResult = await signInWithPopup(auth, googleProvider);
const googleCredential = GoogleAuthProvider.credentialFromResult(googleResult);

// Step 2: Detect existing account
const methods = await fetchSignInMethodsForEmail(auth, googleResult.user.email);

if (methods.includes('password') && !methods.includes('google.com')) {
  // Step 3: Show modal: "Account exists. Enter your password to link accounts"
  const password = await promptUserForPassword(); // UI modal
  
  // Step 4: Sign in with password first
  const emailResult = await signInWithEmailAndPassword(auth, email, password);
  
  // Step 5: NOW link the Google credential to the existing account
  await linkWithCredential(emailResult.user, googleCredential);
  
  // Step 6: User is now signed in and accounts are linked!
}
```

### **Pattern 3: Prompt User to Choose (User-Friendly)**

```typescript
// Detect the conflict
if (existingMethods.length > 0) {
  // Show modal with options:
  // 1. "Continue with existing [password] account" 
  //    → Ask for password, then link
  // 2. "Create new account with Google"
  //    → Sign out Google, let them create separate account
  // 3. "Cancel"
}
```

## Complete Flow (Recommended Implementation)

### **Scenario: User with email/password tries Google sign-in**

```
1. User clicks "Sign in with Google"
2. Google popup opens, user selects user@gmail.com
3. Firebase returns success with new Google user

4. Check: Does this email already exist?
   → Call fetchSignInMethodsForEmail(auth, 'user@gmail.com')
   → Returns: ['password'] (exists with password)

5. Show modal:
   "An account with user@gmail.com already exists.
    To link your Google account, please verify your password."
   
   [Password input field]
   [Link Accounts] [Cancel]

6. User enters password
7. Sign out the Google user temporarily
8. Sign in with email/password
9. Link the Google credential to the now-authenticated user
10. Success! User can now use either method to sign in
```

## Implementation Plan

### **1. Update Auth Helpers (`lib/firebase/auth.ts`)**

```typescript
import { 
  fetchSignInMethodsForEmail,
  linkWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword
} from 'firebase/auth';

// Custom error type for account linking
export interface AccountExistsError extends Error {
  code: 'auth/account-exists';
  email: string;
  existingMethods: string[];
  pendingCredential: any;
}

// Modified signInWithGoogle to detect existing accounts
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
    
    if (!email) {
      throw new Error('No email provided by Google');
    }
    
    // Check for existing accounts with this email
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    
    // If account exists with different provider, handle linking
    if (signInMethods.length > 0 && !signInMethods.includes('google.com')) {
      // Sign out the Google user we just created
      await firebaseSignOut(auth);
      
      // Store the credential for later linking
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Throw custom error with linking information
      const error = new Error('Account exists with different provider') as AccountExistsError;
      error.code = 'auth/account-exists';
      error.email = email;
      error.existingMethods = signInMethods;
      error.pendingCredential = credential;
      
      throw error;
    }
    
    return mapFirebaseUser(result.user);
  } catch (error) {
    throw error;
  }
}

// New helper for linking Google account
export async function linkGoogleAccount(
  email: string,
  password: string, 
  googleCredential: any
): Promise<User> {
  // Step 1: Sign in with email/password first
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  // Step 2: Link the Google credential to the existing account
  await linkWithCredential(result.user, googleCredential);
  
  // Step 3: Return updated user
  await result.user.reload();
  return mapFirebaseUser(result.user);
}

// Helper to check what providers an email is using
export async function getSignInMethodsForEmail(email: string): Promise<string[]> {
  return await fetchSignInMethodsForEmail(auth, email);
}
```

### **2. Update AuthProvider (`components/providers/AuthProvider.tsx`)**

```typescript
// Add to AuthContextType
export interface AuthContextType {
  // ... existing methods
  linkGoogleAccount: (email: string, password: string, credential: any) => Promise<void>;
  getSignInMethodsForEmail: (email: string) => Promise<string[]>;
}

// In AuthProvider component
const linkGoogleAccountHandler = async (
  email: string,
  password: string,
  credential: any
) => {
  const linkedUser = await authLinkGoogleAccount(email, password, credential);
  setUser(linkedUser);
};

const value: AuthContextType = {
  // ... existing values
  linkGoogleAccount: linkGoogleAccountHandler,
  getSignInMethodsForEmail: authGetSignInMethodsForEmail,
};
```

### **3. Create Account Linking Modal Component**

```typescript
// app/(auth)/_components/AccountLinkingModal.tsx
interface AccountLinkingModalProps {
  isOpen: boolean;
  email: string;
  existingMethod: string;
  pendingCredential: any;
  onLink: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function AccountLinkingModal({
  isOpen,
  email,
  existingMethod,
  pendingCredential,
  onLink,
  onCancel
}: AccountLinkingModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onLink(password);
    } catch (err) {
      setError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Link Your Accounts
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          An account with <strong>{email}</strong> already exists using {existingMethod}.
          Enter your password to link your Google account.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="link-password">Password</Label>
            <Input
              id="link-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleLink}
              disabled={loading || !password}
              className="flex-1"
            >
              {loading ? 'Linking...' : 'Link Accounts'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          After linking, you'll be able to sign in with either method.
        </p>
      </div>
    </div>
  );
}
```

### **4. Update LoginForm Component**

```typescript
// app/(auth)/login/_components/LoginForm.tsx
import { AccountLinkingModal } from '../../_components/AccountLinkingModal';

export default function LoginForm() {
  // ... existing state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState('');
  const [pendingCredential, setPendingCredential] = useState<any>(null);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/canvas");
    } catch (err: any) {
      if (err.code === 'auth/account-exists') {
        // Show linking modal
        setLinkingEmail(err.email);
        setPendingCredential(err.pendingCredential);
        setShowLinkModal(true);
        setError(`Account exists. Please verify your password to link accounts.`);
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccounts = async (password: string) => {
    await linkGoogleAccount(linkingEmail, password, pendingCredential);
    setShowLinkModal(false);
    router.push("/canvas");
  };

  const handleCancelLinking = () => {
    setShowLinkModal(false);
    setPendingCredential(null);
    setLinkingEmail('');
    setError('');
  };

  return (
    <>
      {/* Existing form JSX */}
      
      <AccountLinkingModal
        isOpen={showLinkModal}
        email={linkingEmail}
        existingMethod="email/password"
        pendingCredential={pendingCredential}
        onLink={handleLinkAccounts}
        onCancel={handleCancelLinking}
      />
    </>
  );
}
```

## Best Practices Summary

1. **Always check for existing accounts** before completing Google sign-in
2. **Require re-authentication** with the original password before linking
3. **Never auto-link** without user consent and verification
4. **Clear communication**: Tell users why they need to enter their password
5. **Provide choice**: Let users decide whether to link or keep separate
6. **Handle edge cases**:
   - What if they forgot their password? Offer password reset
   - What if they want separate accounts? Allow cancellation
   - What if Google account is already linked? Just sign them in

## Security Considerations

- **Email verification**: Consider requiring email verification before allowing account linking
- **2FA implications**: Linking accounts might bypass 2FA on original account
- **Audit trail**: Log account linking events for security monitoring
- **Reversal**: Consider allowing users to unlink accounts later in profile settings
- **Rate limiting**: Prevent brute force password attempts during linking

## Additional Features to Consider

### **1. Show All Linked Providers in Profile**

```typescript
// In profile page, show which providers are linked
const user = auth.currentUser;
if (user) {
  user.providerData.forEach((profile) => {
    console.log("Provider:", profile.providerId);
    // Display: "Google", "password", etc.
  });
}
```

### **2. Allow Unlinking Providers**

```typescript
// In profile settings
export async function unlinkProvider(providerId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  // Don't allow unlinking last provider
  if (user.providerData.length <= 1) {
    throw new Error('Cannot unlink your only sign-in method');
  }
  
  await unlink(user, providerId);
}
```

### **3. Password Reset Flow**

If user forgot password during linking, allow them to reset:

```typescript
// Add to modal: "Forgot password? Reset it here"
import { sendPasswordResetEmail } from 'firebase/auth';

await sendPasswordResetEmail(auth, email);
// Show: "Password reset email sent. Check your inbox."
```

## Testing Scenarios

1. **New user with Google**: Should work normally
2. **Existing email/password user tries Google**: Should show linking modal
3. **User cancels linking**: Should cancel gracefully, no account created
4. **User enters wrong password**: Should show error, allow retry
5. **User already has both linked**: Should sign in normally
6. **User forgot password**: Should offer reset option

## Implementation Priority

1. ✅ Basic Google sign-in (DONE)
2. ⏳ Detect existing accounts
3. ⏳ Build linking modal UI
4. ⏳ Implement linking flow
5. ⏳ Add error handling
6. ⏳ Profile page showing linked providers
7. ⏳ Unlink provider functionality
8. ⏳ Password reset in linking flow

---

## Notes

The key is: **Firebase won't do this automatically—you must build the detection and linking logic yourself.** The good news is Firebase provides all the APIs (`fetchSignInMethodsForEmail`, `linkWithCredential`, etc.) to implement it securely.

