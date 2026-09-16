import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginComponent } from './login.component';

declare function describe(description: string, spec: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function it(description: string, spec: () => void): void;
declare function expect(actual: any): any;

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

