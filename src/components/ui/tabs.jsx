export const Tabs = ({ children }) => <div>{children}</div>;
export const TabsList = ({ children }) => <div className="flex space-x-2">{children}</div>;
export const TabsTrigger = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded ${className}`.trim()}
  >
    {children}
  </button>
);
