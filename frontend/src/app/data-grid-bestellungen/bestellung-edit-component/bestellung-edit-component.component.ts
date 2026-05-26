import {AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnInit, Renderer2, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {HttpService} from "../../services/http.service";
import {Lieferant} from "../../models/Lieferant";
import {MaterialEditComponentComponent} from "../../data-grid-artikel/material-edit-component/material-edit-component.component";
import {LoginErrorComponent} from "../../login/login-error/login-error.component";
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Hersteller} from "../../models/Hersteller";
import {IDropdownSettings, MultiSelectComponent, NgMultiSelectDropDownModule} from "ng-multiselect-dropdown";
import {Artikel} from "../../models/Artikel";
import {DepartmentData} from "../../models/Department";
import {DomSanitizer} from "@angular/platform-browser";
import {HttpParams} from "@angular/common/http";
import {Bestellung} from "../../models/Bestellung";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {MatToolbar} from "@angular/material/toolbar";
import {MatIconButton} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";
import {NgIf} from "@angular/common";
import {floatValidator, positiveNumberValidator} from '../../shared/float_validator';
import {FocusOnClickDirective} from "../../shared/focus-on-click.directive";
import {take} from "rxjs/operators";
import {UserService} from "../../services/user.service";

@Component({
    selector: 'app-bestellung-edit-component',
    templateUrl: './bestellung-edit-component.component.html',
    imports: [
        ReactiveFormsModule,
        MatDialogContent,
        MatFormFieldModule,
        MatInputModule,
        NgMultiSelectDropDownModule,
        MatIcon,
        MatToolbar,
        MatIconButton,
        MatTooltip,
        NgIf,
        FocusOnClickDirective,
        MatDialogTitle
    ],
    styleUrl: './bestellung-edit-component.component.css'
})
export class BestellungEditComponentComponent implements OnInit, AfterViewChecked, AfterViewInit {
    @ViewChild('textarea', {static: false}) textarea: ElementRef | undefined;
    @ViewChild('dropdownArtikels', {static: false}) dropdownArtikels: MultiSelectComponent | undefined;

    herstellers: any[] = [];
    lieferants: any[] = [];
    artikels: any[] = [];
    departments: any[] = [];
    childDialogOpened: boolean = false;
    dropdownSettings: IDropdownSettings = {};
    dropdownDepartmentSettings: IDropdownSettings = {};
    singleSelectSettings: IDropdownSettings = {};
    bestellungForm: any;
    safeUrl: any;
    artikelsWasClicked = false;
    istFirstDepartmentLoad = false;

    searchTerm: string = '';

    constructor(private httpService: HttpService,
                public dialogRef: MatDialogRef<BestellungEditComponentComponent>,
                @Inject(MAT_DIALOG_DATA) public data: Bestellung,
                private fb: FormBuilder,
                private sanitizer: DomSanitizer,
                private userService: UserService,
                public dialog: MatDialog) {
    }


    ngAfterViewInit(): void {
        if (this.dropdownArtikels) {
            this.dropdownArtikels.onFilterChange.subscribe((filterData: any) => {
                this.onArtikelSearchChange(filterData);
            });

            this.dropdownArtikels.onDeSelect.subscribe(() => {
                if (this.searchTerm && this.searchTerm.length > 0) {
                    return;
                }
                this.loadDepartments();
                this.loadArtikel();
                this.resetForm();
            });
            this.dropdownArtikels.onDropDownClose.subscribe(() => {
                if (this.artikelsWasClicked) {
                    this.loadDepartments();
                    this.loadArtikel();

                    if (this.bestellungForm.get('artikels').value && this.bestellungForm.get('artikels').value.length === 0) {
                        this.resetForm();
                    }

                    this.artikelsWasClicked = false;
                }
            });
        } else {
            console.error("Dropdown component is undefined. Ensure @ViewChild reference is correct.");
        }
    }

    ngOnInit(): void {
        this.loadDepartments();
        this.loadArtikel();

        this.dropdownSettings = {
            idField: 'id',
            textField: 'name',
            allowSearchFilter: true,
            enableCheckAll: true,
            searchPlaceholderText: 'Suchen',
            selectAllText: 'Alle auswählen',
            unSelectAllText: 'Alle deaktivieren'
        };

        this.dropdownDepartmentSettings = {
            idField: 'id',
            textField: 'name',
            allowSearchFilter: true,
            enableCheckAll: false,
            itemsShowLimit: 3,
            searchPlaceholderText: 'Suchen',
        };

        this.singleSelectSettings = {
            singleSelection: true, // Set to true for single selection
            idField: 'id',
            textField: 'name',
            itemsShowLimit: 1,
            allowSearchFilter: true,
            searchPlaceholderText: 'Suchen',
            allowRemoteDataSearch: true
        };

        this.bestellungForm = this.fb.group({
            id: [this.data?.id || 0],
            description: [this.data?.description || ''],
            amount: [this.data?.amount || '', [floatValidator, positiveNumberValidator]],
            preis: [this.data?.preis || '', floatValidator],
            gesamtpreis: [this.data?.gesamtpreis || '', floatValidator],
            packageunit: [this.data?.packageunit || ''],
            artikels: [this.data?.artikels || [], Validators.required],
            departments: [this.data?.departments || [], Validators.required],
            herstellers: [this.data?.herstellers || []],
            lieferants: [this.data?.lieferants || []],
            herstellerStandorte: [this.data?.herstellerStandorte || []],
            lieferantStandorte: [this.data?.lieferantStandorte || []],
            bestellnummer: [{value: '', disabled: true}],
            refnummer: [{value: '', disabled: true}],
            descriptionZusatz: [{value: '', disabled: true}],
            url: [{value: '', disabled: true}],
        });

        this.bestellungForm.get('url')?.valueChanges.subscribe((value: any) => {
            this.safeUrl = value ? this.sanitizer.bypassSecurityTrustUrl(value) : null;
        });

        this.bestellungForm.valueChanges.subscribe((values: Bestellung) => {
            const amount = Number((values.amount || "").toString().replace(",", ".")) || 0;
            const preis = Number((values.preis || "").toString().replace(",", ".")) || 0;
            const gesamtpreis = amount * preis;

            // Update gesamtpreis field
            this.bestellungForm.patchValue({gesamtpreis}, {emitEvent: false});
        });

        this.markAllAsTouched();
    }

    isOnlyOneArtikelSelected(): boolean {
        return this.bestellungForm.get('artikels')?.value?.length === 1;
    }

    loadDepartments() {
        let mitarbeiterRequest = this.httpService.get_httpclient().get(this.httpService.get_baseUrl() + '/department/get_departments');
        mitarbeiterRequest.subscribe((response: any) => {
            this.departments = response.data;

            let user = this.userService.getUser();
            if (user && user.departmentIds && user.departmentIds.length > 0 && !this.istFirstDepartmentLoad) {
                let userDepartments = this.departments.filter(
                    (d: DepartmentData) => (user.departmentIds as number[]).includes(Number(d.id))
                );
                this.bestellungForm.get('departments')!.setValue(userDepartments);
                this.onDepartmentSelect(userDepartments[0]);

                this.istFirstDepartmentLoad = true;
            }
        });
    }

    loadArtikel(params: any = null) {
        let mitarbeiterRequest = this.httpService.get_httpclient().get(this.httpService.get_baseUrl() + '/artikel/get_artikels');

        if (params) {
            mitarbeiterRequest = this.httpService.get_httpclient().get(this.httpService.get_baseUrl() + '/artikel/get_artikels', {params});
        }

        mitarbeiterRequest.subscribe((response: any) => {
            let artikelData = response.data;

            if (this.searchTerm && this.searchTerm.length > 0) {
                artikelData = artikelData.map((artikel: any) => {
                    artikel.name += ' (@' + this.searchTerm + ')';
                    return artikel;
                });
            }
            this.artikels = artikelData;

            if (this.data.artikels && this.data.artikels.length > 0) {
                this.loadArtikelFullData(this.data.artikels[0].id);
            }
        });
    }

    onNoClick(): void {
        this.dialogRef.close(this.data);
    }

    addArtikelRecord(edit: boolean = false) {
        this.childDialogOpened = true;

        let data: any = {};
        data.formTitle = 'Neuen Artikel hinzufügen';

        if (edit) {
            let selectedHerstellers = this.bestellungForm.get('artikels')?.value || [];

            if (selectedHerstellers.length === 1) {
                data = this.artikels.find(l => l.id === selectedHerstellers[0].id) || {};
            }
            data.formTitle = 'Artikel bearbeiten';
        }

        if (data.id) {
            this.loadArtikelFullData(data.id).then((data) => this.openArtikelEditDialog(data[0]));
        } else {
            this.openArtikelEditDialog(data);
        }
    }

    openArtikelEditDialog(data: any) {
        const dialogRef = this.dialog.open(MaterialEditComponentComponent, {
            width: '550px',
            height: '100vh',
            data,
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe(result => {
            this.childDialogOpened = false;
            if (result) {
                this.updateDropdowns(result.data);
            }
        });
    }

    updateDropdowns(data: any) {
        this.updateBestellungToArtikelsDropdown(data);
    }

    loadArtikelFullData(id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            let url = this.httpService.get_baseUrl() + '/artikel/get_by_id/' + id;

            let artikelRequest = this.httpService.get_httpclient().get(url);
            artikelRequest.subscribe((response: any) => {
                if (response.success) {
                    this.updateDropdowns(response.data);
                    response.data[0].formTitle = 'Artikel bearbeiten';

                    resolve(response.data);
                } else {
                    resolve({});
                }
            });
        });
    }

    onSubmit(): void {
        let url = this.httpService.get_baseUrl() + '/bestellung/save';

        if (this.bestellungForm.valid && !this.childDialogOpened) {
            this.bestellungForm.get('gesamtpreis')?.enable();
            const formValue = this.bestellungForm.value;

            formValue.departments = formValue.departments.map((dept: any) => (dept.id));
            formValue.lieferants = formValue.lieferants.map((lieferant: any) => (lieferant.id));
            formValue.herstellers = formValue.herstellers.map((hersteller: any) => (hersteller.id));
            formValue.artikels = formValue.artikels.map((artikel: any) => (artikel.id));
            formValue.mitarbeiterId = localStorage.getItem('mitarbeiterId');

            this.httpService.get_httpclient().post(url, formValue).subscribe({
                next: (response: any) => {
                    if (response && response.success && Boolean(response?.success)) {
                        this.dialogRef.close(response.data);
                    } else {
                        this.dialog.open(LoginErrorComponent, {
                            width: '450px',
                            height: '150px',
                            data: {
                                title: response?.message
                            }
                        });
                    }
                },
                error: (err) => {
                    console.log(err);
                    this.dialog.open(LoginErrorComponent, {
                        width: '450px',
                        height: '150px',
                        data: {
                            title: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut'
                        }
                    });
                }
            });
        }
    }

    private markAllAsTouched() {
        Object.keys(this.bestellungForm.controls).forEach(field => {
            const control = this.bestellungForm.get(field);
            if (control) { // Ensure control is not null
                if (control instanceof FormGroup) {
                    this.markAllAsTouchedRecursive(control);
                } else {
                    control.markAsTouched({onlySelf: true});
                }
            }
        });
    }

    private markAllAsTouchedRecursive(group: FormGroup) {
        Object.keys(group.controls).forEach(controlName => {
            const control = group.get(controlName);
            if (control) { // Ensure control is not null
                if (control instanceof FormGroup) {
                    this.markAllAsTouchedRecursive(control);
                } else {
                    control.markAsTouched({onlySelf: true});
                }
            }
        });
    }

    onArtikelChange(event: any) {
        if (!event || !event.id) {
            this.resetForm();
        }
        this.loadArtikelFullData(event.id).then((data) => {
            this.updateDropdowns(data);
        });
    }

    updateBestellungToArtikelsDropdown(data: Artikel[]) {
        if (Array.isArray(this.artikels)) { // Ensure it is an array
            let artikel = null;
            let index = 0;
            this.artikels.forEach((record, ind) => {
                if (record.id === data[0].id) {
                    artikel = record;
                    index = ind;
                }
            });

            if (artikel) {
                // Update the record at the found index
                this.artikels[index] = data[0];

                this.bestellungForm.patchValue({
                    descriptionZusatz: data[0].description,
                    url: data[0].url,
                    preis: data[0].preis,
                    packageunit: data[0].packageunit,
                });

                this.bestellungForm.get('artikels').setValue(data);

                if (data[0] && data[0].artikelToLieferantBestellnummers && data[0].artikelToLieferantBestellnummers.length > 0) {
                    this.bestellungForm.patchValue({
                        bestellnummer: data[0].artikelToLieferantBestellnummers[0].bestellnummer,
                    });
                } else {
                    this.bestellungForm.patchValue({
                        bestellnummer: '',
                    });
                }
                if (data[0] && data[0].artikelToHerstRefnummers && data[0].artikelToHerstRefnummers.length > 0) {
                    this.bestellungForm.patchValue({
                        refnummer: data[0].artikelToHerstRefnummers[0].refnummer,
                    });
                } else {
                    this.bestellungForm.patchValue({
                        refnummer: '',
                    });
                }
                // Update the dropdown

                this.lieferants = data[0].lieferants || [];
                this.herstellers = data[0].herstellers || [];
                this.departments = data[0].departments || [];

                if (data[0].departments && data[0].departments.length > 0 && !this.data.id) {
                    this.updateDeparmentsDropdown(data[0].departments);
                } else {
                    this.updateDeparmentsDropdown(this.data.departments || []);
                }
                if (data[0].lieferants && data[0].lieferants.length > 0 && !this.data.id) {
                    this.updateLieferantsDropdown([data[0].lieferants[0]]);
                } else {
                    this.updateLieferantsDropdown(this.data.lieferants || []);
                }
                if (data[0].herstellers && data[0].herstellers.length > 0 && !this.data.id) {
                    this.updateHerstellerDropdown([data[0].herstellers[0]]);
                } else {
                    this.updateHerstellerDropdown(this.data.herstellers || []);
                }
            }
        }
    }

    onDepartmentSelect(department: any) {
        let departments = this.bestellungForm.get('departments').value;

        let index = departments.findIndex((d: any) => d.name === 'Alle');
        if (department.name === 'Alle') {
            departments = departments.filter((d: any) => {
                return d.name === 'Alle'
            });
            this.updateDeparmentsDropdown(departments);
        } else if (index !== -1) {
            departments = departments.filter((d: any) => {
                return d.name !== 'Alle'
            });
            this.updateDeparmentsDropdown(departments);
        }

        this.onArtikelSearchChange(this.searchTerm);
    }

    updateDeparmentsDropdown(data: DepartmentData[]) {
        this.bestellungForm.get('departments')?.setValue(data);
    }

    updateLieferantsDropdown(data: Lieferant[]) {
        this.bestellungForm.get('lieferants')?.setValue(data);
    }

    updateHerstellerDropdown(data: Hersteller[]) {
        this.bestellungForm.get('herstellers')?.setValue(data);
    }

    ngAfterViewChecked(): void {
        this.adjustTextareaHeight();
    }

    adjustTextareaHeight(): void {
        if (this.textarea) {
            const textareaElement = this.textarea.nativeElement as HTMLTextAreaElement;
            textareaElement.style.height = 'auto'; // Reset height
            textareaElement.style.height = `${textareaElement.scrollHeight}px`; // Set height to scrollHeight
        }
    }

    onArtikelSearchChange(event: any) {
        let params = new HttpParams();
        let departments = this.bestellungForm.get('departments').value;
        let search: any = '';

        if (departments && departments.length > 0) {
            const hasIdZero = departments.some((dept: any) => dept.typ === 0);
            if (!hasIdZero) {
                let departmendIds = departments.map((dept: any) => dept.id).join(',');
                params = params.append('departments', departmendIds);
            }
        }

        if (event && event?.target && event.target.value) {
            search = event.target.value;
        } else {
            search = event;
        }

        if (search && search.length > 0) {
            this.searchTerm = search;
        }
        if ((search && search.length > 0) || (departments && departments.length > 0)) {
            if (search && search.length > 0) {
                params = params.append('search', search);
            }
            this.loadArtikel(params);
        } else {
            this.loadArtikel()
        }
    }
    onDropdownClosed() {
        this.searchTerm = '';
        this.artikelsWasClicked = false;
    }

    onArtikelsClick() {
    }

    clearSearch() {
        this.searchTerm = '';
        this.loadArtikel();
    }

    resetForm(): void {
        this.bestellungForm.reset(); // This will reset the form to its initial state
    }
}
