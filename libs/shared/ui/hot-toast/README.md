# Hot Toast

Signal-first Angular toast notifications inspired by React Hot Toast.

## Public API

Import from `@table-provider/hot-toast`:

- `HotToasterComponent`
- `HotToastService`
- `injectHotToast`
- `withHotToast`
- toast option and template context types

Do not import files from `src/lib/components` or `src/lib/pipes`; those are internal rendering details.

## Basic Component Usage

Add one toaster component near the root of the feature or application shell:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HotToasterComponent } from '@table-provider/hot-toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotToasterComponent],
  selector: 'app-shell',
  template: `
    <lib-hot-toaster position="top-right" />
    <router-outlet />
  `
})
export class AppShellComponent {}
```

Trigger toasts from any injectable context:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectHotToast } from '@table-provider/hot-toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-save-button',
  template: `
    <button type="button" (click)="save()">Save</button>
  `
})
export class SaveButtonComponent {
  private readonly toast = injectHotToast();

  save(): void {
    this.toast.success('Settings saved', {
      description: 'The changes are available immediately.'
    });
  }
}
```

## Configure Defaults

Use `withHotToast` in application providers:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { withHotToast } from '@table-provider/hot-toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]),
    withHotToast({
      position: 'top-right',
      removeDelay: 600,
      success: {
        duration: 2500
      },
      error: {
        duration: 5000
      }
    })
  ]
};
```

## Component Inputs

`HotToasterComponent` supports the same placement names as React Hot Toast:

```html
<lib-hot-toaster position="bottom-right" [gutter]="12" [reverseOrder]="true" [toastOptions]="{ duration: 4000 }" />
```

Available positions:

- `top-left`
- `top-center`
- `top-right`
- `bottom-left`
- `bottom-center`
- `bottom-right`

## Multiple Toasters

Use `toasterId` when a feature needs an isolated notification lane:

```html
<lib-hot-toaster position="top-right" />
<lib-hot-toaster toasterId="activity" position="bottom-left" />
```

```ts
this.toast.success('Activity stream connected', {
  toasterId: 'activity'
});
```

## Toast API Examples

```ts
const toastId = this.toast.loading('Generating report');

this.toast.success('Report generated', {
  id: toastId,
  description: 'The loading toast was updated in place.'
});

this.toast.error('Sync failed', {
  action: {
    label: 'Retry',
    onClick: () => this.retrySync()
  }
});

this.toast.dismiss(); // starts exit animation for all toasts
this.toast.remove(); // removes all toasts immediately
```

## Promise Compatibility

```ts
await this.toast.promise(this.saveInvoice(), {
  loading: 'Saving invoice',
  success: invoice => `Invoice ${invoice.number} saved`,
  error: error => (error instanceof Error ? error.message : 'Invoice save failed')
});
```

## Signal-First Async State

`toast.signal` observes a signal state. It does not render anything while the state is `idle`.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HotToastSignalState, injectHotToast } from '@table-provider/hot-toast';

type SyncResult = {
  count: number;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sync-button',
  template: `
    <button type="button" (click)="startSync()">Sync</button>
  `
})
export class SyncButtonComponent {
  private readonly toast = injectHotToast();
  readonly syncState = signal<HotToastSignalState<SyncResult>>({ status: 'idle' });

  startSync(): void {
    const controller = this.toast.signal(this.syncState, {
      loading: 'Syncing inventory',
      success: result => `Synced ${result.count} products`,
      error: error => (error instanceof Error ? error.message : 'Inventory sync failed')
    });

    this.syncState.set({ status: 'loading' });

    void this.syncInventory()
      .then(result => this.syncState.set({ status: 'success', value: result }))
      .catch(error => this.syncState.set({ status: 'error', error }))
      .finally(() => controller.destroy());
  }

  private syncInventory(): Promise<SyncResult> {
    return Promise.resolve({ count: 32 });
  }
}
```

## Template Toast Content

Messages, descriptions, and icons can be strings or Angular `TemplateRef`s.

```html
<button type="button" (click)="showTemplateToast()">Show template toast</button>

<ng-template #customToast let-toast="toast" let-dismiss="dismiss">
  <div>
    <p class="text-sm font-semibold text-slate-900">Template notification</p>
    <p class="mt-1 text-sm text-slate-600">{{ toast.id }} rendered from a TemplateRef.</p>
    <button type="button" (click)="dismiss()">Dismiss</button>
  </div>
</ng-template>
```

```ts
import { ChangeDetectionStrategy, Component, TemplateRef, viewChild } from '@angular/core';
import { HotToastTemplateContext, injectHotToast } from '@table-provider/hot-toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-template-toast-button',
  templateUrl: './template-toast-button.component.html'
})
export class TemplateToastButtonComponent {
  private readonly toast = injectHotToast();
  private readonly customToast = viewChild.required<TemplateRef<HotToastTemplateContext>>('customToast');

  showTemplateToast(): void {
    this.toast.custom(this.customToast(), {
      duration: 5000
    });
  }
}
```
