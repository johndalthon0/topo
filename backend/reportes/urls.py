from django.urls import path

from .views import (
    ResumenReportesView,
    ComprasReportesView,
    VentasReportesView,
    MedicamentosReportesView,
    ExportarPDFView,
    ExportarExcelView,
)


urlpatterns = [

    path(
        'resumen/',
        ResumenReportesView.as_view(),
        name='resumen-reportes'
    ),

    path(
        'compras/',
        ComprasReportesView.as_view(),
        name='compras-reportes'
    ),

    path(
        'ventas/',
        VentasReportesView.as_view(),
        name='ventas-reportes'
    ),

    path(
        'medicamentos/',
        MedicamentosReportesView.as_view(),
        name='medicamentos-reportes'
    ),

    path(
        'exportar-pdf/',
        ExportarPDFView.as_view(),
        name='exportar-pdf'
    ),

    path(
        'exportar-excel/',
        ExportarExcelView.as_view(),
        name='exportar-excel'
    ),
]