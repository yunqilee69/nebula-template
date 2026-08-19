# SubjectSelector

SubjectSelector is a tripartite selector component that allows users to choose between Organizations, Roles, and Users. It provides a unified interface for subject selection in permission management pages.

## When to Use

Use SubjectSelector when you need to select a subject (organization, role, or user) for:

- Menu permission assignment
- Button permission assignment
- Data scope filtering
- Any permission or authorization workflow

## Features

- **Three-in-one design**: Seamlessly switch between Organization, Role, and User tabs
- **Tree view for organizations**: Hierarchical display with expand/collapse
- **List view for roles/users**: Clean list with search functionality
- **Visual selection state**: Clear indication of currently selected subject
- **Search**: Filter subjects by name, code, or description

## Supported Props

### `activeType`

- **Type:** `PermissionSubjectType` (`'ORG'` | `'ROLE'` | `'USER'`)
- **Required:** Yes
- **Behavior:** Controls which tab is currently active.

### `keyword`

- **Type:** `string`
- **Required:** Yes
- **Behavior:** Current search keyword for filtering subjects.

### `orgSubjects`

- **Type:** `PermissionSubject[]`
- **Required:** Yes
- **Behavior:** Organization subjects with tree structure.

### `roleSubjects`

- **Type:** `PermissionSubject[]`
- **Required:** Yes
- **Behavior:** Role subjects (flat list).

### `userSubjects`

- **Type:** `PermissionSubject[]`
- **Required:** Yes
- **Behavior:** User subjects (flat list).

### `selectedSubject`

- **Type:** `PermissionSubject`
- **Default:** `undefined`
- **Behavior:** Currently selected subject.

### `onTypeChange`

- **Type:** `(type: PermissionSubjectType) => void`
- **Required:** Yes
- **Behavior:** Called when user switches between tabs.

### `onKeywordChange`

- **Type:** `(keyword: string) => void`
- **Required:** Yes
- **Behavior:** Called when search keyword changes.

### `onSelect`

- **Type:** `(subject: PermissionSubject) => void`
- **Required:** Yes
- **Behavior:** Called when a subject is selected.

## Usage Examples

### Basic usage

```tsx
import { SubjectSelector } from '@/components/subject-selector';
import type { PermissionSubject, PermissionSubjectType } from '@/types/permission';

function PermissionPage() {
  const [activeType, setActiveType] = useState<PermissionSubjectType>('ORG');
  const [keyword, setKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<PermissionSubject>();

  return (
    <SubjectSelector
      activeType={activeType}
      keyword={keyword}
      orgSubjects={orgs}
      roleSubjects={roles}
      userSubjects={users}
      selectedSubject={selectedSubject}
      onTypeChange={(type) => {
        setActiveType(type);
        setKeyword('');
      }}
      onKeywordChange={setKeyword}
      onSelect={setSelectedSubject}
    />
  );
}
```

### With controlled state

```tsx
const [state, setState] = useState({
  activeType: 'ORG' as PermissionSubjectType,
  keyword: '',
  selectedSubject: undefined as PermissionSubject | undefined,
});

<SubjectSelector
  activeType={state.activeType}
  keyword={state.keyword}
  orgSubjects={orgs}
  roleSubjects={roles}
  userSubjects={users}
  selectedSubject={state.selectedSubject}
  onTypeChange={(type) => setState(prev => ({ ...prev, activeType: type, keyword: '' }))}
  onKeywordChange={(keyword) => setState(prev => ({ ...prev, keyword }))}
  onSelect={(subject) => setState(prev => ({ ...prev, selectedSubject: subject }))}
/>
```

## Subject Data Structure

```typescript
interface PermissionSubject {
  id: string;
  name: string;
  code: string;
  type: 'ORG' | 'ROLE' | 'USER';
  description?: string;
  children?: PermissionSubject[]; // For organizations only
}
```