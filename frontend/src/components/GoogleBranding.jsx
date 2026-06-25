const iconSize = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

export const GoogleGIcon = ({ className = '', size = 'sm', title = 'Google' }) => (
  <svg
    viewBox="0 0 24 24"
    role="img"
    aria-label={title}
    className={`${iconSize[size] || iconSize.sm} shrink-0 ${className}`}
  >
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v2.99h3.88c2.26-2.08 3.54-5.15 3.54-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.86l-3.88-2.99c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.08A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.35A7.21 7.21 0 0 1 4.89 12c0-.82.14-1.61.38-2.35V6.57H1.26A12 12 0 0 0 0 12c0 1.93.46 3.75 1.26 5.43l4.01-3.08Z" />
    <path fill="#EA4335" d="M12 4.7c1.76 0 3.35.61 4.6 1.8l3.43-3.43A11.47 11.47 0 0 0 12 0 12 12 0 0 0 1.26 6.57l4.01 3.08C6.22 6.81 8.87 4.7 12 4.7Z" />
  </svg>
);

export const GoogleCalendarIcon = ({ className = '', size = 'sm', title = 'Google Calendar' }) => (
  <svg
    viewBox="0 0 24 24"
    role="img"
    aria-label={title}
    className={`${iconSize[size] || iconSize.sm} shrink-0 ${className}`}
  >
    <path fill="#fff" d="M4.5 2h15A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 19.5v-15A2.5 2.5 0 0 1 4.5 2Z" />
    <path fill="#4285F4" d="M22 8H2V4.5A2.5 2.5 0 0 1 4.5 2h15A2.5 2.5 0 0 1 22 4.5V8Z" />
    <path fill="#1967D2" d="M17.5 2H22v6h-4.5V2Z" />
    <path fill="#34A853" d="M2 8h5v14H4.5A2.5 2.5 0 0 1 2 19.5V8Z" />
    <path fill="#FBBC04" d="M7 8h15v5H7V8Z" />
    <path fill="#EA4335" d="M17 13h5v6.5a2.5 2.5 0 0 1-2.5 2.5H17v-9Z" />
    <path fill="#188038" d="M7 17h10v5H7v-5Z" />
    <path fill="#fff" d="M7 8h10v9H7V8Z" />
    <path fill="#3C4043" d="M10.09 15.78c-.45 0-.86-.08-1.23-.24a2.95 2.95 0 0 1-.95-.68l.67-.67c.18.22.4.39.66.51.27.12.55.18.85.18.37 0 .66-.08.88-.24.22-.16.33-.39.33-.68 0-.28-.1-.5-.31-.66-.21-.16-.5-.24-.87-.24h-.66v-.91h.63c.32 0 .57-.07.76-.22.19-.15.29-.35.29-.6 0-.24-.1-.43-.29-.57-.19-.14-.45-.21-.78-.21-.28 0-.53.06-.76.17-.23.11-.43.27-.6.48l-.65-.65c.24-.29.54-.51.9-.67.36-.16.76-.24 1.2-.24.43 0 .81.07 1.14.21.33.14.58.34.76.6.18.26.27.56.27.91 0 .36-.1.66-.31.91-.2.25-.48.43-.84.53.4.09.72.27.95.55.23.27.35.62.35 1.03 0 .42-.1.78-.31 1.08-.21.3-.49.53-.85.69-.36.16-.77.24-1.22.24Zm5.27-.12h-1.08V11.1l-1.05.45-.39-.88 1.75-.75h.77v5.74Z" />
  </svg>
);

export const GoogleLabel = ({ children, kind = 'calendar', className = '', iconClassName = '', size = 'sm' }) => {
  const Icon = kind === 'g' ? GoogleGIcon : GoogleCalendarIcon;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Icon size={size} className={iconClassName} />
      <span>{children}</span>
    </span>
  );
};
