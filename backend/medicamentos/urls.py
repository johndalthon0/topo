from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicamentoViewSet

router = DefaultRouter()

router.register(r'', MedicamentoViewSet)

urlpatterns = [

    path('', include(router.urls)),

]