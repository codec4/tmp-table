import { Pipe, PipeTransform } from '@angular/core';
import { HotToast, HotToastPosition } from '../hot-toast.types';

export type HotToastGroupsByPosition = Record<HotToastPosition, HotToast[]>;

const HOT_TOAST_CONTAINER_BASE_CLASS = 'pointer-events-none fixed z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col';

const HOT_TOAST_POSITION_CLASS: Record<HotToastPosition, string> = {
  'top-left': 'left-4 top-4 items-start',
  'top-center': 'left-1/2 top-4 -translate-x-1/2 items-center',
  'top-right': 'right-4 top-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 right-4 items-end'
};

export const createHotToastGroupsByPosition = (): HotToastGroupsByPosition => ({
  'top-left': [],
  'top-center': [],
  'top-right': [],
  'bottom-left': [],
  'bottom-center': [],
  'bottom-right': []
});

@Pipe({
  name: 'hotToastPlacementClass',
  standalone: true
})
export class HotToastPlacementClassPipe implements PipeTransform {
  transform(position: HotToastPosition, containerClassName = ''): string {
    return [HOT_TOAST_CONTAINER_BASE_CLASS, HOT_TOAST_POSITION_CLASS[position], containerClassName]
      .filter(Boolean)
      .join(' ');
  }
}

@Pipe({
  name: 'hotToastPositionedToasts',
  standalone: true
})
export class HotToastPositionedToastsPipe implements PipeTransform {
  transform(groups: HotToastGroupsByPosition, position: HotToastPosition, reverseOrder: boolean): HotToast[] {
    const toasts = groups[position];
    const shouldReverse = position.startsWith('top') ? !reverseOrder : reverseOrder;

    return shouldReverse ? [...toasts].reverse() : toasts;
  }
}
