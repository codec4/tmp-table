import { HotToastPlacementClassPipe, HotToastPositionedToastsPipe } from './hot-toast-placement.pipe';
import { HotToast } from '../hot-toast.types';

describe('hot toast placement pipes', () => {
  it('maps React Hot Toast positions to container classes', () => {
    const pipe = new HotToastPlacementClassPipe();

    expect(pipe.transform('top-center')).toContain('left-1/2 top-4 -translate-x-1/2 items-center');
    expect(pipe.transform('bottom-right', 'custom-shell')).toContain('bottom-4 right-4 items-end');
    expect(pipe.transform('bottom-right', 'custom-shell')).toContain('custom-shell');
  });

  it('orders top and bottom positioned toasts using reverseOrder semantics', () => {
    const pipe = new HotToastPositionedToastsPipe();
    const firstToast = toastStub('first');
    const secondToast = toastStub('second');
    const groups = {
      'top-left': [firstToast, secondToast],
      'top-center': [],
      'top-right': [],
      'bottom-left': [firstToast, secondToast],
      'bottom-center': [],
      'bottom-right': []
    };

    expect(pipe.transform(groups, 'top-left', false).map(toast => toast.id)).toEqual(['second', 'first']);
    expect(pipe.transform(groups, 'bottom-left', false).map(toast => toast.id)).toEqual(['first', 'second']);
    expect(pipe.transform(groups, 'bottom-left', true).map(toast => toast.id)).toEqual(['second', 'first']);
  });
});

const toastStub = (id: string): HotToast => ({
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
  id,
  message: id,
  paused: false,
  position: 'top-center',
  removeDelay: 0,
  style: null,
  toasterId: 'default',
  type: 'blank',
  updatedAt: 0,
  visible: true
});
