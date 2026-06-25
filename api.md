Pagination params: 

GET /users?page=1&pageSize=20&status=Active&search=jane

PagedResponse:

```json
"items": [], // T[]
"pagination": {
    "page": 1,   // current 1-based page
    "pageSize": 20, // items requested per page
    "totalItems": 137, // total across all pages (>= 0)
    "totalPages": 7 // total pages (>= 0)
}
```