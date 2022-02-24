import { Component, OnInit } from '@angular/core';
// import { fhirR4 } from '@smile-cdr/fhirts';
import { FormGroup } from '@angular/forms';
// import { DynamicForm } from '@simpatico.ai/dynamic-form';
import { FormBuilderService } from 'src/app/services/form-builder.service';
import * as fhirSchemaJson from 'src/assets/fhir.schema.json';

export interface CompleteObject {
  properties?: DynamicFormDataObject;
  required?: string[];
}
export interface DynamicFormDataObject {
  [key: string]: FormObject;
}

export interface FormObject {
  description: string;
  const?: string;
  type?: string;
  $ref?: string;
  items?: ItemObject;
  pattern?: RegExp;
  enum?: string[];
  required?: boolean;
  itemReferenced?: DynamicFormDataObject
}

export interface ItemObject {
  $ref: string;
}

export interface AnyObject {
  [key: string]: any;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})


export class AppComponent implements OnInit {
  title = 'fhir-starter';
  resources: string[] = [];
  resourceForm: FormGroup | undefined;
  schema = JSON.parse(JSON.stringify(fhirSchemaJson));
  completeObject: CompleteObject = {};
  definitions = this.schema['definitions'];
  properties = 'properties';
  avoidArray = [
    'language',
    'implicitRules',
    'extension',
    'contained',
    'meta',
    'modifierExtension'
  ]; 
  jsonObject: AnyObject = {};
  jsonString: string = '';
  counter = 0;
  objectLength = 5;

  constructor(private formBuilderService: FormBuilderService) {

  }

  ngOnInit(): void {
    Object.keys(this.schema['discriminator']['mapping']).forEach((def: string) => this.resources.push(def));
  }

  onSelect(event: Event): void {
    this.jsonString = '';
    const resource = (<HTMLInputElement>event?.target).value;
    if (typeof resource === 'string') {
      this.completeObject.required = this.definitions[resource]['required'];
      const formObjectArray = {} as DynamicFormDataObject;
      Object.keys(this.definitions[resource][this.properties]).forEach((key: string) => {
        let methodFormObject: FormObject | null;
        this.createFormObject(resource, key).then((res: FormObject | null) => {
          methodFormObject = res
          if (methodFormObject) {
            formObjectArray[key] = methodFormObject;
            this.jsonObject[key] = '';
            this.objectLength = this.objectLength + 1
          }
        });
      });
      this.completeObject.properties = formObjectArray;
      console.log(this.completeObject);
      console.log(this.counter);
    }
  }

  async createFormObject(resource: string, key: string): Promise<FormObject | null> {
    return new Promise((resolve, reject) => {
      const object = this.definitions?.[resource]?.[this.properties]?.[key];
      if (object) {
        let group = object as FormObject;
        
        group.required = this.completeObject.required?.includes(key);
    
        if (!key.includes('_') && !this.avoidArray.includes(key)) {
          if (object.items) {
            this.getItemPathAndCheck(object.items['$ref']?.split('/')[2], group).then((res: FormObject) => group = res);
          } else if (group.$ref) {
            if (group.$ref.includes('/')) {
              group.$ref = group.$ref?.split('/')?.[2];
            }
            if (group.$ref.charAt(0) === group.$ref.charAt(0).toUpperCase()) {
              this.getItemPathAndCheck(group.$ref, group).then((res: FormObject) => group = res);
            }
          }
          resolve(group);
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  }

  async getItemPathAndCheck(reference: string, group: FormObject): Promise<FormObject> {
    this.counter = this.counter + 1;

    return new Promise((resolve, reject) => {
      const itemPath = this.definitions[reference]?.[this.properties];
      if (itemPath) {
        group.itemReferenced = {} as DynamicFormDataObject;
        Object.keys(itemPath)?.forEach(async (itemKey: string) => {
          if (!itemKey.includes('_') && !this.avoidArray.includes(itemKey)) {
            let itemObject = itemPath[itemKey] as FormObject;
            if (itemObject.$ref) {
              if (itemObject.$ref.includes('/')) {
                itemObject.$ref = itemObject.$ref.split('/')?.[2];
              }
              if (itemObject.$ref.charAt(0) === itemObject.$ref.charAt(0).toUpperCase()) {
                await this.getItemPathAndCheck(itemObject.$ref, itemObject).then((res: FormObject) => itemObject = res);
              }
              if (itemObject) {
                if (group.itemReferenced) {
                  group.itemReferenced[itemKey] = itemObject;
                }
              }
            }
          }
        });
  
        Object.keys(group.itemReferenced).forEach(async (itemRefKey: string) => {
          if (group?.itemReferenced?.[itemRefKey]?.items?.['$ref']?.split('/')?.length) {
            await this.createFormObject(group?.itemReferenced?.[itemRefKey]?.items?.['$ref']?.split('/')?.[2] as string, itemRefKey);
          }
        });
      }
      resolve(group);
    });
  }

  onSubmit(event: Event): string {
    console.log(event);
    this.jsonString = JSON.stringify(this.jsonObject, undefined, 4);
    console.log(this.jsonObject);
    return this.jsonString;
  }

  // TODO:
  // if type is array - give ability to add more than one
  // if pattern - apply to input
  // can add description as tooltip
  // create form inputs dynamically from object -- keep correct order
  // Show output of form as JSON object in text area
  // Make JSON downloadable
  // Add ability to create references
  // Make data two way - if you paste a JSON in the text area, it should be able to fill out the form (validates)
  
  // DONE:
  // schema.definitions.resource.required array - if property key is within, then this field is required (red star)
  // if starts with _ - disregard for now as it's an extension
  // if it's language, implicitRules, extension, contained, meta, modifierExtension - disregard for now
  // if items or ref - check the reference and pull that object in

}
