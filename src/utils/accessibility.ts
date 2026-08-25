export function a11y(label: string) {
  return { accessible: true, accessibilityLabel: label } as const;
}
