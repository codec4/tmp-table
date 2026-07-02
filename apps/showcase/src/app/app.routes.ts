import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page.component';
import { TablesPageComponent } from './tables-page.component';
import { ToastPageComponent } from './toast-page.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'Table Provider'
  },
  {
    path: 'tables',
    component: TablesPageComponent,
    title: 'Table Showcases'
  },
  {
    path: 'toast',
    component: ToastPageComponent,
    title: 'Toast Showcase'
  },
  {
    path: 'showcases',
    redirectTo: 'tables'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
