import { AkControlElement } from "@goauthentik/elements/AkControlElement";
import { randomId } from "@goauthentik/elements/utils/randomId.js";

import { TemplateResult, css, html, nothing } from "lit";
import { customElement, property, queryAll } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFFormControl from "@patternfly/patternfly/components/FormControl/form-control.css";
import PFInputGroup from "@patternfly/patternfly/components/InputGroup/input-group.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";

import { bound } from "../decorators/bound";

type InputCell<T> = (el: T) => TemplateResult | typeof nothing;

export interface IArrayInput<T> {
    row: InputCell<T>;
    newItem: () => T;
    items: T[];
}

type Keyed<T> = { key: string; item: T };

@customElement("ak-array-input")
export class ArrayInput<T> extends AkControlElement<T[]> implements IArrayInput<T> {
    static get styles() {
        return [
            PFBase,
            PFButton,
            PFInputGroup,
            PFFormControl,
            css`
                select.pf-c-form-control {
                    width: 100px;
                }
                .pf-c-input-group {
                    padding-bottom: 0;
                }
                .ak-plus-button {
                    display: flex;
                    justify-content: flex-end;
                    flex-direction: row;
                }
                .ak-input-group {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                }
            `,
        ];
    }

    @property({ type: Array, attribute: false })
    row!: InputCell<T>;

    @property({ type: Object, attribute: false })
    newItem!: () => T;

    _items: Keyed<T>[] = [];

    // This magic creates a semi-reliable key on which Lit's `repeat` directive can control its
    // interaction. Without it, we get undefined behavior in the re-rendering of the array.
    @property({ type: Array, attribute: false })
    set items(items: T[]) {
        const olditems = new Map(
            (this._items ?? []).map((key, item) => [JSON.stringify(item), key]),
        );
        const newitems = items.map((item) => ({
            item,
            key: olditems.get(JSON.stringify(item))?.key ?? randomId(),
        }));
        this._items = newitems;
    }

    get items() {
        return this._items.map(({ item }) => item);
    }

    @queryAll("div.ak-input-group")
    inputGroups?: HTMLDivElement[];

    itemsFromDom(): T[] {
        return Array.from(this.inputGroups ?? [])
            .map(
                (group) =>
                    group.querySelector<HTMLInputElement & AkControlElement<T>>("[name]")?.json() ??
                    null,
            )
            .filter((i) => i !== null);
    }

    json() {
        if (!this.inputGroups) {
            throw new Error("Could not find input group collection in ak-array-input");
        }
        return this.items;
    }

    sendChange() {
        this.dispatchEvent(new Event("change", { composed: true, bubbles: true }));
    }

    renderDeleteButton(idx: number) {
        const deleteOneGroup = () => {
            this.items = [...this.items.slice(0, idx), ...this.items.slice(idx + 1)];
            this.sendChange();
        };

        return html`<button class="pf-c-button pf-m-control" type="button" @click=${deleteOneGroup}>
            <i class="fas fa-minus" aria-hidden="true"></i>
        </button>`;
    }

    @bound
    onChange() {
        this.items = this.itemsFromDom();
        this.sendChange();
    }

    @bound
    addNewGroup() {
        this.items = [...this.itemsFromDom(), this.newItem()];
        this.sendChange();
    }

    render() {
        return html` <div class="pf-l-stack">
            ${repeat(
                this._items,
                (item: Keyed<T>) => item.key,
                (item: Keyed<T>, idx) =>
                    html` <div class="ak-input-group" @change=${() => this.onChange()}>
                        ${this.row(item.item)}${this.renderDeleteButton(idx)}
                    </div>`,
            )}
            <button class="pf-c-button pf-m-control" type="button" @click=${this.addNewGroup}>
                <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-array-input": ArrayInput<unknown>;
    }
}
