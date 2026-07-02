import { Pipe, PipeTransform } from '@angular/core';
import { HotToast } from '../hot-toast.types';

const HOT_TOAST_ITEM_BASE_CLASS = [
  'pointer-events-auto',
  'w-full',
  'overflow-hidden',
  'rounded-lg',
  'border',
  'border-slate-200',
  'bg-white',
  'shadow-lg',
  'transition-all',
  'duration-200',
  'ease-out'
];

@Pipe({
  name: 'hotToastItemClass',
  standalone: true
})
export class HotToastItemClassPipe implements PipeTransform {
  transform(toast: HotToast): string {
    const visibilityClass = toast.visible
      ? ['translate-y-0', 'opacity-100']
      : [toast.position.startsWith('top') ? '-translate-y-2' : 'translate-y-2', 'opacity-0'];

    return [...HOT_TOAST_ITEM_BASE_CLASS, ...visibilityClass, toast.className].filter(Boolean).join(' ');
  }
}
