import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormBuilderService {

  constructor(private fb: FormBuilder) { }

  createForm(): FormGroup {
    return this.fb.group({
      
    });
  }
}
