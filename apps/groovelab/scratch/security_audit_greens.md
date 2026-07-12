# Security & Role Badge Color Audit (Green Colors)

This document provides a comprehensive audit of the **Campus-Groovelab** codebase to identify if green colors are used in security/role badges, sensitive visibility toggles, or safety/security statuses, and evaluates their alignment with platform rules.

---

## 1. Executive Summary

An audit of the codebase (`apps/groovelab/src`) was conducted to identify uses of green color codes (such as `#10b981`, `#22c55e`, `#16a34a`, and `#e6f4ea`) in security/role badges and visibility toggles. 

The primary findings indicate:
1. **Role Display Inconsistency in User Pass Gallery**: Non-student users (including administrators and secretariat staff) are styled with green headers (`#10b981`) and borders in the ID Card Gallery view. This conflicts with the rule that Admin and Secretariat modules must prioritize red accents and highlight elements.
2. **Correct Separation in QR Pass Modal**: The detail view for QR passes correctly segregates roles, utilizing a red gradient for administrators and secretariat staff, and green for students.
3. **Activation & Status Indicators**: Toggles such as student billing status ("Aktiv" / "Inaktiv") use standard green styling (`#10b981` / `#e6f4ea`), which appropriately conveys active states without obfuscating safety statuses.
4. **Hardware/Station Mapping**: "Lehrer" / "Teacher" stations are assigned green hues (`#22c55e` or `#10b981`) in checking-in logic, which represents station status rather than an administrative role permission.

---

## 2. Detailed Findings

### A. Role Badges & ID Cards
* **File Reference**: [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L16081-L16102) (User Pass Gallery)
  * **Code Snippet**:
    ```tsx
    background: u.role === 'student' ? '#eab308' : '#10b981', 
    ...
    {u.role === 'student' ? 'Member Access' : 'Staff / Coach'}
    ```
  * **Issue**: The gallery card view labels any non-student (`u.role !== 'student'`), including `admin` and `secretary`, with the green `#10b981` "Staff / Coach" header and badge borders. This contrasts with the Admin/Secretariat branding rules which dictate using red highlights (`#ea4335`), and could lead to confusion regarding access controls.

* **File Reference**: [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L12243-L12250) (QR Pass Detail Modal)
  * **Code Snippet**:
    ```tsx
    style={(selectedQRUser.role === 'student' || isQRAdminOrSecretary) ? {
      background: isQRAdminOrSecretary ? 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)' : 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
    ```
  * **Status**: Correctly applies a red gradient for `admin` and `secretary` roles (`isQRAdminOrSecretary`). However, the fallback detail view for staff members (e.g. teachers/coaches) who fall outside `isQRAdminOrSecretary` uses the white pass style with green highlights (`#10b981`). This is acceptable for teachers since green is permitted for educators, but the gallery view remains inconsistent.

---

### B. Sensitive Visibility & Account Activation Toggles
* **File Reference**: [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L5185-L5194) (Student Activation Badge)
  * **Code Snippet**:
    ```tsx
    (activePlatform === 'campus' ? s.is_campus_active : s.is_groovelab_active) ? (
      <div style={{ padding: '1px 5px', background: '#e6f4ea', color: '#10b981', borderRadius: '5px', fontSize: '0.6rem', fontWeight: 900 }}>
        Aktiv
      </div>
    )
    ```
  * **Status**: Standard green styling for positive active status ("Aktiv"). Modifying this color would risk obfuscating the activation status of student accounts (which is linked to billing).

* **File Reference**: [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L15619-L15620) (Text Template Toggle)
  * **Code Snippet**:
    ```tsx
    background: tb.active ? '#f0fdf4' : '#f1f5f9',
    color: tb.active ? '#16a34a' : '#64748b',
    ```
  * **Status**: Uses green to show that a feedback text template is active. This is a low-severity visibility setting and does not impact security or role permissions.

---

### C. Station Hues & Physical Checks
* **File References**: 
  * [App.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx#L128)
  * [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L195)
  * [SecretaryDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/SecretaryDashboard.tsx#L248)
  * [DeviceSetupScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/DeviceSetupScreen.tsx#L361)
  * [LoginScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/LoginScreen.tsx#L317)
* **Code Snippet**:
  ```tsx
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'; // Green
  ```
* **Status**: Mapped green for Lehrer stations. This acts as a device category marker rather than a role badge and does not impact safety statuses.

---

### D. Secretariat Crisis/Informed Statuses
* **File Reference**: [SecretaryDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/SecretaryDashboard.tsx#L12633) (Resolved status)
  * **Code Snippet**:
    ```tsx
    GREEN: { leftBar: '#10b981', badge: '#10b981', badgeLabel: '✓ Informiert' }
    ```
  * **Status**: Standard green resolved state indicator for ticket notifications. Changing this could obfuscate the safety status (e.g. indicating whether parents have been successfully informed in a crisis scenario).

---

## 3. Safety & Security Impact Assessment

Changing colors blindly can lead to safety status obfuscation:
* **Active Statuses**: Changing the `#10b981` ("Aktiv") badge to another color in the admin/billing module might hide whether a user is currently activated or deactivated.
* **Crisis Statuses**: Changing the green color of resolved crisis tickets ("✓ Informiert") could make it harder for secretariats to instantly spot which issues have been handled vs. which ones are still open (which are marked in red).

However, **role-based badges** (such as identifying an admin/secretary user pass in a list) should be aligned with the module theme colors:
* Admin/Secretary card accents should be **red** (`#ea4335` or `#b91c1c`) rather than **green** (`#10b981`) to align with design rules and prevent confusion about active roles.

---

## 4. Recommendations

1. **Update User Pass Gallery Role Badges**:
   Modify the gallery card rendering logic in [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx#L16081-L16102) to explicitly color admin/secretary user cards with red rather than green, aligning with the rules for admin/secretary module styling:
   ```tsx
   const isQRAdminOrSec = u.role === 'admin' || u.role === 'secretary' || (Array.isArray(u.roles) && (u.roles.includes('admin') || u.roles.includes('secretary')));
   // Use #b91c1c (red) for admin/secretary cards, #eab308 for students (yellow), and #10b981 for teachers (green)
   const cardHeaderColor = isQRAdminOrSec ? '#b91c1c' : (u.role === 'student' ? '#eab308' : '#10b981');
   ```

2. **Preserve Safety Toggles**:
   Maintain the green color codes for `is_campus_active` / `is_groovelab_active` "Aktiv" statuses and the crisis dashboard `GREEN` ticket statuses. These are functional security/safety indicators where green explicitly means "active/resolved" without conflict.
