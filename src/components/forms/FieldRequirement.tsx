type RequirementTextProps = {
  className?: string;
};

export function RequiredFieldIndicator({ className = 'text-text-muted' }: RequirementTextProps) {
  return <span className={`font-normal ${className}`}> (required)</span>;
}

export function RequiredFieldsNote({ className = 'text-sm text-text-light' }: RequirementTextProps) {
  return <p className={className}>Fields labeled “required” must be completed.</p>;
}
