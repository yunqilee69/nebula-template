# NeUpload and NeImageUpload

`NeUpload` is a reusable Nebula Storage attachment uploader. `NeImageUpload` uses the same upload model with image-first preview layouts.

## When to Use

- Use `NeUpload` for common business attachments such as contracts, PDFs, and office documents.
- Use `NeImageUpload` for avatars, cover images, galleries, and multi-image evidence uploads.
- Use Ant Design `Upload` directly only when the file does not need Nebula Storage task metadata or source backfill.

## Storage Flow

The components upload files to temporary storage and return upload task metadata. They do not bind files automatically. Business pages should call `bindUploadTask` after their own save succeeds.

## Source Backfill

Pass `sourceEntity` and `sourceId` with `listBySource` to load existing formal files. Pass `sourceType` to load a specific business slot. Leave `sourceType` empty to load all files for the business object. The component still displays only up to `maxCount` files.

Backfill merges the server list with local files that have not been bound yet (files with a `taskId` but no `fileId`). An upload that finishes while the backfill request is still in flight therefore stays in the list instead of being dropped by the backfill response.

Use `onBackfillComplete` when the page must wait for backfill before saving: the callback fires once per backfill query with the merged list and a `success` flag. It is not called when no query runs (no `listBySource`, or `sourceEntity`/`sourceId` missing), so consumers that always pass a source can treat "not called yet" as "not loaded". On failure the list is left as-is and `success` is `false`; pages can then save basic fields without submitting the file list.

## Thumbnails

For image files the component points the thumbnail at the server's `thumb` derivation, which is far
smaller than the original. It does so only when `listBySource` reports a `thumb` entry in the file's
`variants` list — asking for a derivation the server never produced would make every thumbnail load
the original image and log a fallback warning on each request. When image processing is disabled and
no derivation exists, the thumbnail falls back to the original.

Preview and download URLs carry a strong `ETag` and a private `Cache-Control`, so browsers revalidate
instead of re-downloading. Attachments listed by name (download semantics) are served `no-store` and
are never cached.

## Supported Props

### NeUpload

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `NeUploadFile[]` | Controlled file list. When provided, the component does not manage internal state. |
| `defaultValue` | `NeUploadFile[]` | Initial file list for uncontrolled usage. Ignored when `value` is set. |
| `maxCount` | `number` | Maximum number of displayed files. Defaults to `1`. When backfill or upload exceeds this limit, only the first `maxCount` items are shown. |
| `replaceable` | `boolean` | Keeps the upload button visible for `maxCount={1}` so selecting a new file replaces the existing one. Use for avatars and single-slot images. |
| `accept` | `string` | HTML file-type filter passed to the browser file picker (e.g. `".pdf,.docx"`). |
| `disabled` | `boolean` | Disables the upload button and remove actions. |
| `sourceEntity` | `string` | Business entity name used with `listBySource` to backfill existing files (e.g. `"contract"`). |
| `sourceId` | `string` | Business entity ID used with `listBySource` to backfill existing files. |
| `sourceType` | `string` | Business slot name for backfill. When empty or whitespace-only, the backfill request omits `sourceType` and returns all files for the entity. |
| `uploadText` | `ReactNode` | Custom label for the upload button. Defaults to `"上传附件"`. |
| `helperText` | `ReactNode` | Secondary hint text rendered below the file list. |
| `className` | `string` | CSS class name applied to the root container. |
| `style` | `CSSProperties` | Inline styles applied to the root container. |
| `uploadRequest` | `(file: File) => Promise<UploadTaskDetailResp>` | Upload function called for each selected file. If omitted, attempts to upload will fail with an error. |
| `listBySource` | `(req: ListStorageFilesBySourceReq) => Promise<StorageFileDetailResp[]>` | Backfill query function. When provided together with `sourceEntity` and `sourceId`, existing files are loaded on mount. |
| `onBackfillComplete` | `(files: NeUploadFile[], success: boolean) => void` | Called once after each backfill query settles. `files` is the merged list; `success` is `false` when the query failed. Not called when no query runs. |
| `deleteFile` | `(file: NeUploadFile) => Promise<void>` | Called before removing a file from the list. Use to trigger server-side deletion. |
| `onChange` | `(files: NeUploadFile[]) => void` | Called with the updated file list after uploads, removals, and backfills. Always receives at most `maxCount` files. |
| `onUploadSuccess` | `(file: NeUploadFile, task: UploadTaskDetailResp) => void` | Called after a file uploads successfully, with the normalized file value and the raw task response. |
| `onUploadError` | `(file: NeUploadFile, error: unknown) => void` | Called when a file upload fails, with the error file value and the thrown error. |
| `onRemove` | `(file: NeUploadFile) => void` | Called after a file is removed from the list. |
| `onLimitExceeded` | `(files: File[], maxCount: number) => void` | Called when a user selects more files than remaining slots. When not provided, a default warning message is shown. |

### NeImageUpload

Inherits all `NeUpload` props except `accept` (which defaults to `"image/*"`). Additional props:

| Prop | Type | Description |
| --- | --- | --- |
| `accept` | `string` | File-type filter for the image picker. Defaults to `"image/*"`. |
| `shape` | `'square' \| 'circle'` | Thumbnail border shape. Defaults to `"square"`. |
| `thumbnailSize` | `number` | Thumbnail width and height in pixels. Defaults to `96`. |
| `preview` | `boolean` | Whether clicking a thumbnail opens an image preview. Defaults to `true`. |

## Examples

### Single attachment

```tsx
<NeUpload maxCount={1} uploadRequest={(file) => storageService.uploadSimpleFile(file)} />
```

### Backfilled attachments

```tsx
<NeUpload
  maxCount={3}
  sourceEntity="contract"
  sourceId="contract-1"
  sourceType="attachment"
  listBySource={storageService.listFilesBySource}
  uploadRequest={(file) => storageService.uploadSimpleFile(file)}
/>
```

### Deferred binding with backfill gating

```tsx
const [backfill, setBackfill] = useState<{ ready: boolean; success: boolean }>({
  ready: false,
  success: false,
});

<NeImageUpload
  maxCount={9}
  sourceEntity="product"
  sourceId={productId}
  sourceType="gallery"
  listBySource={storageService.listFilesBySource}
  uploadRequest={(file) => storageService.uploadSimpleFile(file)}
  onBackfillComplete={(_files, success) => setBackfill({ ready: true, success })}
/>
```

Keep save disabled until `backfill.ready`; when `backfill.success` is `false`, save the basic fields and skip submitting the file list.

### All files for a business object

```tsx
<NeUpload
  maxCount={5}
  sourceEntity="contract"
  sourceId="contract-1"
  sourceType=""
  listBySource={storageService.listFilesBySource}
  uploadRequest={(file) => storageService.uploadSimpleFile(file)}
/>
```

### Single image

```tsx
<NeImageUpload maxCount={1} uploadRequest={(file) => storageService.uploadSimpleFile(file)} />
```

### Multiple images

```tsx
<NeImageUpload maxCount={9} uploadRequest={(file) => storageService.uploadSimpleFile(file)} />
```
