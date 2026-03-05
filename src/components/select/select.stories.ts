import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit-html';

// Register icons used in stories
import '../../icons/phosphor/caret-up-down.ts';

type SelectArgs = {
  placeholder: string;
  disabled: boolean;
  size: string;
  intent: string;
};

const meta: Meta<SelectArgs> = {
  title: 'Components/Select',
  component: 'n-select',
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    intent: {
      control: 'select',
      options: ['', 'accent', 'info', 'success', 'warning', 'danger'],
    },
  },
  args: {
    placeholder: 'Select an option',
    disabled: false,
    size: 'md',
    intent: '',
  },
};

export default meta;
type Story = StoryObj<SelectArgs>;

export const Manual: Story = {
  render: (args) => html`
    <n-select
      ?disabled=${args.disabled}
      size=${args.size}
      intent=${args.intent || undefined}
    >
      <n-button justify="spread">
        <span slot="label">${args.placeholder}</span>
        <n-icon name="caret-up-down" slot="trailing"></n-icon>
      </n-button>
      <n-listbox popover>
        <n-option value="apple">Apple</n-option>
        <n-option value="banana">Banana</n-option>
        <n-option value="cherry">Cherry</n-option>
        <n-option value="dragonfruit">Dragonfruit</n-option>
      </n-listbox>
    </n-select>
  `,
};

export const DataDriven: Story = {
  render: (args) => html`
    <n-select
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      size=${args.size}
      intent=${args.intent || undefined}
      options=${JSON.stringify([
        { value: 'us', label: 'United States' },
        { value: 'se', label: 'Sweden' },
        { value: 'fi', label: 'Finland' },
        { value: 'no', label: 'Norway' },
        { value: 'dk', label: 'Denmark' },
      ])}
    ></n-select>
  `,
  args: { placeholder: 'Pick a country' },
};

export const WithPreselectedValue: Story = {
  render: () => html`
    <n-select
      value="se"
      options=${JSON.stringify([
        { value: 'us', label: 'United States' },
        { value: 'se', label: 'Sweden' },
        { value: 'fi', label: 'Finland' },
      ])}
    ></n-select>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <n-select
      disabled
      placeholder="Disabled select"
      options=${JSON.stringify([
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ])}
    ></n-select>
  `,
};

export const WithDisabledOption: Story = {
  render: () => html`
    <n-select
      placeholder="Some options disabled"
      options=${JSON.stringify([
        { value: 'a', label: 'Available' },
        { value: 'b', label: 'Also available' },
        { value: 'c', label: 'Unavailable', disabled: true },
      ])}
    ></n-select>
  `,
};

export const AllSizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 20rem;">
      <n-select
        size="sm"
        placeholder="Small"
        options=${JSON.stringify([
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ])}
      ></n-select>
      <n-select
        size="md"
        placeholder="Medium"
        options=${JSON.stringify([
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ])}
      ></n-select>
      <n-select
        size="lg"
        placeholder="Large"
        options=${JSON.stringify([
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ])}
      ></n-select>
    </div>
  `,
};
