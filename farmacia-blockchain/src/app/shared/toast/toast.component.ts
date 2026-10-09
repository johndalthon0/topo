import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService } from '../notificacion.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent {

  protected servicio = inject(NotificacionService);

  cerrar(): void {
    this.servicio.cerrar();
  }
}
