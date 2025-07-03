export const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`border p-2 rounded w-full ${className}`.trim()}
  />
);
