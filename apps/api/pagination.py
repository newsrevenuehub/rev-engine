from rest_framework.pagination import PageNumberPagination


class ApiStandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 500
