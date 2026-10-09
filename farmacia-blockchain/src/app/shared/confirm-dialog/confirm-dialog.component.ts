import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmacionService } from '../confirmacion.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent {

  protected servicio = inject(ConfirmacionService);

  responder(valor: boolean): void {
    this.servicio.responder(valor);
  }
}
