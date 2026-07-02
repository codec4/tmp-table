import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HotToasterComponent } from './components/toaster/hot-toaster.component';
import { HotToastService, withHotToast } from './hot-toast.service';
import { HotToastSignalState } from './hot-toast.types';

describe('hot toast', () => {
  let service: HotToastService;

  afterEach(() => {
    service?.toast.remove();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('creates a success toast and removes it after duration plus remove delay', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [withHotToast({ removeDelay: 500 })]
    });
    service = TestBed.inject(HotToastService);

    const toastId = service.toast.success('Record created');

    expect(service.toasts()).toEqual([
      expect.objectContaining({
        duration: 2000,
        id: toastId,
        message: 'Record created',
        removeDelay: 500,
        type: 'success',
        visible: true
      })
    ]);

    vi.advanceTimersByTime(2000);

    expect(service.toasts()[0]).toEqual(expect.objectContaining({ id: toastId, visible: false }));

    vi.advanceTimersByTime(499);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('updates an existing toast when the id is reused', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotToastService);

    const toastId = service.toast.loading('Saving record');

    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({
        duration: Number.POSITIVE_INFINITY,
        message: 'Saving record',
        type: 'loading'
      })
    );

    service.toast.success('Record saved', { id: toastId });

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({
        id: toastId,
        message: 'Record saved',
        type: 'success',
        visible: true
      })
    );

    vi.advanceTimersByTime(2000);
    expect(service.toasts()[0].visible).toBe(false);
  });

  it('pauses and resumes auto-dismiss timers for a toaster instance', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotToastService);

    const toastId = service.toast('Hover keeps this open', {
      duration: 1000,
      removeDelay: 0
    });

    vi.advanceTimersByTime(400);
    service.startPause();

    expect(service.toasts()[0]).toEqual(expect.objectContaining({ id: toastId, paused: true, visible: true }));

    vi.advanceTimersByTime(2000);
    expect(service.toasts()[0].visible).toBe(true);

    service.endPause();
    expect(service.toasts()[0].paused).toBe(false);

    vi.advanceTimersByTime(599);
    expect(service.toasts()[0].visible).toBe(true);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('maps promise state to loading and success toasts with the same id', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotToastService);

    const result = await service.toast.promise(Promise.resolve({ count: 3 }), {
      loading: 'Saving records',
      success: value => `Saved ${value.count} records`,
      error: 'Save failed'
    });

    expect(result).toEqual({ count: 3 });
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({
        message: 'Saved 3 records',
        type: 'success'
      })
    );
  });

  it('maps signal state to loading and success toasts with the same id', async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotToastService);
    const state = signal<HotToastSignalState<{ count: number }>>({ status: 'loading' });

    const controller = service.toast.signal(state, {
      loading: 'Saving records from signal',
      success: value => `Saved ${value.count} signal records`,
      error: 'Signal save failed'
    });

    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({
        id: controller.id,
        message: 'Saving records from signal',
        type: 'loading'
      })
    );

    state.set({ status: 'success', value: { count: 4 } });
    TestBed.tick();

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({
        id: controller.id,
        message: 'Saved 4 signal records',
        type: 'success'
      })
    );

    controller.destroy();
  });

  it('renders toasts, actions, and dismiss controls through the toaster component', async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [HotToastHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(HotToastHostComponent);
    service = fixture.componentInstance.toasts;
    fixture.detectChanges();

    const toastId = fixture.componentInstance.toasts.toast.success('Email sent', {
      action: {
        label: 'Undo',
        onClick: () => fixture.componentInstance.toasts.toast('Send cancelled')
      },
      description: 'The message is queued for delivery.'
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email sent');
    expect(fixture.nativeElement.textContent).toContain('The message is queued for delivery.');
    expect(fixture.nativeElement.textContent).toContain('Undo');

    buttonWithText(fixture, 'Undo').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Send cancelled');

    dismissButton(fixture).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.toasts.toasts().find(toast => toast.id === toastId)?.visible).toBe(false);
  });
});

@Component({
  imports: [HotToasterComponent],
  template: `
    <lib-hot-toaster position="top-right" />
  `
})
class HotToastHostComponent {
  readonly toasts = inject(HotToastService);
}

const buttonWithText = (fixture: ComponentFixture<HotToastHostComponent>, text: string): HTMLButtonElement => {
  const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'));
  const button = buttons.find(candidate => candidate.textContent?.trim() === text);

  if (!button) {
    throw new Error(`Button with text "${text}" was not rendered.`);
  }

  return button;
};

const dismissButton = (fixture: ComponentFixture<HotToastHostComponent>): HTMLButtonElement => {
  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    '[aria-label="Dismiss notification"]'
  );

  if (!button) {
    throw new Error('Dismiss button was not rendered.');
  }

  return button;
};
