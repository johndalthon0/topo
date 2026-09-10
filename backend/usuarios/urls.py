from django.urls import path
from .views import login, registro

urlpatterns = [

    path("login/", login),

    path("registro/", registro),

]