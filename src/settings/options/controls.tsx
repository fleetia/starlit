import type { ReactElement, ReactNode } from 'react';
import {
  ColorField,
  FormField,
  RangeField,
  Section,
  SectionHeader,
  Text,
} from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';

type RangeControlProps = {
  label: ReactNode;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
};

export function RangeControl({
  label,
  max,
  min,
  onValueChange,
  step,
  suffix = '',
  value,
}: RangeControlProps): ReactElement {
  return (
    <FormField
      label={label}
      marker={
        <Text variant="data">
          {value}
          {suffix}
        </Text>
      }
    >
      <RangeField
        max={max}
        min={min}
        onValueChange={onValueChange}
        step={step}
        value={value}
      />
    </FormField>
  );
}

type ColorControlProps = {
  label: string;
  onValueChange: (value: string) => void;
  value: string;
};

export function ColorControl({
  label,
  onValueChange,
  value,
}: ColorControlProps): ReactElement {
  const { t } = useTranslation();

  return (
    <FormField label={label}>
      <ColorField
        alphaLabel={`${label} ${t('sidebar.colorAlpha')}`}
        onValueChange={onValueChange}
        showAlpha
        swatchLabel={`${label} ${t('sidebar.colorSwatch')}`}
        value={value}
      />
    </FormField>
  );
}

type SettingsSectionProps = {
  aside?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
};

export function SettingsSection({
  aside,
  children,
  description,
  title,
}: SettingsSectionProps): ReactElement {
  return (
    <Section boundary="weak" spacing="compact">
      <SectionHeader
        aside={aside}
        description={description}
        headingLevel={3}
        headingVariant="label"
        rule="none"
        title={title}
      />
      {children}
    </Section>
  );
}
