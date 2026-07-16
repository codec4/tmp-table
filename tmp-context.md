// http-context.ts
import { HttpContextToken } from '@angular/common/http';

// By default, it is false (errors WILL be intercepted)
export const SKIP_GLOBAL_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);


```
// error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { SKIP_GLOBAL_ERROR_HANDLING } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if this specific request wants to skip error handling
  if (req.context.get(SKIP_GLOBAL_ERROR_HANDLING)) {
    return next(req); // Pass through without catching errors
  }

  // Otherwise, handle errors globally
  return next(req).pipe(
    catchError((error) => {
      console.error('Global Error Handler caught:', error);
      // Show toast notification, redirect to error page, etc.
      return throwError(() => error);
    })
  );
};
```

// my-route.service.ts
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_GLOBAL_ERROR_HANDLING } from './http-context';

@Injectable({ providedIn: 'root' })
export class MyRouteService {
  private http = inject(HttpClient);

  getDataAndSkipErrors() {
    return this.http.get('https://api.example.com/data', {
      // THIS is the magic part
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true) 
    });
  }
}```