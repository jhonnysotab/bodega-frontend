import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gastos } from './gastos';

describe('Gastos', () => {
  let component: Gastos;
  let fixture: ComponentFixture<Gastos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gastos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Gastos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
