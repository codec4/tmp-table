import { HotToastItemClassPipe } from './hot-toast-item-class.pipe';
import { HotToast } from '../hot-toast.types';

describe('HotToastItemClassPipe', () => {
  it('uses visible classes and appends custom toast classes', () => {
    const pipe = new HotToastItemClassPipe();

    expect(pipe.transform(toastStub({ className: 'custom-toast', visible: true }))).toContain(
      'translate-y-0 opacity-100 custom-toast'
    );
  });

  it('moves hidden top toasts upward', () => {
    const pipe = new HotToastItemClassPipe();

    expect(pipe.transform(toastStub({ position: 'top-right', visible: false }))).toContain('-translate-y-2 opacity-0');
  });

  it('moves hidden bottom toasts downward', () => {
    const pipe = new HotToastItemClassPipe();

    expect(pipe.transform(toastStub({ position: 'bottom-right', visible: false }))).toContain(
      'translate-y-2 opacity-0'
    );
  });
});

const toastStub = (overrides: Partial<HotToast> = {}): HotToast => ({
  action: null,
  ariaProps: {
    ariaLive: 'polite',
    role: 'status'
  },
  className: '',
  createdAt: 0,
  description: null,
  dismissible: true,
  duration: 0,
  icon: null,
  iconTheme: null,
  id: 'toast-id',
  message: 'Toast',
  paused: false,
  position: 'top-center',
  removeDelay: 0,
  style: null,
  toasterId: 'default',
  type: 'blank',
  updatedAt: 0,
  visible: true,
  ...overrides
});
