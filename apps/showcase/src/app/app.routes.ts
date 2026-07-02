import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page.component';
import { ShowcasesPageComponent } from './showcases-page.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'Table Provider'
  },
  {
    path: 'showcases',
    component: ShowcasesPageComponent,
    title: 'Table Provider Showcases'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
