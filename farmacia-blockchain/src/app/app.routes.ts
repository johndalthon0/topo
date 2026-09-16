import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { MedicamentosComponent } from './medicamentos/medicamentos.component';
import { InventarioComponent } from './inventario/inventario.component';
import { ComprasComponent } from './compras/compras.component';
import { VentasComponent } from './ventas/ventas.component';
import { ReportesComponent } from './reportes/reportes.component';
import { BlockchainComponent } from './blockchain/blockchain.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { ConfiguracionComponent } from './configuracion/configuracion.component';
import { AlertasComponent } from './alertas/alertas.component';
import { adminGuard } from './guards/admin.guard';


export const routes: Routes = [

  // =====================================================
  // LOGIN
  // =====================================================

  {
    path: 'login',
    component: LoginComponent
  },


  // Al ingresar solamente a localhost:4200
  // enviar directamente al login.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },


  // =====================================================
  // SISTEMA
  // =====================================================

  {
    path: '',
    component: LayoutComponent,

    children: [

      {
        path: 'dashboard',
        component: DashboardComponent
      },

      {
        path: 'medicamentos',
        component: MedicamentosComponent
      },

      {
        path: 'inventario',
        component: InventarioComponent
      },

      {
        path: 'compras',
        canActivate: [adminGuard],
        component: ComprasComponent
      },

      {
        path: 'ventas',
        component: VentasComponent
      },

      {
        path: 'reportes',
        component: ReportesComponent
      },

      {
        path: 'blockchain',
        canActivate: [adminGuard],
        component: BlockchainComponent
      },

      {
        path: 'usuarios',
        canActivate: [adminGuard],
        component: UsuariosComponent
      },

      {
        path: 'configuracion',
        canActivate: [adminGuard],
        component: ConfiguracionComponent
      },

      {
        path: 'alertas',
        component: AlertasComponent
      }

    ]

  },


  // =====================================================
  // RUTA NO ENCONTRADA
  // =====================================================

  {
    path: '**',
    redirectTo: 'login'
  }

];
