import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  type TemplateRef,
  viewChild
} from '@angular/core';
import {
  HotToastDefaultOptions,
  HotToastPosition,
  HotToastSignalController,
  HotToastSignalState,
  HotToasterComponent,
  HotToastService,
  HotToastTemplateContext,
  injectHotToast
} from '@table-provider/hot-toast';

type SyncResult = {
  count: number;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotToasterComponent],
  selector: 'app-hot-toast-showcase',
  styleUrl: './hot-toast-showcase.component.css',
  templateUrl: './hot-toast-showcase.component.html'
})
export class HotToastShowcaseComponent implements OnDestroy {
  readonly #toast = injectHotToast();
  readonly #toastService = inject(HotToastService);
  private readonly customToast = viewChild.required<TemplateRef<HotToastTemplateContext>>('customToast');

  readonly loadingToastId = signal<string | null>(null);
  readonly signalToastId = signal<string | null>(null);
  readonly signalTask = signal<HotToastSignalState<SyncResult>>({ status: 'idle' });
  readonly selectedPlacement = signal<HotToastPosition>('top-right');
  readonly lastEvent = signal('Ready');
  readonly activeToastCount = computed(() => this.#toastService.toasts().filter(toast => toast.visible).length);
  readonly placements: readonly HotToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ];

  readonly toastOptions: HotToastDefaultOptions = {
    removeDelay: 600,
    success: {
      duration: 2600
    },
    error: {
      duration: 5000
    }
  };

  readonly activityToastOptions: HotToastDefaultOptions = {
    className: 'border-blue-200',
    duration: 5000,
    removeDelay: 400
  };

  #sequence = 0;
  #signalController: HotToastSignalController | null = null;

  ngOnDestroy(): void {
    this.#signalController?.destroy();
  }

  showBlank(): void {
    this.#sequence += 1;
    this.#toast(`Import queued #${this.#sequence}`, {
      description: 'The queue is controlled by the signal toast service.'
    });
    this.lastEvent.set('Blank toast queued');
  }

  showSuccess(): void {
    this.#toast.success('Inventory saved', {
      description: 'The success shorthand uses a shorter default duration.'
    });
    this.lastEvent.set('Success toast shown');
  }

  showError(): void {
    this.#toast.error('Sync failed', {
      description: 'Errors use assertive aria live output and stay visible longer.'
    });
    this.lastEvent.set('Error toast shown');
  }

  showLoading(): void {
    const existingToastId = this.loadingToastId();

    if (existingToastId) {
      this.#toast.success('Report generated', {
        description: 'The loading toast was updated in place by id.',
        id: existingToastId
      });
      this.loadingToastId.set(null);
      this.lastEvent.set('Loading toast resolved');
      return;
    }

    const toastId = this.#toast.loading('Generating report', {
      description: 'Click the button again or wait for the simulated job.'
    });

    this.loadingToastId.set(toastId);
    this.lastEvent.set('Loading toast shown');

    window.setTimeout(() => {
      if (this.loadingToastId() !== toastId) {
        return;
      }

      this.#toast.success('Report generated', {
        description: 'The same toast id now renders a success state.',
        id: toastId
      });
      this.loadingToastId.set(null);
      this.lastEvent.set('Loading toast auto-resolved');
    }, 1800);
  }

  showSignal(): void {
    this.#signalController?.destroy();
    this.signalTask.set({ status: 'loading' });

    const controller = this.#toast.signal(this.signalTask, {
      loading: 'Signal task running',
      success: result => `Signal task synced ${result.count} products`,
      error: error => (error instanceof Error ? error.message : 'Signal task failed')
    });

    this.#signalController = controller;
    this.signalToastId.set(controller.id);
    this.lastEvent.set('Signal toast started');

    window.setTimeout(() => {
      if (this.signalToastId() !== controller.id || this.signalTask().status !== 'loading') {
        return;
      }

      this.signalTask.set({ status: 'success', value: { count: 32 } });
      this.signalToastId.set(null);
      this.lastEvent.set('Signal toast resolved');
    }, 1200);
  }

  showPromise(): void {
    this.lastEvent.set('Promise toast started');

    void this.#toast
      .promise(this.#syncInventory(), {
        loading: 'Syncing inventory',
        success: result => `Synced ${result.count} products`,
        error: error => (error instanceof Error ? error.message : 'Inventory sync failed')
      })
      .then(result => this.lastEvent.set(`Promise resolved with ${result.count} products`))
      .catch(() => this.lastEvent.set('Promise rejected'));
  }

  showAction(): void {
    this.#toast.success('Price rule published', {
      action: {
        label: 'Undo',
        onClick: () => {
          this.lastEvent.set('Price rule reverted');
          this.#toast('Price rule reverted', {
            id: 'price-rule-undo'
          });
        }
      },
      description: 'The action callback can trigger another toast.'
    });
    this.lastEvent.set('Action toast shown');
  }

  showCustom(): void {
    this.#toast.custom(this.customToast(), {
      action: {
        label: 'Pin',
        dismiss: false,
        onClick: toast => this.lastEvent.set(`${toast.id} pinned`)
      },
      duration: 5000
    });
    this.lastEvent.set('Template toast shown');
  }

  showPersistent(): void {
    this.#toast('Manual review required', {
      action: {
        label: 'Open',
        dismiss: false,
        onClick: () => this.lastEvent.set('Review opened')
      },
      description: 'This notification stays until dismissed or removed.',
      duration: Number.POSITIVE_INFINITY,
      id: 'manual-review'
    });
    this.lastEvent.set('Persistent toast shown');
  }

  showActivityToast(): void {
    this.#toast.success('Activity stream connected', {
      description: 'This uses toasterId="activity" and renders bottom-left.',
      toasterId: 'activity'
    });
    this.lastEvent.set('Activity toaster used');
  }

  selectPlacement(position: HotToastPosition): void {
    this.selectedPlacement.set(position);
    this.lastEvent.set(`Placement selected: ${position}`);
  }

  showPlacementToast(): void {
    const position = this.selectedPlacement();

    this.#toast.success(`Toast placed ${position}`, {
      description: 'This uses the per-toast position option, matching React Hot Toast placement names.',
      position
    });
    this.lastEvent.set(`Placement toast shown: ${position}`);
  }

  dismissAll(): void {
    this.#toast.dismiss();
    this.loadingToastId.set(null);
    this.signalToastId.set(null);
    this.lastEvent.set('All toasts dismissed');
  }

  removeAll(): void {
    this.#toast.remove();
    this.loadingToastId.set(null);
    this.signalToastId.set(null);
    this.lastEvent.set('All toasts removed');
  }

  #syncInventory(): Promise<SyncResult> {
    return new Promise(resolve => {
      window.setTimeout(() => resolve({ count: 32 }), 1200);
    });
  }
}
